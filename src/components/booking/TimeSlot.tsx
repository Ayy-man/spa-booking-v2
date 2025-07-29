'use client'

interface TimeSlotProps {
  time: string
  endTime?: string
  available: boolean
  selected: boolean
  onClick: () => void
  className?: string
}

export default function TimeSlot({ 
  time, 
  endTime, 
  available, 
  selected, 
  onClick, 
  className = '' 
}: TimeSlotProps) {
  const getSlotClassName = () => {
    const baseClasses = 'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] flex items-center justify-center'
    
    if (!available) {
      return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`
    }
    
    if (selected) {
      return `${baseClasses} bg-primary text-white border border-primary shadow-md`
    }
    
    return `${baseClasses} bg-white border border-gray-200 hover:bg-accent hover:border-primary text-gray-900 cursor-pointer`
  }

  const formatTimeRange = () => {
    if (endTime) {
      return `${time} - ${endTime}`
    }
    return time
  }

  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      className={`${getSlotClassName()} ${className}`}
      type="button"
    >
      <span className="text-center">
        {formatTimeRange()}
      </span>
    </button>
  )
}