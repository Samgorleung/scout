import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HourglassEmpty as PendingIcon,
  Flag as FlagIcon,
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  BookmarkBorder as DocIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Done as DoneIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Tune as TuneIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import {
  ComplianceRequirementItem,
  ComplianceStatusTransition,
  synthesizeItemTransitions
} from '@/lib/seedData';
import { getPriorityInfo } from '@/utils/priorityUtils';

interface ComplianceTransitionTimelineProps {
  selectedItem?: ComplianceRequirementItem | null;
  allItems?: ComplianceRequirementItem[];
  onSelectItem?: (item: ComplianceRequirementItem) => void;
  onClose?: () => void;
  onStatusTransition?: (
    item: ComplianceRequirementItem,
    newStatus: 'Compliant' | 'In Progress' | 'Flagged' | 'N/A',
    notes: string,
    triggerType: ComplianceStatusTransition['triggerType'],
    evidenceRef?: string
  ) => Promise<void> | void;
  currentUser?: {
    name: string;
    role: string;
    email: string;
  };
  mode?: 'embedded' | 'drawer' | 'card';
}

/**
 * Visual Timeline Component displaying the status transition audit history
 * for an evaluated compliance requirement item under HM Treasury & IPA Gateway frameworks.
 */
export const ComplianceTransitionTimeline: React.FC<ComplianceTransitionTimelineProps> = ({
  selectedItem,
  allItems = [],
  onSelectItem,
  onClose,
  onStatusTransition,
  currentUser = {
    name: 'Lead Assurance Reviewer',
    role: 'Lead Assurance Reviewer',
    email: 'samgorleung1224@gmail.com'
  },
  mode = 'embedded'
}) => {
  // Sort order: newest first (descending) vs oldest first (ascending)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  // Status filter within timeline events
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  // Keyword filter in notes
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Item switcher search query
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  // Copy feedback state
  const [copied, setCopied] = useState<boolean>(false);
  // Log transition modal / drawer state
  const [isLogFormOpen, setIsLogFormOpen] = useState<boolean>(false);
  // Log transition form inputs
  const [targetStatus, setTargetStatus] = useState<'Compliant' | 'In Progress' | 'Flagged' | 'N/A'>('Compliant');
  const [triggerType, setTriggerType] = useState<ComplianceStatusTransition['triggerType']>('Formal Review');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [evidenceRef, setEvidenceRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fallback to first available item if none explicitly selected
  const activeItem: ComplianceRequirementItem | null =
    selectedItem || (allItems.length > 0 ? allItems[0] : null);

  // Compute transition events (from item or synthesized baseline)
  const rawTransitions: ComplianceStatusTransition[] = useMemo(() => {
    if (!activeItem) return [];
    return synthesizeItemTransitions(activeItem);
  }, [activeItem]);

  // Filtered & Sorted Transitions
  const transitions: ComplianceStatusTransition[] = useMemo(() => {
    let list = [...rawTransitions];

    // Filter by target status if selected
    if (statusFilter !== 'ALL') {
      list = list.filter(t => t.toStatus === statusFilter);
    }

    // Filter by keyword in notes or actor
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          (t.notes || '').toLowerCase().includes(q) ||
          (t.actorName || '').toLowerCase().includes(q) ||
          (t.actorRole || '').toLowerCase().includes(q) ||
          (t.evidenceRef && t.evidenceRef.toLowerCase().includes(q))
      );
    }

    // Sort order
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [rawTransitions, statusFilter, searchQuery, sortOrder]);

  // Compute overall lifecycle statistics
  const lifecycleStats = useMemo(() => {
    if (!activeItem || rawTransitions.length === 0) {
      return {
        totalEvents: 0,
        firstDate: null,
        latestDate: null,
        dwellDays: 0,
        totalCycleDays: 0
      };
    }

    const sortedAsc = [...rawTransitions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const firstEvent = sortedAsc[0];
    const latestEvent = sortedAsc[sortedAsc.length - 1];

    const firstTime = new Date(firstEvent.timestamp).getTime();
    const latestTime = new Date(latestEvent.timestamp).getTime();
    const nowTime = new Date().getTime();

    const totalCycleDays = Math.max(1, Math.round((nowTime - firstTime) / (1000 * 60 * 60 * 24)));
    const dwellDays = Math.max(0, Math.round((nowTime - latestTime) / (1000 * 60 * 60 * 24)));

    return {
      totalEvents: rawTransitions.length,
      firstDate: firstEvent.timestamp,
      latestDate: latestEvent.timestamp,
      dwellDays,
      totalCycleDays
    };
  }, [activeItem, rawTransitions]);

  // Handle Form Submission
  const handleLogTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!transitionNotes.trim()) return;

    setIsSubmitting(true);
    try {
      if (onStatusTransition) {
        await onStatusTransition(
          activeItem,
          targetStatus,
          transitionNotes.trim(),
          triggerType,
          evidenceRef.trim() || activeItem.documentRef
        );
      }
      // Reset form and close
      setTransitionNotes('');
      setIsLogFormOpen(false);
    } catch (err) {
      console.error('Error logging status transition:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy Audit Summary to Clipboard
  const handleCopyAuditTrail = () => {
    if (!activeItem) return;
    const header = `AUDIT TRAIL REPORT: [${activeItem.code}] ${activeItem.title}\nGate: ${activeItem.gate} | Category: ${activeItem.category} | Priority: ${activeItem.priority}\nCurrent Status: ${activeItem.status} | Total Events: ${rawTransitions.length}\n--------------------------------------------------\n`;
    const body = rawTransitions
      .map((t, idx) => {
        const dateStr = new Date(t.timestamp).toUTCString();
        return `${idx + 1}. [${dateStr}]\n   Transition: ${t.fromStatus} -> ${t.toStatus} (${t.triggerType})\n   Reviewer: ${t.actorName} (${t.actorRole})\n   Notes: ${t.notes}\n   ${t.evidenceRef ? `Evidence: ${t.evidenceRef}\n` : ''}`;
      })
      .join('\n');

    navigator.clipboard.writeText(header + body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter items for quick item switcher
  const filteredAllItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return allItems;
    const q = itemSearchQuery.toLowerCase();
    return allItems.filter(
      item =>
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, itemSearchQuery]);

  // Status Styling Utility
  const getStatusVisuals = (status: string) => {
    switch (status) {
      case 'Compliant':
        return {
          bg: '#ecfdf5',
          border: '#10b981',
          text: '#047857',
          iconColor: '#059669',
          label: 'Compliant',
          symbol: '✓'
        };
      case 'In Progress':
        return {
          bg: '#fffbeb',
          border: '#f59e0b',
          text: '#b45309',
          iconColor: '#d97706',
          label: 'In Progress',
          symbol: '⌛'
        };
      case 'Flagged':
        return {
          bg: '#fef2f2',
          border: '#ef4444',
          text: '#b91c1c',
          iconColor: '#dc2626',
          label: 'Flagged',
          symbol: '⚠️'
        };
      case 'Baseline':
        return {
          bg: '#f8fafc',
          border: '#94a3b8',
          text: '#475569',
          iconColor: '#64748b',
          label: 'Baseline Inception',
          symbol: '⚐'
        };
      default:
        return {
          bg: '#f1f5f9',
          border: '#cbd5e1',
          text: '#334155',
          iconColor: '#64748b',
          label: status,
          symbol: '•'
        };
    }
  };

  // Format Relative Time
  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 30) return `${diffDays} days ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Format Absolute Date & Time
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  // If no items exist in project
  if (!activeItem) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '48px 24px',
        textAlign: 'center'
      }}>
        <TimelineIcon style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
          No Compliance Requirement Selected
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '440px', margin: '0 auto' }}>
          Select a compliance requirement from the audit checklist to inspect its full status transition history and reviewer timeline.
        </p>
      </div>
    );
  }

  const activeVisual = getStatusVisuals(activeItem.status);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: mode === 'drawer' ? '0' : '10px',
      border: mode === 'drawer' ? 'none' : '1px solid #e2e8f0',
      boxShadow: mode === 'drawer' ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.04)',
      overflow: 'hidden'
    }}>
      {/* 1. Header Toolbar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TimelineIcon style={{ fontSize: '1.25rem' }} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Status Transition History</span>
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                fontWeight: 600,
                color: '#1d70b8',
                backgroundColor: '#e0f2fe',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {activeItem.code}
              </span>
            </h2>
            <div style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>Audit Trail</span>
              <span aria-hidden="true">·</span>
              <span>HM Treasury & IPA Gateway Verification Log</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Quick Copy Audit Trail Button */}
          <button
            onClick={handleCopyAuditTrail}
            title="Copy audit trail summary to clipboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: copied ? '#ecfdf5' : '#ffffff',
              color: copied ? '#059669' : '#334155',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {copied ? (
              <>
                <DoneIcon style={{ fontSize: '0.95rem' }} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon style={{ fontSize: '0.95rem' }} />
                <span>Copy Log</span>
              </>
            )}
          </button>

          {/* Log New Transition Button */}
          <button
            onClick={() => {
              setTargetStatus(activeItem.status === 'Compliant' ? 'In Progress' : 'Compliant');
              setEvidenceRef(activeItem.documentRef || '');
              setIsLogFormOpen(!isLogFormOpen);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #1d70b8',
              backgroundColor: '#1d70b8',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <AddIcon style={{ fontSize: '1rem' }} />
            <span>{isLogFormOpen ? 'Close Form' : 'Log Transition'}</span>
          </button>

          {/* Close drawer button if in drawer mode */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close transition timeline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <CloseIcon style={{ fontSize: '1.1rem' }} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Item Selector Bar (if allItems provided) */}
      {allItems.length > 1 && (
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0
          }}>
            Select Item:
          </span>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {allItems.slice(0, 10).map((it) => {
              const isCurrent = it.id === activeItem.id;
              const itVisual = getStatusVisuals(it.status);
              return (
                <button
                  key={it.id}
                  onClick={() => onSelectItem && onSelectItem(it)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${isCurrent ? '#1d70b8' : '#e2e8f0'}`,
                    backgroundColor: isCurrent ? '#eff6ff' : '#f8fafc',
                    color: isCurrent ? '#1d4ed8' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: isCurrent ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{it.code}</span>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: itVisual.border
                  }} />
                </button>
              );
            })}

            {allItems.length > 10 && (
              <select
                value={activeItem.id}
                onChange={(e) => {
                  const found = allItems.find(i => i.id === e.target.value);
                  if (found && onSelectItem) onSelectItem(found);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.75rem',
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {allItems.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.code} - {it.title.substring(0, 36)}...
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* 3. Selected Item Overview Banner */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          {/* Item details */}
          <div style={{ flex: '1 1 340px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#64748b',
              marginBottom: '4px'
            }}>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#1d70b8',
                backgroundColor: '#eff6ff',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {activeItem.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeItem.gate}</span>
              <span aria-hidden="true">·</span>
              <span>{activeItem.category}</span>
              <span aria-hidden="true">·</span>
              {(() => {
                const prio = getPriorityInfo(activeItem.priority);
                return (
                  <span style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: prio.bg,
                    color: prio.text,
                    border: `1px solid ${prio.border}`
                  }}>
                    {prio.icon} {prio.label}
                  </span>
                );
              })()}
            </div>

            <h3 style={{
              margin: '0 0 6px 0',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.35
            }}>
              {activeItem.title}
            </h3>

            <p style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: '#475569',
              lineHeight: 1.45,
              maxWidth: '780px'
            }}>
              {activeItem.description}
            </p>
          </div>

          {/* Current Status Pill & Dwell Metric */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '6px',
            flexShrink: 0
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1.5px solid ${activeVisual.border}`,
              backgroundColor: activeVisual.bg,
              color: activeVisual.text,
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: activeVisual.border,
                boxShadow: `0 0 0 3px ${activeVisual.border}33`
              }} />
              <span>Current Status: {activeVisual.label}</span>
            </div>

            <div style={{
              fontSize: '0.75rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <AccessTimeIcon style={{ fontSize: '0.875rem', color: '#94a3b8' }} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                In this state for {lifecycleStats.dwellDays} {lifecycleStats.dwellDays === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Strip (Tabular Numerals) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Transitions
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
              {lifecycleStats.totalEvents} Events
            </div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Assurance Velocity
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
              {lifecycleStats.totalCycleDays} Days Total
            </div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Sign-Off Reviewer
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeItem.checkedBy || activeItem.auditorName || 'Pending'}
            </div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Evidence Linked
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1d70b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeItem.documentRef ? (
                <Link href="/file-viewer" passHref legacyBehavior>
                  <a style={{ color: '#1d70b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DocIcon style={{ fontSize: '0.95rem' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeItem.documentRef}</span>
                  </a>
                </Link>
              ) : (
                <span style={{ color: '#94a3b8' }}>None attached</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Log Transition Form (Expandable) */}
      <AnimatePresence>
        {isLogFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              backgroundColor: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              padding: '18px 20px',
              overflow: 'hidden'
            }}
          >
            <form onSubmit={handleLogTransition}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <TimelineIcon style={{ fontSize: '1.1rem', color: '#1d70b8' }} />
                  Record Gateway Status Transition for {activeItem.code}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsLogFormOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <CloseIcon style={{ fontSize: '1rem' }} />
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '12px'
              }}>
                {/* Target Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    New Status <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  >
                    <option value="Compliant">✓ Compliant</option>
                    <option value="In Progress">⌛ In Progress</option>
                    <option value="Flagged">⚠️ Flagged</option>
                    <option value="N/A">⊘ N/A</option>
                  </select>
                </div>

                {/* Trigger Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Trigger / Review Type <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.85rem',
                      color: '#0f172a'
                    }}
                  >
                    <option value="Formal Review">Formal Gateway Review</option>
                    <option value="Remediation Verified">Remediation Verified</option>
                    <option value="Risk Escalation">Risk Escalation</option>
                    <option value="Auditor Sign-off">Auditor Sign-off</option>
                    <option value="Evidence Submission">Evidence Submission</option>
                    <option value="Status Downgrade">Status Downgrade</option>
                  </select>
                </div>

                {/* Evidence Document */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Evidence Document Reference
                  </label>
                  <input
                    type="text"
                    value={evidenceRef}
                    onChange={(e) => setEvidenceRef(e.target.value)}
                    placeholder="e.g. Monte_Carlo_P80_Sensitivity.pdf"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.85rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {/* Justification & Notes */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Auditor Findings & Reason for Transition <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="Detail the audit findings, verified criteria, Green Book/IPA standards, or rationale for this transition..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Reviewer signature notice and submit */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  Author: <strong>{currentUser.name}</strong> ({currentUser.role})
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsLogFormOpen(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '0.8125rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !transitionNotes.trim()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #1d70b8',
                      backgroundColor: '#1d70b8',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: isSubmitting ? 'wait' : 'pointer'
                    }}
                  >
                    {isSubmitting ? 'Recording Transition...' : 'Commit Status Transition'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Timeline Filters & Search Toolbar */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Status Filter Buttons (Segmented Controls) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#f1f5f9',
          padding: '3px',
          borderRadius: '8px'
        }}>
          {['ALL', 'Compliant', 'In Progress', 'Flagged'].map((st) => {
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {st === 'ALL' ? 'All Transitions' : st}
              </button>
            );
          })}
        </div>

        {/* Right side: Search in notes & Sort Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Notes keyword search */}
          <div style={{ position: 'relative', width: '220px' }}>
            <SearchIcon style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1rem',
              color: '#94a3b8'
            }} />
            <input
              type="text"
              placeholder="Search findings & actors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 24px 5px 28px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <CloseIcon
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.9rem',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              />
            )}
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            title={`Sort order: ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDownwardIcon style={{ fontSize: '0.9rem', color: '#1d70b8' }} />
                <span>Newest First</span>
              </>
            ) : (
              <>
                <ArrowUpwardIcon style={{ fontSize: '0.9rem', color: '#1d70b8' }} />
                <span>Oldest First</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6. Vertical Visual Timeline Section */}
      <div style={{
        padding: '28px 24px',
        backgroundColor: '#fafbfc',
        minHeight: '360px'
      }}>
        {transitions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}>
            <FilterIcon style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '8px' }} />
            <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#334155' }}>
              No status transitions match your filter criteria
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>
              Try clearing your search query or setting the status filter to &quot;All Transitions&quot;.
            </p>
          </div>
        ) : (
          <div style={{
            position: 'relative',
            maxWidth: '880px',
            margin: '0 auto'
          }}>
            {/* The Central Continuous Timeline Spine */}
            <div style={{
              position: 'absolute',
              top: '16px',
              bottom: '16px',
              left: '20px',
              width: '2px',
              backgroundColor: '#e2e8f0',
              zIndex: 1
            }} />

            {/* Transition Event Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {transitions.map((item, index) => {
                const toVisual = getStatusVisuals(item.toStatus);
                const fromVisual = getStatusVisuals(item.fromStatus);
                const isLatest = index === 0 && sortOrder === 'desc';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '20px',
                      zIndex: 2
                    }}
                  >
                    {/* Node on Timeline Spine */}
                    <div style={{
                      position: 'relative',
                      flexShrink: 0,
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: `2.5px solid ${toVisual.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: toVisual.iconColor,
                      boxShadow: isLatest
                        ? `0 0 0 4px ${toVisual.border}26, 0 2px 6px rgba(0,0,0,0.06)`
                        : '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'all 0.2s ease'
                    }}>
                      {item.toStatus === 'Compliant' && <CheckCircleIcon style={{ fontSize: '1.25rem' }} />}
                      {item.toStatus === 'In Progress' && <PendingIcon style={{ fontSize: '1.25rem' }} />}
                      {item.toStatus === 'Flagged' && <WarningIcon style={{ fontSize: '1.25rem' }} />}
                      {item.toStatus === 'Baseline' && <FlagIcon style={{ fontSize: '1.15rem' }} />}
                      {item.toStatus === 'N/A' && <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>⊘</span>}

                      {/* Active State Glowing Ring */}
                      {isLatest && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          left: '-4px',
                          right: '-4px',
                          bottom: '-4px',
                          borderRadius: '50%',
                          border: `1.5px dashed ${toVisual.border}`,
                          pointerEvents: 'none',
                          opacity: 0.8
                        }} />
                      )}
                    </div>

                    {/* Event Content Card */}
                    <div style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      border: `1px solid ${isLatest ? '#cbd5e1' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      padding: '16px 18px',
                      boxShadow: isLatest
                        ? '0 4px 12px -2px rgba(15, 23, 42, 0.08)'
                        : '0 1px 3px rgba(15, 23, 42, 0.03)',
                      transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
                    }}>
                      {/* Top Row: Directional Status Transition & Timestamp */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '10px'
                      }}>
                        {/* Status Change Arrow Lockup */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: fromVisual.bg,
                            color: fromVisual.text,
                            border: `1px solid ${fromVisual.border}40`
                          }}>
                            {fromVisual.label}
                          </span>

                          <ArrowForwardIcon style={{ fontSize: '0.9rem', color: '#94a3b8' }} />

                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: toVisual.bg,
                            color: toVisual.text,
                            border: `1px solid ${toVisual.border}`
                          }}>
                            {toVisual.label}
                          </span>

                          {/* Trigger Type Badge */}
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            {item.triggerType}
                          </span>

                          {isLatest && (
                            <span style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              color: '#15803d',
                              backgroundColor: '#dcfce7',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              Active State
                            </span>
                          )}
                        </div>

                        {/* Timestamp (Tabular Figures) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          color: '#64748b'
                        }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#334155' }}>
                            {formatDateTime(item.timestamp)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {getRelativeTime(item.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Author / Reviewer Attribution Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '10px'
                      }}>
                        <PersonIcon style={{ fontSize: '0.95rem', color: '#64748b' }} />
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.actorName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.actorRole}</span>
                        {item.actorEmail && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span style={{ color: '#94a3b8' }}>{item.actorEmail}</span>
                          </>
                        )}
                        {item.durationInPreviousStateDays !== undefined && item.durationInPreviousStateDays > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span style={{
                              color: '#64748b',
                              fontVariantNumeric: 'tabular-nums',
                              fontStyle: 'italic'
                            }}>
                              State dwell: {item.durationInPreviousStateDays}d
                            </span>
                          </>
                        )}
                      </div>

                      {/* Auditor Findings & Observations Block */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderLeft: `3px solid ${toVisual.border}`,
                        padding: '10px 14px',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.8125rem',
                        color: '#1e293b',
                        lineHeight: 1.5,
                        marginBottom: item.evidenceRef ? '10px' : '0'
                      }}>
                        {item.notes}
                      </div>

                      {/* Attached Evidence Link (if any) */}
                      {item.evidenceRef && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #f1f5f9',
                          fontSize: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                            <DocIcon style={{ fontSize: '0.95rem', color: '#1d70b8' }} />
                            <span>Evidence Ref:</span>
                            <strong style={{ color: '#0f172a' }}>{item.evidenceRef}</strong>
                          </div>

                          <Link href="/file-viewer" passHref legacyBehavior>
                            <a style={{
                              color: '#1d70b8',
                              textDecoration: 'none',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>View Bundle</span>
                              <OpenInNewIcon style={{ fontSize: '0.8rem' }} />
                            </a>
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 7. Footer Summary */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div>
          Showing {transitions.length} of {rawTransitions.length} chronological transition events for {activeItem.code}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Gateway: <strong>{activeItem.gate}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Category: <strong>{activeItem.category}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default ComplianceTransitionTimeline;
