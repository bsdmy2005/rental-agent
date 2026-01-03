"use client"

import { useState, useMemo } from "react"
import { X, Search, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  getAllProvinces,
  getCitiesByProvince,
  getSuburbsByCity,
  searchSuburbs
} from "@/lib/utils/south-africa-geography"
import { cn } from "@/lib/utils"

export interface SelectedArea {
  province: string
  city: string
  suburb?: string // undefined means entire city
}

interface MultiSelectAreaProps {
  value?: SelectedArea[]
  onChange: (areas: SelectedArea[]) => void
  className?: string
}

export function MultiSelectArea({ value = [], onChange, className }: MultiSelectAreaProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("")
  const [selectedCity, setSelectedCity] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)

  const provinces = getAllProvinces()
  const cities = selectedProvince ? getCitiesByProvince(selectedProvince) : []
  const suburbs = selectedProvince && selectedCity ? getSuburbsByCity(selectedProvince, selectedCity) : []

  // Filter suburbs based on search query
  const filteredSuburbs = useMemo(() => {
    if (!searchQuery.trim()) {
      return suburbs
    }

    if (selectedProvince && selectedCity) {
      // Search within selected city
      return suburbs.filter((suburb) =>
        suburb.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else {
      // Search across all suburbs
      return searchSuburbs(searchQuery).map((item) => ({
        name: item.suburb
      }))
    }
  }, [searchQuery, suburbs, selectedProvince, selectedCity])

  // Check if an area is already selected
  const isAreaSelected = (province: string, city: string, suburb?: string): boolean => {
    return value.some(
      (area) =>
        area.province === province &&
        area.city === city &&
        area.suburb === suburb
    )
  }

  // Check if entire city is selected
  const isCitySelected = (province: string, city: string): boolean => {
    return value.some((area) => area.province === province && area.city === city && !area.suburb)
  }

  // Add an area
  const addArea = (province: string, city: string, suburb?: string) => {
    // Don't add if already selected
    if (isAreaSelected(province, city, suburb)) {
      return
    }

    // If adding entire city, remove all suburbs of that city first
    if (!suburb) {
      const newAreas = value.filter(
        (area) => !(area.province === province && area.city === city)
      )
      onChange([...newAreas, { province, city }])
    } else {
      // If adding a suburb, make sure city-wide selection is removed
      const newAreas = value.filter(
        (area) => !(area.province === province && area.city === city && !area.suburb)
      )
      onChange([...newAreas, { province, city, suburb }])
    }

    // Reset form
    setSelectedProvince("")
    setSelectedCity("")
    setSearchQuery("")
  }

  // Remove an area
  const removeArea = (index: number) => {
    const newAreas = value.filter((_, i) => i !== index)
    onChange(newAreas)
  }

  // Select all suburbs in a city
  const selectAllSuburbs = (province: string, city: string) => {
    const citySuburbs = getSuburbsByCity(province, city)
    const newAreas = value.filter(
      (area) => !(area.province === province && area.city === city)
    )

    const suburbAreas: SelectedArea[] = citySuburbs.map((suburb) => ({
      province,
      city,
      suburb: suburb.name
    }))

    onChange([...newAreas, ...suburbAreas])
  }

  // Toggle city selection (select all or deselect all)
  const toggleCity = (province: string, city: string) => {
    if (isCitySelected(province, city)) {
      // Deselect city (remove all areas for this city)
      const newAreas = value.filter(
        (area) => !(area.province === province && area.city === city)
      )
      onChange(newAreas)
    } else {
      // Select entire city
      addArea(province, city)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Areas Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((area, index) => (
            <Badge key={index} variant="secondary" className="gap-1 pr-1">
              <span>
                {area.suburb
                  ? `${area.suburb}, ${area.city}, ${area.province}`
                  : `All of ${area.city}, ${area.province}`}
              </span>
              <button
                type="button"
                onClick={() => removeArea(index)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selection Controls */}
      <div className="space-y-3 border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Province Select */}
          <div>
            <label className="text-sm font-medium mb-1 block">Province</label>
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Select */}
          <div>
            <label className="text-sm font-medium mb-1 block">City</label>
            <Select
              value={selectedCity}
              onValueChange={setSelectedCity}
              disabled={!selectedProvince}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedProvince ? "Select city" : "Select province first"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search and Suburb Selection */}
        {selectedProvince && selectedCity && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suburbs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleCity(selectedProvince, selectedCity)}
              >
                {isCitySelected(selectedProvince, selectedCity) ? "Deselect City" : "Select All City"}
              </Button>
            </div>

            {/* Suburb List */}
            {filteredSuburbs.length > 0 && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {filteredSuburbs.map((suburb) => {
                    const isSelected = isAreaSelected(selectedProvince, selectedCity, suburb.name)
                    return (
                      <button
                        key={suburb.name}
                        type="button"
                        onClick={() => addArea(selectedProvince, selectedCity, suburb.name)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-sm text-sm hover:bg-accent flex items-center justify-between",
                          isSelected && "bg-accent"
                        )}
                      >
                        <span>{suburb.name}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {filteredSuburbs.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No suburbs found matching "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Quick City Selection (when province is selected but city is not) */}
        {selectedProvince && !selectedCity && cities.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Select Cities:</label>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Button
                  key={city.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArea(selectedProvince, city.name)}
                  disabled={isCitySelected(selectedProvince, city.name)}
                >
                  {city.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

