'use client'

import React, { useEffect, useState, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  life: number
  shape: 'circle' | 'square' | 'heart' | 'star'
}

interface SuccessConfettiProps {
  isActive: boolean
  duration?: number
  particleCount?: number
  colors?: string[]
  shapes?: ('circle' | 'square' | 'heart' | 'star')[]
  className?: string
  onComplete?: () => void
}

const DEFAULT_COLORS = [
  '#10B981', // Success green
  '#C36678', // Spa primary
  '#F6C7CF', // Spa accent  
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#06B6D4', // Cyan
]

const DEFAULT_SHAPES: ('circle' | 'square' | 'heart' | 'star')[] = ['circle', 'square', 'heart', 'star']

export function SuccessConfetti({
  isActive,
  duration = 3000,
  particleCount = 80,
  colors = DEFAULT_COLORS,
  shapes = DEFAULT_SHAPES,
  className = '',
  onComplete
}: SuccessConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [particles, setParticles] = useState<Particle[]>([])
  const [isAnimating, setIsAnimating] = useState(false)

  const createParticles = () => {
    const newParticles: Particle[] = []
    const canvas = canvasRef.current
    if (!canvas) return newParticles

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const velocity = 4 + Math.random() * 6
      const size = 3 + Math.random() * 5
      
      newParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2, // Slight upward bias
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      })
    }

    return newParticles
  }

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save()
    ctx.translate(particle.x, particle.y)
    ctx.rotate(particle.rotation)
    ctx.globalAlpha = particle.life

    ctx.fillStyle = particle.color
    
    switch (particle.shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'square':
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
        break
        
      case 'heart':
        drawHeart(ctx, particle.size)
        break
        
      case 'star':
        drawStar(ctx, particle.size)
        break
    }

    ctx.restore()
  }

  const drawHeart = (ctx: CanvasRenderingContext2D, size: number) => {
    const scale = size / 10
    ctx.scale(scale, scale)
    ctx.beginPath()
    ctx.moveTo(0, 3)
    ctx.bezierCurveTo(-5, -3, -10, 2, 0, 10)
    ctx.bezierCurveTo(10, 2, 5, -3, 0, 3)
    ctx.fill()
  }

  const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
    const spikes = 5
    const outerRadius = size
    const innerRadius = size * 0.4
    
    let rot = Math.PI / 2 * 3
    let x = 0
    let y = 0
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(0, -outerRadius)
    
    for (let i = 0; i < spikes; i++) {
      x = Math.cos(rot) * outerRadius
      y = Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = Math.cos(rot) * innerRadius
      y = Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    
    ctx.lineTo(0, -outerRadius)
    ctx.fill()
  }

  const updateParticles = (particles: Particle[]): Particle[] => {
    return particles
      .map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vy: particle.vy + 0.3, // Gravity
        vx: particle.vx * 0.99, // Air resistance
        rotation: particle.rotation + particle.rotationSpeed,
        life: Math.max(0, particle.life - 0.02) // Fade out
      }))
      .filter(particle => particle.life > 0)
  }

  const animate = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    setParticles(prevParticles => {
      const updated = updateParticles(prevParticles)
      
      updated.forEach(particle => {
        drawParticle(ctx, particle)
      })

      if (updated.length === 0) {
        setIsAnimating(false)
        onComplete?.()
        return []
      }

      return updated
    })

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (isActive && !isAnimating) {
      setIsAnimating(true)
      const newParticles = createParticles()
      setParticles(newParticles)
      
      // Stop animation after duration
      setTimeout(() => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        setIsAnimating(false)
        setParticles([])
        onComplete?.()
      }, duration)
    }
  }, [isActive, duration, particleCount])

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating, particles])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  if (!isActive && !isAnimating) return null

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

// Enhanced confetti with burst effect
interface SuccessConfettiBurstProps extends SuccessConfettiProps {
  burstCount?: number
  burstDelay?: number
}

export function SuccessConfettiBurst({
  burstCount = 3,
  burstDelay = 800,
  ...props
}: SuccessConfettiBurstProps) {
  const [currentBurst, setCurrentBurst] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (props.isActive && currentBurst === 0) {
      setIsActive(true)
      setCurrentBurst(1)
    }
  }, [props.isActive])

  const handleBurstComplete = () => {
    if (currentBurst < burstCount) {
      setTimeout(() => {
        setCurrentBurst(prev => prev + 1)
        setIsActive(true)
      }, burstDelay)
    } else {
      setCurrentBurst(0)
      props.onComplete?.()
    }
    setIsActive(false)
  }

  return (
    <SuccessConfetti
      {...props}
      isActive={isActive}
      onComplete={handleBurstComplete}
    />
  )
}

export default SuccessConfetti