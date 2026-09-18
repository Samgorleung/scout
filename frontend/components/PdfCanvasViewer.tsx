import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up worker src for pdfjs-dist
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfCanvasViewerProps {
    url: string;
    initialPage?: number;
    fileName?: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
    url,
    initialPage = 1,
    fileName = 'document.pdf'
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(initialPage);
    const [scale, setScale] = useState<number>(1.2);
    const [loading, setLoading] = useState<boolean>(true);
    const [renderError, setRenderError] = useState<string | null>(null);
    const pdfDocRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setRenderError(null);

        const loadPdf = async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to load PDF from ${url}`);
                }
                const buffer = await response.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
                const pdf = await loadingTask.promise;

                if (!isMounted) return;

                pdfDocRef.current = pdf;
                setNumPages(pdf.numPages);
                setCurrentPage(Math.min(initialPage || 1, pdf.numPages));
                setLoading(false);
            } catch (err: any) {
                console.error('PDF loading error:', err);
                if (isMounted) {
                    setRenderError(err.message || 'Error loading PDF document.');
                    setLoading(false);
                }
            }
        };

        loadPdf();

        return () => {
            isMounted = false;
        };
    }, [url, initialPage]);

    useEffect(() => {
        if (!pdfDocRef.current || loading) return;

        let isRendered = true;

        const renderPage = async () => {
            try {
                const page = await pdfDocRef.current.getPage(currentPage);
                if (!isRendered || !canvasRef.current) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
            } catch (err: any) {
                console.error('Error rendering page:', err);
            }
        };

        renderPage();

        return () => {
            isRendered = false;
        };
    }, [currentPage, scale, loading]);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < numPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
    const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));

    const handleOpenNewTab = () => {
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563' }}>
                <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 500 }}>Rendering Document...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (renderError) {
        return (
            <div style={{ padding: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', margin: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Unable to render PDF inline</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem' }}>{renderError}</p>
                <button
                    onClick={handleOpenNewTab}
                    style={{ padding: '8px 16px', backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                >
                    Open PDF in New Window
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage <= 1}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: currentPage <= 1 ? '#f3f4f6' : '#ffffff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                    >
                        ← Prev
                    </button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                        Page {currentPage} of {numPages}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage >= numPages}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: currentPage >= numPages ? '#f3f4f6' : '#ffffff', cursor: currentPage >= numPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                    >
                        Next →
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={handleZoomOut}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        title="Zoom Out"
                    >
                        −
                    </button>
                    <span style={{ fontSize: '0.85rem', color: '#4b5563', width: '48px', textAlign: 'center' }}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        title="Zoom In"
                    >
                        +
                    </button>

                    <button
                        onClick={handleOpenNewTab}
                        style={{ marginLeft: '12px', padding: '6px 14px', borderRadius: '4px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                    >
                        Open in New Window ↗
                    </button>
                </div>
            </div>

            {/* Canvas Page Container */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px' }}>
                <div style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <canvas ref={canvasRef} />
                </div>
            </div>
        </div>
    );
};
