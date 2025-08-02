'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CheckCircleIcon, InfoIcon } from 'lucide-react'
import { PaymentOption, PaymentType } from '@/lib/payment-config'

interface PaymentOptionProps {
  options: PaymentOption[]
  selectedType: PaymentType
  onSelectionChange: (type: PaymentType) => void
  isNewCustomer: boolean
}

export default function PaymentOptionComponent({ 
  options, 
  selectedType, 
  onSelectionChange, 
  isNewCustomer 
}: PaymentOptionProps) {
  return (
    <Card className="p-6 bg-blue-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <InfoIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">
            Choose Your Payment Option
          </h3>
        </div>

        {!isNewCustomer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              🎉 As an existing customer, you can choose to pay now or at your appointment!
            </p>
          </div>
        )}

        <div className="space-y-3">
          {options.map((option) => (
            <div key={option.type} className="relative">
              <label
                htmlFor={`payment-${option.type}`}
                className={`
                  block cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                  ${selectedType === option.type
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id={`payment-${option.type}`}
                    name="paymentOption"
                    value={option.type}
                    checked={selectedType === option.type}
                    onChange={(e) => onSelectionChange(e.target.value as PaymentType)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {option.label}
                      </h4>
                      {selectedType === option.type && (
                        <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {option.description}
                    </p>

                    {option.type === 'deposit' && (
                      <div className="mt-2 text-xs text-gray-500">
                        <strong>Remaining balance:</strong> ${(options.find(o => o.type === 'full')?.amount || 0) - option.amount} due at appointment
                      </div>
                    )}

                    {option.type === 'full' && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                        <CheckCircleIcon className="w-3 h-3" />
                        <span>Nothing more to pay at appointment</span>
                      </div>
                    )}
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>

        {isNewCustomer && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-amber-800">
              <strong>New Customer Policy:</strong> We require either a deposit or full payment to secure your first appointment.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}