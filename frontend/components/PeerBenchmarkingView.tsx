import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  activeInfrastructureProjects,
  InfrastructureProject
} from '@/lib/seedData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  CompareArrows as CompareIcon,
  Assessment as AssessmentIcon,
  WarningAmber as WarningIcon,
  AccountBalance as TreasuryIcon,
  TrendingUp as TrendingUpIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckIcon,
  Tune as TuneIcon
} from '@mui/icons-material';

export interface PeerBenchmarkingViewProps {
  initialProjectAId?: string;
  initialProjectBId?: string;
}

export const PeerBenchmarkingView: React.FC<PeerBenchmarkingViewProps> = ({
  initialProjectAId = 'proj_001',
  initialProjectBId = 'proj_002'
}) => {
  const [projectAId, setProjectAId] = useState<string>(initialProjectAId);
  const [projectBId, setProjectBId] = useState<string>(initialProjectBId);

  const projectA = useMemo(() => {
    return activeInfrastructureProjects.find(p => p.id === projectAId) || activeInfrastructureProjects[0];
  }, [projectAId]);

  const projectB = useMemo(() => {
    return activeInfrastructureProjects.find(p => p.id === projectBId) || activeInfrastructureProjects[1];
  }, [projectBId]);

  // Delivery Confidence configuration helper
  const getDCA = (score: number) => {
    if (score >= 85) return { label: 'GREEN', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
    if (score >= 75) return { label: 'AMBER / GREEN', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' };
    if (score >= 65) return { label: 'AMBER', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    if (score >= 50) return { label: 'AMBER / RED', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
    return { label: 'RED', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  };

  const dcaA = getDCA(projectA.assuranceScore);
  const dcaB = getDCA(projectB.assuranceScore);

  // Synthesize realistic Green Book 5-Case Scores based on overall assurance score
  const greenBookComparisonData = useMemo(() => {
    const calcScore = (base: number, variance: number) => Math.min(100, Math.max(30, Math.round(base + variance)));

    return [
      {
        case: 'Strategic Case',
        [projectA.code]: calcScore(projectA.assuranceScore, +3),
        [projectB.code]: calcScore(projectB.assuranceScore, +2),
        benchmark: 80
      },
      {
        case: 'Economic Case',
        [projectA.code]: calcScore(projectA.assuranceScore, -1),
        [projectB.code]: calcScore(projectB.assuranceScore, +4),
        benchmark: 80
      },
      {
        case: 'Commercial Case',
        [projectA.code]: calcScore(projectA.assuranceScore, -4),
        [projectB.code]: calcScore(projectB.assuranceScore, +1),
        benchmark: 80
      },
      {
        case: 'Financial Case',
        [projectA.code]: calcScore(projectA.assuranceScore, +1),
        [projectB.code]: calcScore(projectB.assuranceScore, -3),
        benchmark: 80
      },
      {
        case: 'Management Case',
        [projectA.code]: calcScore(projectA.assuranceScore, +2),
        [projectB.code]: calcScore(projectB.assuranceScore, +5),
        benchmark: 80
      }
    ];
  }, [projectA, projectB]);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      marginBottom: '28px'
    }}>
      {/* Header and Controls */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#1d70b8',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CompareIcon style={{ fontSize: '1.35rem' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Cross-Project Peer Benchmarking & Sector Comparison
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#eff6ff',
                color: '#1d70b8',
                fontSize: '0.725rem',
                fontWeight: 700
              }}>
                HM Treasury 5-Case Benchmark
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Evaluate infrastructure peers side-by-side across Green Book maturity, capital risk exposure, and delivery confidence.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Quick Presets:</span>
          <button
            type="button"
            onClick={() => { setProjectAId('proj_001'); setProjectBId('proj_002'); }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: projectAId === 'proj_001' && projectBId === 'proj_002' ? '#eff6ff' : '#ffffff',
              color: projectAId === 'proj_001' && projectBId === 'proj_002' ? '#1d70b8' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            A428 vs. Lower Thames
          </button>

          <button
            type="button"
            onClick={() => { setProjectAId('proj_002'); setProjectBId('proj_003'); }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: projectAId === 'proj_002' && projectBId === 'proj_003' ? '#eff6ff' : '#ffffff',
              color: projectAId === 'proj_002' && projectBId === 'proj_003' ? '#1d70b8' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            LTC vs. HS2 Phase 1
          </button>

          <button
            type="button"
            onClick={() => { setProjectAId('proj_001'); setProjectBId('proj_004'); }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: projectAId === 'proj_001' && projectBId === 'proj_004' ? '#eff6ff' : '#ffffff',
              color: projectAId === 'proj_001' && projectBId === 'proj_004' ? '#1d70b8' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Transport vs. Energy
          </button>
        </div>
      </div>

      {/* Selectors Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Project A Selector */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d70b8', textTransform: 'uppercase' }}>
              Primary Benchmark (Project A)
            </span>
            <span style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#1d70b8',
              color: '#ffffff'
            }}>
              {projectA.assuranceScore}% Score
            </span>
          </div>

          <select
            value={projectAId}
            onChange={(e) => setProjectAId(e.target.value)}
            aria-label="Select Project A for comparison"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #93c5fd',
              backgroundColor: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            {activeInfrastructureProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code} - {p.budgetFormatted})
              </option>
            ))}
          </select>
        </div>

        {/* Project B Selector */}
        <div style={{
          backgroundColor: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '10px',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase' }}>
              Comparison Peer (Project B)
            </span>
            <span style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#0d9488',
              color: '#ffffff'
            }}>
              {projectB.assuranceScore}% Score
            </span>
          </div>

          <select
            value={projectBId}
            onChange={(e) => setProjectBId(e.target.value)}
            aria-label="Select Project B for comparison"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #5eead4',
              backgroundColor: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            {activeInfrastructureProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code} - {p.budgetFormatted})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-Side Metadata Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Project A Card */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '18px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{projectA.department}</div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {projectA.name}
              </h3>
            </div>
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: dcaA.bg,
              border: `1px solid ${dcaA.border}`,
              color: dcaA.color,
              fontSize: '0.725rem',
              fontWeight: 800
            }}>
              {dcaA.label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78125rem', color: '#475569' }}>
            <div><strong>Sector:</strong> {projectA.sector}</div>
            <div><strong>Gate:</strong> {projectA.gateLabel || projectA.currentGate}</div>
            <div><strong>SRO:</strong> {projectA.sro}</div>
            <div><strong>Budget:</strong> {projectA.budgetFormatted}</div>
            <div><strong>Compliance:</strong> {projectA.compliantCount}/{projectA.totalRequirements} Verified</div>
            <div><strong>Critical Risks:</strong> <span style={{ color: projectA.criticalRisksCount > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>{projectA.criticalRisksCount} Deficits</span></div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <Link href={`/project-dashboard?projectId=${projectA.id}`} passHref legacyBehavior>
              <a style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 700,
                color: '#1d70b8',
                textDecoration: 'none'
              }}>
                <span>Open {projectA.code} in Project Assurance Console</span>
                <OpenInNewIcon style={{ fontSize: '0.85rem' }} />
              </a>
            </Link>
          </div>
        </div>

        {/* Project B Card */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '18px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{projectB.department}</div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {projectB.name}
              </h3>
            </div>
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: dcaB.bg,
              border: `1px solid ${dcaB.border}`,
              color: dcaB.color,
              fontSize: '0.725rem',
              fontWeight: 800
            }}>
              {dcaB.label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78125rem', color: '#475569' }}>
            <div><strong>Sector:</strong> {projectB.sector}</div>
            <div><strong>Gate:</strong> {projectB.gateLabel || projectB.currentGate}</div>
            <div><strong>SRO:</strong> {projectB.sro}</div>
            <div><strong>Budget:</strong> {projectB.budgetFormatted}</div>
            <div><strong>Compliance:</strong> {projectB.compliantCount}/{projectB.totalRequirements} Verified</div>
            <div><strong>Critical Risks:</strong> <span style={{ color: projectB.criticalRisksCount > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>{projectB.criticalRisksCount} Deficits</span></div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <Link href={`/project-dashboard?projectId=${projectB.id}`} passHref legacyBehavior>
              <a style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 700,
                color: '#0d9488',
                textDecoration: 'none'
              }}>
                <span>Open {projectB.code} in Project Assurance Console</span>
                <OpenInNewIcon style={{ fontSize: '0.85rem' }} />
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* Recharts Grouped Bar Chart: Green Book 5-Case Comparison */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              HM Treasury Green Book 5-Case Model Comparative Analysis
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Evaluating Strategic, Economic, Commercial, Financial, and Management Case maturity against the statutory 80% passing benchmark.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#1d70b8', borderRadius: '2px' }} />
              {projectA.code}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#0d9488', borderRadius: '2px' }} />
              {projectB.code}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={greenBookComparisonData}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="case" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
              <ReferenceLine
                y={80}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{
                  value: '80% Green Book Benchmark',
                  fill: '#dc2626',
                  fontSize: 11,
                  position: 'top'
                }}
              />
              <Bar dataKey={projectA.code} fill="#1d70b8" radius={[4, 4, 0, 0]} name={`${projectA.name} (${projectA.code})`} />
              <Bar dataKey={projectB.code} fill="#0d9488" radius={[4, 4, 0, 0]} name={`${projectB.name} (${projectB.code})`} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
