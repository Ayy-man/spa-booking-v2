'use client'

import { useState, useEffect } from 'react'
import { 
  CreditCard as CreditCardIcon, 
  Copy as ClipboardDocumentIcon, 
  Check as CheckIcon,
  Link as LinkIcon,
  Info as InformationCircleIcon,
  AlertTriangle as ExclamationTriangleIcon
} from 'lucide-react'
import { DEPOSIT_PAYMENT_CONFIG, PaymentLink } from '@/lib/payment-config'

interface CopyStatus {
  [key: string]: boolean
}

export default function PaymentLinksPage() {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>({})

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus(prev => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [id]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center space-x-3 mb-4">
          <CreditCardIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Link Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage deposit payment link for all customer transactions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Deposit Payment</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              ${DEPOSIT_PAYMENT_CONFIG.price}
            </div>
            <div className="text-sm text-blue-700">Standard deposit amount for all services</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Payment Options</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              2
            </div>
            <div className="text-sm text-green-700">Deposit or pay on location</div>
          </div>
        </div>
      </div>


      {/* Deposit Payment Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Deposit Payment Link</h2>
          <p className="text-sm text-gray-600 mt-1">
            Used for all customer deposits - customers can choose between deposit or pay on location
          </p>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Standard Deposit Payment</h3>
                <p className="text-blue-700 text-sm mt-1">
                  All customers can use this deposit link. Customers can choose between paying a $30 deposit or paying the full amount on location.
                </p>
                <div className="mt-3 flex items-center space-x-4">
                  <div className="text-2xl font-bold text-blue-900">
                    ${DEPOSIT_PAYMENT_CONFIG.price.toFixed(2)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                      {DEPOSIT_PAYMENT_CONFIG.paymentUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(DEPOSIT_PAYMENT_CONFIG.paymentUrl, 'deposit-link')}
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors ${
                        copyStatus['deposit-link']
                          ? 'text-green-700 bg-green-100 hover:bg-green-200'
                          : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                      }`}
                    >
                      {copyStatus['deposit-link'] ? (
                        <>
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                          Copy Deposit Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">How to Use Payment Links</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">For Customer Payments</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">1</span>
                  <span>Find the service in the table above</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">2</span>
                  <span>Click &ldquo;Copy Link&rdquo; to copy the payment URL</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">3</span>
                  <span>Send the link to customer via text or email</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">4</span>
                  <span>Customer pays directly through FastPayDirect</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">For In-Person Payments</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">1</span>
                  <span>Open the payment link on your device</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">2</span>
                  <span>Have customer complete payment on your device</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">3</span>
                  <span>Wait for payment confirmation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium mt-0.5">4</span>
                  <span>Complete booking in the system</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Important Notes</h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• Always verify payment completion before confirming appointments</li>
                  <li>• All services use the standard $30 deposit payment link</li>
                  <li>• Customers can return to complete booking after successful payment</li>
                  <li>• Keep payment confirmation receipts for record keeping</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}