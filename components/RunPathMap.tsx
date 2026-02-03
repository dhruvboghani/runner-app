
import React, { useMemo } from 'react';
import { LocationPoint } from '../types';

interface RunPathMapProps {
  path: LocationPoint[];
}

const RunPathMap: React.FC<RunPathMapProps> = ({ path }) => {
  const svgPath = useMemo(() => {
    if (path.length < 2) return "";

    const lats = path.map(p => p.latitude);
    const lngs = path.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 30;
    const width = 300;
    const height = 240;

    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;

    const points = path.map(p => {
      const x = padding + ((p.longitude - minLng) / lngRange) * (width - 2 * padding);
      const y = height - (padding + ((p.latitude - minLat) / latRange) * (height - 2 * padding));
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [path]);

  if (path.length < 2) {
    return (
      <div className="w-full h-60 bg-[#4f772d] rounded-[2.5rem] flex flex-col items-center justify-center border border-white/10 space-y-3 shadow-lg">
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-pulse">
           <div className="w-2 h-2 bg-brand-accent rounded-full" />
        </div>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Acquiring Satellites...</p>
      </div>
    );
  }

  const pathParts = svgPath.split(' ');
  const startPoint = pathParts[1].split(',');
  const endPoint = pathParts[pathParts.length - 1].split(',');

  return (
    <div className="w-full bg-[#4f772d] rounded-[2.5rem] p-6 border border-white/10 relative overflow-hidden shadow-lg">
      <svg viewBox="0 0 300 240" className="w-full h-60">
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffb703" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffb703" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={svgPath}
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-out"
        />
        <circle cx={startPoint[0]} cy={startPoint[1]} r="6" fill="#fb8500" />
        {endPoint && (
          <circle cx={endPoint[0]} cy={endPoint[1]} r="7" fill="#ffb703" className="animate-pulse shadow-xl" />
        )}
      </svg>
      <div className="absolute top-4 right-6 flex items-center gap-2">
         <div className="w-1.5 h-1.5 bg-brand-warm rounded-full" />
         <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">START</span>
      </div>
    </div>
  );
};

export default RunPathMap;
