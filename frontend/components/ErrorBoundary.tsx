import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
import { logger } from '@/utils/logger';

export interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
  componentName?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional custom fallback UI. Can be a ReactNode or a render function receiving FallbackProps.
   */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  /**
   * Optional callback invoked when an error is caught.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Optional callback invoked when the error boundary is reset.
   */
  onReset?: () => void;
  /**
   * Array of values that, when changed, will trigger an automatic reset of the error state.
   * Useful when passing router paths: `resetKeys={[router.asPath]}`.
   */
  resetKeys?: unknown[];
  /**
   * Logical name of the component or module being wrapped (e.g., 'Compliance Tracker', 'Audit Feed').
   */
  componentName?: string;
  /**
   * If true, renders a compact, inline card fallback suitable for isolated dashboard widgets and panels.
   * If false, renders a comprehensive executive view fallback.
   */
  isolate?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

/**
 * Default fallback UI rendered when an unhandled runtime error occurs.
 */
export const DefaultErrorFallback: React.FC<FallbackProps & { isolate?: boolean }> = ({
  error,
  errorInfo,
  resetErrorBoundary,
  componentName,
  isolate = false
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  const errorTitle = componentName
    ? `${componentName} Encountered an Issue`
    : 'Application Component Encountered an Unexpected Issue';

  const handleCopyDetails = async () => {
    try {
      const recentTelemetry = logger.getTelemetryBuffer(8);
      const telemetrySection = recentTelemetry.length > 0
        ? `\n--- Recent Sanitized Telemetry ---\n` + JSON.stringify(recentTelemetry, null, 2)
        : '';

      const diagnostics = [
        `=== IPA Scout Error Report ===`,
        `Timestamp: ${new Date().toISOString()}`,
        `Component: ${componentName || 'Root / Viewport'}`,
        `Error Name: ${error?.name || 'Error'}`,
        `Error Message: ${error?.message || 'Unknown error'}`,
        `\n--- Stack Trace ---`,
        error?.stack || 'No stack trace available',
        `\n--- Component Hierarchy Stack ---`,
        errorInfo?.componentStack || 'No component stack available',
        telemetrySection,
        `==============================`
      ].filter(Boolean).join('\n');

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(diagnostics);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = diagnostics;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy error diagnostics to clipboard', err);
    }
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Compact card fallback for isolated widgets / panels
  if (isolate) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          border: '1px solid #fecaca',
          backgroundColor: '#fff5f5',
          borderRadius: '8px',
          padding: '16px 20px',
          margin: '12px 0',
          boxShadow: '0 1px 3px rgba(239, 68, 68, 0.08)',
          fontFamily: 'inherit'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
              fontWeight: 700
            }}
          >
            !
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#991b1b' }}>
                {errorTitle}
              </h4>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: '#fecaca',
                  color: '#7f1d1d'
                }}
              >
                Runtime Guard
              </span>
            </div>
            <p
              style={{
                margin: '6px 0 12px 0',
                fontSize: '0.825rem',
                color: '#7f1d1d',
                lineHeight: 1.45
              }}
            >
              {error?.message || 'An unexpected runtime error halted rendering in this section. Other tools remain operational.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={resetErrorBoundary}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
              >
                Retry Component
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {showDetails ? 'Hide Diagnostics' : 'View Diagnostics'}
              </button>
            </div>
            {showDetails && (
              <div style={{ marginTop: '12px' }}>
                <pre
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    margin: 0
                  }}
                >
                  {error?.stack || error?.message || 'No stack information.'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full-featured executive view fallback
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        maxWidth: '960px',
        margin: '32px auto',
        padding: '36px 32px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        fontFamily: 'inherit'
      }}
    >
      {/* Top Banner / Status Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)'
          }}
        >
          ⚠
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca'
              }}
            >
              Component Safeguard
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Fault isolation active
            </span>
          </div>
          <h2
            style={{
              margin: '4px 0 0 0',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}
          >
            {errorTitle}
          </h2>
        </div>
      </div>

      {/* Reassurance & Context */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid #0284c7',
          borderRadius: '4px',
          marginBottom: '24px'
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#334155',
            lineHeight: 1.6
          }}
        >
          A runtime exception occurred while processing this component. Data stored in your Firestore audit ledger and database remains protected and unaffected.
        </p>
      </div>

      {/* Error Message Box */}
      <div
        style={{
          backgroundColor: '#fff5f5',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#991b1b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '6px'
          }}
        >
          Error Description
        </div>
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#7f1d1d',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
          }}
        >
          {error?.name || 'Error'}: {error?.message || 'Unknown runtime anomaly.'}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '28px'
        }}
      >
        <button
          type="button"
          onClick={resetErrorBoundary}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1d70b8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#003078')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1d70b8')}
        >
          <span>↻</span>
          <span>Recover Component State</span>
        </button>

        <button
          type="button"
          onClick={handleReload}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          <span>⟳</span>
          <span>Reload Application</span>
        </button>

        <Link href="/" passHref legacyBehavior>
          <a
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 18px',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            ← Return to Overview
          </a>
        </Link>

        <button
          type="button"
          onClick={handleCopyDetails}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
            backgroundColor: copied ? '#ecfdf5' : 'transparent',
            color: copied ? '#059669' : '#64748b',
            border: `1px solid ${copied ? '#a7f3d0' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <span>{copied ? '✓' : '📋'}</span>
          <span>{copied ? 'Diagnostic Details Copied!' : 'Copy Diagnostics'}</span>
        </button>
      </div>

      {/* Collapsible Technical Diagnostics Drawer */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '20px'
        }}
      >
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '8px 0',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#64748b',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <span>{showDetails ? '▼ Hide Diagnostic Stack Trace' : '▶ Show Diagnostic Stack Trace & Component Tree'}</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {showDetails ? 'Collapse' : 'Expand technical telemetry'}
          </span>
        </button>

        {showDetails && (
          <div
            style={{
              marginTop: '12px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                borderBottom: '1px solid #1e293b',
                paddingBottom: '8px'
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Telemetry & Stack Trace
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Captured: {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginBottom: '4px' }}>
                Error Call Stack:
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.775rem',
                  color: '#f87171',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                  maxHeight: '240px'
                }}
              >
                {error?.stack || 'No stack trace available.'}
              </pre>
            </div>

            {errorInfo?.componentStack && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#a78bfa', marginBottom: '4px' }}>
                  React Component Tree Stack:
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto',
                    lineHeight: 1.45,
                    maxHeight: '200px'
                  }}
                >
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Robust React Error Boundary class component.
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a graceful fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Route runtime exception through sanitized telemetry logger
    logger.error(
      `Caught runtime exception in component "${this.props.componentName || 'Unnamed'}"`,
      error,
      { componentStack: errorInfo.componentStack },
      'ui-guard'
    );

    // Invoke optional custom error listener (e.g. telemetry, Sentry, Firestore audit logger)
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (loggingError) {
        logger.warn('Failed to invoke onError handler', loggingError, 'ui-guard');
      }
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // If resetKeys were provided and have changed while in an error state, auto-reset the boundary
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasChanged = resetKeys.some((key, index) => !Object.is(key, prevProps.resetKeys?.[index]));
      if (hasChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    logger.info(`Error boundary state recovered for component "${this.props.componentName || 'Unnamed'}"`, undefined, 'ui-guard');

    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (resetErr) {
        logger.warn('Failed to invoke onReset handler', resetErr, 'ui-guard');
      }
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, componentName, isolate } = this.props;

    if (hasError && error) {
      const fallbackProps: FallbackProps = {
        error,
        errorInfo,
        resetErrorBoundary: this.resetErrorBoundary,
        componentName
      };

      if (typeof fallback === 'function') {
        return fallback(fallbackProps);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetErrorBoundary={this.resetErrorBoundary}
          componentName={componentName}
          isolate={isolate}
        />
      );
    }

    return children;
  }
}

/**
 * Higher-Order Component (HOC) to wrap any React component with an ErrorBoundary.
 *
 * Example:
 *   const SafeComplianceTracker = withErrorBoundary(ComplianceTracker, {
 *     componentName: 'Compliance Tracker',
 *     isolate: true
 *   });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props: P) => {
    return (
      <ErrorBoundary componentName={displayName} {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
