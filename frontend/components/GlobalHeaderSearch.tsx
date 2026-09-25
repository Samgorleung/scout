import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HourglassEmpty as PendingIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useSearch } from '@/context/SearchContext';
import { initialComplianceRequirements, ComplianceRequirementItem } from '@/lib/seedData';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const GlobalHeaderSearch: React.FC = () => {
  const router = useRouter();
  const {
    globalSearchQuery,
    setGlobalSearchQuery,
    clearSearch,
    searchMatchCount
  } = useSearch();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [items, setItems] = useState<ComplianceRequirementItem[]>(initialComplianceRequirements);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTrackerPage = router.pathname === '/compliance-tracker';

  // Listen for real-time compliance requirements updates to power search preview
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(collection(db, 'compliance_requirements'), (snap) => {
        if (!snap.empty) {
          const loaded: ComplianceRequirementItem[] = [];
          snap.forEach(d => loaded.push({ id: d.id, ...(d.data() as any) }));
          setItems(loaded);
        }
      }, (err) => {
        console.warn('Real-time header search fallback to seed:', err);
      });
    } catch {
      // non-fatal
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Global Keyboard shortcut: '/' or 'Cmd+K' / 'Ctrl+K' to focus header search
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
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close popup dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matching items preview
  const matchingItems = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];

    return items.filter(r => {
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchAssigned =
        (r.assignedTo && r.assignedTo.toLowerCase().includes(q)) ||
        (r.assignedToEmail && r.assignedToEmail.toLowerCase().includes(q)) ||
        (r.assignedToRole && r.assignedToRole.toLowerCase().includes(q));
      const matchCode = r.code?.toLowerCase().includes(q);
      const matchNotes = r.auditorNotes && r.auditorNotes.toLowerCase().includes(q);

      return matchTitle || matchDesc || matchAssigned || matchCode || matchNotes;
    });
  }, [items, globalSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGlobalSearchQuery(val);
    setIsOpen(true);

    // If on tracker page, URL query updates are handled smoothly by state
    if (isTrackerPage) {
      const url = new URL(window.location.href);
      if (val.trim()) {
        url.searchParams.set('q', val);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      if (!isTrackerPage) {
        router.push(`/compliance-tracker?q=${encodeURIComponent(globalSearchQuery)}`);
      }
    }
  };

  const handleSelectRequirement = (item: ComplianceRequirementItem) => {
    setIsOpen(false);
    router.push({
      pathname: '/compliance-tracker',
      query: {
        item: item.id,
        q: globalSearchQuery || item.code
      }
    });
  };

  const handleViewAllInTracker = () => {
    setIsOpen(false);
    router.push(`/compliance-tracker?q=${encodeURIComponent(globalSearchQuery)}`);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flex: '1 1 240px',
        maxWidth: '380px',
        margin: '0 16px'
      }}
    >
      {/* Search Input Box */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: isOpen
            ? '1px solid #38bdf8'
            : '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(56, 189, 248, 0.25)' : 'none'
        }}
      >
        <SearchIcon
          style={{
            position: 'absolute',
            left: '10px',
            fontSize: '1.05rem',
            color: isOpen ? '#38bdf8' : '#94a3b8',
            pointerEvents: 'none',
            transition: 'color 0.15s ease'
          }}
        />

        <input
          ref={inputRef}
          type="text"
          value={globalSearchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Global search (title, desc, assignee...)"
          aria-label="Global search compliance requirements"
          style={{
            width: '100%',
            height: '34px',
            padding: '0 68px 0 34px',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 400,
            borderRadius: '8px'
          }}
        />

        {/* Right Adornments: Match Counter or Clear Button & Shortcut Badge */}
        <div
          style={{
            position: 'absolute',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {/* Live Match Count Badge if on Tracker */}
          {globalSearchQuery.trim() && searchMatchCount !== null && isTrackerPage && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                padding: '1px 6px',
                borderRadius: '10px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              {searchMatchCount}
            </span>
          )}

          {/* Clear Button */}
          {globalSearchQuery ? (
            <button
              onClick={() => {
                clearSearch();
                inputRef.current?.focus();
              }}
              title="Clear search"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <CloseIcon style={{ fontSize: '0.75rem' }} />
            </button>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                userSelect: 'none'
              }}
              title="Press '/' to search"
            >
              /
            </span>
          )}
        </div>
      </div>

      {/* Real-Time Dropdown Results Flyout */}
      {isOpen && globalSearchQuery.trim().length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            minWidth: '420px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
            zIndex: 1100,
            overflow: 'hidden',
            maxHeight: '440px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header Strip */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#475569'
            }}
          >
            <span>
              MATCHING COMPLIANCE REQUIREMENTS ({matchingItems.length})
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
              Filter: title, desc, assignee
            </span>
          </div>

          {/* Results List */}
          <div style={{ overflowY: 'auto', maxHeight: '330px', padding: '6px' }}>
            {matchingItems.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.8125rem'
                }}
              >
                No compliance requirements match &ldquo;{globalSearchQuery}&rdquo;.
              </div>
            ) : (
              matchingItems.slice(0, 8).map(item => {
                const isCompliant = item.status === 'Compliant';
                const isFlagged = item.status === 'Flagged';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectRequirement(item)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      borderBottom: '1px solid #f8fafc'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Status Icon */}
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      {isCompliant ? (
                        <CheckCircleIcon style={{ fontSize: '1rem', color: '#10b981' }} />
                      ) : isFlagged ? (
                        <WarningIcon style={{ fontSize: '1rem', color: '#ef4444' }} />
                      ) : (
                        <PendingIcon style={{ fontSize: '1rem', color: '#f59e0b' }} />
                      )}
                    </div>

                    {/* Code & Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1d4ed8',
                            backgroundColor: '#eff6ff',
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}
                        >
                          {item.code}
                        </span>
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.title}
                        </span>
                      </div>

                      {/* Description Snippet */}
                      <p
                        style={{
                          fontSize: '0.725rem',
                          color: '#64748b',
                          margin: '3px 0 0 0',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.description}
                      </p>

                      {/* Assigned Member Badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '4px',
                          fontSize: '0.7rem',
                          color: item.assignedTo ? '#1e40af' : '#94a3b8'
                        }}
                      >
                        <PersonIcon style={{ fontSize: '0.75rem' }} />
                        <span>
                          {item.assignedTo ? (
                            <>
                              Assigned: <strong>{item.assignedTo}</strong>{' '}
                              {item.assignedToRole && `(${item.assignedToRole})`}
                            </>
                          ) : (
                            'Unassigned'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Jump Action */}
          {matchingItems.length > 0 && (
            <div
              onClick={handleViewAllInTracker}
              style={{
                padding: '9px 14px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#1d70b8',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            >
              <span>View all {matchingItems.length} matching items in Compliance Tracker</span>
              <ArrowForwardIcon style={{ fontSize: '0.85rem' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalHeaderSearch;
