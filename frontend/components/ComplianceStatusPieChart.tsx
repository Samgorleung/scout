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
  CheckCircleOutline as CheckIcon,
  HourglassEmpty as HourglassIcon,
  ErrorOutline as ErrorIcon,
  RemoveCircleOutline as NotApplicableIcon,
  RestartAlt as ResetIcon,
  TouchApp as TouchAppIcon,
  Assessment as AssessmentIcon,
  FilterAlt as FilterAltIcon,
  ShieldOutlined as ShieldIcon
} from '@mui/icons-material';
import {
  ComplianceRequirementItem,
  initialComplianceRequirements,
  InfrastructureProject
} from '@/lib/seedData';

export type ComplianceStatusKey = 'Compliant' | 'Non-compliant' | 'In Progress' | 'Not Applicable';

export interface ComplianceStatusSlice {
  name: ComplianceStatusKey;
  value: number;
  percentage: number;
  color: string;
  bgLight: string;
  badgeBorder: string;
  description: string;
  statusAliases: string[];
}

export interface ComplianceStatusPieChartProps {
  /**
   * List of compliance requirement items to evaluate.
   * If omitted, falls back to `projects` or `initialComplianceRequirements`.
   */
  items?: ComplianceRequirementItem[];

  /**
   * Optional direct numeric metrics if passing pre-calculated counts.
   */
  metrics?: {
    total?: number;
    compliant?: number;
    inProgress?: number;
    nonCompliant?: number;
    flagged?: number;
    notApplicable?: number;
  };

  /**
   * Optional project list from which compliance metrics can be aggregated.
   */
  projects?: InfrastructureProject[];

  /**
   * Currently active/selected status for interactive filtering.
   */
  selectedStatus?: string;

  /**
   * Callback fired when a stakeholder clicks a pie slice or status filter button.
   */
  onSelectStatus?: (status: string) => void;

  /**
   * Custom title displayed above the chart.
   */
  title?: string;

  /**
   * Custom subtitle / domain description.
   */
  subtitle?: string;

  /**
   * Whether to display executive KPI metric tiles adjacent to or above the chart.
   */
  showSummaryCards?: boolean;

  /**
   * Whether to render interactive status filter buttons below the chart.
   */
  showFilterButtons?: boolean;

  /**
   * Compact layout for narrow panels or sidebar insertion.
   */
  compact?: boolean;

  /**
   * Optional custom height for the chart container (default: 260px).
   */
  chartHeight?: number;

  /**
   * Additional custom styling for container element.
   */
  className?: string;
  style?: React.CSSProperties;
}

// Canonical status configurations with standard compliance visual indicators
const STATUS_DEFINITIONS: Record<
  ComplianceStatusKey,
  {
    color: string;
    bgLight: string;
    badgeBorder: string;
    description: string;
    aliases: string[];
  }
> = {
  Compliant: {
    color: '#10b981', // Emerald Green
    bgLight: '#ecfdf5',
    badgeBorder: '#a7f3d0',
    description: 'Requirements with validated evidence meeting all assurance criteria.',
    aliases: ['Compliant', 'compliant', 'verified', 'Verified', 'Pass', 'Cleared']
  },
  'In Progress': {
    color: '#f59e0b', // Amber
    bgLight: '#fffbeb',
    badgeBorder: '#fde68a',
    description: 'Evidence gathering, design adjustments, or auditor scrutiny currently underway.',
    aliases: ['In Progress', 'in progress', 'under review', 'Pending', 'pending', 'Draft']
  },
  'Non-compliant': {
    color: '#ef4444', // Crimson Red
    bgLight: '#fef2f2',
    badgeBorder: '#fecaca',
    description: 'Flagged deficits, compliance breaches, or missing mandatory controls requiring mitigation.',
    aliases: ['Non-compliant', 'non-compliant', 'Flagged', 'flagged', 'Fail', 'Critical Gaps', 'At Risk']
  },
  'Not Applicable': {
    color: '#64748b', // Slate Gray
    bgLight: '#f8fafc',
    badgeBorder: '#e2e8f0',
    description: 'Formal regulatory exemptions or criteria outside the scope of current review gate.',
    aliases: ['Not Applicable', 'N/A', 'n/a', 'Exempt', 'Out of Scope', 'Baseline']
  }
};

const ORDERED_STATUS_KEYS: ComplianceStatusKey[] = [
  'Compliant',
  'In Progress',
  'Non-compliant',
  'Not Applicable'
];

export default function ComplianceStatusPieChart({
  items,
  metrics: explicitMetrics,
  projects,
  selectedStatus = 'ALL',
  onSelectStatus,
  title = 'Compliance Requirements Status Distribution',
  subtitle = 'Executive status breakdown across project assurance criteria for stakeholder review.',
  showSummaryCards = true,
  showFilterButtons = true,
  compact = false,
  chartHeight = 270,
  style
}: ComplianceStatusPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Avoid SSR hydration issues with Recharts ResponsiveContainer
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute aggregated data
  const { chartData, totalItems, complianceRate, readinessBadge } = useMemo(() => {
    let compliantCount = 0;
    let inProgressCount = 0;
    let nonCompliantCount = 0;
    let notApplicableCount = 0;

    if (explicitMetrics) {
      compliantCount = explicitMetrics.compliant || 0;
      inProgressCount = explicitMetrics.inProgress || 0;
      nonCompliantCount = (explicitMetrics.nonCompliant ?? 0) + (explicitMetrics.flagged ?? 0);
      notApplicableCount = explicitMetrics.notApplicable || 0;
    } else if (items && items.length > 0) {
      items.forEach(item => {
        const s = (item.status || '').trim();
        if (s === 'Compliant') {
          compliantCount++;
        } else if (s === 'In Progress') {
          inProgressCount++;
        } else if (s === 'Flagged' || s === 'Non-compliant') {
          nonCompliantCount++;
        } else if (s === 'N/A' || s === 'Not Applicable') {
          notApplicableCount++;
        } else {
          // If status is unmapped, evaluate based on isChecked flag
          if (item.isChecked) {
            compliantCount++;
          } else {
            inProgressCount++;
          }
        }
      });
    } else if (projects && projects.length > 0) {
      compliantCount = projects.reduce((acc, p) => acc + (p.compliantCount || 0), 0);
      inProgressCount = projects.reduce((acc, p) => acc + (p.inProgressCount || 0), 0);
      nonCompliantCount = projects.reduce((acc, p) => acc + (p.flaggedCount || 0), 0);
      const totalReqs = projects.reduce((acc, p) => acc + (p.totalRequirements || 0), 0);
      const accounted = compliantCount + inProgressCount + nonCompliantCount;
      notApplicableCount = Math.max(0, totalReqs - accounted);
    } else {
      // Default to initial compliance requirements
      initialComplianceRequirements.forEach(item => {
        if (item.status === 'Compliant') compliantCount++;
        else if (item.status === 'In Progress') inProgressCount++;
        else if (item.status === 'Flagged') nonCompliantCount++;
        else notApplicableCount++;
      });
    }

    const total = compliantCount + inProgressCount + nonCompliantCount + notApplicableCount;
    const safeTotal = total > 0 ? total : 1;
    const rate = Math.round((compliantCount / safeTotal) * 100);

    const slices: ComplianceStatusSlice[] = ORDERED_STATUS_KEYS.map(key => {
      const def = STATUS_DEFINITIONS[key];
      let val = 0;
      if (key === 'Compliant') val = compliantCount;
      if (key === 'In Progress') val = inProgressCount;
      if (key === 'Non-compliant') val = nonCompliantCount;
      if (key === 'Not Applicable') val = notApplicableCount;

      return {
        name: key,
        value: val,
        percentage: Math.round((val / safeTotal) * 100),
        color: def.color,
        bgLight: def.bgLight,
        badgeBorder: def.badgeBorder,
        description: def.description,
        statusAliases: def.aliases
      };
    }).filter(slice => slice.value > 0); // Hide slices with 0 items for visual clarity

    // If all are 0, provide placeholder
    if (slices.length === 0) {
      slices.push({
        name: 'Compliant',
        value: 0,
        percentage: 0,
        color: STATUS_DEFINITIONS.Compliant.color,
        bgLight: STATUS_DEFINITIONS.Compliant.bgLight,
        badgeBorder: STATUS_DEFINITIONS.Compliant.badgeBorder,
        description: STATUS_DEFINITIONS.Compliant.description,
        statusAliases: STATUS_DEFINITIONS.Compliant.aliases
      });
    }

    // Stakeholder Assurance Readiness Determination
    let readinessText = 'Remediation Required — Gate Blocked';
    let readinessColor = '#dc2626';
    let readinessBg = '#fef2f2';
    let readinessBorder = '#fecaca';

    if (rate >= 80) {
      readinessText = 'Substantial Assurance Clearance (≥80%)';
      readinessColor = '#047857';
      readinessBg = '#f0fdf4';
      readinessBorder = '#bbf7d0';
    } else if (rate >= 50) {
      readinessText = 'Interim Progress — Remediation Underway';
      readinessColor = '#b45309';
      readinessBg = '#fffbeb';
      readinessBorder = '#fde68a';
    }

    return {
      chartData: slices,
      totalItems: total,
      complianceRate: rate,
      readinessBadge: {
        text: readinessText,
        color: readinessColor,
        bg: readinessBg,
        border: readinessBorder
      }
    };
  }, [items, explicitMetrics, projects]);

  // Active status matching helper
  const isStatusActive = (sliceName: ComplianceStatusKey) => {
    if (selectedStatus === 'ALL') return false;
    const def = STATUS_DEFINITIONS[sliceName];
    if (selectedStatus === sliceName) return true;
    return def.aliases.some(a => a.toLowerCase() === selectedStatus.toLowerCase());
  };

  const handleStatusClick = (sliceName: ComplianceStatusKey) => {
    if (!onSelectStatus) return;
    if (isStatusActive(sliceName)) {
      onSelectStatus('ALL');
    } else {
      // Map 'Non-compliant' to 'Flagged' if target list uses 'Flagged'
      onSelectStatus(sliceName === 'Non-compliant' ? 'Flagged' : sliceName);
    }
  };

  // Custom active sector animation for Recharts
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
      <g>
        {/* Central metric readout */}
        <text
          x={cx}
          y={cy - 12}
          dy={8}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="22px"
          fontWeight="800"
          fontFamily="monospace"
        >
          {value}
        </text>
        <text
          x={cx}
          y={cy + 10}
          dy={8}
          textAnchor="middle"
          fill="#64748b"
          fontSize="11px"
          fontWeight="700"
          letterSpacing="0.04em"
        >
          {payload.name.toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 28}
          dy={8}
          textAnchor="middle"
          fill={fill}
          fontSize="12px"
          fontWeight="700"
          fontFamily="monospace"
        >
          {`${(percent * 100).toFixed(0)}% of total`}
        </text>

        {/* Primary expanded slice */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        {/* Outer glowing halo ring */}
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 12}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  // Custom tooltip for project stakeholders
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const slice: ComplianceStatusSlice = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)',
          fontSize: '0.8125rem',
          minWidth: '220px',
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: slice.color
              }} />
              <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{slice.name}</strong>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: slice.color,
              backgroundColor: slice.bgLight,
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${slice.badgeBorder}`
            }}>
              {slice.percentage}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '4px' }}>
            <span>Item Count:</span>
            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
              {slice.value} requirement{slice.value === 1 ? '' : 's'}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '8px' }}>
            <span>Portfolio Share:</span>
            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
              {totalItems > 0 ? ((slice.value / totalItems) * 100).toFixed(1) : 0}%
            </strong>
          </div>

          <p style={{
            margin: 0,
            fontSize: '0.75rem',
            color: '#64748b',
            lineHeight: 1.35,
            borderTop: '1px solid #f1f5f9',
            paddingTop: '8px'
          }}>
            {slice.description}
          </p>

          {onSelectStatus && (
            <div style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px dashed #e2e8f0',
              color: '#1d70b8',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <TouchAppIcon style={{ fontSize: '0.85rem' }} /> Click slice to isolate items
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: compact ? '16px' : '22px 24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
        ...style
      }}
    >
      {/* Component Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: showSummaryCards ? '18px' : '12px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#1d70b8'
            }}>
              <PieChartIcon style={{ fontSize: '1.25rem' }} />
            </div>
            <h2 style={{
              fontSize: compact ? '1.1rem' : '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              {title}
            </h2>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#1d70b8',
              backgroundColor: '#eff6ff',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid #bfdbfe'
            }}>
              Recharts Engine
            </span>
          </div>
          <p style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.45,
            maxWidth: '780px'
          }}>
            {subtitle}
          </p>
        </div>

        {/* Quick Filter Reset & Readiness Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {selectedStatus !== 'ALL' && onSelectStatus && (
            <button
              onClick={() => onSelectStatus('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Reset status filter to show all requirements"
            >
              <ResetIcon style={{ fontSize: '0.9rem' }} />
              <span>Reset Filter</span>
            </button>
          )}

          {/* Gate Clearance Readiness Capsule */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '8px',
            backgroundColor: readinessBadge.bg,
            color: readinessBadge.color,
            border: `1px solid ${readinessBadge.border}`,
            fontWeight: 700,
            fontSize: '0.78125rem'
          }}>
            <ShieldIcon style={{ fontSize: '1rem' }} />
            <span>{readinessBadge.text}</span>
          </div>
        </div>
      </div>

      {/* Stakeholder Executive Summary KPI Ribbon */}
      {showSummaryCards && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {/* Card 1: Total Requirements */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Total Requirements
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {totalItems}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              Statutory Criteria
            </div>
          </div>

          {/* Card 2: Compliant */}
          <div
            onClick={() => handleStatusClick('Compliant')}
            style={{
              backgroundColor: isStatusActive('Compliant') ? '#ecfdf5' : '#ffffff',
              border: `1px solid ${isStatusActive('Compliant') ? '#10b981' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: onSelectStatus ? 'pointer' : 'default',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                ✓ Compliant
              </div>
              <CheckIcon style={{ fontSize: '1rem', color: '#10b981' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
                {chartData.find(d => d.name === 'Compliant')?.value || 0}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                ({complianceRate}%)
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>
              Fully Verified
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div
            onClick={() => handleStatusClick('In Progress')}
            style={{
              backgroundColor: isStatusActive('In Progress') ? '#fffbeb' : '#ffffff',
              border: `1px solid ${isStatusActive('In Progress') ? '#f59e0b' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: onSelectStatus ? 'pointer' : 'default',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.7rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                ⌛ In Progress
              </div>
              <HourglassIcon style={{ fontSize: '1rem', color: '#f59e0b' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', fontFamily: 'monospace' }}>
                {chartData.find(d => d.name === 'In Progress')?.value || 0}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>
                ({chartData.find(d => d.name === 'In Progress')?.percentage || 0}%)
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px' }}>
              Under Active Review
            </div>
          </div>

          {/* Card 4: Non-compliant / Flagged */}
          <div
            onClick={() => handleStatusClick('Non-compliant')}
            style={{
              backgroundColor: isStatusActive('Non-compliant') ? '#fef2f2' : '#ffffff',
              border: `1px solid ${isStatusActive('Non-compliant') ? '#ef4444' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: onSelectStatus ? 'pointer' : 'default',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                ⚠️ Non-compliant
              </div>
              <ErrorIcon style={{ fontSize: '1rem', color: '#ef4444' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace' }}>
                {chartData.find(d => d.name === 'Non-compliant')?.value || 0}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>
                ({chartData.find(d => d.name === 'Non-compliant')?.percentage || 0}%)
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '2px' }}>
              Action Needed
            </div>
          </div>
        </div>
      )}

      {/* Main Recharts Section with Donut Pie Chart & Side Legend Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1.25fr) minmax(0, 1.15fr)',
        gap: '20px',
        alignItems: 'center'
      }}>
        {/* Recharts Pie Chart Canvas */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: `${chartHeight}px`,
          minHeight: '220px'
        }}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                {React.createElement(Pie as any, {
                  data: chartData,
                  cx: "50%",
                  cy: "50%",
                  innerRadius: compact ? 55 : 68,
                  outerRadius: compact ? 80 : 98,
                  paddingAngle: 3,
                  dataKey: "value",
                  activeIndex: activeIndex !== null ? activeIndex : undefined,
                  activeShape: renderActiveShape,
                  onMouseEnter: (_: any, index: number) => setActiveIndex(index),
                  onMouseLeave: () => setActiveIndex(null),
                  onClick: (entry: any) => handleStatusClick(entry.name),
                  cursor: onSelectStatus ? 'pointer' : 'default'
                }, chartData.map((entry) => {
                  const isSelected = isStatusActive(entry.name);
                  const isDimmed = selectedStatus !== 'ALL' && !isSelected;
                  return (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.color}
                      opacity={isDimmed ? 0.35 : 1}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                  );
                }))}
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
              fontSize: '0.85rem'
            }}>
              Loading Recharts visualizer...
            </div>
          )}

          {/* Static Center Readout when no slice is hovered */}
          {activeIndex === null && isMounted && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              lineHeight: 1.1
            }}>
              <div style={{
                fontSize: compact ? '1.35rem' : '1.65rem',
                fontWeight: 800,
                color: '#0f172a',
                fontFamily: 'monospace'
              }}>
                {complianceRate}%
              </div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '3px'
              }}>
                COMPLIANT
              </div>
              <div style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
                marginTop: '2px'
              }}>
                {totalItems} total
              </div>
            </div>
          )}
        </div>

        {/* Detailed Side Legend & Status Guidance */}
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '0.04em',
            marginBottom: '10px'
          }}>
            Status Breakdown & Gate Impact
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ORDERED_STATUS_KEYS.map((key) => {
              const slice = chartData.find(d => d.name === key) || {
                name: key,
                value: 0,
                percentage: 0,
                color: STATUS_DEFINITIONS[key].color,
                bgLight: STATUS_DEFINITIONS[key].bgLight,
                badgeBorder: STATUS_DEFINITIONS[key].badgeBorder,
                description: STATUS_DEFINITIONS[key].description,
                statusAliases: STATUS_DEFINITIONS[key].aliases
              };
              const isSelected = isStatusActive(key);

              return (
                <div
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? slice.bgLight : '#ffffff',
                    border: `1px solid ${isSelected ? slice.color : '#e2e8f0'}`,
                    cursor: onSelectStatus ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                  title={onSelectStatus ? `Filter requirements by ${key}` : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0
                    }} />
                    <div>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? '#0f172a' : '#1e293b'
                      }}>
                        {key}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.2 }}>
                        {key === 'Compliant' && 'Verified with required evidence'}
                        {key === 'In Progress' && 'Evidence undergoing review'}
                        {key === 'Non-compliant' && 'Remediation plan required'}
                        {key === 'Not Applicable' && 'Out of scope or exempt'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: slice.color
                    }}>
                      {slice.value}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {slice.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Status Pill Filter Bar */}
      {showFilterButtons && onSelectStatus && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: '#64748b',
            marginRight: '4px'
          }}>
            <FilterAltIcon style={{ fontSize: '0.95rem', color: '#1d70b8' }} />
            <span>Quick Filter:</span>
          </div>

          {/* All Filter Button */}
          <button
            onClick={() => onSelectStatus('ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: selectedStatus === 'ALL' ? 700 : 500,
              backgroundColor: selectedStatus === 'ALL' ? '#0f172a' : '#f8fafc',
              color: selectedStatus === 'ALL' ? '#ffffff' : '#334155',
              border: `1px solid ${selectedStatus === 'ALL' ? '#0f172a' : '#cbd5e1'}`,
              cursor: 'pointer',
              transition: 'all 0.12s ease'
            }}
          >
            <span>All Items</span>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: selectedStatus === 'ALL' ? '#334155' : '#e2e8f0',
              color: selectedStatus === 'ALL' ? '#ffffff' : '#0f172a'
            }}>
              {totalItems}
            </span>
          </button>

          {/* Status Buttons */}
          {ORDERED_STATUS_KEYS.map(key => {
            const isSelected = isStatusActive(key);
            const slice = chartData.find(d => d.name === key);
            const count = slice?.value || 0;
            const def = STATUS_DEFINITIONS[key];

            return (
              <button
                key={key}
                onClick={() => handleStatusClick(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? def.bgLight : '#ffffff',
                  color: isSelected ? '#0f172a' : '#475569',
                  border: `1px solid ${isSelected ? def.color : '#e2e8f0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: def.color
                }} />
                <span>{key}</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? '#ffffff' : '#f1f5f9',
                  color: def.color,
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
