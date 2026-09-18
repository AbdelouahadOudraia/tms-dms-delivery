import React from 'react';
import controlTowerMap from '../../assets/maps/control-tower-map.png';
import routeDetailMap from '../../assets/maps/route-detail-map.png';
import mobileRouteBeforeMap from '../../assets/maps/mobile-route-before.png';
import mobileRouteAfterMap from '../../assets/maps/mobile-route-after.png';

type StaticMapVariant = 'control' | 'route-detail' | 'mobile-before' | 'mobile-after';

interface StaticMapCardProps {
  variant?: StaticMapVariant;
  title?: string;
  subtitle?: string;
  className?: string;
  imageClassName?: string;
  showOverlay?: boolean;
  children?: React.ReactNode;
}

const mapByVariant: Record<StaticMapVariant, string> = {
  control: controlTowerMap,
  'route-detail': routeDetailMap,
  'mobile-before': mobileRouteBeforeMap,
  'mobile-after': mobileRouteAfterMap,
};

export const StaticMapCard: React.FC<StaticMapCardProps> = ({
  variant = 'control',
  title,
  subtitle,
  className = '',
  imageClassName = '',
  showOverlay = true,
  children,
}) => {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] ${className}`}>
      <img
        src={mapByVariant[variant]}
        alt={title || 'Vue cartographique statique'}
        className={`h-full w-full object-cover ${imageClassName}`}
        draggable={false}
      />
      {showOverlay && (title || subtitle) && (
        <div className="absolute left-3 top-3 rounded-md border border-[#E2E8F0] bg-white/95 px-3 py-2 text-[13px]">
          {title && <p className="font-medium text-[#1F2937]">{title}</p>}
          {subtitle && <p className="mt-0.5 text-xs text-[#64748B]">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
