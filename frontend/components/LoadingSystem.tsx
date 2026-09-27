import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type LoadingSource = 'gemini' | 'firebase' | 'general';

export interface LoadingOptions {
  message?: string;
  subtext?: string;
  source?: LoadingSource;
  blocking?: boolean;
}

interface LoadingContextType {
  isLoading: boolean;
  options: LoadingOptions;
  startLoading: (options?: LoadingOptions) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * Hook to trigger and control the global loading state across any page or component.
 */
export const useGlobalLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

// ============================================================================
// 1. Standalone SVG Loading Spinner
// ============================================================================

export interface GlobalLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'primary' | 'gemini' | 'firebase' | 'neutral';
  label?: string;
  subtext?: string;
  inline?: boolean;
}

export const GlobalLoadingSpinner: React.FC<GlobalLoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  label,
  subtext,
  inline = false
}) => {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 22
      : size === 'md'
      ? 36
      : size === 'lg'
      ? 54
      : 72;

  const colorConfig = {
    primary: {
      track: '#e2e8f0',
      head: '#1d70b8',
      headGradientEnd: '#003078',
      accent: '#1d70b8'
    },
    gemini: {
      track: '#ede9fe',
      head: '#8b5cf6',
      headGradientEnd: '#ec4899',
      accent: '#7c3aed'
    },
    firebase: {
      track: '#fef3c7',
      head: '#f59e0b',
      headGradientEnd: '#ea580c',
      accent: '#d97706'
    },
    neutral: {
      track: '#e2e8f0',
      head: '#475569',
      headGradientEnd: '#0f172a',
      accent: '#334155'
    }
  }[variant];

  const strokeWidth = Math.max(3, Math.round(pixelSize / 10));
  const radius = (pixelSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = `spinner-grad-${variant}-${pixelSize}`;

  const spinnerSvg = (
    <div
      style={{
        width: pixelSize,
        height: pixelSize,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox={`0 0 ${pixelSize} ${pixelSize}`}
        style={{
          animation: 'spinSmooth 1s linear infinite'
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorConfig.head} />
            <stop offset="100%" stopColor={colorConfig.headGradientEnd} />
          </linearGradient>
        </defs>
        {/* Background Track */}
        <circle
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          stroke={colorConfig.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Gradient Head */}
        <circle
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.72}
          fill="none"
        />
      </svg>
      {/* Central icon or glowing dot */}
      {pixelSize >= 48 && variant === 'gemini' && (
        <span
          style={{
            position: 'absolute',
            fontSize: pixelSize * 0.32,
            color: '#7c3aed',
            lineHeight: 1
          }}
        >
          ✦
        </span>
      )}
      {pixelSize >= 48 && variant === 'firebase' && (
        <span
          style={{
            position: 'absolute',
            fontSize: pixelSize * 0.28,
            color: '#ea580c',
            lineHeight: 1
          }}
        >
          ⚡
        </span>
      )}
    </div>
  );

  if (inline && !label) {
    return spinnerSvg;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: inline ? 'inline-flex' : 'flex',
        flexDirection: inline ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: inline ? '12px' : '10px',
        textAlign: 'center'
      }}
    >
      {spinnerSvg}
      {(label || subtext) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {label && (
            <span
              style={{
                fontSize: pixelSize <= 28 ? '0.85rem' : '0.95rem',
                fontWeight: 600,
                color: '#0f172a'
              }}
            >
              {label}
            </span>
          )}
          {subtext && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#64748b'
              }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. Global Provider with Intelligent Ambient Overlay
// ============================================================================

export interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<LoadingOptions>({
    message: 'Loading assurance data...',
    source: 'general',
    blocking: true
  });

  const startLoading = useCallback((newOptions?: LoadingOptions) => {
    setOptions({
      message: newOptions?.source === 'gemini'
        ? 'Gemini 2.5 Intelligence Engine is evaluating compliance criteria...'
        : newOptions?.source === 'firebase'
        ? 'Synchronizing assurance records with Cloud Firestore...'
        : 'Processing request...',
      source: 'general',
      blocking: true,
      ...newOptions
    });
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const { source = 'general', message, subtext, blocking = true } = options;

  return (
    <LoadingContext.Provider value={{ isLoading, options, startLoading, stopLoading }}>
      {children}

      {/* Global Executive Overlay */}
      {isLoading && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={message || 'Loading'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: blocking ? 'rgba(15, 23, 42, 0.45)' : 'transparent',
            backdropFilter: blocking ? 'blur(4px)' : 'none',
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: blocking ? 'auto' : 'none'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px 36px',
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              pointerEvents: 'auto'
            }}
          >
            {/* Top Source Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                backgroundColor:
                  source === 'gemini'
                    ? '#f5f3ff'
                    : source === 'firebase'
                    ? '#fffbeb'
                    : '#f0fdf4',
                color:
                  source === 'gemini'
                    ? '#7c3aed'
                    : source === 'firebase'
                    ? '#d97706'
                    : '#15803d',
                border: `1px solid ${
                  source === 'gemini'
                    ? '#ddd6fe'
                    : source === 'firebase'
                    ? '#fde68a'
                    : '#bbf7d0'
                }`
              }}
            >
              <span>{source === 'gemini' ? '✦' : source === 'firebase' ? '⚡' : '●'}</span>
              <span>
                {source === 'gemini'
                  ? 'Gemini 2.5 Flash Engine'
                  : source === 'firebase'
                  ? 'Cloud Firestore Live Ledger'
                  : 'IPA Gateway Assurance'}
              </span>
            </div>

            {/* Spinner */}
            <GlobalLoadingSpinner
              size={54}
              variant={source === 'gemini' ? 'gemini' : source === 'firebase' ? 'firebase' : 'primary'}
            />

            {/* Main Message */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.01em'
                }}
              >
                {message || 'Processing assurance request...'}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  lineHeight: 1.5
                }}
              >
                {subtext || (source === 'gemini'
                  ? 'Grounding project documentation against HM Treasury Green Book criteria...'
                  : source === 'firebase'
                  ? 'Establishing secure bi-directional synchronization with project database...'
                  : 'Please wait while current audit records are being validated.')}
              </p>
            </div>

            {/* Non-blocking Dismiss Control */}
            <button
              type="button"
              onClick={stopLoading}
              style={{
                marginTop: '6px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'color 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#475569')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              Dismiss Overlay
            </button>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

// ============================================================================
// 3. Atomic Skeleton Primitive
// ============================================================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: 'default' | 'gemini';
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  variant = 'default',
  className = '',
  style = {}
}) => {
  return (
    <div
      aria-hidden="true"
      className={`${variant === 'gemini' ? 'skeleton-shimmer-gemini' : 'skeleton-shimmer'} ${className}`}
      style={{
        width,
        height,
        borderRadius,
        display: 'block',
        ...style
      }}
    />
  );
};

// ============================================================================
// 4. Domain-Specific Skeleton Screens
// ============================================================================

/**
 * Metric Card Skeleton for Portfolio Dashboard
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
        gap: '16px',
        width: '100%',
        margin: '16px 0'
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="45%" height="14px" />
            <Skeleton width="28px" height="28px" borderRadius="50%" />
          </div>
          <Skeleton width="60%" height="32px" borderRadius="8px" />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Skeleton width="25%" height="12px" />
            <Skeleton width="40%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Review Findings Skeleton for Results Page
 */
export const ResultsSkeleton: React.FC = () => {
  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 0', width: '100%' }}>
      {/* Header bar skeleton */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton width="220px" height="14px" />
        <Skeleton width="420px" height="32px" borderRadius="8px" />
        <Skeleton width="65%" height="18px" />
      </div>

      {/* Metric summary pills */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <Skeleton width="140px" height="38px" borderRadius="20px" />
        <Skeleton width="140px" height="38px" borderRadius="20px" />
        <Skeleton width="140px" height="38px" borderRadius="20px" />
        <Skeleton width="180px" height="38px" borderRadius="20px" style={{ marginLeft: 'auto' }} />
      </div>

      {/* Review items card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Skeleton width="80px" height="22px" borderRadius="12px" />
                  <Skeleton width="120px" height="22px" borderRadius="12px" />
                </div>
                <Skeleton width="85%" height="22px" />
              </div>
              <Skeleton width="110px" height="34px" borderRadius="6px" />
            </div>

            <Skeleton width="100%" height="48px" borderRadius="6px" />

            <div style={{ display: 'flex', gap: '16px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <Skeleton width="160px" height="14px" />
              <Skeleton width="140px" height="14px" />
              <Skeleton width="120px" height="14px" style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Compliance Requirements Tracker Skeleton
 */
export const TrackerSkeleton: React.FC = () => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter and Controls Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="110px" height="34px" borderRadius="6px" />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Skeleton width="70%" height="40px" borderRadius="6px" />
          <Skeleton width="15%" height="40px" borderRadius="6px" />
          <Skeleton width="15%" height="40px" borderRadius="6px" />
        </div>
      </div>

      {/* Requirement Items Table / Rows */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <Skeleton width="80px" height="16px" />
          <Skeleton width="40%" height="16px" />
          <Skeleton width="15%" height="16px" />
          <Skeleton width="15%" height="16px" />
          <Skeleton width="10%" height="16px" style={{ marginLeft: 'auto' }} />
        </div>

        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div
            key={row}
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <Skeleton width="65px" height="20px" borderRadius="4px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="75%" height="18px" />
              <Skeleton width="45%" height="12px" />
            </div>
            <Skeleton width="110px" height="26px" borderRadius="13px" />
            <Skeleton width="80px" height="26px" borderRadius="13px" />
            <Skeleton width="90px" height="32px" borderRadius="6px" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * AI Compliance Evaluation Skeleton (Gemini)
 */
export const AiEvaluationSkeleton: React.FC<{ prompt?: string }> = ({
  prompt = 'Analyzing HM Treasury Gateway criteria...'
}) => {
  return (
    <div
      style={{
        backgroundColor: '#faf5ff',
        border: '1px solid #e9d5ff',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#f3e8ff',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700
          }}
        >
          ✦
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Gemini AI Autonomous Evaluation
            </span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#a855f7',
                animation: 'pulseGlow 1.2s infinite'
              }}
            />
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#4c1d95' }}>
            {prompt}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton variant="gemini" width="95%" height="16px" />
        <Skeleton variant="gemini" width="88%" height="16px" />
        <Skeleton variant="gemini" width="92%" height="16px" />
        <Skeleton variant="gemini" width="60%" height="16px" />
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '14px 18px',
          border: '1px solid #f3e8ff',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <Skeleton variant="gemini" width="160px" height="14px" />
        <Skeleton variant="gemini" width="75%" height="14px" />
      </div>
    </div>
  );
};
