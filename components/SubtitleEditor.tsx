
import React, { useState, useEffect, useMemo } from 'react';
import { SubtitleClip } from '../types';

interface SubtitleEditorProps {
  subtitles: SubtitleClip[];
  onAddSubtitle: () => void;
  onUpdateSubtitle: (id: string, updates: Partial<SubtitleClip>) => void;
  onDeleteSubtitle: (id: string) => void;
  onSelectSubtitle: (id: string | null) => void;
  selectedSubtitleId: string | null;
  currentTime: number;
}

const formatTime = (ms: number) => (ms / 1000).toFixed(3);

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  onAddSubtitle,
  onUpdateSubtitle,
  onDeleteSubtitle,
  onSelectSubtitle,
  selectedSubtitleId,
  currentTime,
}) => {
  const selectedSubtitle = useMemo(
    () => subtitles.find(s => s.id === selectedSubtitleId) || null,
    [subtitles, selectedSubtitleId]
  );

  const [localSubtitle, setLocalSubtitle] = useState<SubtitleClip | null>(selectedSubtitle);

  useEffect(() => {
    setLocalSubtitle(selectedSubtitle);
  }, [selectedSubtitle]);

  const handleInputChange = (field: keyof SubtitleClip, value: any) => {
    if (localSubtitle) {
      const updated = { ...localSubtitle, [field]: value };
      setLocalSubtitle(updated);
      onUpdateSubtitle(localSubtitle.id, { [field]: value });
    }
  };
  
  const handleCheckboxChange = (field: keyof SubtitleClip, checked: boolean) => {
      if (localSubtitle) {
          handleInputChange(field, checked);
      }
  };

  const handleTimeChange = (field: 'start' | 'end', value: string) => {
    const timeInMs = Math.round(parseFloat(value) * 1000);
    if (!isNaN(timeInMs) && localSubtitle) {
       handleInputChange(field, timeInMs);
    }
  }

  const sortedSubtitles = useMemo(() => 
    [...subtitles].sort((a, b) => a.start - b.start),
    [subtitles]
  );
  
  return (
    <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4 flex justify-between items-center">
        <span>Subtitles</span>
        <button
          onClick={onAddSubtitle}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-transform transform hover:scale-105"
        >
          + Add Text
        </button>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subtitle List */}
        <div className="md:col-span-1 bg-gray-900 p-3 rounded-md h-96 overflow-y-auto">
            {sortedSubtitles.length === 0 && <p className="text-gray-500 text-center text-sm py-4">No subtitles yet. Import an SRT file or add one manually.</p>}
            {sortedSubtitles.map(sub => (
                <div
                key={sub.id}
                onClick={() => onSelectSubtitle(sub.id)}
                className={`p-2 rounded-md cursor-pointer mb-2 transition-colors ${selectedSubtitleId === sub.id ? 'bg-indigo-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                <p className="font-semibold text-sm truncate">{sub.text || 'New Subtitle'}</p>
                <p className="text-xs text-gray-400">{formatTime(sub.start)}s - {formatTime(sub.end)}s</p>
                </div>
            ))}
        </div>

        {/* Edit Panel */}
        <div className="md:col-span-2">
          {localSubtitle ? (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Text</label>
                    <textarea
                        value={localSubtitle.text}
                        onChange={(e) => handleInputChange('text', e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        rows={3}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Start (seconds)</label>
                        <div className="flex">
                            <input
                                type="number"
                                step="0.01"
                                value={formatTime(localSubtitle.start)}
                                onChange={(e) => handleTimeChange('start', e.target.value)}
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button onClick={() => handleInputChange('start', currentTime)} className="px-2 bg-gray-600 hover:bg-gray-500 rounded-r-md text-xs">Set</button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">End (seconds)</label>
                         <div className="flex">
                            <input
                                type="number"
                                step="0.01"
                                value={formatTime(localSubtitle.end)}
                                onChange={(e) => handleTimeChange('end', e.target.value)}
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button onClick={() => handleInputChange('end', currentTime)} className="px-2 bg-gray-600 hover:bg-gray-500 rounded-r-md text-xs">Set</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Font</label>
                        <select value={localSubtitle.fontFamily} onChange={(e) => handleInputChange('fontFamily', e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm">
                            <option>Arial</option>
                            <option>Verdana</option>
                            <option>Georgia</option>
                            <option>Times New Roman</option>
                            <option>Courier New</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Align</label>
                        <select value={localSubtitle.textAlign} onChange={(e) => handleInputChange('textAlign', e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm">
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Anim</label>
                        <select value={localSubtitle.animation} onChange={(e) => handleInputChange('animation', e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm">
                            <option value="none">None</option>
                            <option value="fade">Fade</option>
                            <option value="typewriter">Typewriter</option>
                        </select>
                    </div>
                     <div className="flex items-end pb-1">
                        <div className="flex items-center">
                             <input
                                type="checkbox"
                                id="shadow-checkbox"
                                checked={localSubtitle.enableShadow}
                                onChange={(e) => handleCheckboxChange('enableShadow', e.target.checked)}
                                className="w-4 h-4 text-indigo-500 bg-gray-700 border-gray-600 rounded focus:ring-indigo-600"
                            />
                            <label htmlFor="shadow-checkbox" className="ml-2 text-sm font-medium text-gray-300">Shadow</label>
                        </div>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Font Size: {localSubtitle.fontSize}px</label>
                    <input
                        type="range"
                        min="12"
                        max="120"
                        value={localSubtitle.fontSize}
                        onChange={(e) => handleInputChange('fontSize', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Stroke Width: {localSubtitle.strokeWidth}px</label>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={localSubtitle.strokeWidth}
                        onChange={(e) => handleInputChange('strokeWidth', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>


                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Text Color</label>
                        <input
                            type="color"
                            value={localSubtitle.color}
                            onChange={(e) => handleInputChange('color', e.target.value)}
                            className="w-full p-1 h-10 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">BG Color</label>
                        <input
                            type="color"
                            value={localSubtitle.backgroundColor.slice(0, 7)} // hack to handle color input
                            onChange={(e) => {
                                // Re-add alpha channel
                                const alpha = parseInt(localSubtitle.backgroundColor.split(',')[3]?.replace(')','') || '128'); // default alpha 0.5
                                const r = parseInt(e.target.value.slice(1, 3), 16);
                                const g = parseInt(e.target.value.slice(3, 5), 16);
                                const b = parseInt(e.target.value.slice(5, 7), 16);
                                handleInputChange('backgroundColor', `rgba(${r},${g},${b},${alpha/255})`);
                            }}
                            className="w-full p-1 h-10 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Stroke</label>
                        <input
                            type="color"
                            value={localSubtitle.strokeColor}
                            onChange={(e) => handleInputChange('strokeColor', e.target.value)}
                            className="w-full p-1 h-10 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                        />
                    </div>
                </div>


                <button
                    onClick={() => onDeleteSubtitle(localSubtitle.id)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Delete Subtitle
                </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a subtitle to edit, or add a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};