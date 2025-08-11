'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface LocationMapProps {
  latitude: string
  longitude: string
  onLocationChange: (lat: string, lng: string) => void
  className?: string
}

export default function LocationMap({ 
  latitude, 
  longitude, 
  onLocationChange, 
  className = '' 
}: LocationMapProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [mapUrl, setMapUrl] = useState<string>('')

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      
      if (!isNaN(lat) && !isNaN(lng)) {
        // Create embedded map URL
        const embedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${lat},${lng}&zoom=15`
        setMapUrl(embedUrl)
      }
    } else {
      setMapUrl('')
    }
  }, [latitude, longitude])

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    setIsDetecting(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toString()
        const lng = position.coords.longitude.toString()
        
        onLocationChange(lat, lng)
        toast.success('Location detected successfully')
        setIsDetecting(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        let errorMessage = 'Failed to detect location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        
        toast.error(errorMessage)
        setIsDetecting(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const handleViewOnMap = () => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`
      window.open(url, '_blank')
    }
  }

  const handleOpenMapSelector = () => {
    // Open Google Maps in a new window for location selection
    const url = 'https://www.google.com/maps'
    const newWindow = window.open(url, '_blank', 'width=800,height=600')
    
    if (newWindow) {
      toast.info('Select a location on the map, then copy the coordinates from the URL')
    }
  }

  const validateCoordinate = (value: string, type: 'lat' | 'lng'): boolean => {
    const num = parseFloat(value)
    if (isNaN(num)) return false
    
    if (type === 'lat') {
      return num >= -90 && num <= 90
    } else {
      return num >= -180 && num <= 180
    }
  }

  const handleLatitudeChange = (value: string) => {
    if (value === '' || validateCoordinate(value, 'lat')) {
      onLocationChange(value, longitude)
    }
  }

  const handleLongitudeChange = (value: string) => {
    if (value === '' || validateCoordinate(value, 'lng')) {
      onLocationChange(latitude, value)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Coordinate Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            value={latitude}
            onChange={(e) => handleLatitudeChange(e.target.value)}
            placeholder="e.g., 40.7128"
            type="number"
            step="any"
          />
          <p className="text-xs text-gray-500">Range: -90 to 90</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={longitude}
            onChange={(e) => handleLongitudeChange(e.target.value)}
            placeholder="e.g., -74.0060"
            type="number"
            step="any"
          />
          <p className="text-xs text-gray-500">Range: -180 to 180</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleAutoDetect}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Auto-detect Location
            </>
          )}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenMapSelector}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Select on Map
        </Button>
        
        {latitude && longitude && (
          <Button
            type="button"
            variant="outline"
            onClick={handleViewOnMap}
          >
            View on Google Maps
          </Button>
        )}
      </div>

      {/* Location Preview */}
      {latitude && longitude && (
        <div className="space-y-2">
          <Label>Location Preview</Label>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Current Coordinates
                </p>
                <p className="text-sm text-blue-700">
                  {latitude}, {longitude}
                </p>
              </div>
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          {/* Simple map placeholder - in production, you'd use a proper map component */}
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 text-sm">
              Map preview would appear here
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Click "View on Google Maps" to see the exact location
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How to set location:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use "Auto-detect Location" to get your current position</li>
          <li>• Click "Select on Map" to choose a location manually</li>
          <li>• Enter coordinates directly if you know them</li>
          <li>• Use "View on Google Maps" to verify the location</li>
        </ul>
      </div>
    </div>
  )
}
