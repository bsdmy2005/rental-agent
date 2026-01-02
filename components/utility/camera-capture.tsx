"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Camera, RotateCcw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onCancel?: () => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CameraCapture({ onCapture, onCancel, isOpen, onOpenChange }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera()
    } else if (!isOpen) {
      stopCamera()
      setCapturedImage(null)
      setError(null)
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, capturedImage])

  const startCamera = async () => {
    try {
      setError(null)
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to access camera. Please ensure camera permissions are granted."
      
      // Handle permission denied/dismissed gracefully
      if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDismissedError")) {
        setError("Camera permission was denied. Please allow camera access in your browser settings.")
      } else {
        setError(errorMessage)
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9)
      setCapturedImage(imageDataUrl)
      stopCamera()
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
    stopCamera()
    setTimeout(() => startCamera(), 100)
  }

  const handleConfirm = () => {
    if (!capturedImage) return

    // Convert data URL to File
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg"
        })
        onCapture(file)
        onOpenChange(false)
        setCapturedImage(null)
      })
      .catch((err) => {
        console.error("Error converting image:", err)
        setError("Failed to process image")
      })
  }

  const handleCancel = () => {
    stopCamera()
    setCapturedImage(null)
    onOpenChange(false)
    onCancel?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full p-0 sm:max-w-2xl">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Capture Photo</DialogTitle>
        </DialogHeader>
        <div className="relative bg-black">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4">
                  <div className="text-center">
                    <p className="text-sm mb-2">{error}</p>
                    <Button onClick={startCamera} variant="outline" size="sm">
                      Retry
                    </Button>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 p-4">
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-16 h-16"
                >
                  <X className="h-6 w-6" />
                </Button>
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="rounded-full w-20 h-20 bg-white hover:bg-gray-100"
                  disabled={!!error}
                >
                  <Camera className="h-10 w-10 text-black" />
                </Button>
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-16 h-16 bg-white/20 backdrop-blur"
                >
                  <RotateCcw className="h-6 w-6 text-white" />
                </Button>
              </div>
            </>
          ) : (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 p-4">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-16 h-16 bg-white/20 backdrop-blur"
                >
                  <RotateCcw className="h-6 w-6 text-white" />
                </Button>
                <Button onClick={handleConfirm} size="lg" className="rounded-full w-20 h-20">
                  <Camera className="h-10 w-10" />
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-16 h-16"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

