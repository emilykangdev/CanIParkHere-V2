/**
 * User Data Service
 * Clerk handles ONLY authentication, GCP/Firestore handles ALL data
 * User profiles, preferences, stats, community data - everything in Firestore
 */

import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'
import { getAuth, signInWithCustomToken } from 'firebase/auth'

/**
 * Create or update user profile in Firestore
 * @param {Object} clerkUser - Clerk user object (for basic info only)
 */
export async function syncUserProfile(clerkUser) {
  if (!clerkUser?.id) return null

  // Use the same API base as other backend calls
  const API_BASE = process.env.NODE_ENV === 'development' 
    ? process.env.NEXT_PUBLIC_API_URL 
    : 'http://localhost:8000';

  const res = await fetch(`${API_BASE}/get-firebase-token`, {
    method: "POST",
    headers: {Authorization: `Bearer ${clerkUser.id}`},
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get Firebase token: ${res.status} ${res.statusText}`);
  }
  
  const { customToken } = await res.json();

  const auth = getAuth();
  await signInWithCustomToken(auth, customToken);

  const userRef = doc(db, 'users', clerkUser.id)
  
  const userData = {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    fullName: clerkUser.fullName || null,
    imageUrl: clerkUser.imageUrl || null,
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  try {
    // Check if user exists
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      // Update existing user
      await updateDoc(userRef, userData)
    } else {
      // Create new user with all app data
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        preferences: {
          notifications: true,
          darkMode: false,
          emailUpdates: true
        },
        stats: {
          signsAnalyzed: 0,
          locationsSearched: 0,
          pinsCreated: 0,
          ticketsReported: 0
        }
      })
    }

    return userData
  } catch (error) {
    console.error('Error syncing user profile:', error)
    throw error
  }
}

/**
 * Get user profile from Firestore
 * @param {string} clerkUserId - Clerk user ID
 */
export async function getUserProfile(clerkUserId) {
  if (!clerkUserId) return null

  try {
    const userRef = doc(db, 'users', clerkUserId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

/**
 * Update user preferences
 * @param {string} clerkUserId - Clerk user ID
 * @param {Object} preferences - User preferences object
 */
export async function updateUserPreferences(clerkUserId, preferences) {
  if (!clerkUserId) return null

  try {
    const userRef = doc(db, 'users', clerkUserId)
    await updateDoc(userRef, {
      preferences,
      updatedAt: serverTimestamp()
    })
    return preferences
  } catch (error) {
    console.error('Error updating user preferences:', error)
    throw error
  }
}

/**
 * Increment user stats
 * @param {string} clerkUserId - Clerk user ID
 * @param {string} statType - Type of stat to increment
 */
export async function incrementUserStat(clerkUserId, statType) {
  if (!clerkUserId || !['signsAnalyzed', 'locationsSearched', 'pinsCreated', 'ticketsReported'].includes(statType)) return

  try {
    const userRef = doc(db, 'users', clerkUserId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const currentStats = userDoc.data().stats || {}
      const newValue = (currentStats[statType] || 0) + 1
      
      await updateDoc(userRef, {
        [`stats.${statType}`]: newValue,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error incrementing user stat:', error)
  }
}

/**
 * Save user's parking pin to shared community data
 * @param {string} clerkUserId - Clerk user ID
 * @param {Object} pinData - Pin data object
 */
export async function saveParkingPin(clerkUserId, pinData) {
  if (!clerkUserId) return null

  try {
    const pinRef = await addDoc(collection(db, 'parkingPins'), {
      userId: clerkUserId,
      ...pinData,
      createdAt: serverTimestamp()
    })
    
    return { id: pinRef.id, ...pinData }
  } catch (error) {
    console.error('Error saving parking pin:', error)
    throw error
  }
}

/**
 * Get parking pins in an area (community data)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Radius in kilometers
 */
export async function getParkingPinsInArea(lat, lng, radiusKm = 1) {
  try {
    // Simple bounding box query (for a more precise circle, you'd need geo libraries)
    const latDelta = radiusKm / 111 // Rough conversion: 1 degree ≈ 111km
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
    
    const q = query(
      collection(db, 'parkingPins'),
      where('lat', '>=', lat - latDelta),
      where('lat', '<=', lat + latDelta),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    
    const querySnapshot = await getDocs(q)
    const pins = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Further filter by longitude and actual distance if needed
      if (data.lng >= lng - lngDelta && data.lng <= lng + lngDelta) {
        pins.push({ id: doc.id, ...data })
      }
    })
    
    return pins
  } catch (error) {
    console.error('Error getting parking pins:', error)
    throw error
  }
}

/**
 * Save parking ticket report (community data)
 * @param {string} clerkUserId - Clerk user ID
 * @param {Object} ticketData - Ticket data object
 */
export async function saveParkingTicket(clerkUserId, ticketData) {
  if (!clerkUserId) return null

  try {
    const ticketRef = await addDoc(collection(db, 'parkingTickets'), {
      userId: clerkUserId,
      ...ticketData,
      createdAt: serverTimestamp()
    })
    
    return { id: ticketRef.id, ...ticketData }
  } catch (error) {
    console.error('Error saving parking ticket:', error)
    throw error
  }
}

/**
 * Get user's parking tickets
 * @param {string} clerkUserId - Clerk user ID
 */
export async function getUserParkingTickets(clerkUserId) {
  if (!clerkUserId) return []

  try {
    const q = query(
      collection(db, 'parkingTickets'),
      where('userId', '==', clerkUserId),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const tickets = []
    
    querySnapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() })
    })
    
    return tickets
  } catch (error) {
    console.error('Error getting user parking tickets:', error)
    throw error
  }
}

/**
 * Save shared parking spot data (community reports)
 * @param {string} clerkUserId - Clerk user ID  
 * @param {Object} spotData - Parking spot data
 */
export async function saveSharedParkingSpot(clerkUserId, spotData) {
  if (!clerkUserId) return null

  try {
    const spotRef = await addDoc(collection(db, 'sharedParkingSpots'), {
      reportedBy: clerkUserId,
      ...spotData,
      createdAt: serverTimestamp()
    })
    
    return { id: spotRef.id, ...spotData }
  } catch (error) {
    console.error('Error saving shared parking spot:', error)
    throw error
  }
}