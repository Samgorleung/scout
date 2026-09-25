import { getDeadlineInfo } from './deadlineUtils';

/**
 * Utility for exporting the current view of compliance requirements to a standard RFC-4180 CSV document.
 * Formatted for project stakeholders, Senior Responsible Owners (SROs), and auditing teams.
 */

export interface ExportCsvRequirementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  gate: string;
  category: string;
  priority: string;
  status: string;
  isChecked: boolean;
  evidenceThreshold: string;
  documentRef?: string;
  auditorNotes?: string;
  auditedAt?: string | null;
  auditorName?: string;
  checkedBy?: string;
  assignedTo?: string;
  assignedToRole?: string;
  assignedToEmail?: string;
  dueDate?: string | null;
  created_datetime?: string;
  updated_datetime?: string | null;
}

export interface ExportCsvOptions {
  projectName?: string;
  currentGate?: string;
  scopeLabel?: string;
  filterSummary?: string;
  auditor?: {
    name: string;
    email: string;
    role: string;
  };
  requirements: ExportCsvRequirementItem[];
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports compliance requirements to a downloadable CSV document with UTF-8 BOM encoding.
 */
export function exportComplianceRequirementsCsv(options: ExportCsvOptions): void {
  const {
    projectName = 'A428 Black Cat to Caxton Gibbet Improvement',
    currentGate = 'GATE_2',
    scopeLabel = 'Current View',
    filterSummary = '',
    auditor,
    requirements
  } = options;

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10);
  const timeStamp = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Column Headers
  const headers = [
    'Requirement Code',
    'Title',
    'Category',
    'Gateway Phase',
    'Priority',
    'Compliance Status',
    'Due Date',
    'Deadline Warning Status',
    'Verification Status',
    'Verified By',
    'Verification Date',
    'Assigned Member Name',
    'Assigned Member Role',
    'Assigned Member Email',
    'Evidence Criteria & Threshold',
    'Document Reference',
    'Auditor Notes & Governance Justifications',
    'Description',
    'Record ID',
    'Export Scope',
    'Export Date'
  ];

  const rows: string[][] = [];

  // Data rows
  for (const req of requirements) {
    const verifiedStatus = req.isChecked ? 'Verified' : 'Pending';
    const verifiedBy = req.checkedBy || req.auditorName || (req.isChecked ? 'Auditor Verified' : 'Unverified');
    const verifiedDate = req.auditedAt ? new Date(req.auditedAt).toISOString().slice(0, 10) : '';
    const deadline = getDeadlineInfo(req.dueDate, req.isChecked);
    const deadlineStatusExport = deadline.isUrgent
      ? `WARNING: ${deadline.statusText}`
      : deadline.hasDueDate
      ? deadline.statusText
      : 'No Deadline Set';

    rows.push([
      req.code || '',
      req.title || '',
      req.category || '',
      req.gate || currentGate,
      req.priority || 'Medium',
      req.status || 'Unreviewed',
      req.dueDate || 'Unscheduled',
      deadlineStatusExport,
      verifiedStatus,
      verifiedBy,
      verifiedDate,
      req.assignedTo || 'Unassigned',
      req.assignedToRole || '',
      req.assignedToEmail || '',
      req.evidenceThreshold || '',
      req.documentRef || '',
      req.auditorNotes || '',
      req.description || '',
      req.id || '',
      scopeLabel + (filterSummary ? ` [${filterSummary}]` : ''),
      `${dateStamp} ${timeStamp}`
    ]);
  }

  // Build CSV text
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCsvCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  // Add UTF-8 BOM (\uFEFF) so Excel & Sheets render UTF-8 characters cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const cleanProject = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanScope = scopeLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `IPA-Compliance-Audit_${cleanProject}_${currentGate}_${cleanScope}_${dateStamp}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
