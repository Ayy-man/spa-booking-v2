'use client'

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  width?: number
  height?: number
  className?: string
  penColor?: string
  backgroundColor?: string
  onSignatureChange?: (signature: string | null) => void
  disabled?: boolean
}

export interface SignaturePadRef {
  clear: () => void
  getSignature: () => string | null
  isEmpty: () => boolean
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  width = 400,
  height = 200,
  className,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  onSignatureChange,
  disabled = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  useImperativeHandle(ref, () => ({
    clear: () => {
      clearCanvas()
    },
    getSignature: () => {
      if (!hasSignature || !canvasRef.current) return null
      return canvasRef.current.toDataURL('image/png')
    },
    isEmpty: () => {
      return !hasSignature
    }
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Set initial background
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
      
      // Set drawing properties
      ctx.strokeStyle = penColor
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [width, height, backgroundColor, penColor])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
      onSignatureChange?.(null)
    }
  }

  const getEventPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e && e.touches.length > 0) {
      // Touch event
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    } else if ('clientX' in e) {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      }
    }
    return { x: 0, y: 0 }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    
    e.preventDefault()
    setIsDrawing(true)
    const pos = getEventPos(e)
    setLastPoint(pos)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return
    
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    
    if (ctx && lastPoint) {
      const currentPos = getEventPos(e)
      
      ctx.beginPath()
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(currentPos.x, currentPos.y)
      ctx.stroke()
      
      setLastPoint(currentPos)
      
      if (!hasSignature) {
        setHasSignature(true)
        // Get signature data after a small delay to ensure drawing is complete
        setTimeout(() => {
          if (canvasRef.current) {
            onSignatureChange?.(canvasRef.current.toDataURL('image/png'))
          }
        }, 10)
      }
    }
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    setLastPoint(null)
    
    // Update signature data
    if (hasSignature && canvasRef.current) {
      onSignatureChange?.(canvasRef.current.toDataURL('image/png'))
    }
  }

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className={cn(
            "block cursor-crosshair touch-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
          style={{ width: '100%', height: 'auto', maxWidth: `${width}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Placeholder text when empty */}
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">Sign here</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {hasSignature ? 'Signature captured' : 'Please sign above'}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={!hasSignature || disabled}
        >
          Clear
        </Button>
      </div>
    </div>
  )
})

SignaturePad.displayName = 'SignaturePad'