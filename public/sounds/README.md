# Notification Sounds

This directory contains notification sound files for the admin panel.

## Required Sound Files

Please add the following MP3 files to this directory:

1. **notification.mp3** - Standard notification sound (for normal priority notifications)
2. **urgent.mp3** - Urgent/high priority notification sound
3. **success.mp3** - Success confirmation sound (for payments, completions)

## Sound File Requirements

- Format: MP3
- Duration: 1-3 seconds recommended
- File size: Keep under 100KB each for fast loading
- Volume: Normalized audio levels

## Free Sound Resources

You can find free notification sounds at:
- https://freesound.org/
- https://www.zapsplat.com/
- https://mixkit.co/free-sound-effects/notification/

## Implementation Note

The sounds are played through the Browser Notification Manager at `/src/lib/browser-notification-manager.ts`

Volume is controllable through user settings (0-100 scale).