
import React, { useState, useEffect, useRef } from 'react';

interface StepCounterProps {
  isActive: boolean;
  onStep: () => void;
}

const StepCounter: React.FC<StepCounterProps> = ({ isActive, onStep }) => {
  const [needsPermission, setNeedsPermission] = useState(false);
  const lastUpdate = useRef<number>(0);
  const lastMagnitude = useRef<number>(0);
  const isPeak = useRef<boolean>(false);
  const threshold = 12.0; 
  const cooldown = 280; 

  const handleMotion = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    const now = Date.now();

    if (magnitude > threshold && magnitude > lastMagnitude.current && !isPeak.current) {
      if (now - lastUpdate.current > cooldown) {
        onStep();
        lastUpdate.current = now;
        isPeak.current = true;
      }
    } else if (magnitude < threshold - 1) {
      isPeak.current = false;
    }

    lastMagnitude.current = magnitude;
  };

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('devicemotion', handleMotion);
          setNeedsPermission(false);
        }
      } catch (e) {
        console.error("Sensor Permission Error:", e);
      }
    } else {
      window.addEventListener('devicemotion', handleMotion);
      setNeedsPermission(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        setNeedsPermission(true);
    } else {
        requestPermission();
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isActive]);

  if (needsPermission) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className="w-24 h-24 bg-brand-light/20 rounded-full flex items-center justify-center mb-6 border border-brand-mid/10">
           <span className="text-4xl animate-bounce">📱</span>
        </div>
        <h2 className="text-2xl font-black italic mb-2 text-brand-dark uppercase">SENSORS OFFLINE</h2>
        <p className="text-slate-400 text-sm mb-8">Permission is required to enable automated step tracking and motion analysis.</p>
        <button 
          onClick={requestPermission}
          className="w-full bg-brand-mid text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
        >
          Enable Motion Access
        </button>
      </div>
    );
  }

  return null;
};

export default StepCounter;
