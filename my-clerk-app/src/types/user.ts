/**
 * User Data Types
 * For Clerk authentication and Firestore user data
 */

import { User as ClerkUser } from '@clerk/nextjs/server';
import { Timestamp } from 'firebase/firestore';

// User Profile (stored in Firestore)
export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
  stats: UserStats;
  preferences: UserPreferences;
}

// User Statistics
export interface UserStats {
  signsAnalyzed: number;
  locationsSearched: number;
  pinsCreated: number;
  ticketsReported: number;
  totalSessions: number;
  lastSignAnalysis?: Timestamp;
  lastLocationSearch?: Timestamp;
}

// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    ticketReminders: boolean;
  };
  privacy: {
    shareLocation: boolean;
    saveHistory: boolean;
  };
  defaultLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

// Parking History Entry
export interface ParkingEntry {
  id: string;
  lat: number;
  lng: number;
  address?: string;
  savedAtISO: string;
  source: 'manual' | 'gps' | 'search';
  note?: string;
  photoUrl?: string;
}

// Last Parked Pointer
export interface LastParkedPointer {
  entryId: string;
  entryPath: string;
  denorm: {
    lat: number;
    lng: number;
    address?: string;
    savedAtISO: string;
  };
  updatedAtISO: string;
}

// Parking History Response
export interface ParkingHistoryResponse {
  items: ParkingEntry[];
  hasMore: boolean;
  lastDoc?: any; // Firestore DocumentSnapshot
}

// User Data Hook Return Type
export interface UseUserDataReturn {
  // Clerk auth data
  user: ClerkUser | null | undefined;
  isSignedIn: boolean | undefined;
  
  // Firestore user data
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Helper functions
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  incrementStat: (statName: keyof UserStats) => Promise<void>;
}

// Input types for user operations
export interface ParkingEntryInput {
  lat: number;
  lng: number;
  address?: string;
  source: 'manual' | 'gps' | 'search';
  note?: string;
}

export interface UserPreferencesUpdate {
  theme?: 'light' | 'dark' | 'system';
  notifications?: Partial<UserPreferences['notifications']>;
  privacy?: Partial<UserPreferences['privacy']>;
  defaultLocation?: UserPreferences['defaultLocation'];
}
