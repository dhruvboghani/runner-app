
import React from 'react';
import { RunData } from '../types';

interface ArchiveChartsProps {
  history: RunData[];
}

const ArchiveCharts: React.FC<ArchiveChartsProps> = ({ history }) => {
  const lastActiveRuns = history
    .filter(r => !r.isRestDay)
    .slice(0, 7)
    .reverse();

  if (lastActiveRuns.length < 2) return null;

  const maxDist = Math.max(...lastActiveRuns.map(r => r.distance)) || 1;
  const chartHeight = 80;

  return (
    <div className="bg-[#4f772d] p-8 rounded-[3rem] border border-white/10 space-y-8 shadow-lg text-white">
      <div>
        <h3 className="text-[10px] text-brand-accent font-black uppercase tracking-[0.4em] mb-6">Activity Momentum</h3>
        <div className="flex items-end justify-between h-[100px] px-2 relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
          {lastActiveRuns.map((run) => {
            const h = (run.distance / maxDist) * chartHeight;
            return (
              <div key={run.id} className="flex flex-col items-center group relative flex-1">
                <div 
                  className="bg-brand-accent/20 border-t-2 border-brand-accent w-8 rounded-t-lg transition-all duration-700 ease-out group-hover:bg-brand-accent/40" 
                  style={{ height: `${h}px` }} 
                />
                <span className="text-[8px] font-black text-white/20 mt-3 uppercase tracking-tighter">
                  {new Date(run.startTime).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </span>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-brand-dark text-[9px] font-black px-2 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10 shadow-lg">
                  {(run.distance / 1000).toFixed(1)} KM
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 pt-4">
        <div>
          <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-1">Average Vol</p>
          <p className="text-2xl font-black mono italic text-white">
            {(lastActiveRuns.reduce((acc, r) => acc + r.distance, 0) / (lastActiveRuns.length || 1) / 1000).toFixed(1)}
            <span className="text-xs text-white/30 ml-1 not-italic">KM</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-brand-accent font-black uppercase tracking-widest mb-1">Record High</p>
          <p className="text-2xl font-black mono italic text-brand-accent">
            {(maxDist / 1000).toFixed(1)}
            <span className="text-xs opacity-50 ml-1 not-italic">KM</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArchiveCharts;
