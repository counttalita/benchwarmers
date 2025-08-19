'use client'

import React, { useState, useEffect } from 'react'
import { useNotifications, NotificationPreferences } from '@/hooks/useNotifications'
import { Bell, Mail, Smartphone, Clock, Globe, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

interface NotificationPreferencesProps {
  userId: string
  companyId?: string
  isOpen: boolean
  onClose: () => void
}

const NOTIFICATION_TYPES = [
  {
    type: 'match_created',
    label: 'New Matches',
    description: 'When new talent matches are found for your projects',
    icon: '🎯'
  },
  {
    type: 'offer_received',
    label: 'New Offers',
    description: 'When you receive offers for your projects',
    icon: '💰'
  },
  {
    type: 'offer_accepted',
    label: 'Offer Accepted',
    description: 'When your offers are accepted by clients',
    icon: '✅'
  },
  {
    type: 'payment_released',
    label: 'Payment Released',
    description: 'When payments are released from escrow',
    icon: '💸'
  },
  {
    type: 'engagement_completed',
    label: 'Project Completed',
    description: 'When projects are marked as completed',
    icon: '🎉'
  },
  {
    type: 'dispute_created',
    label: 'Disputes',
    description: 'When disputes are filed or resolved',
    icon: '⚠️'
  },
  {
    type: 'system_alert',
    label: 'System Alerts',
    description: 'Important system updates and announcements',
    icon: '📢'
  }
]

const CHANNELS = [
  { value: 'in_app', label: 'In-App', icon: Bell },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Push', icon: Smartphone }
]

const FREQUENCIES = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Digest' }
]

export function NotificationPreferences({ userId, companyId, isOpen, onClose }: NotificationPreferencesProps) {
  const { updatePreferences, getPreferences } = useNotifications(userId, companyId)
  const [preferences, setPreferences] = useState<Record<string, NotificationPreferences>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'UTC',
    frequency: 'immediate'
  })

  useEffect(() => {
    if (isOpen) {
      loadPreferences()
    }
  }, [isOpen])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const prefs: Record<string, NotificationPreferences> = {}

      for (const type of NOTIFICATION_TYPES) {
        try {
          const response = await getPreferences(type.type)
          prefs[type.type] = response.preferences || {
            type: type.type,
            channels: ['in_app', 'email'],
            enabled: true,
            quietHoursStart: globalSettings.quietHoursStart,
            quietHoursEnd: globalSettings.quietHoursEnd,
            timezone: globalSettings.timezone,
            frequency: globalSettings.frequency
          }
        } catch (error) {
          // Use default preferences if not found
          prefs[type.type] = {
            type: type.type,
            channels: ['in_app', 'email'],
            enabled: true,
            quietHoursStart: globalSettings.quietHoursStart,
            quietHoursEnd: globalSettings.quietHoursEnd,
            timezone: globalSettings.timezone,
            frequency: globalSettings.frequency
          }
        }
      }

      setPreferences(prefs)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (type: string, field: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
  }

  const toggleChannel = (type: string, channel: string) => {
    const currentChannels = preferences[type]?.channels || []
    const newChannels = currentChannels.includes(channel as any)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel as any]
    
    updatePreference(type, 'channels', newChannels)
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      
      const promises = Object.values(preferences).map(pref =>
        updatePreferences(pref)
      )
      
      await Promise.all(promises)
      
      // Show success message or close modal
      onClose()
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Notification Preferences</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Global Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Global Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={globalSettings.timezone}
                        onValueChange={(value: any) => setGlobalSettings(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Paris">Paris</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quietHoursStart">Quiet Hours Start</Label>
                      <Input
                        type="time"
                        value={globalSettings.quietHoursStart}
                        onChange={(e: any) => setGlobalSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quietHoursEnd">Quiet Hours End</Label>
                      <Input
                        type="time"
                        value={globalSettings.quietHoursEnd}
                        onChange={(e: any) => setGlobalSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Notification Types */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notification Types</h3>
                
                {NOTIFICATION_TYPES.map((type: any) => {
                  const pref = preferences[type.type]
                  if (!pref) return null

                  return (
                    <Card key={type.type}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl">{type.icon}</div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium">{type.label}</h4>
                                <Switch
                                  checked={pref.enabled}
                                  onCheckedChange={(checked: any) => updatePreference(type.type, 'enabled', checked)}
                                />
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-3">
                                {type.description}
                              </p>
                              
                              {pref.enabled && (
                                <div className="space-y-3">
                                  {/* Channels */}
                                  <div>
                                    <Label className="text-sm font-medium">Delivery Channels</Label>
                                    <div className="flex gap-4 mt-2">
                                      {CHANNELS.map((channel: any) => {
                                        const Icon = channel.icon
                                        return (
                                          <div key={channel.value} className="flex items-center gap-2">
                                            <Checkbox
                                              checked={pref.channels.includes(channel.value as any)}
                                              onCheckedChange={() => toggleChannel(type.type, channel.value)}
                                            />
                                            <Icon className="h-4 w-4" />
                                            <span className="text-sm">{channel.label}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  
                                  {/* Frequency */}
                                  <div>
                                    <Label className="text-sm font-medium">Frequency</Label>
                                    <Select
                                      value={pref.frequency || 'immediate'}
                                      onValueChange={(value: any) => updatePreference(type.type, 'frequency', value)}
                                    >
                                      <SelectTrigger className="w-48 mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FREQUENCIES.map((freq: any) => (
                                          <SelectItem key={freq.value} value={freq.value}>
                                            {freq.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={savePreferences} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
