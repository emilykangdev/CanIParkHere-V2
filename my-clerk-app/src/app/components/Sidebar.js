'use client'

import { useState } from 'react'
import {
  X,
  User,
  LogOut,
  FileText,
  Map,
  ChevronDown,
  ChevronRight,
  Moon,
  Sun,
  Receipt,
  MapPinned,
  MessageCircle
} from 'lucide-react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useTheme } from '../contexts/ThemeContext'
import { useUserData } from '../hooks/useUserData'
import TicketTracker from './TicketTracker'
import UserProfileModal from './UserProfileModal'
// import SavedMapPinsModal from './SavedMapPinsModal'

export default function Sidebar({ isOpen, onClose, currentView, onViewChange }) {
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const { userProfile } = useUserData()
  const [showTerms, setShowTerms] = useState(false)
  const [showTicketTracker, setShowTicketTracker] = useState(false)
  const [showMapPins, setShowMapPins] = useState(false) // ✅ Defined here
  const [showUserProfile, setShowUserProfile] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      onClose()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        style={{ touchAction: 'none' }}
      />

      {/* Sidebar */}
      <div
        className="fixed inset-y-0 left-0 w-full max-w-[100vw] sm:max-w-[85vw] md:max-w-[320px] 
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-[60] 
        border-r border-white/20 dark:border-gray-700"
        style={{ touchAction: 'auto' }}
      >
        <div className="flex flex-col h-full overflow-hidden relative">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-4 flex items-center justify-between text-white shadow-lg relative z-10">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative z-20">
            
            {/* View Navigation */}
            <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
              <div className="p-3">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Navigation</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onViewChange('map')
                      onClose()
                    }}
                    className={`flex items-center gap-3 w-full text-left p-2 rounded-lg ${
                      currentView === 'map' 
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-white/30 dark:hover:bg-gray-700/50 text-black dark:text-white'
                    }`}
                  >
                    <Map className="w-4 h-4" />
                    <span className="font-medium">Map View</span>
                  </button>
                  <button
                    onClick={() => {
                      onViewChange('chat')
                      onClose()
                    }}
                    className={`flex items-center gap-3 w-full text-left p-2 rounded-lg ${
                      currentView === 'chat' 
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-white/30 dark:hover:bg-gray-700/50 text-black dark:text-white'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">Chat Assistant</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Onboarding Section - Show for all users */}
            <div className="rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 dark:from-green-900/30 dark:to-emerald-900/30 backdrop-blur-md border border-green-200/30 dark:border-green-700/30">
              <div className="p-3">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">🚀 Getting Started</h3>
                <div className="space-y-2 text-xs text-black dark:text-white">
                  <div className="flex items-start gap-2">
                    <span className="text-green-700 dark:text-green-600">1.</span>
                    <span>Use the map to find parking spots and signs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-700 dark:text-green-600">2.</span>
                    <span>Click on markers to see parking details</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-700 dark:text-green-600">3.</span>
                    <span>Ask the AI assistant about parking rules</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-700 dark:text-green-600">4.</span>
                    <span>Sign in to save your searches and track stats</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign In Section - Only show when not signed in */}
            {!isSignedIn && (
              <div className="rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">✨ Enhanced Features</h3>
                  <div className="space-y-2 text-xs text-blue-600 dark:text-blue-400 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Track your parking searches</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Analyze parking sign patterns</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Save favorite parking locations</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>View parking statistics</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose()
                      // Redirect to sign-in page
                      window.location.href = '/sign-in'
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </button>
                </div>
              </div>
            )}
            {/* User Profile Section */}
            {isSignedIn && user && (
              <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="w-full p-3 hover:bg-white/30 dark:hover:bg-gray-700/50 rounded-lg text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/30 dark:bg-gray-800/50 rounded-full flex items-center justify-center backdrop-blur-md overflow-hidden">
                      {user.imageUrl ? (
                        <img 
                          src={user.imageUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-black dark:text-white truncate">
                        {user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0]}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {user.emailAddresses[0]?.emailAddress}
                      </div>
                      {userProfile?.stats && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Signs: {userProfile.stats.signsAnalyzed} • Searches: {userProfile.stats.locationsSearched}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-red-600 hover:bg-red-500/10 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}

            {/* Dark Mode Toggle */}
            {/* <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 w-full text-left p-3 hover:bg-white/30 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
                <span className="font-medium text-black dark:text-white flex-1">
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
            </div> */}

            {/* Parking Tickets Tracker */}
            {/* <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
              <button
                onClick={() => setShowTicketTracker(true)}
                className="flex items-center gap-3 w-full text-left p-3 hover:bg-white/30 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
              >
                <Receipt className="w-5 h-5 text-red-500" />
                <span className="font-medium text-black dark:text-white flex-1">
                  Parking Tickets
                </span>
              </button>
            </div> */}

            {/* My Map Pins */}
            {/* <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
              <button
                onClick={() => setShowMapPins(true)}
                className="flex items-center gap-3 w-full text-left p-3 hover:bg-white/30 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
              >
                <MapPinned className="w-5 h-5 text-green-500" />
                <span className="font-medium text-black dark:text-white flex-1">
                  My Map Pins
                </span>
              </button>
            </div> */}

            {/* Terms & Conditions */}
            <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="flex items-center gap-3 w-full text-left p-3 hover:bg-white/30 dark:hover:bg-gray-700/50 rounded-lg"
              >
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="font-medium flex-1 text-black dark:text-white">
                  Terms & Conditions
                </span>
                {showTerms ? (
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
              </button>
              {showTerms && (
                <div className="px-3 pb-3">
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white/30 dark:bg-gray-800/50 p-3 rounded-lg backdrop-blur-md">
                    <p className="font-semibold mb-2">Disclaimer:</p>
                    <p className="mb-3">
                      CanIParkHere uses AI to help interpret parking signs, and data from 
                      the City of Seattle to help you find parking spots. 
                      It isn&apos;t guaranteed to be accurate.
                    </p>
                    <p>
                      We aren&apos;t liable for
                      tickets or fines. By using this app, you agree to these
                      terms.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Seattle Maps */}
            <div className="rounded-lg bg-white/20 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700">
              <button className="flex items-center gap-3 w-full text-left p-3 hover:bg-white/30 dark:hover:bg-gray-700/50 transition-colors rounded-lg">
                <Map className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="font-medium text-black dark:text-white">
                  Seattle Parking Maps
                </span>
              </button>
              <div className="px-3 pb-3">
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <a
                    href="https://seattlecitygis.maps.arcgis.com/apps/webappviewer/index.html?id=5814e3f6c7054a40a9b4d175dcbf294b"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-blue-500/20 dark:bg-blue-900/30 hover:bg-blue-500/30 dark:hover:bg-blue-900/50 rounded text-blue-700 dark:text-blue-300 transition-colors"
                  >
                    🅿️ Seattle Paid Parking Areas
                  </a>
                  <a
                    href="https://experience.arcgis.com/experience/7d67dc9c92d74e51a87df8dd4eeba9d9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-blue-500/20 dark:bg-blue-900/30 hover:bg-blue-500/30 dark:hover:bg-blue-900/50 rounded text-blue"
                  >
                    🚫 Seattle Restricted Parking Zones
                  </a>
                  <a
                    href="https://www.seattle.gov/transportation/permits-and-services/interactive-maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-blue-500/20 dark:bg-blue-900/30 hover:bg-blue-500/30 dark:hover:bg-blue-900/50 rounded text-blue-700 dark:text-blue-300 transition-colors"
                  >
                    ✅ All Seattle Maps
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/20 dark:border-gray-700 text-center text-xs text-gray-700 dark:text-gray-400 backdrop-blur-md">
            CanIParkHere v1.0
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
      {/* <TicketTracker
        isOpen={showTicketTracker}
        onClose={() => setShowTicketTracker(false)}
      /> */}
      {/* <MapPinsModal
        isOpen={showMapPins}
        onClose={() => setShowMapPins(false)}
      /> */}
    </>
  )
}