'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  PhoneIcon, 
  MailIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  MapPinIcon
} from 'lucide-react'
import BookingStatusUpdate from '@/components/admin/BookingStatusUpdate'

interface StaffMember {
  id: string
  name: string
  initials: string
  specialties: string[]
}

interface AppointmentData {
  id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  service_name: string
  appointment_date: string
  start_time: string
  end_time: string
  duration: number
  price: number
  status: string
  payment_status: string
  staff_name: string
  room_name: string
  notes?: string
  internal_notes?: string
}

// Mock data - in real app this would come from Supabase
const MOCK_STAFF: StaffMember[] = [
  { id: 'staff_1', name: 'Sarah Johnson', initials: 'SJ', specialties: ['Facial', 'Body Treatment'] },
  { id: 'staff_2', name: 'Maria Rodriguez', initials: 'MR', specialties: ['Massage', 'Waxing'] },
  { id: 'staff_3', name: 'Ashley Chen', initials: 'AC', specialties: ['Facial', 'Massage'] },
  { id: 'staff_4', name: 'Emma Wilson', initials: 'EW', specialties: ['Waxing', 'Body Treatment'] }
]

const MOCK_APPOINTMENTS: AppointmentData[] = [
  {
    id: 'appt_1',
    customer_name: 'Jennifer Smith',
    customer_email: 'jennifer@email.com',
    customer_phone: '(555) 123-4567',
    service_name: 'Deep Cleansing Facial',
    appointment_date: '2025-08-02',
    start_time: '09:00',
    end_time: '10:00',
    duration: 60,
    price: 79,
    status: 'confirmed',
    payment_status: 'paid',
    staff_name: 'Sarah Johnson',
    room_name: 'Room 1',
    notes: 'First-time client, mentioned sensitive skin'
  },
  {
    id: 'appt_2',
    customer_name: 'Michael Davis',
    customer_email: 'michael@email.com',
    customer_phone: '(555) 987-6543',
    service_name: 'Hot Stone Massage',
    appointment_date: '2025-08-02',
    start_time: '10:30',
    end_time: '11:30',
    duration: 60,
    price: 90,
    status: 'confirmed',
    payment_status: 'paid',
    staff_name: 'Maria Rodriguez',
    room_name: 'Room 2'
  },
  {
    id: 'appt_3',
    customer_name: 'Lisa Thompson',
    customer_email: 'lisa@email.com',
    customer_phone: '(555) 456-7890',
    service_name: 'Brazilian Wax (Women)',
    appointment_date: '2025-08-02',
    start_time: '14:00',
    end_time: '14:45',
    duration: 45,
    price: 60,
    status: 'confirmed',
    payment_status: 'paid',
    staff_name: 'Emma Wilson',
    room_name: 'Room 3'
  }
]

export default function StaffAppointmentsPage() {
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [loading, setLoading] = useState(false)

  // Filter appointments based on selected staff and date
  useEffect(() => {
    if (selectedStaff) {
      const staffMember = MOCK_STAFF.find(s => s.id === selectedStaff)
      if (staffMember) {
        // Filter mock appointments by staff name and date
        const filtered = MOCK_APPOINTMENTS.filter(
          apt => apt.staff_name === staffMember.name && apt.appointment_date === selectedDate
        )
        setAppointments(filtered)
      }
    } else {
      setAppointments([])
    }
  }, [selectedStaff, selectedDate])

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === bookingId 
          ? { ...apt, status: newStatus }
          : apt
      )
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'confirmed': { color: 'bg-blue-100 text-blue-700', icon: CheckCircleIcon },
      'completed': { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
      'no_show': { color: 'bg-red-100 text-red-700', icon: XCircleIcon },
      'cancelled': { color: 'bg-gray-100 text-gray-700', icon: XCircleIcon },
      'rescheduled': { color: 'bg-orange-100 text-orange-700', icon: AlertCircleIcon }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  const getTimeUntilAppointment = (date: string, time: string) => {
    const now = new Date()
    const appointmentDateTime = new Date(`${date}T${time}`)
    const diffMs = appointmentDateTime.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffMs < 0) return 'Overdue'
    if (diffHours < 1) return `${diffMinutes}m`
    return `${diffHours}h ${diffMinutes}m`
  }

  const upcomingAppointments = appointments.filter(apt => {
    const now = new Date()
    const aptTime = new Date(`${apt.appointment_date}T${apt.start_time}`)
    return aptTime > now && apt.status === 'confirmed'
  }).sort((a, b) => a.start_time.localeCompare(b.start_time))

  const nextAppointment = upcomingAppointments[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-md mb-4">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-primary">Staff Appointments</h1>
          </div>
          <p className="text-gray-600">
            View and manage individual staff appointments
          </p>
        </div>

        {/* Staff and Date Selection */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Staff Member
              </label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_STAFF.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {staff.initials}
                        </div>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-xs text-gray-500">{staff.specialties.join(', ')}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Next Appointment Alert */}
        {nextAppointment && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <ClockIcon className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Next Appointment:</strong> {nextAppointment.service_name} with {nextAppointment.customer_name} 
              at {nextAppointment.start_time} • Starting in {getTimeUntilAppointment(nextAppointment.appointment_date, nextAppointment.start_time)}
            </AlertDescription>
          </Alert>
        )}

        {/* Appointments List */}
        {selectedStaff ? (
          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <Card key={appointment.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-6">
                    {/* Appointment Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                          {appointment.customer_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.customer_name}
                          </h3>
                          <p className="text-gray-600">{appointment.service_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary mb-1">
                          ${appointment.price}
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <span>{appointment.start_time} - {appointment.end_time}</span>
                        <span className="text-gray-500">({appointment.duration} min)</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                        <span>{appointment.room_name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span>{appointment.customer_phone || 'No phone'}</span>
                      </div>
                    </div>

                    {/* Customer Contact */}
                    {appointment.customer_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <MailIcon className="w-4 h-4 text-gray-400" />
                        <span>{appointment.customer_email}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-yellow-800 mb-1">Customer Notes:</div>
                        <div className="text-sm text-yellow-700">{appointment.notes}</div>
                      </div>
                    )}

                    {appointment.internal_notes && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-800 mb-1">Internal Notes:</div>
                        <div className="text-sm text-gray-700">{appointment.internal_notes}</div>
                      </div>
                    )}

                    {/* Status Update Component */}
                    <BookingStatusUpdate
                      booking={appointment}
                      onStatusUpdate={handleStatusUpdate}
                    />
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Appointments Found
                </h3>
                <p className="text-gray-600">
                  No appointments scheduled for {MOCK_STAFF.find(s => s.id === selectedStaff)?.name} on {selectedDate}
                </p>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a Staff Member
            </h3>
            <p className="text-gray-600">
              Choose a staff member above to view their appointments
            </p>
          </Card>
        )}

        {/* Quick Actions */}
        {selectedStaff && appointments.length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm">
                View Schedule
              </Button>
              <Button variant="outline" size="sm">
                Add Note
              </Button>
              <Button variant="outline" size="sm">
                Contact Customer
              </Button>
              <Button variant="outline" size="sm">
                Generate Report
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}