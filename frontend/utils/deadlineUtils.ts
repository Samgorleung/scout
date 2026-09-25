/**
 * Utility functions for Compliance Item Due Dates and Deadline Warning computations.
 * Provides standard threshold analysis for Project Stakeholders and Assurance Reviewers:
 * Flags any item with a deadline within 3 days (or overdue) with visual warning indicators.
 */

export interface DeadlineInfo {
  hasDueDate: boolean;
  dueDate: string | null;
  formattedDate: string; // e.g. "27 Sep 2026"
  daysRemaining: number | null;
  isUrgent: boolean; // TRUE when within 3 days of deadline (or overdue)
  isOverdue: boolean; // TRUE when daysRemaining < 0
  isDueToday: boolean; // TRUE when daysRemaining === 0
  isDueSoon: boolean; // TRUE when daysRemaining >= 1 && daysRemaining <= 3
  statusText: string; // e.g. "Due in 2 days", "Due Today!", "Overdue by 1 day"
  badgeSeverity: 'critical' | 'warning' | 'normal' | 'completed' | 'none';
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  iconColor: string;
  warningMessage?: string;
  relativeTimeText: string;
}

/**
 * Computes comprehensive deadline metrics and visual warning indicators for a compliance item.
 * 
 * @param dueDate - ISO date string (YYYY-MM-DD or full timestamp)
 * @param isCompliant - Whether item has already been checked off / resolved
 * @param referenceDate - Optional override for reference date (defaults to current client time)
 */
export function getDeadlineInfo(
  dueDate?: string | null,
  isCompliant: boolean = false,
  referenceDate?: Date
): DeadlineInfo {
  if (!dueDate || typeof dueDate !== 'string' || dueDate.trim() === '') {
    return {
      hasDueDate: false,
      dueDate: null,
      formattedDate: 'No deadline set',
      daysRemaining: null,
      isUrgent: false,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      statusText: 'No deadline',
      badgeSeverity: 'none',
      badgeBg: '#f8fafc',
      badgeBorder: '#e2e8f0',
      textColor: '#94a3b8',
      iconColor: '#94a3b8',
      relativeTimeText: 'Unscheduled'
    };
  }

  // Parse YYYY-MM-DD or full ISO
  const target = new Date(dueDate);
  if (isNaN(target.getTime())) {
    return {
      hasDueDate: false,
      dueDate: null,
      formattedDate: 'Invalid Date',
      daysRemaining: null,
      isUrgent: false,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      statusText: 'Invalid Date',
      badgeSeverity: 'none',
      badgeBg: '#f8fafc',
      badgeBorder: '#e2e8f0',
      textColor: '#94a3b8',
      iconColor: '#94a3b8',
      relativeTimeText: 'Invalid'
    };
  }

  // Normalized midnight-to-midnight comparison
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((targetMidnight - nowMidnight) / msPerDay);

  const formattedDate = target.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // If item is already compliant / checked-off, deadline pressure is resolved
  if (isCompliant) {
    return {
      hasDueDate: true,
      dueDate,
      formattedDate,
      daysRemaining,
      isUrgent: false,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      statusText: `Resolved (${formattedDate})`,
      badgeSeverity: 'completed',
      badgeBg: '#ecfdf5',
      badgeBorder: '#a7f3d0',
      textColor: '#065f46',
      iconColor: '#10b981',
      relativeTimeText: 'Completed'
    };
  }

  // Overdue
  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      hasDueDate: true,
      dueDate,
      formattedDate,
      daysRemaining,
      isUrgent: true,
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
      statusText: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
      badgeSeverity: 'critical',
      badgeBg: '#fef2f2',
      badgeBorder: '#f87171',
      textColor: '#dc2626',
      iconColor: '#dc2626',
      warningMessage: `CRITICAL ALERT: Target deadline was ${formattedDate} (${overdueDays} day${overdueDays === 1 ? '' : 's'} ago). Immediate remedial audit required.`,
      relativeTimeText: `${overdueDays}d overdue`
    };
  }

  // Due Today
  if (daysRemaining === 0) {
    return {
      hasDueDate: true,
      dueDate,
      formattedDate,
      daysRemaining: 0,
      isUrgent: true,
      isOverdue: false,
      isDueToday: true,
      isDueSoon: true,
      statusText: 'Due Today!',
      badgeSeverity: 'critical',
      badgeBg: '#fff1f2',
      badgeBorder: '#fb7185',
      textColor: '#e11d48',
      iconColor: '#e11d48',
      warningMessage: `DEADLINE TODAY (${formattedDate}): Compliance sign-off required before close of business.`,
      relativeTimeText: 'Today'
    };
  }

  // Due in 1 to 3 days: PRIMARY WARNING THRESHOLD
  if (daysRemaining <= 3) {
    const label = daysRemaining === 1 ? 'Due Tomorrow' : `Due in ${daysRemaining} days`;
    return {
      hasDueDate: true,
      dueDate,
      formattedDate,
      daysRemaining,
      isUrgent: true,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      statusText: label,
      badgeSeverity: 'critical',
      badgeBg: '#fef2f2',
      badgeBorder: '#fca5a5',
      textColor: '#b91c1c',
      iconColor: '#dc2626',
      warningMessage: `DEADLINE WARNING: This requirement is due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${formattedDate}). Immediate review needed.`,
      relativeTimeText: `${daysRemaining}d left`
    };
  }

  // Due in 4 to 7 days
  if (daysRemaining <= 7) {
    return {
      hasDueDate: true,
      dueDate,
      formattedDate,
      daysRemaining,
      isUrgent: false,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      statusText: `Due in ${daysRemaining} days`,
      badgeSeverity: 'warning',
      badgeBg: '#fffbeb',
      badgeBorder: '#fde68a',
      textColor: '#b45309',
      iconColor: '#f59e0b',
      relativeTimeText: `${daysRemaining}d left`
    };
  }

  // Scheduled further out
  return {
    hasDueDate: true,
    dueDate,
    formattedDate,
    daysRemaining,
    isUrgent: false,
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    statusText: `Due ${formattedDate}`,
    badgeSeverity: 'normal',
    badgeBg: '#f8fafc',
    badgeBorder: '#e2e8f0',
    textColor: '#475569',
    iconColor: '#64748b',
    relativeTimeText: `${daysRemaining}d left`
  };
}

/**
 * Returns formatted YYYY-MM-DD date string offset by N days from today.
 */
export function getPresetDueDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/**
 * Formats a raw YYYY-MM-DD string into a human-friendly date like "28 Sep 2026".
 */
export function formatFriendlyDate(dateStr?: string | null): string {
  if (!dateStr) return 'Unscheduled';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
