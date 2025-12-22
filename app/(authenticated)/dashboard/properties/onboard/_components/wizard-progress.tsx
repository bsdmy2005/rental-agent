"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
}

export function WizardProgress({ currentStep, totalSteps, stepLabels }: WizardProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isActive = currentStep === stepNumber
        const isCompleted = currentStep > stepNumber
        const isClickable = isCompleted || isActive

        return (
          <div key={stepNumber} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : isCompleted ? "text-muted-foreground" : "text-muted-foreground"
                  )}
                >
                  {stepLabels[index]}
                </div>
              </div>
            </div>
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "h-1 flex-1 mx-2 transition-colors",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

