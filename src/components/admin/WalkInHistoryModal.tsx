'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CalendarIcon,
  DownloadIcon,
  SearchIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveIcon,
  RefreshCwIcon
} from 'lucide-react'
import { 
  walkInLogic, 
  WalkIn, 
  WALK_IN_STATUSES, 
  getWalkInStatusConfig, 
  formatWalkInTime,
  formatWalkInDate,
  HistoricalWalkInFilters
} from '@/lib/walk-in-logic'
import { cn } from '@/lib/utils'
import { formatPhoneNumber } from '@/lib/phone-utils'
import { exportWalkInsToCSV } from '@/lib/walk-in-export'

interface WalkInHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WalkInHistoryModal({ isOpen, onClose }: WalkInHistoryModalProps) {
  const [walkIns, setWalkIns] = useState<WalkIn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Initialize date range to last 7 days
  useEffect(() => {
    if (isOpen && !dateFrom && !dateTo) {
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      setDateFrom(sevenDaysAgo.toISOString().split('T')[0])
      setDateTo(today.toISOString().split('T')[0])
    }
  }, [isOpen, dateFrom, dateTo])

  const fetchHistoricalWalkIns = useCallback(async () => {
    if (!isOpen) return
    
    setLoading(true)
    setError(null)

    try {
      const filters: HistoricalWalkInFilters = {
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        dateFrom,
        dateTo,
        searchTerm: searchTerm.trim() || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      }

      const result = await walkInLogic.getHistoricalWalkIns(filters)

      if (result.success && result.walkIns) {
        setWalkIns(result.walkIns)
        setTotalCount(result.totalCount || 0)
      } else {
        setError(result.error || 'Failed to fetch historical walk-ins')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch historical walk-ins')
    } finally {
      setLoading(false)
    }
  }, [isOpen, selectedStatus, dateFrom, dateTo, searchTerm, currentPage, itemsPerPage])

  useEffect(() => {
    fetchHistoricalWalkIns()
  }, [fetchHistoricalWalkIns])

  const handleExportCSV = () => {
    if (walkIns.length === 0) {
      setError('No data to export')
      return
    }
    
    exportWalkInsToCSV(walkIns, { from: dateFrom, to: dateTo })
  }

  const handleSearch = () => {
    setCurrentPage(1) // Reset to first page on new search
    fetchHistoricalWalkIns()
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const renderWalkInCard = (walkIn: WalkIn) => {
    const statusConfig = getWalkInStatusConfig(walkIn.status as any)

    return (
      <Card key={walkIn.id} className="p-4 bg-gray-50">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{walkIn.customer_name}</h4>
              <p className="text-sm text-gray-500">
                {formatWalkInDate(walkIn.created_at)} • {formatWalkInTime(walkIn.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
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
            {walkIn.archived_at && (
              <Badge variant="secondary" className="text-xs">
                <ArchiveIcon className="w-3 h-3 mr-1" />
                Archived
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <PhoneIcon className="w-4 h-4" />
            <span>{formatPhoneNumber(walkIn.customer_phone)}</span>
          </div>
          
          {walkIn.customer_email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MailIcon className="w-4 h-4" />
              <span>{walkIn.customer_email}</span>
            </div>
          )}

          <div className="bg-white rounded p-2">
            <div className="text-xs font-medium text-gray-700">
              {walkIn.service_name}
              <span className="text-gray-500 ml-1">({walkIn.service_category})</span>
            </div>
          </div>

          {walkIn.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="text-xs text-yellow-800">{walkIn.notes}</div>
            </div>
          )}

          {walkIn.archived_at && (
            <div className="text-xs text-gray-500 flex items-center">
              <ClockIcon className="w-3 h-3 mr-1" />
              Archived: {formatWalkInDate(walkIn.archived_at)} at {formatWalkInTime(walkIn.archived_at)}
            </div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center">
            <ArchiveIcon className="w-5 h-5 mr-2" />
            Historical Walk-Ins
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Filters Section */}
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label className="text-sm">From Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm">To Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search */}
              <div>
                <Label className="text-sm">Search</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Name, phone, or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={WALK_IN_STATUSES.WAITING}>Waiting</SelectItem>
                    <SelectItem value={WALK_IN_STATUSES.SERVED}>Served</SelectItem>
                    <SelectItem value={WALK_IN_STATUSES.CANCELLED}>Cancelled</SelectItem>
                    <SelectItem value={WALK_IN_STATUSES.NO_SHOW}>No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SearchIcon className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                disabled={walkIns.length === 0}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200 mb-4">
              <p className="text-red-600">{error}</p>
            </Card>
          )}

          {/* Results */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <RefreshCwIcon className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading historical walk-ins...</p>
              </div>
            </div>
          ) : walkIns.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <ArchiveIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Historical Walk-Ins Found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search filters or date range.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {walkIns.map(renderWalkInCard)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center px-3 text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-white border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}