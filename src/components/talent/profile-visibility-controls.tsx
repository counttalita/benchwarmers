'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff, Users, Globe, Lock, Shield, Info, Settings } from 'lucide-react'

interface VisibilitySettings {
  isVisible: boolean
  searchable: boolean
  showRate: boolean
  showAvailability: boolean
  showContactInfo: boolean
  showExperience: boolean
  showSkills: boolean
  profileAccess: 'public' | 'registered' | 'premium' | 'private'
  allowDirectContact: boolean
  requireApproval: boolean
}

interface ProfileVisibilityControlsProps {
  settings: VisibilitySettings
  onSettingsChange: (settings: VisibilitySettings) => void
  isPremium?: boolean
}

const ACCESS_LEVELS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view your profile',
    icon: Globe,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    value: 'registered',
    label: 'Registered Users',
    description: 'Only registered users can view',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    value: 'premium',
    label: 'Premium Users',
    description: 'Only premium subscribers can view',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can view your profile',
    icon: Lock,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
]

export default function ProfileVisibilityControls({
  settings,
  onSettingsChange,
  isPremium = false
}: ProfileVisibilityControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateSetting = (key: keyof VisibilitySettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const getAccessLevel = () => {
    return ACCESS_LEVELS.find(level => level.value === settings.profileAccess) || ACCESS_LEVELS[0]
  }

  const getVisibilityStatus = () => {
    if (!settings.isVisible) {
      return { status: 'Hidden', color: 'bg-red-100 text-red-800', description: 'Profile is not visible to anyone' }
    }
    
    const accessLevel = getAccessLevel()
    if (settings.profileAccess === 'public') {
      return { status: 'Public', color: 'bg-green-100 text-green-800', description: 'Visible to everyone' }
    }
    if (settings.profileAccess === 'registered') {
      return { status: 'Limited', color: 'bg-blue-100 text-blue-800', description: 'Visible to registered users' }
    }
    if (settings.profileAccess === 'premium') {
      return { status: 'Premium', color: 'bg-purple-100 text-purple-800', description: 'Visible to premium users only' }
    }
    return { status: 'Private', color: 'bg-gray-100 text-gray-800', description: 'Only visible to you' }
  }

  const visibilityStatus = getVisibilityStatus()
  const currentAccessLevel = getAccessLevel()

  return (
    <div className="space-y-6">
      {/* Main Visibility Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.isVisible ? (
              <Eye className="h-5 w-5 text-green-600" />
            ) : (
              <EyeOff className="h-5 w-5 text-red-600" />
            )}
            Profile Visibility
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge className={visibilityStatus.color}>
              {visibilityStatus.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {visibilityStatus.description}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="profile-visible" className="text-base font-medium">
                Make Profile Visible
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow others to discover and view your talent profile
              </p>
            </div>
            <Switch
              id="profile-visible"
              checked={settings.isVisible}
              onCheckedChange={(checked: any) => updateSetting('isVisible', checked)}
            />
          </div>

          {settings.isVisible && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-medium mb-3 block">Profile Access Level</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ACCESS_LEVELS.map((level: any) => {
                    const Icon = level.icon
                    const isSelected = settings.profileAccess === level.value
                    const isDisabled = level.value === 'premium' && !isPremium
                    
                    return (
                      <button
                        key={level.value}
                        onClick={() => !isDisabled && updateSetting('profileAccess', level.value)}
                        disabled={isDisabled}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? `border-current ${level.bgColor} ${level.color}`
                            : isDisabled
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{level.label}</span>
                          {isDisabled && (
                            <Badge variant="outline" className="text-xs">
                              Premium Only
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {level.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="searchable" className="font-medium">
                    Include in Search Results
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow your profile to appear in talent searches
                  </p>
                </div>
                <Switch
                  id="searchable"
                  checked={settings.searchable}
                  onCheckedChange={(checked: any) => updateSetting('searchable', checked)}
                  disabled={settings.profileAccess === 'private'}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Visibility */}
      {settings.isVisible && settings.profileAccess !== 'private' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Information Visibility
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Control what information is visible to viewers
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-rate" className="font-medium">
                    Show Hourly Rates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your rate range to potential clients
                  </p>
                </div>
                <Switch
                  id="show-rate"
                  checked={settings.showRate}
                  onCheckedChange={(checked: any) => updateSetting('showRate', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-availability" className="font-medium">
                    Show Availability
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your current availability status
                  </p>
                </div>
                <Switch
                  id="show-availability"
                  checked={settings.showAvailability}
                  onCheckedChange={(checked: any) => updateSetting('showAvailability', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-contact" className="font-medium">
                    Show Contact Information
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow viewers to see your contact details
                  </p>
                </div>
                <Switch
                  id="show-contact"
                  checked={settings.showContactInfo}
                  onCheckedChange={(checked: any) => updateSetting('showContactInfo', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-experience" className="font-medium">
                    Show Work Experience
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your professional experience history
                  </p>
                </div>
                <Switch
                  id="show-experience"
                  checked={settings.showExperience}
                  onCheckedChange={(checked: any) => updateSetting('showExperience', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-skills" className="font-medium">
                    Show Skills & Expertise
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your technical skills and proficiency levels
                  </p>
                </div>
                <Switch
                  id="show-skills"
                  checked={settings.showSkills}
                  onCheckedChange={(checked: any) => updateSetting('showSkills', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact & Communication Settings */}
      {settings.isVisible && settings.profileAccess !== 'private' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Contact & Communication
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Control how potential clients can reach you
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="direct-contact" className="font-medium">
                  Allow Direct Contact
                </Label>
                <p className="text-sm text-muted-foreground">
                  Let clients contact you directly through the platform
                </p>
              </div>
              <Switch
                id="direct-contact"
                checked={settings.allowDirectContact}
                onCheckedChange={(checked: any) => updateSetting('allowDirectContact', checked)}
              />
            </div>

            {settings.allowDirectContact && (
              <div className="flex items-center justify-between pl-4 border-l-2 border-gray-200">
                <div>
                  <Label htmlFor="require-approval" className="font-medium">
                    Require Message Approval
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Review messages before they reach your inbox
                  </p>
                </div>
                <Switch
                  id="require-approval"
                  checked={settings.requireApproval}
                  onCheckedChange={(checked: any) => updateSetting('requireApproval', checked)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Advanced Settings</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </Button>
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">Privacy Tips</span>
              </div>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Higher visibility increases your chances of being discovered</li>
                <li>• Premium access levels can help filter serious clients</li>
                <li>• Consider showing rates to attract budget-appropriate projects</li>
                <li>• Message approval helps manage communication quality</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">🔍 Search Optimization</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Complete profiles rank higher in search</li>
                  <li>• Regular updates improve visibility</li>
                  <li>• Detailed skills help with matching</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🛡️ Privacy Protection</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Control information sharing granularly</li>
                  <li>• Monitor who views your profile</li>
                  <li>• Adjust settings based on activity</li>
                </ul>
              </div>
            </div>

            {!isPremium && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Premium Features</span>
                </div>
                <p className="text-sm text-purple-700 mb-3">
                  Upgrade to premium for advanced visibility controls and priority placement in search results.
                </p>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Current Status Summary */}
      <Card className={currentAccessLevel.bgColor}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <currentAccessLevel.icon className={`h-6 w-6 ${currentAccessLevel.color}`} />
            <div>
              <p className="font-medium">
                Your profile is currently {settings.isVisible ? 'visible' : 'hidden'}
                {settings.isVisible && ` to ${currentAccessLevel.label.toLowerCase()}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings.isVisible
                  ? `${settings.searchable ? 'Included' : 'Not included'} in search results`
                  : 'Not discoverable by anyone'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
