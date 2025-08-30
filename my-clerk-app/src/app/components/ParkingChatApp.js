'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Camera, MapPin, Send, Loader2, Menu } from 'lucide-react'
import { compressImage } from '../lib/imageUtils'
import { apiClient, formatApiError } from '../lib/apiClient'
import { useUserData } from '../hooks/useUserData'


export const MessageType = Object.freeze({
  BOT: 'bot',
  USER: 'user',
  PARKING: 'parking',
  FOLLOWUP: 'followup',
  ERROR: 'error'
})

export default function ParkingChatApp({ setShowSidebar }) {
  const { incrementStat } = useUserData()
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      type: 'bot',
      data: { answer: '🅿️ Welcome to CanIParkHere! Upload a parking sign photo or use your location.' },
      timestamp: null
    }
  ])
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const followUpInputRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages])
  useEffect(() => {
    setIsMounted(true)
    setMessages(prev => prev.map(msg => msg.timestamp === null ? { ...msg, timestamp: new Date() } : msg))
  }, [])

  const addMessage = (type, data = null) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), type, data, timestamp: new Date() }])
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setIsLoading(true)
    let compressionResult = null
    try {
      compressionResult = await compressImage(file)
      const { file: compressedFile, imageData, originalSize, compressedSize, dimensions, compressionRatio, success } = compressionResult
      addMessage('user', { type: 'user_image', originalSize, compressedSize, imageData, dimensions, compressionRatio, success })
      
      // Add immediate feedback
      addMessage('bot', '🔍 Analyzing parking sign...')
      
      const result = await apiClient.checkParkingImage(compressedFile)
      console.log('API Response:', result) // Debug logging
      
      if (result.session_id) setCurrentSessionId(result.session_id)
      
      // Handle response with fallback
      const messageType = result.messageType || 'bot'
      const responseMessage = result.answer || result.message || result.reason || 'Analysis complete!'
      
      addMessage(messageType, { ...result, answer: responseMessage })
      
      // Track sign analysis stat
      incrementStat('signsAnalyzed')
    } catch (error) {
      console.error('Image upload error:', error)
      addMessage('error', { type: 'error_with_preview', imageData: compressionResult?.imageData || null, error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationRequest = () => {
    if (!navigator.geolocation) return addMessage('bot', '❌ Geolocation not supported.')
    addMessage('user', '📍 Requesting location...')
    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        addMessage('user', `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        const result = await apiClient.checkParkingLocation(latitude, longitude)
        setIsLoading(false)
        addMessage(MessageType.PARKING, result)
      },
      async () => {
        const fallbackLat = 47.669253, fallbackLng = -122.311622
        addMessage('user', `📍 Using fallback: ${fallbackLat}, ${fallbackLng}`)
        const result = await apiClient.checkParkingLocation(fallbackLat, fallbackLng)
        setIsLoading(false)
        addMessage(MessageType.PARKING, result)
      }
    )
  }

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault()
    const question = followUpInputRef.current?.value?.trim()
    if (!question || !currentSessionId) return
    addMessage('user', `❓ ${question}`)
    setIsLoading(true)
    try {
      const result = await apiClient.followUpQuestion(currentSessionId, question)
      addMessage('followup', { answer: result.answer })
      followUpInputRef.current.value = ''
    } catch (error) {
      addMessage('error', `❌ ${formatApiError(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (ts) => ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900">
      
      {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-200 to-blue-300 p-4 flex items-center shadow-md z-10">
        <button
            onClick={() => setShowSidebar(true)}
            className="p-2 rounded-full bg-white/50 hover:bg-white/70 transition"
        >
            <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
            <div className="text-2xl">🅿️</div>
            <div>
            <h1 className="font-bold text-lg">CanIParkHere</h1>
            <p className="text-sm opacity-80">Parking Assistant</p>
            </div>
        </div>
        <div className="w-10"></div> {/* Spacer to balance the layout */}
        </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/60">
        {messages.map((m) => {
          const isUser = m.type === 'user'
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 shadow border ${
                  isUser
                    ? 'bg-blue-100 text-gray-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.data?.answer || m.data?.message || (typeof m.data === 'string' ? m.data : '')}
                {m.data?.type === 'user_image' && (
                  <div className="mt-2">
                    <div className="text-sm mb-2">
                      📸 Image uploaded ({m.data.dimensions?.width}x{m.data.dimensions?.height})
                      {m.data.success && (
                        <div className="text-xs opacity-70">
                          Compressed: {(m.data.originalSize / 1024).toFixed(1)}KB → {(m.data.compressedSize / 1024).toFixed(1)}KB 
                          ({(m.data.compressionRatio * 100).toFixed(0)}% reduction)
                        </div>
                      )}
                    </div>
                    <Image
                      src={m.data.imageData}
                      alt="Uploaded image"
                      width={320}
                      height={128}
                      className="rounded-lg border"
                      unoptimized
                    />
                  </div>
                )}
                {m.data?.imageData && m.data?.type !== 'user_image' && (
                  <div className="mt-2">
                    <Image
                      src={m.data.imageData}
                      alt="Preview"
                      width={320}
                      height={128}
                      className="rounded-lg border"
                      unoptimized
                    />
                  </div>
                )}
                <div className="text-xs opacity-60 mt-1">
                  {isMounted && m.timestamp ? formatTime(m.timestamp) : '--:--'}
                </div>
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2 border">
              <Loader2 className="w-4 h-4 animate-spin" /> <span>Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`flex-1 text-white rounded-full py-3 px-4 shadow transition flex items-center justify-center gap-2 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            <Camera className="w-5 h-5" /> {isLoading ? 'Processing...' : 'Take Photo'}
          </button>
          <button
            onClick={handleLocationRequest}
            disabled={isLoading}
            className="flex-1 bg-green-500 text-white rounded-full py-3 px-4 shadow hover:bg-green-600 transition flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5" /> Use Location
          </button>
        </div>
        {currentSessionId && (
          <form onSubmit={handleFollowUpSubmit} className="mb-3">
            <div className="flex gap-2">
              <input
                ref={followUpInputRef}
                type="text"
                placeholder="Ask a follow-up..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 rounded-full bg-white border text-gray-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 text-white rounded-full px-4 py-2 shadow hover:bg-blue-600 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Ask
              </button>
            </div>
          </form>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

    </div>
  )
}