'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { apiClient } from '../lib/apiClient'
import { Menu, Crosshair, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { copyToClipboard } from '../lib/copyToClipboard'
import { createInfoWindowContent, createParkingSignInfoWindow } from '../lib/createInfoWindowContent'
import { useUserData } from '../hooks/useUserData'
import posthog from 'posthog-js'

const defaultCenter = { lat: 47.6062, lng: -122.3321 }

export default function ParkingMapView({ setShowSidebar }) {
  const { incrementStat } = useUserData()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({ spots: [], signs: [] })
  const infoWindowRef = useRef(null)
  const autocompleteServiceRef = useRef(null)
  const placesServiceRef = useRef(null)

  const [parkingLimit, setParkingLimit] = useState(10)
  const [parkingSpots, setParkingSpots] = useState([])
  const [parkingSigns, setParkingSigns] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [predictions, setPredictions] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedPredictionId, setSelectedPredictionId] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchLocation, setSearchLocation] = useState(null)
  const [showParkingSpots, setShowParkingSpots] = useState(true)
  const [showParkingSigns, setShowParkingSigns] = useState(true)
  const [showParkingPanel, setShowParkingPanel] = useState(true)

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
          gestureHandling: 'greedy',
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scaleControl: false,
          rotateControl: false,
          tilt: 0
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
                  // console.log('✅ Place details received successfully')
                  
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

  // Clear all markers
  const clearAllMarkers = () => {
    clearMarkers('spots')
    clearMarkers('signs')
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

  // Loading marker helper
  const addLoadingMarker = (position) => {
    const { AdvancedMarkerElement } = markersRef.current
    const container = document.createElement('div')
    container.style.position = 'relative'
    container.style.display = 'flex'
    container.style.alignItems = 'center'
    container.style.justifyContent = 'center'
    
    // Main pin
    const pin = document.createElement('div')
    pin.style.background = '#3b82f6'
    pin.style.color = 'white'
    pin.style.padding = '4px 8px'
    pin.style.borderRadius = '9999px'
    pin.style.fontSize = '12px'
    pin.style.fontWeight = 'bold'
    pin.innerText = '🔍'
    
    // Pulsing ring
    const ring = document.createElement('div')
    ring.style.position = 'absolute'
    ring.style.width = '40px'
    ring.style.height = '40px'
    ring.style.border = '2px solid #3b82f6'
    ring.style.borderRadius = '50%'
    ring.style.animation = 'pulse 2s infinite'
    ring.style.opacity = '0.6'
    
    container.appendChild(ring)
    container.appendChild(pin)
    
    // Add CSS animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.2); opacity: 0.3; }
        100% { transform: scale(1); opacity: 0.6; }
      }
    `
    document.head.appendChild(style)

    return new AdvancedMarkerElement({
      position,
      map: mapInstanceRef.current,
      title: 'Searching for parking...',
      content: container,
      gmpClickable: false
    })
  }

  // Clear markers when visibility toggles change
  useEffect(() => {
    if (!mapInstanceRef.current) return
    
    if (!showParkingSpots) {
      clearMarkers('spots')
    }
    if (!showParkingSigns) {
      clearMarkers('signs')
    }
  }, [showParkingSpots, showParkingSigns])

  // Re-apply limit when parkingLimit changes
  useEffect(() => {
    if (selectedLocation && parkingSpots.length > 0) {
      // Re-apply the current limit to existing results
      setParkingSpots((prev) => prev.slice(0, parkingLimit))
      setParkingSigns((prev) => prev.slice(0, parkingLimit))
    }
  }, [parkingLimit, selectedLocation])

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current.AdvancedMarkerElement) return

    clearMarkers('spots')
    clearMarkers('signs')

    // Parking Spots
    markersRef.current.spots = showParkingSpots ? parkingSpots.map((spot) =>
      addMarker({
        position: { lat: spot.lat, lng: spot.lng },
        title: 'Public Parking',
        label: { bg: '#16a34a', color: 'black', text: 'P' },
        onClick: (marker) => {
          // console.log('🎯 Parking spot marker clicked:', spot)
          const addressText = spot.address || `${spot.lat}, ${spot.lng}`
          const encodedAddress = encodeURIComponent(addressText)
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
          const appleMapsUrl = `https://maps.apple.com/?q=${encodedAddress}`
          
          // console.log('🔗 URLs created:', { googleMapsUrl, appleMapsUrl })

          const content = createInfoWindowContent({
            title: 'Public Parking',
            description: addressText,
            googleMapsUrl,
            appleMapsUrl,
            copyLabel: 'Copy Address',
            showFindParking: true
          })
          
          // console.log('📝 Content created:', content)
          // console.log('📝 Content length:', content.length)
          // console.log('📝 Content type:', typeof content)

          infoWindowRef.current.setContent(content)
          // console.log('✅ Content set to InfoWindow')
          
          infoWindowRef.current.setPosition({ lat: spot.lat, lng: spot.lng })
          // console.log('📍 Position set')
          
          infoWindowRef.current.open(mapInstanceRef.current)
          // console.log('🚀 InfoWindow opened')

          google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
            // Copy button handler
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

            // Find parking button handler
            const findBtn = document.getElementById('find-parking-btn')
            if (findBtn) {
              findBtn.addEventListener('click', () => {
                setSelectedLocation({ lat: spot.lat, lng: spot.lng })
                searchParkingAt(spot.lat, spot.lng)
                infoWindowRef.current.close() // ✅ close popup
              })
            }

            // Google Maps button handler
            const googleMapsBtn = document.getElementById('google-maps-btn')
            if (googleMapsBtn) {
              googleMapsBtn.addEventListener('click', () => {
                window.open(googleMapsUrl, '_blank')
              })
            }

            // Apple Maps button handler
            const appleMapsBtn = document.getElementById('apple-maps-btn')
            if (appleMapsBtn) {
              appleMapsBtn.addEventListener('click', () => {
                window.open(appleMapsUrl, '_blank')
              })
            }
          })
        }
      })
    ) : []

    // Parking Signs (filter by status and category)
    markersRef.current.signs = showParkingSigns ? parkingSigns
      .map((sign) =>
        addMarker({
        position: { lat: sign.lat, lng: sign.lng },
        title: sign.text ? `Parking Sign: ${sign.text.substring(0, 50)}...` : 'Parking Sign',
        label: { 
          bg: '#ef4444', 
          color: 'white', 
          text: 'S' 
        },
        onClick: (marker) => {
          // console.log('🪧 Parking sign marker clicked:', sign)
          const signText = sign.text || 'No text available'
          const description = sign.description || 'Unknown Sign Type'
          const distance = sign.distance_m ? `${Math.round(sign.distance_m)} meters away` : ''
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${sign.lat},${sign.lng}`
          const appleMapsUrl = `https://maps.apple.com/?q=${sign.lat},${sign.lng}`
          
          // console.log('🔗 Sign URLs created:', { googleMapsUrl, appleMapsUrl })
          
          const content = createParkingSignInfoWindow({
            signText,
            description,
            distance,
            googleMapsUrl,
            appleMapsUrl
          })
          
          // console.log('📝 Sign content created:', content)
          // console.log('📝 Sign content length:', content.length)
          // console.log('📝 Sign content type:', typeof content)

          infoWindowRef.current.setContent(content)
          // console.log('✅ Sign content set to InfoWindow')
          
          infoWindowRef.current.setPosition({ lat: sign.lat + 0.0001, lng: sign.lng })
          // console.log('📍 Sign position set')
          
          infoWindowRef.current.open(mapInstanceRef.current)
          // console.log('🚀 Sign InfoWindow opened')

          google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
            // Copy button handler
            const btn = document.getElementById('copy-btn')
            if (btn) {
              btn.addEventListener('click', () => {
                copyToClipboard(signText, () => {
                  btn.innerText = '✅ Copied!'
                  btn.style.background = '#16a34a'
                  setTimeout(() => {
                    btn.innerText = '📋 Copy Sign Text'
                    btn.style.background = '#6b7280'
                  }, 1500)
                })
              })
            }

            // Google Maps button handler
            const googleMapsBtn = document.getElementById('google-maps-btn')
            if (googleMapsBtn) {
              googleMapsBtn.addEventListener('click', () => {
                window.open(googleMapsUrl, '_blank')
              })
            }

            // Apple Maps button handler
            const appleMapsBtn = document.getElementById('apple-maps-btn')
            if (appleMapsBtn) {
              appleMapsBtn.addEventListener('click', () => {
                window.open(appleMapsUrl, '_blank')
              })
            }
          })
        }
      })
    ) : []

    fitMapBounds()
  }, [parkingSpots, parkingSigns, fitMapBounds, showParkingSpots, showParkingSigns, parkingLimit])

  // Search parking
  const searchParkingAt = async (lat, lng) => {
    setIsSearching(true)
    setSearchLocation({ lat, lng })
    
    // Add loading marker
    let loadingMarker = null
    if (markersRef.current.AdvancedMarkerElement) {
      loadingMarker = addLoadingMarker({ lat, lng })
    }
    
    try {
      const result = await apiClient.searchParking(lat, lng)
      setParkingSpots((result.public_parking_results || []).slice(0, parkingLimit))
      // console.log('Got parking sign results:', result.parking_sign_results)
      setParkingSigns((result.parking_sign_results || []).slice(0, parkingLimit))
      
      // Center the map on the search location
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng })
      }
      
      // Track location search stat
      incrementStat('locationsSearched')
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch parking data.')
    } finally {
      // Remove loading marker
      if (loadingMarker) {
        loadingMarker.setMap(null)
      }
      setIsSearching(false)
      setSearchLocation(null)
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
        className="fixed top-4 left-4 z-40 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition"
      >
        <Menu className="w-6 h-6 text-gray-800" />
      </button>

      {/* My Location */}
      <button
        onClick={handleMyLocation}
        className="fixed bottom-32 right-4 z-40 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition"
      >
        <Crosshair className="w-6 h-6 text-gray-800" />
      </button>


      {/* Parking Indicators Toggle Button */}
      <button
        onClick={() => {
          const newValue = !showParkingPanel
          setShowParkingPanel(newValue)
          posthog.capture('parking_panel_toggled', {
            visible: newValue
          })
        }}
        className="fixed bottom-32 left-4 z-40 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
        title={showParkingPanel ? 'Hide Parking Controls' : 'Show Parking Controls'}
      >
        {showParkingPanel ? (
          <div className="w-5 h-5 text-gray-600">⚙️</div>
        ) : (
          <div className="w-5 h-5 text-gray-600">🔧</div>
        )}
      </button>

      {/* Parking Indicators Visibility Controls */}
      {showParkingPanel && (
        <div className="fixed bottom-32 left-20 z-40 bg-white rounded-2xl shadow-lg border border-gray-200 p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700 text-center">Parking Indicators</div>
          <div className="text-xs text-gray-500 text-center">Max: 20 total</div>
          
          {/* Parking Spots Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <span className="text-xs text-gray-600">Spots (P)</span>
            <button
              onClick={() => {
                const newValue = !showParkingSpots
                setShowParkingSpots(newValue)
                posthog.capture('parking_indicators_toggled', {
                  indicator_type: 'parking_spots',
                  visible: newValue
                })
              }}
              className={`w-8 h-4 rounded-full transition-colors ${
                showParkingSpots ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                showParkingSpots ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Parking Signs Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <span className="text-xs text-gray-600">Signs (S)</span>
            <button
              onClick={() => {
                const newValue = !showParkingSigns
                setShowParkingSigns(newValue)
                posthog.capture('parking_indicators_toggled', {
                  indicator_type: 'parking_signs',
                  visible: newValue
                })
              }}
              className={`w-8 h-4 rounded-full transition-colors ${
                showParkingSigns ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                showParkingSigns ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Limits Controls */}
          <div className="pt-2 border-t border-gray-200 space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <span className="text-xs text-gray-600">Parking Limit</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    const newLimit = Math.max(1, parkingLimit - 1)
                    setParkingLimit(newLimit)
                    posthog.capture('parking_limit_changed', {
                      new_limit: newLimit
                    })
                  }}
                  className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 text-xs font-bold"
                >
                  -
                </button>
                <span className={`text-xs font-semibold w-6 text-center ${
                  parkingLimit >= 20 ? 'text-green-600' : 'text-gray-700'
                }`}>
                  {parkingLimit}
                  {parkingLimit >= 20 && <span className="text-xs text-green-500">/20</span>}
                </span>
                <button
                  onClick={() => {
                    const newLimit = Math.min(20, parkingLimit + 1)
                    setParkingLimit(newLimit)
                    posthog.capture('parking_limit_changed', {
                      new_limit: newLimit
                    })
                  }}
                  disabled={parkingLimit >= 20}
                  className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                    parkingLimit >= 20 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-300 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Clear All Button */}
            <button
              onClick={() => {
                clearAllMarkers()
                posthog.capture('parking_indicators_cleared', {
                  action: 'clear_all_markers'
                })
              }}
              className="w-full py-1 px-2 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-lg flex flex-col items-center gap-2">
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