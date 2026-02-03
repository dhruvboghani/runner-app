
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LocationPoint, RunData, UserStats, Shoe, UserSettings } from './types';
import { calculateDistance, formatPace } from './utils/geo';
import StepCounter from './components/StepCounter';
import RunPathMap from './components/RunPathMap';
import ArchiveCharts from './components/ArchiveCharts';

const App: React.FC = () => {
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('stride_pulse_stats_v7');
    const defaultStats: UserStats = { 
      totalDistance: 0, 
      totalRuns: 0, 
      totalSteps: 0, 
      history: [], 
      shoes: [], 
      settings: { autoArchivePeriod: 'never' } 
    };
    return saved ? JSON.parse(saved) : defaultStats;
  });

  const [todayData, setTodayData] = useState<RunData>(() => {
    const saved = localStorage.getItem('stride_pulse_today_v7');
    const data: RunData | null = saved ? JSON.parse(saved) : null;
    const now = new Date();
    
    if (data && new Date(data.startTime).toDateString() === now.toDateString()) {
      return data;
    }
    
    return {
      id: now.getTime().toString(),
      startTime: now.getTime(),
      distance: 0,
      steps: 0,
      path: [],
      duration: 0,
      elevationGain: 0
    };
  });

  const [view, setView] = useState<'home' | 'history' | 'shoes' | 'settings'>('home');
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [showRestDialog, setShowRestDialog] = useState(false);
  const [restNote, setRestNote] = useState('');
  const [selectedShoeId, setSelectedShoeId] = useState<string | undefined>(
    stats.shoes.find(s => s.isActive)?.id
  );

  const watchId = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);

  const archiveDay = useCallback((data: RunData) => {
    setStats(prev => {
      if (prev.history.some(h => h.id === data.id)) return prev;
      
      const updatedShoes = prev.shoes.map(shoe => {
        if (shoe.id === data.shoeId) {
          return { ...shoe, currentMileage: shoe.currentMileage + data.distance };
        }
        return shoe;
      });

      return {
        ...prev,
        totalDistance: prev.totalDistance + data.distance,
        totalRuns: prev.totalRuns + (data.isRestDay ? 0 : 1),
        totalSteps: prev.totalSteps + data.steps,
        history: [data, ...prev.history],
        shoes: updatedShoes
      };
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('stride_pulse_today_v7', JSON.stringify(todayData));
    localStorage.setItem('stride_pulse_stats_v7', JSON.stringify(stats));
  }, [todayData, stats]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, altitude, accuracy } = position.coords;
          setCurrentSpeed(speed || 0);
          setGpsAccuracy(accuracy);

          setTodayData(prev => {
            const lastPoint = prev.path[prev.path.length - 1];
            let addedDistance = 0;
            let addedElevation = 0;

            if (lastPoint) {
              addedDistance = calculateDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
              if (altitude && lastPoint.altitude && altitude > lastPoint.altitude) {
                addedElevation = altitude - lastPoint.altitude;
              }
            }

            if (addedDistance > 2 || prev.path.length === 0) {
              return {
                ...prev,
                distance: prev.distance + addedDistance,
                elevationGain: (prev.elevationGain || 0) + addedElevation,
                shoeId: selectedShoeId,
                path: [...prev.path, { latitude, longitude, timestamp: position.timestamp, altitude, accuracy }].slice(-1000)
              };
            }
            return prev;
          });
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
    }

    timerId.current = window.setInterval(() => {
      setTodayData(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (timerId.current) clearInterval(timerId.current);
    };
  }, [selectedShoeId]);

  const addShoe = (name: string, limitKm: number) => {
    const newShoe: Shoe = {
      id: Date.now().toString(),
      name,
      currentMileage: 0,
      limit: limitKm * 1000,
      isActive: stats.shoes.length === 0
    };
    setStats(prev => ({ ...prev, shoes: [...prev.shoes, newShoe] }));
    if (newShoe.isActive) setSelectedShoeId(newShoe.id);
  };

  const isGpsPoor = gpsAccuracy !== null && gpsAccuracy > 25;
  const isGpsCritical = gpsAccuracy !== null && gpsAccuracy > 60;

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col pb-24 text-brand-dark relative bg-slate-50">
      <StepCounter isActive={true} onStep={() => setTodayData(p => ({ ...p, steps: p.steps + 1 }))} />

      {isGpsPoor && (
        <div className={`fixed top-4 left-4 right-4 z-[100] p-4 rounded-3xl shadow-xl transition-all duration-500 animate-in slide-in-from-top ${isGpsCritical ? 'bg-brand-warm text-white' : 'bg-brand-accent text-brand-dark'}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center animate-pulse">
              <span className="text-xl font-black">!</span>
            </div>
            <div className="flex-1">
              <h4 className="text-[11px] font-black uppercase tracking-tighter">
                {isGpsCritical ? 'RECALIBRATING SENSORS' : 'POOR SIGNAL'}
              </h4>
              <p className="text-[10px] font-bold uppercase opacity-80">
                {isGpsCritical ? 'Stay still or move to clear skies' : 'Move away from tall obstacles'}
              </p>
            </div>
            <div className="text-[9px] font-black px-2 py-1 bg-black/10 rounded uppercase">
              {gpsAccuracy?.toFixed(0)}m
            </div>
          </div>
        </div>
      )}

      {showRestDialog && (
        <div className="fixed inset-0 z-[150] bg-brand-dark/20 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#4f772d] rounded-[3rem] p-8 w-full max-w-sm space-y-6 shadow-2xl border border-white/20">
            <h3 className="text-2xl font-black italic tracking-tighter text-brand-accent">SAVE RECOVERY</h3>
            <textarea 
              placeholder="Record your physical state..."
              className="w-full bg-black/10 border border-white/10 rounded-3xl p-5 text-sm focus:outline-none focus:border-brand-accent min-h-[120px] transition-all text-white placeholder:text-white/40"
              value={restNote}
              onChange={(e) => setRestNote(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowRestDialog(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-white/60">Cancel</button>
              <button onClick={() => {
                archiveDay({ ...todayData, isRestDay: true, notes: restNote });
                setShowRestDialog(false);
                setRestNote('');
              }} className="flex-1 py-4 accent-gradient text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <header className="p-6 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-brand-light/30">
        <div>
          <h1 className="text-2xl font-black tracking-tighter italic flex items-center gap-1">
            <span className="text-brand-warm">DHRUV</span>
            <span className="text-brand-mid">BOGHANI</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 bg-brand-mid rounded-full animate-pulse shadow-[0_0_8px_#219ebc]" />
            <p className="text-[9px] text-brand-mid font-black tracking-[0.2em] uppercase">Live Telemetry</p>
          </div>
        </div>
        <button onClick={() => setView('settings')} className="w-11 h-11 rounded-full bg-slate-50 border border-brand-light flex items-center justify-center active:scale-90 transition-all shadow-sm">
          <span className="text-lg">⚙️</span>
        </button>
      </header>

      <main className="flex-grow px-6 pt-6 overflow-x-hidden space-y-8">
        {view === 'home' && (
          <div className="animate-in fade-in duration-1000">
            
            <div className="relative py-8 flex flex-col items-center">
              <div className="absolute inset-0 bg-brand-mid/5 blur-[120px] rounded-full" />
              <p className="text-[11px] text-brand-mid font-black tracking-[0.5em] uppercase mb-2">Step Count</p>
              <div className="text-9xl font-black mono text-brand-dark leading-none tracking-tighter relative">
                {todayData.steps.toLocaleString()}
                <div className="absolute -inset-4 bg-brand-mid/5 blur-2xl pointer-events-none" />
              </div>
              
              <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                <div className="bg-[#4f772d] p-5 rounded-[2.5rem] text-center border border-white/10 shadow-lg">
                  <span className="text-[8px] text-white/60 font-black uppercase tracking-widest mb-1 block">Live Speed</span>
                  <p className="text-2xl font-black mono italic text-white">{(currentSpeed * 3.6).toFixed(1)} <span className="text-[10px] text-white/40 not-italic">KM/H</span></p>
                </div>
                <div className="bg-[#4f772d] p-5 rounded-[2.5rem] text-center border border-white/10 shadow-lg">
                  <span className="text-[8px] text-brand-accent font-black uppercase tracking-widest mb-1 block">Distance</span>
                  <p className="text-2xl font-black mono italic text-brand-accent">{(todayData.distance / 1000).toFixed(2)} <span className="text-[10px] text-white/40 not-italic">KM</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                 <h3 className="text-[10px] text-brand-mid font-black uppercase tracking-widest">Dynamic Path</h3>
                 <p className="text-[9px] text-brand-warm font-black uppercase tracking-widest">{Math.round(todayData.elevationGain || 0)}m ASCENT</p>
              </div>
              <RunPathMap path={todayData.path} />
            </div>

            <div className="pb-12">
               <button onClick={() => setView('history')} className="w-full bg-[#4f772d] border border-white/10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#3d5a22] transition-colors shadow-lg">Review Activity Logs →</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-8 pb-12">
            <div className="flex justify-between items-end">
               <h2 className="text-4xl font-black italic tracking-tighter text-brand-dark">HISTORY</h2>
               <div className="text-right">
                  <p className="text-[10px] text-brand-mid font-black uppercase tracking-widest">Cumulative</p>
                  <p className="text-xl font-black mono text-brand-warm">{(stats.totalDistance / 1000).toFixed(0)} KM</p>
               </div>
            </div>
            <ArchiveCharts history={stats.history} />
            <div className="space-y-4">
              {stats.history.map(run => (
                <div key={run.id} className="bg-[#4f772d] p-6 rounded-[2.5rem] border border-white/10 flex justify-between items-center shadow-lg text-white">
                   <div>
                      <p className="text-[10px] text-white/60 font-black uppercase tracking-tighter mb-1">
                        {new Date(run.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-2xl font-black mono italic text-white leading-tight">
                        {run.isRestDay ? 'RECOVERY' : `${(run.distance / 1000).toFixed(2)} KM`}
                      </p>
                      <div className="flex gap-3 mt-1">
                         <span className="text-[9px] font-black uppercase text-brand-accent tracking-widest">{run.steps} STEPS</span>
                         <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">|</span>
                         <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">{formatPace(run.duration, run.distance)} PACE</span>
                      </div>
                   </div>
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center ${run.isRestDay ? 'bg-brand-accent/20' : 'bg-white/10'}`}>
                      <span className="text-xl">{run.isRestDay ? '🧘' : '🏃'}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'shoes' && (
          <div className="animate-in slide-in-from-right-8 duration-700 space-y-8 pb-12">
            <h2 className="text-4xl font-black italic tracking-tighter text-brand-dark">GEAR LOCKER</h2>
            <div className="bg-[#4f772d] p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-lg text-white">
               <h3 className="text-[10px] text-white/60 font-black uppercase tracking-widest">Register Running Shoes</h3>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 addShoe(formData.get('name') as string, Number(formData.get('limit')));
                 (e.target as any).reset();
               }} className="space-y-4">
                  <input name="name" required placeholder="Shoe Model" className="w-full bg-black/10 border border-white/10 rounded-full py-4 px-6 text-sm font-bold focus:outline-none focus:border-brand-accent text-white placeholder:text-white/40" />
                  <input name="limit" required type="number" placeholder="Distance Limit (KM)" className="w-full bg-black/10 border border-white/10 rounded-full py-4 px-6 text-sm font-bold focus:outline-none focus:border-brand-accent text-white placeholder:text-white/40" />
                  <button type="submit" className="w-full accent-gradient text-white py-5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Add to Gear</button>
               </form>
            </div>
            <div className="space-y-4">
               {stats.shoes.map(shoe => {
                 const progress = (shoe.currentMileage / shoe.limit) * 100;
                 return (
                   <div key={shoe.id} className="bg-[#4f772d] p-6 rounded-[2.5rem] border border-white/10 shadow-lg text-white">
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <h4 className="text-xl font-black italic text-white">{shoe.name}</h4>
                            <p className="text-[9px] text-white/60 font-black uppercase mt-1">{(shoe.currentMileage/1000).toFixed(1)} / {(shoe.limit/1000).toFixed(0)} KM EXPENDED</p>
                         </div>
                         {shoe.isActive && <div className="text-[8px] font-black px-2 py-1 bg-brand-accent text-brand-dark rounded-full uppercase tracking-widest">Active</div>}
                      </div>
                      <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mb-4">
                         <div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-brand-warm' : 'bg-brand-accent'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      <button onClick={() => setStats(prev => ({ ...prev, shoes: prev.shoes.map(s => ({ ...s, isActive: s.id === shoe.id })) }))} className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/10 rounded-full transition-all">Set Primary Gear</button>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="animate-in slide-in-from-right-8 duration-700 space-y-8 pb-12">
            <h2 className="text-4xl font-black italic tracking-tighter text-brand-dark">SYSTEM</h2>
            <div className="bg-[#4f772d] p-6 rounded-[2.5rem] border border-white/10 space-y-8 shadow-lg text-white">
               <div className="space-y-4">
                  <h3 className="text-[10px] text-white/60 font-black uppercase tracking-widest">Telemetry Thresholds (KM/H)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.5" value={stats.settings.minSpeedAlert || ''} onChange={e => setStats(prev => ({...prev, settings: {...prev.settings, minSpeedAlert: Number(e.target.value) || undefined}}))} placeholder="MIN SPEED" className="bg-black/10 border border-white/10 rounded-full py-3 px-6 text-sm font-bold focus:border-brand-accent outline-none text-white placeholder:text-white/40" />
                    <input type="number" step="0.5" value={stats.settings.maxSpeedAlert || ''} onChange={e => setStats(prev => ({...prev, settings: {...prev.settings, maxSpeedAlert: Number(e.target.value) || undefined}}))} placeholder="MAX SPEED" className="bg-black/10 border border-white/10 rounded-full py-3 px-6 text-sm font-bold focus:border-brand-accent outline-none text-white placeholder:text-white/40" />
                  </div>
               </div>
               <div className="space-y-4">
                  <h3 className="text-[10px] text-white/60 font-black uppercase tracking-widest">Data Retention</h3>
                  <select value={stats.settings.autoArchivePeriod} onChange={e => setStats(prev => ({...prev, settings: {...prev.settings, autoArchivePeriod: e.target.value as any}}))} className="w-full bg-black/10 border border-white/10 rounded-full py-4 px-6 text-sm font-bold focus:border-brand-accent outline-none appearance-none text-white">
                    <option value="never" className="text-black">Retain Forever</option>
                    <option value="6months" className="text-black">6 Months Roll-off</option>
                    <option value="1year" className="text-black">1 Year Roll-off</option>
                  </select>
               </div>
               <div className="pt-6 border-t border-white/10">
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[10px] font-black text-brand-accent uppercase tracking-widest w-full text-center">Wipe System Memory</button>
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-3xl border-t border-brand-light/30 flex justify-around items-center max-w-md mx-auto z-50">
        <button onClick={() => setView('home')} className={`flex-1 flex flex-col items-center py-1 transition-all ${view === 'home' ? 'text-brand-mid scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl mb-1">{view === 'home' ? '⏺' : '○'}</span>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Live</span>
        </button>
        <button onClick={() => setView('history')} className={`flex-1 flex flex-col items-center py-1 transition-all ${view === 'history' ? 'text-brand-mid scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl mb-1">{view === 'history' ? '▤' : '▢'}</span>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Records</span>
        </button>
        <button onClick={() => setView('shoes')} className={`flex-1 flex flex-col items-center py-1 transition-all ${view === 'shoes' ? 'text-brand-mid scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl mb-1">👟</span>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Gear</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
