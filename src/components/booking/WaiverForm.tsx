'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileTextIcon, AlertTriangleIcon } from 'lucide-react'

interface WaiverFormProps {
  serviceCategory: string
  serviceName: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  onWaiverComplete: (waiverData: WaiverData) => void
  onBack?: () => void
  isLastWaiver?: boolean
  waiverProgress?: {
    current: number
    total: number
  }
}

interface WaiverData {
  signature: string
  date: string
  serviceCategory: string
  serviceName: string
  customerName: string
  agreedToTerms: boolean
  medicalConditions: string
  allergies: string
  skinConditions: string
  medications: string
  pregnancyStatus?: boolean
  previousWaxing?: boolean
  recentSunExposure?: boolean
  emergencyContactName: string
  emergencyContactPhone: string
}

const WAIVER_CONTENT = {
  facial: {
    title: "Facial Treatment Waiver & Consent Form",
    specificTerms: [
      "I understand that facial treatments may cause temporary redness, sensitivity, or irritation",
      "I have disclosed all medical conditions, allergies, and medications I am currently taking",
      "I understand that results may vary and multiple treatments may be required",
      "I acknowledge that sun exposure should be limited for 24-48 hours after treatment",
      "I understand that certain skin conditions may be contraindicated for facial treatments"
    ],
    medicalQuestions: [
      "Do you have any known skin allergies or sensitivities?",
      "Are you currently using any prescription medications?",
      "Have you had any recent cosmetic procedures or treatments?",
      "Do you have any history of keloid scarring?",
      "Are you pregnant or nursing?"
    ]
  },
  massage: {
    title: "Massage Therapy Waiver & Consent Form",
    specificTerms: [
      "I understand that massage therapy involves touch and manipulation of muscles and soft tissues",
      "I have disclosed all medical conditions that may affect my treatment",
      "I understand that some soreness may occur after deep tissue massage",
      "I will communicate immediately if I experience any discomfort during treatment",
      "I understand that massage therapy is not a substitute for medical treatment"
    ],
    medicalQuestions: [
      "Do you have any current injuries or areas of pain?",
      "Have you recently had surgery or medical procedures?",
      "Do you have any cardiovascular conditions?",
      "Are you pregnant?",
      "Do you have any skin conditions or infectious diseases?"
    ]
  },
  waxing: {
    title: "Waxing Service Waiver & Consent Form",
    specificTerms: [
      "I understand that waxing may cause temporary redness, irritation, or ingrown hairs",
      "I acknowledge that waxing removes hair from the root and may be uncomfortable",
      "I understand that sun exposure and hot baths should be avoided for 24 hours post-treatment",
      "I have not used retinoids or exfoliating products in the treatment area for 48 hours",
      "I understand that results and regrowth rates may vary"
    ],
    medicalQuestions: [
      "Have you had any previous adverse reactions to waxing?",
      "Are you currently using any medications that thin the skin?",
      "Have you had recent sun exposure or used tanning products?",
      "Do you have any cuts, rashes, or infections in the treatment area?",
      "Are you pregnant or nursing?"
    ]
  },
  body_treatment: {
    title: "Body Treatment Waiver & Consent Form",
    specificTerms: [
      "I understand that body treatments may cause temporary redness or sensitivity",
      "I have disclosed all medical conditions and medications",
      "I understand that treatments may not be suitable for all skin types",
      "I acknowledge that multiple sessions may be required for optimal results",
      "I understand the importance of following post-treatment care instructions"
    ],
    medicalQuestions: [
      "Do you have any skin conditions or sensitivities?",
      "Are you currently taking any medications?",
      "Have you had any recent cosmetic procedures?",
      "Do you have any allergies to skincare products?",
      "Are you pregnant or nursing?"
    ]
  }
}

const GENERAL_TERMS = [
  "I understand that no guarantee has been made regarding the outcome of treatments",
  "I agree to follow all pre and post-treatment instructions provided",
  "I understand that failure to disclose medical information may result in adverse reactions",
  "I release Dermal Skin Clinic from liability for any complications arising from undisclosed medical conditions",
  "I understand that payment is due at the time of service unless other arrangements have been made",
  "I acknowledge that I am over 18 years of age or have parental consent",
  "I understand the cancellation policy and potential fees for missed appointments"
]

export default function WaiverForm({ 
  serviceCategory, 
  serviceName, 
  customerName,
  customerEmail,
  customerPhone,
  onWaiverComplete, 
  onBack,
  isLastWaiver = true,
  waiverProgress
}: WaiverFormProps) {
  const [waiverData, setWaiverData] = useState<WaiverData>({
    signature: customerName, // Pre-populate with customer name
    date: new Date().toISOString().split('T')[0],
    serviceCategory,
    serviceName,
    customerName,
    agreedToTerms: false,
    medicalConditions: '',
    allergies: '',
    skinConditions: '',
    medications: '',
    emergencyContactName: '',
    emergencyContactPhone: customerPhone || ''
  })

  const [errors, setErrors] = useState<string[]>([])

  const categoryKey = serviceCategory.toLowerCase().replace(/[^a-z]/g, '_') as keyof typeof WAIVER_CONTENT
  const waiverInfo = WAIVER_CONTENT[categoryKey] || WAIVER_CONTENT.facial

  const handleInputChange = (field: keyof WaiverData, value: string | boolean) => {
    setWaiverData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user makes changes
    if (errors.length > 0) {
      setErrors([])
    }
  }

  const validateForm = (): string[] => {
    const newErrors: string[] = []

    if (!waiverData.signature.trim()) {
      newErrors.push('Electronic signature is required')
    }

    if (!waiverData.agreedToTerms) {
      newErrors.push('You must agree to the terms and conditions')
    }

    if (!waiverData.emergencyContactName.trim()) {
      newErrors.push('Emergency contact name is required')
    }

    if (!waiverData.emergencyContactPhone.trim()) {
      newErrors.push('Emergency contact phone is required')
    }

    return newErrors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    onWaiverComplete(waiverData)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-full mb-4">
            <FileTextIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-heading font-bold text-blue-900">{waiverInfo.title}</h1>
          </div>
          <p className="text-gray-600">
            Service: <strong>{serviceName}</strong> • Customer: <strong>{customerName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Important Notice */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangleIcon className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Important:</strong> Please read this waiver carefully and answer all questions honestly. 
              This information is essential for your safety and the effectiveness of your treatment.
            </AlertDescription>
          </Alert>

          {/* Medical Information */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Medical Information & Health History
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="medicalConditions" className="text-sm font-medium">
                  Current Medical Conditions
                </Label>
                <Textarea
                  id="medicalConditions"
                  value={waiverData.medicalConditions}
                  onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                  placeholder="List any current medical conditions..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="allergies" className="text-sm font-medium">
                  Known Allergies
                </Label>
                <Textarea
                  id="allergies"
                  value={waiverData.allergies}
                  onChange={(e) => handleInputChange('allergies', e.target.value)}
                  placeholder="List any known allergies..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="skinConditions" className="text-sm font-medium">
                  Skin Conditions
                </Label>
                <Textarea
                  id="skinConditions"
                  value={waiverData.skinConditions}
                  onChange={(e) => handleInputChange('skinConditions', e.target.value)}
                  placeholder="List any skin conditions or sensitivities..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="medications" className="text-sm font-medium">
                  Current Medications
                </Label>
                <Textarea
                  id="medications"
                  value={waiverData.medications}
                  onChange={(e) => handleInputChange('medications', e.target.value)}
                  placeholder="List all current medications..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            {/* Service-Specific Questions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Service-Specific Questions:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {waiverInfo.medicalQuestions.map((question, index) => (
                  <li key={index}>• {question}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                Please discuss any &quot;yes&quot; answers with your service provider before treatment.
              </p>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Emergency Contact Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContactName" className="text-sm font-medium">
                  Emergency Contact Name *
                </Label>
                <Input
                  id="emergencyContactName"
                  type="text"
                  value={waiverData.emergencyContactName}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                  placeholder="Full name of emergency contact"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="emergencyContactPhone" className="text-sm font-medium">
                  Emergency Contact Phone *
                </Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={waiverData.emergencyContactPhone}
                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                  required
                />
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Terms and Conditions
            </h2>

            {/* Service-Specific Terms */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-3">Service-Specific Terms:</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                {waiverInfo.specificTerms.map((term, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* General Terms */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">General Terms:</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                {GENERAL_TERMS.map((term, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-600 mt-1">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Electronic Signature */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Electronic Signature
            </h2>

            <div>
              <Label htmlFor="signature" className="text-sm font-medium">
                Electronic Signature *
              </Label>
              <Input
                id="signature"
                type="text"
                value={waiverData.signature}
                onChange={(e) => handleInputChange('signature', e.target.value)}
                placeholder="Type your full name as electronic signature"
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                By typing your name above, you are providing your electronic signature
              </p>
            </div>

            <div>
              <Label htmlFor="date" className="text-sm font-medium">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={waiverData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="mt-1"
                required
              />
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="agreedToTerms"
                checked={waiverData.agreedToTerms}
                onCheckedChange={(checked) => handleInputChange('agreedToTerms', checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="agreedToTerms" className="text-sm leading-relaxed">
                <strong>I acknowledge that:</strong> I have read and understood all terms and conditions above. 
                I have provided accurate and complete medical information. I consent to the treatment and 
                understand the risks involved. I release Dermal Skin Clinic and its staff from any liability 
                arising from this treatment.
              </Label>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Please correct the following:</strong>
                <ul className="list-disc list-inside mt-2">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Back
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {isLastWaiver ? 'Complete Waiver & Continue to Payment' : 'Complete Waiver & Next'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}