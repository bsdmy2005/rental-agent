"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Key, Phone, MapPin, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PropertyIdentificationStepProps {
  onComplete: (data: {
    propertyId: string
    propertyName: string
    tenantId?: string
    tenantName?: string
  }) => void
}

export function PropertyIdentificationStep({ onComplete }: PropertyIdentificationStepProps) {
  const [method, setMethod] = useState<"code" | "phone" | "address">("code")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Code method
  const [code, setCode] = useState("")

  // Phone method
  const [phone, setPhone] = useState("")

  // Address method
  const [addressSearch, setAddressSearch] = useState("")
  const [searchResults, setSearchResults] = useState<
    Array<{ propertyId: string; propertyName: string; address: string }>
  >([])
  const [searching, setSearching] = useState(false)

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError("Please enter a property code")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/properties/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "code", value: code.trim().toUpperCase() })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Invalid property code")
      }

      onComplete({
        propertyId: result.data.propertyId,
        propertyName: result.data.propertyName
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to identify property")
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      setError("Please enter a phone number")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/properties/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "phone", value: phone.trim() })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "No property found for this phone number")
      }

      onComplete({
        propertyId: result.data.propertyId,
        propertyName: result.data.propertyName,
        tenantId: result.data.tenantId,
        tenantName: result.data.tenantName
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to identify property")
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addressSearch.trim()) {
      setError("Please enter an address, suburb, or postal code")
      return
    }

    setSearching(true)
    setError(null)

    try {
      const response = await fetch("/api/properties/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "address", value: addressSearch.trim() })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to search properties")
      }

      setSearchResults(result.data || [])
      if (result.data.length === 0) {
        setError("No properties found. Please try a different search term.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to search properties")
    } finally {
      setSearching(false)
    }
  }

  const handleSelectProperty = (property: {
    propertyId: string
    propertyName: string
  }) => {
    onComplete({
      propertyId: property.propertyId,
      propertyName: property.propertyName
    })
  }

  return (
    <div className="space-y-4">
      <Tabs value={method} onValueChange={(value) => {
        setMethod(value as "code" | "phone" | "address")
        setError(null)
        setSearchResults([])
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="code">
            <Key className="h-4 w-4 mr-2" />
            Code
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Phone className="h-4 w-4 mr-2" />
            Phone
          </TabsTrigger>
          <TabsTrigger value="address">
            <MapPin className="h-4 w-4 mr-2" />
            Address
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4 mt-4">
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Property Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PROP-ABC123"
                disabled={loading}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the property code provided by your landlord
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="phone" className="space-y-4 mt-4">
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the phone number registered with your property
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="address" className="space-y-4 mt-4">
          <form onSubmit={handleAddressSearch} className="space-y-4">
            <div>
              <Label htmlFor="address">Search by Address</Label>
              <Input
                id="address"
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                placeholder="Street address, suburb, or postal code"
                disabled={searching}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Search by street address, suburb name, or postal code
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={searching} className="w-full">
              {searching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Search
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">Select your property:</p>
              <div className="space-y-2">
                {searchResults.map((property) => (
                  <Button
                    key={property.propertyId}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleSelectProperty(property)}
                  >
                    <div>
                      <p className="font-medium">{property.propertyName}</p>
                      <p className="text-xs text-muted-foreground">{property.address}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

