"use client"

import * as React from "react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  onRoomFilter: (roomId: string | null) => void
  onStaffFilter: (staffId: string | null) => void
  onStatusFilter: (status: string | null) => void
  onClearFilters: () => void
  rooms: Array<{ id: number; name: string }>
  staff: Array<{ id: string; name: string }>
  selectedRoom: string | null
  selectedStaff: string | null
  selectedStatus: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const statusOptions = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" }
]

export function FilterBar({
  onRoomFilter,
  onStaffFilter,
  onStatusFilter,
  onClearFilters,
  rooms,
  staff,
  selectedRoom,
  selectedStaff,
  selectedStatus,
  size = "md",
  className
}: FilterBarProps) {
  const hasActiveFilters = selectedRoom || selectedStaff || selectedStatus

  const getContainerClasses = () => {
    switch (size) {
      case 'sm':
        return "p-3 gap-2"
      case 'lg':
        return "p-6 gap-4"
      default:
        return "p-4 gap-3"
    }
  }

  const getSelectClasses = () => {
    switch (size) {
      case 'sm':
        return "h-8 text-xs"
      case 'lg':
        return "h-12 text-base"
      default:
        return "h-10 text-sm"
    }
  }

  const getButtonClasses = () => {
    switch (size) {
      case 'sm':
        return "h-8 px-3 text-xs"
      case 'lg':
        return "h-12 px-6 text-base"
      default:
        return "h-10 px-4 text-sm"
    }
  }

  return (
    <Card className={cn(
      "bg-white border border-gray-200",
      getContainerClasses(),
      className
    )}>
      <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3 md:items-center">
        {/* Room Filter */}
        <div className="flex-1 min-w-0">
          <Select
            value={selectedRoom || ""}
            onValueChange={(value) => onRoomFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className={getSelectClasses()}>
              <SelectValue placeholder="Filter by Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id.toString()}>
                  Room {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff Filter */}
        <div className="flex-1 min-w-0">
          <Select
            value={selectedStaff || ""}
            onValueChange={(value) => onStaffFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className={getSelectClasses()}>
              <SelectValue placeholder="Filter by Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex-1 min-w-0">
          <Select
            value={selectedStatus || ""}
            onValueChange={(value) => onStatusFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className={getSelectClasses()}>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className={cn(
              "shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50",
              getButtonClasses()
            )}
          >
            Clear Filters
          </Button>
        )}
      </div>
    </Card>
  )
}