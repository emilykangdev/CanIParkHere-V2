'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Camera, MapPin, Send, Loader2, Menu } from 'lucide-react'
import { compressImage } from '../lib/imageUtils'
import { apiClient, formatApiError } from '../lib/apiClient'
import { useUserData } from '../hooks/useUserData'
import type { ChatMessage, MessageData } from '@/types'
import { MessageType, MessageDataType } from '@/types'
import posthog from 'posthog-js'

interface ParkingChatAppProps {
  setShowSidebar: (show: boolean) => void;
}

export default function ParkingChatApp({ setShowSidebar }: ParkingChatAppProps) {
  const { incrementStat } = useUserData()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      type: MessageType.BOT,
      data: { answer: '🅿️ Welcome to CanIParkHere! Upload a parking sign photo or use your location.' },
      timestamp: null
    }
  ])
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const followUpInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages])
  useEffect(() => {
    setIsMounted(true)
    setMessages(prev => prev.map(msg => msg.timestamp === null ? { ...msg, timestamp: new Date() } : msg))
  }, [])

  const addMessage = (type: MessageType, content?: string, data?: MessageData) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      content,
      data,
      timestamp: new Date()
    }])
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setIsLoading(true)
    let compressionResult = null
    try {
      compressionResult = await compressImage(file)
      const { file: compressedFile, imageData, originalSize, compressedSize, dimensions, compressionRatio, success } = compressionResult
      addMessage(MessageType.USER, undefined, { type: MessageDataType.USER_IMAGE, originalSize, compressedSize, imageData, dimensions, compressionRatio, success })
      
      // Add immediate feedback
      addMessage(MessageType.BOT, '🔍 Analyzing parking sign...')
      
      const result = await apiClient.checkParkingImage(compressedFile)
              // console.log('API Response:', result) // Debug logging
      
      if (result.session_id) setCurrentSessionId(result.session_id)
      
      // Handle response with fallback
      const messageType = result.messageType || MessageType.BOT
      const responseMessage = result.reason || 'Analysis complete!'

      addMessage(messageType as MessageType, undefined, { ...result, answer: responseMessage })
      
      // Track sign analysis stat
      incrementStat('signsAnalyzed')
    } catch (error) {
      console.error('Image upload error:', error)
      addMessage(MessageType.ERROR, undefined, {
        type: MessageDataType.ERROR_WITH_PREVIEW,
        imageData: compressionResult?.imageData || null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationRequest = () => {
    if (!navigator.geolocation) return addMessage(MessageType.BOT, '❌ Geolocation not supported.')
    addMessage(MessageType.USER, '📍 Requesting location...')
    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        addMessage(MessageType.USER, `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        const result = await apiClient.checkParkingLocation(latitude, longitude)
        setIsLoading(false)
        addMessage(MessageType.PARKING, undefined, result as unknown as MessageData)
      },
      async () => {
        const fallbackLat = 47.669253, fallbackLng = -122.311622
        addMessage(MessageType.USER, `📍 Using fallback: ${fallbackLat}, ${fallbackLng}`)
        const result = await apiClient.checkParkingLocation(fallbackLat, fallbackLng)
        setIsLoading(false)
        addMessage(MessageType.PARKING, undefined, result as unknown as MessageData)
      }
    )
  }

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const question = followUpInputRef.current?.value?.trim()
    if (!question || !currentSessionId) return
    addMessage(MessageType.USER, `❓ ${question}`)
    setIsLoading(true)
    try {
      const result = await apiClient.followUpQuestion(currentSessionId, question)
      addMessage(MessageType.FOLLOWUP, undefined, { answer: result.answer })
      if (followUpInputRef.current) {
        followUpInputRef.current.value = ''
      }
    } catch (error) {
      addMessage(MessageType.ERROR, `❌ ${formatApiError(error instanceof Error ? error : new Error('Unknown error'))}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (ts: Date | null) => ts?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900">
      
      {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-200 to-blue-300 p-4 flex items-center shadow-md z-10">
        <button
            onClick={() => {
              setShowSidebar(true)
              posthog.capture('sidebar_opened', { source: 'chat_view' })
            }}
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
{(() => {
                  if (typeof m.data === 'string') return m.data;
                  if (m.data?.answer && typeof m.data.answer === 'string') return m.data.answer;
                  if (m.data?.message && typeof m.data.message === 'string') return m.data.message;
                  return '';
                })()}
                {m.data?.type === MessageDataType.USER_IMAGE && (
                  <div className="mt-2">
                    <div className="text-sm mb-2">
                      {(() => {
                        const data = m.data as MessageData & {
                          dimensions?: { width: number, height: number },
                          success?: boolean,
                          originalSize?: number,
                          compressedSize?: number,
                          compressionRatio?: number
                        };
                        return (
                          <>
                            📸 Image uploaded ({data?.dimensions?.width}x{data?.dimensions?.height})
                            {data?.success && (
                              <div className="text-xs opacity-70">
                                Compressed: {((data?.originalSize || 0) / 1024).toFixed(1)}KB to {((data?.compressedSize || 0) / 1024).toFixed(1)}KB
                                ({((data?.compressionRatio || 0) * 100).toFixed(0)}% reduction)
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <Image
                      src={(m.data as MessageData & { imageData?: string })?.imageData || ''}
                      alt="Uploaded image"
                      width={320}
                      height={128}
                      className="rounded-lg border"
                      unoptimized
                    />
                  </div>
                )}
                {(m.data as MessageData & { imageData?: string })?.imageData && m.data?.type !== MessageDataType.USER_IMAGE && (
                  <div className="mt-2">
                    <Image
                      src={(m.data as MessageData & { imageData?: string })?.imageData || ''}
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
