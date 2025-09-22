/// <reference lib="dom" />

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TimelineClip, CsvRow, ZoomEffect, TransitionEffect } from './types';
import { FileUploader } from './components/FileUploader';
import { Timeline } from './components/Timeline';
import { Preview } from './components/Preview';
import { CsvIcon, FilmIcon, DownloadIcon } from './components/Icons';

// Add type declaration for gif.js loaded from CDN
declare const GIF: any;

function App() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<'video' | 'gif' | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [supportedVideoFormat, setSupportedVideoFormat] = useState({ mimeType: 'video/webm; codecs=vp9', extension: 'webm' });
  const [useGreenScreen, setUseGreenScreen] = useState<boolean>(false);
  const [zoomEffect, setZoomEffect] = useState<ZoomEffect>('none');
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffect>('none');
  const [exportResolution, setExportResolution] = useState<'source' | '1080p' | '720p' | '480p'>('720p');
  
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const mp4MimeType = 'video/mp4; codecs=avc1.42E01E';
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mp4MimeType)) {
      setSupportedVideoFormat({ mimeType: mp4MimeType, extension: 'mp4' });
    }
  }, []);

  const handleImageSelection = useCallback((files: File[]) => {
    const sortedFiles = files.sort((a, b) => {
        const numA = parseInt(a.name, 10);
        const numB = parseInt(b.name, 10);
        return numA - numB;
    });
    setImageFiles(sortedFiles);
    setTimelineClips([]);
    setError('');
  }, []);

  const handleCsvSelection = useCallback((files: File[]) => {
    if (files.length > 0) {
      setCsvFile(files[0]);
      setTimelineClips([]);
      setError('');
    }
  }, []);

  const parseTimestamp = (time: string): number => {
    const mainParts = time.split(',');
    if (mainParts.length !== 2) return NaN;

    const milliseconds = parseInt(mainParts[1], 10);
    const timeParts = mainParts[0].split(':').map(Number);

    if (isNaN(milliseconds) || timeParts.some(isNaN) || timeParts.length === 0 || timeParts.length > 3) {
      return NaN;
    }

    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    
    if (timeParts.length === 3) {
      [hours, minutes, seconds] = timeParts;
    } else if (timeParts.length === 2) {
      [minutes, seconds] = timeParts;
    } else if (timeParts.length === 1) {
      [seconds] = timeParts;
    }

    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  };

  const processFiles = useCallback(async () => {
    if (imageFiles.length === 0 || !csvFile) {
      setError('Please upload both image files and a CSV file.');
      return;
    }
    setIsLoading(true);
    setError('');
    setTimelineClips([]);

    try {
      const csvText = await csvFile.text();
      const rows = csvText.split('\n').slice(1);
      const csvData: CsvRow[] = rows
        .map(row => row.trim())
        .filter(row => row)
        .map(row => {
          const firstCommaIndex = row.indexOf(',');
          if (firstCommaIndex === -1) {
            return { stt: NaN, startTime: '' };
          }
          const sttString = row.substring(0, firstCommaIndex);
          let startTime = row.substring(firstCommaIndex + 1);

          if (startTime.startsWith('"') && startTime.endsWith('"')) {
            startTime = startTime.slice(1, -1);
          }
          
          return { stt: parseInt(sttString, 10), startTime };
        })
        .filter(item => !isNaN(item.stt) && item.startTime);
        
      if (csvData.length === 0) {
          throw new Error("CSV file is empty or formatted incorrectly.");
      }

      const imageMap = new Map<number, { file: File, url: string }>();
      imageFiles.forEach(file => {
          const stt = parseInt(file.name, 10);
          if (!isNaN(stt)) {
              imageMap.set(stt, { file, url: URL.createObjectURL(file) });
          }
      });

      const clips: TimelineClip[] = [];
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const imageInfo = imageMap.get(row.stt);
        if (!imageInfo) {
            console.warn(`Image for STT ${row.stt} not found. Skipping.`);
            continue;
        }

        const start = parseTimestamp(row.startTime);
        // Default duration of 5 seconds for the last clip
        const end = i < csvData.length - 1 ? parseTimestamp(csvData[i+1].startTime) : start + 5000;
        
        if (isNaN(start) || isNaN(end) || start >= end) {
            console.warn(`Invalid timestamp for STT ${row.stt}. Start: ${row.startTime}. Skipping.`);
            continue;
        }

        clips.push({
          id: row.stt,
          src: imageInfo.url,
          name: imageInfo.file.name,
          start,
          end,
          duration: end - start,
        });
      }
      
      if (clips.length === 0) {
        throw new Error("No valid timeline clips could be generated. Please check your files for correct formatting and matching STT numbers.");
      }

      const finalDuration = clips.length > 0 ? clips[clips.length - 1].end : 0;
      
      setTimelineClips(clips);
      setTotalDuration(finalDuration);

      setCurrentTime(0);
      setIsPlaying(false);

    } catch (e) {
      setError(`Failed to process files: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageFiles, csvFile]);

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === undefined) {
      lastTimeRef.current = time;
    }
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    setCurrentTime(prevTime => {
        const newTime = prevTime + deltaTime;
        if (newTime >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
        }
        return newTime;
    });
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [totalDuration]);
  
  useEffect(() => {
    if (isPlaying) {
        lastTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(animate);
    } else {
        if(animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }
    return () => {
        if(animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
  }, [isPlaying, animate]);
  
  const handlePlayPause = () => {
      if (currentTime >= totalDuration) {
          setCurrentTime(0);
          setIsPlaying(true);
      } else {
        setIsPlaying(prev => !prev);
      }
  };

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime);
  };

  const handleDownload = async (format: 'video' | 'gif') => {
    if (timelineClips.length === 0 || isRendering) return;

    setIsRendering(format);
    setRenderProgress(0);
    setError('');

    try {
        const getExportDimensions = (sourceWidth: number, sourceHeight: number) => {
            const aspectRatio = sourceWidth / sourceHeight;
            // Ensure width is even for compatibility
            const ensureEven = (num: number) => Math.round(num / 2) * 2;
            switch (exportResolution) {
                case '1080p':
                    return { width: ensureEven(1920), height: ensureEven(1920 / aspectRatio) };
                case '720p':
                    return { width: ensureEven(1280), height: ensureEven(1280 / aspectRatio) };
                case '480p':
                    return { width: ensureEven(854), height: ensureEven(854 / aspectRatio) };
                case 'source':
                default:
                    if (sourceHeight > 1080) {
                        return { width: ensureEven(1080 * aspectRatio), height: ensureEven(1080) };
                    }
                    return { width: ensureEven(sourceWidth), height: ensureEven(sourceHeight) };
            }
        };

        const firstImage = new Image();
        firstImage.src = timelineClips[0].src;
        await new Promise<void>((resolve, reject) => {
            firstImage.onload = () => resolve();
            firstImage.onerror = () => reject(new Error('Failed to load first image.'));
        });

        const { width, height } = getExportDimensions(firstImage.naturalWidth, firstImage.naturalHeight);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        const backgroundColor = useGreenScreen ? '#00ff00' : '#000000';

        const images = await Promise.all(
            timelineClips.map(clip => new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.src = clip.src;
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load image: ${clip.name}`));
            }))
        );

        const clipImageMap = new Map<number, HTMLImageElement>();
        timelineClips.forEach((clip, index) => {
            clipImageMap.set(clip.id, images[index]);
        });
        
        const drawFrame = (time: number) => {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            const transitionDuration = transitionEffect !== 'none' ? Math.min(500, ...timelineClips.map(c => c.duration / 2)) : 0;
            
            let currentClip = timelineClips.find(c => time >= c.start && time < c.end);
            if (!currentClip && time === totalDuration && timelineClips.length > 0) {
                currentClip = timelineClips[timelineClips.length - 1];
            }
            
            if (!currentClip) return;
        
            const drawImageWithEffect = (img: HTMLImageElement, clip: TimelineClip, time: number, alpha: number = 1, offsetX: number = 0) => {
                 if (!img) return;
                 ctx.save();
                 ctx.globalAlpha = alpha;
                 const progress = Math.max(0, Math.min(1, (time - clip.start) / clip.duration));
                 const canvasAspect = canvas.width / canvas.height;
                 const imageAspect = img.naturalWidth / img.naturalHeight;
                 let baseScale: number;
                 if (zoomEffect === 'none') {
                     if (canvasAspect > imageAspect) baseScale = canvas.height / img.naturalHeight;
                     else baseScale = canvas.width / img.naturalWidth;
                 } else {
                     if (canvasAspect > imageAspect) baseScale = canvas.width / img.naturalWidth;
                     else baseScale = canvas.height / img.naturalHeight;
                 }
                 let zoom = 1.0, panX = 0;
                 switch(zoomEffect) {
                     case 'zoom-in': zoom = 1.0 + progress * 0.1; break;
                     case 'zoom-out': zoom = 1.1 - progress * 0.1; break;
                     case 'pan-left': panX = (0.5 - progress) * 0.1; break;
                     case 'pan-right': panX = (-0.5 + progress) * 0.1; break;
                     case 'zoom-in-pan-right': zoom = 1.0 + progress * 0.1; panX = (-0.5 + progress) * 0.1; break;
                     case 'zoom-in-pan-left': zoom = 1.0 + progress * 0.1; panX = (0.5 - progress) * 0.1; break;
                     case 'zoom-out-pan-right': zoom = 1.1 - progress * 0.1; panX = (-0.5 + progress) * 0.1; break;
                     case 'zoom-out-pan-left': zoom = 1.1 - progress * 0.1; panX = (0.5 - progress) * 0.1; break;
                     case 'zoom-in-out': zoom = 1.0 + 0.1 * (1 - Math.abs(progress - 0.5) * 2); break;
                     case 'zoom-out-in': zoom = 1.1 - 0.1 * (1 - Math.abs(progress - 0.5) * 2); break;
                 }
                 const scale = baseScale * zoom;
                 const targetWidth = img.naturalWidth * scale;
                 const targetHeight = img.naturalHeight * scale;
                 const dx = (canvas.width - targetWidth) / 2 + panX * canvas.width + offsetX;
                 const dy = (canvas.height - targetHeight) / 2;
                 ctx.drawImage(img, dx, dy, targetWidth, targetHeight);
                 ctx.restore();
            }

            const currentClipIndex = timelineClips.findIndex(c => c.id === currentClip!.id);
            const nextClip = timelineClips[currentClipIndex + 1];
            const currentImage = clipImageMap.get(currentClip.id);
            const isInTransition = nextClip && transitionDuration > 0 && time > currentClip.end - transitionDuration;

            if (isInTransition) {
                const transitionProgress = (time - (currentClip.end - transitionDuration)) / transitionDuration;
                const nextImage = clipImageMap.get(nextClip.id);
                switch (transitionEffect) {
                    case 'crossfade':
                        if (currentImage) drawImageWithEffect(currentImage, currentClip, time, 1 - transitionProgress);
                        if (nextImage) drawImageWithEffect(nextImage, nextClip, time, transitionProgress);
                        break;
                    case 'fade-to-black':
                        if (transitionProgress < 0.5) {
                            if (currentImage) drawImageWithEffect(currentImage, currentClip, time, 1 - (transitionProgress * 2));
                        } else {
                            if (nextImage) drawImageWithEffect(nextImage, nextClip, time, (transitionProgress - 0.5) * 2);
                        }
                        break;
                    case 'wipe-left':
                        if (currentImage) drawImageWithEffect(currentImage, currentClip, time);
                        if (nextImage) {
                            ctx.save();
                            const wipeX = canvas.width * (1 - transitionProgress);
                            ctx.beginPath();
                            ctx.rect(wipeX, 0, canvas.width - wipeX, canvas.height);
                            ctx.clip();
                            drawImageWithEffect(nextImage, nextClip, time);
                            ctx.restore();
                        }
                        break;
                    case 'wipe-right':
                         if (currentImage) drawImageWithEffect(currentImage, currentClip, time);
                         if (nextImage) {
                            ctx.save();
                            const wipeWidth = canvas.width * transitionProgress;
                            ctx.beginPath();
                            ctx.rect(0, 0, wipeWidth, canvas.height);
                            ctx.clip();
                            drawImageWithEffect(nextImage, nextClip, time);
                            ctx.restore();
                        }
                        break;
                    case 'slide-left':
                        if (currentImage) drawImageWithEffect(currentImage, currentClip, time, 1, -canvas.width * transitionProgress);
                        if (nextImage) drawImageWithEffect(nextImage, nextClip, time, 1, canvas.width * (1 - transitionProgress));
                        break;
                    case 'slide-right':
                        if (currentImage) drawImageWithEffect(currentImage, currentClip, time, 1, canvas.width * transitionProgress);
                        if (nextImage) drawImageWithEffect(nextImage, nextClip, time, 1, -canvas.width * (1 - transitionProgress));
                        break;
                    default: 
                        if (currentImage) drawImageWithEffect(currentImage, currentClip, time);
                        break;
                }
            } else {
                if (currentImage) {
                    drawImageWithEffect(currentImage, currentClip, time, 1);
                }
            }
        };
        
        if (format === 'video') {
            const videoStream = canvas.captureStream(24); 
            const stream = videoStream;

            const recorder = new MediaRecorder(stream, { 
              mimeType: supportedVideoFormat.mimeType,
              videoBitsPerSecond: 5000000
            });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: supportedVideoFormat.mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `timeline.${supportedVideoFormat.extension}`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setIsRendering(null);
                setRenderProgress(0);
            };
            recorder.start();

            const frameRate = 24;
            const frameDuration = 1000 / frameRate;
            const totalFrames = Math.floor(totalDuration / frameDuration);
            let frame = 0;
            const renderStartTime = performance.now();
            const renderVideoFrame = () => {
                if (frame > totalFrames) {
                    recorder.stop();
                    return;
                }
                const currentTime = frame * frameDuration;
                drawFrame(currentTime);
                setRenderProgress((frame / totalFrames) * 100);
                frame++;
                const nextFrameTimestamp = renderStartTime + (frame * frameDuration);
                const delay = Math.max(0, nextFrameTimestamp - performance.now());
                setTimeout(renderVideoFrame, delay);
            };
            renderVideoFrame();
        } else if (format === 'gif') {
            const gif = new GIF({
                workers: 2,
                quality: 1, 
                width: canvas.width,
                height: canvas.height,
                workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
            });

            gif.on('finished', (blob: Blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'timeline.gif';
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setIsRendering(null);
                setRenderProgress(0);
            });

            const frameRate = 15;
            const frameDelay = 1000 / frameRate;
            const totalFrames = Math.ceil(totalDuration / frameDelay);

            const addGifFramesAsync = async () => {
                for (let i = 0; i < totalFrames; i++) {
                    const time = i * frameDelay;
                    drawFrame(time);
                    gif.addFrame(ctx, { copy: true, delay: frameDelay });
                    setRenderProgress(((i + 1) / totalFrames) * 100);
                    await new Promise(resolve => setTimeout(resolve, 0)); 
                }
                gif.render();
            }
            addGifFramesAsync();
        }
    } catch (e) {
        setError(`Failed to render file: ${e instanceof Error ? e.message : String(e)}`);
        setIsRendering(null);
        setRenderProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
        <div className="w-full max-w-5xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                    Image Sequence Video Timeline
                </h1>
                <p className="mt-2 text-lg text-gray-400">
                    Visualize your image sequence and timestamps instantly.
                </p>
            </header>

            <main>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <FileUploader
                        id="image-upload"
                        label="Image files (e.g., 1.png, 2.png...)"
                        accept="image/*"
                        multiple={true}
                        onFilesSelected={handleImageSelection}
                        icon={<FilmIcon />}
                    />
                    <FileUploader
                        id="csv-upload"
                        label="CSV file with start times"
                        accept=".csv"
                        multiple={false}
                        onFilesSelected={handleCsvSelection}
                        icon={<CsvIcon />}
                    />
                </div>

                <div className="text-center mb-8">
                    <button
                        onClick={processFiles}
                        disabled={isLoading || imageFiles.length === 0 || !csvFile}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg"
                    >
                        {isLoading ? 'Processing...' : 'Generate Timeline'}
                    </button>
                </div>

                {error && <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative text-center mb-4" role="alert">{error}</div>}
                
                {timelineClips.length > 0 && (
                  <div className="space-y-4">
                      <Preview 
                        clips={timelineClips} 
                        currentTime={currentTime} 
                        totalDuration={totalDuration}
                        zoomEffect={zoomEffect}
                        transitionEffect={transitionEffect}
                      />
                      <Timeline clips={timelineClips} totalDuration={totalDuration} currentTime={currentTime} onTimeChange={handleTimeChange} isPlaying={isPlaying} onPlayPause={handlePlayPause}/>
                      
                      <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
                          <h3 className="text-xl font-semibold mb-4 text-center">Effects & Export</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                              <div>
                                  <label htmlFor="zoom-effect" className="block mb-2 text-sm font-medium text-gray-300">Image Effect</label>
                                  <select id="zoom-effect" value={zoomEffect} onChange={(e) => setZoomEffect(e.target.value as ZoomEffect)} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5">
                                      <option value="none">None</option>
                                      <option value="zoom-in">Zoom In</option>
                                      <option value="zoom-out">Zoom Out</option>
                                      <option value="pan-left">Pan Left</option>
                                      <option value="pan-right">Pan Right</option>
                                      <option value="zoom-in-pan-left">Zoom In & Pan Left</option>
                                      <option value="zoom-in-pan-right">Zoom In & Pan Right</option>
                                      <option value="zoom-out-pan-left">Zoom Out & Pan Left</option>
                                      <option value="zoom-out-pan-right">Zoom Out & Pan Right</option>
                                      <option value="zoom-in-out">Zoom In then Out</option>
                                      <option value="zoom-out-in">Zoom Out then In</option>
                                  </select>
                              </div>
                              <div>
                                  <label htmlFor="transition-effect" className="block mb-2 text-sm font-medium text-gray-300">Transition</label>
                                  <select id="transition-effect" value={transitionEffect} onChange={(e) => setTransitionEffect(e.target.value as TransitionEffect)} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5">
                                      <option value="none">Cut</option>
                                      <option value="crossfade">Crossfade</option>
                                      <option value="fade-to-black">Fade to Black</option>
                                      <option value="wipe-left">Wipe Left</option>
                                      <option value="wipe-right">Wipe Right</option>
                                      <option value="slide-left">Slide Left</option>
                                      <option value="slide-right">Slide Right</option>
                                  </select>
                              </div>
                               <div>
                                  <label htmlFor="export-resolution" className="block mb-2 text-sm font-medium text-gray-300">Export Resolution</label>
                                  <select 
                                      id="export-resolution" 
                                      value={exportResolution} 
                                      onChange={(e) => setExportResolution(e.target.value as 'source' | '1080p' | '720p' | '480p')} 
                                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                                  >
                                      <option value="source">Source (max 1080p)</option>
                                      <option value="1080p">1080p</option>
                                      <option value="720p">720p</option>
                                      <option value="480p">480p</option>
                                  </select>
                              </div>
                          </div>
              
                          <div className="border-t border-gray-700 pt-6">
                              <div className="flex items-center justify-center mb-4">
                                  <input type="checkbox" id="green-screen-checkbox" checked={useGreenScreen} onChange={(e) => setUseGreenScreen(e.target.checked)} className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-600 ring-offset-gray-800 focus:ring-2" />
                                  <label htmlFor="green-screen-checkbox" className="ml-2 text-sm font-medium text-gray-300">Use Green Screen Background</label>
                              </div>
                              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                  <button onClick={() => handleDownload('video')} disabled={!!isRendering} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
                                      <DownloadIcon />
                                      {isRendering === 'video' ? `Rendering... (${Math.round(renderProgress)}%)` : `Download Video (${supportedVideoFormat.extension.toUpperCase()})`}
                                  </button>
                                  <button onClick={() => handleDownload('gif')} disabled={!!isRendering} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
                                      <DownloadIcon />
                                      {isRendering === 'gif' ? `Rendering... (${Math.round(renderProgress)}%)` : 'Download GIF'}
                                  </button>
                              </div>
                              {isRendering && (
                                  <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                                      <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-150" style={{ width: `${renderProgress}%` }}></div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

export default App;