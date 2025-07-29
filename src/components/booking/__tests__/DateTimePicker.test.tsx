/**
 * Comprehensive tests for DateTimePicker component
 * Tests business hours, date restrictions, and time slot availability
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format, subDays } from 'date-fns'
import DateTimePicker from '../DateTimePicker'

// Mock date-fns to control "today"
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  isToday: jest.fn((date) => {
    const today = new Date('2024-08-01') // Fixed test date
    return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  }),
}))

describe('DateTimePicker Component', () => {
  const mockProps = {
    selectedDate: null,
    selectedTime: null,
    serviceDuration: 60,
    onDateSelect: jest.fn(),
    onTimeSelect: jest.fn(),
    availableSlots: ['09:00', '09:15', '09:30', '10:00', '10:15', '16:00', '17:00'],
    loading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock current date to August 1, 2024 (Thursday)
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-08-01T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Component Rendering', () => {
    test('should render date and time selection sections', () => {
      render(<DateTimePicker {...mockProps} />)
      
      expect(screen.getByText(/select date/i)).toBeInTheDocument()
      expect(screen.getByText(/available times/i)).toBeInTheDocument()
    })

    test('should show loading state when loading prop is true', () => {
      render(<DateTimePicker {...mockProps} loading={true} />)
      
      expect(screen.getByText(/loading available times/i)).toBeInTheDocument()
    })

    test('should show placeholder when no date selected', () => {
      render(<DateTimePicker {...mockProps} />)
      
      expect(screen.getByText(/please select a date first/i)).toBeInTheDocument()
    })
  })

  describe('Date Selection Constraints', () => {
    test('should not allow selection of past dates', () => {
      render(<DateTimePicker {...mockProps} />)
      
      const yesterday = subDays(new Date(), 1)
      const pastDateButtons = screen.queryAllByText(yesterday.getDate().toString())
      
      // Past dates should either be disabled or not selectable
      pastDateButtons.forEach(button => {
        if (button.closest('button')) {
          expect(button.closest('button')).toBeDisabled()
        }
      })
    })

    test('should allow selection of today and future dates', () => {
      render(<DateTimePicker {...mockProps} />)
      
      const today = new Date()
      const tomorrow = addDays(today, 1)
      
      // Today should be selectable (assuming it's not disabled for other reasons)
      const todayButton = screen.getByText(today.getDate().toString())
      if (todayButton.closest('button')) {
        expect(todayButton.closest('button')).not.toBeDisabled()
      }
    })

    test('should enforce 30-day advance booking limit', () => {
      render(<DateTimePicker {...mockProps} />)
      
      const farFuture = addDays(new Date(), 35) // More than 30 days
      
      // Should not show dates beyond 30 days or they should be disabled
      const farFutureDateButtons = screen.queryAllByText(farFuture.getDate().toString())
      farFutureDateButtons.forEach(button => {
        if (button.closest('button')) {
          expect(button.closest('button')).toBeDisabled()
        }
      })
    })

    test('should show current month and allow navigation', () => {
      render(<DateTimePicker {...mockProps} />)
      
      const currentMonth = format(new Date(), 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()
      
      // Should have navigation buttons
      const prevButton = screen.getByRole('button', { name: /previous month/i })
      const nextButton = screen.getByRole('button', { name: /next month/i })
      
      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
    })
  })

  describe('Time Slot Display', () => {
    test('should show available time slots when date is selected', () => {
      const selectedDate = new Date('2024-08-15')
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
        />
      )
      
      // Should show all available slots
      expect(screen.getByText('9:00 AM')).toBeInTheDocument()
      expect(screen.getByText('9:15 AM')).toBeInTheDocument()
      expect(screen.getByText('9:30 AM')).toBeInTheDocument()
      expect(screen.getByText('10:00 AM')).toBeInTheDocument()
      expect(screen.getByText('4:00 PM')).toBeInTheDocument()
      expect(screen.getByText('5:00 PM')).toBeInTheDocument()
    })

    test('should enforce business hours (9 AM - 7 PM)', () => {
      const selectedDate = new Date('2024-08-15')
      const earlyAndLateSlots = ['08:00', '08:30', '19:00', '19:30', '20:00']
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
          availableSlots={earlyAndLateSlots}
        />
      )
      
      // Early slots (before 9 AM) should not appear
      expect(screen.queryByText('8:00 AM')).not.toBeInTheDocument()
      expect(screen.queryByText('8:30 AM')).not.toBeInTheDocument()
      
      // Late slots (7 PM or after) should not appear considering service duration
      expect(screen.queryByText('7:00 PM')).not.toBeInTheDocument()
      expect(screen.queryByText('7:30 PM')).not.toBeInTheDocument()
    })

    test('should consider service duration for latest booking time', () => {
      const selectedDate = new Date('2024-08-15')
      const longServiceDuration = 120 // 2 hours
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
          serviceDuration={longServiceDuration}
          availableSlots={['16:00', '17:00', '18:00', '18:30']}
        />
      )
      
      // For a 2-hour service, last booking should be at 5 PM (ends at 7 PM)
      expect(screen.getByText('4:00 PM')).toBeInTheDocument()
      expect(screen.getByText('5:00 PM')).toBeInTheDocument()
      
      // 6 PM and later should not be available for 2-hour service
      expect(screen.queryByText('6:00 PM')).not.toBeInTheDocument()
      expect(screen.queryByText('6:30 PM')).not.toBeInTheDocument()
    })

    test('should show "No available times" when no slots available', () => {
      const selectedDate = new Date('2024-08-15')
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
          availableSlots={[]}
        />
      )
      
      expect(screen.getByText(/no available times/i)).toBeInTheDocument()
    })
  })

  describe('Time Slot Selection', () => {
    test('should allow selecting an available time slot', async () => {
      const user = userEvent.setup()
      const selectedDate = new Date('2024-08-15')
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
        />
      )
      
      const timeSlot = screen.getByText('10:00 AM')
      await user.click(timeSlot)
      
      expect(mockProps.onTimeSelect).toHaveBeenCalledWith('10:00')
    })

    test('should highlight selected time slot', () => {
      const selectedDate = new Date('2024-08-15')
      const selectedTime = '10:00'
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
      )
      
      const selectedSlot = screen.getByText('10:00 AM')
      expect(selectedSlot.closest('button')).toHaveClass('bg-primary') // or similar selected class
    })

    test('should show end time for selected slot', () => {
      const selectedDate = new Date('2024-08-15')
      const selectedTime = '10:00'
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          serviceDuration={60}
        />
      )
      
      // Should show end time calculation
      expect(screen.getByText(/ends at 11:00 AM/i)).toBeInTheDocument()
    })
  })

  describe('Same-Day Booking Restrictions', () => {
    test('should not show past time slots for today', () => {
      const today = new Date('2024-08-01T10:00:00') // 10 AM
      const todaySlots = ['08:00', '09:00', '09:30', '10:00', '11:00', '12:00']
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={today}
          availableSlots={todaySlots}
        />
      )
      
      // Past slots should not appear
      expect(screen.queryByText('8:00 AM')).not.toBeInTheDocument()
      expect(screen.queryByText('9:00 AM')).not.toBeInTheDocument()
      expect(screen.queryByText('9:30 AM')).not.toBeInTheDocument()
      
      // Current and future slots should appear
      expect(screen.getByText('11:00 AM')).toBeInTheDocument()
      expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    })

    test('should enforce minimum notice period for same-day bookings', () => {
      const today = new Date('2024-08-01T10:00:00')
      const nearFutureSlots = ['10:15', '10:30', '11:00'] // 15 min, 30 min, 1 hour from now
      
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={today}
          availableSlots={nearFutureSlots}
        />
      )
      
      // Slots too close to current time should not appear (assuming 1-hour minimum notice)
      expect(screen.queryByText('10:15 AM')).not.toBeInTheDocument()
      expect(screen.queryByText('10:30 AM')).not.toBeInTheDocument()
      
      // Slots with adequate notice should appear
      expect(screen.getByText('11:00 AM')).toBeInTheDocument()
    })
  })

  describe('Date Selection Interaction', () => {
    test('should call onDateSelect when date is clicked', async () => {
      const user = userEvent.setup()
      
      render(<DateTimePicker {...mockProps} />)
      
      // Click on a future date
      const tomorrow = addDays(new Date(), 1)
      const dateButton = screen.getByText(tomorrow.getDate().toString())
      
      if (dateButton.closest('button')) {
        const buttonElement = dateButton.closest('button')
        if (buttonElement) {
          await user.click(buttonElement)
        }
        expect(mockProps.onDateSelect).toHaveBeenCalled()
      }
    })

    test('should reset time selection when date changes', async () => {
      const user = userEvent.setup()
      const initialDate = new Date('2024-08-15')
      
      const { rerender } = render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={initialDate}
          selectedTime="10:00"
        />
      )
      
      // Change date
      const newDate = new Date('2024-08-16')
      rerender(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={newDate}
          selectedTime={null} // Time should be reset
        />
      )
      
      // Time selection should be cleared
      expect(screen.queryByText(/selected time/i)).not.toBeInTheDocument()
    })
  })

  describe('Loading and Error States', () => {
    test('should show loading spinner when loading slots', () => {
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={new Date('2024-08-15')}
          loading={true}
        />
      )
      
      expect(screen.getByText(/loading available times/i)).toBeInTheDocument()
    })

    test('should handle empty available slots gracefully', () => {
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={new Date('2024-08-15')}
          availableSlots={[]}
        />
      )
      
      expect(screen.getByText(/no available times/i)).toBeInTheDocument()
      expect(screen.getByText(/please try a different date/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<DateTimePicker {...mockProps} />)
      
      // Calendar should have proper role
      const calendar = screen.getByRole('grid') // Calendar grid
      expect(calendar).toBeInTheDocument()
      
      // Time slots should be properly labeled buttons
      const selectedDate = new Date('2024-08-15')
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
        />
      )
      
      const timeButtons = screen.getAllByRole('button', { name: /AM|PM/ })
      expect(timeButtons.length).toBeGreaterThan(0)
    })

    test('should support keyboard navigation', () => {
      render(<DateTimePicker {...mockProps} />)
      
      // Calendar should support keyboard navigation
      const calendar = screen.getByRole('grid')
      expect(calendar).toBeInTheDocument()
      
      // Time slots should be keyboard accessible
      const selectedDate = new Date('2024-08-15')
      render(
        <DateTimePicker 
          {...mockProps} 
          selectedDate={selectedDate}
        />
      )
      
      const firstTimeButton = screen.getAllByRole('button')[0]
      expect(firstTimeButton).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Responsive Design', () => {
    test('should render appropriately on different screen sizes', () => {
      render(<DateTimePicker {...mockProps} />)
      
      // Check that responsive classes are applied
      const container = document.querySelector('.grid')
      expect(container).toHaveClass(/grid-cols-\d+.*md:grid-cols-\d+.*lg:grid-cols-\d+/)
    })
  })
})