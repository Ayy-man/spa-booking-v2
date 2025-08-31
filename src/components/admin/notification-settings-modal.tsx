'use client'

import * as React from 'react'
import { X, Bell, BellOff, Volume2, VolumeX, Save, TestTube } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@supabase/supabase-js'
import { simpleAuth } from '@/lib/simple-auth'
import type { 
  AdminNotificationSettings,
  AdminNotificationPreference,
  NotificationType 
} from '@/types/notifications'
import { NOTIFICATION_CONFIG } from '@/types/notifications'
import { browserNotificationManager } from '@/lib/browser-notification-manager'

interface NotificationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<Partial<AdminNotificationSettings> & {
    soundEnabled?: boolean;
    browserEnabled?: boolean;
    emailEnabled?: boolean;
    emailAddress?: string;
  }>({
    adminEmail: '',
    doNotDisturbEnabled: false,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '08:00',
    soundVolume: 50,
    browserPermissionGranted: false,
    soundEnabled: true,
    browserEnabled: true,
    emailEnabled: false,
    emailAddress: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  const [preferences, setPreferences] = React.useState<Record<NotificationType, AdminNotificationPreference>>({} as any)
  const [supabase, setSupabase] = React.useState<ReturnType<typeof createClient> | null>(null)
  const [testingSound, setTestingSound] = React.useState(false)

  // Initialize
  React.useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      setSupabase(createClient(supabaseUrl, supabaseKey))
    }
    
    const sessionInfo = simpleAuth.getSessionInfo()
    const adminEmail = sessionInfo?.email || 'admin@dermalspa.com'
    
    setSettings(prev => ({ ...prev, adminEmail, emailAddress: adminEmail }))
    
    // Check browser permission
    if ('Notification' in window) {
      setSettings(prev => ({
        ...prev,
        browserPermissionGranted: Notification.permission === 'granted'
      }))
    }
  }, [])

  // Fetch settings
  React.useEffect(() => {
    if (!isOpen || !supabase || !settings.adminEmail) return
    
    const fetchSettings = async () => {
      setLoading(true)
      
      try {
        // Fetch settings
        const { data: settingsData } = await supabase
          .from('admin_notification_settings')
          .select('*')
          .eq('admin_email', settings.adminEmail!)
          .single()
        
        if (settingsData) {
          setSettings(settingsData as unknown as AdminNotificationSettings)
        }
        
        // Fetch preferences
        const { data: prefsData } = await supabase
          .from('admin_notification_preferences')
          .select('*')
          .eq('admin_email', settings.adminEmail!)
        
        if (prefsData && prefsData.length > 0) {
          const prefsMap: Record<string, AdminNotificationPreference> = {}
          prefsData.forEach((pref: any) => {
            prefsMap[pref.notification_type] = pref
          })
          setPreferences(prefsMap as any)
        } else {
          // Initialize default preferences
          const defaultPrefs: Record<string, AdminNotificationPreference> = {}
          Object.keys(NOTIFICATION_CONFIG).forEach((type) => {
            defaultPrefs[type] = {
              adminEmail: settings.adminEmail!,
              notificationType: type as NotificationType,
              enabled: true,
              browserEnabled: true,
              soundEnabled: true,
              id: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as AdminNotificationPreference
          })
          setPreferences(defaultPrefs as any)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSettings()
  }, [isOpen, supabase, settings.adminEmail])

  // Request browser permission
  const requestPermission = async () => {
    const permission = await browserNotificationManager.requestPermission()
    setSettings(prev => ({ ...prev, browserPermissionGranted: permission === 'granted' }))
  }

  // Test sound
  const testSound = () => {
    setTestingSound(true)
    browserNotificationManager.playNotificationSound(settings.soundVolume)
    setTimeout(() => setTestingSound(false), 2000)
  }

  // Test notification
  const testNotification = async () => {
    if (!settings.browserPermissionGranted) {
      await requestPermission()
    }
    
    if (settings.browserPermissionGranted) {
      browserNotificationManager.showNotification({
        id: 'test',
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification from the settings panel',
        priority: 'normal',
        metadata: {},
        requiresAction: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }, settings as AdminNotificationSettings)
    }
  }

  // Save settings
  const saveSettings = async () => {
    if (!supabase || !settings.adminEmail) return
    
    setSaving(true)
    
    try {
      // Save main settings
      const { error: settingsError } = await supabase
        .from('admin_notification_settings')
        .upsert({
          admin_email: settings.adminEmail!,
          dnd_enabled: settings.doNotDisturbEnabled,
          dnd_start_time: settings.doNotDisturbStart,
          dnd_end_time: settings.doNotDisturbEnd,
          sound_enabled: settings.soundEnabled,
          sound_volume: settings.soundVolume,
          browser_enabled: settings.browserEnabled,
          browser_permission_granted: settings.browserPermissionGranted,
          email_enabled: settings.emailEnabled,
          email_address: settings.emailAddress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_email'
        })
      
      if (settingsError) throw settingsError
      
      // Save preferences
      for (const [type, pref] of Object.entries(preferences)) {
        const { error: prefError } = await supabase
          .from('admin_notification_preferences')
          .upsert({
            admin_email: settings.adminEmail!,
            notification_type: type,
            enabled: pref.enabled,
            browser_enabled: pref.browserEnabled,
            email_enabled: false,
            sound_enabled: pref.soundEnabled
          }, {
            onConflict: 'admin_email,notification_type'
          })
        
        if (prefError) throw prefError
      }
      
      // Update browser notification manager
      browserNotificationManager.setSoundVolume(settings.soundVolume || 50)
      
      onClose()
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Configure how you receive notifications from the system
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">General Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser Notifications</Label>
                  <p className="text-xs text-gray-500">Show desktop notifications</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!settings.browserPermissionGranted && settings.browserEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestPermission}
                    >
                      Grant Permission
                    </Button>
                  )}
                  <Switch
                    checked={settings.browserEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, browserEnabled: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound Notifications</Label>
                  <p className="text-xs text-gray-500">Play sound for new notifications</p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, soundEnabled: checked }))
                  }
                />
              </div>

              {settings.soundEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Volume</Label>
                    <span className="text-sm text-gray-500">{settings.soundVolume}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <VolumeX className="h-4 w-4 text-gray-400" />
                    <Slider
                      value={[settings.soundVolume || 50]}
                      onValueChange={([value]) => 
                        setSettings(prev => ({ ...prev, soundVolume: value }))
                      }
                      max={100}
                      step={10}
                      className="flex-1"
                    />
                    <Volume2 className="h-4 w-4 text-gray-400" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testSound}
                      disabled={testingSound}
                    >
                      {testingSound ? 'Playing...' : 'Test'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Do Not Disturb</Label>
                  <p className="text-xs text-gray-500">Silence notifications during specified hours</p>
                </div>
                <Switch
                  checked={settings.doNotDisturbEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, doNotDisturbEnabled: checked }))
                  }
                />
              </div>

              {settings.doNotDisturbEnabled && (
                <div className="flex items-center space-x-4 pl-4">
                  <div className="flex items-center space-x-2">
                    <Label>From</Label>
                    <input
                      type="time"
                      value={settings.doNotDisturbStart}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, doNotDisturbStart: e.target.value }))
                      }
                      className="px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label>To</Label>
                    <input
                      type="time"
                      value={settings.doNotDisturbEnd}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, doNotDisturbEnd: e.target.value }))
                      }
                      className="px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notification Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Notification Types</h3>
              <p className="text-xs text-gray-500">Choose which notifications you want to receive</p>
              
              <div className="space-y-3">
                {Object.entries(NOTIFICATION_CONFIG).map(([type, config]) => {
                  const pref = preferences[type as NotificationType] || {
                    enabled: true,
                    browserEnabled: true,
                    emailEnabled: false,
                    soundEnabled: true
                  }
                  
                  return (
                    <div key={type} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="text-xl mt-0.5">{config.icon}</div>
                          <div>
                            <Label className="text-sm">{config.label}</Label>
                            <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={pref.enabled}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({
                              ...prev,
                              [type]: { ...pref, enabled: checked }
                            }))
                          }
                        />
                      </div>
                      
                      {pref.enabled && (
                        <div className="mt-3 pl-9 flex items-center space-x-4 text-xs">
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={pref.browserEnabled}
                              onChange={(e) => 
                                setPreferences(prev => ({
                                  ...prev,
                                  [type]: { ...pref, browserEnabled: e.target.checked }
                                }))
                              }
                              className="rounded"
                            />
                            <span>Browser</span>
                          </label>
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={pref.soundEnabled}
                              onChange={(e) => 
                                setPreferences(prev => ({
                                  ...prev,
                                  [type]: { ...pref, soundEnabled: e.target.checked }
                                }))
                              }
                              className="rounded"
                            />
                            <span>Sound</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Test Section */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
                className="w-full"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}