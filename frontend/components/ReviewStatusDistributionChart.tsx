"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { InfrastructureProject } from '@/lib/seedData';
import {
  BarChart as BarChartIcon,
  FilterAlt as FilterAltIcon,
  InfoOutlined as InfoIcon,
  TouchApp as TouchAppIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';

interface StatusDistributionItem {
  status: 'Ready for Sign-Off' | 'Active Assurance' | 'Under Formal Review' | 'Remediation Required' | 'Scheduled';
  count: number;
  percentage: number;
  avgScore: number;
  totalBudgetBillion: number;
  projects: InfrastructureProject[];
  color: string;
  bgLight: string;
  badgeBorder: string;
  description: string;
}

interface ReviewStatusDistributionChartProps {
  projects: InfrastructureProject[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

// Status definitions with official IPA colors & metadata
const STATUS_CONFIG: Record<
  string,
  { color: string; bgLight: string; badgeBorder: string; description: string }
> = {
  'Ready for Sign-Off': {
    color: '#16a34a', // Emerald Green
    bgLight: '#f0fdf4',
    badgeBorder: '#bbf7d0',
    description: 'Full compliance verified. Ready for Ministerial and Gateway sign-off.'
  },
  'Active Assurance': {
    color: '#1d70b8', // Official British Civic Blue
    bgLight: '#eff6ff',
    badgeBorder: '#bfdbfe',
    description: 'Ongoing assurance review with active auditor scrutiny and evidence review.'
  },
  'Under Formal Review': {
    color: '#d97706', // Amber
    bgLight: '#fffbeb',
    badgeBorder: '#fde68a',
    description: 'Gateway interview conclave convened; preliminary findings under deliberation.'
  },
  'Remediation Required': {
    color: '#dc2626', // Crimson Red
    bgLight: '#fef2f2',
    badgeBorder: '#fecaca',
    description: 'Critical compliance deficits or single points of failure flagged for remediation.'
  },
  'Scheduled': {
    color: '#6366f1', // Indigo
    bgLight: '#eef2ff',
    badgeBorder: '#c7d2fe',
    description: 'Pre-review phase with evidence freeze and Gateway submission scheduled.'
  }
};

const STATUS_ORDER: Array<StatusDistributionItem['status']> = [
  'Ready for Sign-Off',
  'Active Assurance',
  'Under Formal Review',
  'Remediation Required',
  'Scheduled'
];

export default function ReviewStatusDistributionChart({
  projects,
  selectedStatus,
  onSelectStatus
}: ReviewStatusDistributionChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [metricMode, setMetricMode] = useState<'count' | 'score'>('count');
  const [hoveredStatus, setHoveredStatus] = useState<StatusDistributionItem | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(680);

  // Aggregate project distribution
  const distributionData: StatusDistributionItem[] = useMemo(() => {
    const totalCount = projects.length || 1;

    return STATUS_ORDER.map(st => {
      const matched = projects.filter(p => p.reviewStatus === st);
      const count = matched.length;
      const percentage = Math.round((count / totalCount) * 100);
      const avgScore = count > 0
        ? Math.round(matched.reduce((acc, p) => acc + p.assuranceScore, 0) / count)
        : 0;

      const totalBudgetBillion = matched.reduce((acc, p) => {
        const parsed = parseFloat(p.budgetFormatted.replace(/[^0-9.]/g, '')) || 0;
        return acc + parsed;
      }, 0);

      const cfg = STATUS_CONFIG[st] || {
        color: '#64748b',
        bgLight: '#f8fafc',
        badgeBorder: '#e2e8f0',
        description: ''
      };

      return {
        status: st,
        count,
        percentage,
        avgScore,
        totalBudgetBillion: parseFloat(totalBudgetBillion.toFixed(1)),
        projects: matched,
        color: cfg.color,
        bgLight: cfg.bgLight,
        badgeBorder: cfg.badgeBorder,
        description: cfg.description
      };
    });
  }, [projects]);

  // Responsive resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || distributionData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 28, right: 24, bottom: 44, left: 42 };
    const width = Math.max(containerWidth, 420);
    const height = 240;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = d3.scaleBand()
      .domain(distributionData.map(d => d.status))
      .range([0, innerWidth])
      .padding(0.34);

    // Y Scale
    const maxVal = metricMode === 'count'
      ? Math.max(d3.max(distributionData, d => d.count) || 1, 3)
      : 100;

    const y = d3.scaleLinear()
      .domain([0, maxVal])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal Grid Lines
    const yTicks = metricMode === 'count' ? Math.min(maxVal, 4) : 5;
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(y)
          .ticks(yTicks)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .call(g =>
        g.selectAll('.tick line')
          .attr('stroke', '#f1f5f9')
          .attr('stroke-dasharray', '3,3')
      );

    // X Axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x).tickFormat(d => {
          // Shorten labels on narrow screens
          if (innerWidth < 520) {
            if (d === 'Ready for Sign-Off') return 'Ready';
            if (d === 'Active Assurance') return 'Active';
            if (d === 'Under Formal Review') return 'Review';
            if (d === 'Remediation Required') return 'Remediation';
            if (d === 'Scheduled') return 'Sched.';
          }
          return d;
        })
      );

    xAxis.select('.domain').attr('stroke', '#cbd5e1');
    xAxis.selectAll('.tick line').attr('stroke', '#cbd5e1');
    xAxis.selectAll('.tick text')
      .attr('fill', (d) => {
        if (selectedStatus === d) return '#0f172a';
        return '#475569';
      })
      .attr('font-size', innerWidth < 520 ? '10px' : '11px')
      .attr('font-weight', (d) => (selectedStatus === d ? '700' : '500'))
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        onSelectStatus(selectedStatus === d ? 'ALL' : (d as string));
      });

    // Y Axis
    const yAxis = g.append('g')
      .call(
        d3.axisLeft(y)
          .ticks(yTicks)
          .tickFormat(d => (metricMode === 'score' ? `${d}%` : `${d}`))
      );

    yAxis.select('.domain').remove();
    yAxis.selectAll('.tick line').remove();
    yAxis.selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Bar Groups
    const barGroups = g.selectAll('.bar-group')
      .data(distributionData)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => {
        setHoveredStatus(d);
      })
      .on('mouseleave', () => {
        setHoveredStatus(null);
      })
      .on('click', (_, d) => {
        onSelectStatus(selectedStatus === d.status ? 'ALL' : d.status);
      });

    // Bar Background Highlight on Selection
    barGroups.append('rect')
      .attr('class', 'bar-bg')
      .attr('x', d => (x(d.status) || 0) - 4)
      .attr('y', 0)
      .attr('width', x.bandwidth() + 8)
      .attr('height', innerHeight)
      .attr('rx', 6)
      .attr('fill', d => {
        if (selectedStatus === d.status) return d.bgLight;
        return 'transparent';
      })
      .attr('stroke', d => {
        if (selectedStatus === d.status) return d.badgeBorder;
        return 'transparent';
      })
      .attr('stroke-width', 1.5);

    // Main Data Bars
    barGroups.append('rect')
      .attr('class', 'data-bar')
      .attr('x', d => x(d.status) || 0)
      .attr('width', x.bandwidth())
      .attr('rx', 4)
      .attr('fill', d => {
        // Dim non-selected bars if a status is selected
        if (selectedStatus !== 'ALL' && selectedStatus !== d.status) {
          return d3.color(d.color)?.copy({ opacity: 0.35 }).formatRgb() || d.color;
        }
        return d.color;
      })
      .attr('y', innerHeight)
      .attr('height', 0)
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr('y', d => {
        const val = metricMode === 'count' ? d.count : d.avgScore;
        return y(val);
      })
      .attr('height', d => {
        const val = metricMode === 'count' ? d.count : d.avgScore;
        return innerHeight - y(val);
      });

    // Bar Top Value Labels
    barGroups.append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (x(d.status) || 0) + x.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'monospace')
      .attr('fill', d => (selectedStatus === d.status ? d.color : '#1e293b'))
      .attr('y', innerHeight - 6)
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr('y', d => {
        const val = metricMode === 'count' ? d.count : d.avgScore;
        return y(val) - 6;
      })
      .text(d => {
        if (metricMode === 'count') {
          return d.count > 0 ? `${d.count}` : '0';
        }
        return d.count > 0 ? `${d.avgScore}%` : 'N/A';
      });

    // Milestone target reference line if in 'score' mode
    if (metricMode === 'score') {
      const targetY = y(80);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', targetY)
        .attr('y2', targetY)
        .attr('stroke', '#16a34a')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', targetY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#16a34a')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('80% Gate Target');
    }

  }, [distributionData, containerWidth, metricMode, selectedStatus, onSelectStatus]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 22px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BarChartIcon style={{ fontSize: '1.25rem', color: '#1d70b8' }} />
            <h2 style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.01em'
            }}>
              Compliance Review Status Distribution
            </h2>
            <span style={{
              fontSize: '0.75rem',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600
            }}>
              D3.js Visualization
            </span>
          </div>
          <p style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.4
          }}>
            Portfolio breakdown across formal assurance gateways. Click any status bar to isolate matching infrastructure reviews below.
          </p>
        </div>

        {/* View Mode Toggle & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {selectedStatus !== 'ALL' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectStatus('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '0.75rem',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Reset status filter to show all reviews"
            >
              <ResetIcon style={{ fontSize: '0.9rem' }} />
              <span>Reset Filter</span>
            </motion.button>
          )}

          {/* Metric Mode Switcher */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setMetricMode('count')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: metricMode === 'count' ? 700 : 500,
                backgroundColor: metricMode === 'count' ? '#ffffff' : 'transparent',
                color: metricMode === 'count' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: metricMode === 'count' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.1s ease'
              }}
            >
              Project Count
            </button>
            <button
              onClick={() => setMetricMode('score')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: metricMode === 'score' ? 700 : 500,
                backgroundColor: metricMode === 'score' ? '#ffffff' : 'transparent',
                color: metricMode === 'score' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: metricMode === 'score' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.1s ease'
              }}
            >
              Avg Assurance %
            </button>
          </div>
        </div>
      </div>

      {/* Interactive D3 Canvas Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ width: '100%', position: 'relative' }}
      >
        <svg ref={svgRef} style={{ overflow: 'visible', display: 'block' }} />

        {/* Dynamic Hover / Active Inspection Banner */}
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: hoveredStatus ? hoveredStatus.bgLight : selectedStatus !== 'ALL' ? '#f8fafc' : '#fafafa',
          border: `1px solid ${hoveredStatus ? hoveredStatus.badgeBorder : '#e2e8f0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          transition: 'all 0.15s ease',
          fontSize: '0.8125rem'
        }}>
          {hoveredStatus ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: hoveredStatus.color
                }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{hoveredStatus.status}</span>
                <span style={{ color: '#64748b' }}>·</span>
                <span style={{ color: '#475569' }}>{hoveredStatus.description}</span>
              </div>
              <div style={{ display: 'flex', gap: '14px', fontFamily: 'monospace' }}>
                <span><strong>{hoveredStatus.count}</strong> Projects ({hoveredStatus.percentage}%)</span>
                <span>Avg: <strong>{hoveredStatus.avgScore}%</strong></span>
                <span>Capital: <strong>£{hoveredStatus.totalBudgetBillion}B</strong></span>
              </div>
            </>
          ) : selectedStatus !== 'ALL' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FilterAltIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
                <span>
                  Currently filtering projects by status: <strong style={{ color: '#0f172a' }}>{selectedStatus}</strong>
                </span>
              </div>
              <button
                onClick={() => onSelectStatus('ALL')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d70b8',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              >
                Clear Status Filter
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
              <TouchAppIcon style={{ fontSize: '0.95rem', color: '#94a3b8' }} />
              <span>
                Tip: Click any bar or status pill to filter the project reviews list. Hover over bars to view capital envelopes.
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Status Pill Strip with Quick Filter Action */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '8px',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {distributionData.map((item, idx) => {
          const isSelected = selectedStatus === item.status;
          return (
            <motion.button
              key={item.status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + idx * 0.04 }}
              whileHover={{ y: -1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectStatus(isSelected ? 'ALL' : item.status)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: isSelected ? item.bgLight : '#ffffff',
                border: `1px solid ${isSelected ? item.color : '#e2e8f0'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              title={`Click to filter by ${item.status}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: item.color
                }} />
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#0f172a' : '#334155'
                }}>
                  {item.status}
                </span>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: item.color,
                backgroundColor: item.bgLight,
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                {item.count}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
