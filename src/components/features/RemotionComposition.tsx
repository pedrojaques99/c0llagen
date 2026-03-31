import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { AnimationPreset } from '../../types';

interface RemotionCompositionProps {
  imageUrl: string;
  preset: AnimationPreset;
  zoomScale?: number;
  panAmount?: number;
  speed?: number;
}

export const RemotionComposition: React.FC<RemotionCompositionProps> = (props) => {
  return <AnimatedSlide {...props} />;
};
