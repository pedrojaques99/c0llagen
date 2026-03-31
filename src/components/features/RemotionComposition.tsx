import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { AnimationPreset } from '../../types';

interface RemotionCompositionProps {
  imageUrl: string;
  preset: AnimationPreset;
}

export const RemotionComposition: React.FC<RemotionCompositionProps> = ({ imageUrl, preset }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  let style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  switch (preset) {
    case 'zoom-in':
      const scaleIn = interpolate(frame, [0, durationInFrames], [1, 1.2], {
        extrapolateRight: 'clamp',
      });
      style.transform = `scale(${scaleIn})`;
      break;
    case 'zoom-out':
      const scaleOut = interpolate(frame, [0, durationInFrames], [1.2, 1], {
        extrapolateRight: 'clamp',
      });
      style.transform = `scale(${scaleOut})`;
      break;
    case 'pan-lr':
      const panLR = interpolate(frame, [0, durationInFrames], [-5, 5], {
        extrapolateRight: 'clamp',
      });
      style.transform = `scale(1.1) translateX(${panLR}%)`;
      break;
    case 'pan-rl':
      const panRL = interpolate(frame, [0, durationInFrames], [5, -5], {
        extrapolateRight: 'clamp',
      });
      style.transform = `scale(1.1) translateX(${panRL}%)`;
      break;
    case 'fade-in':
      const opacity = interpolate(frame, [0, 15], [0, 1], {
        extrapolateRight: 'clamp',
      });
      style.opacity = opacity;
      break;
  }

  return (
    <AbsoluteFill className="bg-ink overflow-hidden">
      <img 
        src={imageUrl} 
        style={style} 
        alt="Animated content"
        referrerPolicy="no-referrer"
      />
    </AbsoluteFill>
  );
};
