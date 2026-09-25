/**
 * Utility functions and styles for Compliance Item Priority levels (High, Medium, Low).
 * Provides color-coded badges, visual focus indicators, and normalization.
 */

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface PriorityInfo {
  level: PriorityLevel;
  raw: string;
  label: string;
  shortLabel: string;
  bg: string;
  border: string;
  text: string;
  dotColor: string;
  icon: string;
  description: string;
  isHigh: boolean;
  isMedium: boolean;
  isLow: boolean;
}

/**
 * Normalizes any legacy or custom priority string to standard 'High' | 'Medium' | 'Low'.
 * Legacy 'Critical' is mapped to 'High' to ensure critical tasks remain highlighted.
 */
export function normalizePriority(priority?: string | null): PriorityLevel {
  if (!priority) return 'Medium';
  const p = priority.trim().toLowerCase();
  if (p === 'critical' || p === 'high') return 'High';
  if (p === 'low') return 'Low';
  return 'Medium';
}

/**
 * Returns complete presentation metrics, colors, and badge styling for a given priority.
 */
export function getPriorityInfo(priority?: string | null): PriorityInfo {
  const norm = normalizePriority(priority);

  switch (norm) {
    case 'High':
      return {
        level: 'High',
        raw: priority || 'High',
        label: 'High Priority',
        shortLabel: 'High',
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#b91c1c',
        dotColor: '#ef4444',
        icon: '🔴',
        description: 'Critical task focus — immediate stakeholder action required',
        isHigh: true,
        isMedium: false,
        isLow: false
      };
    case 'Medium':
      return {
        level: 'Medium',
        raw: priority || 'Medium',
        label: 'Medium Priority',
        shortLabel: 'Medium',
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#b45309',
        dotColor: '#f59e0b',
        icon: '🟠',
        description: 'Standard assurance priority — scheduled for current gate',
        isHigh: false,
        isMedium: true,
        isLow: false
      };
    case 'Low':
    default:
      return {
        level: 'Low',
        raw: priority || 'Low',
        label: 'Low Priority',
        shortLabel: 'Low',
        bg: '#f8fafc',
        border: '#cbd5e1',
        text: '#475569',
        dotColor: '#94a3b8',
        icon: '⚪',
        description: 'Routine requirement — non-critical tracking item',
        isHigh: false,
        isMedium: false,
        isLow: true
      };
  }
}

export const PRIORITY_OPTIONS: Array<{
  value: PriorityLevel;
  label: string;
  badgeLabel: string;
  dotColor: string;
  bg: string;
  border: string;
  text: string;
  description: string;
}> = [
  {
    value: 'High',
    label: 'High Priority (Critical focus)',
    badgeLabel: 'High',
    dotColor: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#b91c1c',
    description: 'Critical task focus — immediate attention'
  },
  {
    value: 'Medium',
    label: 'Medium Priority (Standard)',
    badgeLabel: 'Medium',
    dotColor: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#b45309',
    description: 'Standard delivery priority'
  },
  {
    value: 'Low',
    label: 'Low Priority (Routine)',
    badgeLabel: 'Low',
    dotColor: '#94a3b8',
    bg: '#f8fafc',
    border: '#cbd5e1',
    text: '#475569',
    description: 'Routine compliance item'
  }
];
