import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchItems, fetchReadItemsByAttribute, fetchFile, uploadFile } from '@/utils/api';
import { useRouter } from 'next/router';
import { PdfCanvasViewer } from '@/components/PdfCanvasViewer';

interface File {
    name: string | null;
    id: string;
    clean_name: string | null;
    url: string | null;
    storage_path?: string | null;
    summary?: string | null;
}

const FileViewer: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [selectedFile, setSelectedFile] = useState<{ dataUrl: string; fileType: string; fileName?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { citation } = router.query;
    const [citationUuid, setCitationUuid] = useState<string>("");

    useEffect(() => {
        if (citation && typeof citation === 'string') {
            setCitationUuid(citation);
        }
    }, [citation]);

    const handleFileClick = useCallback(async (file: File, pageNum?: number) => {
        setIsLoading(true);
        setSelectedFile(null);
        setError(null);
        setPageNumber(pageNum || 1);

        try {
            const { url, fileType } = await fetchFile(file.id);
            setSelectedFile({ dataUrl: url, fileType, fileName: file.clean_name || file.name || 'document' });
        } catch (error) {
            console.error('Error fetching file data:', error);
            setError('Failed to fetch file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchFiles = useCallback(async () => {
        try {
            const response = await fetchReadItemsByAttribute({
                model: 'file',
                filters: {}
            });
            setFiles(response);

            if (citationUuid) {
                const citationObj = await fetchItems('chunk', citationUuid);
                if (citationObj && citationObj.id) {
                    handleFileClick({ id: citationObj.file.id } as File, citationObj.page_num);
                }
            } else if (response.length > 0 && !selectedFile) {
                // Auto-select first file on initial load if none selected
                handleFileClick(response[0]);
            }
        } catch (error) {
            console.warn('Notice fetching files:', error);
            setError('Unable to load file list. Please check connection and try again.');
        }
    }, [citationUuid, handleFileClick, selectedFile]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleDownload = useCallback(() => {
        if (selectedFile) {
            const link = document.createElement('a');
            link.href = selectedFile.dataUrl;
            link.download = selectedFile.fileName || 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [selectedFile]);

    const handleFileUpload = async (fileObj: globalThis.File) => {
        if (!fileObj) return;
        setIsUploading(true);
        setError(null);
        setUploadSuccess(null);

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const dataUrl = reader.result as string;
                    const res = await uploadFile({
                        name: fileObj.name,
                        cleanName: fileObj.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                        fileType: fileObj.type || 'application/pdf',
                        summary: `Uploaded assurance document: ${fileObj.name}`,
                        dataUrl
                    });

                    setUploadSuccess(`Uploaded "${fileObj.name}" to Firebase Storage successfully!`);
                    await fetchFiles();
                    if (res?.file) {
                        handleFileClick(res.file);
                    }
                } catch (uploadErr: any) {
                    setError(uploadErr.message || 'Error processing file upload.');
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(fileObj);
        } catch (err: any) {
            setIsUploading(false);
            setError(err.message || 'Failed to read file.');
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
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
                <span>Overview</span>
                <span>/</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Document Evidence Dossier</span>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                        Document Evidence Dossier
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Inspect uploaded gateway evidence bundles, review citations, and view verified project documents.
                    </p>
                </div>
            </div>

            <div className="file-viewer" style={{ display: 'flex', height: 'calc(100vh - 240px)', minHeight: '620px' }}>
            <div className="file-list" style={{ flex: '0 0 340px', overflowY: 'auto', borderRight: '1px solid #e5e7eb', padding: '20px', backgroundColor: '#fafafa' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '14px', color: '#111827' }}>
                    Document Bundle
                </h2>

                {/* Firebase Storage Drag & Drop Upload Component */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: isDragging ? '2px dashed #2563eb' : '1px dashed #9ca3af',
                        backgroundColor: isDragging ? '#eff6ff' : '#ffffff',
                        padding: '16px 12px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        marginBottom: '18px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileChange}
                        accept=".pdf,.doc,.docx,.txt"
                        style={{ display: 'none' }}
                    />
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                        {isUploading ? 'Uploading to Firebase Storage...' : '+ Upload Document Bundle'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Drag & drop or click to upload PDF / DOCX
                    </div>
                </div>

                {uploadSuccess && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '14px' }}>
                        {uploadSuccess}
                    </div>
                )}

                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {files.map((file) => {
                        const isSelected = selectedFile && (file.clean_name || file.name) === selectedFile.fileName;
                        return (
                            <li key={file.id} style={{ marginBottom: '8px' }}>
                                <button
                                    onClick={() => handleFileClick(file)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: isSelected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                                        background: isSelected ? '#eff6ff' : '#ffffff',
                                        cursor: 'pointer',
                                        fontWeight: isSelected ? 600 : 500,
                                        color: isSelected ? '#1e40af' : '#374151',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '0.875rem' }}>{file.clean_name || file.name}</div>
                                    {file.summary && (
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {file.summary}
                                        </div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="document-viewer" style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f9fafb' }}>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading document...</div>
                ) : error ? (
                    <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px' }}>{error}</div>
                ) : selectedFile ? (
                    selectedFile.fileType.toLowerCase() === 'application/pdf' ? (
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{selectedFile.fileName}</span>
                                <button
                                    onClick={handleDownload}
                                    style={{
                                        padding: '6px 14px',
                                        backgroundColor: '#1f2937',
                                        color: '#ffffff',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Download Document
                                </button>
                            </div>
                            <PdfCanvasViewer
                                url={selectedFile.dataUrl}
                                initialPage={pageNumber || 1}
                            />
                        </div>
                    ) : (
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
                            <p style={{ color: '#4b5563', marginBottom: '16px' }}>This file type cannot be rendered inline in the canvas viewer.</p>
                            <button
                                onClick={handleDownload}
                                style={{
                                    padding: '8px 18px',
                                    backgroundColor: '#1f2937',
                                    color: '#ffffff',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Download File
                            </button>
                        </div>
                    )
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Select a document bundle from the list to view.</div>
                )}
            </div>
        </div>
    </div>
    );
};

export default FileViewer;
