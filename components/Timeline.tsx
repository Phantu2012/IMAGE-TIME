import React from 'react';
import { TimelineClip } from '../types';

const formatTimeForTooltip = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '00:00:00.000';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};


export const Timeline: React.FC<{
    clips: TimelineClip[];
    totalDuration: number;
    currentTime: number;
    onTimeChange: (time: number) => void;
    isPlaying: boolean;
    onPlayPause: () => void;
}> = ({ clips, totalDuration, currentTime, onTimeChange, isPlaying, onPlayPause }) => {
  if (totalDuration === 0) return null;

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Cast e.target to HTMLInputElement to access the 'value' property.
    onTimeChange(Number((e.target as HTMLInputElement).value));
  };
  
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'
  ];

  return (
    <div className="w-full bg-gray-800 p-4 rounded-lg mt-4 shadow-lg">
        <div className="flex items-center space-x-4">
          <button 
              onClick={onPlayPause}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 rounded-full flex items-center justify-center transition-transform transform hover:scale-105"
          >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
          </button>
           <div className="flex-grow relative h-10 flex items-center">
                <div className="relative w-full h-4 bg-gray-700 rounded-full">
                    {clips.map((clip, index) => {
                        const left = (clip.start / totalDuration) * 100;
                        const width = (clip.duration / totalDuration) * 100;
                        return (
                            <div
                                key={clip.id}
                                className={`absolute h-full ${colors[index % colors.length]} opacity-70 hover:opacity-100 transition-opacity rounded-sm tooltip-container`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                            >
                              <span className="tooltip-text bg-gray-900 text-white text-xs rounded py-1 px-2 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap opacity-0 pointer-events-none transition-opacity">
                                {clip.name}<br/>{formatTimeForTooltip(clip.start)} - {formatTimeForTooltip(clip.end)}
                              </span>
                            </div>
                        );
                    })}
                     <div 
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-red-500 rounded-full pointer-events-none transform -translate-x-1/2 z-10"
                      style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                    >
                      <div className="w-3 h-3 bg-red-500 rounded-full absolute -top-1 -left-1"></div>
                    </div>
                </div>
                 <input
                    type="range"
                    min="0"
                    max={totalDuration}
                    value={currentTime}
                    onChange={handleScrubberChange}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
           </div>
        </div>
         <style>{`
          .tooltip-container:hover .tooltip-text {
            opacity: 1;
          }
          input[type=range] {
            -webkit-appearance: none;
            width: 100%;
            background: transparent;
          }
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 24px;
            width: 8px;
          }
           input[type=range]::-moz-range-thumb {
            height: 24px;
            width: 8px;
            border: none;
            border-radius: 0;
            background: transparent;
          }
        `}</style>
    </div>
  );
};