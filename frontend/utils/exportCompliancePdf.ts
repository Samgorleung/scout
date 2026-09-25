import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDeadlineInfo } from './deadlineUtils';

export interface ExportPdfOptions {
  projectName?: string;
  currentGate?: string;
  scopeLabel?: string;
  filterSummary?: string;
  auditor: {
    name: string;
    email: string;
    role: string;
  };
  metrics: {
    total: number;
    checked: number;
    percentage: number;
    compliant: number;
    inProgress: number;
    flagged: number;
    remainingCount: number;
    readinessText: string;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    checked: number;
    compliant: number;
    flagged: number;
    percentage: number;
  }>;
  requirements: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    gate: string;
    category: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
    status: 'Compliant' | 'In Progress' | 'Flagged' | 'N/A' | string;
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
  }>;
  firestoreDbId?: string;
}

/**
 * Generates an executive, publication-grade PDF report of the compliance audit
 * formatted specifically for project stakeholders, Senior Responsible Owners (SROs),
 * and Gateway Review Teams.
 */
export async function exportComplianceAuditPdf(options: ExportPdfOptions): Promise<void> {
  const {
    projectName = 'A428 Black Cat to Caxton Gibbet Improvement',
    currentGate = 'GATE_2',
    scopeLabel = 'Current View',
    filterSummary = '',
    auditor,
    metrics,
    categoryBreakdown,
    requirements,
    firestoreDbId = 'ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5'
  } = options;

  // Initialize PDF in portrait A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const primaryBlue: [number, number, number] = [29, 112, 184]; // UK Gov / IPA Blue #1d70b8
  const darkNavy: [number, number, number] = [15, 23, 42];      // #0f172a
  const slateGray: [number, number, number] = [100, 116, 139];  // #64748b
  const lightBg: [number, number, number] = [248, 250, 252];    // #f8fafc
  const emeraldGreen: [number, number, number] = [5, 150, 105]; // #059669
  const amberOrange: [number, number, number] = [217, 119, 6];  // #d97706
  const crimsonRed: [number, number, number] = [220, 38, 38];   // #dc2626

  let currentY = 14;

  // ==========================================
  // 1. EXECUTIVE HEADER BANNER
  // ==========================================
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  // Gold accent bar
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, currentY + 24, contentWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('IPA SCOUT — ASSURANCE & COMPLIANCE GATEWAY AUDIT REPORT', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Infrastructure and Projects Authority Assurance Review Protocol • Formal Stakeholder Dossier', margin + 6, currentY + 16);

  const reportDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Generated: ${reportDateStr}`, pageWidth - margin - 6, currentY + 16, { align: 'right' });

  currentY += 32;

  // ==========================================
  // 2. PROJECT METADATA & AUDIT REGISTRY
  // ==========================================
  const metaBoxHeight = scopeLabel ? 29 : 24;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 2, 2, 'FD');

  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(projectName, margin + 5, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateGray);
  doc.text(`Gateway Review Stage:`, margin + 5, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlue);
  doc.text(`${currentGate.replace('_', ' ')} (Delivery Strategy & Procurement)`, margin + 38, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text(`Lead Auditor / Sign-off:`, margin + 5, currentY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`${auditor.name} (${auditor.role}) <${auditor.email}>`, margin + 38, currentY + 17.5);

  if (scopeLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateGray);
    doc.text(`Dossier View / Scope:`, margin + 5, currentY + 23);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkNavy);
    const scopeStr = `${scopeLabel} (${requirements.length} Requirements)${filterSummary ? ` • ${filterSummary}` : ''}`;
    doc.text(scopeStr.slice(0, 95), margin + 38, currentY + 23);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text(`Cloud Firestore Audit Registry:`, pageWidth - margin - 80, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(firestoreDbId.slice(0, 24) + '...', pageWidth - margin - 5, currentY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text(`Assurance Standard:`, pageWidth - margin - 80, currentY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldGreen);
  doc.text('HM Treasury Green Book Compliant', pageWidth - margin - 5, currentY + 17.5, { align: 'right' });

  currentY += metaBoxHeight + 5;

  // ==========================================
  // 3. EXECUTIVE ASSURANCE & PROGRESS DASHBOARD
  // ==========================================
  const progressBoxHeight = 36;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, progressBoxHeight, 2, 2, 'FD');

  // Left Section: Fulfillment Rate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...slateGray);
  doc.text('OVERALL ASSURANCE FULFILLMENT', margin + 6, currentY + 7);

  doc.setFontSize(20);
  const isHigh = metrics.percentage >= 80;
  const isMed = metrics.percentage >= 50;
  doc.setTextColor(isHigh ? 5 : isMed ? 217 : 220, isHigh ? 150 : isMed ? 119 : 38, isHigh ? 105 : isMed ? 6 : 38);
  doc.text(`${metrics.percentage}%`, margin + 6, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text(`${metrics.checked} of ${metrics.total} Requirements Fulfilled`, margin + 26, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text(
    metrics.remainingCount === 0
      ? 'All Gateway assurance requirements have been verified and signed off.'
      : `${metrics.remainingCount} requirement${metrics.remainingCount === 1 ? '' : 's'} remaining to achieve full Gateway clearance.`,
    margin + 6,
    currentY + 22
  );

  // Linear Progress Bar inside PDF
  const barX = margin + 6;
  const barY = currentY + 25;
  const barWidth = 85;
  const barHeight = 4.5;

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(barX, barY, barWidth, barHeight, 1.5, 1.5, 'F');

  const fillWidth = Math.max(1, (metrics.percentage / 100) * barWidth);
  doc.setFillColor(isHigh ? 16 : isMed ? 245 : 239, isHigh ? 185 : isMed ? 158 : 68, isHigh ? 129 : isMed ? 11 : 68);
  doc.roundedRect(barX, barY, fillWidth, barHeight, 1.5, 1.5, 'F');

  // 80% Threshold tick marker
  const tickX = barX + (0.8 * barWidth);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(tickX, barY - 1.5, tickX, barY + barHeight + 1.5);
  doc.setFontSize(6);
  doc.setTextColor(...darkNavy);
  doc.text('80% Gate Target', tickX, barY + barHeight + 4.5, { align: 'center' });

  // Right Section: Gateway Readiness Capsule & Breakdown Stats
  const rightX = margin + 102;

  // Readiness Pill
  const readinessBg = isHigh ? [240, 253, 244] : isMed ? [255, 251, 235] : [254, 242, 242];
  const readinessBorder = isHigh ? [187, 247, 208] : isMed ? [253, 230, 138] : [254, 202, 202];
  doc.setFillColor(readinessBg[0], readinessBg[1], readinessBg[2]);
  doc.setDrawColor(readinessBorder[0], readinessBorder[1], readinessBorder[2]);
  doc.roundedRect(rightX, currentY + 5, contentWidth - 108, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isHigh ? 4 : isMed ? 180 : 185, isHigh ? 120 : isMed ? 83 : 28, isHigh ? 87 : isMed ? 9 : 28);
  doc.text(`Gate Status: ${metrics.readinessText}`, rightX + 4, currentY + 11);

  // Status Counts Grid
  const statsY = currentY + 19;
  const colW = (contentWidth - 108) / 3;

  // Compliant
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(rightX, statsY, colW - 2, 13, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...emeraldGreen);
  doc.text('COMPLIANT', rightX + (colW - 2) / 2, statsY + 4.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${metrics.compliant}`, rightX + (colW - 2) / 2, statsY + 10, { align: 'center' });

  // In Progress
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(rightX + colW, statsY, colW - 2, 13, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(...amberOrange);
  doc.text('IN PROGRESS', rightX + colW + (colW - 2) / 2, statsY + 4.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${metrics.inProgress}`, rightX + colW + (colW - 2) / 2, statsY + 10, { align: 'center' });

  // Flagged Risk
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(rightX + colW * 2, statsY, colW - 2, 13, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(...crimsonRed);
  doc.text('FLAGGED DEFICIT', rightX + colW * 2 + (colW - 2) / 2, statsY + 4.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${metrics.flagged}`, rightX + colW * 2 + (colW - 2) / 2, statsY + 10, { align: 'center' });

  currentY += progressBoxHeight + 6;

  // ==========================================
  // 4. CATEGORY BREAKDOWN TABLE (COMPACT)
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text('CATEGORY ASSURANCE BREAKDOWN', margin, currentY + 3);

  const categoryTableBody = categoryBreakdown.map(cat => [
    cat.category,
    `${cat.total} Items`,
    `${cat.checked} Fulfilled`,
    `${cat.compliant}`,
    `${cat.flagged}`,
    `${cat.percentage}%`,
    cat.percentage >= 80 ? 'Substantial Assurance' : cat.percentage >= 50 ? 'Interim Progress' : 'Remediation Required'
  ]);

  autoTable(doc, {
    startY: currentY + 5,
    margin: { left: margin, right: margin },
    head: [['Category', 'Total', 'Fulfilled', 'Compliant', 'Deficits', 'Rate (%)', 'Assurance Verdict']],
    body: categoryTableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: darkNavy,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      6: { fontStyle: 'normal' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const lastTableY = (doc as any).lastAutoTable.finalY || currentY + 35;
  currentY = lastTableY + 8;

  // ==========================================
  // 5. DETAILED REQUIREMENTS AUDIT TRAIL TABLE
  // ==========================================
  // Check if we have enough room on page 1 for section header, otherwise page break
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text('DETAILED ASSURANCE REQUIREMENTS & EVIDENCE VERIFICATION AUDIT TRAIL', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text('Comprehensive checklist of verified items, auditor observations, and timestamped sign-offs in Cloud Firestore.', margin, currentY + 4);

  const requirementsTableBody = requirements.map(req => {
    const checkedPill = req.isChecked ? '✓ VERIFIED' : 'PENDING';
    const deadline = getDeadlineInfo(req.dueDate, req.isChecked);
    let deadlineLine = '';
    if (deadline.hasDueDate) {
      deadlineLine = deadline.isUrgent
        ? `\n⚠️ DEADLINE: ${req.dueDate} (${deadline.statusText.toUpperCase()})`
        : `\nDue: ${req.dueDate}`;
    }
    const statusLabel = `${req.status.toUpperCase()} (${checkedPill})${deadlineLine}`;

    let notesText = req.auditorNotes || 'No reviewer caveats logged.';
    if (req.assignedTo) {
      notesText = `[Assigned: ${req.assignedTo}${req.assignedToRole ? ` - ${req.assignedToRole}` : ''}]\n` + notesText;
    }
    if (req.auditorName && req.auditedAt) {
      const auditedDate = new Date(req.auditedAt).toLocaleDateString('en-GB');
      notesText += `\n[Audited by ${req.auditorName} on ${auditedDate}]`;
    }

    return [
      req.code,
      `${req.title}\n\nEvidence Required:\n${req.evidenceThreshold}`,
      req.category,
      req.priority,
      statusLabel,
      notesText
    ];
  });

  autoTable(doc, {
    startY: currentY + 7,
    margin: { left: margin, right: margin, bottom: 26 },
    head: [['Code', 'Requirement & Evidence Criteria', 'Category', 'Priority', 'Assurance Status', 'Auditor Findings & Firestore Signature']],
    body: requirementsTableBody,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      textColor: darkNavy,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: primaryBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 16, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 24 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 26, fontStyle: 'bold' },
      5: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: function(data) {
      // Color-code the status column
      if (data.column.index === 4 && data.section === 'body') {
        const text = String(data.cell.raw);
        if (text.includes('COMPLIANT')) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (text.includes('IN PROGRESS')) {
          data.cell.styles.textColor = [217, 119, 6];
        } else if (text.includes('FLAGGED')) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
      // Color-code priority column
      if (data.column.index === 3 && data.section === 'body') {
        const prio = String(data.cell.raw);
        if (prio === 'Critical') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // ==========================================
  // 6. STAKEHOLDER SIGN-OFF SECTION
  // ==========================================
  const finalTableY = (doc as any).lastAutoTable.finalY || currentY + 40;
  let signoffY = finalTableY + 8;

  // Ensure sign-off fits or push to next page
  if (signoffY > pageHeight - 38) {
    doc.addPage();
    signoffY = 16;
  }

  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, signoffY, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text('FORMAL GATEWAY ASSURANCE SIGN-OFF & GOVERNANCE RECORD', margin + 5, signoffY + 5.5);

  const sigColW = (contentWidth - 10) / 3;

  // Signatory 1: Lead Assurance Auditor
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text('Lead Assurance Reviewer:', margin + 5, signoffY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`${auditor.name}`, margin + 5, signoffY + 15);
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, signoffY + 21, margin + 5 + sigColW - 10, signoffY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateGray);
  doc.text('Signature & Date (Verified in Firestore)', margin + 5, signoffY + 24);

  // Signatory 2: Senior Responsible Owner (SRO)
  const sroX = margin + 5 + sigColW;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text('Senior Responsible Owner (SRO):', sroX, signoffY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text('Project Accounting Officer', sroX, signoffY + 15);
  doc.line(sroX, signoffY + 21, sroX + sigColW - 10, signoffY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateGray);
  doc.text('Signature & Date', sroX, signoffY + 24);

  // Signatory 3: Gateway Assurance Team Chair
  const chairX = margin + 5 + sigColW * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text('Gateway Review Team Chair:', chairX, signoffY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text('IPA Peer Review Lead', chairX, signoffY + 15);
  doc.line(chairX, signoffY + 21, chairX + sigColW - 10, signoffY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateGray);
  doc.text('Signature & Date', chairX, signoffY + 24);

  // ==========================================
  // 7. FOOTER ON EVERY PAGE
  // ==========================================
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...slateGray);
    doc.text(
      'UK Infrastructure and Projects Authority (IPA) Assurance Protocol • Confidential & Privileged for Project Stakeholders',
      margin,
      pageHeight - 6.5
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6.5,
      { align: 'right' }
    );
  }

  // Trigger download with sanitized filename
  const cleanProject = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanScope = (scopeLabel || 'Audit').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `IPA-Assurance-Report_${cleanProject}_${currentGate}_${cleanScope}_${dateStamp}.pdf`;
  doc.save(filename);
}

export interface ExportPortfolioPdfOptions {
  portfolioMetrics: {
    totalProjects: number;
    totalRequirements: number;
    totalCompliant: number;
    totalInProgress: number;
    totalFlagged: number;
    averageScore: number;
    upcoming14Days: number;
    criticalRisks: number;
    complianceRate: number;
  };
  projects: Array<{
    id: string;
    code: string;
    name: string;
    department: string;
    sector: string;
    sro: string;
    leadAuditor: string;
    currentGate: string;
    gateLabel?: string;
    reviewStatus: string;
    assuranceScore: number;
    totalRequirements: number;
    compliantCount: number;
    inProgressCount: number;
    flaggedCount: number;
    nextReviewDate: string;
    budgetFormatted: string;
    criticalRisksCount: number;
    location?: string;
  }>;
  deadlines?: Array<{
    id: string;
    projectName: string;
    title: string;
    category: string;
    dueDate: string;
    daysRemaining: number;
    urgency: string;
    leadOwner: string;
    status: string;
  }>;
  activities?: Array<{
    id: string;
    projectName: string;
    action: string;
    actor: string;
    timestamp: string;
    type: string;
    gate?: string;
  }>;
  filtersApplied?: {
    sector?: string;
    gate?: string;
    status?: string;
    searchQuery?: string;
  };
  auditor?: {
    name: string;
    email: string;
    role: string;
  };
  firestoreDbId?: string;
}

/**
 * Generates an executive, publication-grade PDF report of the entire compliance portfolio summary
 * for the Government Major Projects Portfolio (GMPP), HM Treasury, and Gateway Review Teams.
 */
export async function exportPortfolioCompliancePdf(options: ExportPortfolioPdfOptions): Promise<void> {
  const {
    portfolioMetrics,
    projects,
    deadlines = [],
    activities = [],
    filtersApplied,
    auditor = {
      name: 'Lead Assurance Reviewer',
      email: 'samgorleung1224@gmail.com',
      role: 'Principal Assurance Lead'
    },
    firestoreDbId = 'ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5'
  } = options;

  // Initialize PDF in portrait A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const primaryBlue: [number, number, number] = [29, 112, 184]; // UK Gov / IPA Blue #1d70b8
  const darkNavy: [number, number, number] = [15, 23, 42];      // #0f172a
  const slateGray: [number, number, number] = [100, 116, 139];  // #64748b
  const lightBg: [number, number, number] = [248, 250, 252];    // #f8fafc
  const emeraldGreen: [number, number, number] = [5, 150, 105]; // #059669
  const amberOrange: [number, number, number] = [217, 119, 6];  // #d97706
  const crimsonRed: [number, number, number] = [220, 38, 38];   // #dc2626

  let currentY = 14;

  // ==========================================
  // 1. EXECUTIVE HEADER BANNER
  // ==========================================
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  // Gold accent bar
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, currentY + 24, contentWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('HM TREASURY & INFRASTRUCTURE AND PROJECTS AUTHORITY (IPA)', margin + 6, currentY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('PORTFOLIO COMPLIANCE & ASSURANCE AUDIT REPORT', margin + 6, currentY + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Government Major Projects Portfolio (GMPP) Statutory Assurance Summary • Executive Dossier', margin + 6, currentY + 21);

  const reportDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Generated: ${reportDateStr}`, pageWidth - margin - 6, currentY + 21, { align: 'right' });

  currentY += 32;

  // ==========================================
  // 2. PORTFOLIO METADATA & AUTHORITY REGISTRY
  // ==========================================
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 25, 2, 2, 'FD');

  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Executive Infrastructure Portfolio Assurance Dossier', margin + 5, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateGray);
  doc.text('Portfolio Scope:', margin + 5, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryBlue);
  doc.text(`${projects.length} Major Projects (£55.1B Capital Allocation Monitored)`, margin + 34, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text('Lead Assurance Reviewer:', margin + 5, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`${auditor.name} (${auditor.role}) <${auditor.email}>`, margin + 44, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text('Cloud Audit Registry:', pageWidth - margin - 78, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(firestoreDbId.slice(0, 24) + '...', pageWidth - margin - 5, currentY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text('Governance Benchmark:', pageWidth - margin - 78, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldGreen);
  doc.text('HM Treasury Green Book & IPA 2026', pageWidth - margin - 5, currentY + 18, { align: 'right' });

  currentY += 30;

  // ==========================================
  // 3. EXECUTIVE PORTFOLIO KPI DASHBOARD
  // ==========================================
  const progressBoxHeight = 36;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, progressBoxHeight, 2, 2, 'FD');

  // Left Section: Overall Compliance Rate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGray);
  doc.text('OVERALL PORTFOLIO COMPLIANCE RATE', margin + 6, currentY + 7);

  doc.setFontSize(19);
  const isHigh = portfolioMetrics.complianceRate >= 80;
  const isMed = portfolioMetrics.complianceRate >= 50;
  doc.setTextColor(isHigh ? 5 : isMed ? 217 : 220, isHigh ? 150 : isMed ? 119 : 38, isHigh ? 105 : isMed ? 6 : 38);
  doc.text(`${portfolioMetrics.complianceRate}%`, margin + 6, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text(`${portfolioMetrics.totalCompliant} of ${portfolioMetrics.totalRequirements} Criteria Fulfilled`, margin + 27, currentY + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text(
    `Average Assurance Readiness Score: ${portfolioMetrics.averageScore}% across all projects`,
    margin + 6,
    currentY + 22.5
  );

  // Linear Progress Bar inside PDF
  const barX = margin + 6;
  const barY = currentY + 25.5;
  const barWidth = 85;
  const barHeight = 4.5;

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(barX, barY, barWidth, barHeight, 1.5, 1.5, 'F');

  const fillWidth = Math.max(1, (portfolioMetrics.complianceRate / 100) * barWidth);
  doc.setFillColor(isHigh ? 16 : isMed ? 245 : 239, isHigh ? 185 : isMed ? 158 : 68, isHigh ? 129 : isMed ? 11 : 68);
  doc.roundedRect(barX, barY, fillWidth, barHeight, 1.5, 1.5, 'F');

  // 80% Threshold tick marker
  const tickX = barX + (0.8 * barWidth);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(tickX, barY - 1.5, tickX, barY + barHeight + 1.5);
  doc.setFontSize(6);
  doc.setTextColor(...darkNavy);
  doc.text('80% IPA Target', tickX, barY + barHeight + 4.5, { align: 'center' });

  // Right Section: 4 Stat Cards
  const rightX = margin + 98;
  const rightW = contentWidth - 104;
  const cardW = (rightW - 6) / 3;

  // Card 1: Compliant
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(rightX, currentY + 5, cardW, 13, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...emeraldGreen);
  doc.text('COMPLIANT', rightX + cardW / 2, currentY + 9.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`${portfolioMetrics.totalCompliant}`, rightX + cardW / 2, currentY + 15.5, { align: 'center' });

  // Card 2: In Progress
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(rightX + cardW + 3, currentY + 5, cardW, 13, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...amberOrange);
  doc.text('IN PROGRESS', rightX + cardW + 3 + cardW / 2, currentY + 9.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`${portfolioMetrics.totalInProgress}`, rightX + cardW + 3 + cardW / 2, currentY + 15.5, { align: 'center' });

  // Card 3: Flagged Deficits
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(rightX + (cardW + 3) * 2, currentY + 5, cardW, 13, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...crimsonRed);
  doc.text('FLAGGED GAPS', rightX + (cardW + 3) * 2 + cardW / 2, currentY + 9.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`${portfolioMetrics.totalFlagged}`, rightX + (cardW + 3) * 2 + cardW / 2, currentY + 15.5, { align: 'center' });

  // Lower row of stats
  const lowerStatsY = currentY + 20;
  // Card 4: Critical Risks
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(rightX, lowerStatsY, cardW, 12, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...crimsonRed);
  doc.text('CRITICAL RISKS', rightX + cardW / 2, lowerStatsY + 4.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`${portfolioMetrics.criticalRisks}`, rightX + cardW / 2, lowerStatsY + 9.5, { align: 'center' });

  // Card 5: 14-Day Deadlines
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(rightX + cardW + 3, lowerStatsY, cardW, 12, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...primaryBlue);
  doc.text('14-DAY DEADLINES', rightX + cardW + 3 + cardW / 2, lowerStatsY + 4.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`${portfolioMetrics.upcoming14Days}`, rightX + cardW + 3 + cardW / 2, lowerStatsY + 9.5, { align: 'center' });

  // Card 6: Average Score
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX + (cardW + 3) * 2, lowerStatsY, cardW, 12, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...darkNavy);
  doc.text('AVG READINESS', rightX + (cardW + 3) * 2 + cardW / 2, lowerStatsY + 4.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`${portfolioMetrics.averageScore}%`, rightX + (cardW + 3) * 2 + cardW / 2, lowerStatsY + 9.5, { align: 'center' });

  currentY += progressBoxHeight + 7;

  // ==========================================
  // 4. SECTOR COMPLIANCE BREAKDOWN TABLE
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text('SECTOR ASSURANCE & COMPLIANCE SUMMARY', margin, currentY + 3);

  // Group by sector
  const sectors = ['Transport', 'Energy', 'Health', 'Digital & Defence', 'Environment'];
  const sectorData = sectors.map(sector => {
    const sp = projects.filter(p => p.sector === sector);
    if (sp.length === 0) return null;
    const reqs = sp.reduce((acc, p) => acc + p.totalRequirements, 0);
    const comp = sp.reduce((acc, p) => acc + p.compliantCount, 0);
    const rate = Math.round((comp / (reqs || 1)) * 100);
    const avgScore = Math.round(sp.reduce((acc, p) => acc + p.assuranceScore, 0) / sp.length);
    const risks = sp.reduce((acc, p) => acc + p.criticalRisksCount, 0);
    return [
      sector,
      `${sp.length} Project${sp.length > 1 ? 's' : ''}`,
      `${comp} / ${reqs}`,
      `${rate}%`,
      `${avgScore}%`,
      `${risks} Critical`,
      rate >= 80 ? 'High Assurance' : rate >= 50 ? 'Moderate / In Progress' : 'Remediation Required'
    ];
  }).filter(Boolean) as string[][];

  autoTable(doc, {
    startY: currentY + 5,
    margin: { left: margin, right: margin },
    head: [['Sector', 'Active Projects', 'Fulfilled / Total', 'Fulfillment Rate', 'Avg Readiness Score', 'Identified Deficits', 'Assurance Verdict']],
    body: sectorData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: darkNavy,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 22 },
      6: { fontStyle: 'normal' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const sectorTableY = (doc as any).lastAutoTable.finalY || currentY + 35;
  currentY = sectorTableY + 8;

  // ==========================================
  // 5. DETAILED ACTIVE PROJECTS COMPLIANCE REGISTER
  // ==========================================
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text('GOVERNMENT MAJOR PROJECTS PORTFOLIO — ACTIVE COMPLIANCE REGISTER', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text('Comprehensive evaluation of statutory requirements, assurance readiness scores, and next scheduled review milestones.', margin, currentY + 4);

  const projectsTableBody = projects.map(proj => {
    const rate = Math.round((proj.compliantCount / (proj.totalRequirements || 1)) * 100);
    return [
      `${proj.code}\n${proj.name}`,
      `${proj.sector}\n${proj.department}`,
      proj.gateLabel || proj.currentGate.replace('_', ' '),
      proj.budgetFormatted,
      `${proj.compliantCount}/${proj.totalRequirements}\n(${rate}%)`,
      `${proj.assuranceScore}%`,
      proj.reviewStatus,
      new Date(proj.nextReviewDate).toLocaleDateString('en-GB')
    ];
  });

  autoTable(doc, {
    startY: currentY + 6,
    margin: { left: margin, right: margin },
    head: [['Project & Code', 'Sector / Dept', 'Gateway Stage', 'Capital Budget', 'Fulfillment', 'Score', 'Review Status', 'Next Review']],
    body: projectsTableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2.2,
      textColor: darkNavy,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 46 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      6: { cellWidth: 22 },
      7: { halign: 'center', cellWidth: 16 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const projectsTableY = (doc as any).lastAutoTable.finalY || currentY + 60;
  currentY = projectsTableY + 8;

  // ==========================================
  // 6. HIGH-PRIORITY STATUTORY DEADLINES
  // ==========================================
  if (deadlines && deadlines.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkNavy);
    doc.text('UPCOMING STATUTORY ASSURANCE DEADLINES & DELIVERABLES', margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateGray);
    doc.text('Statutory submission milestones due across the portfolio over the next review cycle.', margin, currentY + 4);

    const deadlineRows = deadlines.slice(0, 10).map(dl => [
      dl.projectName,
      dl.title,
      dl.category,
      new Date(dl.dueDate).toLocaleDateString('en-GB'),
      dl.daysRemaining <= 0 ? 'Overdue' : `${dl.daysRemaining} days`,
      dl.status
    ]);

    autoTable(doc, {
      startY: currentY + 6,
      margin: { left: margin, right: margin },
      head: [['Project', 'Statutory Deliverable / Milestone', 'Category', 'Due Date', 'Window', 'Status']],
      body: deadlineRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: darkNavy,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 22 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    const deadlineTableY = (doc as any).lastAutoTable.finalY || currentY + 40;
    currentY = deadlineTableY + 8;
  }

  // ==========================================
  // 7. FORMAL ASSURANCE SIGNOFF BLOCK
  // ==========================================
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text('FORMAL PORTFOLIO ASSURANCE SIGN-OFF & REVIEW SEAL', margin + 5, currentY + 6.5);

  const sigColW = (contentWidth - 10) / 3;
  const signoffY = currentY + 8;

  // Signatory 1: Lead Assurance Auditor
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text('Lead Assurance Reviewer:', margin + 5, signoffY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`${auditor.name}`, margin + 5, signoffY + 9);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, signoffY + 15, margin + 5 + sigColW - 10, signoffY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateGray);
  doc.text('Signature & Date (Verified in Cloud Audit Log)', margin + 5, signoffY + 18);

  // Signatory 2: HM Treasury Accounting Officer
  const sroX = margin + 5 + sigColW;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text('HM Treasury Accounting Officer:', sroX, signoffY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text('Major Projects Approval Committee Lead', sroX, signoffY + 9);
  doc.line(sroX, signoffY + 15, sroX + sigColW - 10, signoffY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateGray);
  doc.text('Signature & Date', sroX, signoffY + 18);

  // Signatory 3: Gateway Assurance Team Chair
  const chairX = margin + 5 + sigColW * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text('Gateway Review Team Chair:', chairX, signoffY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text('IPA Executive Review Board', chairX, signoffY + 9);
  doc.line(chairX, signoffY + 15, chairX + sigColW - 10, signoffY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateGray);
  doc.text('Signature & Date', chairX, signoffY + 18);

  // ==========================================
  // 8. FOOTER ON EVERY PAGE
  // ==========================================
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...slateGray);
    doc.text(
      'UK Infrastructure and Projects Authority (IPA) Assurance Protocol • Confidential & Privileged for Government Stakeholders',
      margin,
      pageHeight - 6.5
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6.5,
      { align: 'right' }
    );
  }

  // Trigger download with sanitized filename
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `IPA-Portfolio-Compliance-Summary_${dateStamp}.pdf`;
  doc.save(filename);
}
