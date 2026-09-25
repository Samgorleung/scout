import React, { useEffect, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Modal, Box, Typography, IconButton } from '@mui/material';
import {
  Close as CloseIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

import { fetchItems, fetchRelatedItems, rateResponse } from '@/utils/api';
import MagnifyingGlassLoader from '../components/Loader';

interface Rating {
  id: string;
  project: Project;
  result: Result;
  positive_rating: boolean;
  created_datetime: Date;
  updated_datetime: Date | null;
}

interface Criterion {
  id: string;
  category: string;
  created_datetime: Date;
  evidence: string;
  gate: string;
  question: string;
  updated_datetime: Date | null;
}

interface Chunk {
  id: string;
  idx: string;
  page_num: number;
  text: string;
  created_datetime: Date;
  updated_datetime: Date | null;
}

interface Project {
  id: string;
  created_datetime: Date;
  updated_datetime: Date | null;
  name: string;
  results_summary: string | null;
}

interface Result {
  answer: string;
  created_datetime: Date;
  updated_datetime: Date | null;
  criterion: Criterion;
  chunks: Chunk[];
  project: Project;
  ratings: Rating[];
  full_text: string;
  id: string;
}

interface Source {
  chunk_id: string;
  fileName: string;
}

interface TransformedResult {
  Criterion: Criterion;
  Chunks: Chunk[];
  Project: Project;
  Ratings: Rating[];
  Evidence: string;
  Category: string;
  Gate: string;
  Status: string;
  Justification: string;
  Sources: Source[];
  id: string;
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 680,
  maxHeight: '90vh',
  overflowY: 'auto',
  bgcolor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  border: '1px solid #e2e8f0',
  p: 3.5,
  outline: 'none',
};

const ResultsTable: React.FC = () => {
  const [results, setResults] = useState<TransformedResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TransformedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [thumbsUpColour, setThumbsUpColour] = useState({ color: '#94a3b8' });
  const [thumbsDownColour, setThumbsDownColour] = useState({ color: '#94a3b8' });
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchItems('result');

        const transformedResults: TransformedResult[] = await Promise.all(
          data.map(async (result: Result) => {
            const sources: Source[] = await Promise.all(
              (result.chunks || []).map(async (chunk: any) => {
                try {
                  const source = await fetchItems('chunk', chunk.id);
                  return {
                    chunk_id: source?.id || 'Unknown ID',
                    fileName: source?.file?.name || 'Unknown filename',
                  };
                } catch (error) {
                  console.warn('Notice fetching chunk source:', error);
                  return {
                    chunk_id: 'Unknown ID',
                    fileName: 'Unknown filename',
                  };
                }
              })
            );

            return {
              Criterion: result.criterion,
              Chunks: result.chunks,
              Project: result.project,
              Ratings: result.ratings,
              Evidence: result.criterion.evidence,
              Category: result.criterion.category,
              Gate: result.criterion.gate,
              Status: result.answer,
              Justification: result.full_text,
              Sources: sources,
              id: result.id,
            };
          })
        );

        setResults(transformedResults);
      } catch (error) {
        console.warn('Notice fetching results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCitationClick = useCallback(
    (chunk_id: string) => {
      router.push(`/file-viewer?citation=${chunk_id}`);
    },
    [router]
  );

  const sourcesFormatter = (params: ICellRendererParams) => {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {params.value.map((source: Source, index: number) => (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              handleCitationClick(source.chunk_id);
            }}
            style={{
              cursor: 'pointer',
              color: '#1d70b8',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.725rem',
              fontWeight: 600,
              maxWidth: '160px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={source.fileName}
          >
            {source.fileName}
          </span>
        ))}
      </div>
    );
  };

  const statusRenderer = (params: ICellRendererParams) => {
    const status = params.value;
    switch (status) {
      case 'Positive':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', color: '#059669', fontWeight: 600, fontSize: '0.8rem' }}>
            <CheckCircleIcon style={{ fontSize: '1rem', color: '#10b981' }} />
            <span>Positive</span>
          </div>
        );
      case 'Neutral':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', color: '#d97706', fontWeight: 600, fontSize: '0.8rem' }}>
            <HelpIcon style={{ fontSize: '1rem', color: '#f59e0b' }} />
            <span>Neutral</span>
          </div>
        );
      case 'Negative':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', color: '#dc2626', fontWeight: 600, fontSize: '0.8rem' }}>
            <ErrorIcon style={{ fontSize: '1rem', color: '#ef4444' }} />
            <span>Negative</span>
          </div>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const criterionRenderer = (params: ICellRendererParams) => {
    return (
      <div style={{ padding: '4px 0' }}>
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', lineHeight: 1.4 }}>
          {params.value.question}
        </div>
      </div>
    );
  };

  const columnDefs: ColDef[] = [
    {
      headerName: 'Assurance Criterion',
      field: 'Criterion',
      wrapText: true,
      autoHeight: true,
      flex: 5,
      cellRenderer: criterionRenderer,
      cellStyle: { textAlign: 'left' },
      headerClass: 'center-header',
    },
    {
      headerName: 'Category',
      field: 'Category',
      wrapText: true,
      autoHeight: true,
      flex: 1.5,
      cellStyle: { textAlign: 'center', fontSize: '0.8125rem', fontWeight: 500 },
      headerClass: 'center-header',
    },
    {
      headerName: 'Status',
      field: 'Status',
      wrapText: true,
      autoHeight: true,
      flex: 1.2,
      cellRenderer: statusRenderer,
      cellStyle: { textAlign: 'center' },
      headerClass: 'center-header',
    },
    {
      headerName: 'Document Evidence Sources',
      field: 'Sources',
      wrapText: true,
      autoHeight: true,
      flex: 3,
      cellRenderer: sourcesFormatter,
      cellStyle: { textAlign: 'center' },
      headerClass: 'center-header',
    },
  ];

  const onRowClicked = async (row: any) => {
    setThumbsUpColour({ color: '#94a3b8' });
    setThumbsDownColour({ color: '#94a3b8' });
    setSelectedRow(row.data);
    const data = await fetchRelatedItems(row.data.id, 'result', 'rating', true);
    const ratings: Rating[] = await Promise.all(
      data.map(async (result: Rating) => {
        return {
          created_datetime: result.created_datetime,
          project: result.project,
          updated_datetime: result.updated_datetime,
          id: result.id,
          result: result.result,
          positive_rating: result.positive_rating,
        };
      })
    );
    if (ratings.length > 0) {
      const sorted_ratings = ratings.sort(function (a, b): any {
        return (
          (b.updated_datetime ? b.updated_datetime.getTime() : b.created_datetime.getTime()) -
          (a.updated_datetime ? a.updated_datetime?.getTime() : a.created_datetime.getTime())
        );
      });
      const latest_rating = sorted_ratings[sorted_ratings.length - 1];
      if (latest_rating.positive_rating) {
        setThumbsUpColour({ color: '#10b981' });
        setThumbsDownColour({ color: '#94a3b8' });
      } else {
        setThumbsUpColour({ color: '#94a3b8' });
        setThumbsDownColour({ color: '#ef4444' });
      }
    }

    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRow(null);
  };

  const formatEvidence = (evidence: string) => {
    return evidence.split('_').map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && '• '}
        {item}
        {index > 0 && <br />}
      </React.Fragment>
    ));
  };

  const handleRating = async (goodResponse: boolean) => {
    if (!selectedRow) return;

    try {
      await rateResponse({
        result_id: selectedRow.id,
        good_response: goodResponse,
      });
      if (goodResponse) {
        setThumbsDownColour({ color: '#94a3b8' });
        setThumbsUpColour({ color: '#10b981' });
      } else {
        setThumbsUpColour({ color: '#94a3b8' });
        setThumbsDownColour({ color: '#ef4444' });
      }
    } catch (error) {
      console.error('Error rating response:', error);
    }
  };

  const positiveCount = results.filter((r) => r.Status === 'Positive').length;
  const negativeCount = results.filter((r) => r.Status === 'Negative').length;
  const neutralCount = results.filter((r) => r.Status === 'Neutral').length;

  if (!isMounted || isLoading) {
    return <MagnifyingGlassLoader />;
  }

  return (
    <>
      <Head>
        <title>Review Findings & Criteria | IPA Scout</title>
        <meta
          name="description"
          content="Detailed analysis of document corpus against HM Treasury and IPA Gateway assurance criteria."
        />
      </Head>

      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Breadcrumb & Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8125rem',
          color: '#64748b',
          marginBottom: '12px'
        }}>
          <Link href="/" prefetch={false} passHref legacyBehavior>
            <a style={{ color: '#64748b', textDecoration: 'none' }}>Overview</a>
          </Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Review Findings & Criteria Analysis</span>
        </div>

        {/* Header Strip & Metric Badges */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Gateway Findings & Question Evaluation
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, maxWidth: '750px' }}>
                Select any row to inspect AI analysis justification, evidence excerpts, and cited document references.
              </p>
            </div>

            {/* Metric Capsules */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                padding: '6px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Total</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{results.length}</span>
              </div>

              <div style={{
                padding: '6px 14px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Positive</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#047857' }}>{positiveCount}</span>
              </div>

              <div style={{
                padding: '6px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Negative</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#b91c1c' }}>{negativeCount}</span>
              </div>

              <div style={{
                padding: '6px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Neutral</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309' }}>{neutralCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* High Density AgGrid Surface */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '4px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
          marginBottom: '40px'
        }}>
          <div className="ag-theme-alpine" style={{ height: '620px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <AgGridReact
              rowData={results}
              columnDefs={columnDefs}
              defaultColDef={{
                wrapText: true,
                autoHeight: true,
                sortable: true,
                filter: true,
              }}
              rowHeight={56}
              onRowClicked={onRowClicked}
            />
          </div>
        </div>

        {/* Detailed Findings Inspection Modal */}
        <Modal open={open} onClose={handleClose}>
          <Box sx={modalStyle}>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                color: '#64748b',
                '&:hover': { color: '#0f172a', bgcolor: '#f1f5f9' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            {selectedRow && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: selectedRow.Status === 'Positive' ? '#dcfce7' : selectedRow.Status === 'Negative' ? '#fee2e2' : '#fef3c7',
                    color: selectedRow.Status === 'Positive' ? '#166534' : selectedRow.Status === 'Negative' ? '#991b1b' : '#92400e',
                  }}>
                    {selectedRow.Status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>·</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{selectedRow.Category}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>·</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedRow.Gate}</span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  {selectedRow.Criterion.question}
                </h3>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Evidence Considered in Dossier
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {formatEvidence(selectedRow.Evidence)}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Assurance Justification & Analytical Finding
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6 }}>
                    {selectedRow.Justification}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Referenced Document Citations
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedRow.Sources.map((source: Source) => (
                      <span
                        key={source.chunk_id}
                        onClick={() => handleCitationClick(source.chunk_id)}
                        style={{
                          cursor: 'pointer',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: '#eff6ff',
                          color: '#1d70b8',
                          border: '1px solid #bfdbfe',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        📄 {source.fileName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Feedback rating */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '14px',
                  marginTop: '16px'
                }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Was this assurance finding accurate?</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <IconButton onClick={() => handleRating(true)} aria-label="Accurate finding">
                      <ThumbUpIcon style={thumbsUpColour} fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleRating(false)} aria-label="Inaccurate finding">
                      <ThumbDownIcon style={thumbsDownColour} fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              </div>
            )}
          </Box>
        </Modal>
      </div>
    </>
  );
};

export default ResultsTable;
