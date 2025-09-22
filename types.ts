


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

// Fix: Add missing SubtitleClip interface definition.
export interface SubtitleClip {
    id: string;
    text: string;
    start: number; // in milliseconds
    end: number;   // in milliseconds
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    textAlign: 'left' | 'center' | 'right';
    animation: 'none' | 'fade' | 'typewriter';
    strokeWidth: number;
    strokeColor: string;
    enableShadow: boolean;
}

export type ZoomEffect = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'zoom-in-pan-right' | 'zoom-in-pan-left' | 'zoom-out-pan-right' | 'zoom-out-pan-left' | 'zoom-in-out' | 'zoom-out-in';
export type TransitionEffect = 'none' | 'crossfade' | 'fade-to-black' | 'wipe-left' | 'wipe-right' | 'slide-left' | 'slide-right';