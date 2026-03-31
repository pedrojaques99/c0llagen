import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Video, Maximize2, Film, Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Timer } from '../ui/Timer';

interface HeaderProps {
  onReset: () => void;
  onUpscaleSourceClick: () => void;
  isUpscalingSource: boolean;
  upscaleStartTime: number | null;
  onFrameAnimateClick: () => void;
  sourceImage: string | null;
  hasCroppedImages: boolean;
  onCreateFullVideo: () => void;
  isCreatingFullVideo: boolean;
  fullVideoStartTime: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onUpscaleSourceClick,
  isUpscalingSource,
  upscaleStartTime,
  onFrameAnimateClick,
  sourceImage,
  hasCroppedImages,
  onCreateFullVideo,
  isCreatingFullVideo,
  fullVideoStartTime,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between glass px-8 py-4 rounded-[2.5rem] border-white/10 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onReset}>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">C0LLAGEN</h1>
            </div>
          </div>

          {sourceImage && (
            <div className="h-8 w-[1px] bg-white/10" />
          )}

          <div className="flex items-center gap-3">
            {sourceImage && !hasCroppedImages && (
              <>
                <Button 
                  onClick={onUpscaleSourceClick}
                  disabled={isUpscalingSource}
                  variant="secondary"
                  size="sm"
                  icon={isUpscalingSource ? <Loader2 className="animate-spin" size={16} /> : <Maximize2 size={16} strokeWidth={1.5} />}
                >
                  {isUpscalingSource ? (
                    <div className="flex items-center gap-2">
                      <span>Upscaling</span>
                      {upscaleStartTime && <Timer startTime={upscaleStartTime} />}
                    </div>
                  ) : "Upscale 4K"}
                </Button>

                <Button 
                  onClick={onFrameAnimateClick}
                  variant="secondary"
                  size="sm"
                  icon={<Video size={16} strokeWidth={1.5} />}
                >
                  Frame Animation
                </Button>
              </>
            )}

            {hasCroppedImages && (
              <Button 
                onClick={onCreateFullVideo}
                disabled={isCreatingFullVideo}
                variant="primary"
                size="sm"
                icon={isCreatingFullVideo ? <Loader2 className="animate-spin" size={16} /> : <Film size={16} strokeWidth={1.5} />}
              >
                {isCreatingFullVideo ? (
                  <div className="flex items-center gap-2">
                    <span>Creating Video</span>
                    {fullVideoStartTime && <Timer startTime={fullVideoStartTime} />}
                  </div>
                ) : "Create Full Video"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
        </div>
      </div>
    </header>
  );
};
