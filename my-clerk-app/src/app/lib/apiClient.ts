/**
 * API Client for CanIParkHere
 * Uses generated OpenAPI types for validation and consistency
 */

import type {
  ParkingCheckResponse,
  ParkingSearchResponse,
  LocationCheckResponse,
  FollowUpResponse,
  HealthCheckResponse
} from '@/types';
import { logger } from './logger';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

logger.debug('API Client initialized', { 
  baseUrl: API_BASE,
  environment: process.env.NODE_ENV,
  configuredUrl: process.env.NEXT_PUBLIC_API_URL 
});

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
    logger.debug('checkParkingImage called', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      datetime: datetime_str 
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('datetime_str', datetime_str);
    
    const url = new URL('/api/check-parking-image', API_BASE).toString();
    logger.debug('Making API request', { url });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      logger.debug('API response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API request failed', { status: response.status, error: errorText });
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.info('checkParkingImage successful', { sessionId: result.session_id });
      return result;
    } catch (error) {
      logger.error('checkParkingImage failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },



  async searchParking(latitude: number, longitude: number): Promise<ParkingSearchResponse> {
    logger.debug('searchParking called', { latitude, longitude });
    
    const url = '/api/search-parking';
    const fullUrl = new URL(url, API_BASE).toString();
    logger.debug('Making API request', { url: fullUrl });
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude
        })
      });
      
      logger.debug('API response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API request failed', { status: response.status, error: errorText });
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.info('searchParking successful', { 
        parkingSpots: result.public_parking_results?.length || 0,
        parkingSigns: result.parking_sign_results?.length || 0
      });
      return result;
    } catch (error) {
      logger.error('searchParking failed', { error: error instanceof Error ? error.message : String(error) });
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
    logger.debug('checkParkingLocation called', {
      latitude,
      longitude,
      datetime
    });
    
    const url = new URL('/api/check-parking-location', API_BASE).toString();
    logger.debug('Making API request', { url });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          datetime
        }),
      });
      
      logger.debug('API response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API request failed', { status: response.status, error: errorText });
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.info('checkParkingLocation successful', { canPark: result.canPark });
      return result;
    } catch (error) {
      logger.error('checkParkingLocation failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  /**
   * Ask follow-up questions about a previous parking check
   */
  async followUpQuestion(session_id: string, question: string): Promise<FollowUpResponse> {
    logger.debug('followUpQuestion called', { session_id, question });
    
    const url = new URL('/api/followup', API_BASE).toString();
    logger.debug('Making API request', { url });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, question }),
      });
      
      logger.debug('API response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API request failed', { status: response.status, error: errorText });
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.info('followUpQuestion successful');
      return result;
    } catch (error) {
      logger.error('followUpQuestion failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    logger.debug('healthCheck called');
    
    const url = new URL('/api/health', API_BASE).toString();
    logger.debug('Making API request', { url });
    
    try {
      const response = await fetch(url);
      
      logger.debug('API response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });
      
      if (!response.ok) {
        logger.error('Health check failed', { status: response.status });
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const result = await response.json();
      logger.info('healthCheck successful', { status: result.status });
      return result;
    } catch (error) {
      logger.error('healthCheck failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
};

/**
 * Helper function to handle API errors consistently
 */
export function formatApiError(error: Error): string {
  logger.debug('formatApiError called', { error: error.message });
  
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
