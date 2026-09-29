"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sync as SyncIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  CheckCircleOutline as CheckIcon
} from '@mui/icons-material';

export interface AutoRefreshToggleProps {
  intervalSeconds?: number;
  onPoll: () => Promise<{ newCount?: number } | void> | void;
  className?: string;
  storageKey?: string;
  initialEnabled?: boolean;
  compact?: boolean;
  label?: string;
  style?: React.CSSProperties;
}

export const AutoRefreshToggle: React.FC<AutoRefreshToggleProps> = ({
  intervalSeconds = 30,
  onPoll,
  className = '',
  storageKey = 'ipa_scout_auto_refresh_enabled',
  initialEnabled = true,
  compact = false,
  label = 'Auto-Refresh (30s)',
  style = {}
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(initialEnabled);
  const [countdown, setCountdown] = useState<number>(intervalSeconds);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastPolledTime, setLastPolledTime] = useState<string>('');
  const [recentUpdateNotice, setRecentUpdateNotice] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setIsEnabled(saved === 'true');
      }
    } catch {
      // Ignore storage errors
    }
    setLastPolledTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [storageKey]);

  // Execute manual or scheduled poll
  const triggerPoll = useCallback(async (isManual = false) => {
    setIsPolling(true);
    try {
      const result = await onPollRef.current();
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastPolledTime(nowStr);
      setCountdown(intervalSeconds);

      if (result && typeof result === 'object' && 'newCount' in result && (result.newCount ?? 0) > 0) {
        setRecentUpdateNotice(`+${result.newCount} new`);
        setTimeout(() => setRecentUpdateNotice(null), 4000);
      } else if (isManual) {
        setRecentUpdateNotice('Updated');
        setTimeout(() => setRecentUpdateNotice(null), 2500);
      }
    } catch (err) {
      console.warn('[AutoRefreshToggle] Polling notice:', err);
    } finally {
      setTimeout(() => {
        setIsPolling(false);
      }, 400);
    }
  }, [intervalSeconds]);

  // Handle 30s Interval Timer safely without invoking callbacks inside state updaters
  useEffect(() => {
    if (!isEnabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    let remaining = intervalSeconds;
    setCountdown(intervalSeconds);

    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = intervalSeconds;
        setCountdown(intervalSeconds);
        // Dispatch poll asynchronously outside of render cycle
        setTimeout(() => {
          triggerPoll(false);
        }, 0);
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    timerRef.current = intervalId;

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isEnabled, intervalSeconds, triggerPoll]);

  const handleToggle = () => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Fallback
      }
      if (next) {
        setCountdown(intervalSeconds);
      }
      return next;
    });
  };

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerPoll(true);
  };

  return (
    <div
      className={`auto-refresh-toggle-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '10px',
        padding: compact ? '4px 8px' : '5px 12px',
        backgroundColor: isEnabled ? '#f8fafc' : '#ffffff',
        border: `1px solid ${isEnabled ? '#cbd5e1' : '#e2e8f0'}`,
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#0f172a',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      {/* Switch Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        onClick={handleToggle}
        title={isEnabled ? `Auto-refresh active (polls every ${intervalSeconds}s). Click to pause.` : `Auto-refresh paused. Click to enable 30s polling.`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          fontFamily: 'inherit'
        }}
      >
        {/* Toggle Pill Track */}
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            width: compact ? '28px' : '32px',
            height: compact ? '16px' : '18px',
            backgroundColor: isEnabled ? '#1d70b8' : '#cbd5e1',
            borderRadius: '9999px',
            transition: 'background-color 0.2s ease',
            flexShrink: 0
          }}
        >
          {/* Thumb */}
          <span
            style={{
              position: 'absolute',
              top: '2px',
              left: isEnabled ? (compact ? '14px' : '16px') : '2px',
              width: compact ? '12px' : '14px',
              height: compact ? '12px' : '14px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              transition: 'left 0.2s ease'
            }}
          />
        </span>

        {/* Status Dot & Label */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isEnabled ? '#10b981' : '#94a3b8',
              boxShadow: isEnabled ? '0 0 6px #10b981' : 'none',
              animation: isEnabled ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
            }}
          />
          <span>{label}</span>
        </span>
      </button>

      {/* Countdown Timer or Status Badge */}
      {isEnabled ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            fontSize: '0.7rem',
            fontWeight: 700,
            fontFamily: 'monospace'
          }}
          title={`Next automated poll in ${countdown} seconds`}
        >
          {countdown}s
        </span>
      ) : (
        <span
          style={{
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            fontSize: '0.65rem',
            fontWeight: 600
          }}
        >
          PAUSED
        </span>
      )}

      {/* Manual Refresh Action Button */}
      <button
        type="button"
        onClick={handleManualRefresh}
        disabled={isPolling}
        aria-label="Poll audit logs immediately"
        title={lastPolledTime ? `Last polled at ${lastPolledTime}. Click to poll now.` : 'Click to poll audit log source now'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: isPolling ? '#1d70b8' : '#475569',
          cursor: isPolling ? 'wait' : 'pointer',
          padding: 0,
          transition: 'all 0.15s ease'
        }}
      >
        <SyncIcon
          style={{
            fontSize: '0.85rem',
            animation: isPolling ? 'spin 0.6s linear infinite' : 'none'
          }}
        />
      </button>

      {/* Notice Tag if new findings detected */}
      {recentUpdateNotice && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontSize: '0.65rem',
            fontWeight: 700,
            border: '1px solid #86efac'
          }}
        >
          <CheckIcon style={{ fontSize: '0.75rem' }} />
          {recentUpdateNotice}
        </span>
      )}

      {/* Timestamp tooltip for hover */}
      {!compact && lastPolledTime && (
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
          {lastPolledTime}
        </span>
      )}
    </div>
  );
};

export default AutoRefreshToggle;
