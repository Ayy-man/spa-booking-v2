import { WalkIn } from './walk-in-logic'
import { formatWalkInDate, formatWalkInTime } from './walk-in-logic'
import { formatPhoneNumber } from './phone-utils'

/**
 * Convert walk-in data to CSV format
 */
export function walkInsToCSV(walkIns: WalkIn[]): string {
  // Define CSV headers
  const headers = [
    'Date',
    'Time',
    'Customer Name',
    'Phone',
    'Email',
    'Service',
    'Category',
    'Status',
    'Checked In',
    'Completed',
    'Archived',
    'Notes'
  ]

  // Create CSV rows
  const rows = walkIns.map(walkIn => {
    return [
      formatWalkInDate(walkIn.created_at),
      formatWalkInTime(walkIn.created_at),
      walkIn.customer_name,
      formatPhoneNumber(walkIn.customer_phone),
      walkIn.customer_email || '',
      walkIn.service_name,
      walkIn.service_category,
      walkIn.status.charAt(0).toUpperCase() + walkIn.status.slice(1).replace('_', ' '),
      walkIn.checked_in_at ? formatWalkInTime(walkIn.checked_in_at) : '',
      walkIn.completed_at ? formatWalkInTime(walkIn.completed_at) : '',
      walkIn.archived_at ? formatWalkInDate(walkIn.archived_at) : '',
      walkIn.notes ? `"${walkIn.notes.replace(/"/g, '""')}"` : ''
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string) {
  // Create blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  
  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export walk-ins to CSV file
 */
export function exportWalkInsToCSV(walkIns: WalkIn[], dateRange?: { from: string; to: string }) {
  const csvContent = walkInsToCSV(walkIns)
  
  // Generate filename with date
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  
  let filename = `walk-ins-${dateStr}`
  if (dateRange) {
    filename = `walk-ins-${dateRange.from}-to-${dateRange.to}`
  }
  filename += '.csv'
  
  downloadCSV(csvContent, filename)
}

/**
 * Format walk-in statistics for export
 */
export function formatWalkInStats(stats: {
  total: number
  waiting: number
  served: number
  cancelled: number
  noShow: number
}): string {
  return `
Walk-In Statistics Summary
==========================
Total Walk-Ins: ${stats.total}
Waiting: ${stats.waiting}
Served: ${stats.served}
Cancelled: ${stats.cancelled}
No Show: ${stats.noShow}
`
}