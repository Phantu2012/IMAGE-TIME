
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
