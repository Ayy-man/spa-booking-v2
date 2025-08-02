'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import ServiceGrid from './ServiceGrid'

interface Service {
  id: string
  name: string
  duration: number
  price: number
  popular?: boolean
  recommended?: boolean
}

interface ServiceCategory {
  name: string
  description: string
  icon: string
  services: Service[]
}

interface ServiceCategoryCardProps {
  category: ServiceCategory
  selectedService: string
  onServiceSelect: (serviceId: string, service: Service) => void
  onAnalyticsTrack: (serviceName: string, categoryName: string, price: number) => void
}

export default function ServiceCategoryCard({ 
  category, 
  selectedService, 
  onServiceSelect,
  onAnalyticsTrack
}: ServiceCategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleServiceClick = (service: Service) => {
    onServiceSelect(service.id, service)
    onAnalyticsTrack(service.name, category.name, service.price)
  }

  const popularServices = category.services.filter(s => s.popular)
  const recommendedServices = category.services.filter(s => s.recommended)

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      {/* Category Header */}
      <div 
        className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 cursor-pointer hover:from-primary/10 hover:to-accent/10 transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl" role="img" aria-label={category.name}>
              {category.icon}
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-primary mb-1">
                {category.name}
              </h2>
              <p className="text-gray-600 text-sm">
                {category.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  {category.services.length} services
                </span>
                {popularServices.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {popularServices.length} popular
                  </span>
                )}
                {recommendedServices.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {recommendedServices.length} recommended
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm text-gray-500">Starting from</div>
              <div className="text-lg font-bold text-primary">
                ${Math.min(...category.services.map(s => s.price))}
              </div>
            </div>
            <div className="ml-4">
              {isExpanded ? (
                <ChevronUpIcon className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className={`
        transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="p-6 pt-2">
          <ServiceGrid
            services={category.services}
            selectedService={selectedService}
            onServiceClick={handleServiceClick}
          />
        </div>
      </div>
    </Card>
  )
}