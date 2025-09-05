/**
 * API Client for CanIParkHere
 * Uses generated OpenAPI types for validation and consistency
 */

import type {
  ParkingCheckResponse,
  ParkingSearchResponse,
  LocationCheckResponse,
  FollowUpResponse,
  FollowUpRequest,
  HealthCheckResponse,
  FirebaseTokenResponse,
  ApiErrorResponse
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

console.log('🔧 API Client initialized with base URL:', API_BASE);
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🔧 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

/**
 * Main API client with typed responses
 * All functions return objects matching the OpenAPI schema
 */
export const apiClient = {
  /**
   * Check parking rules from uploaded image
   */
  async checkParkingImage(
    file: File,
    datetime_str: string = new Date().toISOString()
  ): Promise<ParkingCheckResponse> {
    console.log('📸 checkParkingImage called with:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      datetime: datetime_str 
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('datetime_str', datetime_str);
    
    const url = new URL('/api/check-parking-image', API_BASE).toString();
    console.log('🌐 Making request to:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', { status: response.status, error: errorText });
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ checkParkingImage successful:', result);
      return result;
    } catch (error) {
      console.error('💥 checkParkingImage failed:', error);
      throw error;
    }
  },



  async searchParking(latitude: number, longitude: number): Promise<ParkingSearchResponse> {
    console.log('🔍 searchParking called with:', { latitude, longitude });
    
    const url = '/api/search-parking';
    const fullUrl = new URL(url, API_BASE).toString();
    console.log('🌐 Making request to:', fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude
        })
      });
      
      console.log('📡 Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', { status: response.status, error: errorText });
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ searchParking successful:', result);
      return result;
    } catch (error) {
      console.error('💥 searchParking failed:', error);
      throw error;
    }
  },

  /**
   * Check parking rules by location coordinates
   */
  async checkParkingLocation(
    latitude: number,
    longitude: number,
    datetime: string = new Date().toISOString()
  ): Promise<LocationCheckResponse> {
    console.log('📍 checkParkingLocation called with:', { 
      latitude, 
      longitude, 
      datetime,
      parsedLat: parseFloat(latitude),
      parsedLng: parseFloat(longitude)
    });
    
    const url = new URL('/api/check-parking-location', API_BASE).toString();
    console.log('🌐 Making request to:', url);
    console.log('📤 Request payload:', { 
      latitude: parseFloat(latitude), 
      longitude: parseFloat(longitude), 
      datetime 
    });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          latitude: parseFloat(latitude), 
          longitude: parseFloat(longitude), 
          datetime 
        }),
      });
      
      console.log('📡 Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', { status: response.status, error: errorText });
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ checkParkingLocation successful:', result);
      return result;
    } catch (error) {
      console.error('💥 checkParkingLocation failed:', error);
      throw error;
    }
  },

  /**
   * Ask follow-up questions about a previous parking check
   */
  async followUpQuestion(session_id: string, question: string): Promise<FollowUpResponse> {
    console.log('❓ followUpQuestion called with:', { session_id, question });
    
    const url = new URL('/api/followup', API_BASE).toString();
    console.log('🌐 Making request to:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, question }),
      });
      
      console.log('📡 Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', { status: response.status, error: errorText });
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ followUpQuestion successful:', result);
      return result;
    } catch (error) {
      console.error('💥 followUpQuestion failed:', error);
      throw error;
    }
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    console.log('🏥 healthCheck called');
    
    const url = new URL('/api/health', API_BASE).toString();
    console.log('🌐 Making request to:', url);
    
    try {
      const response = await fetch(url);
      
      console.log('📡 Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });
      
      if (!response.ok) {
        console.error('❌ Health check failed:', { status: response.status });
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ healthCheck successful:', result);
      return result;
    } catch (error) {
      console.error('💥 healthCheck failed:', error);
      throw error;
    }
  }
};

/**
 * Helper function to handle API errors consistently
 */
export function formatApiError(error: Error): string {
  console.log('🔧 formatApiError called with:', error);
  
  if (error.message.includes('503')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  if (error.message.includes('400')) {
    return 'Invalid request. Please check your input and try again.';
  }
  if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }
  return error.message || 'An unexpected error occurred.';
}