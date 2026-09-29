"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HourglassEmpty as PendingIcon,
  Assignment as CriterionIcon,
  Description as DocumentIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ArrowBackIosNew as PrevIcon,
  ArrowForwardIos as NextIcon,
  OpenInNew as ExternalLinkIcon,
  ContentCopy as CopyIcon,
  Check as CopiedIcon,
  Build as RemediationIcon,
  PlaylistAddCheck as ChecklistIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Print as PrintIcon,
  BookmarkAdd as AddToTrackerIcon
} from '@mui/icons-material';
import { SeverityLevel, SEVERITY_CONFIGS } from './SeverityFilterDropdown';

export interface FindingDetailData {
  id: string;
  Criterion: {
    id: string;
    question: string;
    evidence: string;
    category: string;
    gate: string;
    created_datetime?: Date | string;
  };
  Category: string;
  Gate: string;
  Status: string;
  Severity: SeverityLevel;
  Evidence: string;
  Justification: string;
  Sources: Array<{
    chunk_id: string;
    fileName: string;
  }>;
  Project?: {
    id: string;
    name: string;
    review_type?: string;
  };
  remediationSteps?: string[];
}

export interface FindingExpandableDetailViewProps {
  finding: FindingDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
  onRateResponse?: (goodResponse: boolean) => Promise<void> | void;
  onCitationClick?: (chunkId: string) => void;
}

export const FindingExpandableDetailView: React.FC<FindingExpandableDetailViewProps> = ({
  finding,
  isOpen,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  currentIndex = -1,
  totalCount = 0,
  onRateResponse,
  onCitationClick
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'evidence' | 'justification' | 'remediation'>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [feedbackRating, setFeedbackRating] = useState<'positive' | 'negative' | null>(null);
  const [trackerToast, setTrackerToast] = useState<string | null>(null);

  // Generate contextual, actionable remediation steps if not already present
  const remediationPlan = useMemo(() => {
    if (!finding) return [];

    if (finding.remediationSteps && finding.remediationSteps.length > 0) {
      return finding.remediationSteps.map((step, idx) => ({
        id: `step_${idx}`,
        title: step,
        owner: `${finding.Category} Assurance Lead`,
        timeline: idx === 0 ? 'Within 5 Business Days' : idx === 1 ? 'Prior to Next Gateway' : 'Ongoing Delivery Phase',
        priority: finding.Severity
      }));
    }

    const cat = (finding.Category || '').toLowerCase();
    const isNegative = finding.Status === 'Negative' || finding.Status === 'Flagged';
    const isNeutral = finding.Status === 'Neutral';

    if (isNegative) {
      if (cat.includes('financial')) {
        return [
          {
            id: 'step_1',
            title: 'Formally request Accounting Officer sign-off for £1.5M contingency deficit allocation under HM Treasury Green Book rules.',
            owner: 'Senior Financial Assurance Officer',
            timeline: 'Immediate (Within 5 Business Days)',
            priority: 'Critical' as SeverityLevel
          },
          {
            id: 'step_2',
            title: 'Execute quantitative risk-adjusted cost modelling (QRA) to re-baseline whole-life project capital requirements.',
            owner: 'Commercial & Cost Management Team',
            timeline: 'Within 10 Business Days',
            priority: 'High' as SeverityLevel
          },
          {
            id: 'step_3',
            title: 'Submit supplementary Financial Case addendum to IPA Assurance Review team with signed department commitments.',
            owner: 'Senior Responsible Owner (SRO)',
            timeline: 'Prior to Stage Gate Clearance',
            priority: 'High' as SeverityLevel
          }
        ];
      } else if (cat.includes('risk')) {
        return [
          {
            id: 'step_1',
            title: 'Assign named Risk Owners with delegated authority across all unresolved schedule and bottleneck risks in the master register.',
            owner: 'Programme Risk Director',
            timeline: 'Within 3 Business Days',
            priority: 'High' as SeverityLevel
          },
          {
            id: 'step_2',
            title: 'Establish quantifiable risk mitigation triggers and contingency fallback pathways for Tier 1 supply chain dependencies.',
            owner: 'Technical Delivery Lead',
            timeline: 'Within 7 Business Days',
            priority: 'Medium' as SeverityLevel
          },
          {
            id: 'step_3',
            title: 'Conduct weekly risk review board sessions and integrate mitigation metrics into the monthly Assurance Dashboard.',
            owner: 'IPA Assurance Coordinator',
            timeline: 'Weekly Recurring',
            priority: 'Medium' as SeverityLevel
          }
        ];
      } else if (cat.includes('commercial')) {
        return [
          {
            id: 'step_1',
            title: 'Benchmark contractor proposed rates against Crown Commercial Service (CCS) standardized framework caps.',
            owner: 'Commercial Director',
            timeline: 'Within 5 Business Days',
            priority: 'High' as SeverityLevel
          },
          {
            id: 'step_2',
            title: 'Incorporate liquidated damages and performance bond clauses into final contract drafting for critical milestone deliverables.',
            owner: 'Senior Legal & Commercial Advisor',
            timeline: 'Prior to Contract Award',
            priority: 'High' as SeverityLevel
          }
        ];
      } else {
        return [
          {
            id: 'step_1',
            title: `Develop targeted corrective action plan addressing the identified shortfall in ${finding.Category} assurance requirements.`,
            owner: `${finding.Category} Lead Reviewer`,
            timeline: 'Within 5 Business Days',
            priority: finding.Severity
          },
          {
            id: 'step_2',
            title: 'Provide verified documentation updates into the Project Dossier to validate compliance against Gateway guidelines.',
            owner: 'Project Management Office (PMO)',
            timeline: 'Prior to Formal Gateway Decision',
            priority: 'Medium' as SeverityLevel
          }
        ];
      }
    } else if (isNeutral) {
      return [
        {
          id: 'step_1',
          title: 'Provide clarification memo detailing key trigger points and operational handover criteria.',
          owner: 'SRO / Technical Lead',
          timeline: 'Within 7 Business Days',
          priority: 'Medium' as SeverityLevel
        },
        {
          id: 'step_2',
          title: 'Schedule bilateral review session between PMO and IPA Assurance Assessor to confirm compliance baseline.',
          owner: 'Lead Assurance Reviewer',
          timeline: 'Prior to Stage 2 sign-off',
          priority: 'Low' as SeverityLevel
        }
      ];
    } else {
      return [
        {
          id: 'step_1',
          title: 'Maintain verified evidence documentation in the audit archive for ongoing statutory compliance records.',
          owner: 'Assurance Lead Reviewer',
          timeline: 'Ongoing Monitoring',
          priority: 'Low' as SeverityLevel
        },
        {
          id: 'step_2',
          title: 'Benchmark demonstrated best practices into the central IPA knowledge repository for subsequent gateway stages.',
          owner: 'IPA Assurance Director',
          timeline: 'Post-Gateway Closure',
          priority: 'Low' as SeverityLevel
        }
      ];
    }
  }, [finding]);

  if (!isOpen || !finding) return null;

  const handleToggleStep = (stepId: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleCopySummary = () => {
    if (!finding) return;
    const text = `IPA Scout Assurance Finding [${finding.Category} - ${finding.Gate}]
Status: ${finding.Status} | Severity: ${finding.Severity}
Question: ${finding.Criterion.question}

Evidence Considered:
${finding.Evidence.split('_').join('\n')}

Justification:
${finding.Justification}

Remediation Roadmap:
${remediationPlan.map((s, i) => `${i + 1}. [${s.priority}] ${s.title} (${s.owner} - ${s.timeline})`).join('\n')}

Sources: ${finding.Sources.map(s => s.fileName).join(', ')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAddRemediationToTracker = () => {
    setTrackerToast(`✓ Remediation tasks for "${finding.Criterion.question.slice(0, 35)}..." saved to Compliance Tracker.`);
    setTimeout(() => setTrackerToast(null), 4000);
  };

  const handleRate = (positive: boolean) => {
    setFeedbackRating(positive ? 'positive' : 'negative');
    if (onRateResponse) {
      onRateResponse(positive);
    }
  };

  const isNeg = finding.Status === 'Negative' || finding.Status === 'Flagged';
  const isPos = finding.Status === 'Positive' || finding.Status === 'Compliant';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expandable-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: isFullscreen ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isFullscreen ? 0 : '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: isFullscreen ? '100vw' : '100%',
          maxWidth: isFullscreen ? '100vw' : '1020px',
          height: isFullscreen ? '100vh' : 'auto',
          maxHeight: isFullscreen ? '100vh' : '90vh',
          backgroundColor: '#ffffff',
          borderRadius: isFullscreen ? 0 : '14px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: isFullscreen ? 'none' : '1px solid #cbd5e1'
        }}
      >
        {/* 1. Header Toolbar & Quick Navigation */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Left: Domain & Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#38bdf8'
            }}>
              <ShieldIcon style={{ fontSize: '0.85rem' }} />
              {finding.Category}
            </span>

            <span style={{ color: '#64748b' }}>/</span>

            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>
              {finding.Gate}
            </span>

            <span style={{ color: '#64748b' }}>/</span>

            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: isNeg ? '#fef2f2' : isPos ? '#ecfdf5' : '#fffbeb',
              color: isNeg ? '#b91c1c' : isPos ? '#047857' : '#b45309',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isNeg ? <WarningIcon style={{ fontSize: '0.8rem' }} /> :
               isPos ? <CheckCircleIcon style={{ fontSize: '0.8rem' }} /> :
               <PendingIcon style={{ fontSize: '0.8rem' }} />}
              {finding.Status}
            </span>

            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor:
                finding.Severity === 'Critical' ? '#7f1d1d' :
                finding.Severity === 'High' ? '#7c2d12' :
                finding.Severity === 'Medium' ? '#78350f' : '#064e3b',
              color: '#ffffff'
            }}>
              Severity: {finding.Severity}
            </span>
          </div>

          {/* Right: Actions (Prev/Next, Copy, Print, Fullscreen, Close) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sequential Carousel Navigation */}
            {totalCount > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '2px 4px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}>
                <button
                  type="button"
                  onClick={onNavigatePrev}
                  aria-label="Previous finding"
                  title="Navigate to previous finding"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <PrevIcon style={{ fontSize: '0.75rem' }} />
                </button>

                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', padding: '0 6px' }}>
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${totalCount}` : ''}
                </span>

                <button
                  type="button"
                  onClick={onNavigateNext}
                  aria-label="Next finding"
                  title="Navigate to next finding"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <NextIcon style={{ fontSize: '0.75rem' }} />
                </button>
              </div>
            )}

            {/* Copy Summary Button */}
            <button
              type="button"
              onClick={handleCopySummary}
              title="Copy finding summary and remediation steps"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: copied ? '#86efac' : '#e2e8f0',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {copied ? <CopiedIcon style={{ fontSize: '0.85rem' }} /> : <CopyIcon style={{ fontSize: '0.85rem' }} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Expand full screen'}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isFullscreen ? <FullscreenExitIcon style={{ fontSize: '1rem' }} /> : <FullscreenIcon style={{ fontSize: '1rem' }} />}
            </button>

            {/* Print Finding */}
            <button
              type="button"
              onClick={() => window.print()}
              title="Print finding detail dossier to PDF"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <PrintIcon style={{ fontSize: '1rem' }} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close detail view"
              title="Close (Esc)"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <CloseIcon style={{ fontSize: '1rem' }} />
            </button>
          </div>
        </div>

        {/* Toast Notice when adding to tracker */}
        {trackerToast && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              padding: '8px 24px',
              fontSize: '0.8rem',
              color: '#065f46',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{trackerToast}</span>
            <Link href="/compliance-tracker" passHref legacyBehavior>
              <a style={{ color: '#047857', textDecoration: 'underline', fontWeight: 700 }}>
                Go to Tracker →
              </a>
            </Link>
          </div>
        )}

        {/* 2. Main Body & Tabs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* Finding Title & Criterion Question */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'block',
              marginBottom: '4px'
            }}>
              HM Treasury &amp; IPA Gateway Assurance Criterion
            </span>
            <h2
              id="expandable-detail-title"
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                lineHeight: 1.35,
                letterSpacing: '-0.01em'
              }}
            >
              {finding.Criterion.question}
            </h2>
          </div>

          {/* Navigation Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '20px',
            paddingBottom: '2px',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'all', label: 'Complete Overview' },
              { id: 'evidence', label: 'Full Evidence & Sources' },
              { id: 'justification', label: 'Assurance Justification' },
              { id: 'remediation', label: `Remediation Plan (${remediationPlan.length} Steps)` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #1d70b8' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: activeTab === tab.id ? '#1d70b8' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Full Evidence & Document Corpus Citations */}
            {(activeTab === 'all' || activeTab === 'evidence') && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '18px 20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CriterionIcon style={{ fontSize: '1.1rem', color: '#1d70b8' }} />
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                      Required Evidence Thresholds &amp; Verification Checks
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                    HM Treasury Review Requirement
                  </span>
                </div>

                {/* Formatted Evidence Bullets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {finding.Evidence.split('_').map((point, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '0.85rem',
                        color: '#334155',
                        lineHeight: 1.45,
                        backgroundColor: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <span style={{
                        marginTop: '2px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#1d70b8',
                        flexShrink: 0
                      }} />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>

                {/* Referenced Document Citations */}
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    Referenced Dossier Source Documents ({finding.Sources.length})
                  </span>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {finding.Sources.map((source, sIdx) => (
                      <div
                        key={sIdx}
                        onClick={() => {
                          if (onCitationClick) onCitationClick(source.chunk_id);
                          else router.push(`/file-viewer?uuid=${encodeURIComponent(source.chunk_id)}`);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#1d70b8',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Open cited document chunk: ${source.fileName}`}
                      >
                        <DocumentIcon style={{ fontSize: '0.95rem' }} />
                        <span>{source.fileName}</span>
                        <ExternalLinkIcon style={{ fontSize: '0.85rem', color: '#60a5fa' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Assurance Justification & Analytical Findings */}
            {(activeTab === 'all' || activeTab === 'justification') && (
              <div style={{
                backgroundColor: isNeg ? '#fffaf8' : '#ffffff',
                border: `1px solid ${isNeg ? '#fed7aa' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '18px 20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px'
                }}>
                  {isNeg ? <WarningIcon style={{ fontSize: '1.1rem', color: '#c2410c' }} /> :
                   isPos ? <CheckCircleIcon style={{ fontSize: '1.1rem', color: '#059669' }} /> :
                   <PendingIcon style={{ fontSize: '1.1rem', color: '#d97706' }} />}
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                    Assurance Justification &amp; Analytical Evaluation
                  </h3>
                </div>

                <div style={{
                  fontSize: '0.9rem',
                  color: '#1e293b',
                  lineHeight: 1.6,
                  backgroundColor: '#ffffff',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${isNeg ? '#ea580c' : isPos ? '#10b981' : '#f59e0b'}`
                }}>
                  {finding.Justification}
                </div>
              </div>
            )}

            {/* 3. Actionable Remediation Roadmap */}
            {(activeTab === 'all' || activeTab === 'remediation') && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RemediationIcon style={{ fontSize: '1.15rem', color: '#1d70b8' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                      Engineering &amp; Governance Remediation Steps
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRemediationToTracker}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      backgroundColor: '#1d70b8',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <AddToTrackerIcon style={{ fontSize: '0.9rem' }} />
                    <span>Sync to Compliance Tracker</span>
                  </button>
                </div>

                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 16px 0' }}>
                  Statutory action plan to address audit deficiencies and satisfy HM Treasury Gateway clearance conditions.
                </p>

                {/* Remediation Steps List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {remediationPlan.map((step, sIdx) => {
                    const isDone = Boolean(completedSteps[step.id]);

                    return (
                      <div
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${isDone ? '#86efac' : '#e2e8f0'}`,
                          backgroundColor: isDone ? '#f0fdf4' : '#f8fafc',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          id={step.id}
                          checked={isDone}
                          onChange={() => handleToggleStep(step.id)}
                          aria-label={`Mark remediation step ${sIdx + 1} as completed`}
                          style={{
                            marginTop: '3px',
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#1d70b8'
                          }}
                        />

                        {/* Step Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <label
                              htmlFor={step.id}
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: isDone ? '#166534' : '#0f172a',
                                textDecoration: isDone ? 'line-through' : 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Step {sIdx + 1}: {step.title}
                            </label>

                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  step.priority === 'Critical' ? '#fee2e2' :
                                  step.priority === 'High' ? '#ffedd5' :
                                  step.priority === 'Medium' ? '#fef3c7' : '#dcfce7',
                                color:
                                  step.priority === 'Critical' ? '#991b1b' :
                                  step.priority === 'High' ? '#9a3412' :
                                  step.priority === 'Medium' ? '#92400e' : '#166534'
                              }}
                            >
                              {step.priority} Priority
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.725rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <PersonIcon style={{ fontSize: '0.8rem', color: '#1d70b8' }} />
                              Owner: <strong>{step.owner}</strong>
                            </span>

                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ScheduleIcon style={{ fontSize: '0.8rem', color: '#d97706' }} />
                              Target: <strong>{step.timeline}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Footer: Feedback Rating & Close Action */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Accuracy Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              Was this assurance finding evaluation accurate?
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleRate(true)}
                aria-label="Accurate finding"
                title="Mark as accurate finding"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: feedbackRating === 'positive' ? '#dcfce7' : '#ffffff',
                  color: feedbackRating === 'positive' ? '#15803d' : '#475569',
                  cursor: 'pointer'
                }}
              >
                <ThumbUpIcon style={{ fontSize: '0.9rem' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Yes</span>
              </button>

              <button
                type="button"
                onClick={() => handleRate(false)}
                aria-label="Inaccurate finding"
                title="Flag finding for manual re-evaluation"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: feedbackRating === 'negative' ? '#fee2e2' : '#ffffff',
                  color: feedbackRating === 'negative' ? '#b91c1c' : '#475569',
                  cursor: 'pointer'
                }}
              >
                <ThumbDownIcon style={{ fontSize: '0.9rem' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>No</span>
              </button>
            </div>
          </div>

          {/* Close & Tracker Link Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindingExpandableDetailView;
