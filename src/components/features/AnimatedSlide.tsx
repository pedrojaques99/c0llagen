import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimationPreset } from '../../types';

interface AnimatedSlideProps {
  imageUrl: string;
  preset: AnimationPreset;
  zoomScale?: number;
  panAmount?: number;
  speed?: number;
}

export const AnimatedSlide: React.FC<AnimatedSlideProps> = ({ 
  imageUrl, 
  preset,
  zoomScale = 1.2,
  panAmount = 5,
  speed = 1
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const effectiveFrame = frame * speed;

  let style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  switch (preset) {
    case 'zoom-in': {
      const s = interpolate(effectiveFrame, [0, durationInFrames], [1, zoomScale], { extrapolateRight: 'clamp' });
      style.transform = `scale(${s})`;
      break;
    }
    case 'zoom-out': {
      const s = interpolate(effectiveFrame, [0, durationInFrames], [zoomScale, 1], { extrapolateRight: 'clamp' });
      style.transform = `scale(${s})`;
      break;
    }
    case 'pan-lr': {
      const p = interpolate(effectiveFrame, [0, durationInFrames], [-panAmount, panAmount], { extrapolateRight: 'clamp' });
      style.transform = `scale(${zoomScale}) translateX(${p}%)`;
      break;
    }
    case 'pan-rl': {
      const p = interpolate(effectiveFrame, [0, durationInFrames], [panAmount, -panAmount], { extrapolateRight: 'clamp' });
      style.transform = `scale(${zoomScale}) translateX(${p}%)`;
      break;
    }
    case 'fade-in': {
      const o = interpolate(effectiveFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
      style.opacity = o;
      break;
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={imageUrl} style={style} />
    </AbsoluteFill>
  );
};
