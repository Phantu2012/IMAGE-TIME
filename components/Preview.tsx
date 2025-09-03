



import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TimelineClip, ZoomEffect, TransitionEffect } from '../types';

interface PreviewProps {
  clips: TimelineClip[];
  currentTime: number; // in milliseconds
  totalDuration: number;
  zoomEffect: ZoomEffect;
  transitionEffect: TransitionEffect;
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

// Image preloader hook
const useImagePreloader = (clipSrcs: string[]) => {
    const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        let isCancelled = false;
        const imagePromises = clipSrcs.map(src => {
            return new Promise<[string, HTMLImageElement]>((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve([src, img]);
                img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            });
        });

        Promise.all(imagePromises)
            .then(loadedImages => {
                if (!isCancelled) {
                    setImages(new Map(loadedImages));
                    setIsLoading(false);
                }
            })
            .catch(error => {
                console.error("Image preloading failed:", error);
                if (!isCancelled) setIsLoading(false);
            });
        
        return () => {
            isCancelled = true;
        };
    }, [clipSrcs]);

    return { images, isLoading };
};

export const Preview: React.FC<PreviewProps> = ({ clips, currentTime, totalDuration, zoomEffect, transitionEffect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const clipSrcs = useMemo(() => clips.map(c => c.src), [clips]);
  const { images, isLoading } = useImagePreloader(clipSrcs);

  // FIX: Removed incorrect `requestAnimationFrame` loop and unused `animationFrameRef`.
  // The component now correctly redraws the canvas only when its props (like `currentTime`) change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLoading || images.size === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Dynamic sizing
    const parent = canvas.parentElement;
    if (parent) {
        const { width } = parent.getBoundingClientRect();
        if (canvas.width !== width) {
            const aspectRatio = 16 / 9;
            canvas.width = width;
            canvas.height = width / aspectRatio;
        }
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const transitionDuration = transitionEffect !== 'none' ? Math.min(500, ...clips.map(c => c.duration / 2)) : 0;
    
    let currentClip = clips.find(c => currentTime >= c.start && currentTime < c.end);
    // Handle edge case where currentTime is exactly totalDuration
    if (!currentClip && currentTime === totalDuration && clips.length > 0) {
        currentClip = clips[clips.length - 1];
    }

    if (!currentClip) {
        ctx.save();
        ctx.fillStyle = '#4A5568'; // gray-600
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText('Timeline Preview', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px sans-serif';
        ctx.fillText('Scrub the timeline below to see the images.', canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
        return;
    }
    
    const drawImageWithEffect = (img: HTMLImageElement, clip: TimelineClip, time: number, alpha: number = 1, offsetX: number = 0) => {
         if (!img) return;

         ctx.save();
         ctx.globalAlpha = alpha;
         
         const progress = Math.max(0, Math.min(1, (time - clip.start) / clip.duration));

         const canvasAspect = canvas.width / canvas.height;
         const imageAspect = img.naturalWidth / img.naturalHeight;

         let baseScale: number;
         if (zoomEffect === 'none') {
             // Letterbox/Pillarbox (object-contain)
             if (canvasAspect > imageAspect) {
                 baseScale = canvas.height / img.naturalHeight;
             } else {
                 baseScale = canvas.width / img.naturalWidth;
             }
         } else {
             // Fill the frame for effects (object-cover)
             if (canvasAspect > imageAspect) {
                 baseScale = canvas.width / img.naturalWidth;
             } else {
                 baseScale = canvas.height / img.naturalHeight;
             }
         }
         
         let zoom = 1.0;
         let panX = 0;

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

    const currentClipIndex = clips.findIndex(c => c.id === currentClip!.id);
    const nextClip = clips[currentClipIndex + 1];
    const currentImage = images.get(currentClip.src);

    const isInTransition = nextClip && transitionDuration > 0 && currentTime > currentClip.end - transitionDuration;
    
    if (isInTransition) {
        const transitionProgress = (currentTime - (currentClip.end - transitionDuration)) / transitionDuration;
        const nextImage = images.get(nextClip.src);

        switch (transitionEffect) {
            case 'crossfade':
                if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime, 1 - transitionProgress);
                if (nextImage) drawImageWithEffect(nextImage, nextClip, currentTime, transitionProgress);
                break;
            case 'fade-to-black':
                if (transitionProgress < 0.5) {
                    if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime, 1 - (transitionProgress * 2));
                } else {
                    if (nextImage) drawImageWithEffect(nextImage, nextClip, currentTime, (transitionProgress - 0.5) * 2);
                }
                break;
            case 'wipe-left':
                if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime);
                if (nextImage) {
                    ctx.save();
                    const wipeX = canvas.width * (1 - transitionProgress);
                    ctx.beginPath();
                    ctx.rect(wipeX, 0, canvas.width - wipeX, canvas.height);
                    ctx.clip();
                    drawImageWithEffect(nextImage, nextClip, currentTime);
                    ctx.restore();
                }
                break;
            case 'wipe-right':
                if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime);
                if (nextImage) {
                    ctx.save();
                    const wipeWidth = canvas.width * transitionProgress;
                    ctx.beginPath();
                    ctx.rect(0, 0, wipeWidth, canvas.height);
                    ctx.clip();
                    drawImageWithEffect(nextImage, nextClip, currentTime);
                    ctx.restore();
                }
                break;
            case 'slide-left':
                if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime, 1, -canvas.width * transitionProgress);
                if (nextImage) drawImageWithEffect(nextImage, nextClip, currentTime, 1, canvas.width * (1 - transitionProgress));
                break;
            case 'slide-right':
                if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime, 1, canvas.width * transitionProgress);
                if (nextImage) drawImageWithEffect(nextImage, nextClip, currentTime, 1, -canvas.width * (1 - transitionProgress));
                break;
            default: // 'none'
                if (currentImage) drawImageWithEffect(currentImage, currentClip, currentTime);
                break;
        }
    } else {
        if (currentImage) {
            drawImageWithEffect(currentImage, currentClip, currentTime, 1);
        }
    }
  }, [clips, currentTime, totalDuration, zoomEffect, transitionEffect, images, isLoading]);


  return (
    <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-700 relative shadow-lg">
      <canvas ref={canvasRef} className="w-full h-full" />
      {isLoading && clips.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
            <p className="text-lg">Loading images...</p>
        </div>
      )}
       {!isLoading && clips.length === 0 && (
        <div className="text-gray-500 text-center p-4">
          <h3 className="text-2xl font-bold">Timeline Preview</h3>
          <p>Scrub the timeline below to see the images.</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded z-20">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </div>
    </div>
  );
};