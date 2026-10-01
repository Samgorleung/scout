import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Close as CloseIcon,
  HelpOutline as HelpIcon,
  MenuBook as BookIcon,
  AccountTree as WorkflowIcon,
  Dashboard as DashboardIcon,
  FactCheck as FindingsIcon,
  Description as DocumentIcon,
  CheckCircle as CheckCircleIcon,
  Article as ArticleIcon,
  Speed as SpeedIcon,
  Gavel as GavelIcon,
  ArrowForward as ArrowForwardIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Layers as LayersIcon
} from '@mui/icons-material';

export interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'workflow' | 'pillars' | 'greenbook' | 'artifacts' | 'tips';
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'workflow'
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'workflow' | 'pillars' | 'greenbook' | 'artifacts' | 'tips'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '880px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden'
        }}
      >
        {/* Header Strip */}
        <div
          style={{
            backgroundColor: '#1e3a8a',
            backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #1d70b8 100%)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookIcon style={{ fontSize: '1.4rem', color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                HM Treasury & IPA Assurance Standard
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                IPA Scout User Guide & Assurance Playbook
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close user guide"
            style={{
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'background-color 0.15s ease'
            }}
          >
            <CloseIcon style={{ fontSize: '1.2rem' }} />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '4px 16px',
            gap: '6px',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'workflow', label: '1. Assurance Workflow', icon: WorkflowIcon },
            { id: 'pillars', label: '2. The 4 Core Pillars', icon: LayersIcon },
            { id: 'greenbook', label: '3. Green Book & Gateways', icon: GavelIcon },
            { id: 'artifacts', label: '4. Official Gateway Pack', icon: ArticleIcon },
            { id: 'tips', label: '5. Pro Tips & Shortcuts', icon: SpeedIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #1d70b8' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  color: isActive ? '#1d70b8' : '#64748b',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon style={{ fontSize: '1rem' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {/* Tab 1: 4-Step Assurance Workflow */}
          {activeTab === 'workflow' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  End-to-End Major Project Assurance Lifecycle
                </h3>
                <p style={{ margin: 0, fontSize: '0.84375rem', color: '#475569', lineHeight: 1.5 }}>
                  IPA Scout systematically audits major UK government infrastructure projects across the Government Major Projects Portfolio (GMPP) against HM Treasury Green Book requirements and statutory compliance criteria.
                </p>
              </div>

              {/* 4-Step Visual Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    1
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <DocumentIcon style={{ fontSize: '1.2rem', color: '#1d70b8' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Document Dossier</span>
                  </div>
                  <p style={{ fontSize: '0.78125rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Ingest project submissions, environmental assessments, and business case PDFs. Inspect chunk citations and page canvas overlays.
                  </p>
                  <button
                    type="button"
                    onClick={() => { onClose(); router.push('/file-viewer'); }}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#1d70b8',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    Open Document Dossier →
                  </button>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    2
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FindingsIcon style={{ fontSize: '1.2rem', color: '#1d70b8' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Review Findings</span>
                  </div>
                  <p style={{ fontSize: '0.78125rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Evaluate automated criteria findings categorized by severity (Critical, High, Medium, Low). Review AI justifications and remediation roadmaps.
                  </p>
                  <button
                    type="button"
                    onClick={() => { onClose(); router.push('/results'); }}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#1d70b8',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    Open Review Findings →
                  </button>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    3
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <GavelIcon style={{ fontSize: '1.2rem', color: '#1d70b8' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Project Assurance</span>
                  </div>
                  <p style={{ fontSize: '0.78125rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Deep-dive into a single project. Test prospective mitigation levers with the interactive <strong>What-If Gateway Simulator</strong>, inspect 5-Case Green Book scores vs. 80% benchmark, and export official dossiers.
                  </p>
                  <button
                    type="button"
                    onClick={() => { onClose(); router.push('/project-dashboard'); }}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#1d70b8',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    Open Project Console →
                  </button>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    4
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <DashboardIcon style={{ fontSize: '1.2rem', color: '#1d70b8' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Portfolio Governance</span>
                  </div>
                  <p style={{ fontSize: '0.78125rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Monitor cross-portfolio GMPP indices, run side-by-side <strong>Cross-Project Peer Benchmarking</strong> on 5-case Green Book dimensions, and track statutory milestones.
                  </p>
                  <button
                    type="button"
                    onClick={() => { onClose(); router.push('/'); }}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#1d70b8',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    Open Portfolio Hub →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: The 4 Core Pillars */}
          {activeTab === 'pillars' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                borderLeft: '4px solid #1d70b8',
                paddingLeft: '14px'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  1. Portfolio Hub (<code style={{ color: '#1d70b8' }}>/</code>)
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  The executive macro-level view of all active major infrastructure projects. Shows the Overall Portfolio Assurance Index, statutory review status distributions, next upcoming deadlines countdown, and the searchable GMPP projects table with quick-view modals.
                </p>
              </div>

              <div style={{
                borderLeft: '4px solid #0d9488',
                paddingLeft: '14px'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  2. Project Assurance Console (<code style={{ color: '#0d9488' }}>/project-dashboard</code>)
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  The unified workbench for single-project assurance. Features 4 interactive tabs:
                  <br />• <strong>Assurance Overview:</strong> Green Book 5-Case radar, criteria donut, and risk exposure bar charts.
                  <br />• <strong>Review Findings:</strong> Specific project findings with severity scorecards and remediation roadmaps.
                  <br />• <strong>Compliance Checklist:</strong> Real-time statutory criteria tracking with evidence thresholds and reviewer sign-offs.
                  <br />• <strong>Entity Verification:</strong> Companies House corporate standing and director verification.
                </p>
              </div>

              <div style={{
                borderLeft: '4px solid #d97706',
                paddingLeft: '14px'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  3. Review Findings (<code style={{ color: '#d97706' }}>/results</code>)
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  Corpus-wide evidence review workspace with interactive Severity Donut chart filtering, AI justification feedback (thumbs up/down), search and CSV export, and drawer-based remediation roadmaps.
                </p>
              </div>

              <div style={{
                borderLeft: '4px solid #8b5cf6',
                paddingLeft: '14px'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  4. Document Dossier (<code style={{ color: '#8b5cf6' }}>/file-viewer</code>)
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  PDF inspection canvas and evidence repository. Allows auditors to upload new project documentation bundles, inspect extracted text chunks, and verify exact highlighted citations.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Green Book & Gateways */}
          {activeTab === 'greenbook' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  HM Treasury Green Book 5-Case Model Dimensions
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                  Every project is evaluated across 5 core dimensions against the statutory <strong>80% passing benchmark</strong>:
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#1d70b8', fontSize: '0.8125rem' }}>1. Strategic Case</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Alignment with national policy objectives, public benefit, and strategic fit.
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#1d70b8', fontSize: '0.8125rem' }}>2. Economic Case</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Value for money (VfM), social benefit-cost ratio (BCR), and public welfare.
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#1d70b8', fontSize: '0.8125rem' }}>3. Commercial Case</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Procurement strategy, market capability, contract structures, and risk allocation.
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#1d70b8', fontSize: '0.8125rem' }}>4. Financial Case</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Capital affordability, funding envelope, cashflow forecasting, and contingency.
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#1d70b8', fontSize: '0.8125rem' }}>5. Management Case</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Governance, SRO leadership, risk management, milestone schedules, and benefits realization.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '6px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Gateway Delivery Confidence Ratings (DCA)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#059669' }}>GREEN</div>
                    <div style={{ fontSize: '0.6875rem', color: '#065f46' }}>Delivery highly likely.</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#0d9488' }}>AMBER / GREEN</div>
                    <div style={{ fontSize: '0.6875rem', color: '#115e59' }}>Probable with active control.</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#d97706' }}>AMBER</div>
                    <div style={{ fontSize: '0.6875rem', color: '#92400e' }}>Feasible; prompt attention.</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#ea580c' }}>AMBER / RED</div>
                    <div style={{ fontSize: '0.6875rem', color: '#9a3412' }}>Delivery in serious doubt.</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#dc2626' }}>RED</div>
                    <div style={{ fontSize: '0.6875rem', color: '#991b1b' }}>Urgent action required.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Official Gateway Pack */}
          {activeTab === 'artifacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Generating Official Gateway Assurance Packs & Reports
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  Auditors can generate authoritative, publication-grade PDF dossiers formatted strictly to UK Cabinet Office and HM Treasury reporting standards.
                </p>
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <ArticleIcon style={{ color: '#1d70b8', fontSize: '1.3rem' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    How to Export a Project Gateway Assurance Pack:
                  </span>
                </div>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem', color: '#334155', lineHeight: 1.6 }}>
                  <li>Navigate to <strong>Project Assurance</strong> (<code style={{ color: '#1d70b8' }}>/project-dashboard</code>).</li>
                  <li>Select your target infrastructure project from the header dropdown.</li>
                  <li>Click the blue <strong>&quot;Gateway Assurance Pack&quot;</strong> button in the top action bar.</li>
                  <li>In the generator modal, select the determined <strong>Delivery Confidence Rating</strong> (Green to Red).</li>
                  <li>Click <strong>&quot;Auto-Draft SRO Brief (Gemini AI)&quot;</strong> to synthesize an authoritative HM Treasury determination narrative tailored to 5-case Green Book scores, or enter custom remarks.</li>
                  <li>Click <strong>Generate & Download Gateway Pack (PDF)</strong>.</li>
                </ol>
              </div>

              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <CheckCircleIcon style={{ color: '#1d70b8', fontSize: '1.2rem', marginTop: '2px' }} />
                <div style={{ fontSize: '0.8125rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                  <strong>Portfolio-Wide Summary:</strong> You can also generate a macro portfolio compliance summary PDF covering all GMPP projects from the button on the <strong>Portfolio Hub</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Pro Tips & Shortcuts */}
          {activeTab === 'tips' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Pro Tips & Productivity Features
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <SearchIcon style={{ color: '#1d70b8', fontSize: '1.2rem' }} />
                  <div>
                    <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>Global Header Search:</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Use the top search bar to instantly query projects, criteria questions, document citations, or risk categories from anywhere in the app.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <DocumentIcon style={{ color: '#1d70b8', fontSize: '1.2rem' }} />
                  <div>
                    <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>One-Click Citation Jumping:</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Click any document tag (e.g. <code>DOC-A428-ENV-01.pdf</code>) in the findings table to automatically open that exact chunk in the Document Dossier.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <SpeedIcon style={{ color: '#1d70b8', fontSize: '1.2rem' }} />
                  <div>
                    <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>Real-Time Cloud Firestore Syncing:</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Checklist toggles, auditor comments, and new requirement submissions are automatically synchronized to Google Cloud Firestore in real time.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Strip */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            HM Treasury Green Book & IPA Gateway Review Standard
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#1d70b8',
              border: '1px solid #1d70b8',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(29, 112, 184, 0.2)'
            }}
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
