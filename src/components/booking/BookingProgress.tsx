'use client'

interface BookingProgressProps {
  currentStep: number
  totalSteps: number
  steps: string[]
}

export default function BookingProgress({ currentStep, totalSteps, steps }: BookingProgressProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep
          
          return (
            <div key={step} className="flex items-center">
              {/* Step Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted 
                    ? 'bg-primary text-white' 
                    : isCurrent 
                    ? 'bg-primary-dark text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              
              {/* Step Label */}
              <div className="ml-2 hidden md:block">
                <span
                  className={`
                    text-sm font-medium
                    ${isCurrent 
                      ? 'text-primary-dark' 
                      : isCompleted 
                      ? 'text-gray-700' 
                      : 'text-gray-500'
                    }
                  `}
                >
                  {step}
                </span>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-px mx-4
                    ${isCompleted 
                      ? 'bg-primary' 
                      : 'bg-gray-200'
                    }
                  `}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}