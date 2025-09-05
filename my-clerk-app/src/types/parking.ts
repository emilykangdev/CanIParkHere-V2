/**
 * Parking-specific Types
 * For parking signs, locations, and map data
 */

// Message Types for Chat Interface
export enum MessageType {
  BOT = 'bot',
  USER = 'user',
  PARKING = 'parking',
  FOLLOWUP = 'followup',
  ERROR = 'error'
}

export enum MessageDataType {
  COMPRESSION = 'compression',
  ERROR_WITH_PREVIEW = 'error_with_preview',
  PARKING_RESULT = 'parking_result',
  LOCATION_RESULT = 'location_result'
}

// Chat Message Structure
export interface ChatMessage {
  id: string;
  type: MessageType;
  content?: string | undefined;
  data?: MessageData | undefined;
  timestamp: Date | null;
}

export interface MessageData {
  type?: MessageDataType;
  answer?: string;
  error?: string;
  preview?: string;
  result?: any;
  [key: string]: any;
}

// Map-related Types
export interface MapLocation {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Parking Sign Data
export interface ParkingSign {
  id: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
  rules?: string;
  signType?: string;
  installDate?: string;
  lastUpdated?: string;
  distance_m?: number;
}

// Public Parking Facility
export interface PublicParkingFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  capacity?: number;
  available_spots?: number;
  hourly_rate?: number;
  daily_rate?: number;
  facility_type: 'garage' | 'lot' | 'street';
  hours?: string;
  payment_methods?: string[];
  distance_m?: number;
}

// Search Results
export interface ParkingSearchResults {
  signs: ParkingSign[];
  facilities: PublicParkingFacility[];
  center: MapLocation;
  radius: number;
  timestamp: Date;
}

// Map Marker Types
export interface MapMarker {
  id: string;
  position: MapLocation;
  type: 'sign' | 'facility' | 'user_location' | 'saved_spot';
  title?: string;
  description?: string;
  icon?: string;
  data?: any;
}

// Info Window Content
export interface InfoWindowContent {
  title: string;
  description: string;
  actions?: InfoWindowAction[];
  metadata?: Record<string, any>;
}

export interface InfoWindowAction {
  label: string;
  action: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

// Geocoding Types
export interface GeocodeResult {
  address: string;
  location: MapLocation;
  placeId?: string;
  types?: string[];
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: MapLocation;
  rating?: number;
  types?: string[];
}

// Image Processing Types
export interface ImageCompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker?: boolean;
  quality?: number;
}

export interface ImageProcessingResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  file: File;
}

// Parking Analysis Types
export interface ParkingAnalysisRequest {
  image: File;
  location?: MapLocation;
  datetime?: string;
}

export interface ParkingAnalysisResult {
  canPark: boolean;
  confidence: number;
  reason: string;
  rules: string;
  restrictions?: string[];
  timeRestrictions?: TimeRestriction[];
  paymentRequired?: boolean;
  maxDuration?: string;
}

export interface TimeRestriction {
  days: string[];
  startTime: string;
  endTime: string;
  restriction: string;
}

// Toast/Notification Types
export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
