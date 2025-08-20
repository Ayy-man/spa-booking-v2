'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
// Using window.confirm instead of AlertDialog for simplicity
import { CalendarIcon, ClockIcon, PlusIcon, TrashIcon, EditIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Staff, ScheduleBlock, Booking } from '@/types/booking'
// Simple notification function
const showNotification = (title: string, description: string, type: 'success' | 'error' = 'success') => {
  alert(`${title}: ${description}`)
}

export function ScheduleManagement() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConflictWarning, setShowConflictWarning] = useState(false)
  const [conflictingBookings, setConflictingBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state for adding/editing blocks
  const [formData, setFormData] = useState({
    staffId: '',
    blockType: 'full_day' as 'full_day' | 'time_range',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: ''
  })
  
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null)

  // Fetch staff members on mount
  useEffect(() => {
    fetchStaff().catch(console.error)
    fetchAllScheduleBlocks().catch(console.error)
  }, [])

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('Error fetching staff:', error)
        showNotification('Error', 'Failed to load staff members', 'error')
      } else {
        setStaff(data || [])
      }
    } catch (error) {
      console.error('Error in fetchStaff:', error)
      showNotification('Error', 'Failed to load staff members', 'error')
    }
  }

  const fetchAllScheduleBlocks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('schedule_blocks')
        .select('*')
        .order('start_date', { ascending: false })
      
      if (error) {
        console.error('Error fetching schedule blocks:', error)
        // Check if the error is because the table doesn't exist
        if (error.message?.includes('schedule_blocks') && error.message?.includes('does not exist')) {
          setError('Schedule blocks table not found. Please run the database migration first.')
        } else {
          setError('Failed to load schedule blocks: ' + error.message)
        }
      } else {
        setScheduleBlocks(data || [])
        setError(null)
      }
    } catch (error: any) {
      console.error('Error in fetchAllScheduleBlocks:', error)
      setError('Failed to load schedule blocks: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffScheduleBlocks = async (staffId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('staff_id', staffId)
      .order('start_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching schedule blocks:', error)
      showNotification('Error', 'Failed to load schedule blocks', 'error')
    } else {
      setScheduleBlocks(data || [])
    }
    setLoading(false)
  }

  const checkForConflicts = async (): Promise<boolean> => {
    // Check for booking conflicts
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('staff_id', formData.staffId)
      .gte('appointment_date', formData.startDate)
      .lte('appointment_date', formData.endDate || formData.startDate)
      .neq('status', 'cancelled')
    
    if (error) {
      console.error('Error checking conflicts:', error)
      return false
    }
    
    if (bookings && bookings.length > 0) {
      // For time range blocks, filter further by time
      if (formData.blockType === 'time_range' && formData.startTime && formData.endTime) {
        const conflictingWithTime = bookings.filter(booking => {
          const bookingStart = booking.start_time
          const bookingEnd = booking.end_time
          
          // Check if times overlap
          return (
            (bookingStart < formData.endTime && bookingEnd > formData.startTime) ||
            (bookingStart === formData.startTime) ||
            (bookingEnd === formData.endTime)
          )
        })
        
        if (conflictingWithTime.length > 0) {
          setConflictingBookings(conflictingWithTime)
          return true
        }
      } else if (formData.blockType === 'full_day') {
        // Full day blocks conflict with any bookings on those dates
        setConflictingBookings(bookings)
        return true
      }
    }
    
    return false
  }

  const handleAddBlock = async (proceedWithConflicts = false) => {
    // Validate form
    if (!formData.staffId || !formData.startDate) {
      showNotification('Validation Error', 'Please fill in all required fields', 'error')
      return
    }
    
    if (formData.blockType === 'time_range' && (!formData.startTime || !formData.endTime)) {
      showNotification('Validation Error', 'Time range blocks require start and end times', 'error')
      return
    }
    
    // Check for conflicts if not already proceeding with them
    if (!proceedWithConflicts) {
      const hasConflicts = await checkForConflicts()
      if (hasConflicts) {
        const confirmMessage = `This schedule block conflicts with ${conflictingBookings.length} existing booking(s). Do you want to proceed anyway?`
        if (!window.confirm(confirmMessage)) {
          return
        }
      }
    }
    
    // Create the schedule block
    const blockData = {
      staff_id: formData.staffId,
      block_type: formData.blockType,
      start_date: formData.startDate,
      end_date: formData.endDate || null,
      start_time: formData.blockType === 'time_range' ? formData.startTime : null,
      end_time: formData.blockType === 'time_range' ? formData.endTime : null,
      reason: formData.reason || null
    }
    
    const { error } = editingBlock
      ? await supabase
          .from('schedule_blocks')
          .update(blockData)
          .eq('id', editingBlock.id)
      : await supabase
          .from('schedule_blocks')
          .insert([blockData])
    
    if (error) {
      console.error('Error saving schedule block:', error)
      showNotification('Error', 'Failed to save schedule block', 'error')
    } else {
      showNotification('Success', editingBlock ? 'Schedule block updated' : 'Schedule block added successfully')
      
      // Reset form and refresh data
      resetForm()
      setShowAddModal(false)
      
      if (selectedStaff) {
        fetchStaffScheduleBlocks(selectedStaff)
      } else {
        fetchAllScheduleBlocks()
      }
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule block? This action cannot be undone.')) {
      return
    }
    
    const { error } = await supabase
      .from('schedule_blocks')
      .delete()
      .eq('id', blockId)
    
    if (error) {
      console.error('Error deleting schedule block:', error)
      showNotification('Error', 'Failed to delete schedule block', 'error')
    } else {
      showNotification('Success', 'Schedule block deleted')
      
      if (selectedStaff) {
        fetchStaffScheduleBlocks(selectedStaff)
      } else {
        fetchAllScheduleBlocks()
      }
    }
  }

  const handleEditBlock = (block: ScheduleBlock) => {
    setEditingBlock(block)
    setFormData({
      staffId: block.staff_id,
      blockType: block.block_type,
      startDate: block.start_date,
      endDate: block.end_date || '',
      startTime: block.start_time || '',
      endTime: block.end_time || '',
      reason: block.reason || ''
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      staffId: '',
      blockType: 'full_day',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      reason: ''
    })
    setEditingBlock(null)
    setConflictingBookings([])
  }

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId)
    return staffMember?.name || 'Unknown'
  }

  // Group blocks by staff for display
  const blocksByStaff = scheduleBlocks.reduce((acc, block) => {
    if (!acc[block.staff_id]) {
      acc[block.staff_id] = []
    }
    acc[block.staff_id].push(block)
    return acc
  }, {} as Record<string, ScheduleBlock[]>)

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Schedule Management</h2>
          <p className="text-gray-600">Manage staff availability and schedule blocks</p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="bg-primary text-white hover:bg-primary-dark"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Schedule Block
        </Button>
      </div>

      {/* Staff Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Label>Filter by Staff:</Label>
            <Select value={selectedStaff} onValueChange={(value) => {
              setSelectedStaff(value)
              if (value) {
                fetchStaffScheduleBlocks(value)
              } else {
                fetchAllScheduleBlocks()
              }
            }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Staff</SelectItem>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Blocks List */}
      {error ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-600 mb-4">
              <h3 className="font-medium">Error Loading Schedule Blocks</h3>
              <p className="text-sm mt-2">{error}</p>
            </div>
            {error.includes('migration') && (
              <div className="text-sm text-gray-600 mt-4">
                <p>To fix this issue:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Run the database migration: <code className="bg-gray-100 px-2 py-1 rounded">supabase db push</code></li>
                  <li>Or apply migration 043 manually in your Supabase SQL editor</li>
                </ol>
              </div>
            )}
            <Button 
              onClick={() => fetchAllScheduleBlocks().catch(console.error)}
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : Object.keys(blocksByStaff).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No schedule blocks found</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(blocksByStaff).map(([staffId, blocks]) => (
          <Card key={staffId}>
            <CardHeader>
              <CardTitle className="text-lg">{getStaffName(staffId)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blocks.map(block => (
                  <div key={block.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant={block.block_type === 'full_day' ? 'default' : 'secondary'}>
                          {block.block_type === 'full_day' ? 'Full Day' : 'Time Range'}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          {(() => {
                            try {
                              const startDate = format(parseISO(block.start_date), 'MMM dd, yyyy')
                              const endDateDisplay = block.end_date && block.end_date !== block.start_date 
                                ? ` - ${format(parseISO(block.end_date), 'MMM dd, yyyy')}`
                                : ''
                              return startDate + endDateDisplay
                            } catch (error) {
                              return block.start_date + (block.end_date ? ` - ${block.end_date}` : '')
                            }
                          })()}
                        </div>
                        {block.block_type === 'time_range' && block.start_time && block.end_time && (
                          <div className="flex items-center text-sm text-gray-600">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {block.start_time} - {block.end_time}
                          </div>
                        )}
                      </div>
                      {block.reason && (
                        <p className="text-sm text-gray-700">Reason: {block.reason}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBlock(block)}
                      >
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add/Edit Schedule Block Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Edit Schedule Block' : 'Add Schedule Block'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select 
                value={formData.staffId} 
                onValueChange={(value) => setFormData({...formData, staffId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Block Type</Label>
              <Select 
                value={formData.blockType} 
                onValueChange={(value: 'full_day' | 'time_range') => setFormData({...formData, blockType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full Day</SelectItem>
                  <SelectItem value="time_range">Time Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input 
                  type="date" 
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  placeholder="Single day"
                />
              </div>
            </div>

            {formData.blockType === 'time_range' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input 
                    type="time" 
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Reason (optional)</Label>
              <Textarea 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="e.g., Vacation, Doctor's appointment, Lunch break"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddModal(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={() => handleAddBlock(false)}>
              {editingBlock ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}