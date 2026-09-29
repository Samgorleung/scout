"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckIcon,
  InfoOutlined as InfoIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckmarkIcon,
  RestartAlt as ResetIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SeverityOptionConfig {
  key: SeverityLevel;
  label: string;
  shortLabel: string;
  dotColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  icon: React.ReactNode;
}

export const SEVERITY_CONFIGS: Record<SeverityLevel, SeverityOptionConfig> = {
  Critical: {
    key: 'Critical',
    label: 'Critical Severity',
    shortLabel: 'Critical',
    dotColor: '#dc2626',
    badgeBg: '#fef2f2',
    badgeBorder: '#fecaca',
    badgeText: '#991b1b',
    description: 'Immediate statutory breach or critical delivery blockers',
    icon: <ErrorIcon style={{ fontSize: '1rem', color: '#dc2626' }} />
  },
  High: {
    key: 'High',
    label: 'High Severity',
    shortLabel: 'High',
    dotColor: '#ea580c',
    badgeBg: '#fff7ed',
    badgeBorder: '#ffedd5',
    badgeText: '#9a3412',
    description: 'Significant assurance non-compliance or heightened risks',
    icon: <WarningIcon style={{ fontSize: '1rem', color: '#ea580c' }} />
  },
  Medium: {
    key: 'Medium',
    label: 'Medium Severity',
    shortLabel: 'Medium',
    dotColor: '#d97706',
    badgeBg: '#fffbeb',
    badgeBorder: '#fde68a',
    badgeText: '#92400e',
    description: 'Standard review findings or items pending clarification',
    icon: <InfoIcon style={{ fontSize: '1rem', color: '#d97706' }} />
  },
  Low: {
    key: 'Low',
    label: 'Low Severity',
    shortLabel: 'Low',
    dotColor: '#059669',
    badgeBg: '#f0fdf4',
    badgeBorder: '#bbf7d0',
    badgeText: '#166534',
    description: 'Minor observation, verified criterion, or routine audit note',
    icon: <CheckIcon style={{ fontSize: '1rem', color: '#059669' }} />
  }
};

export const ALL_SEVERITY_LEVELS: SeverityLevel[] = ['Critical', 'High', 'Medium', 'Low'];

export interface SeverityFilterDropdownProps {
  /**
   * Selected severities in multi-select mode, or single severity string in single-select mode.
   * If array is empty or contains all 4, it represents "All Severities".
   */
  selectedSeverities?: SeverityLevel[];
  onSeveritiesChange?: (severities: SeverityLevel[]) => void;
  
  /**
   * Single-select value fallback (e.g. 'ALL', 'Critical', 'High', 'Medium', 'Low')
   */
  singleSeverity?: string;
  onSingleSeverityChange?: (severity: string) => void;

  /**
   * Counts of items per severity level to display badges
   */
  severityCounts?: Partial<Record<SeverityLevel, number>>;
  
  /**
   * Total items evaluated
   */
  totalCount?: number;

  /**
   * Button title / label
   */
  label?: string;

  /**
   * Layout compact mode
   */
  compact?: boolean;

  /**
   * Optional custom CSS class
   */
  className?: string;
}

export const SeverityFilterDropdown: React.FC<SeverityFilterDropdownProps> = ({
  selectedSeverities,
  onSeveritiesChange,
  singleSeverity,
  onSingleSeverityChange,
  severityCounts = {},
  totalCount,
  label = 'Severity Level',
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active selection mode (multi-select if onSeveritiesChange is provided, otherwise single)
  const isMultiMode = Boolean(onSeveritiesChange);

  // Effective selected severities
  const activeSeverities: SeverityLevel[] = useMemo(() => {
    if (isMultiMode && selectedSeverities !== undefined) {
      return selectedSeverities;
    }
    if (singleSeverity && singleSeverity !== 'ALL') {
      const match = ALL_SEVERITY_LEVELS.find(
        lvl => lvl.toLowerCase() === singleSeverity.toLowerCase()
      );
      return match ? [match] : ALL_SEVERITY_LEVELS;
    }
    return ALL_SEVERITY_LEVELS;
  }, [isMultiMode, selectedSeverities, singleSeverity]);

  const isAllSelected = activeSeverities.length === ALL_SEVERITY_LEVELS.length || activeSeverities.length === 0;

  // Toggle an individual severity in multi-select mode
  const handleToggleSeverity = (level: SeverityLevel) => {
    if (!onSeveritiesChange) {
      if (onSingleSeverityChange) {
        onSingleSeverityChange(singleSeverity === level ? 'ALL' : level);
      }
      return;
    }

    let next: SeverityLevel[];
    if (isAllSelected) {
      // If all are selected, clicking one isolates that single severity
      next = [level];
    } else if (activeSeverities.includes(level)) {
      next = activeSeverities.filter(l => l !== level);
      if (next.length === 0) {
        next = ALL_SEVERITY_LEVELS; // Default to all if everything unselected
      }
    } else {
      next = [...activeSeverities, level];
    }
    onSeveritiesChange(next);
  };

  const handleSelectAll = () => {
    if (onSeveritiesChange) {
      onSeveritiesChange(ALL_SEVERITY_LEVELS);
    } else if (onSingleSeverityChange) {
      onSingleSeverityChange('ALL');
    }
  };

  const handleSelectOnly = (e: React.MouseEvent, level: SeverityLevel) => {
    e.stopPropagation();
    if (onSeveritiesChange) {
      onSeveritiesChange([level]);
    } else if (onSingleSeverityChange) {
      onSingleSeverityChange(level);
    }
  };

  // Button summary text
  const buttonDisplayText = useMemo(() => {
    if (isAllSelected) {
      return 'All Severities';
    }
    if (activeSeverities.length === 1) {
      return `${activeSeverities[0]} Severity`;
    }
    return `${activeSeverities.length} Severities`;
  }, [isAllSelected, activeSeverities]);

  const totalMatchingCount = useMemo(() => {
    if (isAllSelected) {
      return totalCount !== undefined ? totalCount : Object.values(severityCounts).reduce((a, b) => (a || 0) + (b || 0), 0);
    }
    return activeSeverities.reduce((sum, lvl) => sum + (severityCounts[lvl] || 0), 0);
  }, [isAllSelected, totalCount, activeSeverities, severityCounts]);

  return (
    <div
      ref={dropdownRef}
      className={`severity-filter-dropdown ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: compact ? '5px 10px' : '7px 14px',
          backgroundColor: !isAllSelected ? '#f8fafc' : '#ffffff',
          border: '1px solid',
          borderColor: !isAllSelected ? '#1d70b8' : '#cbd5e1',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: !isAllSelected ? '#1d70b8' : '#334155',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(29, 112, 184, 0.12)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          whiteSpace: 'nowrap'
        }}
        title={`Filter findings by severity (${buttonDisplayText})`}
      >
        <FilterIcon style={{ fontSize: '1rem', color: !isAllSelected ? '#1d70b8' : '#64748b' }} />
        
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>{label}:</span>
          <span style={{ fontWeight: 700 }}>{buttonDisplayText}</span>
        </span>

        {/* Selected count badge */}
        {totalMatchingCount !== undefined && totalMatchingCount > 0 && (
          <span
            style={{
              backgroundColor: !isAllSelected ? '#1d70b8' : '#f1f5f9',
              color: !isAllSelected ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700
            }}
          >
            {totalMatchingCount}
          </span>
        )}

        {isOpen ? (
          <ExpandLessIcon style={{ fontSize: '1.1rem', color: '#64748b' }} />
        ) : (
          <ExpandMoreIcon style={{ fontSize: '1.1rem', color: '#64748b' }} />
        )}
      </button>

      {/* Dropdown Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 999,
              minWidth: '280px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
              padding: '8px 0',
              fontFamily: 'inherit'
            }}
            role="listbox"
            aria-label="Severity Filter Options"
          >
            {/* Header & Quick Action Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 14px 8px 14px',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.75rem',
              color: '#64748b'
            }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Filter by Severity
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isAllSelected ? '#94a3b8' : '#1d70b8',
                    cursor: isAllSelected ? 'default' : 'pointer',
                    textDecoration: isAllSelected ? 'none' : 'underline'
                  }}
                  disabled={isAllSelected}
                >
                  Select All
                </button>

                {!isAllSelected && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#dc2626',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Severity Options List */}
            <div style={{ padding: '4px 0' }}>
              {ALL_SEVERITY_LEVELS.map(level => {
                const config = SEVERITY_CONFIGS[level];
                const isSelected = isAllSelected || activeSeverities.includes(level);
                const count = severityCounts[level] !== undefined ? severityCounts[level] : 0;

                return (
                  <div
                    key={level}
                    onClick={() => handleToggleSeverity(level)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(241, 245, 249, 0.6)' : 'transparent',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isSelected ? 'rgba(241, 245, 249, 0.6)' : 'transparent';
                    }}
                  >
                    {/* Left: Checkbox / Icon / Label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Checkbox Icon */}
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `1.5px solid ${isSelected ? config.dotColor : '#cbd5e1'}`,
                          backgroundColor: isSelected ? config.dotColor : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          transition: 'all 0.12s ease',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <CheckmarkIcon style={{ fontSize: '0.85rem' }} />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: config.dotColor
                            }}
                          />
                          <span style={{
                            fontSize: '0.8125rem',
                            fontWeight: isSelected ? 700 : 500,
                            color: '#0f172a'
                          }}>
                            {config.label}
                          </span>
                        </div>
                        <p style={{
                          margin: '2px 0 0 14px',
                          fontSize: '0.7rem',
                          color: '#64748b',
                          lineHeight: 1.2
                        }}>
                          {config.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Count Badge & "Only" shortcut */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {count !== undefined && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: config.badgeBg,
                            color: config.badgeText,
                            border: `1px solid ${config.badgeBorder}`
                          }}
                        >
                          {count}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleSelectOnly(e, level)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 4px',
                          fontSize: '0.65rem',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          borderRadius: '3px',
                          transition: 'color 0.12s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#1d70b8';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                        title={`Show only ${level} findings`}
                      >
                        only
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Notice */}
            <div style={{
              padding: '8px 14px 4px 14px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: '#94a3b8'
            }}>
              <span>Click items to toggle severity filter</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d70b8',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeverityFilterDropdown;
