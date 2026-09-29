"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector
} from 'recharts';
import {
  PieChart as PieChartIcon,
  DonutLarge as DonutIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckIcon,
  InfoOutlined as InfoIcon,
  RestartAlt as ResetIcon,
  TouchApp as TouchAppIcon,
  FilterAlt as FilterAltIcon,
  Assessment as AssessmentIcon,
  ShieldOutlined as ShieldIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import {
  SeverityLevel,
  ALL_SEVERITY_LEVELS,
  SEVERITY_CONFIGS
} from './SeverityFilterDropdown';
import { ComplianceRequirementItem, initialComplianceRequirements } from '@/lib/seedData';

export interface FindingItemLike {
  id?: string;
  Severity?: SeverityLevel | string;
  priority?: SeverityLevel | string;
  severity?: SeverityLevel | string;
  status?: string;
  Status?: string;
  [key: string]: any;
}

export interface SeveritySliceData {
  name: SeverityLevel;
  displayName: string;
  value: number;
  percentage: number;
  color: string;
  bgLight: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
}

export interface FindingsSeverityPieChartProps {
  /**
   * Optional findings array (e.g. from results.tsx TransformedResult[]).
   */
  findings?: FindingItemLike[];

  /**
   * Optional requirements array (e.g. from seedData ComplianceRequirementItem[]).
   */
  requirements?: ComplianceRequirementItem[];

  /**
   * Optional pre-calculated severity counts.
   */
  severityCounts?: Record<SeverityLevel, number>;

  /**
   * Currently active/selected severities for interactive filtering.
   */
  selectedSeverities?: SeverityLevel[];

  /**
   * Callback fired when a stakeholder clicks a pie slice or KPI card to toggle/select severity.
   */
  onSelectSeverity?: (severity: SeverityLevel) => void;

  /**
   * Callback to reset severity selection back to all.
   */
  onResetSeverities?: () => void;

  /**
   * Title displayed above the visualization section.
   */
  title?: string;

  /**
   * Subtitle / executive explanation of this data section.
   */
  subtitle?: string;

  /**
   * Whether to display the 4 severity KPI summary cards.
   */
  showSummaryCards?: boolean;

  /**
   * Whether to display the interactive filter buttons bar.
   */
  showFilterButtons?: boolean;

  /**
   * Whether chart is compact (for sidebars or small containers).
   */
  compact?: boolean;

  /**
   * Optional custom chart container height in px.
   */
  chartHeight?: number;

  /**
   * Whether the section can be collapsed by the user.
   */
  collapsible?: boolean;

  /**
   * Custom CSS styling.
   */
  className?: string;
  style?: React.CSSProperties;
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  Critical: '#dc2626', // Crimson Red
  High: '#ea580c',     // Rich Orange
  Medium: '#d97706',   // Amber Yellow
  Low: '#059669'       // Emerald Green
};

export const FindingsSeverityPieChart: React.FC<FindingsSeverityPieChartProps> = ({
  findings,
  requirements,
  severityCounts: explicitCounts,
  selectedSeverities = ALL_SEVERITY_LEVELS,
  onSelectSeverity,
  onResetSeverities,
  title = 'Audit Findings by Severity Level',
  subtitle = 'Distribution of gateway assurance findings and compliance deficits categorized by risk impact (Critical, High, Medium, Low).',
  showSummaryCards = true,
  showFilterButtons = true,
  compact = false,
  chartHeight = 280,
  collapsible = false,
  className = '',
  style = {}
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isDonut, setIsDonut] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute aggregated counts for each severity level
  const { counts, totalFindings, maxSeverity } = useMemo(() => {
    const computedCounts: Record<SeverityLevel, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    if (explicitCounts) {
      computedCounts.Critical = explicitCounts.Critical || 0;
      computedCounts.High = explicitCounts.High || 0;
      computedCounts.Medium = explicitCounts.Medium || 0;
      computedCounts.Low = explicitCounts.Low || 0;
    } else if (findings && findings.length > 0) {
      findings.forEach((item) => {
        const raw = item.Severity || item.priority || item.severity || 'Medium';
        const sev = (
          raw === 'Critical' ? 'Critical' :
          raw === 'High' ? 'High' :
          raw === 'Low' ? 'Low' : 'Medium'
        ) as SeverityLevel;
        computedCounts[sev]++;
      });
    } else if (requirements && requirements.length > 0) {
      requirements.forEach((item) => {
        const p = item.priority || 'Medium';
        if (computedCounts[p] !== undefined) {
          computedCounts[p]++;
        }
      });
    } else {
      // Fallback to initial requirements
      initialComplianceRequirements.forEach((item) => {
        const p = item.priority || 'Medium';
        if (computedCounts[p] !== undefined) {
          computedCounts[p]++;
        }
      });
    }

    const total =
      computedCounts.Critical +
      computedCounts.High +
      computedCounts.Medium +
      computedCounts.Low;

    let highest: SeverityLevel = 'Low';
    if (computedCounts.Medium > 0) highest = 'Medium';
    if (computedCounts.High > 0) highest = 'High';
    if (computedCounts.Critical > 0) highest = 'Critical';

    return { counts: computedCounts, totalFindings: total, maxSeverity: highest };
  }, [findings, requirements, explicitCounts]);

  // Construct chart slices
  const chartData: SeveritySliceData[] = useMemo(() => {
    const safeTotal = totalFindings > 0 ? totalFindings : 1;
    return ALL_SEVERITY_LEVELS.map((sev) => {
      const config = SEVERITY_CONFIGS[sev];
      const val = counts[sev] || 0;
      return {
        name: sev,
        displayName: config.label,
        value: val,
        percentage: Math.round((val / safeTotal) * 100),
        color: SEVERITY_COLORS[sev],
        bgLight: config.badgeBg,
        badgeBorder: config.badgeBorder,
        badgeText: config.badgeText,
        description: config.description
      };
    });
  }, [counts, totalFindings]);

  // Handle clicking a slice or KPI card
  const handleItemClick = (severity: SeverityLevel) => {
    if (onSelectSeverity) {
      onSelectSeverity(severity);
    }
  };

  const isAllSelected =
    !selectedSeverities ||
    selectedSeverities.length === 0 ||
    selectedSeverities.length === ALL_SEVERITY_LEVELS.length;

  const isSeverityActive = (severity: SeverityLevel) => {
    if (isAllSelected) return false;
    return selectedSeverities.includes(severity);
  };

  // Custom active shape for Recharts Pie hover
  const renderActiveShape = (props: any) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload
    } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.18))', transition: 'all 0.2s ease' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={Math.max(0, innerRadius - 4)}
          outerRadius={innerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
        {isDonut && (
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fill="#0f172a"
            style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'inherit' }}
          >
            {payload.value}
          </text>
        )}
        {isDonut && (
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="#64748b"
            style={{ fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit' }}
          >
            {payload.name} ({payload.percentage}%)
          </text>
        )}
      </g>
    );
  };

  // Custom Recharts tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SeveritySliceData;
      const config = SEVERITY_CONFIGS[data.name];
      const isFiltered = isSeverityActive(data.name);

      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${data.color}`,
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          maxWidth: '280px',
          fontSize: '0.8rem',
          fontFamily: 'inherit',
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: data.color
              }} />
              <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{data.displayName}</strong>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: data.bgLight,
              color: data.badgeText,
              border: `1px solid ${data.badgeBorder}`
            }}>
              {data.percentage}%
            </span>
          </div>

          <div style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: data.color,
            margin: '4px 0 6px 0',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
            {data.value}
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
              of {totalFindings} findings
            </span>
          </div>

          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
            {config.description}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            color: '#1d70b8',
            fontWeight: 600,
            borderTop: '1px solid #f1f5f9',
            paddingTop: '6px'
          }}>
            <TouchAppIcon style={{ fontSize: '0.85rem' }} />
            <span>{isFiltered ? 'Click to deselect filter' : 'Click to filter table by this severity'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section
      aria-label="Findings Severity Distribution"
      className={`findings-severity-pie-chart-section ${className}`}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        overflow: 'hidden',
        marginBottom: '24px',
        fontFamily: 'inherit',
        ...style
      }}
    >
      {/* 1. Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#f8fafc',
        borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Section Title & Lead */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)'
          }}>
            <PieChartIcon style={{ fontSize: '1.25rem', color: '#38bdf8' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.01em'
              }}>
                {title}
              </h2>

              {/* Status Pill Badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: counts.Critical > 0 ? '#fef2f2' : '#f0fdf4',
                color: counts.Critical > 0 ? '#991b1b' : '#166534',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: `1px solid ${counts.Critical > 0 ? '#fecaca' : '#bbf7d0'}`
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: counts.Critical > 0 ? '#dc2626' : '#10b981'
                }} />
                {counts.Critical > 0
                  ? `${counts.Critical} Critical Risk Deficits`
                  : 'Zero Critical Deficits'}
              </span>
            </div>

            <p style={{
              margin: '2px 0 0 0',
              fontSize: '0.78125rem',
              color: '#64748b'
            }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Chart View Mode Toggle: Donut vs Solid Pie */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={() => setIsDonut(true)}
              title="Donut Chart View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: isDonut ? '#0f172a' : 'transparent',
                color: isDonut ? '#ffffff' : '#475569',
                fontSize: '0.725rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <DonutIcon style={{ fontSize: '0.9rem' }} />
              <span>Donut</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDonut(false)}
              title="Solid Pie Chart View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: !isDonut ? '#0f172a' : 'transparent',
                color: !isDonut ? '#ffffff' : '#475569',
                fontSize: '0.725rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <PieChartIcon style={{ fontSize: '0.9rem' }} />
              <span>Pie</span>
            </button>
          </div>

          {/* Reset Filter Button if active filter applied */}
          {!isAllSelected && onResetSeverities && (
            <button
              type="button"
              onClick={onResetSeverities}
              title="Reset severity filtering"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ResetIcon style={{ fontSize: '0.95rem' }} />
              <span>Reset Filter</span>
            </button>
          )}

          {/* Collapsible toggle */}
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(prev => !prev)}
              aria-label={isCollapsed ? 'Expand visualization section' : 'Collapse visualization section'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              {isCollapsed ? (
                <ExpandMoreIcon style={{ fontSize: '1.2rem' }} />
              ) : (
                <ExpandLessIcon style={{ fontSize: '1.2rem' }} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Visualization Body */}
      {!isCollapsed && (
        <div style={{ padding: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : 'minmax(280px, 1fr) minmax(320px, 1.3fr)',
            gap: '24px',
            alignItems: 'center'
          }}>
            {/* Chart Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}>
              <div style={{ width: '100%', height: chartHeight, minHeight: '240px' }}>
                {isMounted ? (
                  totalFindings > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomTooltip />} />
                        {React.createElement(
                          Pie as any,
                          {
                            data: chartData,
                            cx: "50%",
                            cy: "50%",
                            innerRadius: isDonut ? 65 : 0,
                            outerRadius: 95,
                            paddingAngle: isDonut ? 3 : 1,
                            dataKey: "value",
                            nameKey: "name",
                            activeIndex: activeIndex !== null ? activeIndex : undefined,
                            activeShape: renderActiveShape,
                            onMouseEnter: (_: any, index: number) => setActiveIndex(index),
                            onMouseLeave: () => setActiveIndex(null),
                            onClick: (entry: any) => handleItemClick(entry.name as SeverityLevel),
                            style: { cursor: 'pointer' }
                          },
                          chartData.map((entry) => {
                            const active = isSeverityActive(entry.name);
                            return (
                              <Cell
                                key={`cell-${entry.name}`}
                                fill={entry.color}
                                stroke={active ? '#0f172a' : '#ffffff'}
                                strokeWidth={active ? 3 : 2}
                                opacity={!isAllSelected && !active ? 0.45 : 1}
                                style={{
                                  transition: 'opacity 0.2s ease, stroke-width 0.2s ease',
                                  outline: 'none'
                                }}
                              />
                            );
                          })
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#94a3b8'
                    }}>
                      <PieChartIcon style={{ fontSize: '2.5rem', marginBottom: '8px' }} />
                      <span style={{ fontSize: '0.85rem' }}>No findings data available</span>
                    </div>
                  )
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8',
                    fontSize: '0.8125rem'
                  }}>
                    Initializing visualization...
                  </div>
                )}
              </div>

              {/* Central Donut Hole Annotation (if Donut and not actively hovered) */}
              {isDonut && activeIndex === null && totalFindings > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1
                  }}>
                    {totalFindings}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginTop: '2px'
                  }}>
                    Findings
                  </div>
                </div>
              )}

              {/* Chart Interaction Caption */}
              <div style={{
                marginTop: '8px',
                fontSize: '0.725rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <TouchAppIcon style={{ fontSize: '0.85rem', color: '#1d70b8' }} />
                <span>Interactive: Click slice or card to filter audit findings</span>
              </div>
            </div>

            {/* KPI Cards & Filter Buttons Column */}
            <div>
              {/* Quick Filter Buttons Bar */}
              {showFilterButtons && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginBottom: '14px'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginRight: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <FilterAltIcon style={{ fontSize: '0.9rem' }} />
                    Filter:
                  </span>

                  {/* All Severities Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onResetSeverities) onResetSeverities();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: isAllSelected ? 700 : 500,
                      backgroundColor: isAllSelected ? '#0f172a' : '#f8fafc',
                      color: isAllSelected ? '#ffffff' : '#334155',
                      border: `1px solid ${isAllSelected ? '#0f172a' : '#cbd5e1'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>All</span>
                    <span style={{
                      backgroundColor: isAllSelected ? '#334155' : '#e2e8f0',
                      color: isAllSelected ? '#ffffff' : '#475569',
                      borderRadius: '9999px',
                      padding: '1px 6px',
                      fontSize: '0.65rem',
                      fontWeight: 700
                    }}>
                      {totalFindings}
                    </span>
                  </button>

                  {/* Severity Level Filter Buttons */}
                  {ALL_SEVERITY_LEVELS.map((sev) => {
                    const active = isSeverityActive(sev);
                    const config = SEVERITY_CONFIGS[sev];
                    const val = counts[sev] || 0;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => handleItemClick(sev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: active ? 700 : 500,
                          backgroundColor: active ? config.badgeBg : '#ffffff',
                          color: active ? config.badgeText : '#334155',
                          border: `1px solid ${active ? config.dotColor : '#cbd5e1'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: config.dotColor
                        }} />
                        <span>{sev}</span>
                        <span style={{
                          backgroundColor: active ? config.badgeBorder : '#f1f5f9',
                          color: active ? config.badgeText : '#64748b',
                          borderRadius: '9999px',
                          padding: '1px 5px',
                          fontSize: '0.65rem',
                          fontWeight: 700
                        }}>
                          {val}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 4 Severity KPI Summary Cards Grid */}
              {showSummaryCards && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px'
                }}>
                  {chartData.map((slice) => {
                    const active = isSeverityActive(slice.name);
                    const config = SEVERITY_CONFIGS[slice.name];
                    return (
                      <div
                        key={slice.name}
                        onClick={() => handleItemClick(slice.name)}
                        style={{
                          backgroundColor: active ? slice.bgLight : '#ffffff',
                          border: `1px solid ${active ? slice.color : '#e2e8f0'}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          boxShadow: active
                            ? `0 2px 8px -1px ${slice.color}33`
                            : '0 1px 2px rgba(15, 23, 42, 0.03)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = slice.color;
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = active ? slice.color : '#e2e8f0';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Top Indicator Strip */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '3px',
                          backgroundColor: slice.color
                        }} />

                        <div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px'
                          }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: slice.color,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {slice.name}
                            </span>
                            <span style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              color: '#64748b'
                            }}>
                              {slice.percentage}%
                            </span>
                          </div>

                          <div style={{
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            lineHeight: 1.1,
                            marginBottom: '4px'
                          }}>
                            {slice.value}
                          </div>

                          <p style={{
                            margin: 0,
                            fontSize: '0.7rem',
                            color: '#64748b',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {config.description}
                          </p>
                        </div>

                        {/* Progress Bar for percentage */}
                        <div style={{
                          marginTop: '8px',
                          width: '100%',
                          height: '4px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '9999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${slice.percentage}%`,
                            height: '100%',
                            backgroundColor: slice.color,
                            borderRadius: '9999px'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FindingsSeverityPieChart;
