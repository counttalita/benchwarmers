'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Plus, X, Edit2, Save, Trash2 } from 'lucide-react'

interface AvailabilitySlot {
  id: string
  startDate: string
  endDate: string
  utilizationPercent: number
  hoursPerWeek?: number
  notes?: string
  isRecurring?: boolean
  recurringPattern?: 'weekly' | 'monthly'
}

interface AvailabilityCalendarProps {
  availability: AvailabilitySlot[]
  onAvailabilityChange: (availability: AvailabilitySlot[]) => void
  timezone?: string
}

const UTILIZATION_LEVELS = [
  { value: 0, label: 'Available (0%)', color: 'bg-green-100 text-green-800', bgColor: 'bg-green-50' },
  { value: 25, label: 'Light (25%)', color: 'bg-blue-100 text-blue-800', bgColor: 'bg-blue-50' },
  { value: 50, label: 'Moderate (50%)', color: 'bg-yellow-100 text-yellow-800', bgColor: 'bg-yellow-50' },
  { value: 75, label: 'Heavy (75%)', color: 'bg-orange-100 text-orange-800', bgColor: 'bg-orange-50' },
  { value: 100, label: 'Fully Booked (100%)', color: 'bg-red-100 text-red-800', bgColor: 'bg-red-50' }
]

export default function AvailabilityCalendar({
  availability,
  onAvailabilityChange,
  timezone = 'UTC'
}: AvailabilityCalendarProps) {
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [newSlot, setNewSlot] = useState<Partial<AvailabilitySlot>>({
    startDate: '',
    endDate: '',
    utilizationPercent: 0,
    hoursPerWeek: 40,
    notes: '',
    isRecurring: false
  })

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getUtilizationInfo = (percent: number) => {
    return UTILIZATION_LEVELS.find(level => level.value === percent) || UTILIZATION_LEVELS[0]
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffWeeks = Math.floor(diffDays / 7)
    
    if (diffWeeks > 0) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`
    }
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
  }

  const validateSlot = (slot: Partial<AvailabilitySlot>) => {
    if (!slot.startDate || !slot.endDate) {
      return 'Start and end dates are required'
    }
    
    const start = new Date(slot.startDate)
    const end = new Date(slot.endDate)
    
    if (start >= end) {
      return 'End date must be after start date'
    }
    
    if (start < new Date()) {
      return 'Start date cannot be in the past'
    }
    
    return null
  }

  const addSlot = () => {
    const error = validateSlot(newSlot)
    if (error) {
      alert(error)
      return
    }

    const slot: AvailabilitySlot = {
      id: generateId(),
      startDate: newSlot.startDate!,
      endDate: newSlot.endDate!,
      utilizationPercent: newSlot.utilizationPercent || 0,
      hoursPerWeek: newSlot.hoursPerWeek,
      notes: newSlot.notes,
      isRecurring: newSlot.isRecurring,
      recurringPattern: newSlot.recurringPattern
    }

    onAvailabilityChange([...availability, slot])
    setNewSlot({
      startDate: '',
      endDate: '',
      utilizationPercent: 0,
      hoursPerWeek: 40,
      notes: '',
      isRecurring: false
    })
    setIsAddingSlot(false)
  }

  const updateSlot = (id: string, updates: Partial<AvailabilitySlot>) => {
    const updatedAvailability = availability.map(slot =>
      slot.id === id ? { ...slot, ...updates } : slot
    )
    onAvailabilityChange(updatedAvailability)
    setEditingSlot(null)
  }

  const removeSlot = (id: string) => {
    onAvailabilityChange(availability.filter(slot => slot.id !== id))
  }

  const sortedAvailability = [...availability].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  const getAvailabilityStats = () => {
    const totalSlots = availability.length
    const fullyAvailable = availability.filter(slot => slot.utilizationPercent === 0).length
    const partiallyBooked = availability.filter(slot => slot.utilizationPercent > 0 && slot.utilizationPercent < 100).length
    const fullyBooked = availability.filter(slot => slot.utilizationPercent === 100).length

    return { totalSlots, fullyAvailable, partiallyBooked, fullyBooked }
  }

  const stats = getAvailabilityStats()

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability Calendar
          </CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Timezone: {timezone}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.fullyAvailable}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.partiallyBooked}</div>
              <div className="text-sm text-muted-foreground">Partial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.fullyBooked}</div>
              <div className="text-sm text-muted-foreground">Booked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalSlots}</div>
              <div className="text-sm text-muted-foreground">Total Slots</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Slot Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Availability Slots</h3>
        <Button onClick={() => setIsAddingSlot(true)} disabled={isAddingSlot}>
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      </div>

      {/* Add New Slot Form */}
      {isAddingSlot && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Availability Slot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newSlot.startDate}
                  onChange={(e: any) => setNewSlot({ ...newSlot, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newSlot.endDate}
                  onChange={(e: any) => setNewSlot({ ...newSlot, endDate: e.target.value })}
                  min={newSlot.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="utilization">Current Utilization</Label>
                <select
                  id="utilization"
                  value={newSlot.utilizationPercent}
                  onChange={(e: any) => setNewSlot({ ...newSlot, utilizationPercent: parseInt(e.target.value) })}
                  className="w-full p-2 border border-input rounded-md"
                >
                  {UTILIZATION_LEVELS.map((level: any) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="hoursPerWeek">Available Hours/Week</Label>
                <Input
                  id="hoursPerWeek"
                  type="number"
                  min="1"
                  max="168"
                  value={newSlot.hoursPerWeek}
                  onChange={(e: any) => setNewSlot({ ...newSlot, hoursPerWeek: parseInt(e.target.value) || 40 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={newSlot.notes}
                onChange={(e: any) => setNewSlot({ ...newSlot, notes: e.target.value })}
                placeholder="Any additional notes about this availability..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={newSlot.isRecurring}
                onChange={(e: any) => setNewSlot({ ...newSlot, isRecurring: e.target.checked })}
              />
              <Label htmlFor="isRecurring">Recurring availability</Label>
            </div>

            {newSlot.isRecurring && (
              <div>
                <Label htmlFor="recurringPattern">Recurring Pattern</Label>
                <select
                  id="recurringPattern"
                  value={newSlot.recurringPattern || 'weekly'}
                  onChange={(e: any) => setNewSlot({ ...newSlot, recurringPattern: e.target.value as 'weekly' | 'monthly' })}
                  className="w-full p-2 border border-input rounded-md"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={addSlot}>
                <Save className="h-4 w-4 mr-2" />
                Save Availability
              </Button>
              <Button variant="outline" onClick={() => setIsAddingSlot(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability Slots List */}
      <div className="space-y-3">
        {sortedAvailability.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No availability slots added yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first availability slot to let clients know when you're free.
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedAvailability.map((slot: any) => {
            const utilizationInfo = getUtilizationInfo(slot.utilizationPercent)
            const isEditing = editingSlot === slot.id
            
            return (
              <Card key={slot.id} className={`${utilizationInfo.bgColor} border-l-4 border-l-current`}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={slot.startDate}
                            onChange={(e: any) => updateSlot(slot.id, { startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={slot.endDate}
                            onChange={(e: any) => updateSlot(slot.id, { endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Utilization</Label>
                          <select
                            value={slot.utilizationPercent}
                            onChange={(e: any) => updateSlot(slot.id, { utilizationPercent: parseInt(e.target.value) })}
                            className="w-full p-2 border border-input rounded-md"
                          >
                            {UTILIZATION_LEVELS.map((level: any) => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Hours/Week</Label>
                          <Input
                            type="number"
                            value={slot.hoursPerWeek}
                            onChange={(e: any) => updateSlot(slot.id, { hoursPerWeek: parseInt(e.target.value) || 40 })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Notes</Label>
                        <Input
                          value={slot.notes || ''}
                          onChange={(e: any) => updateSlot(slot.id, { notes: e.target.value })}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditingSlot(null)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSlot(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {formatDate(slot.startDate)} - {formatDate(slot.endDate)}
                            </span>
                          </div>
                          <Badge className={utilizationInfo.color}>
                            {utilizationInfo.label}
                          </Badge>
                          {slot.isRecurring && (
                            <Badge variant="outline">
                              Recurring {slot.recurringPattern}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{slot.hoursPerWeek}h/week available</span>
                          </div>
                          <span>Duration: {calculateDuration(slot.startDate, slot.endDate)}</span>
                        </div>
                        
                        {slot.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            "{slot.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSlot(slot.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeSlot(slot.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Quick Actions */}
      {availability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextMonth = new Date()
                  nextMonth.setMonth(nextMonth.getMonth() + 1)
                  const endOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0)
                  
                  setNewSlot({
                    startDate: nextMonth.toISOString().split('T')[0],
                    endDate: endOfMonth.toISOString().split('T')[0],
                    utilizationPercent: 0,
                    hoursPerWeek: 40,
                    notes: 'Available for new projects'
                  })
                  setIsAddingSlot(true)
                }}
              >
                Add Next Month
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextQuarter = new Date()
                  nextQuarter.setMonth(nextQuarter.getMonth() + 3)
                  const endOfQuarter = new Date(nextQuarter.getFullYear(), nextQuarter.getMonth() + 3, 0)
                  
                  setNewSlot({
                    startDate: nextQuarter.toISOString().split('T')[0],
                    endDate: endOfQuarter.toISOString().split('T')[0],
                    utilizationPercent: 0,
                    hoursPerWeek: 40,
                    notes: 'Quarterly availability block'
                  })
                  setIsAddingSlot(true)
                }}
              >
                Add Next Quarter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
