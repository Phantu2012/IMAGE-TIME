
import React, { useMemo } from 'react';
import { TimelineClip } from '../types';

interface PreviewProps {
  clips: TimelineClip[];
  currentTime: number; // in milliseconds
  totalDuration: number;
}

const formatTime = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '00:00:00.000';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

export const Preview: React.FC<PreviewProps> = ({ clips, currentTime, totalDuration }) => {
  const activeClip = useMemo(() => {
    return clips.find(clip => currentTime >= clip.start && currentTime < clip.end);
  }, [clips, currentTime]);

  return (
    <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-700 relative shadow-lg">
      {activeClip ? (
        <img src={activeClip.src} alt={`Preview for ${activeClip.name}`} className="w-full h-full object-contain" />
      ) : (
        <div className="text-gray-500 text-center p-4">
          <h3 className="text-2xl font-bold">Timeline Preview</h3>
          <p>Scrub the timeline below to see the images.</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </div>
    </div>
  );
};
