

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

export interface SubtitleClip {
  id:string;
  text: string;
  start: number; // in ms
  end: number;   // in ms
  
  fontSize: number; // in px
  fontFamily: string;
  color: string; // hex color
  backgroundColor: string; // rgba color
  textAlign: 'left' | 'center' | 'right';
  x: number; // 0 to 1, relative horizontal position
  y: number; // 0 to 1, relative vertical position
  
  animation: 'none' | 'fade' | 'typewriter';

  // New styling properties
  enableShadow: boolean;
  strokeColor: string;
  strokeWidth: number;
}


export type ZoomEffect = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'zoom-in-pan-right' | 'zoom-in-pan-left' | 'zoom-out-pan-right' | 'zoom-out-pan-left' | 'zoom-in-out' | 'zoom-out-in';
export type TransitionEffect = 'none' | 'crossfade' | 'fade-to-black' | 'wipe-left' | 'wipe-right' | 'slide-left' | 'slide-right';