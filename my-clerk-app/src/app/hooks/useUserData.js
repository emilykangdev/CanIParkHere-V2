/**
 * Hook for managing user data sync between Clerk auth and GCP Firestore
 * Clerk = Authentication only, Firestore = All user data
 */

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { syncUserProfile, getUserProfile, updateUserPreferences, incrementUserStat } from '../lib/userDataService'

export function useUserData() {
  const { user, isSignedIn } = useUser()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sync user profile when Clerk user changes
  useEffect(() => {
    async function syncUser() {
      if (isSignedIn && user) {
        try {
          setLoading(true)
          await syncUserProfile(user)
          const profile = await getUserProfile(user.id)
          setUserProfile(profile)
        } catch (error) {
          console.error('Error syncing user:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    }

    syncUser()
  }, [isSignedIn, user])

  // Helper functions
  const updatePreferences = async (preferences) => {
    if (!user?.id) return null
    
    try {
      const updatedPrefs = await updateUserPreferences(user.id, preferences)
      setUserProfile(prev => prev ? { ...prev, preferences: updatedPrefs } : null)
      return updatedPrefs
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    }
  }

  const incrementStat = async (statType) => {
    if (!user?.id) return
    
    try {
      await incrementUserStat(user.id, statType)
      // Refresh profile to get updated stats
      const updatedProfile = await getUserProfile(user.id)
      setUserProfile(updatedProfile)
    } catch (error) {
      console.error('Error incrementing stat:', error)
    }
  }

  return {
    // Clerk auth data
    user,
    isSignedIn,
    
    // Firestore user data
    userProfile,
    loading,
    
    // Helper functions
    updatePreferences,
    incrementStat
  }
}