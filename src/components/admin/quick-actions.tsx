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
  id: number
  name: string
}

interface StaffMember {
  id: string
  name: string
  default_room_id: number | null
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

  // Render quick action buttons for booking
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
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Mark Complete
          </Button>
        )}
        {canMarkNoShow && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveAction("no_show")}
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            No Show
          </Button>
        )}
      </div>
    )
  }

  // Render general quick actions
  const renderGeneralActions = () => (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => setActiveAction("walk_in")}
        className="bg-blue-600 text-white hover:bg-blue-700"
      >
        Add Walk-in
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setActiveAction("block_time")}
        className="border-gray-300 text-gray-600 hover:bg-gray-50"
      >
        Block Time
      </Button>
    </div>
  )

  // Render action modals/forms
  const renderActionForm = () => {
    switch (activeAction) {
      case "complete":
        return (
          <Card className="p-4 border-green-200 bg-green-50">
            <h3 className="font-medium text-green-800 mb-3">Mark as Completed</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="completion-notes">Completion Notes (optional)</Label>
                <Input
                  id="completion-notes"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Any notes about the service..."
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAction("complete")}
                  disabled={loading}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {loading ? "Processing..." : "Confirm Complete"}
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
                        <SelectItem key={room.id} value={room.id.toString()}>
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
                        <SelectItem key={room.id} value={room.id.toString()}>
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
                  <Label htmlFor="block-start">Start Time *</Label>
                  <Input
                    id="block-start"
                    type="time"
                    value={blockData.startTime}
                    onChange={(e) => setBlockData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="block-end">End Time *</Label>
                  <Input
                    id="block-end"
                    type="time"
                    value={blockData.endTime}
                    onChange={(e) => setBlockData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
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
}