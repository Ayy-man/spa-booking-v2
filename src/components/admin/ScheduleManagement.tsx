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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, ClockIcon, PlusIcon, TrashIcon, EditIcon, SaveIcon, XIcon, AlertCircleIcon } from 'lucide-react'
import { format, parseISO, addDays, startOfWeek, isValid, isBefore, isAfter } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Staff, StaffSchedule, ScheduleBlock } from '@/types/booking'
import { StaffAvailabilityManager } from './StaffAvailabilityStatus'
import { toGuamTime, getGuamDateString } from '@/lib/timezone-utils'

// Simple notification function
const showNotification = (title: string, description: string, type: 'success' | 'error' = 'success') => {
  alert(`${title}: ${description}`)
}

// Days of the week for schedule display
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
]

// Default working hours
const DEFAULT_WORK_HOURS = {
  start_time: '09:00',
  end_time: '17:00'
}

interface WeeklySchedule {
  [key: number]: {
    isWorking: boolean
    start_time: string
    end_time: string
    break_start: string | null
    break_end: string | null
    notes: string | null
  }
}

interface StaffScheduleState {
  staff: Staff
  weeklySchedule: WeeklySchedule
  isEditing: boolean
}

export function ScheduleManagement() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffSchedules, setStaffSchedules] = useState<StaffScheduleState[]>([])
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'availability' | 'schedules' | 'blocks'>('availability')
  const [weekStartDate, setWeekStartDate] = useState<Date>(startOfWeek(new Date()))
  
  // Form state for adding schedule blocks (time off)
  const [showBlockModal, setShowBlockModal] = useState(false)
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
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch staff members and schedules on mount
  useEffect(() => {
    initializeData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initializeData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchStaff(),
        fetchScheduleBlocks()
      ])
    } catch (error) {
      console.error('Error initializing data:', error)
      setError('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('Error fetching staff:', error)
        throw new Error('Failed to load staff members')
      }

      const staffData = data || []
      setStaff(staffData)
      
      // Initialize staff schedule states
      const scheduleStates = await Promise.all(
        staffData.map(async (staffMember) => ({
          staff: staffMember,
          weeklySchedule: await fetchStaffWeeklySchedule(staffMember),
          isEditing: false
        }))
      )
      
      setStaffSchedules(scheduleStates)
    } catch (error) {
      console.error('Error in fetchStaff:', error)
      throw error
    }
  }

  // Fetch staff weekly schedule from work_days and create default schedule
  const fetchStaffWeeklySchedule = async (staffMember: Staff): Promise<WeeklySchedule> => {
    try {
      if (!staffMember) {
        console.warn('No staff member provided to fetchStaffWeeklySchedule')
        return createEmptyWeeklySchedule()
      }

      // Debug: Log staff member data

      // Get existing schedule records for this week
      const weekStart = format(weekStartDate, 'yyyy-MM-dd')
      const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd')
      
      const { data: scheduleData, error } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staffMember.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)

      if (error) {
        console.error('Error fetching staff schedule:', error)
      }

      // Debug: Log schedule data found

      // Create weekly schedule based on staff work_days and existing schedule records
      const weeklySchedule: WeeklySchedule = {}
      
      DAYS_OF_WEEK.forEach(day => {
        const scheduleRecord = scheduleData?.find(s => {
          const scheduleDate = new Date(s.date)
          return scheduleDate.getDay() === day.value
        })

        if (scheduleRecord) {
          // Use existing schedule record
          weeklySchedule[day.value] = {
            isWorking: scheduleRecord.is_available,
            start_time: scheduleRecord.start_time,
            end_time: scheduleRecord.end_time,
            break_start: scheduleRecord.break_start,
            break_end: scheduleRecord.break_end,
            notes: scheduleRecord.notes
          }
        } else {
          // Use default based on staff work_days - ensure work_days exists and is an array
          const workDays = staffMember.work_days || []
          const isWorkingDay = workDays.includes(day.value)
          
          weeklySchedule[day.value] = {
            isWorking: isWorkingDay,
            start_time: isWorkingDay ? DEFAULT_WORK_HOURS.start_time : '09:00',
            end_time: isWorkingDay ? DEFAULT_WORK_HOURS.end_time : '17:00',
            break_start: null,
            break_end: null,
            notes: null
          }
        }
      })

      return weeklySchedule
    } catch (error) {
      console.error('Error in fetchStaffWeeklySchedule:', error)
      return createEmptyWeeklySchedule()
    }
  }

  const createEmptyWeeklySchedule = (): WeeklySchedule => {
    const schedule: WeeklySchedule = {}
    DAYS_OF_WEEK.forEach(day => {
      schedule[day.value] = {
        isWorking: false,
        start_time: DEFAULT_WORK_HOURS.start_time,
        end_time: DEFAULT_WORK_HOURS.end_time,
        break_start: null,
        break_end: null,
        notes: null
      }
    })
    return schedule
  }

  const fetchScheduleBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .select('*')
        .order('start_date', { ascending: false })
      
      if (error) {
        console.error('Error fetching schedule blocks:', error)
        if (error.message?.includes('schedule_blocks') && error.message?.includes('does not exist')) {
          setError('Schedule blocks table not found. Please run the database migration first.')
        } else {
          setError('Failed to load schedule blocks: ' + error.message)
        }
      } else {
        setScheduleBlocks(data || [])
      }
    } catch (error: any) {
      console.error('Error in fetchScheduleBlocks:', error)
      setError('Failed to load schedule blocks: ' + (error.message || 'Unknown error'))
    }
  }

  // Schedule editing functions
  const toggleStaffEditing = (staffId: string) => {
    setStaffSchedules(prev => prev.map(schedule => 
      schedule.staff.id === staffId 
        ? { ...schedule, isEditing: !schedule.isEditing }
        : schedule
    ))
  }

  const updateStaffSchedule = (staffId: string, dayOfWeek: number, field: string, value: any) => {
    setStaffSchedules(prev => prev.map(schedule => 
      schedule.staff.id === staffId
        ? {
            ...schedule,
            weeklySchedule: {
              ...schedule.weeklySchedule,
              [dayOfWeek]: {
                ...schedule.weeklySchedule[dayOfWeek],
                [field]: value
              }
            }
          }
        : schedule
    ))
  }

  const saveStaffSchedule = async (staffId: string) => {
    try {
      const scheduleState = staffSchedules.find(s => s.staff.id === staffId)
      if (!scheduleState) return

      // Prepare schedule records for the week
      const scheduleRecords = DAYS_OF_WEEK.map(day => {
        const currentDate = addDays(weekStartDate, day.value)
        const daySchedule = scheduleState.weeklySchedule[day.value]
        
        return {
          staff_id: staffId,
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: daySchedule.start_time,
          end_time: daySchedule.end_time,
          is_available: daySchedule.isWorking,
          break_start: daySchedule.break_start,
          break_end: daySchedule.break_end,
          notes: daySchedule.notes
        }
      })

      // Delete existing records for this week and staff member
      const weekStart = format(weekStartDate, 'yyyy-MM-dd')
      const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd')
      
      await supabase
        .from('staff_schedules')
        .delete()
        .eq('staff_id', staffId)
        .gte('date', weekStart)
        .lte('date', weekEnd)

      // Insert new records
      const { error } = await supabase
        .from('staff_schedules')
        .insert(scheduleRecords)

      if (error) {
        console.error('Error saving staff schedule:', error)
        showNotification('Error', 'Failed to save schedule', 'error')
        return
      }

      // Update staff work_days in the staff table
      const workDays = DAYS_OF_WEEK
        .filter(day => scheduleState.weeklySchedule[day.value].isWorking)
        .map(day => day.value)

      await supabase
        .from('staff')
        .update({ work_days: workDays })
        .eq('id', staffId)

      // Toggle editing mode off
      toggleStaffEditing(staffId)
      showNotification('Success', 'Schedule saved successfully')
      
    } catch (error) {
      console.error('Error in saveStaffSchedule:', error)
      showNotification('Error', 'Failed to save schedule', 'error')
    }
  }

  const cancelStaffScheduleEdit = async (staffId: string) => {
    // Find the staff member and reload the original schedule
    const staffMember = staff.find(s => s.id === staffId)
    if (!staffMember) {
      console.error('Staff member not found for cancel edit:', staffId)
      return
    }
    
    const freshSchedule = await fetchStaffWeeklySchedule(staffMember)
    setStaffSchedules(prev => prev.map(schedule => 
      schedule.staff.id === staffId
        ? { ...schedule, weeklySchedule: freshSchedule, isEditing: false }
        : schedule
    ))
  }


  // Validation helper function
  const validateBlockForm = (): string[] => {
    const errors: string[] = []
    
    if (!formData.staffId) {
      errors.push('Please select a staff member')
    }
    
    if (!formData.startDate) {
      errors.push('Please select a start date')
    } else {
      // Validate date format
      const startDate = new Date(formData.startDate)
      if (!isValid(startDate)) {
        errors.push('Invalid start date format')
      } else {
        // Check if start date is in the past (allow today)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (isBefore(startDate, today)) {
          errors.push('Start date cannot be in the past')
        }
      }
    }
    
    // Validate end date if provided
    if (formData.endDate) {
      const endDate = new Date(formData.endDate)
      if (!isValid(endDate)) {
        errors.push('Invalid end date format')
      } else if (formData.startDate) {
        const startDate = new Date(formData.startDate)
        if (isValid(startDate) && isBefore(endDate, startDate)) {
          errors.push('End date cannot be before start date')
        }
      }
    }
    
    // Validate time range requirements
    if (formData.blockType === 'time_range') {
      if (!formData.startTime) {
        errors.push('Please select a start time for time range blocks')
      }
      if (!formData.endTime) {
        errors.push('Please select an end time for time range blocks')
      }
      if (formData.startTime && formData.endTime) {
        // Validate time format and order
        const [startHour, startMin] = formData.startTime.split(':').map(Number)
        const [endHour, endMin] = formData.endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin
        
        if (startMinutes >= endMinutes) {
          errors.push('End time must be after start time')
        }
      }
    }
    
    return errors
  }

  // Check for existing bookings that would be affected by the schedule block
  const checkExistingBookings = async (staffId: string, startDate: string, endDate?: string, startTime?: string, endTime?: string) => {
    try {
      console.log('🔍 Checking existing bookings for:', { staffId, startDate, endDate, startTime, endTime })
      
      // Use dates as-is since database stores them as timezone-agnostic DATE type
      // The form provides dates in YYYY-MM-DD format which matches database storage
      console.log('📅 Using dates directly:', { 
        originalStartDate: startDate, 
        originalEndDate: endDate,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentGuamTime: new Date().toLocaleString('en-US', { timeZone: 'Pacific/Guam' })
      })
      
      const queryStartDate = startDate
      let queryEndDate = startDate
      if (endDate && endDate !== startDate) {
        queryEndDate = endDate
      }
      
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          customer:customers(first_name, last_name),
          service:services(name),
          status
        `)
        .eq('staff_id', staffId)
        .in('status', ['confirmed', 'pending', 'in_progress'])

      // Add date filtering
      if (endDate && endDate !== startDate) {
        // Date range
        bookingsQuery = bookingsQuery
          .gte('appointment_date', queryStartDate)
          .lte('appointment_date', queryEndDate)
      } else {
        // Single date
        bookingsQuery = bookingsQuery.eq('appointment_date', queryStartDate)
      }

      const { data: bookings, error } = await bookingsQuery

      if (error) {
        console.error('Error checking existing bookings:', error)
        return []
      }

      console.log('📅 Found bookings:', bookings?.length || 0, bookings)

      let filteredBookings = bookings || []

      // Filter by time if it's a time range block
      if (startTime && endTime) {
        filteredBookings = bookings?.filter(booking => {
          const bookingStart = booking.start_time
          const bookingEnd = booking.end_time
          
          console.log(`🕐 Checking time overlap: booking ${bookingStart}-${bookingEnd} vs block ${startTime}-${endTime}`)
          
          // Check if booking time overlaps with block time
          const overlaps = (bookingStart < endTime && bookingEnd > startTime)
          console.log(`🔄 Overlap result: ${overlaps}`)
          
          return overlaps
        }) || []
        
        console.log('⏰ After time filtering:', filteredBookings.length, filteredBookings)
      }

      return filteredBookings
    } catch (error) {
      console.error('Error in checkExistingBookings:', error)
      return []
    }
  }

  // Schedule block (time off) functions
  const handleAddBlock = async () => {
    try {
      setIsSubmitting(true)
      
      // Clear previous validation errors
      setValidationErrors([])
      
      // Validate form
      const errors = validateBlockForm()
      if (errors.length > 0) {
        setValidationErrors(errors)
        showNotification('Validation Error', errors[0], 'error')
        return
      }

      // Check for existing bookings that would be affected
      const existingBookings = await checkExistingBookings(
        formData.staffId,
        formData.startDate,
        formData.endDate,
        formData.startTime,
        formData.endTime
      )

      console.log('🚨 Existing bookings found:', existingBookings.length, existingBookings)

      // Show warning if there are existing bookings
      if (existingBookings.length > 0) {
        console.log('⚠️ Showing warning dialog for', existingBookings.length, 'bookings')
        const bookingList = existingBookings.map(booking => {
          const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
          const service = Array.isArray(booking.service) ? booking.service[0] : booking.service
          return `• ${customer?.first_name} ${customer?.last_name} - ${service?.name} (${booking.start_time} - ${booking.end_time})`
        }).join('\n')

        const confirmMessage = `⚠️ WARNING: This staff member has ${existingBookings.length} confirmed booking(s) during this time period:\n\n${bookingList}\n\nBlocking this time will prevent these appointments from being served. Are you sure you want to proceed?`
        
        if (!window.confirm(confirmMessage)) {
          setIsSubmitting(false)
          return
        }
      }
      
      // Create the schedule block data
      const blockData: any = {
        staff_id: formData.staffId,
        block_type: formData.blockType,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        start_time: formData.blockType === 'time_range' ? formData.startTime : null,
        end_time: formData.blockType === 'time_range' ? formData.endTime : null,
        reason: formData.reason || null
      }
      
      let result
      if (editingBlock) {
        result = await supabase
          .from('schedule_blocks')
          .update(blockData)
          .eq('id', editingBlock.id)
          .select()
      } else {
        result = await supabase
          .from('schedule_blocks')
          .insert([blockData])
          .select()
      }
      
      const { data, error } = result
      
      if (error) {
        console.error('Error saving schedule block:', error)
        let errorMessage = 'Failed to save schedule block'
        
        // Provide more specific error messages
        if (error.message?.includes('foreign key constraint')) {
          errorMessage = 'Invalid staff member selected'
        } else if (error.message?.includes('check constraint')) {
          errorMessage = 'Invalid data format - please check your inputs'
        } else if (error.code === '23505') {
          errorMessage = 'A similar schedule block already exists for this time period'
        }
        
        showNotification('Error', errorMessage, 'error')
        return
      }
      
      // Success
      showNotification('Success', editingBlock ? 'Time block updated successfully' : 'Time block added successfully')
      
      // Reset form and refresh data
      resetBlockForm()
      setShowBlockModal(false)
      await fetchScheduleBlocks()
      
    } catch (error: any) {
      console.error('Unexpected error saving schedule block:', error)
      showNotification('Error', 'An unexpected error occurred. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!window.confirm('Are you sure you want to delete this time block? This action cannot be undone.')) {
      return
    }
    
    const { error } = await supabase
      .from('schedule_blocks')
      .delete()
      .eq('id', blockId)
    
    if (error) {
      console.error('Error deleting schedule block:', error)
      showNotification('Error', 'Failed to delete time block', 'error')
    } else {
      showNotification('Success', 'Time block deleted')
      fetchScheduleBlocks()
    }
  }

  const handleEditBlock = (block: ScheduleBlock) => {
    setEditingBlock(block)
    setFormData({
      staffId: block.staff_id,
      blockType: block.block_type,
      startDate: formatDateForInput(block.start_date),
      endDate: block.end_date ? formatDateForInput(block.end_date) : '',
      startTime: block.start_time || '',
      endTime: block.end_time || '',
      reason: block.reason || ''
    })
    setValidationErrors([])
    setIsSubmitting(false)
    setShowBlockModal(true)
  }

  const resetBlockForm = () => {
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
    setValidationErrors([])
    setIsSubmitting(false)
  }

  // Helper function to format date for input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (!isValid(date)) return ''
      return format(date, 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayForInput = () => {
    return format(new Date(), 'yyyy-MM-dd')
  }

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId)
    return staffMember?.name || 'Unknown'
  }

  // Helper function to get week date range string
  const getWeekDateRange = () => {
    const weekEnd = addDays(weekStartDate, 6)
    return `${format(weekStartDate, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
  }

  // Filter schedule blocks by selected staff if any
  const filteredScheduleBlocks = selectedStaffId && selectedStaffId !== 'all'
    ? scheduleBlocks.filter(block => block.staff_id === selectedStaffId)
    : scheduleBlocks

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#AA3B50]">Staff Schedule Management</h2>
          <p className="text-gray-600">Manage staff working schedules and time off</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setWeekStartDate(startOfWeek(addDays(weekStartDate, -7)))}
            variant="outline"
            size="sm"
          >
            Previous Week
          </Button>
          <Button 
            onClick={() => setWeekStartDate(startOfWeek(addDays(weekStartDate, 7)))}
            variant="outline"
            size="sm"
          >
            Next Week
          </Button>
          <Button 
            onClick={() => setWeekStartDate(startOfWeek(new Date()))}
            variant="outline"
            size="sm"
          >
            Current Week
          </Button>
        </div>
      </div>

      {/* Week Display */}
      <Card className="bg-[#F8F8F8] border-[#F6C7CF]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <h3 className="text-lg font-medium text-[#AA3B50]">
              Week of {getWeekDateRange()}
            </h3>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Availability, Schedules, and Time Off */}
      <Tabs className="w-full">
        <TabsList className="bg-white border border-[#F6C7CF]">
          <TabsTrigger 
            value="availability"
            active={activeTab === 'availability'}
            onClick={() => setActiveTab('availability')}
            className={activeTab === 'availability' ? 'bg-[#C36678] text-white' : ''}
          >
            <AlertCircleIcon className="w-4 h-4 mr-2" />
            Availability Status
          </TabsTrigger>
          <TabsTrigger 
            value="schedules"
            active={activeTab === 'schedules'}
            onClick={() => setActiveTab('schedules')}
            className={activeTab === 'schedules' ? 'bg-[#C36678] text-white' : ''}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Working Schedules
          </TabsTrigger>
          <TabsTrigger 
            value="blocks"
            active={activeTab === 'blocks'}
            onClick={() => setActiveTab('blocks')}
            className={activeTab === 'blocks' ? 'bg-[#C36678] text-white' : ''}
          >
            <ClockIcon className="w-4 h-4 mr-2" />
            Time Blocks
          </TabsTrigger>
        </TabsList>

        {/* Availability Status Tab */}
        <TabsContent value="availability" activeValue={activeTab} className="space-y-4">
          <StaffAvailabilityManager />
        </TabsContent>

        {/* Working Schedules Tab */}
        <TabsContent value="schedules" activeValue={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C36678]"></div>
            </div>
          ) : error ? (
            <Card className="border-red-200">
              <CardContent className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <h3 className="font-medium">Error Loading Schedules</h3>
                  <p className="text-sm mt-2">{error}</p>
                </div>
                <Button 
                  onClick={() => initializeData()}
                  className="mt-4"
                  variant="outline"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : staffSchedules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No staff members found</p>
              </CardContent>
            </Card>
          ) : (
            staffSchedules.map((scheduleState) => (
              <Card key={scheduleState.staff.id} className="border-[#F6C7CF] hover:shadow-md transition-shadow">
                <CardHeader className="bg-[#F8F8F8]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#AA3B50]">
                      {scheduleState.staff.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      {!scheduleState.isEditing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStaffEditing(scheduleState.staff.id)}
                          className="border-[#C36678] text-[#C36678] hover:bg-[#F6C7CF]"
                        >
                          <EditIcon className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveStaffSchedule(scheduleState.staff.id)}
                            className="bg-black text-white hover:bg-gray-900"
                          >
                            <SaveIcon className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelStaffScheduleEdit(scheduleState.staff.id)}
                          >
                            <XIcon className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Weekly Schedule Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const daySchedule = scheduleState.weeklySchedule[day.value]
                      return (
                        <div
                          key={day.value}
                          className={`p-4 rounded-lg border transition-colors ${
                            daySchedule.isWorking 
                              ? 'bg-[#F6C7CF] border-[#C36678]' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="text-center mb-3">
                            <h4 className="font-medium text-sm text-[#AA3B50]">
                              {day.label}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {format(addDays(weekStartDate, day.value), 'MMM dd')}
                            </p>
                          </div>
                          
                          {scheduleState.isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={daySchedule.isWorking}
                                  onCheckedChange={(checked) => 
                                    updateStaffSchedule(scheduleState.staff.id, day.value, 'isWorking', checked)
                                  }
                                />
                              </div>
                              {daySchedule.isWorking && (
                                <>
                                  <div>
                                    <Label className="text-xs">Start</Label>
                                    <Input
                                      type="time"
                                      value={daySchedule.start_time}
                                      onChange={(e) => 
                                        updateStaffSchedule(scheduleState.staff.id, day.value, 'start_time', e.target.value)
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">End</Label>
                                    <Input
                                      type="time"
                                      value={daySchedule.end_time}
                                      onChange={(e) => 
                                        updateStaffSchedule(scheduleState.staff.id, day.value, 'end_time', e.target.value)
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-center space-y-1">
                              {daySchedule.isWorking ? (
                                <>
                                  <Badge variant="default" className="bg-[#C36678] text-white text-xs">
                                    Working
                                  </Badge>
                                  <p className="text-xs font-medium">
                                    {daySchedule.start_time} - {daySchedule.end_time}
                                  </p>
                                </>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Off
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Time Blocks Tab */}
        <TabsContent value="blocks" activeValue={activeTab} className="space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Label>Filter by Staff:</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => {
                resetBlockForm()
                setShowBlockModal(true)
              }}
              className="bg-black text-white hover:bg-gray-900"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Time Block
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C36678]"></div>
            </div>
          ) : filteredScheduleBlocks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No time blocks scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredScheduleBlocks.map(block => (
                <Card key={block.id} className="border-[#F6C7CF]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge 
                            variant={block.block_type === 'full_day' ? 'default' : 'secondary'}
                            className={block.block_type === 'full_day' ? 'bg-[#C36678] text-white' : ''}
                          >
                            {block.block_type === 'full_day' ? 'Full Day' : 'Time Range'}
                          </Badge>
                          <span className="font-medium text-[#AA3B50]">
                            {getStaffName(block.staff_id)}
                          </span>
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
                          className="border-[#C36678] text-[#C36678] hover:bg-[#F6C7CF]"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Time Block Modal */}
      <Dialog open={showBlockModal} onOpenChange={(open) => {
        if (!open) {
          resetBlockForm()
        }
        setShowBlockModal(open)
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
            <DialogTitle className="text-[#AA3B50]">
              {editingBlock ? 'Edit Time Block' : 'Add Time Block'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
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
              <Label>Type</Label>
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

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Start Date *</Label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={formData.startDate}
                    min={getTodayForInput()}
                    onChange={(e) => {
                      setFormData({...formData, startDate: e.target.value})
                      // Clear validation errors when user starts fixing them
                      if (validationErrors.length > 0) {
                        setValidationErrors([])
                      }
                    }}
                    className="flex-1 cursor-pointer"
                    style={{ colorScheme: 'light' }}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({...formData, startDate: getTodayForInput()})
                      if (validationErrors.length > 0) {
                        setValidationErrors([])
                      }
                    }}
                    className="text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setFormData({...formData, startDate: format(tomorrow, 'yyyy-MM-dd')})
                      if (validationErrors.length > 0) {
                        setValidationErrors([])
                      }
                    }}
                    className="text-xs"
                  >
                    Tomorrow
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Select the date to block</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">End Date (optional)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={formData.endDate}
                    min={formData.startDate || getTodayForInput()}
                    onChange={(e) => {
                      setFormData({...formData, endDate: e.target.value})
                      if (validationErrors.length > 0) {
                        setValidationErrors([])
                      }
                    }}
                    className="flex-1 cursor-pointer"
                    style={{ colorScheme: 'light' }}
                    placeholder="Leave empty for single day"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({...formData, endDate: ''})}
                    className="text-xs"
                    disabled={!formData.endDate}
                  >
                    Clear
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">For multi-day blocks only</p>
              </div>
            </div>

            {formData.blockType === 'time_range' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Start Time *</Label>
                    <Input 
                      type="time" 
                      value={formData.startTime}
                      onChange={(e) => {
                        setFormData({...formData, startTime: e.target.value})
                        if (validationErrors.length > 0) {
                          setValidationErrors([])
                        }
                      }}
                      className="w-full cursor-pointer"
                      style={{ colorScheme: 'light' }}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">End Time *</Label>
                    <Input 
                      type="time" 
                      value={formData.endTime}
                      min={formData.startTime || undefined}
                      onChange={(e) => {
                        setFormData({...formData, endTime: e.target.value})
                        if (validationErrors.length > 0) {
                          setValidationErrors([])
                        }
                      }}
                      className="w-full cursor-pointer"
                      style={{ colorScheme: 'light' }}
                      required
                    />
                  </div>
                </div>
                
                {/* Quick time presets */}
                <div>
                  <p className="text-xs text-gray-600 mb-2">Quick presets:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({...formData, startTime: '12:00', endTime: '13:00'})
                        if (validationErrors.length > 0) setValidationErrors([])
                      }}
                      className="text-xs"
                    >
                      Lunch (12-1pm)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({...formData, startTime: '09:00', endTime: '10:00'})
                        if (validationErrors.length > 0) setValidationErrors([])
                      }}
                      className="text-xs"
                    >
                      Morning (9-10am)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({...formData, startTime: '15:00', endTime: '16:00'})
                        if (validationErrors.length > 0) setValidationErrors([])
                      }}
                      className="text-xs"
                    >
                      Afternoon (3-4pm)
                    </Button>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <ClockIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Time Range Block</p>
                      <p className="text-xs mt-1">This will block the selected time period only. Staff will be available outside these hours.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Reason</Label>
              <Textarea 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="e.g., Lunch break, Meeting, Doctor's appointment, Personal time, Vacation"
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Optional - helps with scheduling coordination</p>
            </div>
            
            {/* Summary of what will be blocked */}
            {formData.staffId && formData.startDate && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Block Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Staff:</strong> {getStaffName(formData.staffId)}</p>
                  <p><strong>Date:</strong> {formData.startDate}{formData.endDate && formData.endDate !== formData.startDate ? ` to ${formData.endDate}` : ''}</p>
                  <p><strong>Type:</strong> {formData.blockType === 'full_day' ? 'Full Day Block' : 'Time Range Block'}</p>
                  {formData.blockType === 'time_range' && formData.startTime && formData.endTime && (
                    <p><strong>Time:</strong> {formData.startTime} - {formData.endTime}</p>
                  )}
                  {formData.reason && (
                    <p><strong>Reason:</strong> {formData.reason}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBlockModal(false)
                resetBlockForm()
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddBlock}
              disabled={isSubmitting || !formData.staffId || !formData.startDate}
              className="bg-black text-white hover:bg-gray-900 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{editingBlock ? 'Updating...' : 'Saving...'}</span>
                </div>
              ) : (
                editingBlock ? 'Update Block' : 'Save Block'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}