
export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null;
  accuracy?: number;
}

export interface Shoe {
  id: string;
  name: string;
  currentMileage: number; // in meters
  limit: number; // in meters
  isActive: boolean;
}

export interface RunData {
  id: string;
  startTime: number;
  endTime?: number;
  distance: number; // in meters
  steps: number;
  path: LocationPoint[];
  duration: number; // in seconds
  elevationGain?: number;
  notes?: string;
  isRestDay?: boolean;
  shoeId?: string;
  avgAccuracy?: number;
}

export interface UserSettings {
  minSpeedAlert?: number; // km/h
  maxSpeedAlert?: number; // km/h
  autoArchivePeriod: 'never' | '6months' | '1year';
}

export interface UserStats {
  totalDistance: number;
  totalRuns: number;
  totalSteps: number;
  history: RunData[];
  shoes: Shoe[];
  settings: UserSettings;
}
