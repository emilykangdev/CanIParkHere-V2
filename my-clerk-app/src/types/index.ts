/**
 * Type Definitions Index
 * Central export for all TypeScript types
 */

// API Types
export type {
  ParkingCheckResponse,
  ParkingSearchResponse,
  LocationCheckResponse,
  FollowUpResponse,
  ParkingSearchRequest,
  FollowUpRequest,
  ParkingSignResult,
  PublicParkingResult,
  HealthCheckResponse,
  FirebaseTokenResponse,
  ApiErrorResponse,
  ApiResponse
} from './api';

export { ParkingCategory } from './api';
export type { ParkingPermission, SignDetection } from './api';

// User Types
export type {
  UserProfile,
  UserStats,
  UserPreferences,
  ParkingEntry,
  LastParkedPointer,
  ParkingHistoryResponse,
  UseUserDataReturn,
  ParkingEntryInput,
  UserPreferencesUpdate
} from './user';

// Parking Types
export type {
  ChatMessage,
  MessageData,
  MapLocation,
  MapBounds,
  ParkingSign,
  PublicParkingFacility,
  ParkingSearchResults,
  MapMarker,
  InfoWindowContent,
  InfoWindowAction,
  GeocodeResult,
  PlaceSearchResult,
  ImageCompressionOptions,
  ImageProcessingResult,
  ParkingAnalysisRequest,
  ParkingAnalysisResult,
  TimeRestriction,
  ToastOptions
} from './parking';

export { MessageType, MessageDataType } from './parking';

// Component Types
export type {
  RootLayoutProps,
  HeaderProps,
  HomePageProps,
  ParkingChatAppProps,
  ParkingMapViewProps,
  SidebarProps,
  UserProfileModalProps,
  TicketTrackerProps,
  ThemeProviderProps,
  ThemeToggleProps,
  ParkingHistoryProps,
  SaveParkingToastProps,
  MapMarkerProps,
  InfoWindowProps,
  MessageProps,
  MessageInputProps,
  ChatHistoryProps,
  SearchInputProps,
  LocationInputProps,
  ParkingSignListProps,
  ParkingFacilityListProps,
  FloatingActionButtonProps,
  PostHogProviderProps,
  ClerkProviderProps,
  UseLocationReturn,
  UseMapReturn,
  LocationChangeHandler,
  ViewChangeHandler,
  MessageSendHandler,
  SearchHandler
} from './components';

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Common Event Types
export type ClickHandler = () => void;
export type ChangeHandler<T> = (value: T) => void;
export type SubmitHandler = (event: React.FormEvent) => void;

// Google Maps Types (re-export for convenience)
export type GoogleMap = google.maps.Map;
export type GoogleMapMarker = google.maps.Marker;
export type GoogleMapInfoWindow = google.maps.InfoWindow;
export type LatLng = google.maps.LatLng;
export type LatLngBounds = google.maps.LatLngBounds;
