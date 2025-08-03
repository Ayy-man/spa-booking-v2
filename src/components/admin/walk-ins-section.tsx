'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ClockIcon, 
  PhoneIcon, 
  MailIcon, 
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  FilterIcon,
  EyeOffIcon
} from 'lucide-react'
import { 
  walkInLogic, 
  WalkIn, 
  WALK_IN_STATUSES, 
  getWalkInStatusConfig, 
  formatWalkInTime,
  getTimeSinceCreated 
} from '@/lib/walk-in-logic'
import { cn } from '@/lib/utils'

interface WalkInsSectionProps {
  className?: string
}

export function WalkInsSection({ className }: WalkInsSectionProps) {
  const [walkIns, setWalkIns] = useState<WalkIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showUpdateForm, setShowUpdateForm] = useState<string | null>(null)
  const [updateNotes, setUpdateNotes] = useState('')

  const fetchWalkIns = async () => {
    setLoading(true)
    setError(null)

    try {
      const filters = selectedStatus === 'all' ? undefined : { status: selectedStatus }
      const result = await walkInLogic.getWalkIns(filters)

      if (result.success && result.walkIns) {
        setWalkIns(result.walkIns)
      } else {
        setError(result.error || 'Failed to fetch walk-ins')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch walk-ins')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWalkIns()
  }, [selectedStatus])

  const handleStatusUpdate = async (id: string, newStatus: string, notes?: string) => {
    setActionLoading(id)
    try {
      const result = await walkInLogic.updateWalkInStatus(id, newStatus as any, notes)
      
      if (result.success) {
        await fetchWalkIns() // Refresh the list
        setShowUpdateForm(null)
        setUpdateNotes('')
      } else {
        setError(result.error || 'Failed to update status')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleQuickAction = (walkIn: WalkIn, action: 'served' | 'cancelled' | 'no_show') => {
    const actionMap = {
      served: WALK_IN_STATUSES.SERVED,
      cancelled: WALK_IN_STATUSES.CANCELLED,
      no_show: WALK_IN_STATUSES.NO_SHOW
    }

    handleStatusUpdate(walkIn.id, actionMap[action])
  }

  const renderWalkInCard = (walkIn: WalkIn) => {
    const statusConfig = getWalkInStatusConfig(walkIn.status as any)
    const isUpdating = actionLoading === walkIn.id
    const isShowingForm = showUpdateForm === walkIn.id

    return (
      <Card key={walkIn.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{walkIn.name}</h4>
              <p className="text-sm text-gray-500">
                {formatWalkInTime(walkIn.created_at)} • {getTimeSinceCreated(walkIn.created_at)}
              </p>
            </div>
          </div>
          
          <Badge 
            className={cn(
              'text-xs font-medium',
              statusConfig.bgColor,
              statusConfig.textColor,
              statusConfig.borderColor
            )}
            variant="outline"
          >
            {statusConfig.label}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <PhoneIcon className="w-4 h-4" />
            <span>{walkIn.phone}</span>
          </div>
          
          {walkIn.email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MailIcon className="w-4 h-4" />
              <span>{walkIn.email}</span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-sm text-gray-900 mb-1">
              Service Requested:
            </div>
            <div className="text-sm text-gray-700">
              {walkIn.service?.name || walkIn.service_name || 'Unknown Service'}
              {walkIn.service && (
                <span className="text-gray-500 ml-2">
                  ({walkIn.service.duration}min • ${walkIn.service.price})
                </span>
              )}
            </div>
          </div>

          {walkIn.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="font-medium text-sm text-yellow-900 mb-1">Notes:</div>
              <div className="text-sm text-yellow-800">{walkIn.notes}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {walkIn.status === WALK_IN_STATUSES.WAITING && (
          <div className="space-y-3">
            {!isShowingForm ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleQuickAction(walkIn, 'served')}
                  disabled={isUpdating}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {isUpdating ? (
                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Mark Served
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpdateForm(walkIn.id)}
                  disabled={isUpdating}
                  className="border-gray-300"
                >
                  <AlertCircleIcon className="w-4 h-4 mr-1" />
                  Update Status
                </Button>
              </div>
            ) : (
              <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div>
                  <Label className="text-sm font-medium">Update Status</Label>
                  <Select onValueChange={(value) => {
                    if (value !== 'select') {
                      handleStatusUpdate(walkIn.id, value, updateNotes || undefined)
                    }
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>Select new status</SelectItem>
                      <SelectItem value={WALK_IN_STATUSES.SERVED}>Mark as Served</SelectItem>
                      <SelectItem value={WALK_IN_STATUSES.CANCELLED}>Mark as Cancelled</SelectItem>
                      <SelectItem value={WALK_IN_STATUSES.NO_SHOW}>Mark as No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Notes (Optional)</Label>
                  <Input
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Add notes about status update..."
                    className="mt-1"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowUpdateForm(null)
                      setUpdateNotes('')
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show actions for non-waiting statuses */}
        {walkIn.status !== WALK_IN_STATUSES.WAITING && (
          <div className="text-xs text-gray-500">
            Status updated: {walkIn.updated_at ? formatWalkInTime(walkIn.updated_at) : 'Unknown'}
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Walk-In Management</h2>
          <p className="text-sm text-gray-600">
            Manage walk-in customers and their service requests
          </p>
        </div>
        
        <Button
          onClick={fetchWalkIns}
          disabled={loading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCwIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FilterIcon className="w-4 h-4 text-gray-500" />
            <Label className="text-sm font-medium">Filter by Status:</Label>
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Walk-Ins</SelectItem>
              <SelectItem value={WALK_IN_STATUSES.WAITING}>Waiting</SelectItem>
              <SelectItem value={WALK_IN_STATUSES.SERVED}>Served</SelectItem>
              <SelectItem value={WALK_IN_STATUSES.CANCELLED}>Cancelled</SelectItem>
              <SelectItem value={WALK_IN_STATUSES.NO_SHOW}>No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <RefreshCwIcon className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading walk-ins...</p>
          </div>
        </div>
      )}

      {/* Walk-Ins List */}
      {!loading && (
        <>
          {walkIns.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <EyeOffIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Walk-Ins Found
                  </h3>
                  <p className="text-gray-600">
                    {selectedStatus === 'all' 
                      ? "No walk-in customers have checked in yet." 
                      : `No walk-ins with status "${selectedStatus}" found.`
                    }
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {walkIns.map(renderWalkInCard)}
            </div>
          )}

          {/* Summary Stats */}
          {walkIns.length > 0 && (
            <Card className="p-4 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{walkIns.length}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {walkIns.filter(w => w.status === WALK_IN_STATUSES.WAITING).length}
                  </div>
                  <div className="text-sm text-gray-600">Waiting</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {walkIns.filter(w => w.status === WALK_IN_STATUSES.SERVED).length}
                  </div>
                  <div className="text-sm text-gray-600">Served</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {walkIns.filter(w => w.status === WALK_IN_STATUSES.CANCELLED || w.status === WALK_IN_STATUSES.NO_SHOW).length}
                  </div>
                  <div className="text-sm text-gray-600">Other</div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}