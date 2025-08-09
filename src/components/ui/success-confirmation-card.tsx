'use client'

import React, { useState, useEffect } from 'react'
import { Check, Calendar, Clock, User, DollarSign, MapPin } from 'lucide-react'
import { SuccessCheckmark } from './success-checkmark'

interface SuccessConfirmationCardProps {
  title: string
  subtitle?: string
  details: Array<{
    icon: React.ReactNode
    label: string
    value: string
  }>
  showAnimation?: boolean
  animationDelay?: number
  className?: string
  children?: React.ReactNode
  onAnimationComplete?: () => void
}

export function SuccessConfirmationCard({
  title,
  subtitle,
  details,
  showAnimation = true,
  animationDelay = 0,
  className = '',
  children,
  onAnimationComplete
}: SuccessConfirmationCardProps) {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'enter' | 'bounce' | 'complete'>('idle')

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setAnimationPhase('enter')
        
        setTimeout(() => {
          setAnimationPhase('bounce')
          
          setTimeout(() => {
            setAnimationPhase('complete')
            onAnimationComplete?.()
          }, 800) // bounce animation duration
        }, 300) // enter animation duration
      }, animationDelay)

      return () => clearTimeout(timer)
    }
  }, [showAnimation, animationDelay, onAnimationComplete])

  const getCardClasses = () => {
    let classes = `
      bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8
      transition-all duration-300 ease-out relative overflow-hidden
      ${className}
    `

    if (showAnimation) {
      switch (animationPhase) {
        case 'idle':
          classes += ' opacity-0 scale-95 translate-y-4'
          break
        case 'enter':
          classes += ' opacity-100 scale-100 translate-y-0'
          break
        case 'bounce':
          classes += ' animate-success-bounce'
          break
        case 'complete':
          classes += ' shadow-xl'
          break
      }
    }

    return classes
  }

  return (
    <div className={getCardClasses()}>
      {/* Success glow effect */}
      {showAnimation && animationPhase === 'complete' && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-primary/5 rounded-2xl" />
      )}
      
      {/* Header with checkmark */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <SuccessCheckmark
            isVisible={showAnimation && animationPhase !== 'idle'}
            size="xl"
            variant="circle"
            color="success"
            delay={300}
            onAnimationComplete={() => {}}
          />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-heading text-primary-dark mb-2">
          {title}
        </h1>
        
        {subtitle && (
          <p className="text-gray-600 text-lg">
            {subtitle}
          </p>
        )}
      </div>

      {/* Details Section */}
      <div className="space-y-4 mb-8">
        {details.map((detail, index) => (
          <div 
            key={index}
            className={`
              flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100
              transition-all duration-300 ease-out
              ${showAnimation && animationPhase !== 'idle' ? 'animate-fade-in-up' : ''}
            `}
            style={{
              animationDelay: `${(index + 1) * 100}ms`
            }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {detail.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">
                {detail.label}
              </p>
              <p className="text-gray-900 font-semibold truncate">
                {detail.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Children content */}
      {children && (
        <div className={`
          transition-opacity duration-500 ease-out
          ${showAnimation && animationPhase === 'idle' ? 'opacity-0' : 'opacity-100'}
        `}>
          {children}
        </div>
      )}
    </div>
  )
}

// Specialized booking confirmation card
interface BookingConfirmationCardProps {
  bookingData: {
    serviceName: string
    date: string
    time: string
    staff: string
    price: number
    customerName: string
    location?: string
  }
  paymentStatus?: 'paid' | 'pending' | 'deposit'
  showAnimation?: boolean
  className?: string
  onAnimationComplete?: () => void
}

export function BookingConfirmationCard({
  bookingData,
  paymentStatus = 'paid',
  showAnimation = true,
  className = '',
  onAnimationComplete
}: BookingConfirmationCardProps) {
  const formatPaymentStatus = () => {
    switch (paymentStatus) {
      case 'paid':
        return 'Payment Complete'
      case 'deposit':
        return 'Deposit Paid'
      case 'pending':
        return 'Pay on Location'
      default:
        return 'Payment Pending'
    }
  }

  const details = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'Date',
      value: bookingData.date
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Time',
      value: bookingData.time
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'Staff',
      value: bookingData.staff
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: formatPaymentStatus(),
      value: `$${bookingData.price}`
    }
  ]

  if (bookingData.location) {
    details.push({
      icon: <MapPin className="w-5 h-5" />,
      label: 'Location',
      value: bookingData.location
    })
  }

  return (
    <SuccessConfirmationCard
      title="Booking Confirmed!"
      subtitle={`Your ${bookingData.serviceName.toLowerCase()} appointment has been successfully scheduled.`}
      details={details}
      showAnimation={showAnimation}
      className={className}
      onAnimationComplete={onAnimationComplete}
    >
      {/* Payment status indicator */}
      <div className={`
        p-4 rounded-xl text-center text-sm font-medium
        ${paymentStatus === 'paid' 
          ? 'bg-green-50 text-green-800 border border-green-200' 
          : paymentStatus === 'deposit'
          ? 'bg-blue-50 text-blue-800 border border-blue-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200'
        }
      `}>
        {paymentStatus === 'paid' && (
          <>
            <Check className="w-4 h-4 inline mr-2" />
            Full payment processed successfully
          </>
        )}
        {paymentStatus === 'deposit' && (
          <>
            <Check className="w-4 h-4 inline mr-2" />
            Deposit received - Balance due at appointment
          </>
        )}
        {paymentStatus === 'pending' && (
          <>
            <Clock className="w-4 h-4 inline mr-2" />
            Please bring payment to your appointment
          </>
        )}
      </div>
    </SuccessConfirmationCard>
  )
}

// Couples booking confirmation card
interface CouplesBookingConfirmationCardProps {
  bookingData: {
    primaryService: string
    secondaryService: string
    date: string
    time: string
    primaryStaff: string
    secondaryStaff: string
    totalPrice: number
    customerName: string
  }
  showAnimation?: boolean
  className?: string
  onAnimationComplete?: () => void
}

export function CouplesBookingConfirmationCard({
  bookingData,
  showAnimation = true,
  className = '',
  onAnimationComplete
}: CouplesBookingConfirmationCardProps) {
  const details = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'Date',
      value: bookingData.date
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Time',
      value: bookingData.time
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'Staff',
      value: `${bookingData.primaryStaff || 'Any Available Staff'} & ${bookingData.secondaryStaff || 'Any Available Staff'}`
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Total Price',
      value: `$${bookingData.totalPrice}`
    }
  ]

  return (
    <SuccessConfirmationCard
      title="Couples Booking Confirmed!"
      subtitle="Your romantic spa experience has been successfully scheduled."
      details={details}
      showAnimation={showAnimation}
      className={className}
      onAnimationComplete={onAnimationComplete}
    >
      {/* Services breakdown */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-gray-900 text-center mb-3">Services</h4>
        
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <span className="font-medium text-gray-900">{bookingData.primaryService}</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <span className="font-medium text-gray-900">{bookingData.secondaryService}</span>
        </div>
      </div>
    </SuccessConfirmationCard>
  )
}

export default SuccessConfirmationCard