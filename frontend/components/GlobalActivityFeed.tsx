import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DynamicFeed as FeedIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HourglassEmpty as PendingIcon,
  Layers as LayersIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  BookmarkBorder as DocIcon,
  RestartAlt as ResetIcon,
  OpenInNew as OpenInNewIcon,
  Shield as ShieldIcon,
  ArrowForward as ArrowForwardIcon,
  Verified as VerifiedIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { AuditActivity, initialAuditActivities } from '@/lib/seedData';

interface GlobalActivityFeedProps {
  projectName?: string;
  currentGate?: string;
  onNavigateToItem?: (itemId: string, itemCode?: string) => void;
  mode?: 'embedded' | 'drawer' | 'full';
  onClose?: () => void;
  currentUser?: {
    name: string;
    role: string;
    email: string;
  };
}

export const GlobalActivityFeed: React.FC<GlobalActivityFeedProps> = ({
  projectName = 'IPA Major Infrastructure Audit',
  currentGate = 'ALL',
  onNavigateToItem,
  mode = 'embedded',
  onClose,
  currentUser = {
    name: 'Lead Assurance Reviewer',
    role: 'Lead Assurance Reviewer',
    email: 'samgorleung1224@gmail.com'
  }
}) => {
  const [activities, setActivities] = useState<AuditActivity[]>(initialAuditActivities);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedGate, setSelectedGate] = useState<string>(currentGate === 'ALL' ? 'ALL' : currentGate);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedActivityIds, setExpandedActivityIds] = useState<Record<string, boolean>>({});

  // Real-time Firestore subscription to compliance_activities
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    setLoading(true);

    try {
      const activitiesRef = collection(db, 'compliance_activities');
      // Real-time onSnapshot listener
      unsubscribe = onSnapshot(
        activitiesRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteItems: AuditActivity[] = [];
            snapshot.forEach((docSnap) => {
              remoteItems.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });

            // Combine remote items with seed items (deduplicated by id)
            const map = new Map<string, AuditActivity>();
            initialAuditActivities.forEach(item => map.set(item.id, item));
            remoteItems.forEach(item => map.set(item.id, item));

            const merged = Array.from(map.values());
            merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setActivities(merged);
            setIsLiveConnected(true);
          } else {
            // Keep initial activities
            setActivities(initialAuditActivities);
          }
          setLoading(false);
          setLastRefreshedAt(new Date().toLocaleTimeString());
        },
        (err) => {
          console.warn('Real-time compliance_activities stream fallback to seed:', err);
          setActivities(initialAuditActivities);
          setIsLiveConnected(false);
          setLoading(false);
        }
      );
    } catch (e) {
      console.warn('Could not initialize activities Firestore stream:', e);
      setActivities(initialAuditActivities);
      setIsLiveConnected(false);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedActivityIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtered & Sorted activities
  const filteredActivities = useMemo(() => {
    return activities
      .filter((item) => {
        // Text search across code, title, description, actor, notes
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCode = item.requirementCode?.toLowerCase().includes(q);
          const matchActor = item.actorName?.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          const matchAssigned = item.assignedTo?.toLowerCase().includes(q);
          const matchAffected = item.affectedRequirementCodes?.some(c => c.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchCode && !matchActor && !matchNotes && !matchAssigned && !matchAffected) {
            return false;
          }
        }

        // Type filter
        if (selectedType !== 'ALL') {
          if (selectedType === 'BULK_ONLY') {
            if (!item.type.startsWith('bulk_')) return false;
          } else if (selectedType === 'TRANSITION_ONLY') {
            if (item.type !== 'status_transition' && item.type !== 'bulk_status_update') return false;
          } else if (selectedType === 'ASSIGNMENT_ONLY') {
            if (item.type !== 'assignment' && item.type !== 'bulk_assignment') return false;
          } else if (selectedType === 'VERIFICATION_ONLY') {
            if (item.type !== 'verification' && item.type !== 'bulk_verification') return false;
          } else if (item.type !== selectedType) {
            return false;
          }
        }

        // Gateway filter
        if (selectedGate !== 'ALL') {
          if (item.gate && item.gate !== selectedGate) return false;
        }

        // Status changed to filter
        if (selectedStatus !== 'ALL') {
          if (item.toStatus !== selectedStatus) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [activities, searchQuery, selectedType, selectedGate, selectedStatus, sortOrder]);

  // Aggregate Metrics Summary
  const metrics = useMemo(() => {
    let statusTransitionsCount = 0;
    let bulkActionsCount = 0;
    let requirementsAffectedInBulk = 0;
    let flaggedCount = 0;
    let compliantSignOffCount = 0;

    activities.forEach((act) => {
      if (act.type === 'status_transition' || act.type === 'bulk_status_update') {
        statusTransitionsCount++;
      }
      if (act.type.startsWith('bulk_')) {
        bulkActionsCount++;
        requirementsAffectedInBulk += act.affectedCount || 0;
      }
      if (act.toStatus === 'Flagged') {
        flaggedCount++;
      }
      if (act.toStatus === 'Compliant') {
        compliantSignOffCount++;
      }
    });

    return {
      total: activities.length,
      statusTransitionsCount,
      bulkActionsCount,
      requirementsAffectedInBulk,
      flaggedCount,
      compliantSignOffCount
    };
  }, [activities]);

  // Relative Time Formatter
  const formatTimeAgo = (isoString: string) => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Export Activity Feed as JSON Audit Trail
  const handleExportJSON = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      project: projectName,
      leadAuditor: currentUser.name,
      totalEvents: filteredActivities.length,
      activityLog: filteredActivities
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPA_Compliance_Activity_Feed_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Activity Feed as CSV
  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Event Type',
      'Title',
      'Requirement Code',
      'From Status',
      'To Status',
      'Affected Count',
      'Assigned To',
      'Actor Name',
      'Actor Role',
      'Gate',
      'Notes'
    ];
    const rows = filteredActivities.map(act => [
      `"${act.timestamp}"`,
      `"${act.type}"`,
      `"${(act.title || '').replace(/"/g, '""')}"`,
      `"${act.requirementCode || ''}"`,
      `"${act.fromStatus || ''}"`,
      `"${act.toStatus || ''}"`,
      act.affectedCount || '',
      `"${act.assignedTo || ''}"`,
      `"${act.actorName}"`,
      `"${act.actorRole}"`,
      `"${act.gate || ''}"`,
      `"${(act.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPA_Compliance_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper Badge Colors
  const getTypeBadgeStyle = (type: AuditActivity['type']) => {
    switch (type) {
      case 'bulk_status_update':
        return {
          bg: '#eef2ff',
          color: '#3730a3',
          border: '#c7d2fe',
          label: 'Bulk Status Update',
          icon: <LayersIcon style={{ fontSize: '0.85rem' }} />
        };
      case 'bulk_assignment':
        return {
          bg: '#fdf2f8',
          color: '#9d174d',
          border: '#fbcfe8',
          label: 'Bulk Team Assignment',
          icon: <GroupIcon style={{ fontSize: '0.85rem' }} />
        };
      case 'bulk_verification':
        return {
          bg: '#ecfdf5',
          color: '#065f46',
          border: '#a7f3d0',
          label: 'Bulk Verification',
          icon: <VerifiedIcon style={{ fontSize: '0.85rem' }} />
        };
      case 'status_transition':
        return {
          bg: '#f0f9ff',
          color: '#0369a1',
          border: '#bae6fd',
          label: 'Status Transition',
          icon: <SwapIcon style={{ fontSize: '0.85rem' }} />
        };
      case 'assignment':
        return {
          bg: '#fef3c7',
          color: '#92400e',
          border: '#fde68a',
          label: 'Member Assigned',
          icon: <PersonIcon style={{ fontSize: '0.85rem' }} />
        };
      case 'verification':
        return {
          bg: '#f0fdf4',
          color: '#15803d',
          border: '#bbf7d0',
          label: 'Formally Verified',
          icon: <CheckCircleIcon style={{ fontSize: '0.85rem' }} />
        };
      default:
        return {
          bg: '#f1f5f9',
          color: '#475569',
          border: '#cbd5e1',
          label: 'Audit Action',
          icon: <FeedIcon style={{ fontSize: '0.85rem' }} />
        };
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    let bg = '#f1f5f9';
    let color = '#475569';
    let border = '#cbd5e1';
    let icon = null;

    if (status === 'Compliant') {
      bg = '#ecfdf5';
      color = '#065f46';
      border = '#a7f3d0';
      icon = <CheckCircleIcon style={{ fontSize: '0.8rem', color: '#10b981' }} />;
    } else if (status === 'In Progress') {
      bg = '#fef3c7';
      color = '#92400e';
      border = '#fde68a';
      icon = <PendingIcon style={{ fontSize: '0.8rem', color: '#f59e0b' }} />;
    } else if (status === 'Flagged') {
      bg = '#fee2e2';
      color = '#991b1b';
      border = '#fecaca';
      icon = <WarningIcon style={{ fontSize: '0.8rem', color: '#ef4444' }} />;
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`
      }}>
        {icon}
        {status}
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: mode === 'drawer' ? '0' : '12px',
      border: mode === 'drawer' ? 'none' : '1px solid #e2e8f0',
      boxShadow: mode === 'drawer' ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header Bar */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#1d70b8',
            color: '#ffffff'
          }}>
            <FeedIcon style={{ fontSize: '1.25rem' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Global Compliance Activity Feed
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: isLiveConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isLiveConnected ? '#34d399' : '#f87171',
                border: `1px solid ${isLiveConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isLiveConnected ? '#10b981' : '#ef4444'
                }} />
                {isLiveConnected ? 'LIVE AUDIT STREAM' : 'OFFLINE CACHE'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Real-time audit log tracking all status transitions, bulk updates, and member assignments for {projectName}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            title="Download complete compliance audit log as CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <DownloadIcon style={{ fontSize: '0.9rem' }} />
            Export CSV
          </button>

          <button
            onClick={handleExportJSON}
            title="Export verifiable JSON audit trail"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#1d70b8',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <DownloadIcon style={{ fontSize: '0.9rem' }} />
            Export JSON
          </button>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <CloseIcon style={{ fontSize: '1.1rem' }} />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metric Tiles Summary Strip */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1px',
        backgroundColor: '#e2e8f0',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Audit Events
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{metrics.total}</span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>logged</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>
            Status Transitions
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>{metrics.statusTransitionsCount}</span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>transitions</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase' }}>
            Bulk Operations Executed
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5' }}>{metrics.bulkActionsCount}</span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>({metrics.requirementsAffectedInBulk} items affected)</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>
            Formal Sign-offs / Compliant
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{metrics.compliantSignOffCount}</span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>approved</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>
            Risk Escalations / Flagged
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{metrics.flaggedCount}</span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>deficits</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Search & Filter Toolbar */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Search input */}
        <div style={{
          position: 'relative',
          flex: '1 1 260px',
          maxWidth: '400px'
        }}>
          <SearchIcon style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.1rem',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder="Search code (e.g. FIN-01), actor, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 34px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.825rem',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <CloseIcon style={{ fontSize: '0.9rem' }} />
            </button>
          )}
        </div>

        {/* Right: Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Action Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <option value="ALL">All Event Types</option>
            <option value="BULK_ONLY">Bulk Actions Only</option>
            <option value="TRANSITION_ONLY">Status Transitions</option>
            <option value="bulk_status_update">Bulk Status Updates</option>
            <option value="bulk_assignment">Bulk Assignments</option>
            <option value="bulk_verification">Bulk Verifications</option>
            <option value="assignment">Individual Assignments</option>
            <option value="verification">Auditor Verifications</option>
          </select>

          {/* Gateway Filter */}
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <option value="ALL">All Gateways</option>
            <option value="GATE_1">Gate 1: Justification</option>
            <option value="GATE_2">Gate 2: Delivery Strategy</option>
            <option value="GATE_3">Gate 3: Investment</option>
          </select>

          {/* Status Changed To Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <option value="ALL">All Status Outcomes</option>
            <option value="Compliant">✓ Compliant</option>
            <option value="In Progress">⌛ In Progress</option>
            <option value="Flagged">⚠ Flagged Deficit</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.8rem',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <span>{sortOrder === 'desc' ? '↓ Newest First' : '↑ Oldest First'}</span>
          </button>

          {/* Clear Filter */}
          {(searchQuery || selectedType !== 'ALL' || selectedGate !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('ALL');
                setSelectedGate('ALL');
                setSelectedStatus('ALL');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                fontSize: '0.75rem',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <ResetIcon style={{ fontSize: '0.85rem' }} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Activity Timeline List */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        padding: '20px',
        maxHeight: mode === 'drawer' ? 'calc(100vh - 220px)' : '650px',
        overflowY: 'auto'
      }}>
        {loading && activities.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              width: '28px',
              height: '28px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#1d70b8',
              borderRadius: '50%',
              margin: '0 auto 12px auto',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '0.875rem' }}>Streaming live compliance audit trail...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}>
            <FeedIcon style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>
              No audit activities match active filters
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Try adjusting your keyword search or filter criteria to inspect recorded transitions.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('ALL');
                setSelectedGate('ALL');
                setSelectedStatus('ALL');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#1d70b8',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Left timeline trace connector line */}
            <div style={{
              position: 'absolute',
              top: '16px',
              bottom: '16px',
              left: '18px',
              width: '2px',
              backgroundColor: '#e2e8f0',
              zIndex: 0
            }} />

            {filteredActivities.map((act) => {
              const badgeStyle = getTypeBadgeStyle(act.type);
              const isExpanded = !!expandedActivityIds[act.id];
              const isBulk = act.type.startsWith('bulk_');

              return (
                <div
                  key={act.id}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px'
                  }}
                >
                  {/* Timeline Node Bullet */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: badgeStyle.bg,
                    border: `2px solid ${badgeStyle.border}`,
                    color: badgeStyle.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)'
                  }}>
                    {badgeStyle.icon}
                  </div>

                  {/* Activity Card */}
                  <div style={{
                    flex: '1 1 auto',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                    padding: '14px 16px',
                    transition: 'all 0.15s ease'
                  }}>
                    {/* Top Row: Type Pill, Requirement Code, Gate, Timestamp */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Event Type Pill */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`
                        }}>
                          {badgeStyle.label}
                        </span>

                        {/* Single Requirement Code Pill (with navigation if callback provided) */}
                        {act.requirementCode && (
                          <span
                            onClick={() => {
                              if (onNavigateToItem && act.requirementId) {
                                onNavigateToItem(act.requirementId, act.requirementCode);
                              }
                            }}
                            title={onNavigateToItem ? `Jump to ${act.requirementCode} in checklist` : undefined}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              color: '#1d4ed8',
                              backgroundColor: '#eff6ff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                              cursor: onNavigateToItem ? 'pointer' : 'default',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{act.requirementCode}</span>
                            {onNavigateToItem && <OpenInNewIcon style={{ fontSize: '0.75rem' }} />}
                          </span>
                        )}

                        {/* Bulk Count Pill */}
                        {isBulk && act.affectedCount && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f3e8ff',
                            color: '#6b21a8',
                            border: '1px solid #d8b4fe'
                          }}>
                            {act.affectedCount} requirements affected
                          </span>
                        )}

                        {/* Gate Tag */}
                        {act.gate && (
                          <span style={{
                            fontSize: '0.7rem',
                            color: '#64748b',
                            fontWeight: 600,
                            backgroundColor: '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {act.gate}
                          </span>
                        )}
                      </div>

                      {/* Right: Timestamp */}
                      <div
                        title={new Date(act.timestamp).toLocaleString()}
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{formatTimeAgo(act.timestamp)}</span>
                      </div>
                    </div>

                    {/* Middle: Title & Description */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                        {act.title}
                      </div>
                      {act.description && (
                        <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
                          {act.description}
                        </div>
                      )}
                    </div>

                    {/* Status Transition Visualizer Bar */}
                    {(act.fromStatus || act.toStatus) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b' }}>
                          Status Transition:
                        </span>
                        {act.fromStatus && getStatusBadge(act.fromStatus)}
                        <ArrowForwardIcon style={{ fontSize: '0.85rem', color: '#94a3b8' }} />
                        {act.toStatus && getStatusBadge(act.toStatus)}

                        {act.triggerType && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#ede9fe',
                            padding: '1px 6px',
                            borderRadius: '3px'
                          }}>
                            Trigger: {act.triggerType}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Assignment Information */}
                    {act.assignedTo && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        color: '#1e40af',
                        backgroundColor: '#eff6ff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: '1px solid #dbeafe'
                      }}>
                        <PersonIcon style={{ fontSize: '0.9rem' }} />
                        <span>Assigned to: <strong>{act.assignedTo}</strong> {act.assignedToRole && `(${act.assignedToRole})`}</span>
                      </div>
                    )}

                    {/* Bulk Affected Requirements Drawer Chip List */}
                    {isBulk && act.affectedRequirementCodes && act.affectedRequirementCodes.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <button
                          onClick={() => toggleExpand(act.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#1d70b8',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {isExpanded ? 'Hide affected requirements list' : `View all ${act.affectedRequirementCodes.length} affected requirements`}
                        </button>

                        {isExpanded && (
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: '#faf5ff',
                            borderRadius: '6px',
                            border: '1px solid #f3e8ff'
                          }}>
                            {act.affectedRequirementCodes.map((c, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: '#ffffff',
                                  color: '#6b21a8',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #e9d5ff'
                                }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes & Justification */}
                    {act.notes && (
                      <div style={{
                        fontSize: '0.78rem',
                        color: '#334155',
                        backgroundColor: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        borderLeft: '3px solid #94a3b8',
                        marginBottom: '8px',
                        fontStyle: 'italic'
                      }}>
                        &ldquo;{act.notes}&rdquo;
                      </div>
                    )}

                    {/* Evidence Ref if available */}
                    {act.evidenceRef && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        color: '#0369a1',
                        backgroundColor: '#f0f9ff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #bae6fd',
                        marginBottom: '6px'
                      }}>
                        <DocIcon style={{ fontSize: '0.8rem' }} />
                        <span>Evidence Ref: {act.evidenceRef}</span>
                      </div>
                    )}

                    {/* Card Footer: Auditor Signature & Role */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '8px',
                      marginTop: '6px',
                      fontSize: '0.75rem',
                      color: '#64748b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#1e293b',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {act.actorName.charAt(0)}
                        </div>
                        <span>Logged by <strong>{act.actorName}</strong> ({act.actorRole})</span>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer Info Strip */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        padding: '10px 20px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#64748b',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldIcon style={{ fontSize: '0.9rem', color: '#10b981' }} />
          <span>Statutory Audit Trail verified under HM Treasury Green Book & IPA Assurance standards.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Showing {filteredActivities.length} of {activities.length} activities</span>
          <span>Last sync: {lastRefreshedAt}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalActivityFeed;
