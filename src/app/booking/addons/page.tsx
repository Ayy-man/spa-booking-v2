'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { saveBookingState, loadBookingState } from '@/lib/booking-state-manager'
import { AddonData } from '@/lib/booking-state-manager'
import { analytics } from '@/lib/analytics'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { InlineLoading } from '@/components/ui/loading-spinner'

interface Addon {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
  maxQuantity: number
}

export default function AddonsPage() {
  const [selectedService, setSelectedService] = useState<any>(null)
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([])
  const [selectedAddons, setSelectedAddons] = useState<AddonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load service and existing addon selections from state
  useEffect(() => {
    const state = loadBookingState()
    
    if (!state?.selectedService) {
      // No service selected, redirect back to service selection
      window.location.href = '/booking'
      return
    }

    setSelectedService(state.selectedService)
    setSelectedAddons(state.selectedAddons || [])

    // Fetch available add-ons for this service
    if (state.selectedService?.id) {
      fetchAddons(state.selectedService.id)
    }
  }, [])

  const fetchAddons = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/addons/${serviceId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch add-ons')
      }
      
      const data = await response.json()
      setAvailableAddons(data.addons || [])
      
      if (data.addons?.length === 0) {
        // No add-ons available, skip to next step
        proceedToNextStep()
        return
      }
    } catch (err) {
      console.error('Error fetching add-ons:', err)
      setError('Failed to load add-ons. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleAddon = (addon: Addon) => {
    const existingIndex = selectedAddons.findIndex(a => a.id === addon.id)
    
    if (existingIndex >= 0) {
      // Remove addon
      const updated = selectedAddons.filter(a => a.id !== addon.id)
      setSelectedAddons(updated)
    } else {
      // Add addon
      const newAddon: AddonData = {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        duration: addon.duration,
        quantity: 1,
        category: addon.category,
        description: addon.description
      }
      setSelectedAddons([...selectedAddons, newAddon])
    }
  }

  const updateAddonQuantity = (addonId: string, quantity: number) => {
    if (quantity === 0) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addonId))
      return
    }

    const updated = selectedAddons.map(addon => 
      addon.id === addonId ? { ...addon, quantity } : addon
    )
    setSelectedAddons(updated)
  }

  const calculateTotals = () => {
    return selectedAddons.reduce((total, addon) => ({
      price: total.price + (addon.price * (addon.quantity || 1)),
      duration: total.duration + (addon.duration * (addon.quantity || 1))
    }), { price: 0, duration: 0 })
  }

  const proceedToNextStep = () => {
    // Save add-ons to booking state
    const totals = calculateTotals()
    
    saveBookingState({
      selectedAddons,
      addonsTotal: totals,
      currentStep: 3
    })

    // Track add-on selection
    if (selectedAddons.length > 0) {
      analytics.track('addons_selected', {
        service_name: selectedService?.name,
        addon_count: selectedAddons.length,
        total_addon_price: totals.price,
        total_addon_duration: totals.duration,
        selected_addons: selectedAddons.map(a => a.name)
      })
    }

    // Navigate to date/time selection
    window.location.href = '/booking/date-time'
  }

  const skipAddons = () => {
    saveBookingState({
      selectedAddons: [],
      addonsTotal: { price: 0, duration: 0 },
      currentStep: 3
    })
    window.location.href = '/booking/date-time'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center">
        <InlineLoading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <div className="space-x-4">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
            <button onClick={() => window.location.href = '/booking'} className="btn-tertiary">
              Back to Services
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totals = calculateTotals()
  const finalPrice = (selectedService?.price || 0) + totals.price
  const finalDuration = (selectedService?.duration || 0) + totals.duration

  return (
    <>
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background dark:bg-gray-900 section-spacing">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-6">
              <Link 
                href="/booking" 
                className="btn-tertiary !w-auto px-6 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                ← Back to Services
              </Link>
              <ThemeToggle />
              <button 
                onClick={skipAddons}
                className="btn-tertiary !w-auto px-6 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Skip Add-ons →
              </button>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-heading text-primary dark:text-primary-light mb-4">
              Enhance Your Experience
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Add premium enhancements to your {selectedService?.name}
            </p>
            
            {/* Selected Service Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-heading text-primary dark:text-primary-light mb-2">
                Selected Service
              </h2>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {selectedService?.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedService?.duration} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary dark:text-primary-light">
                    ${selectedService?.price}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Available Add-ons */}
          {availableAddons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-3xl font-heading text-primary dark:text-primary-light mb-6">
                Available Enhancements
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {availableAddons.map((addon) => {
                  const isSelected = selectedAddons.some(a => a.id === addon.id)
                  const selectedAddon = selectedAddons.find(a => a.id === addon.id)
                  
                  return (
                    <div
                      key={addon.id}
                      className={`border-2 rounded-xl p-6 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-primary dark:border-primary-light bg-primary/5 dark:bg-primary-light/5' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary-light'
                      }`}
                      onClick={() => toggleAddon(addon)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex-1 pr-3">
                          {addon.name}
                        </h3>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary dark:text-primary-light">
                            +${addon.price}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            +{addon.duration} min
                          </p>
                        </div>
                      </div>
                      
                      {addon.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {addon.description}
                        </p>
                      )}

                      {isSelected && addon.maxQuantity > 1 && (
                        <div className="flex items-center space-x-3 mt-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateAddonQuantity(addon.id, (selectedAddon?.quantity || 1) - 1)
                              }}
                              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-gray-800 dark:text-gray-200">
                              {selectedAddon?.quantity || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if ((selectedAddon?.quantity || 1) < addon.maxQuantity) {
                                  updateAddonQuantity(addon.id, (selectedAddon?.quantity || 1) + 1)
                                }
                              }}
                              disabled={(selectedAddon?.quantity || 1) >= addon.maxQuantity}
                              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'border-primary dark:border-primary-light bg-primary dark:bg-primary-light' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900"></div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {addon.category}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary and Continue */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-heading text-primary dark:text-primary-light mb-4">
              Booking Summary
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Base Service:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  ${selectedService?.price} ({selectedService?.duration} min)
                </span>
              </div>
              
              {selectedAddons.length > 0 && (
                <>
                  {selectedAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {addon.name} {addon.quantity && addon.quantity > 1 ? `(×${addon.quantity})` : ''}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200">
                        +${addon.price * (addon.quantity || 1)} (+{addon.duration * (addon.quantity || 1)} min)
                      </span>
                    </div>
                  ))}
                  
                  <hr className="border-gray-200 dark:border-gray-700" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Add-ons Total:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      +${totals.price} (+{totals.duration} min)
                    </span>
                  </div>
                </>
              )}
              
              <hr className="border-gray-200 dark:border-gray-700" />
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-800 dark:text-gray-200">Total:</span>
                <span className="text-primary dark:text-primary-light">
                  ${finalPrice} ({finalDuration} min)
                </span>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={proceedToNextStep}
              className="btn-primary w-full max-w-md mx-auto text-xl py-4"
            >
              Continue to Date & Time
            </button>
            
            {selectedAddons.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-3">
                No add-ons selected. Click to continue with base service only.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}