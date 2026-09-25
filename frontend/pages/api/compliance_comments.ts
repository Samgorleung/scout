import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getComplianceComments,
  createComplianceComment,
  updateComplianceComment,
  deleteComplianceComment,
  toggleCommentLike,
  resolveCommentThread
} from '@/lib/firebase';
import { ComplianceComment } from '@/lib/seedData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { requirementId } = req.query;
      const comments = await getComplianceComments(
        typeof requirementId === 'string' ? requirementId : undefined
      );
      return res.status(200).json(comments);
    }

    if (req.method === 'POST') {
      const {
        requirementId,
        parentId = null,
        content,
        authorName,
        authorEmail,
        authorRole,
        authorAvatarColor = '#1d70b8',
        tag = 'General',
        status = 'open'
      } = req.body;

      if (!requirementId || !content || !authorName || !authorRole) {
        return res.status(400).json({
          error: 'Missing required fields (requirementId, content, authorName, authorRole)'
        });
      }

      const id = req.body.id || `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newComment: ComplianceComment = {
        id,
        requirementId,
        parentId: parentId || null,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        authorName,
        authorEmail: authorEmail || '',
        authorRole,
        authorAvatarColor,
        status,
        tag,
        likes: 0,
        likedBy: []
      };

      const created = await createComplianceComment(newComment);
      return res.status(201).json(created);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id, content, status, resolvedBy, markResolved, action, userId } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing comment id' });
      }

      if (action === 'toggle_like' && userId) {
        const result = await toggleCommentLike(id, userId);
        return res.status(200).json(result);
      }

      if (action === 'resolve') {
        const result = await resolveCommentThread(id, resolvedBy || 'Reviewer', markResolved !== false);
        return res.status(200).json(result);
      }

      const updates: Partial<ComplianceComment> = {};
      if (content !== undefined) updates.content = content;
      if (status !== undefined) updates.status = status;
      if (resolvedBy !== undefined) updates.resolvedBy = resolvedBy;

      const updated = await updateComplianceComment(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing comment id parameter' });
      }
      await deleteComplianceComment(id);
      return res.status(200).json({ success: true, id });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('[API compliance_comments] Error:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
