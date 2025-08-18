'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { apiClient } from '../lib/apiClient'
import { Menu, Crosshair, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { copyToClipboard } from '../lib/copyToClipboard'
import { createInfoWindowContent } from '../lib/createInfoWindowContent'
import SpotsLimitFAB from './SpotsLimitFAB'

const defaultCenter = { lat: 47.6062, lng: -122.3321 }

export default function ParkingMapView({ setShowSidebar }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({ spots: [], signs: [] })
  const infoWindowRef = useRef(null)
  const autocompleteServiceRef = useRef(null)
  const placesServiceRef = useRef(null)

  const [spotsLimit, setSpotsLimit] = useState(10)
  const [parkingSpots, setParkingSpots] = useState([])
  const [parkingSigns, setParkingSigns] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [predictions, setPredictions] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedPredictionId, setSelectedPredictionId] = useState(null)

  // Load Google Maps API
  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          version: 'beta',
          libraries: ['places', 'marker']
        })

        await loader.load()

        const { Map } = await google.maps.importLibrary('maps')
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker')

        mapInstanceRef.current = new Map(mapRef.current, {
          center: defaultCenter,
          zoom: 15,
          mapId: 'YOUR_MAP_ID',
          disableDefaultUI: true,
          gestureHandling: 'greedy'
        })

        markersRef.current.AdvancedMarkerElement = AdvancedMarkerElement
        infoWindowRef.current = new google.maps.InfoWindow()

        autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
        placesServiceRef.current = new google.maps.places.PlacesService(mapInstanceRef.current)

        // ✅ Intercept clicks on Google POIs
        mapInstanceRef.current.addListener('click', (e) => {
          if (e.placeId) {
            e.stop() // Prevent Google's default InfoWindow

            placesServiceRef.current.getDetails(
              { placeId: e.placeId },
              (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                  const addressText = place.formatted_address || place.name
                  const encodedAddress = encodeURIComponent(addressText)
                  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
                  const appleMapsUrl = `https://maps.apple.com/?q=${encodedAddress}`

                  const lat = place.geometry.location.lat()
                  const lng = place.geometry.location.lng()

                  const content = createInfoWindowContent({
                    title: place.name || 'Location',
                    description: addressText,
                    googleMapsUrl,
                    appleMapsUrl,
                    copyLabel: 'Copy Address',
                    showFindParking: true
                  })

                  infoWindowRef.current.setContent(content)
                  infoWindowRef.current.setPosition(place.geometry.location)
                  infoWindowRef.current.open(mapInstanceRef.current)

                  google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
                    const btn = document.getElementById('copy-btn')
                    if (btn) {
                      btn.addEventListener('click', () => {
                        copyToClipboard(addressText, () => {
                          btn.innerText = 'Copied!'
                          btn.style.background = '#16a34a'
                          setTimeout(() => {
                            btn.innerText = 'Copy Address'
                            btn.style.background = '#2563eb'
                          }, 1500)
                        })
                      })
                    }

                    const findBtn = document.getElementById('find-parking-btn')
                    if (findBtn) {
                      findBtn.addEventListener('click', () => {
                        setSelectedLocation({ lat, lng })
                        searchParkingAt(lat, lng)
                        infoWindowRef.current.close() // ✅ close popup
                      })
                    }
                  })
                }
              }
            )
          }
        })
      } catch (err) {
        console.error('Error loading Google Maps:', err)
        toast.error('Failed to load Google Maps')
      }
    }

    initMap()
  }, [])

  // Fit bounds
  const fitMapBounds = useCallback(() => {
    if (!mapInstanceRef.current) return
    const bounds = new google.maps.LatLngBounds()
    ;[...parkingSpots, ...parkingSigns].forEach(({ lat, lng }) =>
      bounds.extend({ lat, lng })
    )
    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 })
    }
  }, [parkingSpots, parkingSigns])

  // Clear markers
  const clearMarkers = (type) => {
    markersRef.current[type]?.forEach((m) => m.setMap(null))
    markersRef.current[type] = []
  }

  // Marker creation helper
  const addMarker = ({ position, title, label, onClick }) => {
    const { AdvancedMarkerElement } = markersRef.current
    const div = document.createElement('div')
    div.style.background = label.bg
    div.style.color = label.color
    div.style.padding = '4px 8px'
    div.style.borderRadius = '9999px'
    div.style.fontSize = '12px'
    div.style.fontWeight = 'bold'
    div.style.pointerEvents = 'none'
    div.innerText = label.text

    const marker = new AdvancedMarkerElement({
      position,
      map: mapInstanceRef.current,
      title,
      content: div,
      gmpClickable: true
    })

    marker.addListener('click', () => onClick(marker))
    return marker
  }

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current.AdvancedMarkerElement) return

    clearMarkers('spots')
    clearMarkers('signs')

    // Parking Spots
    markersRef.current.spots = parkingSpots.map((spot) =>
      addMarker({
        position: { lat: spot.lat, lng: spot.lng },
        title: 'Public Parking',
        label: { bg: '#16a34a', color: 'black', text: 'P' },
        onClick: (marker) => {
          const addressText = spot.address || `${spot.lat}, ${spot.lng}`
          const encodedAddress = encodeURIComponent(addressText)
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
          const appleMapsUrl = `https://maps.apple.com/?q=${encodedAddress}`

          const content = createInfoWindowContent({
            title: 'Public Parking',
            description: addressText,
            googleMapsUrl,
            appleMapsUrl,
            copyLabel: 'Copy Address',
            showFindParking: true
          })

          infoWindowRef.current.setContent(content)
          infoWindowRef.current.open(mapInstanceRef.current, marker)

          google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
            const btn = document.getElementById('copy-btn')
            if (btn) {
              btn.addEventListener('click', () => {
                copyToClipboard(addressText, () => {
                  btn.innerText = 'Copied!'
                  btn.style.background = '#16a34a'
                  setTimeout(() => {
                    btn.innerText = 'Copy Address'
                    btn.style.background = '#2563eb'
                  }, 1500)
                })
              })
            }

            const findBtn = document.getElementById('find-parking-btn')
            if (findBtn) {
              findBtn.addEventListener('click', () => {
                setSelectedLocation({ lat: spot.lat, lng: spot.lng })
                searchParkingAt(spot.lat, spot.lng)
                infoWindowRef.current.close() // ✅ close popup
              })
            }
          })
        }
      })
    )

    fitMapBounds()
  }, [parkingSpots, parkingSigns, fitMapBounds])

  // Search parking
  const searchParkingAt = async (lat, lng) => {
    try {
      const result = await apiClient.searchParking(lat, lng)
      setParkingSpots((result.public_parking_results || []).slice(0, spotsLimit))
      setParkingSigns((result.parking_sign_results || []).slice(0, spotsLimit))
      
      // Center the map on the search location
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng })
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch parking data.')
    }
  }

  // Predictions
  useEffect(() => {
    if (!inputValue || !autocompleteServiceRef.current) {
      setPredictions([])
      return
    }
    autocompleteServiceRef.current.getPlacePredictions(
      { input: inputValue, componentRestrictions: { country: 'us' } },
      (preds) => {
        if (!preds) {
          setPredictions([])
          return
        }
        const filtered = preds.filter((p) =>
          p.description.toLowerCase().includes('seattle, wa')
        )
        setPredictions(filtered.slice(0, 5))
      }
    )
  }, [inputValue])

  const handlePredictionClick = (p) => {
    if (!placesServiceRef.current) return
    setSelectedPredictionId(p.place_id)
    placesServiceRef.current.getDetails({ placeId: p.place_id }, (place) => {
      if (!place.geometry) return
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      setSelectedLocation({ lat, lng })
      searchParkingAt(lat, lng)
      setInputValue(p.description) // keep text like Google Maps
    })
  }

  const handleMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setSelectedLocation({ lat, lng })
      await searchParkingAt(lat, lng)
    })
  }

  const handleFindParkingClick = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location first.')
      return
    }
    setPredictions([]) // clear instantly
    await searchParkingAt(selectedLocation.lat, selectedLocation.lng)
  }

  const clearSearch = () => {
    setInputValue('')
    setPredictions([])
    setSelectedPredictionId(null)
  }

  return (
    <div className="relative w-full h-screen">
      <Toaster position="top-center" />
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Menu button */}
      <button
        onClick={() => setShowSidebar(true)}
        className="fixed top-4 left-4 z-50 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition"
      >
        <Menu className="w-6 h-6 text-gray-800" />
      </button>

      {/* My Location */}
      <button
        onClick={handleMyLocation}
        className="fixed bottom-24 right-4 z-50 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition"
      >
        <Crosshair className="w-6 h-6 text-gray-800" />
      </button>

      <SpotsLimitFAB spotsLimit={spotsLimit} setSpotsLimit={setSpotsLimit} />

      {/* Search bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-lg flex flex-col items-center gap-2">
        {predictions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden w-full"
          >
            {predictions.map((p) => (
              <li
                key={p.place_id}
                onClick={() => handlePredictionClick(p)}
                className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-black ${
                  selectedPredictionId === p.place_id ? 'bg-gray-200' : ''
                }`}
              >
                {p.description}
              </li>
            ))}
          </motion.ul>
        )}

        <div className="flex w-full gap-2 items-center bg-white rounded-full shadow-lg border border-gray-300 overflow-hidden px-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for an address..."
            className="flex-1 px-2 py-3 focus:outline-none text-gray-900"
          />
          {inputValue && (
            <button
              onClick={clearSearch}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleFindParkingClick}
            className="bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition flex items-center justify-center"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  )
}