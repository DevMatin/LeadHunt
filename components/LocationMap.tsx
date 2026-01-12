'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then((mod) => mod.Circle), { ssr: false })

function MapClickHandler({ onLocationSelect, radius }: { onLocationSelect: (lat: number, lng: number, radius: number) => void; radius: number }) {
  if (typeof window === 'undefined') return null
  
  const { useMapEvents } = require('react-leaflet')
  useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng
      onLocationSelect(lat, lng, radius)
    },
  })
  return null
}

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number, radius: number) => void
  initialLat?: number
  initialLng?: number
  initialRadius?: number
}

export default function LocationMap({ onLocationSelect, initialLat, initialLng, initialRadius = 10 }: LocationMapProps) {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : [51.1657, 10.4515]
  )
  const [radius, setRadius] = useState(Math.min(initialRadius || 10, 100))

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      // @ts-ignore - CSS import
      import('leaflet/dist/leaflet.css')
      import('leaflet').then((L) => {
        delete (L.default.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
      })
    }
  }, [])

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng])
    }
  }, [initialLat, initialLng])

  useEffect(() => {
    if (initialRadius) {
      setRadius(Math.min(initialRadius, 100))
    }
  }, [initialRadius])

  const handleLocationSelect = (lat: number, lng: number, currentRadius: number) => {
    setPosition([lat, lng])
    onLocationSelect(lat, lng, currentRadius)
  }

  const radiusInMeters = radius * 1000

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label htmlFor="radius" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Radius (km):
          </label>
          <input
            id="radius"
            type="number"
            min="1"
            max="100"
            value={radius}
            onChange={(e) => {
              const newRadius = Math.min(parseInt(e.target.value, 10) || 1, 100)
              setRadius(newRadius)
              if (position) {
                onLocationSelect(position[0], position[1], newRadius)
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500">
            Karte wird geladen...
          </span>
        </div>
        <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-gray-500">Karte wird geladen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label htmlFor="radius" className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Radius (km):
        </label>
        <input
          id="radius"
          type="number"
          min="1"
          max="100"
          value={radius}
          onChange={(e) => {
            const newRadius = Math.min(parseInt(e.target.value, 10) || 1, 100)
            setRadius(newRadius)
            onLocationSelect(position[0], position[1], newRadius)
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500">
          Klicken Sie auf die Karte, um einen Standort auszuwählen
        </span>
      </div>
      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <MapContainer
          center={position}
          zoom={initialLat && initialLng ? 12 : 6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          <Circle
            center={position}
            radius={radiusInMeters}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
          />
          <MapClickHandler onLocationSelect={(lat, lng) => handleLocationSelect(lat, lng, radius)} radius={radius} />
        </MapContainer>
      </div>
      {position && (
        <div className="text-sm text-gray-600">
          <strong>Ausgewählter Standort:</strong> {position[0].toFixed(6)}, {position[1].toFixed(6)} (Radius: {radius} km)
        </div>
      )}
    </div>
  )
}
