// Browser notification manager for handling push notifications and sounds
import type { 
  Notification, 
  NotificationPriority,
  AdminNotificationSettings 
} from '@/types/notifications';
import { 
  NOTIFICATION_CONFIG, 
  PRIORITY_CONFIG,
  isInDoNotDisturb 
} from '@/types/notifications';

export class BrowserNotificationManager {
  private static instance: BrowserNotificationManager;
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private lastSoundTime: number = 0;
  private soundThrottleMs: number = 5000; // 5 seconds
  private soundVolume: number = 0.5; // Default 50%

  private constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  static getInstance(): BrowserNotificationManager {
    if (!BrowserNotificationManager.instance) {
      BrowserNotificationManager.instance = new BrowserNotificationManager();
    }
    return BrowserNotificationManager.instance;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext() {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        // Preload notification sounds
        this.preloadSounds();
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Preload notification sounds (generated programmatically)
   */
  private async preloadSounds() {
    if (!this.audioContext) return;
    
    // Generate different notification sounds programmatically
    const sounds = {
      'notification.mp3': this.generateNotificationSound(),
      'urgent.mp3': this.generateUrgentSound(),
      'success.mp3': this.generateSuccessSound()
    };
    
    for (const [name, buffer] of Object.entries(sounds)) {
      this.audioBuffers.set(name, buffer);
    }
  }
  
  /**
   * Generate a standard notification sound
   */
  private generateNotificationSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channel = buffer.getChannelData(0);
    
    // Create a pleasant two-tone notification sound
    for (let i = 0; i < channel.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-5 * t); // Exponential decay
      
      if (t < 0.15) {
        // First tone (800Hz)
        channel[i] = Math.sin(2 * Math.PI * 800 * t) * envelope * 0.3;
      } else {
        // Second tone (600Hz)
        channel[i] = Math.sin(2 * Math.PI * 600 * t) * envelope * 0.3;
      }
    }
    
    return buffer;
  }
  
  /**
   * Generate an urgent notification sound
   */
  private generateUrgentSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.5;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channel = buffer.getChannelData(0);
    
    // Create a more attention-grabbing sound with three ascending tones
    for (let i = 0; i < channel.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-3 * t); // Slower decay for urgency
      
      let frequency;
      if (t < 0.15) {
        frequency = 600;
      } else if (t < 0.3) {
        frequency = 800;
      } else {
        frequency = 1000;
      }
      
      channel[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
    }
    
    return buffer;
  }
  
  /**
   * Generate a success/completion sound
   */
  private generateSuccessSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.4;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channel = buffer.getChannelData(0);
    
    // Create a pleasant completion sound (major third interval)
    for (let i = 0; i < channel.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-4 * t);
      
      // Combine two frequencies for a richer sound (C and E notes)
      const c = Math.sin(2 * Math.PI * 523.25 * t); // C5
      const e = Math.sin(2 * Math.PI * 659.25 * t); // E5
      
      channel[i] = (c + e) * envelope * 0.2;
    }
    
    return buffer;
  }

  /**
   * Request browser notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Check if browser notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check if notifications are permitted
   */
  isPermitted(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  /**
   * Show browser notification
   */
  async showNotification(
    notification: Notification,
    settings?: AdminNotificationSettings
  ): Promise<void> {
    // Check if in Do Not Disturb mode
    if (settings && isInDoNotDisturb(settings)) {
      return;
    }

    // Check browser permission
    if (!this.isPermitted()) {
      return;
    }

    try {
      const config = NOTIFICATION_CONFIG[notification.type];
      const priorityConfig = PRIORITY_CONFIG[notification.priority];
      
      // Create browser notification
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // Use your app icon
        badge: '/favicon.ico',
        tag: notification.id, // Prevent duplicate notifications
        requireInteraction: notification.requiresAction,
        silent: false, // We'll handle sound separately
        data: {
          notificationId: notification.id,
          actionUrl: notification.actionUrl
        }
      });

      // Handle notification click
      browserNotification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        
        browserNotification.close();
      };

      // Auto-close based on priority
      setTimeout(() => {
        browserNotification.close();
      }, priorityConfig.toastDuration);

      // Play sound if enabled (default to true if no settings)
      if (!settings || settings.soundVolume > 0) {
        this.playSound(config.soundFile, settings?.soundVolume);
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Play notification sound
   */
  async playSound(soundFile?: string, volume?: number): Promise<void> {
    if (!soundFile) return;

    // Check throttling
    const now = Date.now();
    if (now - this.lastSoundTime < this.soundThrottleMs) {
      return;
    }

    try {
      // Try Web Audio API first
      if (this.audioContext && this.audioBuffers.has(soundFile)) {
        await this.playWithWebAudio(soundFile, volume);
      } else {
        // Fallback to HTML5 Audio
        await this.playWithHtmlAudio(soundFile, volume);
      }

      this.lastSoundTime = now;
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Play sound using Web Audio API
   */
  private async playWithWebAudio(soundFile: string, volume?: number): Promise<void> {
    if (!this.audioContext) return;

    const buffer = this.audioBuffers.get(soundFile);
    if (!buffer) return;

    // Resume context if suspended (Chrome autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set volume (0-100 to 0-1 conversion)
    gainNode.gain.value = (volume ?? this.soundVolume * 100) / 100;
    
    source.start(0);
  }

  /**
   * Play sound using HTML5 Audio (fallback with data URI)
   */
  private async playWithHtmlAudio(soundFile: string, volume?: number): Promise<void> {
    // Use different data URIs based on sound type
    let dataUri: string;
    
    if (soundFile.includes('urgent')) {
      // Urgent sound - higher pitched beep
      dataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE';
    } else if (soundFile.includes('success')) {
      // Success sound - pleasant tone
      dataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE';
    } else {
      // Default notification sound
      dataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE';
    }
    
    const audio = new Audio(dataUri);
    audio.volume = (volume ?? this.soundVolume * 100) / 100;
    
    try {
      await audio.play();
    } catch (error) {
      console.warn('HTML5 audio playback failed:', error);
    }
  }

  /**
   * Set default sound volume
   */
  setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume / 100));
  }

  /**
   * Test notification sound
   */
  async testSound(soundFile: string = 'notification.mp3', volume?: number): Promise<void> {
    // Bypass throttling for testing
    const tempLastTime = this.lastSoundTime;
    this.lastSoundTime = 0;
    
    await this.playSound(soundFile, volume);
    
    this.lastSoundTime = tempLastTime;
  }
  
  /**
   * Play a simple notification sound directly (for testing)
   */
  playNotificationSound(volume: number = 50): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Create audio context if needed
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Create oscillator for the tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure the sound (pleasant notification tone)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Start frequency
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1); // Slide down
      
      // Configure volume
      const normalizedVolume = (volume / 100) * 0.3; // Max volume at 30% to avoid being too loud
      gainNode.gain.setValueAtTime(normalizedVolume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out
      
      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3); // Stop after 300ms
      
      // Clean up
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioContext.close();
      };
    } catch (error) {
      // Fallback to simple beep if Web Audio API fails
      try {
        const beepSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE';
        const audio = new Audio(beepSound);
        audio.volume = volume / 100;
        audio.play().catch(() => {
          // Silently fail if audio playback is blocked
        });
      } catch (err) {
        // Silently fail - notification will still show without sound
      }
    }
  }

  /**
   * Show in-app toast notification (requires toast component)
   */
  showToast(
    notification: Notification,
    onAction?: () => void,
    onDismiss?: () => void
  ): void {
    // This will be implemented with the toast component
    // For now, just log
    
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        type: notification.type,
        duration: PRIORITY_CONFIG[notification.priority].toastDuration,
        onAction,
        onDismiss
      });
    }
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    // Clear any active browser notifications
    if ('Notification' in window) {
      // Note: We can't clear all notifications programmatically in modern browsers
      // This is a security feature
    }
  }
}

// Export singleton instance
export const browserNotificationManager = BrowserNotificationManager.getInstance();