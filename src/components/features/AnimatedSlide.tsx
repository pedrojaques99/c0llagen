import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimationPreset } from '../../types';
import { calculateAnimationStyles } from '../../utils/animationUtils';

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

  const { scale, translateX, opacity } = calculateAnimationStyles(
    frame, 
    durationInFrames, 
    preset, 
    { zoomScale, panAmount, speed, durationInSeconds: durationInFrames / 30 }
  );

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    transform: `scale(${scale}) translateX(${translateX}%)`,
    opacity
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={imageUrl} style={style} />
    </AbsoluteFill>
  );
};
