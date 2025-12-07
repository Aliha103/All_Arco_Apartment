'use client';

import { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================================
// TYPES
// ============================================================================
interface MapComponentProps {
  lat: number;
  lng: number;
  onLoad?: () => void;
}

// ============================================================================
// CUSTOM MARKER ICON
// ============================================================================
const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #C4A572 0%, #B39562 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(196, 165, 114, 0.4);
        border: 3px solid white;
      ">
        <svg
          style="transform: rotate(45deg); width: 20px; height: 20px; color: white;"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};

// ============================================================================
// MAP STYLES
// ============================================================================
const mapStyles = `
  .leaflet-container {
    font-family: inherit;
    height: 100%;
    width: 100%;
    z-index: 0 !important; /* keep map below surrounding overlays */
  }

  .leaflet-pane,
  .leaflet-top,
  .leaflet-bottom {
    z-index: 0 !important;
  }

  .leaflet-control-container .leaflet-top,
  .leaflet-control-container .leaflet-bottom {
    z-index: 10 !important; /* keep controls clickable without covering other sections */
  }

  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
  }

  .leaflet-control-zoom a {
    background: white !important;
    color: #374151 !important;
    border: none !important;
    width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
    font-size: 16px !important;
  }

  .leaflet-control-zoom a:hover {
    background: #f3f4f6 !important;
  }

  .leaflet-control-zoom-in {
    border-radius: 8px 8px 0 0 !important;
  }

  .leaflet-control-zoom-out {
    border-radius: 0 0 8px 8px !important;
  }

  .custom-marker {
    background: transparent !important;
    border: none !important;
  }

  .leaflet-popup-content-wrapper {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 0;
  }

  .leaflet-popup-content {
    margin: 0;
    font-family: inherit;
  }

  .leaflet-popup-tip {
    background: white;
  }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const MapComponent = memo(function MapComponent({ lat, lng, onLoad }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Add custom styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = mapStyles;
    document.head.appendChild(styleSheet);

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    // Add tile layer - using Carto Positron for clean look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add attribution control at bottom left
    L.control.attribution({
      position: 'bottomleft',
      prefix: false,
    }).addTo(map);

    // Add custom marker
    const marker = L.marker([lat, lng], {
      icon: createCustomIcon(),
    }).addTo(map);

    // Add popup
    marker.bindPopup(`
      <div style="padding: 12px; min-width: 180px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">All'Arco Apartment</div>
        <div style="font-size: 12px; color: #6b7280;">Castello District, Venice</div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6;">
          <div style="display: flex; align-items: center; gap: 4px; color: #C4A572; font-size: 11px; font-weight: 500;">
            <span style="color: #C4A572;">★</span> 9.8 Exceptional
          </div>
        </div>
      </div>
    `);

    mapInstanceRef.current = map;

    // Notify parent that map is loaded
    if (onLoad) {
      map.whenReady(() => {
        onLoad();
      });
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      styleSheet.remove();
    };
  }, [lat, lng, onLoad]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: '300px' }}
      aria-label="Map showing apartment location in Venice"
    />
  );
});

export default MapComponent;
