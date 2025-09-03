
export interface CsvRow {
  stt: number;
  startTime: string;
}

export interface TimelineClip {
  id: number;
  src: string;
  start: number; // in milliseconds
  end: number;   // in milliseconds
  duration: number; // in milliseconds
  name: string;
}

export type ZoomEffect = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'zoom-in-pan-right' | 'zoom-in-pan-left' | 'zoom-out-pan-right' | 'zoom-out-pan-left' | 'zoom-in-out' | 'zoom-out-in';
export type TransitionEffect = 'none' | 'crossfade' | 'fade-to-black' | 'wipe-left' | 'wipe-right' | 'slide-left' | 'slide-right';