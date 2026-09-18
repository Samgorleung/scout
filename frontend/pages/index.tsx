"use client"; // This is a client component

import React, { useEffect, useState, useContext } from 'react';
import PieChart from '../components/PieChart';
import { getGateUrl } from '../utils/getGateUrl';
import { fetchUser, fetchReadItemsByAttribute, fetchItems } from '../utils/api'

interface Result {
    answer: string;
    created_datetime: string;
    criterion: Criterion;
    full_text: string;
    id: string;
}

interface Criterion {
    id: string;
    question: string;
    evidence: string;
    category: string;
    gate: string;
}

const Summary: React.FC = () => {
    const [chartData, setChartData] = useState<number[]>([]);
    const [chartLabels, setChartLabels] = useState<string[]>([]);
    const [summaryText, setSummaryText] = useState<string>('');
    const [gateUrl, setGateUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<{ [key: string]: number }>({});
    const [projectDetails, setProjectDetails] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Fetching results...');
                const results = await fetchReadItemsByAttribute({
                    model: 'result',
                    filters: { answer: 'Negative' }
                });
                console.log('Negative results fetched:', results);

                const fetchCriteria = async (result: Result) => {
                    return await fetchItems('criterion', result.criterion.id);
                };

                const criteria = await Promise.all(results.map(fetchCriteria));
                const fetchedCategories = criteria.map(criterion => criterion.category);
                console.log('Criterion fetched:', fetchedCategories);

                const categoryCount: { [key: string]: number } = {};
                fetchedCategories.forEach(category => {
                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                });

                setChartLabels(Object.keys(categoryCount));
                setChartData(Object.values(categoryCount));
                setCategories(categoryCount);

                console.log('Chart labels:', Object.keys(categoryCount));
                console.log('Chart data:', Object.values(categoryCount));

                // Fetching the project details
                console.log('Fetching project details...');
                const projectData = await fetchItems('project');

                console.log('Project details fetched:', projectData);

                if (projectData.length > 0) {
                    setProjectDetails(projectData[0]);
                    setSummaryText(projectData[0].results_summary);
                    const url = await getGateUrl(projectData[0].review_type || 'GATE_2');
                    setGateUrl(url);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    if (!projectDetails) {
        return <div className="summary-card">Loading...</div>;
    }

    return (
        <div>
            <div>
                <br />
                <div className="summary-card" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', marginTop: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <h2>Welcome to <strong>Scout!</strong></h2>
                        <div>
                            {gateUrl && (
                                <>
                                    <p style={{ marginBottom: '8px' }}>
                                        This AI tool helps you navigate your document set before your review. Please check the details below are correct before continuing:
                                    </p>
                                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                        <li><strong>Review Type:</strong> {projectDetails.review_type}</li>
                                        <li><strong>Project Name:</strong> {projectDetails.name}</li>
                                    </ul>
                                    <p style={{ marginTop: '8px' }}>
                                        This tool has preprocessed your documents and analysed them against the questions in the{' '}
                                        <a href={gateUrl} target="_blank" rel="noopener noreferrer">
                                            {projectDetails.review_type} workbook
                                        </a>.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="summary-card" style={{ display: 'flex', alignItems: 'top', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <h2>Review Summary</h2>
                    <p>{summaryText}</p>
                </div>
                <div className="chart-container" style={{ flex: 1 }}>
                    <PieChart data={chartData} labels={chartLabels} />
                </div>
            </div>
            {Object.keys(categories).map(category => (
                <div className="summary-card" key={category} style={{ marginBottom: '20px' }}>
                    <h2>{category}</h2>
                    <p>{`Number of negative results: ${categories[category]}`}</p>
                </div>
            ))}

            <ComplianceOfficerWidget projectName={projectDetails?.name} reviewType={projectDetails?.review_type} />
        </div>
    );
};

const ComplianceOfficerWidget: React.FC<{ projectName?: string; reviewType?: string }> = ({ projectName, reviewType }) => {
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
            if (!res.ok) {
                throw new Error('Compliance evaluation failed');
            }
            const data = await res.json();
            setEvaluationResult(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred during verification.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="summary-card" style={{ marginTop: '30px', marginBottom: '40px', padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Cross-Border Corporate Compliance Evaluation
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '4px' }}>
                    Verification of entity legal standing, corporate registration, and Gateway risk cross-mapping powered by Gemini AI.
                </p>
            </div>

            <form onSubmit={handleEvaluate} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div style={{ flex: '1 1 240px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        UK Company Number
                    </label>
                    <input
                        type="text"
                        value={companyNumber}
                        onChange={(e) => setCompanyNumber(e.target.value)}
                        placeholder="e.g. 01234567"
                        required
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        Model Engine
                    </label>
                    <select
                        value={deepAnalysis ? 'deep' : 'flash'}
                        onChange={(e) => setDeepAnalysis(e.target.value === 'deep')}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#fff' }}
                    >
                        <option value="flash">Gemini 3.6 Flash (Fast Evaluation)</option>
                        <option value="deep">Gemini 3.1 Pro (Deep Compliance Analysis)</option>
                    </select>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '9px 20px',
                            backgroundColor: '#1f2937',
                            color: '#ffffff',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Evaluating Standing...' : 'Evaluate Entity Standing'}
                    </button>
                </div>
            </form>

            {error && (
                <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {evaluationResult && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                            Compliance Analytical Profile
                        </h3>
                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 500 }}>
                            Engine: {evaluationResult.model} ({evaluationResult.source})
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Entity Name</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{evaluationResult.evaluation?.entityName}</div>
                        </div>
                        <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Registration Number</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{evaluationResult.evaluation?.registrationNumber}</div>
                        </div>
                        <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Jurisdiction</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{evaluationResult.evaluation?.jurisdiction}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Legal Standing Status</h4>
                        <p style={{ fontSize: '0.9rem', color: '#1f2937', margin: 0, lineHeight: 1.5 }}>{evaluationResult.evaluation?.legalStandingStatus}</p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Risk Profile Evaluation</h4>
                        <p style={{ fontSize: '0.9rem', color: '#1f2937', margin: 0, lineHeight: 1.5 }}>{evaluationResult.evaluation?.riskProfileSummary}</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Analytical Assessment</h4>
                        <p style={{ fontSize: '0.9rem', color: '#1f2937', margin: 0, lineHeight: 1.5 }}>{evaluationResult.evaluation?.analyticalEvaluation}</p>
                    </div>

                    {evaluationResult.evaluation?.crossMappingFindings && (
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Compliance Cross-Mapping Findings</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {evaluationResult.evaluation.crossMappingFindings.map((finding: any, idx: number) => (
                                    <div key={idx} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: finding.status === 'Positive' ? '#f0fdf4' : finding.status === 'Negative' ? '#fef2f2' : '#fffbe0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>Category: {finding.category}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: finding.status === 'Positive' ? '#dcfce7' : finding.status === 'Negative' ? '#fee2e2' : '#fef08a', color: finding.status === 'Positive' ? '#166534' : finding.status === 'Negative' ? '#991b1b' : '#854d0e' }}>
                                                {finding.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', marginBottom: '4px' }}>{finding.question}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.4 }}>{finding.analyticalJustification}</div>
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

export default Summary;
