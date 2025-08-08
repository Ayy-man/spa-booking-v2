import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Premium spa button variants
        premium: "btn-primary-premium",
        "premium-secondary": "btn-secondary-premium", 
        "premium-continue": "btn-continue-premium",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  success?: boolean
  ripple?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, success = false, ripple = false, children, ...props }, ref) => {
    const [showSuccess, setShowSuccess] = React.useState(false)
    const [rippleActive, setRippleActive] = React.useState(false)

    React.useEffect(() => {
      if (success) {
        setShowSuccess(true)
        const timer = setTimeout(() => {
          setShowSuccess(false)
        }, 2000) // Show success state for 2 seconds
        return () => clearTimeout(timer)
      }
    }, [success])

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || success) return
      
      if (ripple || variant?.includes('premium')) {
        setRippleActive(true)
        setTimeout(() => setRippleActive(false), 600)
      }
      
      props.onClick?.(e)
    }, [loading, success, ripple, variant, props.onClick])

    const Comp = asChild ? Slot : "button"
    
    // Determine final class names
    let finalClassName = cn(buttonVariants({ variant, size }), className)
    
    if (loading) {
      finalClassName = cn(finalClassName, "btn-loading")
    }
    
    if (showSuccess) {
      finalClassName = cn(finalClassName, "btn-success")
    }
    
    if (ripple || variant?.includes('premium')) {
      finalClassName = cn(finalClassName, "btn-ripple")
    }

    return (
      <Comp
        className={finalClassName}
        ref={ref}
        disabled={loading || props.disabled}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          // Loading state - content hidden by CSS, spinner shown by ::after pseudo-element
          children
        ) : showSuccess ? (
          // Success state with checkmark
          <>
            <Check className="w-4 h-4 mr-1" />
            Success!
          </>
        ) : (
          // Normal state
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// Success Checkmark SVG Component for standalone use
export const SuccessCheckmark = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    className={cn("checkmark-success", className)}
    viewBox="0 0 52 52"
    {...props}
  >
    <circle
      cx="26"
      cy="26"
      r="25"
      fill="none"
      stroke="#22c55e"
      strokeWidth="2"
    />
    <path
      fill="none"
      stroke="#22c55e"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.1 27.2 7.1 7.2 16.7-16.8"
    />
  </svg>
))
SuccessCheckmark.displayName = "SuccessCheckmark"

export { Button, buttonVariants }
