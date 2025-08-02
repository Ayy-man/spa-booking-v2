'use client'

import { Badge } from '@/components/ui/badge'

interface Service {
  id: string
  name: string
  duration: number
  price: number
  popular?: boolean
  recommended?: boolean
}

interface ServiceGridProps {
  services: Service[]
  selectedService: string
  onServiceClick: (service: Service) => void
}

export default function ServiceGrid({ services, selectedService, onServiceClick }: ServiceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service) => {
        const isSelected = selectedService === service.id
        
        return (
          <div
            key={service.id}
            className={`
              relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md
              ${isSelected 
                ? 'border-primary bg-primary/5 shadow-lg' 
                : 'border-gray-200 hover:border-primary/50 bg-white'
              }
            `}
            onClick={() => onServiceClick(service)}
          >
            {/* Service Badges */}
            <div className="flex gap-2 mb-3">
              {service.popular && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  Popular
                </Badge>
              )}
              {service.recommended && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  Recommended
                </Badge>
              )}
            </div>

            {/* Service Name */}
            <h3 className="font-semibold text-gray-900 mb-3 text-sm leading-tight">
              {service.name}
            </h3>

            {/* Service Details */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold text-primary">
                ${service.price}
              </span>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                {service.duration} mins
              </span>
            </div>

            {/* Select Button */}
            <button
              className={`
                w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
                ${isSelected
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
                }
              `}
              onClick={(e) => {
                e.stopPropagation()
                onServiceClick(service)
              }}
            >
              {isSelected ? 'Selected ✓' : 'Select Service'}
            </button>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}