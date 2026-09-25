"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  activeInfrastructureProjects,
  upcomingProjectDeadlines,
  recentAuditProgressMetrics,
  InfrastructureProject,
  UpcomingDeadline,
  RecentProgressMetric
} from '@/lib/seedData';
import {
  Assessment as AssessmentIcon,
  AssignmentTurnedIn as VerifiedIcon,
  WarningAmber as WarningIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Close as CloseIcon,
  OpenInNew as ExternalLinkIcon,
  CheckCircleOutline as CheckIcon,
  HourglassEmpty as HourglassIcon,
  ErrorOutline as ErrorIcon,
  ArrowForward as ArrowIcon,
  FileDownload as DownloadIcon,
  Tune as TuneIcon,
  AccountBalance as TreasuryIcon,
  Business as ProjectIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  PictureAsPdf as PdfIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewStatusDistributionChart from './ReviewStatusDistributionChart';
import ComplianceStatusPieChart from './ComplianceStatusPieChart';
import { exportPortfolioCompliancePdf, exportComplianceAuditPdf } from '@/utils/exportCompliancePdf';

export default function PortfolioDashboard() {
  // State management for projects, deadlines, and activities
  const [projects, setProjects] = useState<InfrastructureProject[]>(activeInfrastructureProjects);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>(upcomingProjectDeadlines);
  const [activities, setActivities] = useState<RecentProgressMetric[]>(recentAuditProgressMetrics);
  const [dashboardChartTab, setDashboardChartTab] = useState<'compliance_pie' | 'review_bars' | 'both'>('compliance_pie');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedGate, setSelectedGate] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [deadlineUrgencyFilter, setDeadlineUrgencyFilter] = useState<string>('ALL');

  // Interactive Modals
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<InfrastructureProject | null>(null);
  const [isNewDeadlineModalOpen, setIsNewDeadlineModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // New Deadline Form State
  const [newDeadlineProject, setNewDeadlineProject] = useState(activeInfrastructureProjects[0].id);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineCategory, setNewDeadlineCategory] = useState<UpcomingDeadline['category']>('Gateway Submission');
  const [newDeadlineDate, setNewDeadlineDate] = useState('2026-10-31');
  const [newDeadlineOwner, setNewDeadlineOwner] = useState('Lead Assurance Reviewer');
  const [newDeadlineDescription, setNewDeadlineDescription] = useState('');

  // Sorter state
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'date' | 'budget'>('date');

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter(proj => {
      if (selectedSector !== 'ALL' && proj.sector !== selectedSector) return false;
      if (selectedGate !== 'ALL' && proj.currentGate !== selectedGate) return false;
      if (selectedStatus !== 'ALL' && proj.reviewStatus !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = proj.name.toLowerCase().includes(q);
        const matchCode = proj.code.toLowerCase().includes(q);
        const matchDept = proj.department.toLowerCase().includes(q);
        const matchSro = proj.sro.toLowerCase().includes(q);
        const matchLocation = proj.location.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept && !matchSro && !matchLocation) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'score_desc') return b.assuranceScore - a.assuranceScore;
      if (sortBy === 'score_asc') return a.assuranceScore - b.assuranceScore;
      if (sortBy === 'budget') {
        const parseB = (val: string) => parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
        return parseB(b.budgetFormatted) - parseB(a.budgetFormatted);
      }
      // default: by next review date
      return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
    });
  }, [projects, selectedSector, selectedGate, selectedStatus, searchQuery, sortBy]);

  // Filtered Deadlines
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(dl => {
      if (deadlineUrgencyFilter === 'ALL') return true;
      if (deadlineUrgencyFilter === 'SOON') return dl.daysRemaining <= 14;
      if (deadlineUrgencyFilter === 'GATEWAY') return dl.category === 'Gateway Submission';
      if (deadlineUrgencyFilter === 'TREASURY') return dl.category === 'Treasury Approval';
      if (deadlineUrgencyFilter === 'SUBMITTED') return dl.status === 'Submitted';
      if (deadlineUrgencyFilter === 'PENDING') return dl.status !== 'Submitted';
      return true;
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [deadlines, deadlineUrgencyFilter]);

  // Aggregate Portfolio Statistics
  const portfolioMetrics = useMemo(() => {
    const totalProjects = projects.length;
    const totalRequirements = projects.reduce((acc, p) => acc + p.totalRequirements, 0);
    const totalCompliant = projects.reduce((acc, p) => acc + p.compliantCount, 0);
    const totalInProgress = projects.reduce((acc, p) => acc + p.inProgressCount, 0);
    const totalFlagged = projects.reduce((acc, p) => acc + p.flaggedCount, 0);
    const averageScore = Math.round(projects.reduce((acc, p) => acc + p.assuranceScore, 0) / (totalProjects || 1));
    const upcoming14Days = deadlines.filter(d => d.daysRemaining <= 14 && d.status !== 'Submitted').length;
    const criticalRisks = projects.reduce((acc, p) => acc + p.criticalRisksCount, 0);

    return {
      totalProjects,
      totalRequirements,
      totalCompliant,
      totalInProgress,
      totalFlagged,
      averageScore,
      upcoming14Days,
      criticalRisks,
      complianceRate: Math.round((totalCompliant / (totalRequirements || 1)) * 100)
    };
  }, [projects, deadlines]);

  // Toggle deadline status
  const handleToggleDeadlineStatus = (deadlineId: string) => {
    setDeadlines(prev => prev.map(dl => {
      if (dl.id !== deadlineId) return dl;
      const nextStatus: UpcomingDeadline['status'] =
        dl.status === 'Pending' ? 'In Progress' :
        dl.status === 'In Progress' ? 'Submitted' : 'Pending';

      // Log progress activity
      const activityAction = nextStatus === 'Submitted'
        ? `Marked statutory deliverable as Submitted: ${dl.title}`
        : `Updated deliverable status to ${nextStatus}: ${dl.title}`;

      const newActivity: RecentProgressMetric = {
        id: `act_${Date.now()}`,
        projectId: dl.projectId,
        projectName: dl.projectName,
        action: activityAction,
        actor: 'Lead Assurance Reviewer (samgorleung1224@gmail.com)',
        timestamp: 'Just now',
        type: nextStatus === 'Submitted' ? 'Sign-off' : 'Status Update',
        gate: dl.gate,
        notesSnippet: `Updated deadline deliverable due on ${dl.dueDate}`
      };

      setActivities(curr => [newActivity, ...curr]);
      return { ...dl, status: nextStatus };
    }));
  };

  // Add new milestone deadline
  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineTitle.trim()) return;

    const proj = projects.find(p => p.id === newDeadlineProject) || projects[0];
    const today = new Date('2026-09-22');
    const target = new Date(newDeadlineDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let urgency: UpcomingDeadline['urgency'] = 'Scheduled';
    if (diffDays < 0) urgency = 'Overdue';
    else if (diffDays <= 7) urgency = 'Due Soon';
    else if (diffDays <= 14) urgency = 'Within 14 Days';

    const newDl: UpcomingDeadline = {
      id: `dl_${Date.now()}`,
      projectId: proj.id,
      projectName: proj.name,
      title: newDeadlineTitle,
      category: newDeadlineCategory,
      dueDate: newDeadlineDate,
      daysRemaining: diffDays,
      urgency,
      gate: proj.gateLabel.split(':')[0].trim(),
      leadOwner: newDeadlineOwner,
      status: 'Pending',
      description: newDeadlineDescription || `Scheduled milestone for ${proj.name} under ${newDeadlineCategory}.`
    };

    setDeadlines(prev => [newDl, ...prev]);

    // Record activity
    setActivities(prev => [
      {
        id: `act_${Date.now()}`,
        projectId: proj.id,
        projectName: proj.name,
        action: `Scheduled new milestone: ${newDeadlineTitle}`,
        actor: 'Lead Assurance Reviewer',
        timestamp: 'Just now',
        type: 'Status Update',
        gate: proj.currentGate,
        notesSnippet: `Due ${newDeadlineDate} · Category: ${newDeadlineCategory}`
      },
      ...prev
    ]);

    // Reset and close
    setNewDeadlineTitle('');
    setNewDeadlineDescription('');
    setIsNewDeadlineModalOpen(false);
  };

  // Reset all project filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSector('ALL');
    setSelectedGate('ALL');
    setSelectedStatus('ALL');
    setSortBy('date');
  };

  // Export Executive Portfolio Compliance Summary as a formal PDF report
  const handleExportCompliancePdf = async () => {
    setIsExportingPdf(true);
    setExportNotice('Synthesizing executive portfolio compliance summary and generating publication-grade PDF report...');
    try {
      await exportPortfolioCompliancePdf({
        portfolioMetrics,
        projects: filteredProjects,
        deadlines: filteredDeadlines,
        activities,
        filtersApplied: {
          sector: selectedSector,
          gate: selectedGate,
          status: selectedStatus,
          searchQuery
        },
        auditor: {
          name: 'Lead Assurance Reviewer',
          email: 'samgorleung1224@gmail.com',
          role: 'Principal Assurance Lead'
        },
        firestoreDbId: 'ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5'
      });
      setExportNotice('✓ Executive Portfolio Compliance Summary PDF report generated and downloaded successfully.');
      setTimeout(() => {
        setExportNotice(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to generate compliance summary PDF report:', err);
      setExportNotice('Notice: Unable to generate PDF report. Please verify browser allows downloads.');
      setTimeout(() => {
        setExportNotice(null);
      }, 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Individual Infrastructure Project Compliance Audit as PDF
  const handleExportSingleProjectPdf = async (project: InfrastructureProject) => {
    setIsExportingPdf(true);
    try {
      const completionRate = Math.round((project.compliantCount / (project.totalRequirements || 1)) * 100);
      await exportComplianceAuditPdf({
        projectName: `${project.code}: ${project.name}`,
        currentGate: project.currentGate,
        auditor: {
          name: project.leadAuditor || 'Lead Assurance Reviewer',
          email: 'samgorleung1224@gmail.com',
          role: 'Principal Assurance Lead'
        },
        metrics: {
          total: project.totalRequirements,
          checked: project.compliantCount,
          percentage: completionRate,
          compliant: project.compliantCount,
          inProgress: project.inProgressCount,
          flagged: project.flaggedCount,
          remainingCount: project.totalRequirements - project.compliantCount,
          readinessText: project.reviewStatus
        },
        categoryBreakdown: [
          {
            category: 'Financial & Commercial Case',
            total: Math.ceil(project.totalRequirements * 0.35),
            checked: Math.ceil(project.compliantCount * 0.35),
            compliant: Math.ceil(project.compliantCount * 0.35),
            flagged: Math.ceil(project.flaggedCount * 0.4),
            percentage: completionRate
          },
          {
            category: 'Delivery Capability & Schedule',
            total: Math.ceil(project.totalRequirements * 0.35),
            checked: Math.ceil(project.compliantCount * 0.35),
            compliant: Math.ceil(project.compliantCount * 0.35),
            flagged: Math.ceil(project.flaggedCount * 0.3),
            percentage: completionRate
          },
          {
            category: 'Risk Management & Governance',
            total: Math.floor(project.totalRequirements * 0.3),
            checked: Math.floor(project.compliantCount * 0.3),
            compliant: Math.floor(project.compliantCount * 0.3),
            flagged: Math.floor(project.flaggedCount * 0.3),
            percentage: completionRate
          }
        ],
        requirements: [
          {
            id: `${project.code}_REQ_01`,
            code: `${project.code}-01`,
            title: `${project.name} Statutory Gateway Evidence Submission`,
            description: `Statutory Gateway documentation reviewed for ${project.department}. Current review status: ${project.reviewStatus}.`,
            gate: project.currentGate,
            category: 'Governance & Assurance',
            priority: 'Critical',
            status: project.flaggedCount > 0 ? 'Flagged' : 'Compliant',
            isChecked: project.compliantCount > 0,
            evidenceThreshold: 'Full Outline Business Case with Accounting Officer sign-off and Green Book compliance.',
            documentRef: `${project.code}_Dossier_Gateway_Review.pdf`,
            auditorNotes: `Evaluated by ${project.leadAuditor}. Capital value: ${project.budgetFormatted}. Next statutory review: ${project.nextReviewDate}.`,
            auditedAt: new Date().toISOString(),
            auditorName: project.leadAuditor
          }
        ],
        firestoreDbId: 'ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5'
      });
      setExportNotice(`✓ Compliance audit report for ${project.code} downloaded successfully.`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      console.error('Failed to export single project compliance PDF:', err);
      setExportNotice('Notice: Unable to generate project PDF report.');
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportBriefing = () => {
    handleExportCompliancePdf();
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 1. Header & Lead Contract */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
        }}
      >
        {/* Breadcrumb Trail */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8125rem',
          color: '#64748b',
          marginBottom: '10px'
        }}>
          <span>HM Treasury</span>
          <span>/</span>
          <span>Government Major Projects Portfolio (GMPP)</span>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Centralized Assurance Dashboard</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em'
            }}>
              Infrastructure Portfolio Compliance & Assurance Dashboard
            </h1>
            <p style={{
              fontSize: '0.9375rem',
              color: '#475569',
              margin: 0,
              maxWidth: '860px',
              lineHeight: 1.5
            }}>
              Centralized oversight of active Gateway compliance reviews, cross-programme progress metrics, and upcoming statutory deadlines across UK major infrastructure investments.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/compliance-tracker?view=timeline" passHref legacyBehavior>
              <a
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <TimelineIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
                <span>Transition Timelines</span>
              </a>
            </Link>

            <button
              onClick={() => setIsNewDeadlineModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <AddIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
              <span>Add Upcoming Deadline</span>
            </button>

            <button
              onClick={handleExportCompliancePdf}
              disabled={isExportingPdf}
              title="Export current portfolio compliance summary data as an executive PDF report"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                backgroundColor: isExportingPdf ? '#94a3b8' : '#1d70b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: isExportingPdf ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease'
              }}
            >
              <PdfIcon style={{ fontSize: '1.05rem' }} />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export Compliance Summary (PDF)'}</span>
            </button>
          </div>
        </div>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div style={{
            marginTop: '16px',
            padding: '10px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            color: '#15803d',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckIcon style={{ fontSize: '1.1rem' }} />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Clean Unboxed Metadata Strip */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.8125rem',
          color: '#64748b'
        }}>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>Standard:</span>
          <span>IPA Gateway Review Framework 2026</span>
          <span aria-hidden="true">·</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>Database ID:</span>
          <span style={{ fontFamily: 'monospace' }}>ai-studio-scout-d32152a8</span>
          <span aria-hidden="true">·</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>Lead Auditor:</span>
          <span>samgorleung1224@gmail.com</span>
          <span aria-hidden="true">·</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>Active Portfolio:</span>
          <span>{projects.length} Major Projects (£55.1B Capital Value)</span>
        </div>
      </motion.div>

      {/* 2. Portfolio Key Performance Indicator Strip (Single-Elevation Cards with Staggered Entrance) */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.06
            }
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Metric 1: Active Reviews */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)' }}
          transition={{ duration: 0.15 }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>ACTIVE REVIEWS</span>
            <ProjectIcon style={{ fontSize: '1.2rem', color: '#1d70b8' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {portfolioMetrics.totalProjects}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across Transport, Energy, Health & Defence
          </div>
        </motion.div>

        {/* Metric 2: Assurance Fulfillment */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)' }}
          transition={{ duration: 0.15 }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>AVG ASSURANCE SCORE</span>
            <TrendingUpIcon style={{ fontSize: '1.2rem', color: '#16a34a' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
              {portfolioMetrics.averageScore}%
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
              {portfolioMetrics.averageScore >= 80 ? '✓ Ready' : 'Target: 80%'}
            </span>
          </div>
          {/* Linear Progress Bar */}
          <div style={{
            height: '6px',
            backgroundColor: '#e2e8f0',
            borderRadius: '3px',
            marginTop: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${portfolioMetrics.averageScore}%`,
              height: '100%',
              backgroundColor: portfolioMetrics.averageScore >= 80 ? '#16a34a' : '#1d70b8'
            }} />
          </div>
        </motion.div>

        {/* Metric 3: Requirements Verified */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)' }}
          transition={{ duration: 0.15 }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>VERIFIED CRITERIA</span>
            <VerifiedIcon style={{ fontSize: '1.2rem', color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {portfolioMetrics.totalCompliant} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 400 }}>/ {portfolioMetrics.totalRequirements}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {portfolioMetrics.totalInProgress} In Progress · {portfolioMetrics.totalFlagged} Flagged
          </div>
        </motion.div>

        {/* Metric 4: Deadlines within 14 Days */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)' }}
          transition={{ duration: 0.15 }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>DUE SOON (≤ 14 DAYS)</span>
            <CalendarIcon style={{ fontSize: '1.2rem', color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {portfolioMetrics.upcoming14Days}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
            Immediate statutory submission deliverables
          </div>
        </motion.div>

        {/* Metric 5: Flagged Critical Risks */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)' }}
          transition={{ duration: 0.15 }}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>CRITICAL RISKS</span>
            <WarningIcon style={{ fontSize: '1.2rem', color: '#dc2626' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {portfolioMetrics.criticalRisks}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across {projects.filter(p => p.criticalRisksCount > 0).length} projects requiring mitigation
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Visual Analytics Hub: Recharts Compliance Status Pie Chart & D3 Review Distribution */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        padding: '10px 16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            Stakeholder Visual Analytics:
          </span>
          <span style={{ fontSize: '0.78125rem', color: '#64748b' }}>
            Select visualization engine for project compliance and assurance reporting
          </span>
        </div>

        <div style={{
          display: 'inline-flex',
          backgroundColor: '#f1f5f9',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setDashboardChartTab('compliance_pie')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.78125rem',
              fontWeight: dashboardChartTab === 'compliance_pie' ? 700 : 500,
              backgroundColor: dashboardChartTab === 'compliance_pie' ? '#ffffff' : 'transparent',
              color: dashboardChartTab === 'compliance_pie' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: dashboardChartTab === 'compliance_pie' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <PieChartIcon style={{ fontSize: '1rem', color: '#10b981' }} />
            <span>Compliance Items (Recharts Pie)</span>
          </button>

          <button
            onClick={() => setDashboardChartTab('review_bars')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.78125rem',
              fontWeight: dashboardChartTab === 'review_bars' ? 700 : 500,
              backgroundColor: dashboardChartTab === 'review_bars' ? '#ffffff' : 'transparent',
              color: dashboardChartTab === 'review_bars' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: dashboardChartTab === 'review_bars' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChartIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
            <span>Review Gate Status (D3 Bar)</span>
          </button>

          <button
            onClick={() => setDashboardChartTab('both')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.78125rem',
              fontWeight: dashboardChartTab === 'both' ? 700 : 500,
              backgroundColor: dashboardChartTab === 'both' ? '#ffffff' : 'transparent',
              color: dashboardChartTab === 'both' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: dashboardChartTab === 'both' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>View Both</span>
          </button>
        </div>
      </div>

      {/* Render Recharts Compliance Status Pie Chart */}
      {(dashboardChartTab === 'compliance_pie' || dashboardChartTab === 'both') && (
        <ComplianceStatusPieChart
          projects={projects}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          title="Portfolio Compliance Requirements Status (Recharts)"
          subtitle="Real-time status breakdown across all portfolio compliance criteria (Compliant, Non-compliant, In Progress) for project stakeholders."
          showSummaryCards={true}
          showFilterButtons={true}
        />
      )}

      {/* Render D3.js Review Status Distribution Chart */}
      {(dashboardChartTab === 'review_bars' || dashboardChartTab === 'both') && (
        <ReviewStatusDistributionChart
          projects={projects}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />
      )}

      {/* 4. Main Dashboard Layout (Grid with Left Project Reviews and Right Deadlines/Activity) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Active Compliance Reviews */}
        <div>
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Active Compliance Reviews ({filteredProjects.length})
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Infrastructure assurance dossiers under formal Gateway and Treasury scrutiny
                </div>
              </div>

              {/* Sort Selector & Secondary PDF Export */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleExportCompliancePdf}
                  disabled={isExportingPdf}
                  title="Export filtered compliance summary report as PDF"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    fontSize: '0.78125rem',
                    fontWeight: 600,
                    color: '#1d70b8',
                    cursor: isExportingPdf ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PdfIcon style={{ fontSize: '0.95rem' }} />
                  <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.8125rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="date">Next Review Date</option>
                    <option value="score_desc">Assurance Score (High to Low)</option>
                    <option value="score_asc">Assurance Score (Low to High)</option>
                    <option value="budget">Capital Budget Size</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Bar Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <SearchIcon style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '1.1rem'
                }} />
                <input
                  type="text"
                  placeholder="Search projects by name, code, SRO, department, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 38px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      fontSize: '1rem'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sector Filter Buttons (Segmented Controls) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>SECTOR:</span>
                {['ALL', 'Transport', 'Energy', 'Health', 'Digital & Defence'].map(sector => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: selectedSector === sector ? 600 : 500,
                      backgroundColor: selectedSector === sector ? '#1d70b8' : '#f1f5f9',
                      color: selectedSector === sector ? '#ffffff' : '#334155',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {sector === 'ALL' ? 'All Sectors' : sector}
                  </button>
                ))}
              </div>

              {/* Gateway Stage & Status Dropdowns */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    GATEWAY STAGE:
                  </label>
                  <select
                    value={selectedGate}
                    onChange={(e) => setSelectedGate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8125rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="ALL">All Gateway Stages</option>
                    <option value="GATE_1">Gate 1: Business Justification</option>
                    <option value="GATE_2">Gate 2: Delivery Strategy</option>
                    <option value="GATE_3">Gate 3: Investment Decision</option>
                  </select>
                </div>

                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    REVIEW STATUS:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8125rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="ALL">All Review Statuses</option>
                    <option value="Active Assurance">Active Assurance</option>
                    <option value="Under Formal Review">Under Formal Review</option>
                    <option value="Remediation Required">Remediation Required</option>
                    <option value="Ready for Sign-Off">Ready for Sign-Off</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>

                {(selectedSector !== 'ALL' || selectedGate !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={handleResetFilters}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Project Review List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredProjects.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <FilterIcon style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '8px' }} />
                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 500 }}>
                  No infrastructure reviews match your filter criteria.
                </p>
                <button
                  onClick={handleResetFilters}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              filteredProjects.map((proj, idx) => {
                const isReady = proj.assuranceScore >= 80;
                const statusColor =
                  proj.reviewStatus === 'Ready for Sign-Off' ? '#16a34a' :
                  proj.reviewStatus === 'Remediation Required' ? '#dc2626' :
                  proj.reviewStatus === 'Under Formal Review' ? '#d97706' : '#1d70b8';

                return (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.28), ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -2, borderColor: '#93c5fd', boxShadow: '0 4px 8px -2px rgba(15, 23, 42, 0.06)' }}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* Project Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        {/* Domain Metadata Strip */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#1d70b8', fontFamily: 'monospace' }}>{proj.code}</span>
                          <span aria-hidden="true">·</span>
                          <span>{proj.department}</span>
                          <span aria-hidden="true">·</span>
                          <span>{proj.location}</span>
                        </div>

                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          margin: '0 0 6px 0',
                          lineHeight: 1.3
                        }}>
                          {proj.name}
                        </h3>

                        <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4, maxWidth: '640px' }}>
                          {proj.description}
                        </div>
                      </div>

                      {/* Assurance Score & Status */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: statusColor,
                          marginBottom: '4px'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: statusColor
                          }} />
                          <span>{proj.reviewStatus}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                            {proj.assuranceScore}%
                          </span>
                          <span style={{ fontSize: '0.75rem', color: isReady ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                            {isReady ? 'Substantial' : 'Assurance'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Metrics Linear Bar */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontFamily: 'monospace' }}>
                        <span>Progress: {proj.compliantCount} of {proj.totalRequirements} Verified</span>
                        <span>{proj.inProgressCount} In Progress · {proj.flaggedCount} Flagged</span>
                      </div>
                      <div style={{
                        height: '7px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex'
                      }}>
                        <div style={{
                          width: `${(proj.compliantCount / proj.totalRequirements) * 100}%`,
                          backgroundColor: '#16a34a'
                        }} title="Compliant" />
                        <div style={{
                          width: `${(proj.inProgressCount / proj.totalRequirements) * 100}%`,
                          backgroundColor: '#f59e0b'
                        }} title="In Progress" />
                        <div style={{
                          width: `${(proj.flaggedCount / proj.totalRequirements) * 100}%`,
                          backgroundColor: '#dc2626'
                        }} title="Flagged" />
                      </div>
                    </div>

                    {/* Accountability & Milestone Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      marginBottom: '14px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>SENIOR RESPONSIBLE OWNER</div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{proj.sro}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>GATEWAY STAGE</div>
                        <div style={{ fontWeight: 600, color: '#1d70b8' }}>{proj.gateLabel}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CAPITAL ENVELOPE</div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{proj.budgetFormatted}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>NEXT REVIEW DATE</div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{proj.nextReviewDate}</div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedProjectForModal(proj)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#1d70b8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>View Project Dossier & Governance Details</span>
                        <ArrowIcon style={{ fontSize: '0.9rem' }} />
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link href="/results" passHref legacyBehavior prefetch={false}>
                          <a style={{
                            padding: '6px 12px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#334155',
                            textDecoration: 'none'
                          }}>
                            Review Findings
                          </a>
                        </Link>
                        <Link href="/compliance-tracker" passHref legacyBehavior prefetch={false}>
                          <a style={{
                            padding: '6px 14px',
                            backgroundColor: '#1d70b8',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>Audit Tracker</span>
                            <ExternalLinkIcon style={{ fontSize: '0.85rem' }} />
                          </a>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Deadlines & Recent Progress Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section: Upcoming Deadlines Command Center */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>
                  Upcoming Deadlines ({filteredDeadlines.length})
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Statutory Gateway cutoffs, Treasury approvals & evidence freezes
                </div>
              </div>

              <button
                onClick={() => setIsNewDeadlineModalOpen(true)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#1d70b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AddIcon style={{ fontSize: '0.9rem' }} />
                <span>Add</span>
              </button>
            </div>

            {/* Deadline Urgency Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'SOON', label: '≤ 14 Days' },
                { id: 'GATEWAY', label: 'Gateways' },
                { id: 'TREASURY', label: 'Treasury' },
                { id: 'PENDING', label: 'Outstanding' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setDeadlineUrgencyFilter(item.id)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    fontWeight: deadlineUrgencyFilter === item.id ? 600 : 500,
                    backgroundColor: deadlineUrgencyFilter === item.id ? '#1e293b' : '#f8fafc',
                    color: deadlineUrgencyFilter === item.id ? '#ffffff' : '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Deadlines List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredDeadlines.map((dl, dlIdx) => {
                const isUrgent = dl.daysRemaining <= 14;
                const isSubmitted = dl.status === 'Submitted';

                return (
                  <motion.div
                    key={dl.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(dlIdx * 0.03, 0.24) }}
                    whileHover={{ borderColor: '#cbd5e1' }}
                    style={{
                      padding: '12px',
                      backgroundColor: isSubmitted ? '#f8fafc' : '#ffffff',
                      border: `1px solid ${isUrgent && !isSubmitted ? '#fed7aa' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                          {dl.projectName} · <span style={{ color: '#1d70b8' }}>{dl.gate}</span>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: isSubmitted ? '#64748b' : '#0f172a',
                          textDecoration: isSubmitted ? 'line-through' : 'none'
                        }}>
                          {dl.title}
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: isSubmitted ? '#16a34a' : isUrgent ? '#ea580c' : '#475569',
                        backgroundColor: isSubmitted ? '#dcfce7' : isUrgent ? '#ffedd5' : '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        {isSubmitted ? '✓ Submitted' : `${dl.daysRemaining}d left`}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', lineHeight: 1.4 }}>
                      {dl.description}
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '8px'
                    }}>
                      <span style={{ color: '#475569', fontFamily: 'monospace' }}>
                        Due: {dl.dueDate} ({dl.leadOwner.split('(')[0].trim()})
                      </span>

                      {/* Interactive status toggle */}
                      <button
                        onClick={() => handleToggleDeadlineStatus(dl.id)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor:
                            dl.status === 'Submitted' ? '#16a34a' :
                            dl.status === 'In Progress' ? '#f59e0b' : '#e2e8f0',
                          color: dl.status === 'Pending' ? '#475569' : '#ffffff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                        title="Click to toggle status (Pending -> In Progress -> Submitted)"
                      >
                        {dl.status}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Section: Recent Progress Metrics & Audit Activity Stream */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>
                  Recent Progress Metrics
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Live verification audit activity across portfolio
                </div>
              </div>
              <TimeIcon style={{ fontSize: '1.1rem', color: '#64748b' }} />
            </div>

            {/* Category Breakdown Table */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                CROSS-PORTFOLIO ASSURANCE RATE BY CATEGORY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { name: 'Financial & Optimism Bias', rate: 84, color: '#16a34a' },
                  { name: 'Risk Management (QSRA)', rate: 81, color: '#16a34a' },
                  { name: 'Delivery Capability & PMO', rate: 79, color: '#1d70b8' },
                  { name: 'Governance & Procurement', rate: 74, color: '#f59e0b' },
                  { name: 'Regulatory & Carbon (PAS 2080)', rate: 82, color: '#16a34a' }
                ].map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                    <span style={{ width: '160px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.name}
                    </span>
                    <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${cat.rate}%`, height: '100%', backgroundColor: cat.color }} />
                    </div>
                    <span style={{ width: '36px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {cat.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Activity Feed */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                RECENT AUDIT EVENTS
              </span>
              <Link href="/compliance-tracker?view=activity" style={{ fontSize: '0.75rem', color: '#1d70b8', fontWeight: 600, textDecoration: 'none' }}>
                Open Global Feed ➔
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map(act => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.8125rem'
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      act.type === 'Verification' ? '#16a34a' :
                      act.type === 'Sign-off' ? '#1d70b8' :
                      act.type === 'Evidence Upload' ? '#8b5cf6' : '#d97706',
                    marginTop: '5px',
                    flexShrink: 0
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
                      {act.action}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      {act.projectName} · {act.actor.split('(')[0].trim()} · <span style={{ fontFamily: 'monospace' }}>{act.timestamp}</span>
                    </div>
                    {act.notesSnippet && (
                      <div style={{
                        marginTop: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#475569',
                        fontStyle: 'italic'
                      }}>
                        &ldquo;{act.notesSnippet}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 4. Modal: Add Custom Deadline */}
      <AnimatePresence>
        {isNewDeadlineModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                width: '100%',
                maxWidth: '520px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Schedule Upcoming Project Deadline
              </h3>
              <button
                onClick={() => setIsNewDeadlineModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Infrastructure Project *
                </label>
                <select
                  value={newDeadlineProject}
                  onChange={(e) => setNewDeadlineProject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.875rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code}: {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Deadline Title / Milestone Deliverable *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gateway 2 Outline Business Case (OBC) Submission"
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.875rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Deliverable Category *
                  </label>
                  <select
                    value={newDeadlineCategory}
                    onChange={(e) => setNewDeadlineCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '0.8125rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="Gateway Submission">Gateway Submission</option>
                    <option value="Treasury Approval">Treasury Approval</option>
                    <option value="Evidence Cutoff">Evidence Cutoff</option>
                    <option value="Ministerial Sign-off">Ministerial Sign-off</option>
                    <option value="Audit Remediation">Audit Remediation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeadlineDate}
                    onChange={(e) => setNewDeadlineDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '0.8125rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Lead Accountable Owner
                </label>
                <input
                  type="text"
                  value={newDeadlineOwner}
                  onChange={(e) => setNewDeadlineOwner(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.875rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Deliverable Context & Evidence Criteria
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize evidence criteria and stakeholder approvals required..."
                  value={newDeadlineDescription}
                  onChange={(e) => setNewDeadlineDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.8125rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewDeadlineModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.8125rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Save Milestone Deadline
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* 5. Modal: Project Executive Details Drawer */}
      <AnimatePresence>
        {selectedProjectForModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '680px',
                padding: '28px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d70b8', fontFamily: 'monospace' }}>
                  {selectedProjectForModal.code} · {selectedProjectForModal.department}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                  {selectedProjectForModal.name}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  {selectedProjectForModal.location}
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectForModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <CloseIcon />
              </button>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.875rem',
              color: '#334155',
              lineHeight: 1.5
            }}>
              {selectedProjectForModal.description}
            </div>

            {/* Governance Details Matrix */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
              fontSize: '0.85rem'
            }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>SRO ACCOUNTABILITY</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedProjectForModal.sro}</span>
              </div>

              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>LEAD AUDITOR</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedProjectForModal.leadAuditor}</span>
              </div>

              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>CURRENT GATE</span>
                <span style={{ fontWeight: 600, color: '#1d70b8' }}>{selectedProjectForModal.gateLabel}</span>
              </div>

              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>CAPITAL BUDGET</span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{selectedProjectForModal.budgetFormatted}</span>
              </div>

              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>NEXT FORMAL REVIEW</span>
                <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{selectedProjectForModal.nextReviewDate}</span>
              </div>

              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>ASSURANCE FULFILLMENT</span>
                <span style={{ fontWeight: 700, color: selectedProjectForModal.assuranceScore >= 80 ? '#16a34a' : '#d97706', fontFamily: 'monospace' }}>
                  {selectedProjectForModal.assuranceScore}% ({selectedProjectForModal.compliantCount}/{selectedProjectForModal.totalRequirements} criteria)
                </span>
              </div>
            </div>

            {/* Project Deadlines */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Active Deadlines for this Infrastructure Asset
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deadlines.filter(d => d.projectId === selectedProjectForModal.id).map(dl => (
                  <div key={dl.id} style={{
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{dl.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {dl.category} · Due: <span style={{ fontFamily: 'monospace' }}>{dl.dueDate}</span>
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: dl.status === 'Submitted' ? '#dcfce7' : '#ffedd5',
                      color: dl.status === 'Submitted' ? '#16a34a' : '#ea580c'
                    }}>
                      {dl.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleExportSingleProjectPdf(selectedProjectForModal)}
                disabled={isExportingPdf}
                title="Export this project's statutory compliance review as a PDF report"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: isExportingPdf ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PdfIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
                <span>{isExportingPdf ? 'Exporting...' : 'Export Project PDF'}</span>
              </button>

              <Link href="/compliance-tracker" passHref legacyBehavior prefetch={false}>
                <a style={{
                  padding: '8px 18px',
                  backgroundColor: '#1d70b8',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>Open Full Audit Tracker</span>
                  <ExternalLinkIcon style={{ fontSize: '1rem' }} />
                </a>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
