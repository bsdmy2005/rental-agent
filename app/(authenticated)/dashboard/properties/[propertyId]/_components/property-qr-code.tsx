"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, QrCode } from "lucide-react"
import { generatePropertySubmissionQRCode } from "@/lib/qr-code/generator"
import Image from "next/image"

interface PropertyQRCodeProps {
  propertyCode: string
  propertyName: string
}

export function PropertyQRCode({ propertyCode, propertyName }: PropertyQRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true)
        const dataUrl = await generatePropertySubmissionQRCode(propertyCode)
        setQrCodeDataUrl(dataUrl)
        setError(null)
      } catch (err) {
        setError("Failed to generate QR code")
        console.error("Error generating QR code:", err)
      } finally {
        setLoading(false)
      }
    }

    if (propertyCode) {
      generateQR()
    }
  }, [propertyCode])

  const handleDownload = () => {
    if (!qrCodeDataUrl) return

    const link = document.createElement("a")
    link.href = qrCodeDataUrl
    link.download = `${propertyName}-incident-submission-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>Generating QR code for incident submission...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !qrCodeDataUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>Failed to generate QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || "Unknown error"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code for Incident Submission</CardTitle>
        <CardDescription>
          Print this QR code and place it at your property. Tenants can scan it to quickly report incidents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center p-6 bg-white rounded-lg border-2 border-dashed">
          <div className="relative w-64 h-64">
            <Image
              src={qrCodeDataUrl}
              alt={`QR Code for ${propertyName} incident submission`}
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm font-medium">{propertyName}</p>
          <p className="text-xs text-muted-foreground font-mono">{propertyCode}</p>
        </div>

        <Button onClick={handleDownload} className="w-full" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download QR Code
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Download and print this QR code</li>
            <li>Place it in a visible location at your property</li>
            <li>Tenants can scan it with their phone camera</li>
            <li>They will be taken directly to the incident submission form</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

