"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value: itemValue, id, disabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    const isChecked = context.value === itemValue

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="radio"
        aria-checked={isChecked}
        disabled={disabled}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => {
          if (!disabled && context.onValueChange) {
            context.onValueChange(itemValue)
          }
        }}
        {...props}
      >
        {isChecked && (
          <div className="flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-current" />
          </div>
        )}
      </button>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }