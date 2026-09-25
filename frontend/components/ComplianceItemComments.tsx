import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChatBubbleOutline as CommentIcon,
  Reply as ReplyIcon,
  CheckCircleOutline as ResolvedIcon,
  CheckCircle as ResolvedFilledIcon,
  ThumbUpOutlined as LikeIcon,
  ThumbUp as LikedFilledIcon,
  DeleteOutline as DeleteIcon,
  Send as SendIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  HelpOutline as HelpIcon,
  Assignment as TaskIcon,
  ShieldOutlined as ShieldIcon,
  AccessTime as AccessTimeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BookmarkBorder as TagIcon,
  SwapHoriz as SwitchUserIcon
} from '@mui/icons-material';
import {
  ComplianceComment,
  ComplianceRequirementItem,
  defaultTeamMembers,
  TeamMember,
  USER_ID
} from '@/lib/seedData';
import {
  getComplianceComments,
  createComplianceComment,
  updateComplianceComment,
  deleteComplianceComment,
  toggleCommentLike,
  resolveCommentThread,
  db
} from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface ComplianceItemCommentsProps {
  requirement: ComplianceRequirementItem;
  currentUser?: {
    name: string;
    role: string;
    email: string;
    id?: string;
  };
  onClose?: () => void;
  mode?: 'embedded' | 'drawer' | 'card';
  onCommentCountChange?: (count: number) => void;
}

export const ComplianceItemComments: React.FC<ComplianceItemCommentsProps> = ({
  requirement,
  currentUser = {
    name: 'Sam Leung',
    role: 'Lead Assurance Reviewer',
    email: USER_ID,
    id: 'usr-reviewer-01'
  },
  onClose,
  mode = 'embedded',
  onCommentCountChange
}) => {
  // All comments for this requirement
  const [comments, setComments] = useState<ComplianceComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active persona selection (allows testing multi-user discussion)
  const [activeUser, setActiveUser] = useState<TeamMember>({
    id: currentUser.id || 'usr-reviewer-01',
    name: currentUser.name || 'Sam Leung',
    email: currentUser.email || USER_ID,
    role: currentUser.role || 'Lead Assurance Reviewer',
    department: 'Infrastructure and Projects Authority',
    avatarColor: '#1d70b8'
  });
  const [isPersonaSelectorOpen, setIsPersonaSelectorOpen] = useState<boolean>(false);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'open' | 'resolved'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Root composer state
  const [rootContent, setRootContent] = useState<string>('');
  const [rootTag, setRootTag] = useState<ComplianceComment['tag']>('Clarification');

  // Inline reply states (key is parent comment ID)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Collapsed threads tracking
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});

  // Real-time Firestore sync with graceful in-memory fallback
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    setLoading(true);

    try {
      const q = query(
        collection(db, 'compliance_comments'),
        where('requirementId', '==', requirement.id)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as ComplianceComment));
            setComments(list);
            if (onCommentCountChange) onCommentCountChange(list.length);
          } else {
            // Check in-memory store
            getComplianceComments(requirement.id).then(fallbackList => {
              setComments(fallbackList);
              if (onCommentCountChange) onCommentCountChange(fallbackList.length);
            });
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore snapshot error for comments, falling back to memory:', err);
          getComplianceComments(requirement.id).then(fallbackList => {
            setComments(fallbackList);
            if (onCommentCountChange) onCommentCountChange(fallbackList.length);
            setLoading(false);
          });
        }
      );
    } catch (err) {
      console.warn('Unable to attach snapshot listener, loading static comments:', err);
      getComplianceComments(requirement.id).then(fallbackList => {
        setComments(fallbackList);
        if (onCommentCountChange) onCommentCountChange(fallbackList.length);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [requirement.id, onCommentCountChange]);

  // Group comments into root threads and replies
  const { rootComments, repliesByParent } = useMemo(() => {
    const roots: ComplianceComment[] = [];
    const replies: Record<string, ComplianceComment[]> = {};

    comments.forEach(comment => {
      if (!comment.parentId) {
        roots.push(comment);
      } else {
        if (!replies[comment.parentId]) {
          replies[comment.parentId] = [];
        }
        replies[comment.parentId].push(comment);
      }
    });

    // Sort roots descending by createdAt (newest discussions first)
    roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Sort replies ascending by createdAt (chronological conversation flow)
    Object.keys(replies).forEach(parentId => {
      replies[parentId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return { rootComments: roots, repliesByParent: replies };
  }, [comments]);

  // Filtered root comments based on status, search, and tag
  const filteredRootComments = useMemo(() => {
    return rootComments.filter(root => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const rootStatus = root.status || 'open';
        if (rootStatus !== statusFilter) return false;
      }

      // Tag filter
      if (selectedTag !== 'ALL' && root.tag !== selectedTag) {
        return false;
      }

      // Search query in root comment or its replies
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rootMatch =
          root.content.toLowerCase().includes(q) ||
          root.authorName.toLowerCase().includes(q) ||
          root.authorRole.toLowerCase().includes(q);

        if (rootMatch) return true;

        const childReplies = repliesByParent[root.id] || [];
        const replyMatch = childReplies.some(
          rep =>
            rep.content.toLowerCase().includes(q) ||
            rep.authorName.toLowerCase().includes(q) ||
            rep.authorRole.toLowerCase().includes(q)
        );

        return replyMatch;
      }

      return true;
    });
  }, [rootComments, repliesByParent, statusFilter, selectedTag, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = comments.length;
    const resolvedThreads = rootComments.filter(r => r.status === 'resolved').length;
    const openThreads = rootComments.filter(r => (r.status || 'open') === 'open').length;
    return { totalCount, resolvedThreads, openThreads };
  }, [comments, rootComments]);

  // Post new top-level comment
  const handlePostRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment: ComplianceComment = {
        id: `cmt-${requirement.id}-${Date.now()}`,
        requirementId: requirement.id,
        parentId: null,
        content: rootContent.trim(),
        createdAt: new Date().toISOString(),
        authorName: activeUser.name,
        authorEmail: activeUser.email,
        authorRole: activeUser.role,
        authorAvatarColor: activeUser.avatarColor,
        status: 'open',
        tag: rootTag,
        likes: 0,
        likedBy: []
      };

      await createComplianceComment(newComment);
      setRootContent('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post inline reply
  const handlePostReply = async (parentId: string) => {
    const content = (replyDrafts[parentId] || '').trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newReply: ComplianceComment = {
        id: `rep-${parentId}-${Date.now()}`,
        requirementId: requirement.id,
        parentId: parentId,
        content: content,
        createdAt: new Date().toISOString(),
        authorName: activeUser.name,
        authorEmail: activeUser.email,
        authorRole: activeUser.role,
        authorAvatarColor: activeUser.avatarColor,
        likes: 0,
        likedBy: []
      };

      await createComplianceComment(newReply);
      setReplyDrafts(prev => ({ ...prev, [parentId]: '' }));
      setActiveReplyId(null);
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle like reaction
  const handleToggleLike = async (commentId: string) => {
    try {
      await toggleCommentLike(commentId, activeUser.id);
      // Optimistic update in UI
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            const likedBy = c.likedBy || [];
            const hasLiked = likedBy.includes(activeUser.id);
            const nextLikedBy = hasLiked
              ? likedBy.filter(u => u !== activeUser.id)
              : [...likedBy, activeUser.id];
            return {
              ...c,
              likes: nextLikedBy.length,
              likedBy: nextLikedBy
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  // Toggle thread resolution status
  const handleToggleResolve = async (rootComment: ComplianceComment) => {
    const isCurrentlyResolved = rootComment.status === 'resolved';
    const nextStatus = isCurrentlyResolved ? 'open' : 'resolved';
    try {
      await resolveCommentThread(rootComment.id, activeUser.name, !isCurrentlyResolved);
      setComments(prev =>
        prev.map(c => {
          if (c.id === rootComment.id) {
            return {
              ...c,
              status: nextStatus,
              resolvedBy: isCurrentlyResolved ? null : activeUser.name,
              resolvedAt: isCurrentlyResolved ? null : new Date().toISOString()
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Failed to toggle resolution:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteComplianceComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Toggle thread collapse
  const toggleCollapseThread = (threadId: string) => {
    setCollapsedThreads(prev => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  // Format relative timestamp
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 2) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Helper for user avatar initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Tag styling helper
  const getTagStyle = (tag?: string) => {
    switch (tag) {
      case 'Clarification':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'Evidence Review':
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'Mitigation Plan':
        return { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
      case 'Action Item':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: mode === 'drawer' ? '#ffffff' : '#f8fafc',
        borderRadius: mode === 'drawer' ? '0px' : '10px',
        border: mode === 'drawer' ? 'none' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: mode === 'drawer' ? '100%' : 'auto',
        maxHeight: mode === 'drawer' ? '100vh' : 'none',
        overflow: 'hidden'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d70b8'
            }}
          >
            <CommentIcon style={{ fontSize: '1.25rem' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700, color: '#0f172a' }}>
                Team Discussion & Threads
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#1d70b8',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                {metrics.totalCount} {metrics.totalCount === 1 ? 'comment' : 'comments'}
              </span>
            </div>
            <div style={{ fontSize: '0.78125rem', color: '#64748b', marginTop: '2px' }}>
              Requirement <strong>{requirement.code}</strong> • {requirement.category} • {metrics.openThreads} Open, {metrics.resolvedThreads} Resolved
            </div>
          </div>
        </div>

        {/* Persona Switcher & Close button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsPersonaSelectorOpen(!isPersonaSelectorOpen)}
              title="Switch user role persona to test multi-team discussions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.78125rem',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: activeUser.avatarColor,
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {getInitials(activeUser.name)}
              </div>
              <span>
                <strong>{activeUser.name}</strong> ({activeUser.role.split(' ')[0]})
              </span>
              <SwitchUserIcon style={{ fontSize: '0.9rem', color: '#64748b' }} />
            </button>

            {/* Persona Dropdown */}
            {isPersonaSelectorOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '290px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  zIndex: 40,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Select Team Member Persona
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Simulate discussion between governance stakeholders
                  </div>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {defaultTeamMembers.map(member => (
                    <div
                      key={member.id}
                      onClick={() => {
                        setActiveUser(member);
                        setIsPersonaSelectorOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        backgroundColor: activeUser.id === member.id ? '#f1f5f9' : 'transparent',
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: member.avatarColor,
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {member.role}
                        </div>
                      </div>
                      {activeUser.id === member.id && (
                        <span style={{ color: '#1d70b8', fontWeight: 700, fontSize: '0.8rem' }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              title="Close discussion drawer"
            >
              <CloseIcon style={{ fontSize: '1.25rem' }} />
            </button>
          )}
        </div>
      </div>

      {/* Requirement Context Snippet */}
      <div
        style={{
          padding: '10px 20px',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.8125rem',
          color: '#334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: '#1e3a8a', fontFamily: 'monospace' }}>
            {requirement.code}
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {requirement.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: requirement.status === 'Compliant' ? '#dcfce7' : requirement.status === 'Flagged' ? '#fee2e2' : '#fef3c7',
              color: requirement.status === 'Compliant' ? '#166534' : requirement.status === 'Flagged' ? '#991b1b' : '#92400e'
            }}
          >
            {requirement.status}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#e2e8f0',
              color: '#334155'
            }}
          >
            {requirement.priority} Priority
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          padding: '10px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: `1px solid ${statusFilter === 'ALL' ? '#1d70b8' : '#e2e8f0'}`,
              backgroundColor: statusFilter === 'ALL' ? '#eff6ff' : '#ffffff',
              color: statusFilter === 'ALL' ? '#1d70b8' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Threads ({rootComments.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: `1px solid ${statusFilter === 'open' ? '#d97706' : '#e2e8f0'}`,
              backgroundColor: statusFilter === 'open' ? '#fef3c7' : '#ffffff',
              color: statusFilter === 'open' ? '#b45309' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Open ({metrics.openThreads})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: `1px solid ${statusFilter === 'resolved' ? '#059669' : '#e2e8f0'}`,
              backgroundColor: statusFilter === 'resolved' ? '#dcfce7' : '#ffffff',
              color: statusFilter === 'resolved' ? '#15803d' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Resolved ({metrics.resolvedThreads})
          </button>
        </div>

        {/* Search & Tag Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px', maxWidth: '380px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '3px 8px',
              flex: 1
            }}
          >
            <SearchIcon style={{ fontSize: '0.95rem', color: '#94a3b8', marginRight: '4px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in discussions..."
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.78125rem',
                color: '#1e293b',
                width: '100%',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <CloseIcon
                onClick={() => setSearchQuery('')}
                style={{ fontSize: '0.9rem', color: '#94a3b8', cursor: 'pointer' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Discussion Scrollable Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Empty state */}
        {filteredRootComments.length === 0 && !loading && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d70b8',
                marginBottom: '12px'
              }}
            >
              <CommentIcon style={{ fontSize: '1.5rem' }} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
              No discussions found
            </h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', maxWidth: '400px', marginInline: 'auto' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'No comments match your search or filter criteria. Try resetting filters.'
                : 'Start a collaborative discussion with SROs, Commercial Leads, and Technical Advisors on this compliance requirement below.'}
            </p>
          </div>
        )}

        {/* Threaded Comments List */}
        {filteredRootComments.map(rootComment => {
          const replies = repliesByParent[rootComment.id] || [];
          const isResolved = rootComment.status === 'resolved';
          const isReplying = activeReplyId === rootComment.id;
          const isCollapsed = !!collapsedThreads[rootComment.id];
          const hasLikedRoot = (rootComment.likedBy || []).includes(activeUser.id);
          const tagStyle = getTagStyle(rootComment.tag);

          return (
            <div
              key={rootComment.id}
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${isResolved ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease'
              }}
            >
              {/* Root Comment Container */}
              <div style={{ padding: '16px 18px', backgroundColor: isResolved ? '#fcfdfd' : '#ffffff' }}>
                {/* Comment Author Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: rootComment.authorAvatarColor || '#1d70b8',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {getInitials(rootComment.authorName)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                          {rootComment.authorName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569'
                          }}
                        >
                          {rootComment.authorRole}
                        </span>
                        {rootComment.tag && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: tagStyle.bg,
                              color: tagStyle.color,
                              border: `1px solid ${tagStyle.border}`
                            }}
                          >
                            {rootComment.tag}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '1px' }}>
                        {formatTimestamp(rootComment.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Thread Status Pill & Collapse */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleResolve(rootComment)}
                      title={isResolved ? "Click to reopen discussion thread" : "Mark discussion thread as resolved"}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${isResolved ? '#86efac' : '#fde68a'}`,
                        backgroundColor: isResolved ? '#dcfce7' : '#fef3c7',
                        color: isResolved ? '#166534' : '#92400e',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isResolved ? (
                        <>
                          <ResolvedFilledIcon style={{ fontSize: '0.85rem' }} />
                          <span>Resolved</span>
                        </>
                      ) : (
                        <>
                          <AccessTimeIcon style={{ fontSize: '0.85rem' }} />
                          <span>Open</span>
                        </>
                      )}
                    </button>

                    {replies.length > 0 && (
                      <button
                        onClick={() => toggleCollapseThread(rootComment.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={isCollapsed ? "Expand replies" : "Collapse replies"}
                      >
                        {isCollapsed ? <ExpandMoreIcon style={{ fontSize: '1.1rem' }} /> : <ExpandLessIcon style={{ fontSize: '1.1rem' }} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Content */}
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    lineHeight: 1.55,
                    marginBottom: '10px',
                    whiteSpace: 'pre-wrap',
                    paddingLeft: '44px'
                  }}
                >
                  {rootComment.content}
                </div>

                {/* Resolution Audit Note */}
                {isResolved && rootComment.resolvedBy && (
                  <div
                    style={{
                      marginLeft: '44px',
                      marginBottom: '10px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.725rem',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ResolvedIcon style={{ fontSize: '0.9rem' }} />
                    <span>
                      Marked as resolved by <strong>{rootComment.resolvedBy}</strong>
                      {rootComment.resolvedAt && ` • ${formatTimestamp(rootComment.resolvedAt)}`}
                    </span>
                  </div>
                )}

                {/* Actions Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginLeft: '44px',
                    paddingTop: '6px',
                    borderTop: '1px solid #f8fafc'
                  }}
                >
                  {/* Reply Button */}
                  <button
                    onClick={() => {
                      setActiveReplyId(isReplying ? null : rootComment.id);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: isReplying ? '#1d70b8' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 0'
                    }}
                  >
                    <ReplyIcon style={{ fontSize: '0.95rem' }} />
                    <span>Reply</span>
                    {replies.length > 0 && (
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          padding: '1px 5px',
                          borderRadius: '8px',
                          fontSize: '0.7rem'
                        }}
                      >
                        {replies.length}
                      </span>
                    )}
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={() => handleToggleLike(rootComment.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: hasLikedRoot ? '#1d70b8' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 0'
                    }}
                  >
                    {hasLikedRoot ? (
                      <LikedFilledIcon style={{ fontSize: '0.95rem', color: '#1d70b8' }} />
                    ) : (
                      <LikeIcon style={{ fontSize: '0.95rem' }} />
                    )}
                    <span>{(rootComment.likes || 0) > 0 ? rootComment.likes : 'Agree'}</span>
                  </button>

                  {/* Delete Option for Author */}
                  {rootComment.authorEmail === activeUser.email && (
                    <button
                      onClick={() => handleDeleteComment(rootComment.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: '2px 0'
                      }}
                      title="Delete your comment"
                    >
                      <DeleteIcon style={{ fontSize: '0.95rem' }} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Nested Replies Section */}
              {replies.length > 0 && !isCollapsed && (
                <div
                  style={{
                    backgroundColor: '#fafbfc',
                    borderTop: '1px solid #f1f5f9',
                    padding: '12px 18px 12px 54px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  {/* Visual Threading Rail */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '34px',
                      top: '0px',
                      bottom: '20px',
                      width: '2px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '1px'
                    }}
                  />

                  {replies.map(reply => {
                    const hasLikedReply = (reply.likedBy || []).includes(activeUser.id);
                    return (
                      <div
                        key={reply.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          position: 'relative'
                        }}
                      >
                        {/* Horizontal Connector Hook */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '18px',
                            width: '20px',
                            height: '2px',
                            backgroundColor: '#e2e8f0'
                          }}
                        />

                        {/* Reply Author Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: reply.authorAvatarColor || '#1d70b8',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {getInitials(reply.authorName)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                                  {reply.authorName}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.675rem',
                                    fontWeight: 600,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569'
                                  }}
                                >
                                  {reply.authorRole}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {formatTimestamp(reply.createdAt)}
                          </span>
                        </div>

                        {/* Reply Content */}
                        <div
                          style={{
                            fontSize: '0.825rem',
                            color: '#1e293b',
                            lineHeight: 1.5,
                            marginBottom: '8px',
                            whiteSpace: 'pre-wrap',
                            paddingLeft: '34px'
                          }}
                        >
                          {reply.content}
                        </div>

                        {/* Reply Actions */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            paddingLeft: '34px'
                          }}
                        >
                          <button
                            onClick={() => handleToggleLike(reply.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'none',
                              border: 'none',
                              color: hasLikedReply ? '#1d70b8' : '#64748b',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '0'
                            }}
                          >
                            {hasLikedReply ? (
                              <LikedFilledIcon style={{ fontSize: '0.85rem', color: '#1d70b8' }} />
                            ) : (
                              <LikeIcon style={{ fontSize: '0.85rem' }} />
                            )}
                            <span>{(reply.likes || 0) > 0 ? reply.likes : 'Agree'}</span>
                          </button>

                          {reply.authorEmail === activeUser.email && (
                            <button
                              onClick={() => handleDeleteComment(reply.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '0.725rem',
                                cursor: 'pointer',
                                padding: '0'
                              }}
                              title="Delete reply"
                            >
                              <DeleteIcon style={{ fontSize: '0.85rem' }} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Collapsed Replies Teaser */}
              {replies.length > 0 && isCollapsed && (
                <div
                  onClick={() => toggleCollapseThread(rootComment.id)}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    padding: '8px 18px 8px 54px',
                    fontSize: '0.75rem',
                    color: '#1d70b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ExpandMoreIcon style={{ fontSize: '1rem' }} />
                  <span>Show {replies.length} hidden {replies.length === 1 ? 'reply' : 'replies'}</span>
                </div>
              )}

              {/* Inline Reply Composer */}
              {isReplying && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 18px 12px 54px',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: activeUser.avatarColor,
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getInitials(activeUser.name)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                      Replying as <strong>{activeUser.name}</strong> ({activeUser.role})
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    value={replyDrafts[rootComment.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts(prev => ({ ...prev, [rootComment.id]: e.target.value }))
                    }
                    placeholder="Write a reply to this thread..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      marginTop: '8px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveReplyId(null)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePostReply(rootComment.id)}
                      disabled={!(replyDrafts[rootComment.id] || '').trim() || isSubmitting}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '5px',
                        border: 'none',
                        backgroundColor: (replyDrafts[rootComment.id] || '').trim() ? '#1d70b8' : '#94a3b8',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: (replyDrafts[rootComment.id] || '').trim() ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <SendIcon style={{ fontSize: '0.85rem' }} />
                      <span>{isSubmitting ? 'Posting...' : 'Post Reply'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Top-Level Composer Footer */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0'
        }}
      >
        <form onSubmit={handlePostRootComment}>
          {/* Active persona header & Topic tag picker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: activeUser.avatarColor,
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {getInitials(activeUser.name)}
              </div>
              <span style={{ fontSize: '0.78125rem', color: '#334155' }}>
                Posting as <strong>{activeUser.name}</strong> ({activeUser.role})
              </span>
            </div>

            {/* Tag Selection Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Topic:</span>
              {(['Clarification', 'Evidence Review', 'Mitigation Plan', 'Action Item'] as const).map(tag => {
                const isSelected = rootTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRootTag(tag)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${isSelected ? '#1d70b8' : '#e2e8f0'}`,
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d70b8' : '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Composer Input Box */}
          <div style={{ position: 'relative' }}>
            <textarea
              rows={3}
              value={rootContent}
              onChange={(e) => setRootContent(e.target.value)}
              placeholder={`Ask a question, request evidence, or share an assurance note on ${requirement.code}...`}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1d70b8')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* Footer Submit Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px'
            }}
          >
            <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
              Comments sync in real time across the project audit team
            </div>

            <button
              type="submit"
              disabled={!rootContent.trim() || isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: rootContent.trim() ? '#1d70b8' : '#94a3b8',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: rootContent.trim() ? 'pointer' : 'not-allowed',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
            >
              <SendIcon style={{ fontSize: '0.9rem' }} />
              <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ComplianceItemComments;
