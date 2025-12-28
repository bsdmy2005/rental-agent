"use client"

import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface SignaturePadProps {
  onSign: (signatureData: string) => void
  onCancel?: () => void
  width?: number
  height?: number
  className?: string
}

export function SignaturePad({
  onSign,
  onCancel,
  width = 500,
  height = 200,
  className
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleClear = () => {
    sigPadRef.current?.clear()
    setIsEmpty(true)
  }

  const handleEnd = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setIsEmpty(false)
    }
  }

  const handleSign = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const signatureData = sigPadRef.current.toDataURL("image/png")
      onSign(signatureData)
    }
  }

  return (
    <div className={className}>
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sign Here</h3>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded">
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              width,
              height,
              className: "signature-canvas"
            }}
            onEnd={handleEnd}
            backgroundColor="#ffffff"
            penColor="#000000"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleClear} disabled={isEmpty}>
            Clear
          </Button>
          <Button onClick={handleSign} disabled={isEmpty}>
            Confirm Signature
          </Button>
        </div>
      </div>
    </div>
  )
}

