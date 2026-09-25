import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getFirestoreAll,
  updateComplianceRequirement,
  bulkUpdateComplianceRequirements,
  createComplianceRequirement,
  deleteComplianceRequirement
} from '@/lib/firebase';
import { ComplianceRequirementItem } from '@/lib/seedData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const items = await getFirestoreAll('compliance_requirements');
      return res.status(200).json(items);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      // Check for bulk update request
      if (req.body.bulk && Array.isArray(req.body.ids) && req.body.ids.length > 0) {
        const { ids, changes } = req.body;
        const updatedItems = await bulkUpdateComplianceRequirements(ids, changes || {});
        return res.status(200).json({ success: true, count: updatedItems.length, items: updatedItems });
      }

      const {
        id,
        isChecked,
        status,
        auditorNotes,
        auditorName,
        documentRef,
        priority,
        checkedBy,
        checkedByUserId,
        assignedTo,
        assignedToEmail,
        assignedToRole,
        assignedAt,
        dueDate,
        statusTransitions
      } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing requirement id' });
      }

      const updates: Partial<ComplianceRequirementItem> = {};
      if (typeof isChecked === 'boolean') {
        updates.isChecked = isChecked;
        // If checked and status was not explicitly passed, infer Compliant if checking, or In Progress if unchecking
        if (!status) {
          updates.status = isChecked ? 'Compliant' : 'In Progress';
        }
        if (isChecked && !req.body.auditedAt) {
          updates.auditedAt = new Date().toISOString();
        }
      }
      if (status) updates.status = status;
      if (checkedBy !== undefined) updates.checkedBy = checkedBy;
      if (checkedByUserId !== undefined) updates.checkedByUserId = checkedByUserId;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (assignedToEmail !== undefined) updates.assignedToEmail = assignedToEmail;
      if (assignedToRole !== undefined) updates.assignedToRole = assignedToRole;
      if (assignedAt !== undefined) updates.assignedAt = assignedAt;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (auditorNotes !== undefined) updates.auditorNotes = auditorNotes;
      if (auditorName !== undefined) updates.auditorName = auditorName;
      if (documentRef !== undefined) updates.documentRef = documentRef;
      if (priority !== undefined) updates.priority = priority;
      if (req.body.auditedAt !== undefined) updates.auditedAt = req.body.auditedAt;
      if (statusTransitions !== undefined) updates.statusTransitions = statusTransitions;

      const updated = await updateComplianceRequirement(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Requirement not found' });
      }
      return res.status(200).json(updated);
    }

    if (req.method === 'POST') {
      const {
        code,
        title,
        description,
        gate,
        category,
        status = 'In Progress',
        isChecked = false,
        priority = 'Medium',
        dueDate = null,
        evidenceThreshold = '',
        auditorNotes = '',
        auditorName = 'Assurance Lead',
        documentRef = ''
      } = req.body;

      if (!code || !title || !gate || !category) {
        return res.status(400).json({ error: 'Missing required fields (code, title, gate, category)' });
      }

      const id = req.body.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newReq: ComplianceRequirementItem = {
        id,
        code,
        title,
        description: description || '',
        gate,
        category,
        status,
        isChecked,
        priority,
        dueDate: dueDate || null,
        evidenceThreshold,
        auditorNotes,
        auditorName,
        auditedAt: isChecked ? new Date().toISOString() : null,
        documentRef,
        created_datetime: new Date().toISOString(),
        updated_datetime: null
      };

      const created = await createComplianceRequirement(newReq);
      return res.status(201).json(created);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing requirement id parameter' });
      }
      await deleteComplianceRequirement(id);
      return res.status(200).json({ success: true, id });
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'PUT', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('[API compliance_requirements] Error:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
