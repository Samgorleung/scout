import React, { useRef, useEffect } from 'react';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  ArrowBackIosNew as PrevIcon,
  ArrowForwardIos as NextIcon,
  RestartAlt as ResetIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import { SeverityFilterDropdown, SeverityLevel } from './SeverityFilterDropdown';

export interface EvaluationSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  filteredCount: number;
  placeholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  categoryFilter?: string;
  categories?: string[];
  onCategoryFilterChange?: (category: string) => void;
  selectedSeverities?: SeverityLevel[];
  onSeveritiesChange?: (severities: SeverityLevel[]) => void;
  severityCounts?: Partial<Record<SeverityLevel, number>>;
  singleSeverity?: string;
  onSingleSeverityChange?: (severity: string) => void;
  onClearFilters?: () => void;
  onQuickNavigateNext?: () => void;
  onQuickNavigatePrev?: () => void;
  currentIndex?: number;
  onExportCsv?: () => void;
  isExporting?: boolean;
}

export const EvaluationSearchBar: React.FC<EvaluationSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  placeholder = 'Filter evaluation items by question, category, justification, or citations...',
  statusFilter = 'ALL',
  onStatusFilterChange,
  categoryFilter = 'ALL',
  categories = [],
  onCategoryFilterChange,
  selectedSeverities,
  onSeveritiesChange,
  severityCounts,
  singleSeverity,
  onSingleSeverityChange,
  onClearFilters,
  onQuickNavigateNext,
  onQuickNavigatePrev,
  currentIndex,
  onExportCsv,
  isExporting = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' or 'Cmd+K' to focus search, 'Esc' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement !== inputRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (searchQuery) {
          onSearchChange('');
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, onSearchChange]);

  const hasActiveSeverityFilter =
    Boolean(selectedSeverities && selectedSeverities.length > 0 && selectedSeverities.length < 4) ||
    Boolean(singleSeverity && singleSeverity !== 'ALL');

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    (statusFilter && statusFilter !== 'ALL') ||
    (categoryFilter && categoryFilter !== 'ALL') ||
    hasActiveSeverityFilter;

  return (
    <div
      role="search"
      aria-label="Evaluation Items Filter"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Top Search Input Row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            position: 'relative',
            flex: '1 1 360px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <SearchIcon
            style={{
              position: 'absolute',
              left: '14px',
              color: searchQuery ? '#1d70b8' : '#94a3b8',
              fontSize: '1.25rem',
              pointerEvents: 'none',
              transition: 'color 0.15s ease'
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Search evaluation items"
            style={{
              width: '100%',
              padding: '11px 40px 11px 44px',
              fontSize: '0.875rem',
              color: '#0f172a',
              backgroundColor: '#f8fafc',
              border: searchQuery ? '1px solid #1d70b8' : '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              transition: 'all 0.15s ease',
              boxShadow: searchQuery ? '0 0 0 3px rgba(29, 112, 184, 0.12)' : 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1d70b8';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29, 112, 184, 0.12)';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
            onBlur={(e) => {
              if (!searchQuery) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }
            }}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <CloseIcon style={{ fontSize: '1.1rem' }} />
            </button>
          )}
        </div>

        {/* Quick Item Stepper / Navigation controls (if supported) */}
        {(onQuickNavigateNext || onQuickNavigatePrev) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '3px 8px'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '4px', fontWeight: 600 }}>
              Navigate Matches:
            </span>
            <button
              type="button"
              onClick={onQuickNavigatePrev}
              disabled={filteredCount === 0}
              aria-label="Previous matching item"
              title="Previous item"
              style={{
                border: 'none',
                background: 'none',
                padding: '4px 6px',
                borderRadius: '4px',
                cursor: filteredCount === 0 ? 'not-allowed' : 'pointer',
                color: filteredCount === 0 ? '#cbd5e1' : '#475569',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <PrevIcon style={{ fontSize: '0.85rem' }} />
            </button>
            {typeof currentIndex === 'number' && filteredCount > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', padding: '0 4px' }}>
                {currentIndex + 1} / {filteredCount}
              </span>
            )}
            <button
              type="button"
              onClick={onQuickNavigateNext}
              disabled={filteredCount === 0}
              aria-label="Next matching item"
              title="Next item"
              style={{
                border: 'none',
                background: 'none',
                padding: '4px 6px',
                borderRadius: '4px',
                cursor: filteredCount === 0 ? 'not-allowed' : 'pointer',
                color: filteredCount === 0 ? '#cbd5e1' : '#475569',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <NextIcon style={{ fontSize: '0.85rem' }} />
            </button>
          </div>
        )}

        {/* Reset All Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            aria-label="Reset all search filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <ResetIcon style={{ fontSize: '1rem' }} />
            <span>Reset Filters</span>
          </button>
        )}

        {/* Export Current View / Filtered Results to CSV */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            disabled={filteredCount === 0 || isExporting}
            aria-label="Export evaluation items to CSV"
            title={`Export ${filteredCount} ${hasActiveFilters ? 'filtered' : ''} evaluation items to a local CSV file`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#ffffff',
              cursor: filteredCount === 0 || isExporting ? 'not-allowed' : 'pointer',
              opacity: filteredCount === 0 ? 0.5 : 1,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              if (filteredCount > 0 && !isExporting) {
                e.currentTarget.style.backgroundColor = '#1e293b';
              }
            }}
            onMouseOut={(e) => {
              if (filteredCount > 0 && !isExporting) {
                e.currentTarget.style.backgroundColor = '#0f172a';
              }
            }}
          >
            <DownloadIcon style={{ fontSize: '1rem', color: '#38bdf8' }} />
            <span>{isExporting ? 'Exporting...' : `Export CSV (${filteredCount})`}</span>
          </button>
        )}
      </div>

      {/* Filter Badges & Match Summary Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {/* Status Filter Tabs */}
        {onStatusFilterChange && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
              <FilterIcon style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginRight: '2px' }} />
              Status:
            </span>
            {[
              { id: 'ALL', label: 'All Findings' },
              { id: 'Negative', label: 'Negative / Risk' },
              { id: 'Positive', label: 'Positive / Validated' },
              { id: 'Neutral', label: 'Neutral' }
            ].map((tab) => {
              const active = statusFilter === tab.id;
              const isNegative = tab.id === 'Negative';
              const isPositive = tab.id === 'Positive';

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: active
                      ? isNegative
                        ? '#fef2f2'
                        : isPositive
                        ? '#f0fdf4'
                        : '#0f172a'
                      : '#f8fafc',
                    color: active
                      ? isNegative
                        ? '#991b1b'
                        : isPositive
                        ? '#15803d'
                        : '#ffffff'
                      : '#475569',
                    borderColor: active
                      ? isNegative
                        ? '#fecaca'
                        : isPositive
                        ? '#bbf7d0'
                        : '#0f172a'
                      : '#e2e8f0',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Category Dropdown (if categories provided) */}
        {categories.length > 0 && onCategoryFilterChange && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              aria-label="Filter by category"
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.75rem',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Severity Level Filter Dropdown */}
        {(onSeveritiesChange || onSingleSeverityChange) && (
          <SeverityFilterDropdown
            selectedSeverities={selectedSeverities}
            onSeveritiesChange={onSeveritiesChange}
            singleSeverity={singleSeverity}
            onSingleSeverityChange={onSingleSeverityChange}
            severityCounts={severityCounts}
            totalCount={totalCount}
            compact={true}
          />
        )}

        {/* Live Filter Count Indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.8rem',
              color: filteredCount === 0 ? '#dc2626' : '#64748b',
              fontWeight: 500
            }}
          >
            Showing <strong style={{ color: filteredCount === 0 ? '#dc2626' : '#0f172a' }}>{filteredCount}</strong> of{' '}
            <strong>{totalCount}</strong> items
          </span>
          {hasActiveFilters && (
            <span
              style={{
                fontSize: '0.7rem',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 700
              }}
            >
              Filtered
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationSearchBar;
