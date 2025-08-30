'use client'

import { useState } from 'react'
import { X, User, BarChart3, MapPin, FileText, Calendar } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useUserData } from '../hooks/useUserData'

export default function UserProfileModal({ isOpen, onClose }) {
  const { user } = useUser()
  const { userProfile } = useUserData()

  if (!isOpen || !user) return null

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    try {
      return timestamp.toDate().toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  const stats = userProfile?.stats || {
    signsAnalyzed: 0,
    locationsSearched: 0,
    pinsCreated: 0,
    ticketsReported: 0
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                {user.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {user.fullName || user.firstName || 'User'}
                </h2>
                <p className="text-white/80 text-sm">
                  {user.emailAddresses[0]?.emailAddress}
                </p>
                <p className="text-white/60 text-xs mt-1">
                  Member since {formatDate(userProfile?.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Usage Stats */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Usage Statistics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.signsAnalyzed}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Signs Analyzed
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.locationsSearched}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Locations Searched
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.pinsCreated}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Pins Created
                  </div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.ticketsReported}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tickets Reported
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Activity
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Last seen</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(userProfile?.lastSeen) || 'Now'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Total actions</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Object.values(stats).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}