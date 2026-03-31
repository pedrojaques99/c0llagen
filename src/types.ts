export type AnimationPreset = 'zoom-in' | 'zoom-out' | 'pan-lr' | 'pan-rl' | 'fade-in';

export interface CroppedImage {
  id: string;
  url: string;
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
