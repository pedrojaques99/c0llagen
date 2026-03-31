export type AnimationPreset = 'zoom-in' | 'zoom-out' | 'pan-lr' | 'pan-rl' | 'fade-in';

export interface CroppedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  upscaledUrl?: string;
  isUpscaling: boolean;
  upscaleStartTime?: number;
  videoUrl?: string;
  isAnimating: boolean;
  animationStartTime?: number;
  animationPrompt?: string;
  suggestedPreset?: AnimationPreset;
}

export type Theme = 'light' | 'dark';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ExportStatus = 'idle' | 'rendering' | 'completed' | 'error';

export interface BatchRenderItem {
  id: string;
  url: string;
  preset: AnimationPreset;
  status: ExportStatus;
  progress: number;
  videoUrl?: string;
  blob?: Blob;
  zoomScale?: number;
  panAmount?: number;
  speed?: number;
  durationInSeconds?: number;
}

export type TransitionType = 'fade' | 'slide' | 'wipe' | 'none';

export interface RenderSlide {
  imageUrl: string;
  preset: AnimationPreset;
  durationInSeconds: number;
  width: number;
  height: number;
  zoomScale?: number;
  panAmount?: number;
  speed?: number;
}

export interface RenderComposition {
  id: string;
  slides: RenderSlide[];
  fps: number;
  transition: TransitionType;
  transitionDurationFrames: number;
}

export type RenderJobStatus = 'queued' | 'rendering' | 'completed' | 'cancelled' | 'error';

export interface RenderJob {
  id: string;
  composition: RenderComposition;
  status: RenderJobStatus;
  progress: number;
  blob: Blob | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}
