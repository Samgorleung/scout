"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  initialComplianceRequirements,
  initialAuditActivities,
  ComplianceRequirementItem,
  AuditActivity
} from '@/lib/seedData';
import { SeverityFilterDropdown, SeverityLevel, ALL_SEVERITY_LEVELS } from './SeverityFilterDropdown';
import { AuditFindingsTrendChart } from './AuditFindingsTrendChart';
import { AutoRefreshToggle } from './AutoRefreshToggle';
import { getFirestoreAll } from '@/lib/firebase';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowForward as ArrowForwardIcon,
  Sync as SyncIcon,
  Shield as ShieldIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export interface AuditFindingsSummaryCardProps {
  className?: string;
  initialCollapsed?: boolean;
}

export const AuditFindingsSummaryCard: React.FC<AuditFindingsSummaryCardProps> = ({
  className = '',
  initialCollapsed = false
}) => {
  const router = useRouter();
  const [requirements, setRequirements] = useState<ComplianceRequirementItem[]>(initialComplianceRequirements);
  const [auditLogs, setAuditLogs] = useState<AuditActivity[]>(initialAuditActivities);
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed);
  const [showAuditFeed, setShowAuditFeed] = useState<boolean>(false);
  const [showTrendChart, setShowTrendChart] = useState<boolean>(false);
  const [auditLogFilter, setAuditLogFilter] = useState<'ALL' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
  const [selectedSeverities, setSelectedSeverities] = useState<SeverityLevel[]>(ALL_SEVERITY_LEVELS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Compute severity distribution counts across requirements
  const severityCounts = useMemo(() => {
    const counts: Record<SeverityLevel, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };
    requirements.forEach(r => {
      const p = (r.priority || 'Medium') as SeverityLevel;
      if (counts[p] !== undefined) {
        counts[p]++;
      }
    });
    return counts;
  }, [requirements]);

  // Load persistence preference for collapsed state from localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('ipa_scout_summary_collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }
    } catch {
      // Fallback if localStorage unavailable
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ipa_scout_summary_collapsed', String(next));
      } catch {
        // Fallback
      }
      return next;
    });
  };

  // Real-time Firestore sync with local seed fallback
  useEffect(() => {
    let unsubRequirements: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;

    try {
      unsubRequirements = onSnapshot(
        collection(db, 'compliance_requirements'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as ComplianceRequirementItem[];
            setRequirements(items);
            setIsLiveSynced(true);
          } else {
            setRequirements(initialComplianceRequirements);
          }
        },
        (error) => {
          console.warn('[AuditFindingsSummaryCard] Firestore requirements listener notice:', error);
          setRequirements(initialComplianceRequirements);
          setIsLiveSynced(false);
        }
      );

      unsubLogs = onSnapshot(
        collection(db, 'audit_activities'),
        (snapshot) => {
          if (!snapshot.empty) {
            const logs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as AuditActivity[];
            setAuditLogs(logs);
          } else {
            setAuditLogs(initialAuditActivities);
          }
        },
        (error) => {
          console.warn('[AuditFindingsSummaryCard] Firestore audit activities listener notice:', error);
          setAuditLogs(initialAuditActivities);
        }
      );
    } catch (err) {
      console.warn('[AuditFindingsSummaryCard] Initialization fallback:', err);
      setRequirements(initialComplianceRequirements);
      setAuditLogs(initialAuditActivities);
    }

    return () => {
      if (unsubRequirements) unsubRequirements();
      if (unsubLogs) unsubLogs();
    };
  }, []);

  // Compute Passed, Failed, Pending counts from findings/requirements and audit logs
  const metrics = useMemo(() => {
    const passed = requirements.filter(
      r => (r.status as string) === 'Compliant' || (r.status as string) === 'Passed' || (r.isChecked && (r.status as string) !== 'Flagged')
    ).length;

    const failed = requirements.filter(
      r => (r.status as string) === 'Flagged' || (r.status as string) === 'Failed'
    ).length;

    const pending = requirements.filter(
      r => (r.status as string) === 'In Progress' || (r.status as string) === 'Pending' || (r.status as string) === 'N/A' || (!r.isChecked && (r.status as string) !== 'Flagged' && (r.status as string) !== 'Compliant')
    ).length;

    const total = passed + failed + pending;
    const passPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    const failPercentage = total > 0 ? Math.round((failed / total) * 100) : 0;
    const pendingPercentage = total > 0 ? Math.round((pending / total) * 100) : 0;

    return {
      passed,
      failed,
      pending,
      total,
      passPercentage,
      failPercentage,
      pendingPercentage
    };
  }, [requirements]);

  // Filtered audit activity logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditLogFilter === 'ALL') return true;
      const desc = (log.description || '').toLowerCase();
      const title = (log.title || '').toLowerCase();
      const type = (log.type || '').toLowerCase();

      if (auditLogFilter === 'PASSED') {
        return desc.includes('compliant') || desc.includes('approved') || desc.includes('verified') || title.includes('compliant') || type === 'audit_signoff';
      }
      if (auditLogFilter === 'FAILED') {
        return desc.includes('flagged') || desc.includes('risk') || desc.includes('non-compliance') || title.includes('risk') || type === 'risk_flag';
      }
      if (auditLogFilter === 'PENDING') {
        return desc.includes('in progress') || desc.includes('pending') || desc.includes('upload') || title.includes('evidence') || type === 'evidence_upload';
      }
      return true;
    });
  }, [auditLogs, auditLogFilter]);

  // Poll audit log source for new findings and status transitions every 30 seconds
  const handlePollAuditSource = useCallback(async () => {
    let newItemsCount = 0;
    try {
      const freshReqs = await getFirestoreAll('compliance_requirements');
      if (Array.isArray(freshReqs) && freshReqs.length > 0) {
        setRequirements(freshReqs);
      }

      const freshLogs = await getFirestoreAll('audit_activities');
      if (Array.isArray(freshLogs) && freshLogs.length > 0) {
        setAuditLogs((prevLogs) => {
          const prevIds = new Set(prevLogs.map(l => l.id));
          const newCount = freshLogs.filter(l => !prevIds.has(l.id)).length;
          newItemsCount = newCount;
          return freshLogs;
        });
      }
      setIsLiveSynced(true);
    } catch (err) {
      console.warn('[AuditFindingsSummaryCard] Polling notice:', err);
    }
    return { newCount: newItemsCount };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await handlePollAuditSource();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  return (
    <section
      aria-label="High-Level Audit Findings Summary"
      className={`audit-findings-summary-card ${className}`}
      style={{
        marginBottom: '24px',
        fontFamily: 'inherit'
      }}
    >
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}>
        {/* Top Header & Context Strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left: Domain Lead & Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#1d70b8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(29, 112, 184, 0.2)'
            }}>
              <ShieldIcon style={{ fontSize: '1.25rem' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.01em'
                }}>
                  Executive Audit Findings & Assurance Scorecard
                </h2>
                
                {/* Live Sync Badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: isLiveSynced ? '#ecfdf5' : '#f1f5f9',
                  color: isLiveSynced ? '#059669' : '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: `1px solid ${isLiveSynced ? '#a7f3d0' : '#e2e8f0'}`
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isLiveSynced ? '#10b981' : '#94a3b8'
                  }} />
                  {isLiveSynced ? 'Live Cloud Sync' : 'Static Seed Verified'}
                </span>
              </div>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '0.75rem',
                color: '#64748b'
              }}>
                Real-time compliance evaluations across HM Treasury Green Book & IPA Gateway standards
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Severity Level Filter Dropdown */}
            <SeverityFilterDropdown
              selectedSeverities={selectedSeverities}
              onSeveritiesChange={setSelectedSeverities}
              severityCounts={severityCounts}
              totalCount={metrics.total}
              compact={true}
              label="Severity"
            />

            {/* Quick Toggle for Line Chart Trend */}
            <button
              type="button"
              onClick={() => setShowTrendChart(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                backgroundColor: showTrendChart ? '#e2e8f0' : '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Toggle findings trajectory line chart"
            >
              <ShowChartIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
              <span>Findings Trend</span>
            </button>

            {/* Quick Toggle for Recent Audit Log Stream */}
            <button
              type="button"
              onClick={() => setShowAuditFeed(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                backgroundColor: showAuditFeed ? '#e2e8f0' : '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Toggle recent audit log activities"
            >
              <HistoryIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
              <span>Audit Log Feed</span>
              <span style={{
                backgroundColor: '#1d70b8',
                color: '#ffffff',
                borderRadius: '9999px',
                padding: '1px 6px',
                fontSize: '0.65rem',
                fontWeight: 700
              }}>
                {auditLogs.length}
              </span>
            </button>

            {/* 30-Second Auto-Refresh Polling Toggle */}
            <AutoRefreshToggle
              intervalSeconds={30}
              onPoll={handlePollAuditSource}
              compact={true}
              label="Auto-Poll (30s)"
              storageKey="ipa_scout_summary_card_auto_refresh"
            />

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
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
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Refresh findings metrics now"
            >
              <SyncIcon style={{
                fontSize: '1rem',
                animation: isRefreshing ? 'spin 0.6s linear infinite' : 'none'
              }} />
            </button>

            {/* Download PDF via browser print-to-PDF styles */}
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              title="Download / Print executive audit findings scorecard to PDF using print media styles"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <PictureAsPdfIcon style={{ fontSize: '0.95rem', color: '#dc2626' }} />
              <span>Download PDF</span>
            </button>

            {/* Collapse / Expand Toggle */}
            <button
              type="button"
              onClick={handleToggleCollapse}
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
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? 'Expand summary card' : 'Collapse summary card'}
            >
              <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
              {isCollapsed ? (
                <ExpandMoreIcon style={{ fontSize: '1.1rem' }} />
              ) : (
                <ExpandLessIcon style={{ fontSize: '1.1rem' }} />
              )}
            </button>
          </div>
        </div>

        {/* Collapsed State Summary Strip */}
        {isCollapsed && (
          <div style={{
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Passed Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Passed:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                  {metrics.passed}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                  ({metrics.passPercentage}%)
                </span>
              </div>

              {/* Failed Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444'
                }} />
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Failed:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626' }}>
                  {metrics.failed}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                  ({metrics.failPercentage}%)
                </span>
              </div>

              {/* Pending Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b'
                }} />
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pending:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>
                  {metrics.pending}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
                  ({metrics.pendingPercentage}%)
                </span>
              </div>

              {/* Total Scope */}
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Total Evaluated: <strong style={{ color: '#0f172a' }}>{metrics.total}</strong>
              </div>
            </div>

            {/* Quick Link */}
            <Link href="/compliance-tracker" passHref legacyBehavior>
              <a style={{
                fontSize: '0.75rem',
                color: '#1d70b8',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                Open Full Compliance Tracker <ArrowForwardIcon style={{ fontSize: '0.85rem' }} />
              </a>
            </Link>
          </div>
        )}

        {/* Full Card Content Viewport */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ padding: '20px 24px' }}>
                {/* 3 Prominent High-Level Status Pillars */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {/* Pillar 1: PASSED FINDINGS */}
                  <Link href="/compliance-tracker?filter=Compliant" passHref legacyBehavior>
                    <a style={{
                      textDecoration: 'none',
                      display: 'block'
                    }}>
                      <div
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderLeft: '4px solid #16a34a',
                          borderRadius: '8px',
                          padding: '16px 18px',
                          transition: 'all 0.18s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(22, 163, 74, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#166534',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            <CheckCircleIcon style={{ fontSize: '1.1rem', color: '#16a34a' }} />
                            Passed Findings
                          </span>
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid #86efac'
                          }}>
                            {metrics.passPercentage}% of Total
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#14532d',
                            lineHeight: 1,
                            letterSpacing: '-0.02em'
                          }}>
                            {metrics.passed}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 500 }}>
                            compliant findings verified
                          </span>
                        </div>

                        <p style={{
                          margin: '8px 0 0 0',
                          fontSize: '0.75rem',
                          color: '#166534',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>Criteria satisfied with confirmed audit evidence</span>
                          <ArrowForwardIcon style={{ fontSize: '0.85rem' }} />
                        </p>
                      </div>
                    </a>
                  </Link>

                  {/* Pillar 2: FAILED FINDINGS */}
                  <Link href="/compliance-tracker?filter=Flagged" passHref legacyBehavior>
                    <a style={{
                      textDecoration: 'none',
                      display: 'block'
                    }}>
                      <div
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderLeft: '4px solid #dc2626',
                          borderRadius: '8px',
                          padding: '16px 18px',
                          transition: 'all 0.18s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(220, 38, 38, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#991b1b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            <CancelIcon style={{ fontSize: '1.1rem', color: '#dc2626' }} />
                            Failed Findings
                          </span>
                          <span style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid #fca5a5'
                          }}>
                            {metrics.failPercentage}% of Total
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#7f1d1d',
                            lineHeight: 1,
                            letterSpacing: '-0.02em'
                          }}>
                            {metrics.failed}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#991b1b', fontWeight: 500 }}>
                            flagged risks requiring fix
                          </span>
                        </div>

                        <p style={{
                          margin: '8px 0 0 0',
                          fontSize: '0.75rem',
                          color: '#991b1b',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>Critical non-compliance or remediation gaps</span>
                          <ArrowForwardIcon style={{ fontSize: '0.85rem' }} />
                        </p>
                      </div>
                    </a>
                  </Link>

                  {/* Pillar 3: PENDING FINDINGS */}
                  <Link href="/compliance-tracker?filter=In%20Progress" passHref legacyBehavior>
                    <a style={{
                      textDecoration: 'none',
                      display: 'block'
                    }}>
                      <div
                        style={{
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderLeft: '4px solid #d97706',
                          borderRadius: '8px',
                          padding: '16px 18px',
                          transition: 'all 0.18s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(217, 119, 6, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#92400e',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            <HourglassIcon style={{ fontSize: '1.1rem', color: '#d97706' }} />
                            Pending Findings
                          </span>
                          <span style={{
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid #fcd34d'
                          }}>
                            {metrics.pendingPercentage}% of Total
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#78350f',
                            lineHeight: 1,
                            letterSpacing: '-0.02em'
                          }}>
                            {metrics.pending}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>
                            under active audit / review
                          </span>
                        </div>

                        <p style={{
                          margin: '8px 0 0 0',
                          fontSize: '0.75rem',
                          color: '#92400e',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>Awaiting supplementary evidence or signoff</span>
                          <ArrowForwardIcon style={{ fontSize: '0.85rem' }} />
                        </p>
                      </div>
                    </a>
                  </Link>
                </div>

                {/* Segmented Compliance Distribution Bar */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: '#475569',
                    fontWeight: 600
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AssessmentIcon style={{ fontSize: '0.95rem', color: '#1d70b8' }} />
                      <span>Portfolio Findings Breakdown</span>
                      <span style={{ color: '#94a3b8' }}>({metrics.total} total assurance requirements)</span>
                    </span>
                    <span>
                      Overall Compliance Health: <strong style={{ color: metrics.passPercentage >= 70 ? '#059669' : '#d97706' }}>{metrics.passPercentage}% Verified</strong>
                    </span>
                  </div>

                  {/* Multi-segment progress bar */}
                  <div style={{
                    height: '10px',
                    width: '100%',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    <div
                      style={{
                        width: `${metrics.passPercentage}%`,
                        backgroundColor: '#10b981',
                        transition: 'width 0.4s ease'
                      }}
                      title={`Passed: ${metrics.passed} (${metrics.passPercentage}%)`}
                    />
                    <div
                      style={{
                        width: `${metrics.failPercentage}%`,
                        backgroundColor: '#ef4444',
                        transition: 'width 0.4s ease'
                      }}
                      title={`Failed: ${metrics.failed} (${metrics.failPercentage}%)`}
                    />
                    <div
                      style={{
                        width: `${metrics.pendingPercentage}%`,
                        backgroundColor: '#f59e0b',
                        transition: 'width 0.4s ease'
                      }}
                      title={`Pending: ${metrics.pending} (${metrics.pendingPercentage}%)`}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.7rem',
                    color: '#64748b',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '2px'
                  }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        Passed: <strong>{metrics.passed}</strong> ({metrics.passPercentage}%)
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                        Failed: <strong>{metrics.failed}</strong> ({metrics.failPercentage}%)
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        Pending: <strong>{metrics.pending}</strong> ({metrics.pendingPercentage}%)
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Link href="/results" passHref legacyBehavior>
                        <a style={{ color: '#1d70b8', textDecoration: 'none', fontWeight: 600 }}>
                          Review Findings Table →
                        </a>
                      </Link>
                      <Link href="/compliance-tracker" passHref legacyBehavior>
                        <a style={{ color: '#1d70b8', textDecoration: 'none', fontWeight: 600 }}>
                          Interactive Checklist →
                        </a>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Collapsible Findings Trajectory Line Chart */}
                <AnimatePresence>
                  {showTrendChart && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        marginTop: '16px',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '16px'
                      }}
                    >
                      <AuditFindingsTrendChart height={300} showControls={true} showSummaryBadges={true} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapsible Audit Activity Feed Stream */}
                <AnimatePresence>
                  {showAuditFeed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        marginTop: '16px',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '16px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: '#0f172a'
                          }}>
                            Recent Audit Log Transitions & Evidence Trails
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ({filteredAuditLogs.length} events matching filter)
                          </span>
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(['ALL', 'PASSED', 'FAILED', 'PENDING'] as const).map(tabKey => (
                            <button
                              key={tabKey}
                              type="button"
                              onClick={() => setAuditLogFilter(tabKey)}
                              style={{
                                padding: '3px 9px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                border: '1px solid',
                                borderColor: auditLogFilter === tabKey ? '#1d70b8' : '#cbd5e1',
                                backgroundColor: auditLogFilter === tabKey ? '#1d70b8' : '#ffffff',
                                color: auditLogFilter === tabKey ? '#ffffff' : '#475569',
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                            >
                              {tabKey === 'ALL' ? 'All Logs' : tabKey}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Log items list */}
                      <div style={{
                        maxHeight: '220px',
                        overflowY: 'auto',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff'
                      }}>
                        {filteredAuditLogs.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                            No audit log events found matching the <strong>{auditLogFilter}</strong> filter.
                          </div>
                        ) : (
                          filteredAuditLogs.slice(0, 8).map((log, idx) => {
                            const isPassed = (log.description || '').toLowerCase().includes('compliant') || (log.title || '').toLowerCase().includes('compliant');
                            const isFailed = (log.description || '').toLowerCase().includes('flagged') || (log.title || '').toLowerCase().includes('risk');
                            const isPending = !isPassed && !isFailed;

                            return (
                              <div
                                key={log.id || idx}
                                style={{
                                  padding: '10px 14px',
                                  borderBottom: idx < filteredAuditLogs.length - 1 ? '1px solid #f1f5f9' : 'none',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  fontSize: '0.8125rem'
                                }}
                              >
                                <span style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isPassed ? '#dcfce7' : isFailed ? '#fee2e2' : '#fef3c7',
                                  color: isPassed ? '#16a34a' : isFailed ? '#dc2626' : '#d97706',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                  marginTop: '2px'
                                }}>
                                  {isPassed ? '✓' : isFailed ? '!' : '⏳'}
                                </span>

                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                      {log.title}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                      {log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-GB') : 'Recent'}
                                    </span>
                                  </div>
                                  <p style={{ margin: '2px 0 0 0', color: '#475569', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                    {log.description}
                                  </p>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                    Actor: <strong>{log.actorName || log.user || 'Lead Assessor'}</strong>
                                    {log.requirementCode && (
                                      <span style={{ marginLeft: '8px', color: '#1d70b8', fontFamily: 'monospace' }}>
                                        [{log.requirementCode}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AuditFindingsSummaryCard;
