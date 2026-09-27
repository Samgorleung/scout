import React from 'react';
import {
  GlobalLoadingSpinner,
  GlobalLoadingProvider,
  useGlobalLoading,
  Skeleton,
  CardSkeleton,
  ResultsSkeleton,
  TrackerSkeleton,
  AiEvaluationSkeleton,
  LoadingSource,
  LoadingOptions
} from './LoadingSystem';

export interface MagnifyingGlassLoaderProps {
  size?: number;
  label?: string;
  subtext?: string;
  source?: LoadingSource;
}

/**
 * Modernized Executive Loader conforming to the IPA Scout assurance design system.
 */
export const MagnifyingGlassLoader: React.FC<MagnifyingGlassLoaderProps> = ({
  size = 54,
  label = 'Loading Assurance Data...',
  subtext = 'Connecting to project assurance records...',
  source = 'primary' as any
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '260px',
        width: '100%',
        padding: '32px 16px'
      }}
    >
      <GlobalLoadingSpinner
        size={size}
        variant={source === 'gemini' ? 'gemini' : source === 'firebase' ? 'firebase' : 'primary'}
        label={label}
        subtext={subtext}
      />
    </div>
  );
};

export {
  GlobalLoadingSpinner,
  GlobalLoadingProvider,
  useGlobalLoading,
  Skeleton,
  CardSkeleton,
  ResultsSkeleton,
  TrackerSkeleton,
  AiEvaluationSkeleton
};

export type { LoadingSource, LoadingOptions };

export default MagnifyingGlassLoader;
