import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { logger } from '@/utils/logger';

export interface ConnectivityState {
  isOnline: boolean;
  isChecking: boolean;
  reconnected: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<boolean>;
  bannerDismissed: boolean;
  dismissBanner: () => void;
}

const ConnectivityContext = createContext<ConnectivityState | undefined>(undefined);

export const useConnectivity = (): ConnectivityState => {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
};

// ============================================================================
// 1. Connectivity Provider
// ============================================================================

export interface ConnectivityProviderProps {
  children: ReactNode;
}

export const ConnectivityProvider: React.FC<ConnectivityProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [reconnected, setReconnected] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const reconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performHealthPing = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // Direct fast health check to verify real HTTP round-trip
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const online = res.status >= 200 && res.status < 400;
      setLastChecked(new Date());
      setIsChecking(false);
      return online;
    } catch {
      setLastChecked(new Date());
      setIsChecking(false);
      return false;
    }
  }, []);

  const handleBackOnline = useCallback(() => {
    setIsOnline(true);
    setBannerDismissed(false);
    setReconnected(true);

    logger.info(
      'Network connectivity restored. Cloud Firestore synchronized.',
      { timestamp: new Date().toISOString() },
      'network'
    );

    if (reconnectedTimeoutRef.current) {
      clearTimeout(reconnectedTimeoutRef.current);
    }

    reconnectedTimeoutRef.current = setTimeout(() => {
      setReconnected(false);
    }, 4500);
  }, []);

  const handleGoOffline = useCallback(() => {
    setIsOnline(false);
    setBannerDismissed(false);
    setReconnected(false);

    logger.warn(
      'Network connectivity lost. Local assurance cache active.',
      { timestamp: new Date().toISOString() },
      'network'
    );
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const isApiOnline = await performHealthPing();
    const resolvedOnline = isApiOnline || (typeof navigator !== 'undefined' ? navigator.onLine : true);

    if (resolvedOnline !== isOnline) {
      if (resolvedOnline) {
        handleBackOnline();
      } else {
        handleGoOffline();
      }
    }
    return resolvedOnline;
  }, [isOnline, performHealthPing, handleBackOnline, handleGoOffline]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize from browser navigator
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const onOnlineEvent = async () => {
      // Double check with ping
      const verified = await performHealthPing();
      if (verified) {
        handleBackOnline();
      } else {
        setIsOnline(false);
      }
    };

    const onOfflineEvent = () => {
      handleGoOffline();
    };

    window.addEventListener('online', onOnlineEvent);
    window.addEventListener('offline', onOfflineEvent);

    return () => {
      window.removeEventListener('online', onOnlineEvent);
      window.removeEventListener('offline', onOfflineEvent);
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }
    };
  }, [handleBackOnline, handleGoOffline, performHealthPing]);

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        isChecking,
        reconnected,
        lastChecked,
        checkConnection,
        bannerDismissed,
        dismissBanner
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};

// ============================================================================
// 2. Connectivity Header Badge (Pill with Tooltip / Popover)
// ============================================================================

export const ConnectivityHeaderBadge: React.FC = () => {
  const { isOnline, isChecking, checkConnection, lastChecked } = useConnectivity();
  const [openPopover, setOpenPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenPopover(false);
      }
    };
    if (openPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopover]);

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpenPopover(!openPopover)}
        aria-expanded={openPopover}
        aria-label={`Connectivity Status: ${isOnline ? 'Online' : 'Offline'}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          backgroundColor: isOnline
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(239, 68, 68, 0.18)',
          border: `1px solid ${
            isOnline ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.45)'
          }`,
          borderRadius: '9999px',
          color: isOnline ? '#34d399' : '#fca5a5',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = isOnline
            ? 'rgba(16, 185, 129, 0.22)'
            : 'rgba(239, 68, 68, 0.28)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = isOnline
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(239, 68, 68, 0.18)';
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10b981' : '#ef4444',
            boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            display: 'inline-block'
          }}
        />
        <span>{isOnline ? 'Online' : 'Offline'}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>
          {openPopover ? '▲' : '▼'}
        </span>
      </button>

      {/* Popover Card */}
      {openPopover && (
        <div
          role="dialog"
          aria-label="Connectivity Details"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '300px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            zIndex: 1100,
            color: '#f8fafc',
            fontFamily: 'inherit',
            fontSize: '0.8125rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              Network & Database Status
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: isOnline ? '#064e3b' : '#7f1d1d',
                color: isOnline ? '#6ee7b7' : '#fca5a5'
              }}
            >
              {isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Database Ledger:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Cloud Firestore</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Sync Mode:</span>
              <span style={{ color: isOnline ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                {isOnline ? 'Real-time WebSocket' : 'Local IndexedDB Cache'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Status Checked:</span>
              <span style={{ color: '#cbd5e1' }}>
                {lastChecked ? lastChecked.toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={async () => {
                await checkConnection();
              }}
              disabled={isChecking}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: isChecking ? 'wait' : 'pointer'
              }}
            >
              <span>{isChecking ? '↻ Pinging...' : '↻ Test Network'}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenPopover(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. Global Offline & Reconnection Notice Banner
// ============================================================================

export const OfflineNoticeBanner: React.FC = () => {
  const { isOnline, reconnected, bannerDismissed, dismissBanner, checkConnection, isChecking } = useConnectivity();

  // 1. Reconnected celebratory notification
  if (reconnected && isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'sticky',
          top: 64,
          left: 0,
          width: '100%',
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          animation: 'shimmerWave 2s infinite',
          zIndex: 995
        }}
      >
        <span style={{ fontSize: '1rem' }}>✓</span>
        <span>Connection Restored — Cloud Firestore synchronized successfully.</span>
        <button
          type="button"
          onClick={dismissBanner}
          style={{
            background: 'none',
            border: 'none',
            color: '#a7f3d0',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginLeft: '8px',
            textDecoration: 'underline'
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // 2. Active Offline Banner
  if (!isOnline && !bannerDismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: 'sticky',
          top: 64,
          left: 0,
          width: '100%',
          backgroundColor: '#7f1d1d',
          color: '#ffffff',
          borderBottom: '2px solid #b91c1c',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.85rem',
          zIndex: 995,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              flexShrink: 0
            }}
          >
            !
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fee2e2' }}>
                Offline Mode Active
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#991b1b',
                  color: '#fecaca',
                  border: '1px solid #ef4444'
                }}
              >
                Local Cache Engaged
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.4 }}>
              Your device is currently disconnected from the network. Cached assurance criteria and review findings remain available. Any checklist modifications will queue and sync with Cloud Firestore once you reconnect.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={async () => {
              await checkConnection();
            }}
            disabled={isChecking}
            style={{
              backgroundColor: '#ffffff',
              color: '#991b1b',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isChecking ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)'
            }}
          >
            {isChecking ? 'Checking...' : 'Check Connection'}
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#fee2e2',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
};
