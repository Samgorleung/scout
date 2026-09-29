"use client";

import React, { useState } from 'react';
import {
  Business as BusinessIcon,
  ShieldOutlined as ShieldIcon
} from '@mui/icons-material';
import { AiEvaluationSkeleton } from './LoadingSystem';

export interface ComplianceOfficerWidgetProps {
  projectName?: string;
  reviewType?: string;
  className?: string;
}

export const ComplianceOfficerWidget: React.FC<ComplianceOfficerWidgetProps> = ({
  projectName = 'IPA Major Infrastructure Project',
  reviewType = 'GATE_2',
  className = ''
}) => {
  const [companyNumber, setCompanyNumber] = useState<string>('01234567');
  const [deepAnalysis, setDeepAnalysis] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyNumber,
          projectName,
          reviewType,
          deepAnalysis
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg = data?.error || data?.message || `Compliance evaluation failed (HTTP ${res.status})`;
        throw new Error(errMsg);
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      setEvaluationResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`compliance-officer-widget ${className}`}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: '#eff6ff',
          color: '#1d70b8'
        }}>
          <BusinessIcon style={{ fontSize: '1.25rem' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Corporate Entity & Supplier Standing Verification
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '3px 0 0 0' }}>
            Autonomous entity standing evaluation, Companies House registration, and statutory Gateway delivery risk cross-mapping.
          </p>
        </div>
      </div>

      <form onSubmit={handleEvaluate} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div style={{ flex: '1 1 240px' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            UK Registered Company Number
          </label>
          <input
            type="text"
            value={companyNumber}
            onChange={(e) => setCompanyNumber(e.target.value)}
            placeholder="e.g. 01234567"
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Analytical Mode
          </label>
          <select
            value={deepAnalysis ? 'deep' : 'flash'}
            onChange={(e) => setDeepAnalysis(e.target.value === 'deep')}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="flash">Gemini 3.8 Flash (Standard Evaluation)</option>
            <option value="deep">Gemini 3.8 Flash (Deep Reasoning Mode)</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 22px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background-color 0.15s ease'
            }}
          >
            <ShieldIcon style={{ fontSize: '1.1rem' }} />
            {loading ? 'Evaluating Standing...' : 'Evaluate Entity Standing'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '0.875rem'
        }}>
          <strong>Verification Notice:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: '20px' }}>
          <AiEvaluationSkeleton
            prompt={`Gemini AI evaluating UK entity #${companyNumber} against HM Treasury Gateway compliance & standing criteria...`}
          />
        </div>
      )}

      {evaluationResult && (
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Corporate Compliance Profile
            </h3>
            <span style={{
              fontSize: '0.75rem',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: '#eff6ff',
              color: '#1d70b8',
              fontWeight: 600,
              border: '1px solid #bfdbfe'
            }}>
              {evaluationResult.model} · {evaluationResult.source}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Entity Name</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {evaluationResult.evaluation?.entityName || 'N/A'}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Registration Number</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
                {evaluationResult.evaluation?.registrationNumber || 'N/A'}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Jurisdiction</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {evaluationResult.evaluation?.jurisdiction || 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
              Legal Standing Status
            </div>
            <p style={{ fontSize: '0.875rem', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>
              {evaluationResult.evaluation?.legalStandingStatus}
            </p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
              Risk Profile Evaluation
            </div>
            <p style={{ fontSize: '0.875rem', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>
              {evaluationResult.evaluation?.riskProfileSummary}
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
              Analytical Assessment
            </div>
            <p style={{ fontSize: '0.875rem', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>
              {evaluationResult.evaluation?.analyticalEvaluation}
            </p>
          </div>

          {evaluationResult.evaluation?.crossMappingFindings && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                Compliance Cross-Mapping Findings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {evaluationResult.evaluation.crossMappingFindings.map((finding: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor:
                        finding.status === 'Positive' ? '#f0fdf4' : finding.status === 'Negative' ? '#fef2f2' : '#fffbeb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                        Category: {finding.category}
                      </span>
                      <span style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          finding.status === 'Positive' ? '#dcfce7' : finding.status === 'Negative' ? '#fee2e2' : '#fef3c7',
                        color:
                          finding.status === 'Positive' ? '#166534' : finding.status === 'Negative' ? '#991b1b' : '#92400e'
                      }}>
                        {finding.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                      {finding.question}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.5 }}>
                      {finding.analyticalJustification}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplianceOfficerWidget;
