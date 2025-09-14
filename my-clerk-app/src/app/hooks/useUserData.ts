/**
 * Hook for managing user data sync between Clerk auth and GCP Firestore
 * Clerk = Authentication only, Firestore = All user data
 */

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { syncUserProfile, getUserProfile, updateUserPreferences, incrementUserStat } from '../lib/userDataService'
import type { UserProfile, UserPreferences, UserStats, UseUserDataReturn } from '@/types'
import { User as ClerkUser } from '@clerk/nextjs/server'

export function useUserData(): UseUserDataReturn {
  const { user, isSignedIn } = useUser()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Sync user profile when Clerk user changes
  useEffect(() => {
    async function syncUser() {
      if (isSignedIn && user) {
        try {
          setLoading(true)
          await syncUserProfile(user)
          const profile = await getUserProfile(user.id)
          setUserProfile(profile as UserProfile | null)
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
  const updatePreferences = async (preferences: Partial<UserPreferences>): Promise<UserPreferences | null> => {
    if (!user?.id) return null

    try {
      const updatedPrefs = await updateUserPreferences(user.id, preferences)
      setUserProfile(prev => prev && updatedPrefs ? { ...prev, preferences: updatedPrefs as unknown as UserPreferences } : prev)
      return updatedPrefs as unknown as UserPreferences | null
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    }
  }

  const incrementStat = async (statType: keyof UserStats): Promise<void> => {
    if (!user?.id) return

    try {
      await incrementUserStat(user.id, statType)
      // Refresh profile to get updated stats
      const updatedProfile = await getUserProfile(user.id)
      setUserProfile(updatedProfile as UserProfile | null)
    } catch (error) {
      console.error('Error incrementing stat:', error)
    }
  }

  return {
    // Clerk auth data
    user: user as ClerkUser | null | undefined,
    isSignedIn,
    
    // Firestore user data
    userProfile,
    loading,
    
    // Helper functions
    updatePreferences: async (preferences: Partial<UserPreferences>) => {
      await updatePreferences(preferences);
    },
    incrementStat
  }
}