import { logger } from '../lib/logger'
import type { MapMarker } from '@/types/parking'

// Replace console calls in map event handlers
const handleMapClick = (event: google.maps.MapMouseEvent) => {
  if (event.latLng) {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    logger.debug('🗺️ Map clicked:', { lat, lng });
    // ... handle click
  }
};

const handleMarkerClick = (marker: MapMarker) => {
  logger.debug('📍 Marker clicked:', marker);
  // ... handle marker click
};
