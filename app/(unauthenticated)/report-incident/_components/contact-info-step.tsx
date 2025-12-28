"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ContactInfoStepProps {
  onComplete: (data: {
    submittedName?: string
    submittedPhone?: string
  }) => void
  onBack: () => void
  defaultName?: string
  defaultPhone?: string
}

export function ContactInfoStep({
  onComplete,
  onBack,
  defaultName,
  defaultPhone
}: ContactInfoStepProps) {
  const [name, setName] = useState(defaultName || "")
  const [phone, setPhone] = useState(defaultPhone || "")

  useEffect(() => {
    if (defaultName) setName(defaultName)
    if (defaultPhone) setPhone(defaultPhone)
  }, [defaultName, defaultPhone])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({
      submittedName: name.trim() || undefined,
      submittedPhone: phone.trim() || undefined
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Your Name (Optional)</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Help us contact you if we need more information
        </p>
      </div>

      <div>
        <Label htmlFor="phone">Phone Number (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+27 82 123 4567"
        />
        <p className="text-xs text-muted-foreground mt-1">
          We may contact you for updates on your incident
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Continue
        </Button>
      </div>
    </form>
  )
}

