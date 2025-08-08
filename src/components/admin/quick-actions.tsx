"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BookingWithRelations } from "@/types/booking"
import { supabase } from "@/lib/supabase"
import {
  markAsCompleted,
  markAsNoShow,
  createWalkInBooking,
  blockTimeSlot,
  getAllActiveStaff,
  checkStaffServiceCapability,
  validateBookingTime,
  calculateEndTime
} from "@/lib/admin-booking-logic"
import { ghlWebhookSender } from "@/lib/ghl-webhook-sender"

interface QuickActionsProps {
  booking?: BookingWithRelations
  onSuccess?: () => void
  className?: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
  category: string
}

interface Room {
  id: string
  name: string
}

interface StaffMember {
  id: string
  name: string
  default_room_id: string | null
}

type ActionType = "complete" | "no_show" | "walk_in" | "block_time" | null

export function QuickActions({ booking, onSuccess, className }: QuickActionsProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  // Form states
  const [completionNotes, setCompletionNotes] = useState("")
  const [noShowReason, setNoShowReason] = useState("")
  
  // Walk-in booking states
  const [walkInData, setWalkInData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceId: "",
    staffId: "",
    roomId: "",
    startTime: "",
    specialRequests: ""
  })

  // Time blocking states
  const [blockData, setBlockData] = useState({
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    reason: "",
    roomId: ""
  })

  // Options data
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    fetchOptions()
  }, [])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("")
        setError("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const fetchOptions = async () => {
    try {
      const [servicesResponse, roomsResponse] = await Promise.all([
        supabase.from("services").select("id, name, duration, price, category").eq("is_active", true).order("name"),
        supabase.from("rooms").select("id, name").eq("is_active", true).order("name")
      ])

      if (servicesResponse.error) throw servicesResponse.error
      if (roomsResponse.error) throw roomsResponse.error

      setServices(servicesResponse.data || [])
      setRooms(roomsResponse.data || [])

      const staffResult = await getAllActiveStaff()
      if (staffResult.success && staffResult.data) {
        setStaff(staffResult.data)
      }
    } catch (err: any) {
      setError(`Failed to load options: ${err.message}`)
    }
  }

  const handleAction = async (action: ActionType) => {
    if (!action) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      switch (action) {
        case "complete":
          if (!booking) throw new Error("No booking selected")
          const completeResult = await markAsCompleted(booking.id, completionNotes)
          if (!completeResult.success) throw new Error(completeResult.error)
          setSuccess("Appointment marked as completed")
          break

        case "no_show":
          if (!booking) throw new Error("No booking selected")
          const noShowResult = await markAsNoShow(booking.id, noShowReason)
          if (!noShowResult.success) throw new Error(noShowResult.error)
          setSuccess("Appointment marked as no show")
          break

        case "walk_in":
          const walkInResult = await createWalkInBooking(
            walkInData.serviceId,
            walkInData.staffId,
            walkInData.roomId,
            walkInData.customerName,
            walkInData.customerPhone,
            walkInData.customerEmail || undefined,
            walkInData.startTime || undefined,
            walkInData.specialRequests || undefined
          )
          if (!walkInResult.success) throw new Error(walkInResult.error)
          if (!walkInResult.bookingId) throw new Error('No booking ID returned')
          
          // Send walk-in webhook to GHL
          try {
            const selectedService = services.find(s => s.id === walkInData.serviceId)
            const selectedStaff = staff.find(s => s.id === walkInData.staffId)
            const selectedRoom = rooms.find(r => r.id === walkInData.roomId)
            
            if (selectedService) {
              const serviceCategory = getServiceCategory(selectedService.name)
              const ghlCategory = getGHLServiceCategory(selectedService.name)
              
              // Determine if this is an immediate walk-in (no start time specified)
              const isImmediate = !walkInData.startTime
              
              // Use current date and time for immediate walk-ins, or specified time for scheduled
              const currentDate = new Date().toISOString().split('T')[0]
              const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5)
              
              const result = await ghlWebhookSender.sendWalkInWebhook(
                walkInResult.bookingId,
                {
                  name: walkInData.customerName,
                  email: walkInData.customerEmail || '',
                  phone: walkInData.customerPhone || '',
                  isNewCustomer: true
                },
                {
                  service: selectedService.name,
                  serviceId: selectedService.id,
                  serviceCategory,
                  ghlCategory,
                  date: isImmediate ? currentDate : currentDate, // For now, use current date
                  time: isImmediate ? currentTime : walkInData.startTime,
                  duration: selectedService.duration,
                  price: selectedService.price,
                  staff: selectedStaff?.name || 'Any Available',
                  staffId: selectedStaff?.id || '',
                  room: selectedRoom ? `Room ${selectedRoom.name}` : 'TBD',
                  roomId: selectedRoom?.id || ''
                },
                isImmediate
              )
              
              if (result.success) {
                // Webhook sent successfully
              } else {
                // Log webhook error but don't fail the booking
                console.error('Walk-in webhook failed:', result.error)
              }
            }
          } catch (error) {
            // Don't fail the booking if webhook fails
            console.error('Walk-in webhook error:', error)
          }
          
          setSuccess(`Walk-in booking created successfully (ID: ${walkInResult.bookingId})`)
          // Reset form
          setWalkInData({
            customerName: "",
            customerPhone: "",
            customerEmail: "",
            serviceId: "",
            staffId: "",
            roomId: "",
            startTime: "",
            specialRequests: ""
          })
          break

        case "block_time":
          const blockResult = await blockTimeSlot(
            blockData.staffId,
            blockData.date,
            blockData.startTime,
            blockData.endTime,
            blockData.reason,
            blockData.roomId
          )
          if (!blockResult.success) throw new Error(blockResult.error)
          setSuccess("Time slot blocked successfully")
          // Reset form
          setBlockData({
            staffId: "",
            date: new Date().toISOString().split("T")[0],
            startTime: "",
            endTime: "",
            reason: "",
            roomId: ""
          })
          break
      }

      setActiveAction(null)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentTimeSlot = () => {
    const now = new Date()
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5)
    // Round to next 15-minute slot
    const [hours, minutes] = currentTime.split(":").map(Number)
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    const roundedHours = roundedMinutes >= 60 ? hours + 1 : hours
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes
    
    return `${String(roundedHours).padStart(2, "0")}:${String(finalMinutes).padStart(2, "0")}`
  }

  const generateTimeOptions = () => {
    const times = []
    for (let hour = 9; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        times.push({ value: timeStr, label: displayTime })
      }
    }
    return times
  }

  const validateWalkInData = () => {
    if (!walkInData.customerName.trim()) return "Customer name is required"
    if (!walkInData.customerPhone.trim()) return "Customer phone is required"
    if (!walkInData.serviceId) return "Service selection is required"
    if (!walkInData.staffId) return "Staff selection is required"
    if (!walkInData.roomId) return "Room selection is required"
    
    if (walkInData.startTime) {
      const service = services.find(s => s.id === walkInData.serviceId)
      if (service) {
        const validation = validateBookingTime(walkInData.startTime, service.duration)
        if (!validation.isValid) return validation.error
      }
    }
    
    return null
  }

  const validateBlockData = () => {
    if (!blockData.staffId) return "Staff selection is required"
    if (!blockData.date) return "Date is required"
    if (!blockData.startTime) return "Start time is required"
    if (!blockData.endTime) return "End time is required"
    if (!blockData.reason.trim()) return "Reason is required"
    if (!blockData.roomId) return "Room selection is required"
    
    if (blockData.startTime >= blockData.endTime) {
      return "End time must be after start time"
    }
    
    return null
  }

  // Render quick action buttons for booking with micro-interactions
  const renderBookingActions = () => {
    if (!booking) return null

    const canComplete = booking.status === "confirmed" || booking.status === "in_progress"
    const canMarkNoShow = booking.status === "confirmed"

    return (
      <div className="flex space-x-2">
        {canComplete && (
          <Button
            size="sm"
            onClick={() => setActiveAction("complete")}
            className="bg-green-600 text-white hover:bg-green-700 
                     transition-all duration-300 ease-out
                     hover:shadow-lg hover:shadow-green-200/40 hover:-translate-y-0.5
                     active:translate-y-0 active:shadow-sm
                     group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-1">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" 
                   fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Mark Complete
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Button>
        )}
        {canMarkNoShow && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveAction("no_show")}
            className="border-orange-300 text-orange-600 hover:bg-orange-50 
                     transition-all duration-300 ease-out
                     hover:shadow-lg hover:shadow-orange-200/40 hover:-translate-y-0.5
                     hover:border-orange-400
                     active:translate-y-0 active:shadow-sm
                     group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-1">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" 
                   fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              No Show
            </span>
          </Button>
        )}
      </div>
    )
  }

  // Render general quick actions with enhanced micro-interactions
  const renderGeneralActions = () => (
    <div className="flex flex-wrap gap-3">
      <Button
        size="lg"
        onClick={() => setActiveAction("walk_in")}
        className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 text-base font-medium
                 transition-all duration-300 ease-out
                 hover:shadow-lg hover:shadow-blue-200/40 hover:-translate-y-0.5
                 hover:scale-105 active:scale-95 active:translate-y-0
                 group relative overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Walk-in
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 
                       opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setActiveAction("block_time")}
        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 text-base font-medium
                 transition-all duration-300 ease-out
                 hover:shadow-lg hover:shadow-gray-200/40 hover:-translate-y-0.5
                 hover:scale-105 hover:border-gray-400 hover:bg-gray-100
                 active:scale-95 active:translate-y-0
                 group relative"
      >
        <span className="relative z-10 flex items-center gap-2">
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Block Time
        </span>
      </Button>
    </div>
  )

  // Render action modals/forms
  const renderActionForm = () => {
    switch (activeAction) {
      case "complete":
        return (
          <Card className="p-4 border-green-200 bg-green-50 
                         animate-in slide-in-from-top-4 fade-in duration-300
                         shadow-lg shadow-green-100/50">
            <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Mark as Completed
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="completion-notes" className="text-green-700 font-medium">
                  Completion Notes (optional)
                </Label>
                <Input
                  id="completion-notes"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Any notes about the service..."
                  className="border-green-200 focus:border-green-400 focus:ring-green-200"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAction("complete")}
                  disabled={loading}
                  className="bg-green-600 text-white hover:bg-green-700 
                           transition-all duration-200 ease-out
                           hover:shadow-lg hover:shadow-green-200/40
                           disabled:opacity-60 disabled:cursor-not-allowed
                           group"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Confirm Complete
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={loading}
                  className="border-green-300 text-green-700 hover:bg-green-100 
                           transition-all duration-200 ease-out"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )

      case "no_show":
        return (
          <Card className="p-4 border-orange-200 bg-orange-50">
            <h3 className="font-medium text-orange-800 mb-3">Mark as No Show</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="no-show-reason">Reason (optional)</Label>
                <Input
                  id="no-show-reason"
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  placeholder="No call, late cancellation, etc..."
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAction("no_show")}
                  disabled={loading}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  {loading ? "Processing..." : "Confirm No Show"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )

      case "walk_in":
        return (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <h3 className="font-medium text-blue-800 mb-3">Add Walk-in Appointment</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer-name">Customer Name *</Label>
                  <Input
                    id="customer-name"
                    value={walkInData.customerName}
                    onChange={(e) => setWalkInData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="First Last"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Phone Number *</Label>
                  <Input
                    id="customer-phone"
                    value={walkInData.customerPhone}
                    onChange={(e) => setWalkInData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customer-email">Email (optional)</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={walkInData.customerEmail}
                  onChange={(e) => setWalkInData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Service *</Label>
                  <Select
                    value={walkInData.serviceId}
                    onValueChange={(value) => setWalkInData(prev => ({ ...prev, serviceId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration}min - ${service.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Staff *</Label>
                  <Select
                    value={walkInData.staffId}
                    onValueChange={(value) => setWalkInData(prev => ({ ...prev, staffId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Room *</Label>
                  <Select
                    value={walkInData.roomId}
                    onValueChange={(value) => setWalkInData(prev => ({ ...prev, roomId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time (optional)</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={walkInData.startTime}
                    onChange={(e) => setWalkInData(prev => ({ ...prev, startTime: e.target.value }))}
                    placeholder={getCurrentTimeSlot()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for immediate booking</p>
                </div>
                <div>
                  <Label htmlFor="special-requests">Special Requests</Label>
                  <Input
                    id="special-requests"
                    value={walkInData.specialRequests}
                    onChange={(e) => setWalkInData(prev => ({ ...prev, specialRequests: e.target.value }))}
                    placeholder="Any special requests..."
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAction("walk_in")}
                  disabled={loading || !!validateWalkInData()}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {loading ? "Creating Booking..." : "Create Walk-in"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
              {validateWalkInData() && (
                <p className="text-sm text-red-600">{validateWalkInData()}</p>
              )}
            </div>
          </Card>
        )

      case "block_time":
        return (
          <Card className="p-4 border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-3">Block Time Slot</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Staff *</Label>
                  <Select
                    value={blockData.staffId}
                    onValueChange={(value) => setBlockData(prev => ({ ...prev, staffId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Room *</Label>
                  <Select
                    value={blockData.roomId}
                    onValueChange={(value) => setBlockData(prev => ({ ...prev, roomId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="block-date">Date *</Label>
                  <Input
                    id="block-date"
                    type="date"
                    value={blockData.date}
                    onChange={(e) => setBlockData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Start Time *</Label>
                  <Select
                    value={blockData.startTime}
                    onValueChange={(value) => setBlockData(prev => ({ ...prev, startTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Select
                    value={blockData.endTime}
                    onValueChange={(value) => setBlockData(prev => ({ ...prev, endTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="block-reason">Reason *</Label>
                <Input
                  id="block-reason"
                  value={blockData.reason}
                  onChange={(e) => setBlockData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Break, cleaning, maintenance, etc."
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAction("block_time")}
                  disabled={loading || !!validateBlockData()}
                  className="bg-gray-600 text-white hover:bg-gray-700"
                >
                  {loading ? "Blocking Time..." : "Block Time Slot"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
              {validateBlockData() && (
                <p className="text-sm text-red-600">{validateBlockData()}</p>
              )}
            </div>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Success/Error Messages */}
      {success && (
        <Card className="p-3 bg-green-50 border-green-200">
          <p className="text-green-700 text-sm">{success}</p>
        </Card>
      )}
      
      {error && (
        <Card className="p-3 bg-red-50 border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
        </Card>
      )}

      {/* Action Buttons */}
      {!activeAction && (
        <div className="space-y-3">
          {booking && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">Booking Actions</h3>
                {renderBookingActions()}
              </div>
              <hr className="border-gray-200" />
            </>
          )}
          
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
            {renderGeneralActions()}
          </div>
        </div>
      )}

      {/* Action Forms */}
      {activeAction && renderActionForm()}
    </div>
  )

  // Helper function to get service category from service name
  const getServiceCategory = (serviceName: string): string => {
    const name = serviceName.toLowerCase()
    
    if (name.includes('facial')) return 'facial'
    if (name.includes('massage')) return 'massage'
    if (name.includes('scrub') || name.includes('treatment') || name.includes('moisturizing')) return 'body_treatment'
    if (name.includes('wax')) return 'waxing'
    if (name.includes('package')) return 'package'
    
    return 'facial' // default
  }

  // Helper function to get GHL service category
  const getGHLServiceCategory = (serviceName: string): string => {
    const name = serviceName.toLowerCase()
    
    if (name.includes('facial')) return 'facial'
    if (name.includes('massage')) return 'massage'
    if (name.includes('scrub') || name.includes('treatment') || name.includes('moisturizing')) return 'body_treatment'
    if (name.includes('wax')) return 'waxing'
    if (name.includes('package')) return 'package'
    
    return 'facial' // default
  }
}