import React, { useEffect, useMemo, useState } from 'react';
import googleCasablancaPreview from '../../assets/maps/google-casablanca-preview.png';

interface GoogleMapCardProps {
  query: string;
  zoom?: number;
  title?: string;
  className?: string;
  markers?: GoogleMapMarker[];
  routePath?: GoogleMapRoutePoint[];
  showOpenLink?: boolean;
  showLegend?: boolean;
  markerSize?: 'sm' | 'md';
  showMarkerLabels?: boolean;
}

export interface GoogleMapMarker {
  id: string;
  label: string;
  detail?: string;
  kind: 'hub' | 'driver' | 'attention' | 'stop' | 'success' | 'failed' | 'pending';
  x: number;
  y: number;
}

export interface GoogleMapRoutePoint {
  id: string;
  x: number;
  y: number;
}

type MapStatus = 'loading' | 'loaded';

export const GoogleMapCard: React.FC<GoogleMapCardProps> = ({
  query,
  zoom = 13,
  title = 'Carte Google Maps',
  className = '',
  markers = [],
  routePath = [],
  showOpenLink = true,
  showLegend = true,
  markerSize = 'md',
  showMarkerLabels = true,
}) => {
  const [status, setStatus] = useState<MapStatus>('loading');

  const embedUrl = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`,
    [query, zoom],
  );
  const externalUrl = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    [query],
  );

  useEffect(() => {
    setStatus('loading');
  }, [embedUrl]);

  const handleMapLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const href = event.currentTarget.contentWindow?.location.href;
      if (href && href !== 'about:blank') setStatus('loaded');
    } catch {
      setStatus('loaded');
    }
  };

  const markerAppearance = {
    hub: {
      icon: 'warehouse',
      point: 'bg-[#102A43] text-white',
      label: 'text-[#102A43]',
    },
    driver: {
      icon: 'local_shipping',
      point: 'bg-[#0057A8] text-white',
      label: 'text-[#0057A8]',
    },
    attention: {
      icon: 'priority_high',
      point: 'bg-[#E8722C] text-white',
      label: 'text-[#B45309]',
    },
    stop: {
      icon: 'location_on',
      point: 'bg-[#0057A8] text-white',
      label: 'text-[#0057A8]',
    },
    success: {
      icon: 'check',
      point: 'bg-[#2E9E5B] text-white',
      label: 'text-[#166534]',
    },
    failed: {
      icon: 'close',
      point: 'bg-[#7F1D1D] text-white',
      label: 'text-[#7F1D1D]',
    },
    pending: {
      icon: 'radio_button_unchecked',
      point: 'bg-white text-[#64748B]',
      label: 'text-[#475569]',
    },
  } as const;
  const markerClass = markerSize === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-8 w-8 text-[12px]';
  const iconClass = markerSize === 'sm' ? 'text-[14px]' : 'text-[17px]';
  const labelClass = markerSize === 'sm' ? 'top-7 text-[9px]' : 'top-9 text-[10px]';
  const numberedMarkerKinds = ['stop', 'success', 'failed', 'pending'];
  const polylinePoints = routePath.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className={`relative overflow-hidden rounded-lg border border-[#D5E2EF] bg-[#E8F2FB] ${className}`}>
      <img
        src={googleCasablancaPreview}
        alt="Aperçu Google Maps de Casablanca"
        className="absolute -top-[25%] left-0 h-[125%] w-full object-fill"
        draggable={false}
      />

      <iframe
        title={title}
        src={embedUrl}
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        loading="eager"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleMapLoad}
      />

      {routePath.length > 1 && (
        <svg className="pointer-events-none absolute inset-0 z-[9] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={polylinePoints} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={polylinePoints} fill="none" stroke="#0057A8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      <div className="pointer-events-none absolute inset-0 z-10" aria-label="Repères opérationnels">
        {markers.map((marker) => {
          const appearance = markerAppearance[marker.kind];
          const showsNumber = numberedMarkerKinds.includes(marker.kind);
          return (
            <div
              key={marker.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              title={marker.detail ? `${marker.label} — ${marker.detail}` : marker.label}
            >
              <span className={`relative flex items-center justify-center rounded-full border-2 border-white font-semibold shadow-lg ${markerClass} ${appearance.point}`}>
                {marker.kind === 'driver' && <span className="absolute -inset-1 animate-ping rounded-full bg-[#0057A8]/20" />}
                {showsNumber ? (
                  <span className="relative leading-none">{marker.label}</span>
                ) : (
                  <span className={`material-symbols-outlined relative ${iconClass}`}>{appearance.icon}</span>
                )}
              </span>
              {showMarkerLabels && (
                <span className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#D5E2EF] bg-white/95 px-2 py-1 font-semibold shadow-sm ${labelClass} ${appearance.label}`}>
                  {marker.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showOpenLink && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md border border-[#D5E2EF] bg-white/95 px-3 py-2 text-xs font-medium text-[#0057A8] shadow-sm hover:bg-white"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Ouvrir dans Google Maps
        </a>
      )}

      {showLegend && (
        <div className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center gap-3 rounded-md border border-[#D5E2EF] bg-white/95 px-3 py-2 text-[10px] text-[#475569] shadow-sm">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#102A43]" />Dépôt</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0057A8]" />Chauffeur actif</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E8722C]" />À surveiller</span>
        </div>
      )}
    </div>
  );
};
