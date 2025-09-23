/**
 * API Types - matches backend Pydantic models
 * These types should stay in sync with backend/message_types.py
 */

// Enums
export enum ParkingCategory {
  UNRESTRICTED = "Unrestricted Parking",
  NO_PARKING = "No Parking Allowed",
  RESTRICTED_ZONE = "Restricted Parking Zone",
  PAID_PARKING = "Paid Parking",
  TIME_LIMITED = "Time Limited Parking",
  CARPOOL = "Carpool Parking"
}

export type ParkingPermission = "true" | "false" | "uncertain";
export type SignDetection = "true" | "false";

// Core API Response Models
export interface ParkingCheckResponse {
  messageType: string;
  session_id: string;
  isParkingSignFound: SignDetection;
  canPark: ParkingPermission;
  reason: string;
  rules: string;
  parsedText: string;
  advice: string;
  processing_method: string;
}

export interface ParkingSearchResponse {
  session_id: string;
  parking_sign_results: ParkingSignResult[];
  public_parking_results: PublicParkingResult[];
  processing_method: string;
}

export interface LocationCheckResponse {
  canPark: boolean;
  message: string;
  processing_method: string;
}

export interface FollowUpResponse {
  answer: string;
}

// Request Models
export interface ParkingSearchRequest {
  latitude: number;
  longitude: number;
}

export interface FollowUpRequest {
  session_id: string;
  question: string;
}

// Parking Data Models
export interface ParkingSignResult {
  id: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
  rules?: string;
  distance_m?: number;
}

export interface PublicParkingResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  capacity?: number;
  available_spots?: number;
  hourly_rate?: number;
  distance_m?: number;
  facility_type?: string;
}

// Health Check Response
export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  services?: {
    gpt4o: string;
    llm: string;
    parser: string;
    s3: string;
  };
  timestamp: string;
  error?: string;
}

// Firebase Token Response
export interface FirebaseTokenResponse {
  customToken: string;
}

// Error Response
export interface ApiErrorResponse {
  detail: string;
  status_code?: number;
}

// Generic API Response wrapper
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ApiErrorResponse;
};
