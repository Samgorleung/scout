import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HourglassEmpty as PendingIcon,
  Block as BlockIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  FileDownload as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AssignmentTurnedIn as VerifiedIcon,
  BookmarkBorder as DocIcon,
  EditNote as NoteIcon,
  Save as SaveIcon,
  DeleteOutline as DeleteIcon,
  Refresh as RefreshIcon,
  CloudDone as CloudDoneIcon,
  CloudSync as CloudSyncIcon,
  CloudOff as CloudOffIcon,
  AccountCircle as UserIcon,
  Person as PersonIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  RestartAlt as ResetIcon,
  Timeline as TimelineIcon,
  ChatBubbleOutline as CommentIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  IndeterminateCheckBox as IndeterminateCheckBoxIcon,
  AssignmentInd as AssignIcon,
  Group as GroupIcon,
  ArrowDropDown as DropdownArrowIcon,
  DynamicFeed as ActivityFeedIcon,
  TableChart as TableChartIcon,
  PieChart as PieChartIcon,
  CalendarToday as CalendarIcon,
  WarningAmber as WarningAmberIcon,
  Alarm as AlarmIcon,
  EventBusy as EventBusyIcon,
  EditCalendar as EditCalendarIcon
} from '@mui/icons-material';
import { exportComplianceAuditPdf } from '@/utils/exportCompliancePdf';
import { exportComplianceRequirementsCsv } from '@/utils/exportComplianceCsv';
import ComplianceStatusPieChart from './ComplianceStatusPieChart';
import {
  getDeadlineInfo,
  getPresetDueDate,
  formatFriendlyDate,
  DeadlineInfo
} from '@/utils/deadlineUtils';
import { db, bulkUpdateComplianceRequirements, logAuditActivity } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import {
  initialComplianceRequirements,
  ComplianceRequirementItem,
  ComplianceStatusTransition,
  synthesizeItemTransitions,
  USER_ID,
  initialComplianceComments,
  defaultTeamMembers,
  TeamMember,
  AuditActivity
} from '@/lib/seedData';
import { ComplianceTransitionTimeline } from './ComplianceTransitionTimeline';
import { ComplianceItemComments } from './ComplianceItemComments';
import { GlobalActivityFeed } from './GlobalActivityFeed';
import { useSearch } from '@/context/SearchContext';

interface ComplianceTrackerProps {
  projectName?: string;
  currentGate?: string;
  compact?: boolean;
  initialView?: 'checklist' | 'timeline' | 'activity';
  initialItemId?: string;
}

interface AuditorUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const ComplianceTracker: React.FC<ComplianceTrackerProps> = ({
  projectName = 'IPA Infrastructure Audit',
  currentGate = 'GATE_2',
  compact = false,
  initialView = 'checklist',
  initialItemId
}) => {
  const [requirements, setRequirements] = useState<ComplianceRequirementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);

  // Active auditor user session
  const [currentUser, setCurrentUser] = useState<AuditorUser>({
    id: USER_ID || 'usr-reviewer-01',
    name: 'Assurance Lead',
    email: 'samgorleung1224@gmail.com',
    role: 'Lead Assurance Reviewer'
  });
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userEditName, setUserEditName] = useState<string>('Assurance Lead');
  const [userEditEmail, setUserEditEmail] = useState<string>('samgorleung1224@gmail.com');
  const [userEditRole, setUserEditRole] = useState<string>('Lead Assurance Reviewer');

  // Persistent Global Search Context
  const {
    globalSearchQuery,
    setGlobalSearchQuery,
    clearSearch: clearGlobalSearch,
    setSearchMatchCount
  } = useSearch();

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>(globalSearchQuery || '');
  const [selectedGate, setSelectedGate] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedDeadlineFilter, setSelectedDeadlineFilter] = useState<'ALL' | 'URGENT' | 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED' | 'NO_DEADLINE'>('ALL');
  const [onlyMyChecked, setOnlyMyChecked] = useState<boolean>(false);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState<boolean>(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronize global header search query with in-page tracker search
  useEffect(() => {
    setSearchQuery(globalSearchQuery);
  }, [globalSearchQuery]);

  const handleSearchInputChange = useCallback((val: string) => {
    setSearchQuery(val);
    setGlobalSearchQuery(val);
  }, [setGlobalSearchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    clearGlobalSearch();
  }, [clearGlobalSearch]);

  // Multi-item selection & bulk operations state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkStatusDropdownOpen, setIsBulkStatusDropdownOpen] = useState<boolean>(false);
  const [isBulkAssignDropdownOpen, setIsBulkAssignDropdownOpen] = useState<boolean>(false);
  const [isBulkDateDropdownOpen, setIsBulkDateDropdownOpen] = useState<boolean>(false);
  const [bulkDueDateInput, setBulkDueDateInput] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [bulkNotification, setBulkNotification] = useState<string | null>(null);
  const [quickAssignItemId, setQuickAssignItemId] = useState<string | null>(null);
  const [quickDateItemId, setQuickDateItemId] = useState<string | null>(null);

  // Global keyboard shortcut ('/' to focus search bar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Expanded items state
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Editing notes state per item
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingItemIds, setSavingItemIds] = useState<Record<string, boolean>>({});

  // Debounce mechanism state & refs for automatic Firestore saving
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingNotesRef = useRef<Record<string, string>>({});
  const progressDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  interface AutoSaveInfo {
    status: 'idle' | 'debouncing' | 'saving' | 'saved' | 'error';
    lastSavedAt?: string;
  }
  const [itemAutoSaveStates, setItemAutoSaveStates] = useState<Record<string, AutoSaveInfo>>({});
  const [progressSyncState, setProgressSyncState] = useState<'synced' | 'debouncing' | 'saving'>('synced');
  const [lastGlobalAutoSave, setLastGlobalAutoSave] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalScope, setExportModalScope] = useState<'current' | 'selected' | 'all'>('current');
  const [exportNotification, setExportNotification] = useState<string | null>(null);
  const [showStatusPieChart, setShowStatusPieChart] = useState<boolean>(true);

  // Status Transition Timeline view and drawer state
  const [activeView, setActiveView] = useState<'checklist' | 'timeline' | 'activity'>(initialView);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<ComplianceRequirementItem | null>(null);
  const [isTimelineDrawerOpen, setIsTimelineDrawerOpen] = useState<boolean>(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState<boolean>(false);

  // Threaded Discussion Comments drawer state & count cache
  const initialCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    initialComplianceComments.forEach(c => {
      counts[c.requirementId] = (counts[c.requirementId] || 0) + 1;
    });
    return counts;
  }, []);
  const [itemCommentCounts, setItemCommentCounts] = useState<Record<string, number>>(initialCountsMap);
  const [selectedCommentsItem, setSelectedCommentsItem] = useState<ComplianceRequirementItem | null>(null);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState<boolean>(false);

  // Real-time listener for comment counts across requirements
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(collection(db, 'compliance_comments'), (snapshot) => {
        if (!snapshot.empty) {
          const counts: Record<string, number> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.requirementId) {
              counts[data.requirementId] = (counts[data.requirementId] || 0) + 1;
            }
          });
          setItemCommentCounts(prev => ({ ...prev, ...counts }));
        }
      }, (err) => {
        console.warn('Comments count listener fallback to seed counts:', err);
      });
    } catch (e) {
      console.warn('Unable to subscribe to compliance_comments counts:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Select initial item if initialItemId provided
  useEffect(() => {
    if (initialItemId && requirements.length > 0) {
      const match = requirements.find(r => r.id === initialItemId || r.code.toLowerCase() === initialItemId.toLowerCase());
      if (match) {
        setSelectedTimelineItem(match);
      }
    }
  }, [initialItemId, requirements]);

  // Add custom requirement modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newReqForm, setNewReqForm] = useState({
    code: '',
    title: '',
    description: '',
    gate: currentGate,
    category: 'Financial',
    priority: 'High' as 'Critical' | 'High' | 'Medium' | 'Low',
    dueDate: '',
    evidenceThreshold: '',
    documentRef: '',
    auditorNotes: '',
    auditorName: 'Assurance Lead'
  });

  // Fallback REST fetch if Firestore real-time channel has an issue
  const fetchFallback = async () => {
    try {
      const res = await fetch('/api/compliance_requirements');
      if (res.ok) {
        const data: ComplianceRequirementItem[] = await res.json();
        setRequirements(data);
        const drafts: Record<string, string> = {};
        data.forEach(item => {
          drafts[item.id] = item.auditorNotes || '';
        });
        setNotesDrafts(drafts);
      }
    } catch (e) {
      console.warn('Fallback fetch failed:', e);
    }
  };

  // Direct Firestore Real-Time Subscription & Initialization
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const setupFirestoreSync = async () => {
      setLoading(true);
      setError(null);

      // Attempt to load current user from API
      try {
        const userRes = await fetch('/api/user');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData?.response) {
            const user = userData.response;
            setCurrentUser({
              id: user.id || USER_ID,
              name: user.name || 'Assurance Reviewer',
              email: user.email || 'samgorleung1224@gmail.com',
              role: user.role || 'Lead Assurance Reviewer'
            });
            setUserEditName(user.name || 'Assurance Reviewer');
            setUserEditEmail(user.email || 'samgorleung1224@gmail.com');
          }
        }
      } catch (err) {
        console.warn('Could not retrieve remote user profile, using active auditor session.');
      }

      try {
        // Check if compliance_requirements collection exists in Firestore
        const colRef = collection(db, 'compliance_requirements');
        const initialSnap = await getDocs(colRef);

        if (initialSnap.empty) {
          console.log('[Firestore] Seeding compliance requirements directly into Firestore...');
          for (const req of initialComplianceRequirements) {
            await setDoc(doc(db, 'compliance_requirements', req.id), req);
          }
        }

        // Setup real-time Firestore onSnapshot listener
        unsubscribe = onSnapshot(
          colRef,
          (snapshot) => {
            if (!isMounted) return;
            const items: ComplianceRequirementItem[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });

            // Sort deterministically by code
            items.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

            setRequirements(items);
            setFirestoreConnected(true);
            setLoading(false);

            // Populate notes drafts
            setNotesDrafts((prev) => {
              const updated = { ...prev };
              items.forEach((item) => {
                if (updated[item.id] === undefined) {
                  updated[item.id] = item.auditorNotes || '';
                }
              });
              return updated;
            });
          },
          (err) => {
            console.error('[Firestore onSnapshot error]:', err);
            setFirestoreConnected(false);
            setError('Firestore listener encountered an issue, running in REST fallback mode.');
            fetchFallback();
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error('[Firestore connection failed]:', err);
        setFirestoreConnected(false);
        fetchFallback();
        setLoading(false);
      }
    };

    setupFirestoreSync();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Update Auditor Identity
  const handleUpdateAuditor = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser(prev => ({
      ...prev,
      name: userEditName.trim() || 'Assurance Auditor',
      email: userEditEmail.trim() || 'reviewer@ipa.gov.uk',
      role: userEditRole.trim() || 'Assurance Reviewer'
    }));
    setIsUserModalOpen(false);
  };

  // Toggle Check-Off Status & Persist Directly to Cloud Firestore
  const handleToggleCheck = async (item: ComplianceRequirementItem) => {
    const nextChecked = !item.isChecked;
    const nextStatus = nextChecked ? 'Compliant' : 'In Progress';
    const nextAuditedAt = nextChecked ? new Date().toISOString() : item.auditedAt;
    const checkedBy = nextChecked ? (currentUser.email || currentUser.name) : (item.checkedBy || null);
    const checkedByUserId = nextChecked ? currentUser.id : (item.checkedByUserId || null);
    const auditorName = nextChecked ? currentUser.name : (item.auditorName || currentUser.name);

    // Optimistic UI state
    setRequirements(prev =>
      prev.map(r =>
        r.id === item.id
          ? {
              ...r,
              isChecked: nextChecked,
              status: nextStatus,
              auditedAt: nextAuditedAt,
              checkedBy: checkedBy || undefined,
              checkedByUserId: checkedByUserId || undefined,
              auditorName
            }
          : r
      )
    );

    setSyncStatus('saving');
    try {
      // 1. Direct Firestore write
      const docRef = doc(db, 'compliance_requirements', item.id);
      await updateDoc(docRef, {
        isChecked: nextChecked,
        status: nextStatus,
        auditedAt: nextAuditedAt,
        checkedBy,
        checkedByUserId,
        auditorName,
        updated_datetime: new Date().toISOString()
      });

      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (firestoreErr) {
      console.warn('[Firestore direct update error, invoking API fallback]:', firestoreErr);
      try {
        const res = await fetch('/api/compliance_requirements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            isChecked: nextChecked,
            status: nextStatus,
            auditedAt: nextAuditedAt,
            checkedBy,
            checkedByUserId,
            auditorName
          })
        });
        if (!res.ok) throw new Error('API route failed to persist status');
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (err) {
        console.error('All persistence methods failed:', err);
        setSyncStatus('error');
        fetchFallback();
      }
    }
  };

  // Change Status Directly & Persist to Firestore with Status Transition History
  const handleChangeStatus = async (
    item: ComplianceRequirementItem,
    status: 'Compliant' | 'In Progress' | 'Flagged' | 'N/A',
    customNotes?: string,
    triggerType: ComplianceStatusTransition['triggerType'] = 'Formal Review',
    evidenceRef?: string
  ) => {
    const isChecked = status === 'Compliant';
    const auditedAt = isChecked ? new Date().toISOString() : item.auditedAt;
    const checkedBy = isChecked ? (currentUser.email || currentUser.name) : item.checkedBy;
    const checkedByUserId = isChecked ? currentUser.id : item.checkedByUserId;

    // Create new status transition event
    const newTransition: ComplianceStatusTransition = {
      id: `trans_${item.id}_${Date.now()}`,
      requirementId: item.id,
      requirementCode: item.code,
      fromStatus: item.status,
      toStatus: status,
      timestamp: new Date().toISOString(),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actorEmail: currentUser.email,
      notes: customNotes || `Status updated from ${item.status} to ${status} by ${currentUser.name}.`,
      triggerType: triggerType || (status === 'Compliant' ? 'Auditor Sign-off' : status === 'Flagged' ? 'Risk Escalation' : 'Formal Review'),
      evidenceRef: evidenceRef || item.documentRef,
      gate: item.gate
    };

    const existingTransitions = item.statusTransitions || synthesizeItemTransitions(item);
    const updatedTransitions = [newTransition, ...existingTransitions];

    const updatedItem: ComplianceRequirementItem = {
      ...item,
      status,
      isChecked,
      auditedAt,
      checkedBy,
      checkedByUserId,
      statusTransitions: updatedTransitions,
      updated_datetime: new Date().toISOString()
    };

    setRequirements(prev =>
      prev.map(r => (r.id === item.id ? updatedItem : r))
    );

    // Keep selected timeline item synced
    setSelectedTimelineItem(prev => (prev && prev.id === item.id ? updatedItem : prev));

    // Log to Global Activity Feed
    try {
      await logAuditActivity({
        id: `act_trans_${item.id}_${Date.now()}`,
        type: 'status_transition',
        title: `${item.code} Status Transition: ${item.status} ➔ ${status}`,
        description: `${item.title}: Status transitioned from "${item.status}" to "${status}" under ${item.gate}.`,
        requirementId: item.id,
        requirementCode: item.code,
        requirementTitle: item.title,
        fromStatus: item.status,
        toStatus: status,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        timestamp: new Date().toISOString(),
        gate: item.gate,
        notes: customNotes || `Status updated from ${item.status} to ${status}.`,
        triggerType: triggerType || (status === 'Compliant' ? 'Auditor Sign-off' : status === 'Flagged' ? 'Risk Escalation' : 'Formal Review'),
        evidenceRef: evidenceRef || item.documentRef
      });
    } catch (actErr) {
      console.warn('Non-blocking activity log failed:', actErr);
    }

    setSyncStatus('saving');
    try {
      const docRef = doc(db, 'compliance_requirements', item.id);
      await updateDoc(docRef, {
        status,
        isChecked,
        auditedAt,
        checkedBy: checkedBy || null,
        checkedByUserId: checkedByUserId || null,
        statusTransitions: updatedTransitions,
        updated_datetime: new Date().toISOString()
      });
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (err) {
      console.warn('Firestore update failed, calling fallback API:', err);
      try {
        await fetch('/api/compliance_requirements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            status,
            isChecked,
            auditedAt,
            checkedBy,
            checkedByUserId,
            statusTransitions: updatedTransitions
          })
        });
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (apiErr) {
        console.error('Failed to change status:', apiErr);
        setSyncStatus('error');
        fetchFallback();
      }
    }
  };

  // Core Firestore note persistence (invoked automatically via debounce timer or immediately on blur)
  const commitNotesToFirestore = useCallback(async (itemId: string, notes: string) => {
    // Clear any active debounce timer for this item
    if (debounceTimersRef.current[itemId]) {
      clearTimeout(debounceTimersRef.current[itemId]);
      delete debounceTimersRef.current[itemId];
    }
    delete pendingNotesRef.current[itemId];

    setItemAutoSaveStates(prev => ({
      ...prev,
      [itemId]: { status: 'saving', lastSavedAt: prev[itemId]?.lastSavedAt }
    }));
    setSavingItemIds(prev => ({ ...prev, [itemId]: true }));
    setSyncStatus('saving');

    const timestamp = new Date().toISOString();
    try {
      const docRef = doc(db, 'compliance_requirements', itemId);
      await updateDoc(docRef, {
        auditorNotes: notes,
        auditedAt: timestamp,
        auditorName: currentUser.name,
        updated_datetime: timestamp
      });

      setRequirements(prev =>
        prev.map(r =>
          r.id === itemId
            ? { ...r, auditorNotes: notes, auditedAt: timestamp, auditorName: currentUser.name, updated_datetime: timestamp }
            : r
        )
      );

      const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setItemAutoSaveStates(prev => ({
        ...prev,
        [itemId]: { status: 'saved', lastSavedAt: timeFormatted }
      }));
      setSyncStatus('saved');
      setLastGlobalAutoSave(timeFormatted);
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (err) {
      console.warn('Direct Firestore notes update failed, invoking API fallback:', err);
      try {
        await fetch('/api/compliance_requirements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: itemId,
            auditorNotes: notes,
            auditorName: currentUser.name,
            auditedAt: timestamp
          })
        });
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setItemAutoSaveStates(prev => ({
          ...prev,
          [itemId]: { status: 'saved', lastSavedAt: timeFormatted }
        }));
        setSyncStatus('saved');
        setLastGlobalAutoSave(timeFormatted);
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (fallbackErr) {
        console.error('Error auto-saving notes:', fallbackErr);
        setItemAutoSaveStates(prev => ({
          ...prev,
          [itemId]: { status: 'error', lastSavedAt: prev[itemId]?.lastSavedAt }
        }));
        setSyncStatus('error');
      }
    } finally {
      setSavingItemIds(prev => ({ ...prev, [itemId]: false }));
    }
  }, [currentUser]);

  // Debounced input handler (800ms debounce delay) - saves automatically without manual clicks
  const handleNotesChange = (itemId: string, value: string) => {
    // 1. Instant optimistic local draft update for zero typing lag
    setNotesDrafts(prev => ({ ...prev, [itemId]: value }));
    pendingNotesRef.current[itemId] = value;

    // 2. Set item state to 'debouncing' (auto-saving in 800ms)
    setItemAutoSaveStates(prev => ({
      ...prev,
      [itemId]: { status: 'debouncing', lastSavedAt: prev[itemId]?.lastSavedAt }
    }));

    // 3. Clear existing debounce timer
    if (debounceTimersRef.current[itemId]) {
      clearTimeout(debounceTimersRef.current[itemId]);
    }

    // 4. Start 800ms debounce timer
    debounceTimersRef.current[itemId] = setTimeout(() => {
      commitNotesToFirestore(itemId, value);
    }, 800);
  };

  // Immediate flush on blur: ensures notes are saved immediately when user clicks away
  const handleNotesBlur = (itemId: string) => {
    if (debounceTimersRef.current[itemId]) {
      clearTimeout(debounceTimersRef.current[itemId]);
      delete debounceTimersRef.current[itemId];
      const pendingText = pendingNotesRef.current[itemId];
      if (pendingText !== undefined) {
        commitNotesToFirestore(itemId, pendingText);
      }
    }
  };

  // Flush any pending auto-saves when component unmounts
  useEffect(() => {
    const activeTimers = debounceTimersRef.current;
    const pendingNotes = pendingNotesRef.current;
    return () => {
      Object.entries(activeTimers).forEach(([id, timer]) => {
        clearTimeout(timer);
        const pendingText = pendingNotes[id];
        if (pendingText !== undefined) {
          commitNotesToFirestore(id, pendingText);
        }
      });
    };
  }, [commitNotesToFirestore]);

  // Multi-Selection Checkbox Handlers
  const toggleSelectItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedItemIds.size === filteredRequirements.length && filteredRequirements.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredRequirements.map(r => r.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // Bulk Status Update Handler
  const handleBulkStatusUpdate = async (newStatus: 'Compliant' | 'In Progress' | 'Flagged' | 'N/A') => {
    if (selectedItemIds.size === 0) return;
    setIsBulkProcessing(true);
    setIsBulkStatusDropdownOpen(false);

    const idsToUpdate = Array.from(selectedItemIds);
    const now = new Date().toISOString();
    const isChecked = newStatus === 'Compliant';

    // Optimistic UI state update with status transition history
    setRequirements(prev =>
      prev.map(r => {
        if (!selectedItemIds.has(r.id)) return r;
        const previousStatus = r.status;
        const newTransition: ComplianceStatusTransition = {
          id: `trans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          requirementId: r.id,
          requirementCode: r.code,
          fromStatus: previousStatus,
          toStatus: newStatus,
          timestamp: now,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          changedBy: currentUser.name,
          changedByRole: currentUser.role,
          changedByEmail: currentUser.email,
          triggerType: newStatus === 'Compliant' ? 'Auditor Sign-off' : newStatus === 'Flagged' ? 'Status Downgrade' : 'Formal Review',
          notes: `Bulk status update to "${newStatus}" across ${idsToUpdate.length} requirements by ${currentUser.name}.`
        };

        const existingTransitions = r.statusTransitions || [];
        return {
          ...r,
          status: newStatus,
          isChecked,
          auditedAt: isChecked ? now : r.auditedAt,
          checkedBy: isChecked ? (currentUser.email || currentUser.name) : r.checkedBy,
          checkedByUserId: isChecked ? currentUser.id : r.checkedByUserId,
          updated_datetime: now,
          statusTransitions: [newTransition, ...existingTransitions]
        };
      })
    );

    try {
      await bulkUpdateComplianceRequirements(idsToUpdate, {
        status: newStatus,
        isChecked,
        auditedAt: isChecked ? now : undefined,
        checkedBy: isChecked ? (currentUser.email || currentUser.name) : undefined,
        checkedByUserId: isChecked ? currentUser.id : undefined,
        updated_datetime: now
      });

      // Log global audit activity for bulk status update
      const affectedCodes = idsToUpdate.map(id => requirements.find(r => r.id === id)?.code || id);
      try {
        await logAuditActivity({
          id: `act_bulk_status_${Date.now()}`,
          type: 'bulk_status_update',
          title: `Bulk Status Update to "${newStatus}" (${idsToUpdate.length} requirements)`,
          description: `${currentUser.name} updated status to "${newStatus}" across ${idsToUpdate.length} requirements.`,
          affectedCount: idsToUpdate.length,
          affectedRequirementIds: idsToUpdate,
          affectedRequirementCodes: affectedCodes,
          toStatus: newStatus,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          timestamp: now,
          gate: selectedGate === 'ALL' ? currentGate : selectedGate,
          notes: `Bulk status change applied across: ${affectedCodes.slice(0, 6).join(', ')}${affectedCodes.length > 6 ? '...' : ''}.`,
          triggerType: newStatus === 'Compliant' ? 'Auditor Sign-off' : newStatus === 'Flagged' ? 'Status Downgrade' : 'Formal Review'
        });
      } catch (actErr) {
        console.warn('Activity feed logging failed:', actErr);
      }

      // Update Firestore transition history docs where possible
      for (const id of idsToUpdate) {
        try {
          const item = requirements.find(r => r.id === id);
          if (item) {
            const previousStatus = item.status;
            const newTransition: ComplianceStatusTransition = {
              id: `trans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              requirementId: id,
              requirementCode: item.code,
              fromStatus: previousStatus,
              toStatus: newStatus,
              timestamp: now,
              actorName: currentUser.name,
              actorRole: currentUser.role,
              actorEmail: currentUser.email,
              changedBy: currentUser.name,
              changedByRole: currentUser.role,
              changedByEmail: currentUser.email,
              triggerType: newStatus === 'Compliant' ? 'Auditor Sign-off' : newStatus === 'Flagged' ? 'Status Downgrade' : 'Formal Review',
              notes: `Bulk status update to "${newStatus}" across ${idsToUpdate.length} requirements.`
            };
            const docRef = doc(db, 'compliance_requirements', id);
            await updateDoc(docRef, {
              statusTransitions: [newTransition, ...(item.statusTransitions || [])]
            });
          }
        } catch (e) {
          // non-blocking
        }
      }

      setBulkNotification(`✓ Updated status to "${newStatus}" across ${idsToUpdate.length} requirements.`);
      setTimeout(() => setBulkNotification(null), 4500);
    } catch (err) {
      console.error('Bulk status update failed:', err);
      try {
        await fetch('/api/compliance_requirements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bulk: true,
            ids: idsToUpdate,
            changes: {
              status: newStatus,
              isChecked,
              auditedAt: isChecked ? now : null,
              checkedBy: isChecked ? (currentUser.email || currentUser.name) : null,
              checkedByUserId: isChecked ? currentUser.id : null
            }
          })
        });
        setBulkNotification(`✓ Updated status to "${newStatus}" across ${idsToUpdate.length} requirements.`);
        setTimeout(() => setBulkNotification(null), 4500);
      } catch (apiErr) {
        console.error('API bulk update fallback failed:', apiErr);
      }
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Assignment Handler
  const handleBulkAssign = async (member: TeamMember | null) => {
    if (selectedItemIds.size === 0) return;
    setIsBulkProcessing(true);
    setIsBulkAssignDropdownOpen(false);

    const idsToUpdate = Array.from(selectedItemIds);
    const now = new Date().toISOString();

    const assignmentChanges = member
      ? {
          assignedTo: member.name,
          assignedToEmail: member.email,
          assignedToRole: member.role,
          assignedAt: now,
          updated_datetime: now
        }
      : {
          assignedTo: '',
          assignedToEmail: '',
          assignedToRole: '',
          assignedAt: null as any,
          updated_datetime: now
        };

    // Optimistic UI state update
    setRequirements(prev =>
      prev.map(r => {
        if (!selectedItemIds.has(r.id)) return r;
        return {
          ...r,
          assignedTo: member ? member.name : undefined,
          assignedToEmail: member ? member.email : undefined,
          assignedToRole: member ? member.role : undefined,
          assignedAt: member ? now : null,
          updated_datetime: now
        };
      })
    );

    try {
      await bulkUpdateComplianceRequirements(idsToUpdate, assignmentChanges);

      // Log global audit activity for bulk assignment
      const affectedCodes = idsToUpdate.map(id => requirements.find(r => r.id === id)?.code || id);
      try {
        await logAuditActivity({
          id: `act_bulk_assign_${Date.now()}`,
          type: 'bulk_assignment',
          title: member
            ? `Bulk Assignment: ${idsToUpdate.length} items assigned to ${member.name}`
            : `Bulk Assignment: Cleared assignments for ${idsToUpdate.length} items`,
          description: member
            ? `Assigned ${idsToUpdate.length} compliance requirements to ${member.name} (${member.role}).`
            : `Cleared project team assignments across ${idsToUpdate.length} compliance requirements.`,
          affectedCount: idsToUpdate.length,
          affectedRequirementIds: idsToUpdate,
          affectedRequirementCodes: affectedCodes,
          assignedTo: member ? member.name : undefined,
          assignedToRole: member ? member.role : undefined,
          assignedToEmail: member ? member.email : undefined,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          timestamp: now,
          gate: selectedGate === 'ALL' ? currentGate : selectedGate,
          notes: member
            ? `Bulk assignment applied across ${idsToUpdate.length} requirements by ${currentUser.name}.`
            : `Assignments removed from ${idsToUpdate.length} requirements.`
        });
      } catch (actErr) {
        console.warn('Activity feed logging failed:', actErr);
      }

      const msg = member
        ? `✓ Assigned ${idsToUpdate.length} requirements to ${member.name} (${member.role}).`
        : `✓ Removed assignments from ${idsToUpdate.length} requirements.`;
      setBulkNotification(msg);
      setTimeout(() => setBulkNotification(null), 4500);
    } catch (err) {
      console.error('Bulk assignment failed:', err);
      try {
        await fetch('/api/compliance_requirements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bulk: true,
            ids: idsToUpdate,
            changes: assignmentChanges
          })
        });
        const msg = member
          ? `✓ Assigned ${idsToUpdate.length} requirements to ${member.name}.`
          : `✓ Removed assignments from ${idsToUpdate.length} requirements.`;
        setBulkNotification(msg);
        setTimeout(() => setBulkNotification(null), 4500);
      } catch (apiErr) {
        console.error('API bulk assign fallback failed:', apiErr);
      }
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Verification / Sign-Off Toggle Handler
  const handleBulkCheckToggle = async (verify: boolean) => {
    if (selectedItemIds.size === 0) return;
    setIsBulkProcessing(true);

    const idsToUpdate = Array.from(selectedItemIds);
    const now = new Date().toISOString();
    const newStatus = verify ? 'Compliant' : 'In Progress';

    setRequirements(prev =>
      prev.map(r => {
        if (!selectedItemIds.has(r.id)) return r;
        return {
          ...r,
          isChecked: verify,
          status: newStatus,
          auditedAt: verify ? now : r.auditedAt,
          checkedBy: verify ? (currentUser.email || currentUser.name) : r.checkedBy,
          checkedByUserId: verify ? currentUser.id : r.checkedByUserId,
          updated_datetime: now
        };
      })
    );

    try {
      await bulkUpdateComplianceRequirements(idsToUpdate, {
        isChecked: verify,
        status: newStatus,
        auditedAt: verify ? now : undefined,
        checkedBy: verify ? (currentUser.email || currentUser.name) : undefined,
        checkedByUserId: verify ? currentUser.id : undefined,
        updated_datetime: now
      });

      // Log global audit activity for bulk verification
      const affectedCodes = idsToUpdate.map(id => requirements.find(r => r.id === id)?.code || id);
      try {
        await logAuditActivity({
          id: `act_bulk_verify_${Date.now()}`,
          type: 'bulk_verification',
          title: verify
            ? `Bulk Verification Sign-Off (${idsToUpdate.length} requirements)`
            : `Bulk Verification Revocation (${idsToUpdate.length} requirements)`,
          description: verify
            ? `Lead auditor ${currentUser.name} signed off formal compliance verification for ${idsToUpdate.length} requirements.`
            : `Formal verification revoked for ${idsToUpdate.length} requirements.`,
          affectedCount: idsToUpdate.length,
          affectedRequirementIds: idsToUpdate,
          affectedRequirementCodes: affectedCodes,
          toStatus: newStatus,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          timestamp: now,
          gate: selectedGate === 'ALL' ? currentGate : selectedGate,
          notes: verify
            ? 'Batch formal compliance verification recorded in audit ledger.'
            : 'Items marked unverified for outstanding remediation.'
        });
      } catch (actErr) {
        console.warn('Activity feed logging failed:', actErr);
      }

      setBulkNotification(
        verify
          ? `✓ Marked ${idsToUpdate.length} requirements as Verified & Compliant.`
          : `✓ Unchecked verification for ${idsToUpdate.length} requirements.`
      );
      setTimeout(() => setBulkNotification(null), 4500);
    } catch (err) {
      console.error('Bulk check toggle failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Single Item Direct Assign Handler
  const handleSingleItemAssign = async (itemId: string, member: TeamMember | null) => {
    const now = new Date().toISOString();
    const assignmentChanges = member
      ? {
          assignedTo: member.name,
          assignedToEmail: member.email,
          assignedToRole: member.role,
          assignedAt: now,
          updated_datetime: now
        }
      : {
          assignedTo: '',
          assignedToEmail: '',
          assignedToRole: '',
          assignedAt: null as any,
          updated_datetime: now
        };

    const targetReq = requirements.find(r => r.id === itemId);

    setRequirements(prev =>
      prev.map(r => {
        if (r.id !== itemId) return r;
        return {
          ...r,
          assignedTo: member ? member.name : undefined,
          assignedToEmail: member ? member.email : undefined,
          assignedToRole: member ? member.role : undefined,
          assignedAt: member ? now : null,
          updated_datetime: now
        };
      })
    );
    setQuickAssignItemId(null);

    try {
      const docRef = doc(db, 'compliance_requirements', itemId);
      await updateDoc(docRef, assignmentChanges);

      // Log to Global Activity Feed
      try {
        await logAuditActivity({
          id: `act_assign_${Date.now()}`,
          type: 'assignment',
          title: member ? `Assigned ${targetReq?.code || 'Requirement'} to ${member.name}` : `Unassigned ${targetReq?.code || 'Requirement'}`,
          description: member
            ? `Assigned requirement ${targetReq?.code}: "${targetReq?.title || ''}" to ${member.name} (${member.role}).`
            : `Removed team assignment from requirement ${targetReq?.code || itemId}.`,
          requirementId: itemId,
          requirementCode: targetReq?.code,
          requirementTitle: targetReq?.title,
          assignedTo: member ? member.name : undefined,
          assignedToRole: member ? member.role : undefined,
          assignedToEmail: member ? member.email : undefined,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          timestamp: now,
          gate: targetReq?.gate,
          notes: member ? `Project ownership allocated to ${member.name} (${member.department}).` : 'Requirement returned to unassigned pool.'
        });
      } catch (actErr) {
        console.warn('Activity feed logging failed:', actErr);
      }

      setBulkNotification(
        member ? `✓ Assigned to ${member.name} (${member.role}).` : '✓ Cleared assignment.'
      );
      setTimeout(() => setBulkNotification(null), 3000);
    } catch (err) {
      console.warn('Direct update failed, using API:', err);
      await fetch('/api/compliance_requirements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, ...assignmentChanges })
      });
    }
  };

  // Single Item Direct Due Date Update Handler
  const handleUpdateDueDate = async (itemId: string, newDueDate: string | null) => {
    const now = new Date().toISOString();
    const targetReq = requirements.find(r => r.id === itemId);
    const prevDueDate = targetReq?.dueDate;

    // Optimistic UI state update
    setRequirements(prev =>
      prev.map(r => (r.id === itemId ? { ...r, dueDate: newDueDate, updated_datetime: now } : r))
    );

    // Keep selected timeline item synced
    setSelectedTimelineItem(prev => (prev && prev.id === itemId ? { ...prev, dueDate: newDueDate } : prev));
    setQuickDateItemId(null);

    const deadline = getDeadlineInfo(newDueDate, targetReq?.isChecked);

    try {
      const docRef = doc(db, 'compliance_requirements', itemId);
      await updateDoc(docRef, {
        dueDate: newDueDate,
        updated_datetime: now
      });

      // Log global audit activity
      try {
        await logAuditActivity({
          id: `act_due_${itemId}_${Date.now()}`,
          type: 'note_update',
          title: newDueDate
            ? `Due Date Scheduled for ${targetReq?.code || itemId}: ${newDueDate}`
            : `Due Date Cleared for ${targetReq?.code || itemId}`,
          description: `${currentUser.name} (${currentUser.role}) updated deadline for ${targetReq?.code} - ${targetReq?.title}. ${newDueDate ? `Target deadline set to ${newDueDate} (${deadline.statusText}).` : 'Deadline cleared.'}`,
          requirementId: itemId,
          requirementCode: targetReq?.code,
          requirementTitle: targetReq?.title,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          timestamp: now,
          gate: targetReq?.gate,
          notes: `Target deadline changed from "${prevDueDate || 'None'}" to "${newDueDate || 'None'}".`
        });
      } catch (actErr) {
        console.warn('Activity feed logging failed:', actErr);
      }

      setBulkNotification(
        newDueDate
          ? `✓ Deadline for ${targetReq?.code || 'item'} set to ${newDueDate} (${deadline.statusText}).`
          : `✓ Cleared deadline for ${targetReq?.code || 'item'}.`
      );
      setTimeout(() => setBulkNotification(null), 3500);
    } catch (err) {
      console.warn('Direct update failed, using API fallback:', err);
      try {
        await fetch('/api/compliance_requirements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, dueDate: newDueDate })
        });
      } catch (apiErr) {
        console.error('API due date update failed:', apiErr);
      }
    }
  };

  // Bulk Due Date Handler
  const handleBulkDueDate = async (newDueDate: string | null) => {
    if (selectedItemIds.size === 0) return;
    setIsBulkProcessing(true);
    setIsBulkDateDropdownOpen(false);

    const idsToUpdate = Array.from(selectedItemIds);
    const now = new Date().toISOString();

    // Optimistic UI state update
    setRequirements(prev =>
      prev.map(r => {
        if (!selectedItemIds.has(r.id)) return r;
        return { ...r, dueDate: newDueDate, updated_datetime: now };
      })
    );

    try {
      await bulkUpdateComplianceRequirements(idsToUpdate, {
        dueDate: newDueDate,
        updated_datetime: now
      });

      const affectedCodes = idsToUpdate.map(id => requirements.find(r => r.id === id)?.code || id);
      try {
        await logAuditActivity({
          id: `act_bulk_date_${Date.now()}`,
          type: 'bulk_status_update',
          title: newDueDate
            ? `Bulk Deadline Scheduled: ${idsToUpdate.length} items set to ${newDueDate}`
            : `Bulk Deadline Cleared for ${idsToUpdate.length} items`,
          description: newDueDate
            ? `Assigned unified deadline ${newDueDate} across ${idsToUpdate.length} compliance requirements.`
            : `Cleared deadlines across ${idsToUpdate.length} compliance requirements.`,
          affectedCount: idsToUpdate.length,
          affectedRequirementIds: idsToUpdate,
          affectedRequirementCodes: affectedCodes,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actorEmail: currentUser.email,
          timestamp: now,
          gate: selectedGate === 'ALL' ? currentGate : selectedGate,
          notes: `Batch deadline update applied to ${idsToUpdate.length} requirements.`
        });
      } catch (actErr) {
        console.warn('Activity feed logging failed:', actErr);
      }

      setBulkNotification(
        newDueDate
          ? `✓ Set deadline to ${newDueDate} across ${idsToUpdate.length} requirements.`
          : `✓ Cleared deadlines across ${idsToUpdate.length} requirements.`
      );
      setTimeout(() => setBulkNotification(null), 4500);
    } catch (err) {
      console.error('Bulk due date update failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Toggle Accordion Drawer
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Create Custom Requirement in Firestore
  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqForm.title || !newReqForm.code) return;

    setSyncStatus('saving');
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: ComplianceRequirementItem = {
      ...newReqForm,
      id,
      dueDate: newReqForm.dueDate ? newReqForm.dueDate : null,
      status: 'In Progress',
      isChecked: false,
      auditedAt: null,
      checkedBy: undefined,
      checkedByUserId: undefined,
      created_datetime: new Date().toISOString(),
      updated_datetime: null
    };

    try {
      const docRef = doc(db, 'compliance_requirements', id);
      await setDoc(docRef, newRecord);

      setRequirements(prev => [newRecord, ...prev]);
      setNotesDrafts(prev => ({ ...prev, [id]: '' }));
      setIsModalOpen(false);
      setNewReqForm({
        code: '',
        title: '',
        description: '',
        gate: currentGate,
        category: 'Financial',
        priority: 'High',
        dueDate: '',
        evidenceThreshold: '',
        documentRef: '',
        auditorNotes: '',
        auditorName: currentUser.name
      });
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (err) {
      console.warn('Direct Firestore create failed, calling API:', err);
      try {
        const res = await fetch('/api/compliance_requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newReqForm, id })
        });
        if (!res.ok) throw new Error('API save failed');
        const created = await res.json();
        setRequirements(prev => [created, ...prev]);
        setIsModalOpen(false);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (apiErr) {
        console.error('Create error:', apiErr);
        setSyncStatus('error');
      }
    }
  };

  // Delete Requirement from Firestore
  const handleDeleteRequirement = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete compliance requirement "${code}" from Cloud Firestore?`)) return;

    setSyncStatus('saving');
    try {
      const docRef = doc(db, 'compliance_requirements', id);
      await deleteDoc(docRef);
      setRequirements(prev => prev.filter(r => r.id !== id));
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (err) {
      console.warn('Direct delete failed, trying API route:', err);
      try {
        await fetch(`/api/compliance_requirements?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        setRequirements(prev => prev.filter(r => r.id !== id));
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (apiErr) {
        console.error('Delete error:', apiErr);
        setSyncStatus('error');
      }
    }
  };

  // Filtered requirements with comprehensive multi-field search and category/priority filters
  const filteredRequirements = useMemo(() => {
    return requirements.filter(r => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        r.code.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.priority.toLowerCase().includes(query) ||
        (r.dueDate && r.dueDate.toLowerCase().includes(query)) ||
        (r.evidenceThreshold && r.evidenceThreshold.toLowerCase().includes(query)) ||
        (r.documentRef && r.documentRef.toLowerCase().includes(query)) ||
        (r.auditorNotes && r.auditorNotes.toLowerCase().includes(query)) ||
        (r.auditorName && r.auditorName.toLowerCase().includes(query)) ||
        (r.checkedBy && r.checkedBy.toLowerCase().includes(query)) ||
        (r.assignedTo && r.assignedTo.toLowerCase().includes(query)) ||
        (r.assignedToRole && r.assignedToRole.toLowerCase().includes(query)) ||
        (r.assignedToEmail && r.assignedToEmail.toLowerCase().includes(query)) ||
        r.gate.toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query);

      const matchesGate = selectedGate === 'ALL' || r.gate === selectedGate;
      const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
      const matchesPriority = selectedPriority === 'ALL' || r.priority === selectedPriority;

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'CHECKED' && r.isChecked) ||
        (selectedStatus === 'UNCHECKED' && !r.isChecked) ||
        r.status === selectedStatus;

      const matchesAssignee =
        selectedAssignee === 'ALL' ||
        (selectedAssignee === 'UNASSIGNED' && !r.assignedTo) ||
        r.assignedTo === selectedAssignee ||
        r.assignedToEmail === selectedAssignee;

      const deadlineInfo = getDeadlineInfo(r.dueDate, r.isChecked);
      let matchesDeadline = true;
      if (selectedDeadlineFilter === 'URGENT') {
        matchesDeadline = deadlineInfo.isUrgent && !r.isChecked;
      } else if (selectedDeadlineFilter === 'OVERDUE') {
        matchesDeadline = deadlineInfo.isOverdue && !r.isChecked;
      } else if (selectedDeadlineFilter === 'DUE_SOON') {
        matchesDeadline = deadlineInfo.isDueSoon && !r.isChecked;
      } else if (selectedDeadlineFilter === 'SCHEDULED') {
        matchesDeadline = !!r.dueDate;
      } else if (selectedDeadlineFilter === 'NO_DEADLINE') {
        matchesDeadline = !r.dueDate;
      }

      const matchesMyChecked =
        !onlyMyChecked ||
        (r.isChecked &&
          (r.checkedBy === currentUser.email ||
            r.checkedBy === currentUser.name ||
            r.checkedByUserId === currentUser.id));

      return matchesSearch && matchesGate && matchesCategory && matchesPriority && matchesStatus && matchesAssignee && matchesDeadline && matchesMyChecked;
    });
  }, [requirements, searchQuery, selectedGate, selectedCategory, selectedPriority, selectedStatus, selectedAssignee, selectedDeadlineFilter, onlyMyChecked, currentUser]);

  // Report search match count to persistent global header search bar
  useEffect(() => {
    if (setSearchMatchCount) {
      setSearchMatchCount(filteredRequirements.length);
    }
  }, [filteredRequirements.length, setSearchMatchCount]);

  // Summary Metrics & Proportions
  const metrics = useMemo(() => {
    const total = requirements.length;
    const checked = requirements.filter(r => r.isChecked).length;
    const compliant = requirements.filter(r => r.status === 'Compliant').length;
    const inProgress = requirements.filter(r => r.status === 'In Progress').length;
    const flagged = requirements.filter(r => r.status === 'Flagged').length;
    const notApplicable = requirements.filter(r => r.status === 'N/A').length;
    const myCheckedCount = requirements.filter(
      r =>
        r.isChecked &&
        (r.checkedBy === currentUser.email ||
          r.checkedBy === currentUser.name ||
          r.checkedByUserId === currentUser.id)
    ).length;

    // Deadline and visual warning metrics
    const totalWithDeadline = requirements.filter(r => !!r.dueDate).length;
    const urgentRequirements = requirements.filter(r => {
      const d = getDeadlineInfo(r.dueDate, r.isChecked);
      return d.isUrgent && !r.isChecked;
    });
    const urgentDeadlineCount = urgentRequirements.length;
    const overdueCount = requirements.filter(r => {
      const d = getDeadlineInfo(r.dueDate, r.isChecked);
      return d.isOverdue && !r.isChecked;
    }).length;
    const dueSoonCount = requirements.filter(r => {
      const d = getDeadlineInfo(r.dueDate, r.isChecked);
      return d.isDueSoon && !r.isChecked;
    }).length;

    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
    const compliantPct = total > 0 ? (compliant / total) * 100 : 0;
    const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
    const flaggedPct = total > 0 ? (flagged / total) * 100 : 0;
    const remainingCount = Math.max(0, total - checked);
    const remainingPct = total > 0 ? Math.max(0, 100 - (compliantPct + inProgressPct + flaggedPct)) : 0;

    // Assurance Gate Readiness Level
    let readinessText = 'Critical Gaps — Gate Blocked';
    let readinessColor = '#dc2626';
    let readinessBg = '#fef2f2';
    let readinessBorder = '#fecaca';

    if (percentage === 100) {
      readinessText = 'Full Assurance Clearance Verified ✓';
      readinessColor = '#059669';
      readinessBg = '#ecfdf5';
      readinessBorder = '#a7f3d0';
    } else if (percentage >= 80) {
      readinessText = 'Substantial Assurance — Ready for Review';
      readinessColor = '#047857';
      readinessBg = '#f0fdf4';
      readinessBorder = '#bbf7d0';
    } else if (percentage >= 50) {
      readinessText = 'Interim Progress — Remediation Underway';
      readinessColor = '#b45309';
      readinessBg = '#fffbeb';
      readinessBorder = '#fde68a';
    }

    return {
      total,
      checked,
      compliant,
      inProgress,
      flagged,
      notApplicable,
      myCheckedCount,
      totalWithDeadline,
      urgentDeadlineCount,
      overdueCount,
      dueSoonCount,
      percentage,
      compliantPct,
      inProgressPct,
      flaggedPct,
      remainingCount,
      remainingPct,
      readinessText,
      readinessColor,
      readinessBg,
      readinessBorder
    };
  }, [requirements, currentUser]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    requirements.forEach(r => set.add(r.category));
    return Array.from(set);
  }, [requirements]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: requirements.length };
    requirements.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [requirements]);

  const categoryBreakdown = useMemo(() => {
    return categories.map(cat => {
      const items = requirements.filter(r => r.category === cat);
      const catTotal = items.length;
      const catChecked = items.filter(r => r.isChecked).length;
      const catCompliant = items.filter(r => r.status === 'Compliant').length;
      const catFlagged = items.filter(r => r.status === 'Flagged').length;
      const catPercentage = catTotal > 0 ? Math.round((catChecked / catTotal) * 100) : 0;
      return {
        category: cat,
        total: catTotal,
        checked: catChecked,
        compliant: catCompliant,
        flagged: catFlagged,
        percentage: catPercentage
      };
    });
  }, [categories, requirements]);

  // Dynamic metrics calculator for any targeted export list (current view, selected subset, or all)
  const calculateExportMetrics = useCallback((targetList: ComplianceRequirementItem[]) => {
    const total = targetList.length;
    const checked = targetList.filter(r => r.isChecked).length;
    const compliant = targetList.filter(r => r.status === 'Compliant').length;
    const inProgress = targetList.filter(r => r.status === 'In Progress').length;
    const flagged = targetList.filter(r => r.status === 'Flagged').length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
    const remainingCount = Math.max(0, total - checked);

    let readinessText = 'Critical Gaps — Gate Blocked';
    if (percentage === 100) {
      readinessText = 'Full Assurance Clearance Verified ✓';
    } else if (percentage >= 80) {
      readinessText = 'Substantial Assurance — Ready for Review';
    } else if (percentage >= 50) {
      readinessText = 'Interim Progress — Remediation Underway';
    }

    const uniqueCats = Array.from(new Set(targetList.map(r => r.category)));
    const targetCategoryBreakdown = uniqueCats.map(cat => {
      const catItems = targetList.filter(r => r.category === cat);
      const catTotal = catItems.length;
      const catChecked = catItems.filter(r => r.isChecked).length;
      const catCompliant = catItems.filter(r => r.status === 'Compliant').length;
      const catFlagged = catItems.filter(r => r.status === 'Flagged').length;
      const catPercentage = catTotal > 0 ? Math.round((catChecked / catTotal) * 100) : 0;
      return {
        category: cat,
        total: catTotal,
        checked: catChecked,
        compliant: catCompliant,
        flagged: catFlagged,
        percentage: catPercentage
      };
    });

    return {
      metrics: {
        total,
        checked,
        percentage,
        compliant,
        inProgress,
        flagged,
        remainingCount,
        readinessText
      },
      categoryBreakdown: targetCategoryBreakdown
    };
  }, []);

  const getFilterSummaryString = useCallback(() => {
    const parts: string[] = [];
    if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
    if (selectedGate !== 'ALL') parts.push(`Gate: ${selectedGate}`);
    if (selectedCategory !== 'ALL') parts.push(`Category: ${selectedCategory}`);
    if (selectedPriority !== 'ALL') parts.push(`Priority: ${selectedPriority}`);
    if (selectedStatus !== 'ALL') parts.push(`Status: ${selectedStatus}`);
    if (selectedAssignee !== 'ALL') parts.push(`Assignee: ${selectedAssignee}`);
    if (onlyMyChecked) parts.push('Only My Checked');
    return parts.length > 0 ? parts.join(', ') : 'All Filters Default';
  }, [searchQuery, selectedGate, selectedCategory, selectedPriority, selectedStatus, selectedAssignee, onlyMyChecked]);

  // Export Formatted Stakeholder PDF Report (defaults to current filtered view)
  const handleExportPdfReport = async (overrideRequirements?: ComplianceRequirementItem[], customScopeLabel?: string) => {
    const targetList = overrideRequirements || filteredRequirements;
    if (targetList.length === 0) {
      alert('There are no compliance requirements in the current view to export.');
      return;
    }

    setIsExportingPdf(true);
    const scopeLabel = customScopeLabel || (
      overrideRequirements
        ? `Custom Selection (${targetList.length} Items)`
        : filteredRequirements.length === requirements.length
          ? 'All Gateway Requirements'
          : `Current View (${targetList.length} of ${requirements.length})`
    );
    const filterSummary = filteredRequirements.length === requirements.length ? '' : getFilterSummaryString();
    const { metrics: exportMetrics, categoryBreakdown: exportCategoryBreakdown } = calculateExportMetrics(targetList);

    try {
      await exportComplianceAuditPdf({
        projectName: projectName || 'A428 Black Cat to Caxton Gibbet Improvement',
        currentGate: currentGate || 'GATE_2',
        scopeLabel,
        filterSummary,
        auditor: currentUser,
        metrics: exportMetrics,
        categoryBreakdown: exportCategoryBreakdown,
        requirements: targetList,
        firestoreDbId: 'ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5'
      });
      setExportNotification(`Successfully generated stakeholder PDF report for ${targetList.length} requirements.`);
      setTimeout(() => setExportNotification(null), 4000);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Failed to generate stakeholder compliance PDF report:', err);
      alert('Unable to generate PDF report. Please verify your browser allows downloads.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Formatted Stakeholder CSV Report (defaults to current filtered view)
  const handleExportCsvReport = (overrideRequirements?: ComplianceRequirementItem[], customScopeLabel?: string) => {
    const targetList = overrideRequirements || filteredRequirements;
    if (targetList.length === 0) {
      alert('There are no compliance requirements in the current view to export.');
      return;
    }

    setIsExportingCsv(true);
    const scopeLabel = customScopeLabel || (
      overrideRequirements
        ? `Custom Selection (${targetList.length} Items)`
        : filteredRequirements.length === requirements.length
          ? 'All Gateway Requirements'
          : `Current View (${targetList.length} of ${requirements.length})`
    );
    const filterSummary = filteredRequirements.length === requirements.length ? '' : getFilterSummaryString();

    try {
      exportComplianceRequirementsCsv({
        projectName: projectName || 'A428 Black Cat to Caxton Gibbet Improvement',
        currentGate: currentGate || 'GATE_2',
        scopeLabel,
        filterSummary,
        auditor: currentUser,
        requirements: targetList
      });
      setExportNotification(`Successfully exported ${targetList.length} requirements as CSV document.`);
      setTimeout(() => setExportNotification(null), 4000);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Failed to export compliance requirements as CSV:', err);
      alert('Unable to export CSV document. Please verify your browser allows downloads.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Export Raw Audit JSON Evidence Pack (defaults to current filtered view)
  const handleExportReport = (overrideRequirements?: ComplianceRequirementItem[]) => {
    const targetList = overrideRequirements || filteredRequirements;
    const reportData = {
      project: projectName,
      gateway: currentGate,
      generatedAt: new Date().toISOString(),
      auditor: currentUser,
      database: 'ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5',
      exportScope: overrideRequirements ? 'Custom Selection' : filteredRequirements.length === requirements.length ? 'All Requirements' : 'Filtered Current View',
      filterCriteria: getFilterSummaryString(),
      summary: {
        total: targetList.length,
        compliant: targetList.filter(r => r.status === 'Compliant').length,
        inProgress: targetList.filter(r => r.status === 'In Progress').length,
        flagged: targetList.filter(r => r.status === 'Flagged').length,
        completionPercentage: Math.round(
          (targetList.filter(r => r.isChecked).length / (targetList.length || 1)) * 100
        )
      },
      requirements: targetList
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPA-Assurance-Compliance-Audit-${currentGate}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportNotification(`Exported ${targetList.length} requirements as JSON evidence pack.`);
    setTimeout(() => setExportNotification(null), 4000);
    setIsExportModalOpen(false);
  };

  // Automatic Debounce Mechanism for Overall Project Progress Persistence in Firestore
  // When an auditor checks items or modifies statuses, progress metrics automatically save after a 1-second delay
  useEffect(() => {
    if (metrics.total === 0 || !firestoreConnected) return;

    setProgressSyncState('debouncing');

    if (progressDebounceTimerRef.current) {
      clearTimeout(progressDebounceTimerRef.current);
    }

    progressDebounceTimerRef.current = setTimeout(async () => {
      setProgressSyncState('saving');
      const sanitizedProject = (projectName || 'A428_Delivery_Strategy').replace(/[^a-zA-Z0-9_-]/g, '_');
      const progressDocRef = doc(db, 'audit_progress_summaries', sanitizedProject);

      try {
        await setDoc(progressDocRef, {
          projectName: projectName || 'A428 Black Cat to Caxton Gibbet Improvement',
          currentGate: currentGate || 'GATE_2',
          total: metrics.total,
          checked: metrics.checked,
          percentage: metrics.percentage,
          compliant: metrics.compliant,
          inProgress: metrics.inProgress,
          flagged: metrics.flagged,
          remaining: metrics.remainingCount,
          readinessText: metrics.readinessText,
          lastAutoSavedAt: new Date().toISOString(),
          lastSavedBy: currentUser.name,
          lastSavedByEmail: currentUser.email
        }, { merge: true });

        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastGlobalAutoSave(timeFormatted);
        setProgressSyncState('synced');
      } catch (err) {
        console.warn('Progress summary auto-save notice:', err);
        setProgressSyncState('synced');
      }
    }, 1000); // 1.0 second debounce delay

    return () => {
      if (progressDebounceTimerRef.current) {
        clearTimeout(progressDebounceTimerRef.current);
      }
    };
  }, [
    metrics.checked,
    metrics.total,
    metrics.percentage,
    metrics.compliant,
    metrics.inProgress,
    metrics.flagged,
    metrics.remainingCount,
    metrics.readinessText,
    firestoreConnected,
    projectName,
    currentGate,
    currentUser
  ]);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: compact ? '16px' : '28px',
      marginBottom: '28px',
      boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
    }}>
      {/* Component Top Bar: Header, User Session & Firestore Status */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '20px',
        marginBottom: '20px',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#1d70b8'
            }}>
              <VerifiedIcon style={{ fontSize: '1.4rem' }} />
            </div>
            <div>
              <h2 style={{ fontSize: compact ? '1.25rem' : '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Project Compliance & Assurance Requirements
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px', marginBottom: 0 }}>
                Real-time audit verification checklist with live Google Cloud Firestore persistence.
              </p>
            </div>
          </div>

          {/* Firestore Connection & Current User Banner */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            {/* Firestore Live Badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: firestoreConnected ? '#ecfdf5' : '#fef2f2',
              color: firestoreConnected ? '#065f46' : '#991b1b',
              border: `1px solid ${firestoreConnected ? '#a7f3d0' : '#fecaca'}`
            }}>
              {firestoreConnected ? (
                <>
                  <CloudDoneIcon style={{ fontSize: '0.95rem', color: '#059669' }} />
                  Firestore Live: <code style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>ai-studio-scout-d32152a8...</code>
                </>
              ) : (
                <>
                  <CloudOffIcon style={{ fontSize: '0.95rem', color: '#dc2626' }} />
                  Firestore Offline (REST Fallback)
                </>
              )}
            </span>

            {/* Current Auditor Badge */}
            <button
              onClick={() => setIsUserModalOpen(true)}
              title="Click to change auditor identity"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <UserIcon style={{ fontSize: '0.95rem', color: '#64748b' }} />
              Auditor: <strong style={{ color: '#0f172a' }}>{currentUser.name}</strong> ({currentUser.email})
              <span style={{ fontSize: '0.7rem', color: '#1d70b8', textDecoration: 'underline', marginLeft: '2px' }}>Switch</span>
            </button>

            {/* Auto-Save Debounced Status Capsule */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: progressSyncState === 'debouncing' ? '#fffbeb' : '#f0fdf4',
              color: progressSyncState === 'debouncing' ? '#b45309' : '#15803d',
              border: `1px solid ${progressSyncState === 'debouncing' ? '#fde68a' : '#bbf7d0'}`
            }}>
              <span style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: progressSyncState === 'debouncing' ? '#f59e0b' : '#10b981'
              }} />
              {progressSyncState === 'debouncing'
                ? 'Auto-saving progress in 1s...'
                : lastGlobalAutoSave
                ? `Auto-Saved (${lastGlobalAutoSave})`
                : 'Auto-Save: Active (Debounced)'}
            </span>
          </div>
        </div>

        {/* Sync Indicator & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {progressSyncState === 'debouncing' && (
            <span style={{ fontSize: '0.8rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              Auto-saving in 1s...
            </span>
          )}
          {syncStatus === 'saving' && (
            <span style={{ fontSize: '0.8rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <CloudSyncIcon style={{ fontSize: '1.1rem', animation: 'spin 1.2s linear infinite' }} />
              Syncing to Firestore...
            </span>
          )}
          {syncStatus === 'saved' && (
            <span style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <CloudDoneIcon style={{ fontSize: '1.1rem' }} />
              {lastGlobalAutoSave ? `Auto-Saved at ${lastGlobalAutoSave}` : 'Persisted'}
            </span>
          )}
          {syncStatus === 'error' && (
            <span style={{ fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              ⚠️ Sync Error
            </span>
          )}

          <button
            onClick={fetchFallback}
            title="Reload requirements directly from Firestore"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#334155',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshIcon style={{ fontSize: '1rem', marginRight: '4px', color: '#64748b' }} />
            Sync
          </button>

          {/* Export Current View as CSV Spreadsheet */}
          <button
            onClick={() => handleExportCsvReport()}
            disabled={isExportingCsv}
            title={`Export current view (${filteredRequirements.length} requirements) as a CSV spreadsheet for Excel or Google Sheets`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: isExportingCsv ? 'wait' : 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#065f46',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
              gap: '6px'
            }}
          >
            {isExportingCsv ? (
              <>
                <CloudSyncIcon style={{ fontSize: '1rem', color: '#059669', animation: 'spin 1.2s linear infinite' }} />
                <span>Exporting CSV...</span>
              </>
            ) : (
              <>
                <TableChartIcon style={{ fontSize: '1.05rem', color: '#059669' }} />
                <span>Export CSV</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0'
                }}>
                  {filteredRequirements.length}
                </span>
              </>
            )}
          </button>

          {/* Export Formatted PDF Report for Project Stakeholders (Current View) */}
          <button
            onClick={() => handleExportPdfReport()}
            disabled={isExportingPdf}
            title={`Download publication-grade compliance audit PDF report for project stakeholders (${filteredRequirements.length} in current view)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: isExportingPdf ? 'wait' : 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#0f172a',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
              gap: '6px'
            }}
          >
            {isExportingPdf ? (
              <>
                <CloudSyncIcon style={{ fontSize: '1rem', color: '#dc2626', animation: 'spin 1.2s linear infinite' }} />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <PdfIcon style={{ fontSize: '1.05rem', color: '#dc2626' }} />
                <span>Export PDF</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca'
                }}>
                  {filteredRequirements.length}
                </span>
              </>
            )}
          </button>

          {/* Export Scope & Format Dialog Trigger */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            title="Configure export scope (Current view, selected items, or all) and formats"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 11px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#334155',
              transition: 'all 0.15s ease',
              gap: '4px'
            }}
          >
            <DownloadIcon style={{ fontSize: '0.95rem', color: '#1d70b8' }} />
            <span>Export Options...</span>
          </button>

          {/* Raw JSON Audit Pack Export */}
          <button
            onClick={() => handleExportReport()}
            title="Download raw audit evidence pack (JSON) with Firestore metadata"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <DownloadIcon style={{ fontSize: '0.95rem', marginRight: '4px', color: '#64748b' }} />
            JSON
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 16px',
              backgroundColor: '#1d70b8',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <AddIcon style={{ fontSize: '1.05rem', marginRight: '4px' }} />
            Add Requirement
          </button>

          {/* Live Global Activity Feed View Toggle Button */}
          <button
            onClick={() => setActiveView(prev => prev === 'activity' ? 'checklist' : 'activity')}
            title="Open Live Global Activity Feed logging status transitions & bulk operations"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 14px',
              backgroundColor: activeView === 'activity' ? '#0f172a' : '#f8fafc',
              border: `1px solid ${activeView === 'activity' ? '#0f172a' : '#cbd5e1'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: activeView === 'activity' ? '#ffffff' : '#1e293b',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
              gap: '6px'
            }}
          >
            <ActivityFeedIcon style={{ fontSize: '1rem', color: activeView === 'activity' ? '#38bdf8' : '#1d70b8' }} />
            <span>Activity Feed</span>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 5px #10b981'
            }} />
          </button>

          {/* Recharts Compliance Status Pie Chart Toggle Button */}
          <button
            onClick={() => setShowStatusPieChart(prev => !prev)}
            title="Toggle Recharts Compliance Status Pie Chart overview for project stakeholders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 13px',
              backgroundColor: showStatusPieChart ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${showStatusPieChart ? '#bfdbfe' : '#cbd5e1'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: showStatusPieChart ? '#1d70b8' : '#334155',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
              gap: '6px'
            }}
          >
            <PieChartIcon style={{ fontSize: '1.05rem', color: '#10b981' }} />
            <span>Status Chart</span>
            <span style={{
              fontSize: '0.7rem',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: showStatusPieChart ? '#dbeafe' : '#e2e8f0',
              color: showStatusPieChart ? '#1e40af' : '#475569'
            }}>
              Recharts
            </span>
          </button>
        </div>
      </div>

      {/* Advanced Visual Progress Bar & Fulfillment Percentage Tracker */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)'
      }}>
        {/* Top Hub: Circular Percentage Gauge, Fulfillment Ratio & Gate Readiness */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Circular Percentage Tracker & Headings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* SVG Circular Radial Progress Ring */}
            <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
              <svg width="74" height="74" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Dynamic Progress Arc */}
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  stroke={metrics.percentage >= 80 ? '#10b981' : metrics.percentage >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray="226.2"
                  strokeDashoffset={226.2 - (metrics.percentage / 100) * 226.2}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}
                />
              </svg>
              {/* Centered Percentage Display */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: metrics.percentage >= 80 ? '#047857' : metrics.percentage >= 50 ? '#b45309' : '#b91c1c',
                  lineHeight: 1
                }}>
                  {metrics.percentage}%
                </span>
                <span style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                  letterSpacing: '0.04em'
                }}>
                  DONE
                </span>
              </div>
            </div>

            {/* Header Titles & Ratio Counter */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Compliance Progress Tracker
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569'
                }}>
                  Cloud Firestore Real-Time
                </span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '3px 0 2px 0', letterSpacing: '-0.02em' }}>
                {metrics.checked} of {metrics.total} Requirements Fulfilled
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                {metrics.remainingCount === 0 ? (
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    ✓ All compliance requirements have been audited and signed off.
                  </span>
                ) : (
                  <span>
                    <strong>{metrics.remainingCount}</strong> requirement{metrics.remainingCount === 1 ? '' : 's'} remaining to complete full gateway clearance.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Gate Assurance Readiness Status Capsule */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '6px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: metrics.readinessBg,
              color: metrics.readinessColor,
              border: `1px solid ${metrics.readinessBorder}`,
              fontWeight: 700,
              fontSize: '0.8125rem'
            }}>
              {metrics.percentage >= 80 ? (
                <VerifiedIcon style={{ fontSize: '1.1rem', color: '#059669' }} />
              ) : metrics.percentage >= 50 ? (
                <PendingIcon style={{ fontSize: '1.1rem', color: '#d97706' }} />
              ) : (
                <WarningIcon style={{ fontSize: '1.1rem', color: '#dc2626' }} />
              )}
              <span>{metrics.readinessText}</span>
            </div>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              Gateway threshold: 80% substantial assurance required
            </span>
          </div>
        </div>

        {/* Multi-Segment Stacked Visual Progress Bar with Milestone Target Marker */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <div style={{
            width: '100%',
            height: '14px',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
          }}>
            {/* Compliant Segment */}
            {metrics.compliantPct > 0 && (
              <div
                title={`Compliant: ${metrics.compliant} items (${Math.round(metrics.compliantPct)}%)`}
                style={{
                  width: `${metrics.compliantPct}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  transition: 'width 0.4s ease'
                }}
              />
            )}
            {/* In Progress Segment */}
            {metrics.inProgressPct > 0 && (
              <div
                title={`In Progress: ${metrics.inProgress} items (${Math.round(metrics.inProgressPct)}%)`}
                style={{
                  width: `${metrics.inProgressPct}%`,
                  height: '100%',
                  backgroundColor: '#f59e0b',
                  transition: 'width 0.4s ease'
                }}
              />
            )}
            {/* Flagged / Risk Segment */}
            {metrics.flaggedPct > 0 && (
              <div
                title={`Flagged Risk: ${metrics.flagged} items (${Math.round(metrics.flaggedPct)}%)`}
                style={{
                  width: `${metrics.flaggedPct}%`,
                  height: '100%',
                  backgroundColor: '#ef4444',
                  transition: 'width 0.4s ease'
                }}
              />
            )}
          </div>

          {/* 80% Target Milestone Marker */}
          <div
            title="Substantial Assurance Threshold (80%)"
            style={{
              position: 'absolute',
              left: '80%',
              top: '-3px',
              bottom: '-3px',
              width: '2px',
              backgroundColor: '#0f172a',
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-16px',
              transform: 'translateX(-50%)',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: '#ffffff',
              padding: '1px 4px',
              borderRadius: '3px',
              border: '1px solid #cbd5e1',
              whiteSpace: 'nowrap'
            }}>
              80% Target
            </div>
          </div>
        </div>

        {/* Legend / Status Filter Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div
            onClick={() => { setSelectedStatus('ALL'); setOnlyMyChecked(false); }}
            style={{
              backgroundColor: selectedStatus === 'ALL' && !onlyMyChecked ? '#f1f5f9' : '#ffffff',
              border: `1px solid ${selectedStatus === 'ALL' && !onlyMyChecked ? '#94a3b8' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Total Items</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{metrics.total}</div>
          </div>

          <div
            onClick={() => { setSelectedStatus('Compliant'); setOnlyMyChecked(false); }}
            style={{
              backgroundColor: selectedStatus === 'Compliant' && !onlyMyChecked ? '#ecfdf5' : '#ffffff',
              border: `1px solid ${selectedStatus === 'Compliant' && !onlyMyChecked ? '#10b981' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>✓ Compliant</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
              {metrics.compliant} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>({Math.round(metrics.compliantPct)}%)</span>
            </div>
          </div>

          <div
            onClick={() => { setSelectedStatus('In Progress'); setOnlyMyChecked(false); }}
            style={{
              backgroundColor: selectedStatus === 'In Progress' && !onlyMyChecked ? '#fffbeb' : '#ffffff',
              border: `1px solid ${selectedStatus === 'In Progress' && !onlyMyChecked ? '#f59e0b' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>⌛ In Progress</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
              {metrics.inProgress} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706' }}>({Math.round(metrics.inProgressPct)}%)</span>
            </div>
          </div>

          <div
            onClick={() => { setSelectedStatus('Flagged'); setOnlyMyChecked(false); }}
            style={{
              backgroundColor: selectedStatus === 'Flagged' && !onlyMyChecked ? '#fef2f2' : '#ffffff',
              border: `1px solid ${selectedStatus === 'Flagged' && !onlyMyChecked ? '#ef4444' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>⚠️ Flagged</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
              {metrics.flagged} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626' }}>({Math.round(metrics.flaggedPct)}%)</span>
            </div>
          </div>

          <div
            onClick={() => setOnlyMyChecked(!onlyMyChecked)}
            style={{
              backgroundColor: onlyMyChecked ? '#f5f3ff' : '#ffffff',
              border: `1px solid ${onlyMyChecked ? '#8b5cf6' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>My Audits</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6d28d9', marginTop: '2px' }}>{metrics.myCheckedCount}</div>
          </div>
        </div>

        {/* Category Breakdown Toggle & Visual Mini Progress Trackers */}
        <div style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '14px',
          marginTop: '10px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: showCategoryBreakdown ? '12px' : 0
          }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
              Category Fulfillment Breakdown ({categoryBreakdown.length} Categories)
            </span>
            <button
              onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d70b8',
                fontSize: '0.78125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              {showCategoryBreakdown ? 'Hide Breakdown ▲' : 'Show Breakdown ▼'}
            </button>
          </div>

          {showCategoryBreakdown && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '10px'
            }}>
              {categoryBreakdown.map(cat => {
                const isSelected = selectedCategory === cat.category;
                return (
                  <div
                    key={cat.category}
                    onClick={() => {
                      if (selectedCategory === cat.category) {
                        setSelectedCategory('ALL');
                      } else {
                        setSelectedCategory(cat.category);
                      }
                    }}
                    title={`Click to filter by ${cat.category}`}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78125rem', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                        {cat.category}
                      </span>
                      <span style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: cat.percentage >= 80 ? '#059669' : cat.percentage >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        {cat.checked}/{cat.total} ({cat.percentage}%)
                      </span>
                    </div>

                    {/* Mini Visual Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div
                        style={{
                          width: `${cat.percentage}%`,
                          height: '100%',
                          backgroundColor: cat.percentage >= 80 ? '#10b981' : cat.percentage >= 50 ? '#f59e0b' : '#ef4444',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stakeholder Compliance Status Overview (Recharts Pie Chart) */}
      {showStatusPieChart && (
        <ComplianceStatusPieChart
          items={requirements}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          title="Project Compliance Requirements Status (Recharts)"
          subtitle="Stakeholder status distribution overview across statutory criteria (Compliant, Non-compliant, In Progress). Click any slice or filter button to filter the checklist below."
          showSummaryCards={false}
          showFilterButtons={true}
        />
      )}

      {/* Category Filter Pills Navigation Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '14px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FilterIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Filter by Assurance Category
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              ({categories.length} categories)
            </span>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d70b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              Reset to All Categories ✕
            </button>
          )}
        </div>

        {/* Category Pills List */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center'
        }}>
          {/* All Categories Pill */}
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: `1.5px solid ${selectedCategory === 'ALL' ? '#1d70b8' : '#e2e8f0'}`,
              backgroundColor: selectedCategory === 'ALL' ? '#1d70b8' : '#ffffff',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#334155',
              fontSize: '0.8125rem',
              fontWeight: selectedCategory === 'ALL' ? 700 : 500,
              cursor: 'pointer',
              boxShadow: selectedCategory === 'ALL' ? '0 2px 4px rgba(29, 112, 184, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>All Categories</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: selectedCategory === 'ALL' ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#475569'
            }}>
              {categoryCounts['ALL'] || requirements.length}
            </span>
          </button>

          {/* Individual Category Pills */}
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            const breakdown = categoryBreakdown.find(b => b.category === cat);
            const isCompleted = breakdown && breakdown.total > 0 && breakdown.checked === breakdown.total;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: `1.5px solid ${isSelected ? '#1d70b8' : '#e2e8f0'}`,
                  backgroundColor: isSelected ? '#1d70b8' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 4px rgba(29, 112, 184, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isCompleted && (
                  <span style={{ color: isSelected ? '#ffffff' : '#10b981', fontSize: '0.75rem' }}>✓</span>
                )}
                <span>{cat}</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode Switcher: Requirements Checklist vs Status Transition Timeline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        padding: '6px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveView('checklist')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeView === 'checklist' ? '#ffffff' : 'transparent',
              color: activeView === 'checklist' ? '#0f172a' : '#64748b',
              fontWeight: activeView === 'checklist' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeView === 'checklist' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <VerifiedIcon style={{ fontSize: '1rem', color: activeView === 'checklist' ? '#1d70b8' : '#94a3b8' }} />
            <span>Requirements Checklist</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: activeView === 'checklist' ? '#eff6ff' : '#e2e8f0',
              color: activeView === 'checklist' ? '#1d4ed8' : '#64748b',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {requirements.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('timeline');
              if (!selectedTimelineItem && requirements.length > 0) {
                setSelectedTimelineItem(requirements[0]);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeView === 'timeline' ? '#ffffff' : 'transparent',
              color: activeView === 'timeline' ? '#0f172a' : '#64748b',
              fontWeight: activeView === 'timeline' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeView === 'timeline' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <TimelineIcon style={{ fontSize: '1rem', color: activeView === 'timeline' ? '#1d70b8' : '#94a3b8' }} />
            <span>Status Transition Timeline</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: activeView === 'timeline' ? '#eff6ff' : '#e2e8f0',
              color: activeView === 'timeline' ? '#1d4ed8' : '#64748b'
            }}>
              Audit Trail
            </span>
          </button>

          <button
            onClick={() => setActiveView('activity')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeView === 'activity' ? '#ffffff' : 'transparent',
              color: activeView === 'activity' ? '#0f172a' : '#64748b',
              fontWeight: activeView === 'activity' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeView === 'activity' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ActivityFeedIcon style={{ fontSize: '1rem', color: activeView === 'activity' ? '#1d70b8' : '#94a3b8' }} />
            <span>Global Activity Feed</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: activeView === 'activity' ? '#ecfdf5' : '#e2e8f0',
              color: activeView === 'activity' ? '#065f46' : '#64748b',
              fontWeight: 700
            }}>
              Live Feed
            </span>
          </button>
        </div>

        {activeView === 'timeline' && selectedTimelineItem && (
          <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Active Item:</span>
            <strong style={{ color: '#1d70b8', fontFamily: 'monospace' }}>{selectedTimelineItem.code}</strong>
            <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ({selectedTimelineItem.title})
            </span>
          </div>
        )}
      </div>

      {activeView === 'activity' ? (
        <GlobalActivityFeed
          projectName={projectName}
          currentGate={selectedGate === 'ALL' ? currentGate : selectedGate}
          currentUser={{
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email
          }}
          onNavigateToItem={(itemId, itemCode) => {
            setActiveView('checklist');
            if (itemCode) setSearchQuery(itemCode);
            setExpandedIds(prev => ({ ...prev, [itemId]: true }));
          }}
          mode="embedded"
        />
      ) : activeView === 'timeline' ? (
        <ComplianceTransitionTimeline
          selectedItem={selectedTimelineItem}
          allItems={requirements}
          onSelectItem={setSelectedTimelineItem}
          onStatusTransition={async (item, newStatus, notes, trigger, docRef) => {
            await handleChangeStatus(item, newStatus, notes, trigger, docRef);
          }}
          currentUser={{
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email
          }}
          mode="embedded"
        />
      ) : (
        <>
          {/* Advanced Search Bar & Multi-Criteria Controls */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px 18px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Main Search Bar Row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          {/* Prominent Search Input with Keyboard Shortcut & Clear Button */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <SearchIcon style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#1d70b8',
              fontSize: '1.25rem'
            }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by code (e.g. FIN-01), title, description, evidence, notes, priority..."
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 70px 9px 40px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
            />
            {/* Clear Button & Shortcut Badge inside Input */}
            <div style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {searchQuery ? (
                <button
                  onClick={() => {
                    handleClearSearch();
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search query"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CloseIcon style={{ fontSize: '1.1rem' }} />
                </button>
              ) : (
                <kbd style={{
                  fontSize: '0.675rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#94a3b8'
                }}>
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Gate Selector */}
          <div style={{ minWidth: '135px' }}>
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              style={{
                width: '100%',
                padding: '8.5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.825rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <option value="ALL">All Gateways</option>
              <option value="GATE_1">Gate 1: Justification</option>
              <option value="GATE_2">Gate 2: Delivery Strategy</option>
              <option value="GATE_3">Gate 3: Investment</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '8.5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.825rem',
                backgroundColor: '#ffffff',
                color: selectedPriority === 'Critical' ? '#dc2626' : '#1e293b',
                cursor: 'pointer',
                fontWeight: selectedPriority !== 'ALL' ? 700 : 500
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '145px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8.5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.825rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="CHECKED">Formally Verified (✓ Checked)</option>
              <option value="UNCHECKED">Pending Verification (Unchecked)</option>
              <option value="Compliant">Compliant</option>
              <option value="In Progress">In Progress</option>
              <option value="Flagged">Flagged Deficit</option>
            </select>
          </div>

          {/* Project Member Assignee Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Assignee:</span>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.8125rem',
                backgroundColor: '#ffffff',
                color: '#1f2937',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {defaultTeamMembers.map(m => (
                <option key={m.id} value={m.name}>{m.name} ({m.role.split(' ')[0]})</option>
              ))}
            </select>
          </div>

          {/* Deadline / Due Date Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: selectedDeadlineFilter === 'URGENT' ? '#dc2626' : '#64748b' }}>
              Deadline:
            </span>
            <select
              value={selectedDeadlineFilter}
              onChange={(e) => setSelectedDeadlineFilter(e.target.value as any)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: `1.5px solid ${selectedDeadlineFilter === 'URGENT' ? '#ef4444' : selectedDeadlineFilter === 'OVERDUE' ? '#b91c1c' : '#d1d5db'}`,
                fontSize: '0.8125rem',
                backgroundColor: selectedDeadlineFilter === 'URGENT' ? '#fef2f2' : selectedDeadlineFilter === 'OVERDUE' ? '#fff1f2' : '#ffffff',
                color: selectedDeadlineFilter === 'URGENT' ? '#b91c1c' : selectedDeadlineFilter === 'OVERDUE' ? '#991b1b' : '#1f2937',
                fontWeight: selectedDeadlineFilter !== 'ALL' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Deadlines</option>
              <option value="URGENT">⚠️ Due in ≤ 3 Days ({metrics.urgentDeadlineCount})</option>
              <option value="OVERDUE">🚨 Overdue ({metrics.overdueCount})</option>
              <option value="DUE_SOON">⌛ Due in 1-3 Days ({metrics.dueSoonCount})</option>
              <option value="SCHEDULED">📅 Has Target Deadline ({metrics.totalWithDeadline})</option>
              <option value="NO_DEADLINE">⊘ Unscheduled (No Deadline)</option>
            </select>
          </div>

          {/* Prominent Quick Due in <= 3 Days Warning Filter Button */}
          <button
            onClick={() => setSelectedDeadlineFilter(selectedDeadlineFilter === 'URGENT' ? 'ALL' : 'URGENT')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1.5px solid ${selectedDeadlineFilter === 'URGENT' ? '#ef4444' : metrics.urgentDeadlineCount > 0 ? '#fca5a5' : '#cbd5e1'}`,
              backgroundColor: selectedDeadlineFilter === 'URGENT' ? '#fef2f2' : metrics.urgentDeadlineCount > 0 ? '#fffaf9' : '#ffffff',
              color: selectedDeadlineFilter === 'URGENT' ? '#b91c1c' : metrics.urgentDeadlineCount > 0 ? '#dc2626' : '#475569',
              fontSize: '0.8125rem',
              fontWeight: selectedDeadlineFilter === 'URGENT' ? 700 : 600,
              cursor: 'pointer',
              boxShadow: selectedDeadlineFilter === 'URGENT' ? '0 1px 4px rgba(220, 38, 38, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Filter checklist to requirements due within 3 days or overdue"
          >
            <WarningAmberIcon style={{ fontSize: '1rem', color: metrics.urgentDeadlineCount > 0 ? '#dc2626' : '#94a3b8' }} />
            <span>Due in ≤ 3 Days</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: selectedDeadlineFilter === 'URGENT' ? '#fee2e2' : metrics.urgentDeadlineCount > 0 ? '#fecaca' : '#f1f5f9',
              color: selectedDeadlineFilter === 'URGENT' ? '#991b1b' : metrics.urgentDeadlineCount > 0 ? '#b91c1c' : '#64748b'
            }}>
              {metrics.urgentDeadlineCount}
            </span>
          </button>

          {/* My Verified Items Toggle Pill */}
          <button
            onClick={() => setOnlyMyChecked(!onlyMyChecked)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${onlyMyChecked ? '#8b5cf6' : '#cbd5e1'}`,
              backgroundColor: onlyMyChecked ? '#f5f3ff' : '#ffffff',
              color: onlyMyChecked ? '#6d28d9' : '#475569',
              fontSize: '0.8125rem',
              fontWeight: onlyMyChecked ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <VerifiedIcon style={{ fontSize: '0.95rem', color: onlyMyChecked ? '#7c3aed' : '#94a3b8' }} />
            <span>My Audits</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '6px',
              backgroundColor: onlyMyChecked ? '#ede9fe' : '#f1f5f9',
              color: onlyMyChecked ? '#6d28d9' : '#64748b'
            }}>
              {metrics.myCheckedCount}
            </span>
          </button>
        </div>

        {/* Quick Suggestion Tags Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          paddingTop: '6px',
          borderTop: '1px dashed #f1f5f9'
        }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
            Quick Filters:
          </span>
          <button
            onClick={() => { setSelectedDeadlineFilter(selectedDeadlineFilter === 'URGENT' ? 'ALL' : 'URGENT'); }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: selectedDeadlineFilter === 'URGENT' ? '#fee2e2' : '#fff5f5',
              border: '1.5px solid #fca5a5',
              color: '#dc2626',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <WarningAmberIcon style={{ fontSize: '0.85rem' }} />
            <span>⚠️ Due in ≤ 3 Days ({metrics.urgentDeadlineCount})</span>
          </button>
          <button
            onClick={() => { setSelectedPriority('Critical'); }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: selectedPriority === 'Critical' ? '#fee2e2' : '#f8fafc',
              border: '1px solid #fecaca',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            🔥 Critical Priorities
          </button>
          <button
            onClick={() => { setSelectedStatus('Flagged'); }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: selectedStatus === 'Flagged' ? '#fee2e2' : '#f8fafc',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              cursor: 'pointer'
            }}
          >
            ⚠️ Flagged Deficits
          </button>
          <button
            onClick={() => { setSelectedDeadlineFilter(selectedDeadlineFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE'); }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: selectedDeadlineFilter === 'OVERDUE' ? '#fee2e2' : '#f8fafc',
              border: '1px solid #fecaca',
              color: '#991b1b',
              cursor: 'pointer'
            }}
          >
            🚨 Overdue ({metrics.overdueCount})
          </button>
          <button
            onClick={() => { setSelectedStatus('UNCHECKED'); }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: selectedStatus === 'UNCHECKED' ? '#fef3c7' : '#f8fafc',
              border: '1px solid #fde68a',
              color: '#b45309',
              cursor: 'pointer'
            }}
          >
            ⏳ Pending Verification
          </button>
          <button
            onClick={() => { setSelectedStatus('Compliant'); }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: selectedStatus === 'Compliant' ? '#d1fae5' : '#f8fafc',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              cursor: 'pointer'
            }}
          >
            ✓ Compliant Items
          </button>
          <button
            onClick={() => setSearchQuery('Treasury')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: searchQuery === 'Treasury' ? '#e0f2fe' : '#f8fafc',
              border: '1px solid #bae6fd',
              color: '#0369a1',
              cursor: 'pointer'
            }}
          >
            🏛 Treasury Green Book
          </button>
        </div>

        {/* Active Filters Summary Strip & Results Counter */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9'
        }}>
          {/* Hit Counter & Active Criteria Capsules */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
              Showing {filteredRequirements.length} of {requirements.length} requirements
            </span>

            {/* Active Criteria Badges */}
            {searchQuery && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Search: &quot;{searchQuery}&quot;
                <CloseIcon onClick={handleClearSearch} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
            {selectedCategory !== 'ALL' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Category: {selectedCategory}
                <CloseIcon onClick={() => setSelectedCategory('ALL')} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
            {selectedGate !== 'ALL' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Gate: {selectedGate}
                <CloseIcon onClick={() => setSelectedGate('ALL')} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
            {selectedPriority !== 'ALL' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: selectedPriority === 'Critical' ? '#fee2e2' : '#fef3c7',
                color: selectedPriority === 'Critical' ? '#b91c1c' : '#b45309',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Priority: {selectedPriority}
                <CloseIcon onClick={() => setSelectedPriority('ALL')} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Status: {selectedStatus}
                <CloseIcon onClick={() => setSelectedStatus('ALL')} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
            {onlyMyChecked && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: '#ede9fe',
                color: '#6d28d9',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                My Audits Only
                <CloseIcon onClick={() => setOnlyMyChecked(false)} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
            {selectedAssignee !== 'ALL' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Assignee: {selectedAssignee === 'UNASSIGNED' ? 'Unassigned' : selectedAssignee}
                <CloseIcon onClick={() => setSelectedAssignee('ALL')} style={{ fontSize: '0.85rem', cursor: 'pointer' }} />
              </span>
            )}
          </div>

          {/* Clear All Filters Button */}
          {(searchQuery || selectedGate !== 'ALL' || selectedCategory !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL' || selectedAssignee !== 'ALL' || onlyMyChecked) && (
            <button
              onClick={() => {
                setSearchQuery('');
                clearGlobalSearch();
                setSelectedGate('ALL');
                setSelectedCategory('ALL');
                setSelectedPriority('ALL');
                setSelectedStatus('ALL');
                setSelectedAssignee('ALL');
                setOnlyMyChecked(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              <ResetIcon style={{ fontSize: '0.85rem' }} />
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          MULTI-SELECT & BULK OPERATIONS COMMAND BAR
         ======================================================== */}
      <div style={{
        marginBottom: '14px',
        borderRadius: '8px',
        border: selectedItemIds.size > 0 ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
        backgroundColor: selectedItemIds.size > 0 ? '#f0f7ff' : '#f8fafc',
        padding: '10px 16px',
        transition: 'all 0.2s ease',
        boxShadow: selectedItemIds.size > 0 ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Left: Select All Checkbox & Count Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#1e293b',
                userSelect: 'none'
              }}
              title={
                selectedItemIds.size === filteredRequirements.length && filteredRequirements.length > 0
                  ? 'Deselect all filtered requirements'
                  : `Select all ${filteredRequirements.length} filtered requirements`
              }
            >
              <input
                type="checkbox"
                checked={filteredRequirements.length > 0 && selectedItemIds.size === filteredRequirements.length}
                ref={(input) => {
                  if (input) {
                    input.indeterminate =
                      selectedItemIds.size > 0 && selectedItemIds.size < filteredRequirements.length;
                  }
                }}
                onChange={handleSelectAllFiltered}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#1d70b8' }}
              />
              <span>
                {selectedItemIds.size === 0
                  ? `Select All (${filteredRequirements.length} requirements)`
                  : `${selectedItemIds.size} of ${filteredRequirements.length} Selected`}
              </span>
            </label>

            {selectedItemIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Right: Bulk Action Controls */}
          {selectedItemIds.size > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                Bulk Actions:
              </span>

              {/* Bulk Status Update Dropdown Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsBulkStatusDropdownOpen(!isBulkStatusDropdownOpen);
                    setIsBulkAssignDropdownOpen(false);
                  }}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#1d70b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: isBulkProcessing ? 'wait' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <span>Update Status ({selectedItemIds.size})</span>
                  <DropdownArrowIcon style={{ fontSize: '1rem' }} />
                </button>

                {isBulkStatusDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 100,
                    minWidth: '200px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                      SET STATUS FOR {selectedItemIds.size} ITEMS
                    </div>
                    <button
                      onClick={() => handleBulkStatusUpdate('Compliant')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: '#065f46',
                        fontWeight: 600
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <CheckCircleIcon style={{ fontSize: '1rem', color: '#10b981' }} />
                      <span>✓ Compliant</span>
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('In Progress')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: '#92400e',
                        fontWeight: 600
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef3c7')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <PendingIcon style={{ fontSize: '1rem', color: '#f59e0b' }} />
                      <span>⌛ In Progress</span>
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('Flagged')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: '#991b1b',
                        fontWeight: 600
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <WarningIcon style={{ fontSize: '1rem', color: '#ef4444' }} />
                      <span>⚠️ Flagged Deficit</span>
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('N/A')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: '#475569',
                        fontWeight: 600
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <BlockIcon style={{ fontSize: '1rem', color: '#94a3b8' }} />
                      <span>⊘ N/A</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Assign Project Member Dropdown Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsBulkAssignDropdownOpen(!isBulkAssignDropdownOpen);
                    setIsBulkStatusDropdownOpen(false);
                  }}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#ffffff',
                    color: '#1e3a8a',
                    border: '1.5px solid #93c5fd',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: isBulkProcessing ? 'wait' : 'pointer'
                  }}
                >
                  <AssignIcon style={{ fontSize: '1rem', color: '#2563eb' }} />
                  <span>Assign Member</span>
                  <DropdownArrowIcon style={{ fontSize: '1rem' }} />
                </button>

                {isBulkAssignDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 100,
                    width: '320px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                      ASSIGN {selectedItemIds.size} REQUIREMENTS TO
                    </div>
                    {defaultTeamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleBulkAssign(member)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f8fafc'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: member.avatarColor || '#1d70b8',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.role}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => handleBulkAssign(null)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <CloseIcon style={{ fontSize: '0.95rem' }} />
                      <span>Remove Assignment / Unassign</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Set Target Due Date Dropdown Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsBulkDateDropdownOpen(!isBulkDateDropdownOpen);
                    setIsBulkStatusDropdownOpen(false);
                    setIsBulkAssignDropdownOpen(false);
                  }}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#ffffff',
                    color: '#1e3a8a',
                    border: '1.5px solid #93c5fd',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: isBulkProcessing ? 'wait' : 'pointer'
                  }}
                >
                  <CalendarIcon style={{ fontSize: '1rem', color: '#2563eb' }} />
                  <span>Set Due Date</span>
                  <DropdownArrowIcon style={{ fontSize: '1rem' }} />
                </button>

                {isBulkDateDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 100,
                    width: '280px',
                    padding: '12px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ paddingBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' }}>
                      SCHEDULE DEADLINE FOR {selectedItemIds.size} REQUIREMENTS
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <input
                        type="date"
                        value={bulkDueDateInput}
                        onChange={(e) => setBulkDueDateInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                      <button
                        onClick={() => handleBulkDueDate(getPresetDueDate(2))}
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ⚠️ In 2 Days
                      </button>
                      <button
                        onClick={() => handleBulkDueDate(getPresetDueDate(7))}
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        📅 In 7 Days
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          if (bulkDueDateInput) {
                            handleBulkDueDate(bulkDueDateInput);
                          }
                        }}
                        disabled={!bulkDueDateInput}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          backgroundColor: bulkDueDateInput ? '#2563eb' : '#94a3b8',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: bulkDueDateInput ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Apply Date
                      </button>
                      <button
                        onClick={() => handleBulkDueDate(null)}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: '#fff',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Verify Button */}
              <button
                onClick={() => handleBulkCheckToggle(true)}
                disabled={isBulkProcessing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isBulkProcessing ? 'wait' : 'pointer'
                }}
                title="Mark all selected items as verified and compliant"
              >
                <span>✓ Verify All</span>
              </button>

              {/* Bulk Export Selected (CSV / PDF) */}
              <button
                onClick={() => {
                  const selectedList = requirements.filter(r => selectedItemIds.has(r.id));
                  handleExportCsvReport(selectedList, `Selected Requirements (${selectedList.length})`);
                }}
                disabled={isExportingCsv}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isExportingCsv ? 'wait' : 'pointer'
                }}
                title="Export selected requirements as CSV document"
              >
                <TableChartIcon style={{ fontSize: '0.95rem', color: '#16a34a' }} />
                <span>CSV ({selectedItemIds.size})</span>
              </button>

              <button
                onClick={() => {
                  const selectedList = requirements.filter(r => selectedItemIds.has(r.id));
                  handleExportPdfReport(selectedList, `Selected Requirements (${selectedList.length})`);
                }}
                disabled={isExportingPdf}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isExportingPdf ? 'wait' : 'pointer'
                }}
                title="Export selected requirements as formal stakeholder PDF report"
              >
                <PdfIcon style={{ fontSize: '0.95rem', color: '#dc2626' }} />
                <span>PDF ({selectedItemIds.size})</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', color: '#64748b' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
              <span>Select checkboxes on items to apply bulk status changes or assign project members.</span>
            </div>
          )}
        </div>

        {/* Bulk Operation Feedback / Toast Notification */}
        {bulkNotification && (
          <div style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#166534',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{bulkNotification}</span>
            <CloseIcon
              onClick={() => setBulkNotification(null)}
              style={{ fontSize: '0.9rem', cursor: 'pointer', color: '#166534' }}
            />
          </div>
        )}
      </div>

      {/* Requirement List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
          Subscribing to Cloud Firestore collection <code>compliance_requirements</code>...
        </div>
      ) : error && requirements.length === 0 ? (
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', marginBottom: '16px' }}>
          <strong>Error loading requirements:</strong> {error}
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
          <p style={{ color: '#6b7280', margin: '0 0 12px 0' }}>No compliance requirements match your filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGate('ALL');
              setSelectedCategory('ALL');
              setSelectedPriority('ALL');
              setSelectedStatus('ALL');
              setOnlyMyChecked(false);
            }}
            style={{
              padding: '6px 14px',
              backgroundColor: '#005ea5',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRequirements.map(req => {
            const isExpanded = !!expandedIds[req.id];
            const isSaving = !!savingItemIds[req.id];
            const isSelected = selectedItemIds.has(req.id);
            const isCheckedByMe =
              req.isChecked &&
              (req.checkedBy === currentUser.email ||
                req.checkedBy === currentUser.name ||
                req.checkedByUserId === currentUser.id);

            return (
              <div
                key={req.id}
                style={{
                  border: isSelected
                    ? '1.5px solid #2563eb'
                    : `1px solid ${req.status === 'Flagged' ? '#fca5a5' : req.isChecked ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: isSelected
                    ? '#f8faff'
                    : req.isChecked ? '#fafffd' : req.status === 'Flagged' ? '#fffaf9' : '#ffffff',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                  boxShadow: isSelected
                    ? '0 0 0 1px #2563eb, 0 4px 14px rgba(37, 99, 235, 0.08)'
                    : isExpanded ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
                  overflow: 'hidden'
                }}
              >
                {/* Main Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  {/* Multi-Select Checkbox for Bulk Operations */}
                  <div
                    onClick={(e) => toggleSelectItem(req.id, e)}
                    title={isSelected ? `Deselect ${req.code}` : `Select ${req.code} for bulk operations`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '2px',
                      flexShrink: 0
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(req.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#1d70b8'
                      }}
                      aria-label={`Select requirement ${req.code}`}
                    />
                  </div>

                  {/* Checkbox Check-Off Button - directly persists in Firestore */}
                  <div
                    onClick={() => handleToggleCheck(req)}
                    title={req.isChecked ? "Click to uncheck (syncs to Firestore)" : "Check off as Compliant (persists to Firestore)"}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '5px',
                      border: `2px solid ${req.isChecked ? '#10b981' : '#9ca3af'}`,
                      backgroundColor: req.isChecked ? '#10b981' : '#ffffff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {req.isChecked && (
                      <span style={{ color: '#ffffff', fontSize: '15px', fontWeight: 800 }}>✓</span>
                    )}
                  </div>

                  {/* Requirement Code & Gate */}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#1e3a8a',
                      letterSpacing: '0.5px'
                    }}>
                      {req.code}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: '#6b7280', fontWeight: 500 }}>
                      {req.gate} • {req.category}
                    </span>
                  </div>

                  {/* Title and Short Description */}
                  <div style={{ flex: '1 1 300px', cursor: 'pointer' }} onClick={() => toggleExpand(req.id)}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: req.isChecked ? '#065f46' : '#111827'
                    }}>
                      {req.title}
                    </div>
                    <div style={{
                      fontSize: '0.825rem',
                      color: '#4b5563',
                      marginTop: '2px',
                      display: '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'unset' : 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {req.description}
                    </div>

                    {/* Check-Off Attribution Line */}
                    {req.isChecked && (
                      <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓ Verified by <strong>{req.checkedBy || req.auditorName || 'Auditor'}</strong></span>
                        {req.auditedAt && (
                          <span>• {new Date(req.auditedAt).toLocaleDateString()}</span>
                        )}
                        {isCheckedByMe && (
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, fontSize: '0.68rem' }}>
                            You
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: req.priority === 'Critical' ? '#fee2e2' : req.priority === 'High' ? '#ffedd5' : '#f1f5f9',
                      color: req.priority === 'Critical' ? '#991b1b' : req.priority === 'High' ? '#c2410c' : '#475569'
                    }}>
                      {req.priority}
                    </span>
                  </div>

                  {/* Assigned Member Badge & Popover */}
                  <div style={{ flexShrink: 0, position: 'relative' }}>
                    {req.assignedTo ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickAssignItemId(quickAssignItemId === req.id ? null : req.id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Assigned to ${req.assignedTo} (${req.assignedToRole || 'Project Team'}). Click to reassign.`}
                      >
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#1d70b8',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.625rem',
                          fontWeight: 700
                        }}>
                          {req.assignedTo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                        <span>{req.assignedTo.split(' ')[0]} {req.assignedTo.split(' ')[1]?.[0] ? `${req.assignedTo.split(' ')[1][0]}.` : ''}</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickAssignItemId(quickAssignItemId === req.id ? null : req.id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          color: '#64748b',
                          fontSize: '0.725rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        title="Click to assign a project member"
                      >
                        <AssignIcon style={{ fontSize: '0.85rem', color: '#94a3b8' }} />
                        <span>Assign</span>
                      </button>
                    )}

                    {/* Quick Assign Dropdown for this item */}
                    {quickAssignItemId === req.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          border: '1px solid #e2e8f0',
                          zIndex: 110,
                          width: '280px',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                          ASSIGN REQUIREMENT {req.code}
                        </div>
                        {defaultTeamMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleSingleItemAssign(req.id, member)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              border: 'none',
                              background: req.assignedTo === member.name ? '#f0fdf4' : 'none',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f8fafc'
                            }}
                            onMouseEnter={(e) => {
                              if (req.assignedTo !== member.name) e.currentTarget.style.backgroundColor = '#f0f9ff';
                            }}
                            onMouseLeave={(e) => {
                              if (req.assignedTo !== member.name) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: member.avatarColor || '#1d70b8',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 700
                            }}>
                              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                                {member.name} {req.assignedTo === member.name ? '✓' : ''}
                              </div>
                              <div style={{ fontSize: '0.675rem', color: '#6b7280' }}>
                                {member.role}
                              </div>
                            </div>
                          </button>
                        ))}
                        {req.assignedTo && (
                          <button
                            onClick={() => handleSingleItemAssign(req.id, null)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#dc2626',
                              fontSize: '0.775rem',
                              fontWeight: 600
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <CloseIcon style={{ fontSize: '0.9rem' }} />
                            <span>Remove Assignment</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ flexShrink: 0 }}>
                    <select
                      value={req.status}
                      onChange={(e) => handleChangeStatus(req, e.target.value as any)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: req.status === 'Compliant' ? '#10b981' : req.status === 'Flagged' ? '#ef4444' : '#f59e0b',
                        backgroundColor: req.status === 'Compliant' ? '#dcfce7' : req.status === 'Flagged' ? '#fee2e2' : '#fef3c7',
                        color: req.status === 'Compliant' ? '#166534' : req.status === 'Flagged' ? '#991b1b' : '#92400e',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Compliant">✓ Compliant</option>
                      <option value="In Progress">⌛ In Progress</option>
                      <option value="Flagged">⚠️ Flagged</option>
                      <option value="N/A">⊘ N/A</option>
                    </select>
                  </div>

                  {/* View Status Transition Timeline Button */}
                  <button
                    onClick={() => {
                      setSelectedTimelineItem(req);
                      setIsTimelineDrawerOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#1d70b8',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    title={`View status transition timeline history for ${req.code}`}
                  >
                    <TimelineIcon style={{ fontSize: '0.95rem' }} />
                    <span>Timeline</span>
                  </button>

                  {/* Threaded Discussion Button */}
                  <button
                    onClick={() => {
                      setSelectedCommentsItem(req);
                      setIsCommentsDrawerOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: (itemCommentCounts[req.id] || 0) > 0 ? '#f0fdf4' : '#ffffff',
                      color: (itemCommentCounts[req.id] || 0) > 0 ? '#15803d' : '#475569',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    title={`View or participate in threaded team discussion for ${req.code}`}
                  >
                    <CommentIcon style={{ fontSize: '0.95rem', color: (itemCommentCounts[req.id] || 0) > 0 ? '#16a34a' : '#64748b' }} />
                    <span>Discussion</span>
                    {(itemCommentCounts[req.id] || 0) > 0 && (
                      <span
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          padding: '0px 5px',
                          borderRadius: '10px',
                          fontSize: '0.675rem',
                          fontWeight: 700
                        }}
                      >
                        {itemCommentCounts[req.id]}
                      </span>
                    )}
                  </button>

                  {/* Expand / Collapse Button */}
                  <button
                    onClick={() => toggleExpand(req.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={isExpanded ? "Collapse Details" : "Expand Audit Details"}
                  >
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </button>
                </div>

                {/* Expanded Detailed Audit Drawer */}
                {isExpanded && (
                  <div style={{
                    padding: '16px 20px',
                    backgroundColor: '#fafaf9',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      {/* Evidence Threshold */}
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', marginBottom: '4px' }}>
                          📋 Required Evidence Threshold
                        </div>
                        <div style={{ color: '#1f2937', lineHeight: 1.45 }}>
                          {req.evidenceThreshold || 'Formal governance review documentation.'}
                        </div>
                      </div>

                      {/* Associated Document Reference */}
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', marginBottom: '4px' }}>
                          📂 Document / Assurance Reference
                        </div>
                        <div style={{ color: '#1f2937', marginBottom: '6px' }}>
                          {req.documentRef || 'Not linked to a specific bundle page.'}
                        </div>
                        <Link href="/file-viewer" prefetch={false} passHref legacyBehavior>
                          <a style={{
                            fontSize: '0.8rem',
                            color: '#005ea5',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <DocIcon style={{ fontSize: '1rem' }} /> Open Document Bundle
                          </a>
                        </Link>
                      </div>

                      {/* Assigned Project Member & Ownership */}
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>👤 Project Member Assignment</span>
                          {req.assignedAt && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#6b7280' }}>
                              Assigned {new Date(req.assignedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {req.assignedTo ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: '#1d70b8',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                flexShrink: 0
                              }}>
                                {req.assignedTo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                                  {req.assignedTo}
                                </div>
                                <div style={{ fontSize: '0.725rem', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {req.assignedToRole || 'Assurance Team Member'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#6b7280', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '6px' }}>
                            No team member currently assigned.
                          </div>
                        )}
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            value={req.assignedTo || ''}
                            onChange={(e) => {
                              const selected = defaultTeamMembers.find(m => m.name === e.target.value);
                              handleSingleItemAssign(req.id, selected || null);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              backgroundColor: '#f8fafc',
                              color: '#1e293b',
                              cursor: 'pointer',
                              flex: 1
                            }}
                          >
                            <option value="">-- Change Assignee --</option>
                            {defaultTeamMembers.map(m => (
                              <option key={m.id} value={m.name}>{m.name} ({m.role.split(' ')[0]})</option>
                            ))}
                          </select>
                          {req.assignedTo && (
                            <button
                              onClick={() => handleSingleItemAssign(req.id, null)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fff5f5',
                                color: '#dc2626',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="Clear assignee"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Auditor Notes & Findings Textarea with Debounced Auto-Save */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <NoteIcon style={{ fontSize: '1rem', color: '#1d70b8' }} />
                          Auditor Findings & Observations (Auto-Saves to Firestore)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Live Debounce Auto-Save Micro-Indicator */}
                          {itemAutoSaveStates[req.id]?.status === 'debouncing' && (
                            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                              Auto-saving in 800ms...
                            </span>
                          )}
                          {itemAutoSaveStates[req.id]?.status === 'saving' && (
                            <span style={{ fontSize: '0.75rem', color: '#1d70b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CloudSyncIcon style={{ fontSize: '0.85rem' }} />
                              Auto-saving to Firestore...
                            </span>
                          )}
                          {itemAutoSaveStates[req.id]?.status === 'saved' && (
                            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CloudDoneIcon style={{ fontSize: '0.85rem' }} />
                              Auto-saved {itemAutoSaveStates[req.id]?.lastSavedAt ? `(${itemAutoSaveStates[req.id]?.lastSavedAt})` : ''}
                            </span>
                          )}
                          {itemAutoSaveStates[req.id]?.status === 'error' && (
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                              ⚠️ Auto-save error
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {req.auditedAt ? `Verified: ${new Date(req.auditedAt).toLocaleString()}` : 'Not yet signed off'}
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={notesDrafts[req.id] !== undefined ? notesDrafts[req.id] : req.auditorNotes || ''}
                        onChange={(e) => handleNotesChange(req.id, e.target.value)}
                        onBlur={() => handleNotesBlur(req.id)}
                        placeholder="Type findings, assurance comments, or verification notes... (auto-saves after 800ms pause)"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${itemAutoSaveStates[req.id]?.status === 'debouncing' ? '#f59e0b' : itemAutoSaveStates[req.id]?.status === 'saving' ? '#3b82f6' : '#d1d5db'}`,
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          lineHeight: 1.45,
                          backgroundColor: '#ffffff',
                          transition: 'border-color 0.15s ease'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Signed off by: <strong>{req.checkedBy || req.auditorName || currentUser.name}</strong>
                          {req.updated_datetime && (
                            <span style={{ marginLeft: '6px', color: '#9ca3af' }}>
                              (Updated: {new Date(req.updated_datetime).toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                            {itemAutoSaveStates[req.id]?.status === 'debouncing'
                              ? 'Saving on pause...'
                              : itemAutoSaveStates[req.id]?.status === 'saved'
                              ? 'All edits saved to Firestore'
                              : 'Auto-save active'}
                          </span>
                          <button
                            onClick={() => {
                              const text = notesDrafts[req.id] !== undefined ? notesDrafts[req.id] : req.auditorNotes || '';
                              commitNotesToFirestore(req.id, text);
                            }}
                            disabled={itemAutoSaveStates[req.id]?.status === 'saving'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 12px',
                              backgroundColor: itemAutoSaveStates[req.id]?.status === 'saved' ? '#ecfdf5' : '#1e293b',
                              color: itemAutoSaveStates[req.id]?.status === 'saved' ? '#065f46' : '#ffffff',
                              border: `1px solid ${itemAutoSaveStates[req.id]?.status === 'saved' ? '#a7f3d0' : '#1e293b'}`,
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: itemAutoSaveStates[req.id]?.status === 'saving' ? 'wait' : 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {itemAutoSaveStates[req.id]?.status === 'saving' ? (
                              <>
                                <CloudSyncIcon style={{ fontSize: '0.9rem' }} />
                                Saving...
                              </>
                            ) : itemAutoSaveStates[req.id]?.status === 'saved' ? (
                              <>
                                <CheckCircleIcon style={{ fontSize: '0.9rem', color: '#10b981' }} />
                                Saved ✓
                              </>
                            ) : (
                              <>
                                <SaveIcon style={{ fontSize: '0.9rem' }} />
                                Save Now
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTimelineItem(req);
                              setIsTimelineDrawerOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 12px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <TimelineIcon style={{ fontSize: '0.9rem' }} />
                            <span>Timeline</span>
                          </button>

                          {/* Open Discussion Drawer Button */}
                          <button
                            onClick={() => {
                              setSelectedCommentsItem(req);
                              setIsCommentsDrawerOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 12px',
                              backgroundColor: (itemCommentCounts[req.id] || 0) > 0 ? '#f0fdf4' : '#ffffff',
                              color: (itemCommentCounts[req.id] || 0) > 0 ? '#15803d' : '#334155',
                              border: `1px solid ${(itemCommentCounts[req.id] || 0) > 0 ? '#86efac' : '#cbd5e1'}`,
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <CommentIcon style={{ fontSize: '0.9rem', color: (itemCommentCounts[req.id] || 0) > 0 ? '#16a34a' : '#64748b' }} />
                            <span>Discussion</span>
                            {(itemCommentCounts[req.id] || 0) > 0 && (
                              <span style={{ backgroundColor: '#16a34a', color: '#ffffff', padding: '0px 5px', borderRadius: '10px', fontSize: '0.675rem', fontWeight: 700 }}>
                                {itemCommentCounts[req.id]}
                              </span>
                            )}
                          </button>

                          {/* Delete bespoke requirement from Firestore */}
                          {req.id.startsWith('req_') && (
                            <button
                              onClick={() => handleDeleteRequirement(req.id, req.code)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '5px 10px',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              <DeleteIcon style={{ fontSize: '0.9rem' }} />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Embedded Threaded Team Discussion Section */}
                    <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                      <ComplianceItemComments
                        requirement={req}
                        currentUser={{
                          name: currentUser.name,
                          role: currentUser.role,
                          email: currentUser.email,
                          id: currentUser.id
                        }}
                        mode="embedded"
                        onCommentCountChange={(count) => {
                          setItemCommentCounts(prev => ({ ...prev, [req.id]: count }));
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* Switch / Edit Auditor Identity Modal */}
      {isUserModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <PersonIcon style={{ color: '#005ea5' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Set Active Reviewer Identity
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '16px' }}>
              Checked-off requirements and auditor notes will be attributed and persisted in Cloud Firestore under this profile.
            </p>

            <form onSubmit={handleUpdateAuditor}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Auditor Name
                </label>
                <input
                  type="text"
                  required
                  value={userEditName}
                  onChange={(e) => setUserEditName(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Auditor Email
                </label>
                <input
                  type="email"
                  required
                  value={userEditEmail}
                  onChange={(e) => setUserEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Role / Specialism
                </label>
                <select
                  value={userEditRole}
                  onChange={(e) => setUserEditRole(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff' }}
                >
                  <option value="Lead Assurance Reviewer">Lead Assurance Reviewer</option>
                  <option value="Lead Cost Estimator">Lead Cost Estimator</option>
                  <option value="Commercial Specialist">Commercial Specialist</option>
                  <option value="Senior Responsible Owner">Senior Responsible Owner</option>
                  <option value="Environmental & PAS 2080 Auditor">Environmental & PAS 2080 Auditor</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#005ea5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Requirement Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 12px 0' }}>
              Add Bespoke Compliance Requirement
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '20px' }}>
              Define a project-specific compliance requirement. It will be stored and tracked in Cloud Firestore in real time.
            </p>

            <form onSubmit={handleCreateRequirement}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Requirement Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IPA-G2-CUS-01"
                    value={newReqForm.code}
                    onChange={(e) => setNewReqForm({ ...newReqForm, code: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Gateway Stage *
                  </label>
                  <select
                    value={newReqForm.gate}
                    onChange={(e) => setNewReqForm({ ...newReqForm, gate: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff' }}
                  >
                    <option value="GATE_1">Gate 1: Justification</option>
                    <option value="GATE_2">Gate 2: Delivery Strategy</option>
                    <option value="GATE_3">Gate 3: Investment Decision</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={newReqForm.category}
                    onChange={(e) => setNewReqForm({ ...newReqForm, category: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff' }}
                  >
                    <option value="Financial">Financial</option>
                    <option value="Risk Management">Risk Management</option>
                    <option value="Delivery Capability">Delivery Capability</option>
                    <option value="Governance & Procurement">Governance & Procurement</option>
                    <option value="Regulatory & Environmental">Regulatory & Environmental</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    value={newReqForm.priority}
                    onChange={(e) => setNewReqForm({ ...newReqForm, priority: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff' }}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Requirement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Planning Permission Condition 14 Compliance"
                  value={newReqForm.title}
                  onChange={(e) => setNewReqForm({ ...newReqForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Detailed Description
                </label>
                <textarea
                  rows={2}
                  placeholder="State the regulatory or assurance intent..."
                  value={newReqForm.description}
                  onChange={(e) => setNewReqForm({ ...newReqForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Required Evidence Threshold
                </label>
                <input
                  type="text"
                  placeholder="e.g. Signed letter from Local Planning Authority (LPA)"
                  value={newReqForm.evidenceThreshold}
                  onChange={(e) => setNewReqForm({ ...newReqForm, evidenceThreshold: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#005ea5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save to Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Stakeholder Compliance Dossier Modal */}
      {isExportModalOpen && (() => {
        const activeTargetList =
          exportModalScope === 'selected'
            ? requirements.filter(r => selectedItemIds.has(r.id))
            : exportModalScope === 'all'
            ? requirements
            : filteredRequirements;

        const activeTargetScopeLabel =
          exportModalScope === 'selected'
            ? `Selected Requirements (${activeTargetList.length})`
            : exportModalScope === 'all'
            ? `All Gateway Requirements (${activeTargetList.length})`
            : `Current View (${activeTargetList.length} of ${requirements.length})`;

        const compliantCount = activeTargetList.filter(r => r.status === 'Compliant').length;
        const inProgressCount = activeTargetList.filter(r => r.status === 'In Progress').length;
        const flaggedCount = activeTargetList.filter(r => r.status === 'Flagged').length;
        const verifiedCount = activeTargetList.filter(r => r.isChecked).length;
        const fulfillmentPct = activeTargetList.length > 0 ? Math.round((verifiedCount / activeTargetList.length) * 100) : 0;

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#1d70b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <DownloadIcon style={{ fontSize: '1.25rem' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                      Export Compliance Dossier
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Publication-grade stakeholder reporting for {currentGate.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                >
                  <CloseIcon style={{ fontSize: '1.2rem' }} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px' }}>
                {/* 1. Scope Selection */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                    1. Select Export Scope
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Option: Current Filtered View */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: exportModalScope === 'current' ? '2px solid #1d70b8' : '1px solid #cbd5e1',
                      backgroundColor: exportModalScope === 'current' ? '#f0f7ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportModalScope === 'current'}
                        onChange={() => setExportModalScope('current')}
                        style={{ marginTop: '3px', accentColor: '#1d70b8' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                            Current Filtered View
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1'
                          }}>
                            {filteredRequirements.length} Requirements
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                          Exports only the items matching your current filters and search query.
                        </p>
                        {filteredRequirements.length !== requirements.length && (
                          <div style={{ marginTop: '6px', fontSize: '0.73rem', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                            Active Filters: {getFilterSummaryString()}
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option: Selected Only */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: exportModalScope === 'selected' ? '2px solid #1d70b8' : '1px solid #cbd5e1',
                      backgroundColor: exportModalScope === 'selected' ? '#f0f7ff' : '#ffffff',
                      cursor: selectedItemIds.size > 0 ? 'pointer' : 'not-allowed',
                      opacity: selectedItemIds.size > 0 ? 1 : 0.6,
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="exportScope"
                        disabled={selectedItemIds.size === 0}
                        checked={exportModalScope === 'selected'}
                        onChange={() => setExportModalScope('selected')}
                        style={{ marginTop: '3px', accentColor: '#1d70b8' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                            Selected Requirements Only
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: selectedItemIds.size > 0 ? '#ecfdf5' : '#f1f5f9',
                            color: selectedItemIds.size > 0 ? '#047857' : '#94a3b8'
                          }}>
                            {selectedItemIds.size} Selected
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                          {selectedItemIds.size > 0
                            ? `Exports the ${selectedItemIds.size} requirements checked off in the requirements list.`
                            : 'No requirements currently selected with checkboxes.'}
                        </p>
                      </div>
                    </label>

                    {/* Option: All Requirements */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: exportModalScope === 'all' ? '2px solid #1d70b8' : '1px solid #cbd5e1',
                      backgroundColor: exportModalScope === 'all' ? '#f0f7ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportModalScope === 'all'}
                        onChange={() => setExportModalScope('all')}
                        style={{ marginTop: '3px', accentColor: '#1d70b8' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                            All Gateway Requirements (Full Dossier)
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155'
                          }}>
                            {requirements.length} Requirements
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                          Exports complete compliance register across all categories and review stages.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 2. Scope Statistics Summary Card */}
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '22px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                      INCLUDED IN EXPORT: {activeTargetList.length} REQUIREMENTS
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: fulfillmentPct >= 80 ? '#059669' : '#d97706' }}>
                      {fulfillmentPct}% Verified
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{activeTargetList.length}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>{compliantCount}</div>
                      <div style={{ fontSize: '0.7rem', color: '#047857' }}>Compliant</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706' }}>{inProgressCount}</div>
                      <div style={{ fontSize: '0.7rem', color: '#b45309' }}>In Progress</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>{flaggedCount}</div>
                      <div style={{ fontSize: '0.7rem', color: '#991b1b' }}>Deficits</div>
                    </div>
                  </div>
                </div>

                {/* 3. Choose Format & Export Actions */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                    2. Choose Format & Download
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* CSV Button Card */}
                    <div style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <TableChartIcon style={{ fontSize: '1.25rem', color: '#059669' }} />
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>CSV Document</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          Standard tabular spreadsheet format with UTF-8 BOM encoding for Microsoft Excel and Google Sheets.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportCsvReport(activeTargetList, activeTargetScopeLabel)}
                        disabled={isExportingCsv || activeTargetList.length === 0}
                        style={{
                          width: '100%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: isExportingCsv || activeTargetList.length === 0 ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {isExportingCsv ? (
                          <>
                            <CloudSyncIcon style={{ fontSize: '1rem', animation: 'spin 1.2s linear infinite' }} />
                            <span>Exporting CSV...</span>
                          </>
                        ) : (
                          <>
                            <DownloadIcon style={{ fontSize: '1rem' }} />
                            <span>Download CSV ({activeTargetList.length})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* PDF Button Card */}
                    <div style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <PdfIcon style={{ fontSize: '1.25rem', color: '#dc2626' }} />
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Stakeholder PDF</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          Publication-grade executive dossier with fulfillment charts, category analysis, and formal sign-offs.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportPdfReport(activeTargetList, activeTargetScopeLabel)}
                        disabled={isExportingPdf || activeTargetList.length === 0}
                        style={{
                          width: '100%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: isExportingPdf || activeTargetList.length === 0 ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {isExportingPdf ? (
                          <>
                            <CloudSyncIcon style={{ fontSize: '1rem', animation: 'spin 1.2s linear infinite' }} />
                            <span>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <PdfIcon style={{ fontSize: '1rem' }} />
                            <span>Download PDF ({activeTargetList.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Secondary JSON Download Option */}
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleExportReport(activeTargetList)}
                      disabled={activeTargetList.length === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '4px 8px'
                      }}
                    >
                      Download Raw Audit JSON Evidence Pack
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Audited by {currentUser.name} ({currentUser.role})
                </span>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Export Notification Toast */}
      {exportNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 2000,
          border: '1px solid #334155',
          fontSize: '0.85rem'
        }}>
          <CheckCircleIcon style={{ color: '#10b981', fontSize: '1.2rem' }} />
          <span>{exportNotification}</span>
          <CloseIcon
            onClick={() => setExportNotification(null)}
            style={{ fontSize: '1rem', cursor: 'pointer', color: '#94a3b8' }}
          />
        </div>
      )}

      {/* Slide-over Timeline Drawer Modal */}
      {isTimelineDrawerOpen && selectedTimelineItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(2px)'
        }}>
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <ComplianceTransitionTimeline
              selectedItem={selectedTimelineItem}
              allItems={requirements}
              onSelectItem={setSelectedTimelineItem}
              onClose={() => setIsTimelineDrawerOpen(false)}
              onStatusTransition={async (item, newStatus, notes, trigger, docRef) => {
                await handleChangeStatus(item, newStatus, notes, trigger, docRef);
              }}
              currentUser={{
                name: currentUser.name,
                role: currentUser.role,
                email: currentUser.email
              }}
              mode="drawer"
            />
          </div>
        </div>
      )}

      {/* Slide-over Comments Discussion Drawer Modal */}
      {isCommentsDrawerOpen && selectedCommentsItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(2px)'
        }}>
          <div
            style={{
              width: '100%',
              maxWidth: '740px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <ComplianceItemComments
              requirement={selectedCommentsItem}
              currentUser={{
                name: currentUser.name,
                role: currentUser.role,
                email: currentUser.email,
                id: currentUser.id
              }}
              onClose={() => setIsCommentsDrawerOpen(false)}
              mode="drawer"
              onCommentCountChange={(count) => {
                setItemCommentCounts(prev => ({ ...prev, [selectedCommentsItem.id]: count }));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceTracker;
