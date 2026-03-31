import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { RenderSlide, TransitionType, AnimationPreset } from '../../types';

interface SlideFrameProps {
  imageUrl: string;
  preset: AnimationPreset;
}

const SlideFrame: React.FC<SlideFrameProps> = ({ imageUrl, preset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  switch (preset) {
    case 'zoom-in': {
      const s = interpolate(frame, [0, durationInFrames], [1, 1.2], { extrapolateRight: 'clamp' });
      style.transform = `scale(${s})`;
      break;
    }
    case 'zoom-out': {
      const s = interpolate(frame, [0, durationInFrames], [1.2, 1], { extrapolateRight: 'clamp' });
      style.transform = `scale(${s})`;
      break;
    }
    case 'pan-lr': {
      const p = interpolate(frame, [0, durationInFrames], [-5, 5], { extrapolateRight: 'clamp' });
      style.transform = `scale(1.1) translateX(${p}%)`;
      break;
    }
    case 'pan-rl': {
      const p = interpolate(frame, [0, durationInFrames], [5, -5], { extrapolateRight: 'clamp' });
      style.transform = `scale(1.1) translateX(${p}%)`;
      break;
    }
    case 'fade-in': {
      const o = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
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

function getPresentation(transition: TransitionType) {
  switch (transition) {
    case 'fade': return fade();
    case 'slide': return slide({ direction: 'from-right' });
    case 'wipe': return wipe();
    default: return fade();
  }
}

export interface MultiSlideCompositionProps {
  slides: RenderSlide[];
  transition: TransitionType;
  transitionDurationFrames: number;
  fps: number;
}

export const MultiSlideComposition: React.FC<MultiSlideCompositionProps> = ({
  slides,
  transition,
  transitionDurationFrames,
  fps,
}) => {
  if (slides.length === 1) {
    return <SlideFrame imageUrl={slides[0].imageUrl} preset={slides[0].preset} />;
  }

  return (
    <TransitionSeries>
      {slides.map((s, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={Math.round(s.durationInSeconds * fps)}>
            <SlideFrame imageUrl={s.imageUrl} preset={s.preset} />
          </TransitionSeries.Sequence>
          {i < slides.length - 1 && transition !== 'none' && (
            <TransitionSeries.Transition
              presentation={getPresentation(transition)}
              timing={linearTiming({ durationInFrames: transitionDurationFrames })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
