"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Description as DocumentIcon,
  Assignment as CriterionIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckIcon,
  HelpOutline as HelpIcon,
  ArrowForward as ArrowIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { fetchItems } from '@/utils/api';
import { SeverityLevel } from './SeverityFilterDropdown';

export interface AuditFindingSearchItem {
  id: string;
  criterionQuestion: string;
  criterionCategory: string;
  criterionGate: string;
  criterionEvidence: string;
  status: string; // 'Positive' | 'Negative' | 'Neutral' | 'Compliant' | 'Flagged' | 'In Progress'
  severity: SeverityLevel;
  justification: string;
  sources: Array<{
    chunk_id: string;
    fileName: string;
  }>;
}

const FALLBACK_SEARCHABLE_FINDINGS: AuditFindingSearchItem[] = [
  {
    id: 'r2222222-4444-4444-4444-444444444444',
    criterionQuestion: 'Has funding been secured and is it sufficient to cover the project scope?',
    criterionCategory: 'Financial',
    criterionGate: 'GATE_2',
    criterionEvidence: 'Confirmation of funding sources._Budget sufficiency analysis._Documentation of financial commitments.',
    status: 'Negative',
    severity: 'Critical',
    justification: 'Although the project scope is set, there is no secured contingency funding. Risk ID 04 highlights a critical contingency deficit of £1.5m, indicating that the budget is highly vulnerable to unexpected changes and is currently insufficient to safely cover the full scope.',
    sources: [
      { chunk_id: 'k2222222-3333-3333-3333-333333333333', fileName: 'A428_Outline_Business_Case_Financial_Case.pdf' },
      { chunk_id: 'k2222222-3333-3333-3333-333333333334', fileName: 'Treasury_Approval_Minutes_Q2_2026.pdf' }
    ]
  },
  {
    id: 'r4444444-4444-4444-4444-444444444444',
    criterionQuestion: 'Is there a comprehensive risk management plan that identifies major project risks and mitigation strategies?',
    criterionCategory: 'Risk',
    criterionGate: 'GATE_2',
    criterionEvidence: 'Risk management plan._Risk register with likelihood and impact ratings._Assigned risk owners.',
    status: 'Negative',
    severity: 'High',
    justification: 'While a risk register exists, several critical schedule risks (specifically around resource bottle-necks) do not have assigned owners or clear mitigation actions, which could delay the milestone timelines.',
    sources: [
      { chunk_id: 'k4444444-3333-3333-3333-333333333333', fileName: 'Major_Projects_Risk_Register_Q3_2026.xlsx' },
      { chunk_id: 'k4444444-3333-3333-3333-333333333334', fileName: 'Integrated_Assurance_Plan_v3.pdf' }
    ]
  },
  {
    id: 'r1111111-4444-4444-4444-444444444444',
    criterionQuestion: 'Is the delivery model and commercial strategy aligned with market capacity and supply chain resilience?',
    criterionCategory: 'Commercial',
    criterionGate: 'GATE_2',
    criterionEvidence: 'Procurement strategy._Market engagement analysis._Tier 1 supplier capability assessments.',
    status: 'Positive',
    severity: 'Low',
    justification: 'The Commercial Case robustly demonstrates early market engagement across 14 Tier 1 contractors with competitive framework pricing verified against Crown Commercial Service benchmarks.',
    sources: [
      { chunk_id: 'k1111111-3333-3333-3333-333333333333', fileName: 'Commercial_Procurement_Strategy_Signed.pdf' }
    ]
  },
  {
    id: 'r3333333-4444-4444-4444-444444444444',
    criterionQuestion: 'Has a robust Benefits Realisation Plan with accountable Senior Responsible Owner metrics been established?',
    criterionCategory: 'Strategic',
    criterionGate: 'GATE_2',
    criterionEvidence: 'Benefits realization matrix._KPI baseline tracking._Economic impact model.',
    status: 'Neutral',
    severity: 'Medium',
    justification: 'The strategic benefits register outlines decarbonisation and regional economic gain targets, but key interim benefit milestones require formal SRO sign-off before Stage 3 gateway approval.',
    sources: [
      { chunk_id: 'k3333333-3333-3333-3333-333333333333', fileName: 'Strategic_Outline_Case_Benefits_Matrix.pdf' },
      { chunk_id: 'k3333333-3333-3333-3333-333333333334', fileName: 'Environmental_Impact_Baseline_Assessment.pdf' }
    ]
  },
  {
    id: 'r5555555-4444-4444-4444-444444444444',
    criterionQuestion: 'Are statutory consents, planning permissions, and environmental mitigation commitments securely documented?',
    criterionCategory: 'Governance',
    criterionGate: 'GATE_2',
    criterionEvidence: 'Development Consent Order (DCO)._Environmental impact statement._Statutory consultee responses.',
    status: 'Positive',
    severity: 'Low',
    justification: 'All required Development Consent Order (DCO) conditions have been validated by the Planning Inspectorate with comprehensive biodiversity net gain offsets documented.',
    sources: [
      { chunk_id: 'k5555555-3333-3333-3333-333333333333', fileName: 'Development_Consent_Order_Final_Grant.pdf' }
    ]
  }
];

export interface DashboardAuditFindingsSearchProps {
  className?: string;
  placeholder?: string;
  onSelectFinding?: (finding: AuditFindingSearchItem) => void;
  style?: React.CSSProperties;
}

export const DashboardAuditFindingsSearch: React.FC<DashboardAuditFindingsSearchProps> = ({
  className = '',
  placeholder = 'Search audit findings (Criterion, Sources, Evidence)...',
  onSelectFinding,
  style = {}
}) => {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [findings, setFindings] = useState<AuditFindingSearchItem[]>(FALLBACK_SEARCHABLE_FINDINGS);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load audit findings with their Criterion and Sources
  useEffect(() => {
    let isMounted = true;
    const loadFindings = async () => {
      try {
        setIsLoading(true);
        const data = await fetchItems('result');
        if (Array.isArray(data) && data.length > 0) {
          const transformed: AuditFindingSearchItem[] = await Promise.all(
            data.map(async (r: any) => {
              const sources: Array<{ chunk_id: string; fileName: string }> = await Promise.all(
                (r.chunks || []).map(async (chunk: any) => {
                  try {
                    const source = await fetchItems('chunk', chunk.id);
                    return {
                      chunk_id: source?.id || chunk.id || 'chunk_01',
                      fileName: source?.file?.name || 'Assurance_Evidence_Dossier.pdf'
                    };
                  } catch {
                    return {
                      chunk_id: chunk.id || 'chunk_01',
                      fileName: 'Assurance_Evidence_Dossier.pdf'
                    };
                  }
                })
              );

              let sev: SeverityLevel = 'Medium';
              if (r.answer === 'Negative') {
                if (r.criterion?.category === 'Commercial' || r.criterion?.category === 'Strategic') {
                  sev = 'Critical';
                } else {
                  sev = 'High';
                }
              } else if (r.answer === 'Positive') {
                sev = 'Low';
              }

              return {
                id: r.id,
                criterionQuestion: r.criterion?.question || 'Assurance Criterion Question',
                criterionCategory: r.criterion?.category || 'General',
                criterionGate: r.criterion?.gate || 'GATE_2',
                criterionEvidence: r.criterion?.evidence || '',
                status: r.answer || 'Negative',
                severity: sev,
                justification: r.full_text || '',
                sources: sources.length > 0 ? sources : [
                  { chunk_id: 'ref_default', fileName: `${r.criterion?.category || 'Project'}_Evidence_Submission.pdf` }
                ]
              };
            })
          );
          if (isMounted && transformed.length > 0) {
            setFindings(transformed);
          }
        }
      } catch (err) {
        console.warn('Notice loading searchable findings, using enriched fallback set:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFindings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Global Keyboard Shortcut: '/' to focus dashboard search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time filtering across Criterion and Sources
  const filteredFindings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return findings
      .map(item => {
        const matchCriterion =
          item.criterionQuestion.toLowerCase().includes(q) ||
          item.criterionCategory.toLowerCase().includes(q) ||
          item.criterionEvidence.toLowerCase().includes(q) ||
          item.criterionGate.toLowerCase().includes(q) ||
          item.justification.toLowerCase().includes(q);

        const matchedSources = item.sources.filter(s =>
          s.fileName.toLowerCase().includes(q)
        );

        const isMatch = matchCriterion || matchedSources.length > 0;

        return {
          ...item,
          matchCriterion,
          matchedSources,
          isMatch
        };
      })
      .filter(item => item.isMatch);
  }, [findings, query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredFindings.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredFindings.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredFindings.length) {
        handleSelect(filteredFindings[selectedIndex]);
      } else if (query.trim()) {
        setIsOpen(false);
        router.push(`/results?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleSelect = (item: AuditFindingSearchItem) => {
    setIsOpen(false);
    if (onSelectFinding) {
      onSelectFinding(item);
    } else {
      router.push(`/results?q=${encodeURIComponent(item.criterionQuestion.slice(0, 30))}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Highlight matching keyword
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={i}
          style={{
            backgroundColor: '#fef08a',
            color: '#854d0e',
            fontWeight: 700,
            padding: '1px 3px',
            borderRadius: '2px'
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      ref={containerRef}
      className={`dashboard-audit-findings-search ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        ...style
      }}
    >
      {/* Search Input Container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: isOpen ? '1.5px solid #1d70b8' : '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(29, 112, 184, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease'
        }}
      >
        <SearchIcon
          style={{
            position: 'absolute',
            left: '12px',
            fontSize: '1.15rem',
            color: isOpen ? '#1d70b8' : '#64748b',
            pointerEvents: 'none'
          }}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search audit findings by criterion question, category, or cited source document"
          style={{
            width: '100%',
            height: '38px',
            padding: '0 76px 0 38px',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.85rem',
            color: '#0f172a',
            fontWeight: 500
          }}
        />

        {/* Right Adornments: Clear & Shortcut Badge */}
        <div
          style={{
            position: 'absolute',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#e2e8f0',
                color: '#475569',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <CloseIcon style={{ fontSize: '0.85rem' }} />
            </button>
          )}

          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '20px',
              height: '20px',
              padding: '0 5px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#64748b',
              userSelect: 'none'
            }}
          >
            /
          </kbd>
        </div>
      </div>

      {/* Real-Time Dropdown Results Popover */}
      {isOpen && query.trim() && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            zIndex: 1000,
            maxHeight: '440px',
            overflowY: 'auto',
            padding: '8px 0'
          }}
        >
          {/* Header Summary */}
          <div
            style={{
              padding: '6px 14px 8px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#64748b'
            }}
          >
            <span>
              Searching Criterion &amp; Sources for &ldquo;<strong>{query}</strong>&rdquo;
            </span>
            <span
              style={{
                backgroundColor: filteredFindings.length > 0 ? '#e0f2fe' : '#f1f5f9',
                color: filteredFindings.length > 0 ? '#0369a1' : '#64748b',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.7rem'
              }}
            >
              {filteredFindings.length} {filteredFindings.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          {/* Results List */}
          {filteredFindings.length === 0 ? (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔍</div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                No audit findings matched &quot;{query}&quot;
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem' }}>
                Try searching by criterion topic (e.g. &ldquo;funding&rdquo;, &ldquo;risk&rdquo;, &ldquo;commercial&rdquo;) or document source (e.g. &ldquo;Business_Case.pdf&rdquo;).
              </p>
            </div>
          ) : (
            <div>
              {filteredFindings.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isNeg = item.status === 'Negative' || item.status === 'Flagged';
                const isPos = item.status === 'Positive' || item.status === 'Compliant';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f8fafc' : 'transparent',
                      borderLeft: isSelected ? '3px solid #1d70b8' : '3px solid transparent',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.1s ease'
                    }}
                  >
                    {/* Top Row: Criterion Category, Gate & Status Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 6px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#334155'
                          }}
                        >
                          <CriterionIcon style={{ fontSize: '0.8rem', color: '#1d70b8' }} />
                          {item.criterionCategory}
                        </span>

                        <span
                          style={{
                            padding: '1px 6px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: '#64748b'
                          }}
                        >
                          {item.criterionGate}
                        </span>

                        {/* Severity Pill */}
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            backgroundColor:
                              item.severity === 'Critical' ? '#fef2f2' :
                              item.severity === 'High' ? '#fff7ed' :
                              item.severity === 'Medium' ? '#fffbeb' : '#f0fdf4',
                            color:
                              item.severity === 'Critical' ? '#b91c1c' :
                              item.severity === 'High' ? '#c2410c' :
                              item.severity === 'Medium' ? '#b45309' : '#15803d',
                            border: `1px solid ${
                              item.severity === 'Critical' ? '#fca5a5' :
                              item.severity === 'High' ? '#fdba74' :
                              item.severity === 'Medium' ? '#fde68a' : '#bbf7d0'
                            }`
                          }}
                        >
                          {item.severity}
                        </span>
                      </div>

                      {/* Finding Status Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          backgroundColor: isNeg ? '#fef2f2' : isPos ? '#ecfdf5' : '#fffbeb',
                          color: isNeg ? '#b91c1c' : isPos ? '#047857' : '#b45309',
                          border: `1px solid ${isNeg ? '#fca5a5' : isPos ? '#a7f3d0' : '#fde68a'}`
                        }}
                      >
                        {isNeg ? <WarningIcon style={{ fontSize: '0.75rem' }} /> :
                         isPos ? <CheckIcon style={{ fontSize: '0.75rem' }} /> :
                         <HelpIcon style={{ fontSize: '0.75rem' }} />}
                        {item.status}
                      </span>
                    </div>

                    {/* Criterion Question */}
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        lineHeight: 1.35,
                        marginBottom: '4px'
                      }}
                    >
                      {highlightMatch(item.criterionQuestion, query)}
                    </div>

                    {/* Cited Sources Matching Chip */}
                    {item.sources.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                          Sources:
                        </span>
                        {item.sources.map((s, sIdx) => {
                          const isSourceMatch = s.fileName.toLowerCase().includes(query.toLowerCase());
                          return (
                            <span
                              key={sIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 6px',
                                backgroundColor: isSourceMatch ? '#fef08a' : '#f1f5f9',
                                border: `1px solid ${isSourceMatch ? '#fde047' : '#e2e8f0'}`,
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: isSourceMatch ? '#854d0e' : '#475569',
                                fontWeight: isSourceMatch ? 700 : 500
                              }}
                            >
                              <DocumentIcon style={{ fontSize: '0.75rem' }} />
                              {highlightMatch(s.fileName, query)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Quick Action */}
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Press <strong>Enter</strong> to open or <strong>Esc</strong> to close
            </span>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(`/results?q=${encodeURIComponent(query.trim())}`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: '#1d70b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <span>View in Review Findings Table</span>
              <ArrowIcon style={{ fontSize: '0.85rem' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAuditFindingsSearch;
