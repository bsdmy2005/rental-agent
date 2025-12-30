"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelectArea, type SelectedArea } from "@/components/ui/multi-select-area"
import { getServiceProvidersByAreaAction } from "@/actions/service-providers-actions"
import type { SelectServiceProvider } from "@/db/schema"
import { Loader2, X, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type SelectionMethod = "specific" | "area" | "all_in_area"

interface RfqProviderSelectionProps {
  propertySuburb?: string
  propertyProvince?: string
  selectedProviderIds: string[]
  onSelectionChange: (providerIds: string[]) => void
}

export function RfqProviderSelection({
  propertySuburb,
  propertyProvince,
  selectedProviderIds,
  onSelectionChange
}: RfqProviderSelectionProps) {
  const [selectionMethod, setSelectionMethod] = useState<SelectionMethod | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([])
  const [allProviders, setAllProviders] = useState<SelectServiceProvider[]>([])
  const [areaProviders, setAreaProviders] = useState<SelectServiceProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [searchQuery, setSearchQuery] = useState("")

  // Debounce search query
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (query: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (selectionMethod === "specific" && step === 2) {
            loadAllProviders(query)
          } else if (selectionMethod === "area" && selectedAreas.length > 0 && step === 2) {
            loadProvidersByArea(query)
          }
        }, 300)
      }
    })(),
    [selectionMethod, step, selectedAreas]
  )

  // Load all providers for specific selection
  useEffect(() => {
    if (selectionMethod === "specific" && step === 2) {
      loadAllProviders(searchQuery)
    }
  }, [selectionMethod, step, searchQuery])

  // Load providers by area when areas are selected
  useEffect(() => {
    if (selectionMethod === "area" && selectedAreas.length > 0 && step === 2) {
      loadProvidersByArea(searchQuery)
    }
  }, [selectedAreas, selectionMethod, step, searchQuery])

  // Trigger search when query changes
  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery)
    } else {
      // Reload without search when query is cleared
      if (selectionMethod === "specific" && step === 2) {
        loadAllProviders()
      } else if (selectionMethod === "area" && selectedAreas.length > 0 && step === 2) {
        loadProvidersByArea()
      }
    }
  }, [searchQuery])

  async function loadAllProviders(search?: string) {
    setLoading(true)
    try {
      const result = await getServiceProvidersByAreaAction(
        undefined,
        undefined,
        undefined,
        search || undefined
      )
      if (result.isSuccess && result.data) {
        setAllProviders(result.data)
      }
    } catch (error) {
      console.error("Error loading providers:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadProvidersByArea(search?: string) {
    setLoading(true)
    try {
      const providersSet = new Set<string>()
      const providersList: SelectServiceProvider[] = []

      for (const area of selectedAreas) {
        const result = await getServiceProvidersByAreaAction(
          area.suburb,
          area.city,
          area.province,
          search || undefined
        )
        if (result.isSuccess && result.data) {
          for (const provider of result.data) {
            if (!providersSet.has(provider.id)) {
              providersSet.add(provider.id)
              providersList.push(provider)
            }
          }
        }
      }

      setAreaProviders(providersList)
    } catch (error) {
      console.error("Error loading providers by area:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleMethodChange(method: SelectionMethod) {
    setSelectionMethod(method)
    setSelectedAreas([])
    setAreaProviders([])
    setAllProviders([])
    setSearchQuery("")
    onSelectionChange([])
    
    // For "specific" method, go directly to step 2 to show providers
    // For "area" and "all_in_area", stay on step 2 to select areas first
    if (method === "specific") {
      setStep(2)
    } else {
      setStep(2)
    }
  }

  function handleProviderToggle(providerId: string) {
    if (selectedProviderIds.includes(providerId)) {
      onSelectionChange(selectedProviderIds.filter((id) => id !== providerId))
    } else {
      onSelectionChange([...selectedProviderIds, providerId])
    }
  }

  async function handleAreaSelection(areas: SelectedArea[]) {
    setSelectedAreas(areas)
    if (selectionMethod === "all_in_area" && areas.length > 0) {
      // Load providers and automatically select all of them
      setLoading(true)
      try {
        const providersSet = new Set<string>()
        const providersList: SelectServiceProvider[] = []

        for (const area of areas) {
          const result = await getServiceProvidersByAreaAction(
            area.suburb,
            area.city,
            area.province,
            searchQuery || undefined
          )
          if (result.isSuccess && result.data) {
            for (const provider of result.data) {
              if (!providersSet.has(provider.id)) {
                providersSet.add(provider.id)
                providersList.push(provider)
              }
            }
          }
        }

        setAreaProviders(providersList)
        // Automatically select all providers
        const allProviderIds = providersList.map((p) => p.id)
        onSelectionChange(allProviderIds)
        setStep(4)
      } catch (error) {
        console.error("Error loading providers by area:", error)
      } finally {
        setLoading(false)
      }
    } else if (selectionMethod === "area" && areas.length > 0) {
      loadProvidersByArea()
    }
  }

  function handleRemoveProvider(providerId: string) {
    onSelectionChange(selectedProviderIds.filter((id) => id !== providerId))
  }

  const providersToShow =
    selectionMethod === "specific" ? allProviders : areaProviders

  return (
    <div className="space-y-6">
      {/* Step 1: Selection Method */}
      {step === 1 && (
        <div className="space-y-4">
          <Label>How would you like to select providers?</Label>
          <RadioGroup
            value={selectionMethod || ""}
            onValueChange={(value) => handleMethodChange(value as SelectionMethod)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="specific" />
              <Label htmlFor="specific" className="cursor-pointer">
                Select Specific Providers
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="area" id="area" />
              <Label htmlFor="area" className="cursor-pointer">
                Select by Area (then choose providers)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all_in_area" id="all_in_area" />
              <Label htmlFor="all_in_area" className="cursor-pointer">
                Select All Providers in Area
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Step 2a: Specific Provider Selection */}
      {step === 2 && selectionMethod === "specific" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Providers</Label>
            <Button variant="outline" size="sm" onClick={() => {
              setStep(1)
              setSelectionMethod(null)
              setAllProviders([])
              setSearchQuery("")
            }}>
              Back
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading providers...
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {allProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No providers available</p>
              ) : (
                allProviders.map((provider) => (
                  <div key={provider.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={provider.id}
                      checked={selectedProviderIds.includes(provider.id)}
                      onCheckedChange={() => handleProviderToggle(provider.id)}
                    />
                    <Label htmlFor={provider.id} className="cursor-pointer flex-1">
                      {provider.businessName && provider.contactName
                        ? `${provider.businessName} (${provider.contactName})`
                        : provider.businessName || provider.contactName}
                      {provider.specialization && ` - ${provider.specialization}`}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
          {selectedProviderIds.length > 0 && (
            <Button onClick={() => setStep(3)} className="w-full">
              Review Selection ({selectedProviderIds.length} providers)
            </Button>
          )}
        </div>
      )}

      {/* Step 2b: Area Selection */}
      {step === 2 && selectionMethod === "area" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Areas</Label>
            <Button variant="outline" size="sm" onClick={() => {
              setStep(1)
              setSelectionMethod(null)
              setSelectedAreas([])
              setAreaProviders([])
            }}>
              Back
            </Button>
          </div>
          <MultiSelectArea value={selectedAreas} onChange={handleAreaSelection} />
          {selectedAreas.length > 0 && (
            <Button onClick={() => setStep(3)} className="w-full">
              Continue to Provider Selection
            </Button>
          )}
        </div>
      )}

      {/* Step 2d: Provider Selection after Area Selection */}
      {step === 3 && selectionMethod === "area" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Providers</Label>
            <Button variant="outline" size="sm" onClick={() => {
              setStep(2)
              setAreaProviders([])
              setSearchQuery("")
            }}>
              Back
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading providers...
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {areaProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No providers available</p>
              ) : (
                areaProviders.map((provider) => (
                  <div key={provider.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={provider.id}
                      checked={selectedProviderIds.includes(provider.id)}
                      onCheckedChange={() => handleProviderToggle(provider.id)}
                    />
                    <Label htmlFor={provider.id} className="cursor-pointer flex-1">
                      {provider.businessName && provider.contactName
                        ? `${provider.businessName} (${provider.contactName})`
                        : provider.businessName || provider.contactName}
                      {provider.specialization && ` - ${provider.specialization}`}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
          {selectedProviderIds.length > 0 && (
            <Button onClick={() => setStep(4)} className="w-full">
              Review Selection ({selectedProviderIds.length} providers)
            </Button>
          )}
        </div>
      )}

      {/* Step 2c: All in Area */}
      {step === 2 && selectionMethod === "all_in_area" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Areas</Label>
            <Button variant="outline" size="sm" onClick={() => {
              setStep(1)
              setSelectionMethod(null)
              setSelectedAreas([])
              setAreaProviders([])
              onSelectionChange([])
            }}>
              Back
            </Button>
          </div>
          <MultiSelectArea value={selectedAreas} onChange={handleAreaSelection} />
        </div>
      )}

      {/* Step 3/4: Review Selection */}
      {(step === 3 || step === 4) && selectionMethod && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Selected Providers ({selectedProviderIds.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectionMethod === "area") {
                  setStep(3)
                } else if (selectionMethod === "specific") {
                  setStep(2)
                } else {
                  setStep(2)
                }
              }}
            >
              Back
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading providers...
            </div>
          ) : (
            <div className="space-y-2">
              {providersToShow
                .filter((p) => selectedProviderIds.includes(p.id))
                .map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <span>
                      {provider.businessName && provider.contactName
                        ? `${provider.businessName} (${provider.contactName})`
                        : provider.businessName || provider.contactName}
                      {provider.specialization && ` - ${provider.specialization}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProvider(provider.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Providers Summary */}
      {selectedProviderIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {providersToShow
            .filter((p) => selectedProviderIds.includes(p.id))
            .map((provider) => (
              <Badge key={provider.id} variant="secondary">
                {provider.businessName && provider.contactName
                  ? `${provider.businessName} (${provider.contactName})`
                  : provider.businessName || provider.contactName}
              </Badge>
            ))}
        </div>
      )}
    </div>
  )
}

