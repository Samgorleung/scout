"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Assessment as AssessmentIcon,
  AssignmentTurnedIn as VerifiedIcon,
  WarningAmber as WarningIcon,
  ErrorOutline as ErrorIcon,
  History as HistoryIcon,
  Sync as SyncIcon,
  PictureAsPdf as PdfIcon,
  FilterList as FilterIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as CalendarIcon,
  Business as BusinessIcon,
  AccountBalance as TreasuryIcon,
  ShieldOutlined as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  CheckCircle as CheckCircleIcon,
  Tune as TuneIcon,
  OpenInNew as OpenInNewIcon,
  Speed as VelocityIcon,
  FactCheck as FindingsIcon,
  RateReview as RateReviewIcon,
  Description as DocumentIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  Article as ArticleIcon,
  AutoAwesome as SparklesIcon,
  RestartAlt as ResetIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  activeInfrastructureProjects,
  initialComplianceRequirements,
  initialAuditActivities,
  upcomingProjectDeadlines,
  InfrastructureProject,
  ComplianceRequirementItem,
  AuditActivity
} from '@/lib/seedData';
import { getFirestoreAll, db } from '@/lib/firebase';
import { onSnapshot, collection } from 'firebase/firestore';
import ComplianceTracker from './ComplianceTracker';
import { ComplianceOfficerWidget } from './ComplianceOfficerWidget';
import { FindingExpandableDetailView, FindingDetailData } from './FindingExpandableDetailView';
import { SeverityLevel, SEVERITY_CONFIGS, ALL_SEVERITY_LEVELS } from './SeverityFilterDropdown';
import { exportProjectGatewayPackPdf } from '@/utils/exportCompliancePdf';
import { rateResponse } from '@/utils/api';

export interface ProjectDashboardProps {
  initialProjectId?: string;
  defaultTab?: 'assurance' | 'findings' | 'checklist' | 'entity';
}

// 5-Case Model Green Book dimensions for project status breakdown
interface GreenBookCaseMetric {
  caseName: string;
  shortName: string;
  score: number;
  benchmark: number;
  status: 'Exceeding' | 'On Track' | 'Under Review' | 'Critical Gap';
  color: string;
}

// Risk exposure category for Key Risk Metrics
interface ProjectRiskMetric {
  category: string;
  riskScore: number; // 1 - 10
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  exposureCost: string;
  mitigationStatus: string;
  owner: string;
}

// Audit Velocity timeline data point
interface AuditVelocityPoint {
  period: string;
  compliantTransitions: number;
  riskFlags: number;
  evidenceSubmissions: number;
  totalActivities: number;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  initialProjectId = 'proj_001',
  defaultTab = 'assurance'
}) => {
  const router = useRouter();
  const [projects, setProjects] = useState<InfrastructureProject[]>(activeInfrastructureProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [requirements, setRequirements] = useState<ComplianceRequirementItem[]>(initialComplianceRequirements);
  const [auditLogs, setAuditLogs] = useState<AuditActivity[]>(initialAuditActivities);
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState<'ALL' | 'STATUS' | 'RISK' | 'EVIDENCE' | 'SIGNOFF'>('ALL');
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'assurance' | 'findings' | 'checklist' | 'entity'>(defaultTab);

  // Findings Tab State
  const [findingSearchQuery, setFindingSearchQuery] = useState('');
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<'ALL' | SeverityLevel>('ALL');
  const [findingStatusFilter, setFindingStatusFilter] = useState<'ALL' | 'Positive' | 'Negative' | 'Neutral'>('ALL');
  const [findingCategoryFilter, setFindingCategoryFilter] = useState<string>('ALL');
  const [selectedFindingForDrawer, setSelectedFindingForDrawer] = useState<FindingDetailData | null>(null);
  const [isFindingDrawerOpen, setIsFindingDrawerOpen] = useState(false);
  const [ratingsMap, setRatingsMap] = useState<Record<string, boolean>>({});

  // Gateway Assurance Pack Modal State
  const [isGatewayPackModalOpen, setIsGatewayPackModalOpen] = useState(false);
  const [gatewayPackConfidence, setGatewayPackConfidence] = useState<'GREEN' | 'AMBER_GREEN' | 'AMBER' | 'AMBER_RED' | 'RED'>('AMBER_GREEN');
  const [gatewayPackRemarks, setGatewayPackRemarks] = useState('');
  const [includeGreenBookSection, setIncludeGreenBookSection] = useState(true);
  const [includeRisksSection, setIncludeRisksSection] = useState(true);
  const [includeFindingsSection, setIncludeFindingsSection] = useState(true);
  const [includeDeadlinesSection, setIncludeDeadlinesSection] = useState(true);
  const [isExportingGatewayPack, setIsExportingGatewayPack] = useState(false);
  const [packExportNotice, setPackExportNotice] = useState<string | null>(null);
  const [isGeneratingAiBriefing, setIsGeneratingAiBriefing] = useState(false);
  const [aiBriefingNotice, setAiBriefingNotice] = useState<string | null>(null);

  // What-If Gateway Decision Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);
  const [simResolveCritical, setSimResolveCritical] = useState(false);
  const [simVerifyEconomic, setSimVerifyEconomic] = useState(false);
  const [simProcurementEvidence, setSimProcurementEvidence] = useState(false);
  const [simPlanningMitigation, setSimPlanningMitigation] = useState(false);

  // Sync selected project and tab with URL query params
  useEffect(() => {
    setIsMounted(true);
    if (router.query.projectId && typeof router.query.projectId === 'string') {
      setSelectedProjectId(router.query.projectId);
    } else if (router.query.id && typeof router.query.id === 'string') {
      setSelectedProjectId(router.query.id);
    }

    if (router.query.tab === 'checklist' || router.query.view === 'checklist') {
      setActiveTab('checklist');
    } else if (router.query.tab === 'findings' || router.query.view === 'findings' || router.query.tab === 'results') {
      setActiveTab('findings');
    } else if (router.query.tab === 'entity') {
      setActiveTab('entity');
    } else if (router.query.tab === 'assurance') {
      setActiveTab('assurance');
    }
  }, [router.query]);

  // Real-time Firestore sync with fallback
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
        () => {
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
        () => {
          setAuditLogs(initialAuditActivities);
        }
      );
    } catch {
      setRequirements(initialComplianceRequirements);
      setAuditLogs(initialAuditActivities);
    }

    return () => {
      if (unsubRequirements) unsubRequirements();
      if (unsubLogs) unsubLogs();
    };
  }, []);

  // Currently selected infrastructure project
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0] || activeInfrastructureProjects[0];
  }, [projects, selectedProjectId]);

  // Change project handler
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, projectId }
      },
      undefined,
      { shallow: true }
    );
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshReqs = await getFirestoreAll('compliance_requirements');
      if (Array.isArray(freshReqs) && freshReqs.length > 0) {
        setRequirements(freshReqs);
      }
      const freshLogs = await getFirestoreAll('audit_activities');
      if (Array.isArray(freshLogs) && freshLogs.length > 0) {
        setAuditLogs(freshLogs);
      }
      setIsLiveSynced(true);
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  };

  // 1. Status Breakdown Donut Data
  const statusPieData = useMemo(() => {
    const compliant = currentProject.compliantCount || 16;
    const inProgress = currentProject.inProgressCount || 5;
    const flagged = currentProject.flaggedCount || 3;
    const total = compliant + inProgress + flagged;
    const safeTotal = total > 0 ? total : 1;

    return [
      {
        name: 'Compliant',
        value: compliant,
        percentage: Math.round((compliant / safeTotal) * 100),
        color: '#10b981',
        description: 'Requirements with validated evidence meeting gateway standards'
      },
      {
        name: 'In Progress',
        value: inProgress,
        percentage: Math.round((inProgress / safeTotal) * 100),
        color: '#f59e0b',
        description: 'Active evidence gathering or assurance assessment ongoing'
      },
      {
        name: 'Flagged Deficits',
        value: flagged,
        percentage: Math.round((flagged / safeTotal) * 100),
        color: '#ef4444',
        description: 'Identified non-compliance gaps requiring corrective action'
      }
    ];
  }, [currentProject]);

  // 2. 5-Case Model Green Book Alignment Bar Chart Data
  const greenBookData: GreenBookCaseMetric[] = useMemo(() => {
    // Generate realistic case metrics tailored to project status
    const baseScore = currentProject.assuranceScore || 80;
    return [
      {
        caseName: 'Strategic Case',
        shortName: 'Strategic',
        score: Math.min(100, Math.max(50, baseScore + 4)),
        benchmark: 80,
        status: baseScore >= 80 ? 'On Track' : 'Under Review',
        color: '#1d70b8'
      },
      {
        caseName: 'Economic Case',
        shortName: 'Economic',
        score: Math.min(100, Math.max(45, baseScore - 6)),
        benchmark: 75,
        status: baseScore - 6 >= 75 ? 'On Track' : 'Critical Gap',
        color: '#059669'
      },
      {
        caseName: 'Commercial Case',
        shortName: 'Commercial',
        score: Math.min(100, Math.max(55, baseScore + 2)),
        benchmark: 80,
        status: 'On Track',
        color: '#7c3aed'
      },
      {
        caseName: 'Financial Case',
        shortName: 'Financial',
        score: Math.min(100, Math.max(40, baseScore - 8)),
        benchmark: 80,
        status: baseScore - 8 >= 75 ? 'On Track' : 'Under Review',
        color: '#d97706'
      },
      {
        caseName: 'Management Case',
        shortName: 'Management',
        score: Math.min(100, Math.max(60, baseScore + 5)),
        benchmark: 85,
        status: baseScore >= 85 ? 'Exceeding' : 'On Track',
        color: '#0284c7'
      }
    ];
  }, [currentProject]);

  // 3. Key Risk Metrics Data
  const keyRiskMetrics: ProjectRiskMetric[] = useMemo(() => {
    const isHighRisk = (currentProject.criticalRisksCount || 0) >= 3;
    return [
      {
        category: 'Statutory Consents & Planning',
        riskScore: isHighRisk ? 8.4 : 5.2,
        severity: isHighRisk ? 'Critical' : 'Medium',
        exposureCost: '£18.5M',
        mitigationStatus: 'DCO amendment submission pending approval',
        owner: currentProject.sro || 'Dame Patricia Hayes'
      },
      {
        category: 'Procurement & Supply Chain Escalation',
        riskScore: isHighRisk ? 7.8 : 4.8,
        severity: isHighRisk ? 'High' : 'Low',
        exposureCost: '£42.0M',
        mitigationStatus: 'NEC4 indexation and steel cap clause negotiated',
        owner: 'Marcus Chen (Commercial Lead)'
      },
      {
        category: 'Environmental & Biodiversity Net Gain',
        riskScore: 6.9,
        severity: 'High',
        exposureCost: '£8.2M',
        mitigationStatus: 'Habitat mitigation land acquisition in progress',
        owner: 'Eleanor Vance (Lead Assessor)'
      },
      {
        category: 'Digital Engineering & BIM ISO 19650',
        riskScore: 4.1,
        severity: 'Low',
        exposureCost: '£2.4M',
        mitigationStatus: 'Common Data Environment fully validated',
        owner: "David O'Connor (Technical Lead)"
      }
    ];
  }, [currentProject]);

  // 4. Recharts Audit Activity Velocity Timeline Data
  const auditVelocityData: AuditVelocityPoint[] = useMemo(() => {
    return [
      { period: 'Week 1', compliantTransitions: 4, riskFlags: 1, evidenceSubmissions: 5, totalActivities: 10 },
      { period: 'Week 2', compliantTransitions: 6, riskFlags: 2, evidenceSubmissions: 8, totalActivities: 16 },
      { period: 'Week 3', compliantTransitions: 3, riskFlags: 4, evidenceSubmissions: 6, totalActivities: 13 },
      { period: 'Week 4', compliantTransitions: 8, riskFlags: 1, evidenceSubmissions: 11, totalActivities: 20 },
      { period: 'Week 5', compliantTransitions: 7, riskFlags: 2, evidenceSubmissions: 9, totalActivities: 18 },
      { period: 'Current (W6)', compliantTransitions: 9, riskFlags: 1, evidenceSubmissions: 12, totalActivities: 22 }
    ];
  }, []);

  // Filtered audit activity logs for this project
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Filter by project if project matches or generic
      const matchesProject =
        !log.projectName ||
        log.projectName.toLowerCase().includes(currentProject.name.toLowerCase().substring(0, 10)) ||
        (log as any).projectId === currentProject.id;

      if (!matchesProject && auditLogs.length > 5) {
        // Return project logs or general logs
      }

      if (activityTypeFilter === 'ALL') return true;
      if (activityTypeFilter === 'STATUS') return log.type === 'status_transition';
      if (activityTypeFilter === 'RISK') return log.type === 'risk_flag';
      if (activityTypeFilter === 'EVIDENCE') return log.type === 'evidence_upload';
      if (activityTypeFilter === 'SIGNOFF') return log.type === 'audit_signoff';
      return true;
    });
  }, [auditLogs, currentProject, activityTypeFilter]);

  // Risk Score Bar Chart Data for Recharts
  const riskChartData = useMemo(() => {
    return keyRiskMetrics.map(r => ({
      category: r.category.split(' ')[0] + '...',
      fullName: r.category,
      riskScore: r.riskScore,
      severity: r.severity,
      exposureCost: r.exposureCost,
      color:
        r.severity === 'Critical' ? '#dc2626' :
        r.severity === 'High' ? '#ea580c' :
        r.severity === 'Medium' ? '#d97706' : '#059669'
    }));
  }, [keyRiskMetrics]);

  // Initialize default remarks when currentProject changes
  useEffect(() => {
    setGatewayPackRemarks(
      `Assurance review confirms ${currentProject.name} maintains substantial compliance with HM Treasury Green Book ${currentProject.gateLabel || currentProject.currentGate} criteria. Recommend proceeding with delivery subject to active mitigation of identified statutory planning and environmental net-gain conditions.`
    );
  }, [currentProject]);

  // Dedicated Project Findings dataset combining requirements & project context
  const projectFindings: FindingDetailData[] = useMemo(() => {
    const reqs = requirements.length > 0 ? requirements : initialComplianceRequirements;

    return reqs.map((req, idx) => {
      const isPositive = req.status === 'Compliant';
      const isNegative = req.status === 'Flagged';
      const answer = isPositive ? 'Positive' : isNegative ? 'Negative' : 'Neutral';

      let sev: SeverityLevel = 'Medium';
      if (req.priority === 'Critical') sev = 'Critical';
      else if (req.priority === 'High') sev = 'High';
      else if (req.priority === 'Low') sev = 'Low';
      else if (isNegative) sev = 'High';
      else if (isPositive) sev = 'Low';

      return {
        id: `finding_${currentProject.id}_${req.id}`,
        Criterion: {
          id: req.id,
          question: req.title,
          evidence: req.evidenceThreshold || req.description,
          category: req.category,
          gate: req.gate || currentProject.currentGate,
          created_datetime: req.created_datetime || '2026-01-15'
        },
        Category: req.category,
        Gate: req.gate || currentProject.currentGate,
        Status: answer,
        Severity: sev,
        Evidence: req.evidenceRequired || req.evidenceThreshold,
        Justification: req.auditorNotes || req.description || `Assessment of ${req.title} for ${currentProject.name}`,
        Sources: [
          {
            chunk_id: `chunk_${currentProject.id}_${idx + 1}`,
            fileName: req.documentRef || `DOC-${currentProject.code}-${req.category.toUpperCase().slice(0, 4)}-01.pdf`
          }
        ],
        Project: {
          id: currentProject.id,
          name: currentProject.name,
          review_type: currentProject.currentGate
        },
        remediationSteps: isNegative
          ? [
              `Appoint technical specialist to resolve ${req.title} deficit.`,
              `Submit formal compliance evidence meeting threshold: "${req.evidenceThreshold}".`,
              `Schedule gateway remediation checkpoint review before ${currentProject.nextReviewDate || 'Q2 2026'}.`
            ]
          : isPositive
          ? [
              `Maintain audited evidence in the document repository.`,
              `Periodic review during subsequent gateway assessment.`
            ]
          : [
              `Awaiting final stakeholder review and sign-off.`,
              `Complete required verification threshold check.`
            ]
      };
    });
  }, [requirements, currentProject]);

  const findingCategories = useMemo(() => {
    const set = new Set<string>();
    projectFindings.forEach(f => {
      if (f.Category) set.add(f.Category);
    });
    return Array.from(set).sort();
  }, [projectFindings]);

  const findingSeverityCounts = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    projectFindings.forEach(f => {
      if (counts[f.Severity] !== undefined) {
        counts[f.Severity]++;
      }
    });
    return counts;
  }, [projectFindings]);

  const filteredProjectFindings = useMemo(() => {
    return projectFindings.filter(f => {
      if (findingSeverityFilter !== 'ALL' && f.Severity !== findingSeverityFilter) return false;
      if (findingStatusFilter !== 'ALL' && f.Status !== findingStatusFilter) return false;
      if (findingCategoryFilter !== 'ALL' && f.Category !== findingCategoryFilter) return false;

      if (findingSearchQuery.trim()) {
        const q = findingSearchQuery.toLowerCase();
        const question = f.Criterion.question.toLowerCase();
        const cat = f.Category.toLowerCase();
        const justification = f.Justification.toLowerCase();
        const sources = f.Sources.map(s => s.fileName.toLowerCase()).join(' ');
        if (!question.includes(q) && !cat.includes(q) && !justification.includes(q) && !sources.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [projectFindings, findingSeverityFilter, findingStatusFilter, findingCategoryFilter, findingSearchQuery]);

  const handleRateFinding = async (good: boolean) => {
    if (!selectedFindingForDrawer) return;
    try {
      await rateResponse({
        result_id: selectedFindingForDrawer.id,
        good_response: good
      });
      setRatingsMap(prev => ({
        ...prev,
        [selectedFindingForDrawer.id]: good
      }));
    } catch {
      setRatingsMap(prev => ({
        ...prev,
        [selectedFindingForDrawer.id]: good
      }));
    }
  };

  const currentFindingDrawerIndex = useMemo(() => {
    if (!selectedFindingForDrawer) return -1;
    return filteredProjectFindings.findIndex(f => f.id === selectedFindingForDrawer.id);
  }, [selectedFindingForDrawer, filteredProjectFindings]);

  const handleDrawerNavigateNext = () => {
    if (filteredProjectFindings.length === 0) return;
    const nextIdx = currentFindingDrawerIndex >= 0 && currentFindingDrawerIndex < filteredProjectFindings.length - 1
      ? currentFindingDrawerIndex + 1
      : 0;
    setSelectedFindingForDrawer(filteredProjectFindings[nextIdx]);
  };

  const handleDrawerNavigatePrev = () => {
    if (filteredProjectFindings.length === 0) return;
    const prevIdx = currentFindingDrawerIndex > 0
      ? currentFindingDrawerIndex - 1
      : filteredProjectFindings.length - 1;
    setSelectedFindingForDrawer(filteredProjectFindings[prevIdx]);
  };

  const handleGenerateGatewayPack = async () => {
    setIsExportingGatewayPack(true);
    setPackExportNotice(null);
    try {
      await exportProjectGatewayPackPdf({
        project: currentProject,
        deliveryConfidence: gatewayPackConfidence,
        greenBookCases: greenBookData,
        riskMetrics: keyRiskMetrics,
        findings: projectFindings.map(f => ({
          id: f.id,
          question: f.Criterion.question,
          category: f.Category,
          severity: f.Severity,
          status: f.Status,
          evidence: f.Evidence,
          justification: f.Justification,
          sources: f.Sources
        })),
        requirements: requirements.map(r => ({
          id: r.id,
          code: r.code,
          title: r.title,
          category: r.category,
          priority: r.priority,
          status: r.status,
          isChecked: r.isChecked,
          evidenceThreshold: r.evidenceThreshold
        })),
        deadlines: upcomingProjectDeadlines.filter(dl => dl.projectId === currentProject.id || !dl.projectId),
        executiveRemarks: gatewayPackRemarks,
        sectionsToInclude: {
          greenBook: includeGreenBookSection,
          risks: includeRisksSection,
          findings: includeFindingsSection,
          checklist: true,
          deadlines: includeDeadlinesSection
        }
      });
      setPackExportNotice(`Successfully exported Gateway Assurance Pack for ${currentProject.name}!`);
      setTimeout(() => {
        setIsGatewayPackModalOpen(false);
        setPackExportNotice(null);
      }, 1600);
    } catch (err) {
      console.error('Failed to export gateway assurance pack:', err);
      setPackExportNotice('Notice: Unable to complete PDF export. Please try again.');
    } finally {
      setIsExportingGatewayPack(false);
    }
  };

  // What-If Gateway Simulation Calculations
  const simulatedGain =
    (simResolveCritical ? 6 : 0) +
    (simVerifyEconomic ? 5 : 0) +
    (simProcurementEvidence ? 4 : 0) +
    (simPlanningMitigation ? 5 : 0);

  const simulatedScore = Math.min(100, currentProject.assuranceScore + simulatedGain);

  const simulatedConfidence: 'GREEN' | 'AMBER_GREEN' | 'AMBER' | 'AMBER_RED' | 'RED' = useMemo(() => {
    if (simulatedScore >= 85) return 'GREEN';
    if (simulatedScore >= 75) return 'AMBER_GREEN';
    if (simulatedScore >= 65) return 'AMBER';
    if (simulatedScore >= 50) return 'AMBER_RED';
    return 'RED';
  }, [simulatedScore]);

  const handleResetSimulation = () => {
    setSimResolveCritical(false);
    setSimVerifyEconomic(false);
    setSimProcurementEvidence(false);
    setSimPlanningMitigation(false);
  };

  const handleApplySimulationToGatewayPack = () => {
    setGatewayPackConfidence(simulatedConfidence);
    const resolvedItems = [
      simResolveCritical ? 'Critical Deficit Mitigation' : '',
      simVerifyEconomic ? 'Economic Case Benefit-Cost Ratio Verification' : '',
      simProcurementEvidence ? 'Procurement & Commercial Strategy Finalization' : '',
      simPlanningMitigation ? 'Statutory Planning Conditions Resolution' : ''
    ].filter(Boolean);

    setGatewayPackRemarks(
      `Gateway Simulation Strategy: Reflecting a simulated assurance score of ${simulatedScore}% (${simulatedConfidence.replace('_', '/')}) following prospective resolution of ${
        resolvedItems.length > 0 ? resolvedItems.join(', ') : 'targeted criteria'
      }. Senior Responsible Owner (SRO) ${currentProject.sro} endorses proceeding with procurement subject to submission of formal evidentiary artifacts meeting statutory standards.`
    );
    setIsGatewayPackModalOpen(true);
  };

  const handleGenerateAiBriefing = async () => {
    setIsGeneratingAiBriefing(true);
    setAiBriefingNotice(null);
    try {
      const res = await fetch('/api/generate-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: currentProject.name,
          projectCode: currentProject.code,
          gate: currentProject.gateLabel || currentProject.currentGate,
          assuranceScore: currentProject.assuranceScore,
          deliveryConfidence: gatewayPackConfidence,
          sro: currentProject.sro,
          greenBookCases: greenBookData,
          riskMetrics: keyRiskMetrics,
          flaggedCount: currentProject.flaggedCount || 0
        })
      });
      const data = await res.json();
      if (data.briefing) {
        setGatewayPackRemarks(data.briefing);
        setAiBriefingNotice('HM Treasury SRO Executive Brief successfully generated!');
        setTimeout(() => setAiBriefingNotice(null), 3500);
      }
    } catch (err) {
      console.error('Failed to generate AI briefing:', err);
      setAiBriefingNotice('Notice: Unable to generate briefing, using standard synthesis.');
    } finally {
      setIsGeneratingAiBriefing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px', fontFamily: 'inherit' }}>
      {/* 1. Executive Project Header & Project Selector Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        marginBottom: '24px'
      }}>
        {/* Top Control Line */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          {/* Breadcrumb / Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
            <Link href="/dashboard" prefetch={false} passHref legacyBehavior>
              <a style={{ color: '#1d70b8', fontWeight: 600, textDecoration: 'none' }}>
                Portfolio Dashboard
              </a>
            </Link>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Project Assurance Dossier</span>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{currentProject.code}</span>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Live Sync Badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: isLiveSynced ? '#ecfdf5' : '#f8fafc',
              color: isLiveSynced ? '#059669' : '#64748b',
              fontSize: '0.725rem',
              fontWeight: 600,
              border: `1px solid ${isLiveSynced ? '#a7f3d0' : '#e2e8f0'}`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLiveSynced ? '#10b981' : '#94a3b8'
              }} />
              {isLiveSynced ? 'Cloud Sync Active' : 'Static Seed Cache'}
            </span>

            {/* Refresh Action */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh project metrics from Firestore"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: '#334155',
                cursor: isRefreshing ? 'wait' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <SyncIcon style={{ fontSize: '1rem', animation: isRefreshing ? 'spin 0.6s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>

            {/* Official HM Treasury Gateway Assurance Pack PDF */}
            <button
              type="button"
              onClick={() => setIsGatewayPackModalOpen(true)}
              title="Generate official HM Treasury & IPA Gateway Assurance Pack Dossier"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#1d70b8',
                border: '1px solid #1d70b8',
                borderRadius: '6px',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(29, 112, 184, 0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <ArticleIcon style={{ fontSize: '1rem', color: '#bfdbfe' }} />
              <span>Gateway Assurance Pack</span>
            </button>

            {/* Download PDF via browser print media stylesheet */}
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              title="Download project assurance dossier as PDF"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#0f172a',
                border: '1px solid #0f172a',
                borderRadius: '6px',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <PdfIcon style={{ fontSize: '1rem', color: '#f87171' }} />
              <span>Print View</span>
            </button>
          </div>
        </div>

        {/* Project Switcher & Header Content */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Project Title & Selector */}
          <div style={{ flex: '1 1 540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#eff6ff',
                color: '#1d70b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid #bfdbfe',
                fontFamily: 'monospace'
              }}>
                {currentProject.code}
              </span>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: currentProject.reviewStatus === 'Ready for Sign-Off' ? '#ecfdf5' : '#fffbeb',
                color: currentProject.reviewStatus === 'Ready for Sign-Off' ? '#047857' : '#b45309',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: `1px solid ${currentProject.reviewStatus === 'Ready for Sign-Off' ? '#a7f3d0' : '#fde68a'}`
              }}>
                {currentProject.reviewStatus}
              </span>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {currentProject.sector}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                {currentProject.name}
              </h1>

              {/* Project Selection Dropdown */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  aria-label="Select Infrastructure Project"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      Switch: {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p style={{
              margin: '8px 0 0 0',
              fontSize: '0.875rem',
              color: '#475569',
              lineHeight: 1.5,
              maxWidth: '820px'
            }}>
              Autonomous gateway review dossier and compliance verification for HM Treasury Green Book assurance.
              Currently evaluated under <strong>{currentProject.currentGate}</strong>.
            </p>
          </div>

          {/* Governance Meta Capsule */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Senior Responsible Owner</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{currentProject.sro}</div>
            </div>
            <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Department</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{currentProject.department}</div>
            </div>
            <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Budget Exposure</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#047857' }}>
                {(currentProject as any).budgetFormatted || '£1.02B'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Console Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '6px 10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('assurance')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: activeTab === 'assurance' ? '1px solid #1d70b8' : '1px solid transparent',
              backgroundColor: activeTab === 'assurance' ? '#eff6ff' : 'transparent',
              color: activeTab === 'assurance' ? '#1d70b8' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <AssessmentIcon style={{ fontSize: '1.1rem' }} />
            <span>Assurance Profile & Risk Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('findings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: activeTab === 'findings' ? '1px solid #1d70b8' : '1px solid transparent',
              backgroundColor: activeTab === 'findings' ? '#eff6ff' : 'transparent',
              color: activeTab === 'findings' ? '#1d70b8' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FindingsIcon style={{ fontSize: '1.1rem' }} />
            <span>Review Findings & Evidence</span>
            <span style={{
              backgroundColor: activeTab === 'findings' ? '#1d70b8' : '#e2e8f0',
              color: activeTab === 'findings' ? '#ffffff' : '#475569',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {projectFindings.length} Items
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: activeTab === 'checklist' ? '1px solid #1d70b8' : '1px solid transparent',
              backgroundColor: activeTab === 'checklist' ? '#eff6ff' : 'transparent',
              color: activeTab === 'checklist' ? '#1d70b8' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <VerifiedIcon style={{ fontSize: '1.1rem' }} />
            <span>Interactive Compliance Checklist</span>
            <span style={{
              backgroundColor: activeTab === 'checklist' ? '#1d70b8' : '#e2e8f0',
              color: activeTab === 'checklist' ? '#ffffff' : '#475569',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {currentProject.totalRequirements || requirements.length} Criteria
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('entity')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: activeTab === 'entity' ? '1px solid #1d70b8' : '1px solid transparent',
              backgroundColor: activeTab === 'entity' ? '#eff6ff' : 'transparent',
              color: activeTab === 'entity' ? '#1d70b8' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldIcon style={{ fontSize: '1.1rem' }} />
            <span>Corporate Entity & Supplier Standing</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href={`/results?projectId=${currentProject.id}`} passHref legacyBehavior>
            <a style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#1d70b8',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <span>Dedicated Findings Table</span>
              <ArrowForwardIcon style={{ fontSize: '0.95rem' }} />
            </a>
          </Link>
        </div>
      </div>

      {/* Tab Content 1: Assurance Profile & Risk Analytics */}
      {activeTab === 'assurance' && (
        <>
          {/* 2. Top Summary KPI Scorecards (4 Cards) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
        {/* KPI 1: Overall Assurance Health Score */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '18px 20px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Assurance Index
              </span>
              <AssessmentIcon style={{ fontSize: '1.25rem', color: '#1d70b8' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {currentProject.assuranceScore}%
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Target benchmark: 80% gateway sign-off threshold
            </p>
          </div>
          <div style={{
            marginTop: '12px',
            width: '100%',
            height: '6px',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${currentProject.assuranceScore}%`,
              height: '100%',
              backgroundColor: currentProject.assuranceScore >= 80 ? '#10b981' : '#f59e0b',
              borderRadius: '9999px'
            }} />
          </div>
        </div>

        {/* KPI 2: Compliance Requirements Rate */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '18px 20px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Requirements Verified
              </span>
              <VerifiedIcon style={{ fontSize: '1.25rem', color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>
              {currentProject.compliantCount} / {currentProject.totalRequirements}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {Math.round(((currentProject.compliantCount || 1) / (currentProject.totalRequirements || 1)) * 100)}% criteria audited & cleared
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857' }}>{currentProject.compliantCount} Compliant</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>·</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#b45309' }}>{currentProject.inProgressCount} In Progress</span>
          </div>
        </div>

        {/* KPI 3: Key Risk Deficits */}
        <div style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${currentProject.criticalRisksCount > 0 ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: '10px',
          padding: '18px 20px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                Critical Risk Deficits
              </span>
              <WarningIcon style={{ fontSize: '1.25rem', color: '#dc2626' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1 }}>
              {currentProject.criticalRisksCount}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Identified compliance gaps requiring immediate mitigation
            </p>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: currentProject.criticalRisksCount > 0 ? '#fef2f2' : '#f0fdf4',
              color: currentProject.criticalRisksCount > 0 ? '#991b1b' : '#166534',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {currentProject.criticalRisksCount > 0 ? 'Remediation Roadmap Active' : 'Zero Critical Blockers'}
            </span>
          </div>
        </div>

        {/* KPI 4: Next Gateway Review */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '18px 20px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Next Review Stage
              </span>
              <CalendarIcon style={{ fontSize: '1.25rem', color: '#7c3aed' }} />
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {currentProject.nextReviewDate || '2026-04-15'}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Lead Auditor: {currentProject.leadAuditor || 'Eleanor Vance'}
            </p>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{
              fontSize: '0.725rem',
              fontWeight: 600,
              color: '#1d70b8',
              backgroundColor: '#eff6ff',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {currentProject.currentGate}
            </span>
          </div>
        </div>
      </div>

      {/* Feature 1: "What-If" Gateway Approval & Delivery Confidence Simulator */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 2px 6px -1px rgba(29, 112, 184, 0.08)',
        marginBottom: '24px',
        backgroundImage: 'linear-gradient(to right, #ffffff, #f8fafc)'
      }}>
        {/* Simulator Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#1d70b8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ScienceIcon style={{ fontSize: '1.25rem' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  What-If Gateway Approval & Delivery Confidence Simulator
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d70b8',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  Decision Modeling
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78125rem', color: '#64748b' }}>
                Simulate gateway review outcomes by prospective mitigation of criteria deficits before formal HM Treasury committee review.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {simulatedGain > 0 && (
              <button
                type="button"
                onClick={handleResetSimulation}
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
                <ResetIcon style={{ fontSize: '0.9rem' }} />
                <span>Reset Levers</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1d70b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isSimulatorOpen ? 'Collapse Simulator' : 'Expand Simulator'}
            </button>
          </div>
        </div>

        {/* Simulator Body */}
        {isSimulatorOpen && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}>
            {/* Levers List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Prospective Mitigation Levers:
              </span>

              {/* Lever 1 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: simResolveCritical ? '#f0fdf4' : '#ffffff',
                border: simResolveCritical ? '1px solid #86efac' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={simResolveCritical}
                    onChange={(e) => setSimResolveCritical(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                      Mitigate Critical Planning Deficits
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Satisfies statutory DCO environmental net-gain threshold
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: simResolveCritical ? '#15803d' : '#1d70b8',
                  backgroundColor: simResolveCritical ? '#dcfce7' : '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  +6%
                </span>
              </label>

              {/* Lever 2 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: simVerifyEconomic ? '#f0fdf4' : '#ffffff',
                border: simVerifyEconomic ? '1px solid #86efac' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={simVerifyEconomic}
                    onChange={(e) => setSimVerifyEconomic(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                      Verify Economic Case BCR Model
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Full Green Book social welfare & monetized benefit sign-off
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: simVerifyEconomic ? '#15803d' : '#1d70b8',
                  backgroundColor: simVerifyEconomic ? '#dcfce7' : '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  +5%
                </span>
              </label>

              {/* Lever 3 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: simProcurementEvidence ? '#f0fdf4' : '#ffffff',
                border: simProcurementEvidence ? '1px solid #86efac' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={simProcurementEvidence}
                    onChange={(e) => setSimProcurementEvidence(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                      Submit Commercial Procurement Strategy
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Verified contract allocation & risk transfer agreements
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: simProcurementEvidence ? '#15803d' : '#1d70b8',
                  backgroundColor: simProcurementEvidence ? '#dcfce7' : '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  +4%
                </span>
              </label>

              {/* Lever 4 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: simPlanningMitigation ? '#f0fdf4' : '#ffffff',
                border: simPlanningMitigation ? '1px solid #86efac' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={simPlanningMitigation}
                    onChange={(e) => setSimPlanningMitigation(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                      Resolve Financial Contingency Envelope
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Affordability sign-off with HM Treasury spending team
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: simPlanningMitigation ? '#15803d' : '#1d70b8',
                  backgroundColor: simPlanningMitigation ? '#dcfce7' : '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  +5%
                </span>
              </label>
            </div>

            {/* Projected Outcome Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Simulated Assurance Trajectory
                  </span>
                  {simulatedGain > 0 ? (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      +{simulatedGain}% Projected Gain
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Live Baseline</span>
                  )}
                </div>

                {/* Big Score Comparison */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '10px 0' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {simulatedScore}%
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    (Baseline: {currentProject.assuranceScore}%)
                  </span>
                </div>

                {/* Progress bar comparison */}
                <div style={{
                  height: '8px',
                  width: '100%',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  marginBottom: '14px',
                  position: 'relative'
                }}>
                  {/* Baseline fill */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${currentProject.assuranceScore}%`,
                    backgroundColor: '#1d70b8'
                  }} />
                  {/* Simulated gain fill */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${currentProject.assuranceScore}%`,
                    width: `${Math.min(100 - currentProject.assuranceScore, simulatedGain)}%`,
                    backgroundColor: '#10b981'
                  }} />
                </div>

                {/* Projected Delivery Confidence Rating */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor:
                    simulatedConfidence === 'GREEN' ? '#ecfdf5' :
                    simulatedConfidence === 'AMBER_GREEN' ? '#f0fdfa' :
                    simulatedConfidence === 'AMBER' ? '#fffbeb' : '#fef2f2',
                  border: `1px solid ${
                    simulatedConfidence === 'GREEN' ? '#a7f3d0' :
                    simulatedConfidence === 'AMBER_GREEN' ? '#99f6e4' :
                    simulatedConfidence === 'AMBER' ? '#fde68a' : '#fecaca'
                  }`,
                  marginBottom: '14px'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Projected Gateway Delivery Confidence:
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    color:
                      simulatedConfidence === 'GREEN' ? '#059669' :
                      simulatedConfidence === 'AMBER_GREEN' ? '#0d9488' :
                      simulatedConfidence === 'AMBER' ? '#d97706' : '#dc2626',
                    marginTop: '2px'
                  }}>
                    {simulatedConfidence.replace('_', ' / ')}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleApplySimulationToGatewayPack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#1d70b8',
                  border: '1px solid #1d70b8',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(29, 112, 184, 0.2)'
                }}
              >
                <ArticleIcon style={{ fontSize: '1rem', color: '#bfdbfe' }} />
                <span>Apply Simulation to Gateway Pack Dossier</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Section: Project Status Summary Visualizations (Recharts) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)',
        gap: '24px',
        marginBottom: '28px'
      }}>
        {/* Left: Recharts Donut - Project Status Breakdown */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Project Compliance Status Summary
              </h2>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d70b8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                Recharts Donut
              </span>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.78125rem', color: '#64748b' }}>
              Breakdown across verified gateway criteria (Compliant, In Progress, Flagged).
            </p>

            <div style={{ width: '100%', height: '240px', position: 'relative' }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: '#ffffff',
                              border: `1px solid ${item.color}`,
                              borderRadius: '8px',
                              padding: '10px 12px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              fontSize: '0.78125rem'
                            }}>
                              <div style={{ fontWeight: 700, color: item.color, marginBottom: '2px' }}>
                                {item.name}: {item.value} criteria ({item.percentage}%)
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                {item.description}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {React.createElement(
                      Pie as any,
                      {
                        data: statusPieData,
                        cx: '50%',
                        cy: '50%',
                        innerRadius: 60,
                        outerRadius: 85,
                        paddingAngle: 4,
                        dataKey: 'value',
                        onMouseEnter: (_: any, index: number) => setActiveDonutIndex(index),
                        onMouseLeave: () => setActiveDonutIndex(null)
                      },
                      statusPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={2}
                          style={{
                            outline: 'none',
                            transform: activeDonutIndex === index ? 'scale(1.04)' : 'scale(1)',
                            transformOrigin: 'center center',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      ))
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Center Annotation */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {currentProject.totalRequirements}
                </div>
                <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Criteria
                </div>
              </div>
            </div>
          </div>

          {/* Donut Legend Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
            marginTop: '8px'
          }}>
            {statusPieData.map(slice => (
              <div key={slice.name} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: slice.color }} />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{slice.name}</span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {slice.value} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({slice.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recharts Bar Chart - 5-Case Green Book Maturity */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Green Book 5-Case Assurance Profile
            </h2>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
              HM Treasury Standard
            </span>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.78125rem', color: '#64748b' }}>
            Compliance strength score (%) across the 5 business cases compared against the 80% passing benchmark.
          </p>

          <div style={{ width: '100%', height: '240px' }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={greenBookData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as GreenBookCaseMetric;
                        return (
                          <div style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            fontSize: '0.78125rem'
                          }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{d.caseName}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#1d70b8', fontWeight: 700 }}>
                              <span>Assurance Score:</span> <span>{d.score}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#64748b' }}>
                              <span>Benchmark Target:</span> <span>{d.benchmark}%</span>
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '0.7rem', fontWeight: 700, color: d.score >= d.benchmark ? '#166534' : '#991b1b' }}>
                              Status: {d.status}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Target 80%', fill: '#dc2626', fontSize: 10, position: 'insideTopRight' }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {greenBookData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            <span>Solid bars: Current Evaluated Score</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>Red dashed line: 80% Gateway Clearance Threshold</span>
          </div>
        </div>
      </div>

      {/* 4. Section: Key Risk Metrics (Recharts Bar/Composed & KRI Cards) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        marginBottom: '28px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WarningIcon style={{ fontSize: '1.25rem', color: '#dc2626' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Key Risk Metrics & Severity Profile
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              High-impact delivery and statutory risks evaluated against HM Treasury Green Book tolerance limits.
            </p>
          </div>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }}>
            {keyRiskMetrics.filter(r => r.severity === 'Critical' || r.severity === 'High').length} High/Critical Exposure Areas
          </span>
        </div>

        {/* Risk Metrics Visual Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)',
          gap: '24px',
          alignItems: 'center'
        }}>
          {/* Recharts Bar Chart: Risk Severity Score */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Risk Severity Score (1-10 Scale) vs Tolerance Limit
            </div>
            <div style={{ width: '100%', height: '220px' }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} width={80} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: '#ffffff',
                              border: `1px solid ${d.color}`,
                              borderRadius: '8px',
                              padding: '10px 12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              fontSize: '0.78125rem'
                            }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{d.fullName}</div>
                              <div style={{ color: d.color, fontWeight: 700, margin: '2px 0' }}>
                                Severity Score: {d.riskScore} / 10 ({d.severity})
                              </div>
                              <div style={{ color: '#64748b' }}>Cost Exposure: {d.exposureCost}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine x={5} stroke="#d97706" strokeDasharray="3 3" label={{ value: 'Tolerance Limit (5.0)', fill: '#b45309', fontSize: 10, position: 'top' }} />
                    <Bar dataKey="riskScore" radius={[0, 4, 4, 0]}>
                      {riskChartData.map((entry, index) => (
                        <Cell key={`cell-risk-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* KRI Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {keyRiskMetrics.map((risk, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: risk.severity === 'Critical' ? '#fff5f5' : risk.severity === 'High' ? '#fffaf0' : '#f8fafc',
                  border: `1px solid ${risk.severity === 'Critical' ? '#fecaca' : risk.severity === 'High' ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      backgroundColor:
                        risk.severity === 'Critical' ? '#dc2626' :
                        risk.severity === 'High' ? '#ea580c' :
                        risk.severity === 'Medium' ? '#d97706' : '#059669',
                      color: '#ffffff'
                    }}>
                      {risk.severity} ({risk.riskScore})
                    </span>
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{risk.category}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                    {risk.mitigationStatus}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Financial Exposure</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#b91c1c' }}>{risk.exposureCost}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Section: Recent Audit Activity & Velocity Timeline (Recharts AreaChart + Activity Log) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)'
      }}>
        {/* Header & Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HistoryIcon style={{ fontSize: '1.25rem', color: '#1d70b8' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Recent Audit Activity & Velocity
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Chronological feed of evidence submissions, risk flags, and verification sign-offs across this project.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>Filter:</span>
            {[
              { id: 'ALL', label: 'All Logs' },
              { id: 'STATUS', label: 'Transitions' },
              { id: 'RISK', label: 'Risk Flags' },
              { id: 'EVIDENCE', label: 'Evidence Uploads' },
              { id: 'SIGNOFF', label: 'Sign-Offs' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActivityTypeFilter(f.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.725rem',
                  fontWeight: activityTypeFilter === f.id ? 700 : 500,
                  backgroundColor: activityTypeFilter === f.id ? '#0f172a' : '#f8fafc',
                  color: activityTypeFilter === f.id ? '#ffffff' : '#475569',
                  border: `1px solid ${activityTypeFilter === f.id ? '#0f172a' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart: Audit Velocity Progression */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <VelocityIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
              Audit Verification Velocity (6-Week Timeline)
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Submissions, transitions, and flagged items recorded
            </span>
          </div>

          <div style={{ width: '100%', height: '200px' }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={auditVelocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEvidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            fontSize: '0.78125rem'
                          }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>{label}</div>
                            <div style={{ color: '#10b981', fontWeight: 600 }}>• Compliant Transitions: {payload[0]?.value}</div>
                            <div style={{ color: '#3b82f6', fontWeight: 600 }}>• Evidence Submissions: {payload[1]?.value}</div>
                            <div style={{ color: '#ef4444', fontWeight: 600 }}>• Risk Flags: {payload[2]?.value}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="compliantTransitions" name="Compliant Transitions" stroke="#10b981" fillOpacity={1} fill="url(#colorCompliant)" />
                  <Area type="monotone" dataKey="evidenceSubmissions" name="Evidence Submissions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEvidence)" />
                  <Area type="monotone" dataKey="riskFlags" name="Risk Flags" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity Logs Stream Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAuditLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No recent audit activity matching the selected filter.
            </div>
          ) : (
            filteredAuditLogs.slice(0, 6).map((log, index) => {
              const isFlag = log.type === 'risk_flag';
              const isTransition = log.type === 'status_transition';
              const isEvidence = log.type === 'evidence_upload';

              return (
                <div
                  key={log.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor:
                        isFlag ? '#fef2f2' :
                        isTransition ? '#ecfdf5' :
                        isEvidence ? '#eff6ff' : '#f1f5f9',
                      color:
                        isFlag ? '#dc2626' :
                        isTransition ? '#059669' :
                        isEvidence ? '#1d70b8' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {isFlag ? <WarningIcon style={{ fontSize: '1.1rem' }} /> :
                       isTransition ? <CheckCircleIcon style={{ fontSize: '1.1rem' }} /> :
                       <HistoryIcon style={{ fontSize: '1.1rem' }} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          backgroundColor:
                            isFlag ? '#fee2e2' :
                            isTransition ? '#dcfce7' : '#e0f2fe',
                          color:
                            isFlag ? '#991b1b' :
                            isTransition ? '#166534' : '#0369a1'
                        }}>
                          {log.type.replace('_', ' ').toUpperCase()}
                        </span>

                        {log.requirementCode && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: '#1d70b8',
                            backgroundColor: '#eff6ff',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {log.requirementCode}
                          </span>
                        )}

                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{log.title}</strong>
                      </div>

                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                        {log.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>Logged by: <strong>{log.actorName || log.user}</strong> ({log.actorRole || log.userRole})</span>
                        <span>·</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <Link href={`/compliance-tracker?code=${log.requirementCode || ''}`} passHref legacyBehavior>
                    <a
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        color: '#1d70b8',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#eff6ff',
                        flexShrink: 0
                      }}
                      title="Inspect requirement in compliance tracker"
                    >
                      <span>Inspect</span>
                      <OpenInNewIcon style={{ fontSize: '0.8rem' }} />
                    </a>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
        </>
      )}

      {/* Tab Content 2: Review Findings & Evidence Evaluation */}
      {activeTab === 'findings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Findings Severity KPI Scorecards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            <div
              onClick={() => setFindingSeverityFilter(findingSeverityFilter === 'Critical' ? 'ALL' : 'Critical')}
              style={{
                backgroundColor: '#ffffff',
                border: findingSeverityFilter === 'Critical' ? '2px solid #dc2626' : '1px solid #fecaca',
                borderRadius: '10px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: findingSeverityFilter === 'Critical' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Critical Severity
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>
                {findingSeverityCounts.Critical}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Statutory blockers or critical gateway criteria gaps
              </p>
            </div>

            <div
              onClick={() => setFindingSeverityFilter(findingSeverityFilter === 'High' ? 'ALL' : 'High')}
              style={{
                backgroundColor: '#ffffff',
                border: findingSeverityFilter === 'High' ? '2px solid #ea580c' : '1px solid #fed7aa',
                borderRadius: '10px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: findingSeverityFilter === 'High' ? '0 4px 12px rgba(234, 88, 12, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  High Severity
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ea580c' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c2410c', lineHeight: 1 }}>
                {findingSeverityCounts.High}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Significant risk exposures requiring formal mitigation
              </p>
            </div>

            <div
              onClick={() => setFindingSeverityFilter(findingSeverityFilter === 'Medium' ? 'ALL' : 'Medium')}
              style={{
                backgroundColor: '#ffffff',
                border: findingSeverityFilter === 'Medium' ? '2px solid #d97706' : '1px solid #fde68a',
                borderRadius: '10px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: findingSeverityFilter === 'Medium' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Medium Severity
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>
                {findingSeverityCounts.Medium}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Standard gateway criteria under active review
              </p>
            </div>

            <div
              onClick={() => setFindingSeverityFilter(findingSeverityFilter === 'Low' ? 'ALL' : 'Low')}
              style={{
                backgroundColor: '#ffffff',
                border: findingSeverityFilter === 'Low' ? '2px solid #059669' : '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: findingSeverityFilter === 'Low' ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Low / Verified
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>
                {findingSeverityCounts.Low}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Verified criteria meeting or exceeding standards
              </p>
            </div>
          </div>

          {/* Findings Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 18px',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              flex: '1 1 260px'
            }}>
              <SearchIcon style={{ fontSize: '1.1rem', color: '#94a3b8' }} />
              <input
                type="text"
                value={findingSearchQuery}
                onChange={(e) => setFindingSearchQuery(e.target.value)}
                placeholder="Search findings, criteria question, or document citations..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  width: '100%',
                  fontSize: '0.8125rem',
                  color: '#0f172a'
                }}
              />
              {findingSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFindingSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                >
                  <CloseIcon style={{ fontSize: '0.9rem', color: '#94a3b8' }} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <select
                value={findingCategoryFilter}
                onChange={(e) => setFindingCategoryFilter(e.target.value)}
                aria-label="Filter findings by category"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.78125rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Categories</option>
                {findingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Status Filter */}
              <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                {(['ALL', 'Positive', 'Negative', 'Neutral'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFindingStatusFilter(st)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRight: '1px solid #cbd5e1',
                      backgroundColor: findingStatusFilter === st ? '#1d70b8' : '#ffffff',
                      color: findingStatusFilter === st ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {st === 'ALL' ? 'All Status' : st === 'Positive' ? 'Compliant' : st === 'Negative' ? 'Flagged' : 'In Progress'}
                  </button>
                ))}
              </div>

              {/* Reset button if filtered */}
              {(findingSearchQuery || findingSeverityFilter !== 'ALL' || findingStatusFilter !== 'ALL' || findingCategoryFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setFindingSearchQuery('');
                    setFindingSeverityFilter('ALL');
                    setFindingStatusFilter('ALL');
                    setFindingCategoryFilter('ALL');
                  }}
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: '#64748b' }}>
              Showing {filteredProjectFindings.length} of {projectFindings.length}
            </span>
          </div>

          {/* Findings Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredProjectFindings.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <FindingsIcon style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '8px' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  No Review Findings Match Filters
                </h3>
                <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                  Try resetting your severity, status, or search filters to view project criteria findings.
                </p>
              </div>
            ) : (
              filteredProjectFindings.map((finding) => {
                const config = SEVERITY_CONFIGS[finding.Severity] || SEVERITY_CONFIGS.Medium;
                const isRated = ratingsMap[finding.id];

                return (
                  <div
                    key={finding.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '18px 22px',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: '1 1 540px' }}>
                        {/* Badges strip */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: config.badgeBg,
                              border: `1px solid ${config.badgeBorder}`,
                              color: config.badgeText,
                              fontSize: '0.725rem',
                              fontWeight: 700
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: config.dotColor }} />
                            {config.label}
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor:
                                finding.Status === 'Positive' ? '#ecfdf5' :
                                finding.Status === 'Negative' ? '#fef2f2' : '#fffbeb',
                              border: `1px solid ${
                                finding.Status === 'Positive' ? '#a7f3d0' :
                                finding.Status === 'Negative' ? '#fecaca' : '#fde68a'
                              }`,
                              color:
                                finding.Status === 'Positive' ? '#047857' :
                                finding.Status === 'Negative' ? '#b91c1c' : '#b45309',
                              fontSize: '0.725rem',
                              fontWeight: 700
                            }}
                          >
                            {finding.Status === 'Positive' ? 'Compliant' : finding.Status === 'Negative' ? 'Flagged Deficit' : 'In Progress'}
                          </span>

                          <span style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {finding.Category}
                          </span>

                          <span style={{
                            fontSize: '0.725rem',
                            color: '#64748b'
                          }}>
                            {finding.Gate}
                          </span>
                        </div>

                        {/* Criterion Question Title */}
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.4
                        }}>
                          {finding.Criterion.question}
                        </h4>

                        {/* Justification & Evidence Narrative */}
                        <p style={{
                          margin: '0 0 12px 0',
                          fontSize: '0.84375rem',
                          color: '#334155',
                          lineHeight: 1.5,
                          backgroundColor: '#f8fafc',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${config.dotColor}`
                        }}>
                          {finding.Justification}
                        </p>

                        {/* Evidence Threshold & Document Sources */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                          <div>
                            <strong>Evidence Threshold:</strong> {finding.Evidence}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <DocumentIcon style={{ fontSize: '0.9rem', color: '#64748b' }} />
                            <span>Sources:</span>
                            {finding.Sources.map((source, sIdx) => (
                              <Link key={sIdx} href={`/file-viewer?citation=${source.chunk_id}`} passHref legacyBehavior>
                                <a
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#eff6ff',
                                    color: '#1d70b8',
                                    textDecoration: 'none',
                                    fontFamily: 'monospace',
                                    fontWeight: 600
                                  }}
                                  title="Jump to cited source document in Document Dossier"
                                >
                                  {source.fileName}
                                </a>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFindingForDrawer(finding);
                            setIsFindingDrawerOpen(true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: '#1d70b8',
                            border: '1px solid #1d70b8',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '0.78125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(29, 112, 184, 0.2)'
                          }}
                        >
                          <RateReviewIcon style={{ fontSize: '0.95rem' }} />
                          <span>Remediation Roadmap</span>
                        </button>

                        {/* Rating Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFindingForDrawer(finding);
                              handleRateFinding(true);
                            }}
                            title="Rate AI justification as accurate and grounded"
                            style={{
                              border: '1px solid #cbd5e1',
                              backgroundColor: isRated === true ? '#ecfdf5' : '#ffffff',
                              color: isRated === true ? '#059669' : '#64748b',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              cursor: 'pointer'
                            }}
                          >
                            <ThumbUpIcon style={{ fontSize: '0.85rem' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFindingForDrawer(finding);
                              handleRateFinding(false);
                            }}
                            title="Flag AI justification as inaccurate"
                            style={{
                              border: '1px solid #cbd5e1',
                              backgroundColor: isRated === false ? '#fef2f2' : '#ffffff',
                              color: isRated === false ? '#dc2626' : '#64748b',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              cursor: 'pointer'
                            }}
                          >
                            <ThumbDownIcon style={{ fontSize: '0.85rem' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Interactive Compliance Checklist */}
      {activeTab === 'checklist' && (
        <div style={{ marginTop: '4px' }}>
          <ComplianceTracker
            projectName={currentProject.name}
            currentGate={currentProject.currentGate}
          />
        </div>
      )}

      {/* Tab Content 4: Corporate Entity Standing Verification */}
      {activeTab === 'entity' && (
        <div style={{ marginTop: '4px' }}>
          <ComplianceOfficerWidget
            projectName={currentProject.name}
            reviewType={currentProject.currentGate}
          />
        </div>
      )}

      {/* Expandable Finding Detail & Remediation Drawer */}
      <FindingExpandableDetailView
        finding={selectedFindingForDrawer}
        isOpen={isFindingDrawerOpen}
        onClose={() => setIsFindingDrawerOpen(false)}
        onNavigatePrev={handleDrawerNavigatePrev}
        onNavigateNext={handleDrawerNavigateNext}
        currentIndex={currentFindingDrawerIndex}
        totalCount={filteredProjectFindings.length}
        onRateResponse={handleRateFinding}
        onCitationClick={(chunkId) => router.push(`/file-viewer?citation=${chunkId}`)}
      />

      {/* Gateway Assurance Pack Generator Modal */}
      {isGatewayPackModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            maxWidth: '720px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            padding: '28px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d70b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  HM Treasury & IPA Gateway Protocol
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  Generate Gateway Assurance Pack (PDF)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGatewayPackModalOpen(false)}
                style={{
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <CloseIcon style={{ fontSize: '1.1rem' }} />
              </button>
            </div>

            {/* Project Summary Capsule */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{currentProject.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {currentProject.code} • {currentProject.gateLabel || currentProject.currentGate} • SRO: {currentProject.sro}
                </div>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#1d70b8',
                fontWeight: 700,
                fontSize: '0.8125rem'
              }}>
                {currentProject.assuranceScore}% Assurance Score
              </span>
            </div>

            {/* Section 1: Gateway Delivery Confidence Assessment */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Gateway Delivery Confidence Rating:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'GREEN', label: 'GREEN', desc: 'Highly Likely', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                  { id: 'AMBER_GREEN', label: 'AMBER / GREEN', desc: 'Probable', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
                  { id: 'AMBER', label: 'AMBER', desc: 'Feasible', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                  { id: 'AMBER_RED', label: 'AMBER / RED', desc: 'In Doubt', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
                  { id: 'RED', label: 'RED', desc: 'Unachievable', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGatewayPackConfidence(item.id as any)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: gatewayPackConfidence === item.id ? `2px solid ${item.color}` : '1px solid #cbd5e1',
                      backgroundColor: gatewayPackConfidence === item.id ? item.bg : '#ffffff',
                      color: item.color,
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: gatewayPackConfidence === item.id ? `0 2px 8px ${item.border}` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.8125rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Executive Remarks & Recommendations with AI Generation */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '6px'
              }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                  Executive Remarks & SRO Sign-off Conditions:
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiBriefing}
                  disabled={isGeneratingAiBriefing}
                  title="Generate authoritative HM Treasury SRO Determination Brief using Gemini AI"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: isGeneratingAiBriefing ? '#e2e8f0' : '#f0fdf4',
                    border: '1px solid #86efac',
                    color: isGeneratingAiBriefing ? '#64748b' : '#15803d',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: isGeneratingAiBriefing ? 'wait' : 'pointer',
                    boxShadow: '0 1px 2px rgba(16, 185, 129, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <SparklesIcon style={{ fontSize: '0.9rem', color: isGeneratingAiBriefing ? '#64748b' : '#10b981' }} />
                  <span>{isGeneratingAiBriefing ? 'Synthesizing with Gemini...' : 'AI Draft SRO Brief'}</span>
                </button>
              </div>

              <textarea
                value={gatewayPackRemarks}
                onChange={(e) => setGatewayPackRemarks(e.target.value)}
                rows={4}
                placeholder="Enter executive review remarks or generate automatically using AI..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8125rem',
                  color: '#0f172a',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              {aiBriefingNotice && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: aiBriefingNotice.includes('Notice') ? '#b91c1c' : '#15803d'
                }}>
                  {aiBriefingNotice}
                </div>
              )}
            </div>

            {/* Section 3: Sections Included in Dossier */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Assurance Dossier Sections to Compile:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeGreenBookSection}
                    onChange={(e) => setIncludeGreenBookSection(e.target.checked)}
                  />
                  <span>1. Green Book 5-Case Model Analysis</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeRisksSection}
                    onChange={(e) => setIncludeRisksSection(e.target.checked)}
                  />
                  <span>2. Key Risk Exposure & Tolerance Matrix</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeFindingsSection}
                    onChange={(e) => setIncludeFindingsSection(e.target.checked)}
                  />
                  <span>3. Audit Findings & Evidence Log</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeDeadlinesSection}
                    onChange={(e) => setIncludeDeadlinesSection(e.target.checked)}
                  />
                  <span>4. Statutory Milestone Timeline</span>
                </label>
              </div>
            </div>

            {/* Status Notice */}
            {packExportNotice && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: packExportNotice.includes('Notice') ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${packExportNotice.includes('Notice') ? '#fecaca' : '#a7f3d0'}`,
                color: packExportNotice.includes('Notice') ? '#b91c1c' : '#047857',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                {packExportNotice}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsGatewayPackModalOpen(false)}
                disabled={isExportingGatewayPack}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleGenerateGatewayPack}
                disabled={isExportingGatewayPack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: '1px solid #1d70b8',
                  backgroundColor: '#1d70b8',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: isExportingGatewayPack ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(29, 112, 184, 0.25)'
                }}
              >
                <ArticleIcon style={{ fontSize: '1.1rem' }} />
                <span>{isExportingGatewayPack ? 'Generating Gateway Pack...' : 'Generate & Download Gateway Pack (PDF)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
