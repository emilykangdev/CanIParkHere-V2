/**
 * Component Props Types
 * Type definitions for React component props
 */

import { ReactNode } from 'react';
import { ChatMessage, MapLocation, ParkingSign, PublicParkingFacility } from './parking';
import { UserProfile } from './user';

// Layout Components
export interface RootLayoutProps {
  children: ReactNode;
}

export interface HeaderProps {
  showMenu?: boolean;
  onMenuClick?: () => void;
}

// Main App Components
export interface HomePageProps {
  // No props for main page component
}

export interface ParkingChatAppProps {
  setShowSidebar: (show: boolean) => void;
}

export interface ParkingMapViewProps {
  setShowSidebar: (show: boolean) => void;
}

// Sidebar Component
export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'map' | 'chat';
  onViewChange: (view: 'map' | 'chat') => void;
}

// Modal Components
export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TicketTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Theme Components
export interface ThemeProviderProps {
  children: ReactNode;
}

export interface ThemeToggleProps {
  // No props - uses context
}

// Parking History Component
export interface ParkingHistoryProps {
  // No props - uses hooks internally
}

// Toast Components
export interface SaveParkingToastProps {
  location: MapLocation;
  onSave: (location: MapLocation) => void;
  onDismiss: () => void;
}

// Map-related Components
export interface MapMarkerProps {
  position: MapLocation;
  title?: string;
  onClick?: () => void;
  icon?: string;
  zIndex?: number;
}

export interface InfoWindowProps {
  position: MapLocation;
  content: string | ReactNode;
  onClose?: () => void;
  maxWidth?: number;
}

// Chat Components
export interface MessageProps {
  message: ChatMessage;
  isLast?: boolean;
}

export interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onSendImage: (file: File) => void;
  onSendLocation: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ChatHistoryProps {
  messages: ChatMessage[];
  loading?: boolean;
  onRetry?: (messageId: string) => void;
}

// Form Components
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export interface LocationInputProps {
  value: MapLocation | null;
  onChange: (location: MapLocation | null) => void;
  placeholder?: string;
  allowCurrentLocation?: boolean;
}

// List Components
export interface ParkingSignListProps {
  signs: ParkingSign[];
  onSignClick?: (sign: ParkingSign) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export interface ParkingFacilityListProps {
  facilities: PublicParkingFacility[];
  onFacilityClick?: (facility: PublicParkingFacility) => void;
  loading?: boolean;
  emptyMessage?: string;
}

// Button Components
export interface FloatingActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// Provider Components
export interface PostHogProviderProps {
  children: ReactNode;
}

export interface ClerkProviderProps {
  children: ReactNode;
  appearance?: any;
  [key: string]: any;
}

// Hook Return Types (for components that use these hooks)
export interface UseLocationReturn {
  location: MapLocation | null;
  loading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<MapLocation>;
  watchLocation: () => void;
  stopWatching: () => void;
}

export interface UseMapReturn {
  map: google.maps.Map | null;
  loading: boolean;
  error: string | null;
  center: MapLocation;
  zoom: number;
  setCenter: (location: MapLocation) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: google.maps.LatLngBounds) => void;
}

// Event Handler Types
export type LocationChangeHandler = (location: MapLocation) => void;
export type ViewChangeHandler = (view: 'map' | 'chat') => void;
export type MessageSendHandler = (message: string, type?: 'text' | 'image' | 'location') => void;
export type SearchHandler = (query: string, location?: MapLocation) => void;
