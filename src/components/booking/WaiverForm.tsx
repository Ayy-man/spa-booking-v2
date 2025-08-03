'use client'

import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad'
import { AlertCircleIcon, CheckCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  WaiverType, 
  WaiverContent, 
  WaiverSection, 
  CheckboxItem, 
  InitialItem, 
  FormField,
  WAIVER_CONTENT 
} from '@/lib/waiver-content'

// Dynamic schema generation based on waiver content
function createWaiverSchema(waiverContent: WaiverContent) {
  const schemaFields: Record<string, any> = {}

  waiverContent.sections.forEach(section => {
    if (section.type === 'form_fields' && section.fields) {
      section.fields.forEach(field => {
        if (field.required) {
          schemaFields[field.id] = z.string().min(1, `${field.label} is required`)
        } else {
          schemaFields[field.id] = z.string().optional()
        }
      })
    }

    if (section.type === 'checkboxes' && section.items) {
      section.items.forEach(item => {
        const checkboxItem = item as CheckboxItem
        if (checkboxItem.required) {
          schemaFields[checkboxItem.id] = z.boolean().refine(val => val === true, {
            message: `You must acknowledge: ${checkboxItem.label}`
          })
        } else {
          schemaFields[checkboxItem.id] = z.boolean().optional()
        }
      })
    }

    if (section.type === 'initials' && section.items) {
      section.items.forEach(item => {
        const initialItem = item as InitialItem
        if (initialItem.required) {
          schemaFields[`initial_${initialItem.id}`] = z.string().min(1, 'Initials required')
        }
      })
    }
  })

  // Always require signature for waivers
  schemaFields.signature = z.string().min(1, 'Signature is required')

  return z.object(schemaFields)
}

export interface WaiverFormData {
  [key: string]: any
  signature: string
}

interface WaiverFormProps {
  waiverType: WaiverType
  serviceName: string
  onSubmit: (data: WaiverFormData) => void
  loading?: boolean
}

export function WaiverForm({ waiverType, serviceName, onSubmit, loading = false }: WaiverFormProps) {
  const waiverContent = WAIVER_CONTENT[waiverType]
  const schema = createWaiverSchema(waiverContent)
  const signaturePadRef = useRef<SignaturePadRef>(null)
  const [signature, setSignature] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange'
  })

  const watchedValues = watch()

  const handleSignatureChange = (signatureData: string | null) => {
    const sig = signatureData || ''
    setSignature(sig)
    setValue('signature', sig, { shouldValidate: true })
  }

  const handleFormSubmit = (data: any) => {
    if (!signature) {
      alert('Please provide your signature before submitting.')
      return
    }

    const formData: WaiverFormData = {
      ...data,
      signature,
      waiverType,
      serviceName,
      waiverContent: JSON.stringify(waiverContent),
      submittedAt: new Date().toISOString()
    }

    onSubmit(formData)
  }

  const renderSection = (section: WaiverSection, index: number) => {
    switch (section.type) {
      case 'text':
        return (
          <div key={index} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            )}
            {section.content && (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {section.content}
                </pre>
              </div>
            )}
          </div>
        )

      case 'form_fields':
        return (
          <div key={index} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields?.map((field: FormField) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      {...register(field.id)}
                      className={cn(errors[field.id] && "border-red-500")}
                    />
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      {...register(field.id)}
                      className={cn(errors[field.id] && "border-red-500")}
                    />
                  )}
                  {errors[field.id] && (
                    <p className="text-red-600 text-xs flex items-center gap-1">
                      <AlertCircleIcon className="w-3 h-3" />
                      {errors[field.id]?.message as string}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case 'checkboxes':
        return (
          <div key={index} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            )}
            <div className="space-y-3">
              {section.items?.map((item: CheckboxItem) => (
                <div key={item.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={item.id}
                    {...register(item.id)}
                    className={cn(errors[item.id] && "border-red-500")}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={item.id}
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {errors[item.id] && (
                      <p className="text-red-600 text-xs flex items-center gap-1 mt-1">
                        <AlertCircleIcon className="w-3 h-3" />
                        {errors[item.id]?.message as string}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'initials':
        return (
          <div key={index} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            )}
            <div className="space-y-4">
              {section.items?.map((item: InitialItem, itemIndex: number) => (
                <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 min-w-[20px]">
                    {itemIndex + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed mb-2">{item.text}</p>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`initial_${item.id}`} className="text-xs text-gray-600">
                        Initials:
                      </Label>
                      <Input
                        id={`initial_${item.id}`}
                        placeholder="XX"
                        maxLength={3}
                        className={cn(
                          "w-16 text-center text-sm",
                          errors[`initial_${item.id}`] && "border-red-500"
                        )}
                        {...register(`initial_${item.id}`)}
                      />
                      {watchedValues[`initial_${item.id}`] && (
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {errors[`initial_${item.id}`] && (
                      <p className="text-red-600 text-xs flex items-center gap-1 mt-1">
                        <AlertCircleIcon className="w-3 h-3" />
                        {errors[`initial_${item.id}`]?.message as string}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'signature':
        return (
          <div key={index} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            )}
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  By signing below, I acknowledge that I have read, understood, and agree to all terms 
                  and conditions outlined in this waiver for <strong>{serviceName}</strong> service.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Digital Signature <span className="text-red-500">*</span>
                </Label>
                <SignaturePad
                  ref={signaturePadRef}
                  width={400}
                  height={150}
                  onSignatureChange={handleSignatureChange}
                  className="w-full"
                />
                {errors.signature && (
                  <p className="text-red-600 text-xs flex items-center gap-1">
                    <AlertCircleIcon className="w-3 h-3" />
                    {errors.signature?.message as string}
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>• Use your mouse or finger to sign above</p>
                <p>• Your signature will be securely stored with your booking</p>
                <p>• This electronic signature has the same legal effect as a handwritten signature</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">{waiverContent.title}</h2>
        <p className="text-gray-600">Service: <span className="font-medium">{serviceName}</span></p>
      </div>

      {waiverContent.sections.map((section, index) => (
        <Card key={index} className="p-6">
          {renderSection(section, index)}
        </Card>
      ))}

      <div className="flex justify-center pt-6">
        <Button
          type="submit"
          disabled={!isValid || !signature || loading}
          className="px-8 py-3 text-lg font-medium"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Waiver...
            </>
          ) : (
            'Complete Waiver & Continue'
          )}
        </Button>
      </div>

      {!isValid && Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircleIcon className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="text-sm font-medium text-red-800">Please complete all required fields:</h4>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>• {error?.message as string}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}