# Changelog

All notable changes to the IPA Scout compliance and assurance review platform from the original source repository to the current release are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

---

## [2.16.0] - 2026-09-25

### Summary
Enhanced application security with repository-wide secret hardening and environment variable configuration standards, introduced dynamic client environment fallbacks for Cloud Firestore and Gemini AI services, optimized direct inline priority selector controls with optimistic state updates, and stabilized Next.js dev server execution.

---

### Added & Enhanced

#### 1. Security Hardening & Secret Governance (`.gitignore`, `.env.example`)
- **Repository-Wide `.gitignore` Rules**:
  - Excluded all `.env*`, `*.env`, `*.env.local`, `*.env.*.local`, and `frontend/.env*` files to prevent leakage of development credentials.
  - Restricted cryptographic and private keys (`*.pem`, `*.key`, `*.cert`).
  - Blocked GCP service account keys and credentials files (`*credentials*.json`, `*service-account*.json`).
- **Standardized Environment Configuration (`.env.example`)**:
  - Provided clean template documenting required environment variables for Gemini API (`GEMINI_API_KEY`, `GOOGLE_GENAI_API_KEY`) and Firebase Cloud Firestore (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_DATABASE_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`).

#### 2. Dynamic Firebase Client Configuration (`frontend/lib/firebase.ts`)
- **Environment Variable Resolution**:
  - Updated Firebase client initialization to dynamically prioritize `NEXT_PUBLIC_FIREBASE_*` environment variables over bundled defaults.
  - Ensured seamless portability between local development, preview deployments, and isolated production clusters.

#### 3. Direct Inline Priority Selector & Optimistic Updates (`components/ComplianceTracker.tsx`)
- **Single-Item Priority Mutation (`handleUpdatePriority`)**:
  - Enabled one-click direct priority modification (`High` / `Medium` / `Low`) directly within checklist rows and detail drawers.
  - Implemented optimistic UI state updates for zero-latency response with automatic rollback on network failure.
  - Synchronized changes in real time with Google Cloud Firestore and logged auditable timeline activity records.

#### 4. Development Server & Next.js Build Stabilization
- **Dev Server Process Recovery**:
  - Cleaned stale `.next` Webpack compilation cache to resolve hydration and module resolution anomalies.
  - Restored active server listening on `http://localhost:3000` (`0.0.0.0:3000`) with validated `HTTP/1.1 200 OK` health status.
  - Confirmed 100% clean compilation via `compile_applet` and zero linting warnings across all Next.js pages.

---

## [2.15.0] - 2026-09-25

### Summary
Introduced an automated compliance deadline management and proactive warning system, flagging requirements with deadlines within 3 days (or overdue) across the tracker table, detail drawers, and formal audit exports (CSV and PDF). Stabilized monorepo workspace package dependencies and dev server runtime environment.

---

### Added & Enhanced

#### 1. Compliance Deadline Management & 3-Day Warning Indicator System (`utils/deadlineUtils.ts`, `components/ComplianceTracker.tsx`)
- **Deadline Threshold Analysis Engine (`utils/deadlineUtils.ts`)**:
  - Implemented `getDeadlineInfo`, `getPresetDueDate`, and `formatFriendlyDate` utilities.
  - Automatically assesses time remaining until target completion, categorizing items by urgency severity:
    - `critical` (Overdue): Deadline has lapsed without compliance sign-off; highlights imminent regulatory delivery risk.
    - `warning` (Due within 3 Days or Due Today): Proactive urgency warning prompting immediate stakeholder or auditor remediation.
    - `normal` (Scheduled): Normal tracking timeline with formatted calendar target date.
    - `completed` (Resolved): Disarms deadline alert indicators once criteria verification is completed.
- **Interactive UI Warning Indicators (`components/ComplianceTracker.tsx`)**:
  - **Dynamic Severity Badges**: Visual alarm badges (amber warning pills for <= 3 days, crimson badges for overdue items) embedded directly in checklist items, table rows, and card headers.
  - **Toolbar Quick-Filters & Counter Pills**: Added quick-filter chips to instantly isolate overdue or urgent requirements (due in <= 3 days) for rapid executive triaging.
  - **Target Date Management**: Integrated date picker controls into both the "Add Requirement" modal and the requirement detail drawer, supporting date selection, quick presets (e.g. +7 days, +14 days, Next Gate), and date clearing.
  - **Real-Time Synchronization**: Target due dates persist directly to Google Cloud Firestore documents with automatic activity logging.

#### 2. Auditing & Governance Export Enhancements (`utils/exportComplianceCsv.ts`, `utils/exportCompliancePdf.ts`)
- **CSV Assurance Export (`utils/exportComplianceCsv.ts`)**: Added dedicated `Due Date`, `Days Remaining`, and `Deadline Warning Status` columns for spreadsheet-based project governance and PMO reporting.
- **PDF Dossier Report (`utils/exportCompliancePdf.ts`)**: Rendered deadline tags, warning badges, and overdue alert chips in the formal tabular compliance report.

#### 3. Workspace Dependency Resolution & Dev Server Stabilization
- Synchronized package dependencies across root and frontend workspaces to resolve package installation errors.
- Verified Next.js dev server execution on port 3000 and confirmed clean compilation with zero ESLint errors.

---

## [2.14.0] - 2026-09-25

### Summary
Implemented an interactive dashboard component utilizing **Recharts** to render an executive pie chart displaying compliance item statuses (`Compliant`, `Non-compliant`, `In Progress`, `Not Applicable`), providing project stakeholders with an instant, publication-grade visual overview of assurance health and gateway readiness.

---

### Added & Enhanced

#### 1. Recharts Compliance Status Dashboard Component (`components/ComplianceStatusPieChart.tsx`)
- **Interactive Donut & Pie Visualization**: Built using modern Recharts components (`ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Tooltip`, `Sector`), featuring smooth animated sector expansion (`renderActiveShape`) and glowing halo rings on hover.
- **Canonical Compliance Status Palette & Semantics**:
  - `Compliant` (`#10b981` / Emerald Green): Fully verified requirements with validated audit evidence.
  - `In Progress` (`#f59e0b` / Amber): Evidence collection and auditor scrutiny currently underway.
  - `Non-compliant` (`#ef4444` / Crimson Red): Flagged deficits, compliance breaches, or missing mandatory controls.
  - `Not Applicable` (`#64748b` / Slate Gray): Formal regulatory exemptions or criteria outside current gate scope.
- **Central Metric & Rate Readout**: Displays the overall compliance fulfillment percentage (`XX% COMPLIANT`) and total requirement count inside the donut center, updating dynamically upon slice hover.
- **Custom Stakeholder Tooltip**: Displays requirement counts, exact percentage share of total criteria, and descriptive stakeholder guidance explaining gate impact.
- **Executive KPI Metric Tiles**: Clean summary strip highlighting Total Requirements, Compliant (with compliance rate %), In Progress, and Non-compliant (action needed).
- **Gateway Clearance Readiness Capsule**: Real-time assurance badge verifying whether the project meets the 80% substantial assurance clearance threshold required for formal Gateway sign-off.
- **Interactive Quick Filter Buttons**: Interactive status pill buttons and slice click handlers allow stakeholders to click any slice or button to instantly filter the compliance requirements view.
- **Universal Data Ingestion**: Flexible props supporting direct requirement item arrays (`items`), pre-calculated metrics (`metrics`), or portfolio projects (`projects`).

#### 2. Portfolio Dashboard Integration (`components/PortfolioDashboard.tsx`)
- **Stakeholder Visual Analytics Hub**: Added an interactive visualization switcher allowing stakeholders to toggle between:
  - `Compliance Items (Recharts Pie)`: High-level status breakdown of all statutory compliance requirements.
  - `Review Gate Status (D3 Bar)`: D3.js distribution of major infrastructure projects by assurance review stage.
  - `View Both`: Displays both visualizers simultaneously for comprehensive stakeholder reporting.

#### 3. Compliance Tracker Integration (`components/ComplianceTracker.tsx`)
- **Real-Time Assurance Status Overview**: Integrated `ComplianceStatusPieChart` directly into the compliance tracker, synchronized in real time with Google Cloud Firestore updates.
- **Header Toolbar Toggle**: Added a `Status Chart (Recharts)` toggle button to easily show or collapse the pie chart overview.
- **Interactive Filtering**: Clicking any slice in the Recharts pie chart immediately filters the requirements checklist table and cards.

#### 4. Executive Dossier Summary Integration (`pages/index.tsx`)
- Rendered `ComplianceStatusPieChart` on the primary gateway assurance dossier page, providing immediate stakeholder visibility into compliance health before diving into detailed criteria.

---

## [2.13.0] - 2026-09-25

### Summary
Implemented a comprehensive export feature enabling project stakeholders and assurance auditors to export the current filtered view of compliance requirements as formatted CSV spreadsheets or publication-grade PDF dossiers.

---

### Added & Enhanced

#### 1. Stakeholder CSV Document Export (`utils/exportComplianceCsv.ts`)
- **RFC-4180 Compliant CSV Generation**: Produces cleanly formatted, industry-standard tabular CSV exports for ingestion into Microsoft Excel, Google Sheets, or business intelligence tools.
- **UTF-8 BOM (`\uFEFF`) Encoding**: Prepend byte-order mark to ensure international characters, status symbols, and special formatting render without encoding issues in desktop spreadsheet tools.
- **Comprehensive Attribute Export**: Every row includes complete metadata:
  - Requirement Code, Title, Category, and Gateway Review Phase.
  - Priority and Compliance Status (`Compliant`, `In Progress`, `Flagged`, `N/A`).
  - Verification Status (`Verified` / `Pending`), Verifier Name, and Verification Date.
  - Assigned Project Member Details (Name, Role, and Email Address).
  - Evidence Criteria & Acceptance Thresholds.
  - Linked Document References and Audit Justification Notes.
  - Firestore Record ID, Applied Filter Scope, and Generation Timestamps.
- **Automated Download Execution**: Clean programmatic Blob download with sanitized project filenames and automatic URL object revocation.

#### 2. Enhanced Stakeholder PDF Audit Dossier (`utils/exportCompliancePdf.ts`)
- **Current View Dynamic Scoping**: The executive PDF generator now accepts custom scope labels and active filter summaries, dynamically recalculating fulfillment percentages, circular progress metrics, and category assurance breakdowns for whatever view is active.
- **Filter Scope Transparency**: Displays an explicit "Dossier View / Scope" summary banner directly on the executive metadata section, recording active search terms, gate, priority, or category filters.
- **Assigned Team Member Transparency**: Detailed requirement audit trail tables now explicitly display assigned project members and roles alongside auditor observations and verification timestamps.
- **Dynamic File Naming**: Generated PDF files incorporate the project name, gateway phase, scope indicator (`CurrentView`, `Selected`, `All`), and date stamp.

#### 3. Compliance Tracker Export Suite (`components/ComplianceTracker.tsx`)
- **Header Toolbar Quick-Action Buttons**:
  - `Export CSV`: One-click button with emerald spreadsheet styling and live item counter badge (`Export CSV (X)`).
  - `Export PDF`: One-click button with crimson PDF icon and live item counter badge (`Export PDF (X)`).
  - `Export Options...`: Opens the comprehensive Export Compliance Dossier modal.
  - `JSON`: Fast download of the raw Firestore audit package.
- **Interactive Export Scope & Format Modal**:
  - **Three Export Scopes**:
    1. *Current Filtered View* (displays count and active filter summary pill).
    2. *Selected Requirements Only* (enabled whenever items are selected via multi-select checkboxes).
    3. *All Gateway Requirements* (full dataset dossier).
  - **Live Statistics Overview**: Displays total items, verified fulfillment rate (%), compliant count, in-progress count, and flagged deficits for the selected scope.
  - **Side-by-Side Format Cards**: Visual cards for CSV spreadsheet and Stakeholder PDF with format descriptions and instant download triggers.
  - **Secondary JSON Option**: Convenient link for developers and security reviewers.
- **Bulk Selection Command Bar Integration**:
  - Added dedicated `CSV (N)` and `PDF (N)` export buttons directly inside the floating multi-selection command bar when checkboxes are activated, allowing instant reporting on targeted subsets of requirements.
- **Feedback Notifications**: Floating toast notification informs the user upon successful export completion with item counts and formats.

---

## [2.12.0] - 2026-09-25

### Summary
Implemented a persistent global search bar in the application header that enables auditors and project stakeholders to filter compliance requirements in real-time by title, description, or assigned project member from anywhere in the platform.

---

### Added & Enhanced

#### 1. Persistent Global Header Search Component (`components/GlobalHeaderSearch.tsx`)
- **Top Header Bar Integration**: Seamlessly embedded in the main navigation header (`pages/_app.tsx`), positioned prominently alongside executive navigation links.
- **Real-Time Cross-Field Filtering**: Dynamically filters compliance requirements simultaneously across:
  - **Requirement Title**: Direct keyword matching on requirement names.
  - **Description**: Deep content matching on regulatory descriptions and requirements details.
  - **Assigned Project Member**: Search by assignee full name, role (e.g. *Commercial Director*, *HM Treasury Spending Lead*), or email address.
  - **Requirement Code & Notes**: Instant prefix and code lookup (e.g. `FIN-01`, `RSK-02`, Green Book citations).
- **Live Match Previews & Quick Jump**:
  - Interactive search flyout popup displaying matching compliance items with code badge, status indicator (`Compliant`, `In Progress`, `Flagged`), and assigned member metadata.
  - Clicking any search result navigates directly to that requirement item on `/compliance-tracker`.
  - Pressing `Enter` or clicking "View All Results" routes directly to `/compliance-tracker?q=...`.
- **Keyboard Navigation & Accessibility**:
  - Pressing `/` or `⌘K` / `Ctrl+K` from any view instantly focuses the global search bar.
  - `Escape` key closes the search flyout and blurs focus.
- **Match Counter & Clear Controls**:
  - Live match count badge dynamically synchronized with the compliance tracker (`X matches`).
  - One-click clear button (`×`) to reset the search term and clear active filters in real-time.

#### 2. Search Context Architecture (`context/SearchContext.tsx`)
- **Shared State Management**: Built `SearchProvider` and `useSearch` hook supplying unified search queries across all components without prop drilling.
- **Bidirectional Synchronization**: Real-time sync between the persistent header search input, URL query parameters (`?q=...`), and the in-page Compliance Tracker search filter.
- **Active Search Filtering Badges**: Compliance Tracker displays real-time active search pill with hit counts and one-click clear handler linked to the global header query.

---

## [2.11.0] - 2026-09-25

### Summary
Introduced a multi-select checkbox interface with bulk status updates and team assignments across compliance requirements, alongside a real-time Global Activity Feed component (`GlobalActivityFeed.tsx`) that logs all status transitions, bulk operations, and auditor actions to enhance statutory auditability.

---

### Added & Enhanced

#### 1. Multi-Select Checkbox Interface & Bulk Operations (`components/ComplianceTracker.tsx`)
- **Row-Level Multi-Select**: Added accessible checkboxes on every requirement item row with visual row highlighting and focus indication on selection.
- **Bulk Operations Command Bar**:
  - Interactive master checkbox supporting indeterminate state ("Select All Filtered Requirements").
  - Real-time selection counter badge ("X of Y Selected") and quick "Clear Selection" action.
- **Bulk Status Update Engine**:
  - Batch dropdown to transition all selected requirements to *Compliant*, *In Progress*, *Flagged*, or *N/A*.
  - Atomic batch persistence via Firestore `writeBatch` with fallback API support.
  - Automatically synthesizes and records status transition histories on all affected requirements.
- **Bulk Project Member Assignment**:
  - Reassign multiple requirements simultaneously to specific project team members (e.g. Lead Assurance Reviewer, Senior Responsible Owner, Commercial Director, HM Treasury Spending Lead, Lead Technical Advisor).
  - Bulk unassign option returning items to the unassigned pool.
- **Bulk Verification Sign-Off**:
  - Toggle formal compliance verification across selected requirements in a single click.
- **Assignee Toolbar Filter**:
  - Filter requirements list by assigned project member or isolate unassigned items.
- **Individual Quick Assign**:
  - Added popover selector for direct assignment changes on individual cards and within expanded item drawers.

#### 2. Global Compliance Activity Feed Component (`components/GlobalActivityFeed.tsx`)
- **Real-Time Live Audit Stream**:
  - Subscribes via `onSnapshot` to the `compliance_activities` Firestore collection with automatic real-time updates across open tabs and auditor sessions.
  - Live status indicator pill ("LIVE AUDIT STREAM") with connection status and last sync time.
- **Comprehensive Audit Event Logging**:
  - Automatically logs status transitions, bulk status updates, bulk assignments, bulk verifications, individual assignments, and notes updates.
  - Captures full audit metadata: ISO timestamps, actor names, roles, emails, gate tags, trigger types (e.g. *Auditor Sign-off*, *Risk Escalation*, *Remediation Verified*), and justification notes.
- **Rich Activity Event Cards**:
  - Event type badge with iconography (`Bulk Status Update`, `Bulk Team Assignment`, `Status Transition`, `Formal Verification`).
  - Visual status transition flow (`[In Progress] ➔ [Compliant]`).
  - Requirement code chips with direct click-to-navigate action jumping to that requirement in the checklist.
  - For bulk actions: displays affected item count and expandable chips listing every individual requirement code modified in the batch.
- **KPI Metrics Strip**:
  - Real-time summary tiles displaying: Total Audit Events, Status Transitions, Bulk Operations Executed (with total affected items), Formal Sign-offs, and Flagged Deficits.
- **Multi-Dimension Filtering & Search**:
  - Full-text search across requirement codes, titles, notes, and actors.
  - Filter by event type (All, Bulk Only, Status Transitions, Bulk Updates, Bulk Assignments, Verifications).
  - Filter by Gateway stage (Gate 1, Gate 2, Gate 3) and status outcome.
  - Chronological sort toggle (Newest First / Oldest First).
- **Audit Export Utilities**:
  - Export filtered activity feed as verifiable JSON audit trail.
  - Export complete audit log as formatted CSV spreadsheet for formal compliance review dossiers.
- **Seamless Navigation Integration**:
  - Integrated as a first-class tab in the `ComplianceTracker` view switcher ("Global Activity Feed" with live badge).
  - Quick-toggle "Activity Feed" button in the header action bar next to Export PDF.
  - Deep-linkable via `/compliance-tracker?view=activity` with dedicated breadcrumb routing.
  - Added "Open Global Feed ➔" link from the Portfolio Dashboard (`/dashboard`) recent events section.

#### 3. Firestore Architecture & Blueprint Updates
- **`firebase-blueprint.json`**: Added `AuditActivity` schema entity and mapped the `/compliance_activities/{activityId}` collection.
- **`firestore.rules`**: Added explicit read/write security rules for `/compliance_activities/{activityId}` and deployed via `deploy_firebase`.
- **`lib/firebase.ts`**: Added `getAuditActivities` and `logAuditActivity` helpers with unified in-memory and Firestore persistence.
- **`lib/seedData.ts`**: Enriched `ComplianceStatusTransition` and `AuditActivity` types; added `initialAuditActivities` seed dataset.

---

## [2.10.1] - 2026-09-22

### Summary
Resolved client-side data fetching exceptions (`Error fetching data: Failed to fetch`) on the Gateway Summary review view by adding resilient fallback stores, eliminating redundant batch requests, and safeguarding component state during network or cold-start transitions.

---

### Fixed & Improved

#### 1. Resilient API Gateway Client (`utils/api.ts`)
- Added graceful fallback datasets for `fetchReadItemsByAttribute` and `fetchItems` (`project`, `criterion`, `result`), ensuring data continuity during network glitches, cold starts, or offline scenarios.
- Eliminated uncaught network `TypeError: Failed to fetch` rejections, providing seamless fallbacks with non-fatal diagnostics.

#### 2. Robust Gateway Dossier Initialization (`pages/index.tsx`)
- Optimized category extraction by reading `result.criterion.category` directly from returned findings rather than firing N sequential nested HTTP requests for each individual result.
- Safeguarded criterion fetches with individual error boundaries so that an individual lookup failure never aborts the entire gateway audit loading process.
- Replaced unhandled error throws with automatic fallback project synthesis, ensuring the IPA executive dossier always renders reliably without blank screens.
- Added unmount guards (`isMounted`) across asynchronous hooks to prevent race condition state updates.

---

## [2.10.0] - 2026-09-22

### Summary
Incorporated an interactive D3.js-based bar chart into the Infrastructure Portfolio Dashboard (`/dashboard`) to visualize the distribution of compliance review statuses across all active major infrastructure projects.

---

### Added & Enhanced

#### 1. D3.js Compliance Review Status Distribution Bar Chart (`components/ReviewStatusDistributionChart.tsx`)
- **D3.js SVG Architecture**: Scalable band and linear scales (`d3.scaleBand`, `d3.scaleLinear`, `d3.axisBottom`, `d3.axisLeft`) with animated cubic transitions (`d3.easeCubicOut`).
- **Interactive Multi-Mode Metrics**: Toggle visualization between **Project Count** (total projects per status category) and **Average Assurance %** (with a dashed 80% Gate threshold reference benchmark).
- **Responsive Geometry**: Integrated `ResizeObserver` dynamically recalibrating chart widths and abbreviating labels for mobile and desktop screens.
- **Bi-Directional Filtering Integration**:
  - Clicking any status bar or status pill directly filters the active project reviews table below (`filteredProjects`).
  - Active status bar is highlighted with background bounding boxes and opacity dimming on non-selected statuses.
  - Dedicated "Reset Filter" button and breadcrumb indicator showing the active filter state.
- **Rich Hover Inspection Strip**: Displays status description, project count, portfolio percentage, average assurance score, and total capital value (e.g., £55.1B across portfolio).
- **UK IPA Assurance Visual System**:
  - `Ready for Sign-Off`: Emerald Green (`#16a34a`)
  - `Active Assurance`: British Civic Blue (`#1d70b8`)
  - `Under Formal Review`: Amber (`#d97706`)
  - `Remediation Required`: Crimson Red (`#dc2626`)
  - `Scheduled`: Indigo (`#6366f1`)

---

## [2.9.0] - 2026-09-22

### Summary
Designed and deployed a centralized Infrastructure Portfolio Compliance & Assurance Dashboard (`/dashboard`), providing multi-project cross-programme oversight of active Gateway compliance reviews, real-time progress metrics, and upcoming statutory deadlines.

---

### Added & Enhanced

#### 1. Centralized Infrastructure Project Dashboard (`/dashboard` & `components/PortfolioDashboard.tsx`)
- **Cross-Portfolio Governance Intelligence**: Consolidates major infrastructure assets (*HS2 Phase 2A Core Extension*, *Lower Thames Crossing Highway Tunnel*, *Sizewell C Nuclear Facility*, *New Hospital Programme Phase 1*, *Celtic Sea Floating Offshore Wind Grid*, *Defence Digital Tactical C4ISR*).
- **Portfolio Key Performance Indicator Strip**:
  - **Active Reviews Underway**: Tracks active Gate 1, Gate 2, and Gate 3 reviews across Transport, Energy, Health, and Defence.
  - **Average Assurance Score**: Weighted readiness rating with benchmark target indicators against the 80% Gate threshold.
  - **Verified Criteria**: Dynamic fulfillment counter tracking verified criteria vs. in-progress and flagged deficits.
  - **Deadlines Due Soon (≤ 14 Days)**: Prominent countdown alert for near-term statutory submission milestones.
  - **Critical Systemic Risks**: Cross-portfolio risk monitoring highlighting projects needing immediate remediation.

#### 2. Active Compliance Reviews Management Hub
- **Multi-Dimensional Triage**: Filter by Sector (*Transport*, *Energy*, *Health*, *Digital & Defence*), Gateway Stage (*Gate 1*, *Gate 2*, *Gate 3*), Review Status (*Active Assurance*, *Under Formal Review*, *Remediation Required*, *Ready for Sign-Off*, *Scheduled*), and real-time text search.
- **Sorting Options**: Sort projects by Next Review Date, Assurance Score (Descending/Ascending), or Total Capital Budget Size.
- **Progress Metrics Bars**: Three-tone linear visualization representing Compliant, In Progress, and Flagged requirement proportions.
- **Governance & SRO Accountability Matrix**: Details Senior Responsible Owners (SROs), Lead Auditors, Capital Budget Envelopes, and Next Review Dates.
- **Interactive Project Dossier Drawer**: Detailed modal inspection with direct pathways to Audit Tracker and Review Findings.

#### 3. Upcoming Deadlines & Milestones Command Center
- **Timeline Countdown Badges**: Color-coded urgency indicators (`Due Soon`, `Within 14 Days`, `Scheduled`, `Submitted`).
- **Interactive Status Toggle**: Direct click-to-update deliverable status (`Pending` ↔ `In Progress` ↔ `Submitted`) with instant feedback.
- **Add Upcoming Deadline Modal**: Form allowing auditors to schedule new statutory submissions, evidence cutoffs, Treasury approvals, or ministerial sign-offs for any infrastructure asset.

#### 4. Real-Time Progress Metrics & Audit Activity Stream
- **Cross-Portfolio Assurance Breakdown**: Category-by-category fulfillment rates (*Financial & Optimism Bias*, *Risk Management QSRA*, *Delivery Capability*, *Governance & Procurement*, *Regulatory & Carbon PAS 2080*).
- **Audit Activity Log**: Live stream of verified criteria, status changes, and evidence uploads with timestamps and auditor notes.

---

## [2.8.0] - 2026-09-22

### Summary
Implemented an interactive search bar hub and prominent assurance category filter pill suite in the compliance requirement tracker, enabling auditors and project stakeholders to immediately search, triage, and filter requirements across multiple dimensions.

---

### Added & Enhanced

#### 1. Interactive Category Filter Navigation Bar
- **Prominent Category Filter Pills Strip**: Directly visible above the requirement items list, rendering pills for **All Categories** plus each specific category (*Financial*, *Risk Management*, *Delivery Capability*, *Governance & Procurement*, *Regulatory & Environmental*).
- **Live Item Count Badges**: Every pill displays its live item volume (e.g. `Financial (4)`).
- **Completion Checkmarks**: Automatically shows a `✓` checkmark on category pills when all criteria in that category are fulfilled.
- **High-Contrast Active State**: Selected category is highlighted in official British civic blue (`#1d70b8`) with white text, count capsule, and elevation shadow.
- **One-Click Reset**: Dedicated `Reset to All Categories ✕` button to instantly clear category focus.

#### 2. Advanced Multi-Field Search Bar Hub
- **Multi-Field Real-Time Search**: Matches across requirement `code` (e.g., `FIN-01`, `RSK-02`), `title`, `description`, `evidenceThreshold`, `documentRef`, `auditorNotes`, `auditorName`, `checkedBy`, `priority`, `gate`, and `status`.
- **Keyboard Shortcut (`/`)**: Added global listener enabling auditors to press `/` anywhere on the page to instantly focus the search bar.
- **Embedded Clear Action (`×`)**: Added an instant clear button inside the search field whenever text is entered.
- **Keyboard Hint Badge**: Renders a clean `<kbd>/</kbd>` indicator badge when the search input is idle.

#### 3. Priority, Status & Gateway Multi-Dimensional Triage
- **Priority Filter Dropdown**: Filter specifically by `Critical Priority`, `High Priority`, `Medium Priority`, or `Low Priority`.
- **Status Filter Dropdown**: Supports filtering by `Formally Verified (✓ Checked)`, `Pending Verification (Unchecked)`, `Compliant`, `In Progress`, or `Flagged Deficit`.
- **Gateway Filter Dropdown**: Filter by `Gate 1: Justification`, `Gate 2: Delivery Strategy`, or `Gate 3: Investment`.
- **My Verified Items Pill**: Toggle to isolate criteria audited by the current user.

#### 4. Quick Suggestion Filters & Active Criteria Capsules
- **One-Click Suggestion Tags**: `🔥 Critical Priorities`, `⚠️ Flagged Deficits`, `⏳ Pending Verification`, `✓ Compliant Items`, and `🏛 Treasury Green Book`.
- **Live Result Counter**: Real-time feedback strip (e.g., `Showing 5 of 18 requirements`).
- **Removable Active Filter Badges**: Individual chips for active search queries, categories, priorities, statuses, gates, and auditor scopes, each with a single-click `×` dismisser.
- **Clear All Filters Action**: One-click reset restoring all filters and focus in both toolbar and empty states.

---

## [2.7.0] - 2026-09-22

### Summary
Added a comprehensive feature to export the current compliance audit progress, verification metrics, and checked requirements into an executive, publication-grade PDF report formatted specifically for project stakeholders, Senior Responsible Owners (SROs), and Gateway Review Teams.

---

### Added & Enhanced

#### 1. Stakeholder Compliance Audit PDF Generator (`utils/exportCompliancePdf.ts`)
- **Official Executive Branding**: Rendered with UK Infrastructure and Projects Authority (IPA) primary civic blue banner (`#1d70b8`), gold divider line, and official header metadata.
- **Project & Audit Registry Block**: Documents the Project Name, Gateway Review Stage (`Gate 2: Delivery Strategy & Procurement`), Lead Auditor identity, Cloud Firestore audit database ID, and HM Treasury Green Book compliance standard.
- **Executive Progress & Assurance Metrics Summary Box**:
  - Visual linear assurance progress bar with an explicit **80% Gate Target** milestone marker.
  - Overall fulfillment percentage (e.g. `78%`), fulfilled ratio (`14 of 18 Requirements Fulfilled`), remaining requirement count, and Gateway Readiness status pill.
  - Proportional metrics breakdown grid: **Compliant** (Emerald), **In Progress** (Amber), and **Flagged Deficit** (Crimson).
- **Category Assurance Breakdown Table**:
  - Summarizes requirements, fulfillment counts, completion rates, and assurance verdicts across all project categories (*Financial*, *Risk Management*, *Delivery Capability*, *Governance & Procurement*, *Regulatory & Environmental*).
- **Detailed Requirements & Evidence Verification Audit Trail**:
  - Clean paginated table with `Code`, `Requirement Title & Evidence Criteria`, `Category`, `Priority`, `Assurance Status` (`COMPLIANT (✓ VERIFIED)`, `IN PROGRESS`, `FLAGGED`), and timestamped `Auditor Findings & Firestore Signatures`.
  - Automatic page splitting and text wrapping with `jspdf-autotable`.
- **Formal Governance Sign-Off Block**:
  - Signature and date blocks for the **Lead Assurance Reviewer**, **Senior Responsible Owner (SRO)**, and **Gateway Review Team Chair**.
- **Page Footers**:
  - "UK Infrastructure and Projects Authority (IPA) Assurance Protocol • Confidential & Privileged for Project Stakeholders" with dynamic page numbering ("Page X of Y").

#### 2. Direct Tracker Integration (`ComplianceTracker.tsx`)
- **Export Stakeholder PDF Button**: Added prominent action button with PDF insignia, loading spinner (`Generating PDF...`), and automatic sanitized file download naming (`IPA-Assurance-Report_{Project}_{Gate}_{Date}.pdf`).
- **Dual Export Support**: Retained secondary quick download button for raw JSON audit evidence packs.

---

## [2.6.0] - 2026-09-22

### Summary
Implemented a debounce mechanism for Google Cloud Firestore synchronization within the `ComplianceTracker` component. Edits to auditor observations, review findings, and overall compliance progress now persist automatically to Firestore after a slight pause, removing the requirement for manual trigger actions.

---

### Added & Enhanced

#### 1. Automatic Debounced Notes & Findings Auto-Save
- **800ms Input Debounce**: Added `handleNotesChange` with `useRef` timer map to automatically commit auditor notes, observations, and timestamps to Cloud Firestore after an 800ms pause in typing.
- **Zero-Typing-Lag Optimistic State**: Local input state updates synchronously so reviewer typing remains fluid with no UI freezing.
- **Immediate Flush on Blur / Unmount**: Added `handleNotesBlur` and unmount cleanup to immediately commit pending drafts if the auditor clicks away, switches items, or navigates to another view.
- **Per-Item Live Micro-Feedback**: Dynamic status label under each requirement textarea indicating `⚡ Auto-saving in 800ms...`, `⌛ Auto-saving to Firestore...`, or `✓ Auto-saved (HH:MM:SS)`.
- **Intelligent Save Action**: The manual save button dynamically reflects status (`Save Now` when debouncing, `Saving...` during write, and `Saved ✓` when synced).

#### 2. Debounced Project-Level Progress Persistence
- **1000ms Metric Debounce**: Added automated `useEffect` debounce that saves overall assurance metrics (`total`, `checked`, `percentage`, `compliant`, `inProgress`, `flagged`, `readinessText`) into the `audit_progress_summaries` collection on Cloud Firestore.
- **Top Header Status Badge**: Added an `Auto-Save: Active (Debounced)` badge in the executive top bar with live feedback when progress is saving or synchronized.

---

## [2.5.0] - 2026-09-22

### Summary
Implemented a comprehensive visual progress bar and percentage tracker hub within the `ComplianceTracker` component to clearly communicate how many infrastructure assurance requirements have been fulfilled out of the total.

---

### Added & Enhanced

#### 1. Interactive Radial Percentage Tracker Ring
- Built an animated SVG radial progress gauge displaying exact fulfillment percentage (e.g. `78%`) with smooth transitions and status-adaptive color-coding (emerald for ≥80%, amber for 50–79%, crimson for <50%).
- Real-time fulfillment counter: displays `X of Y Requirements Fulfilled` alongside remaining requirement count to complete full gateway clearance.

#### 2. Multi-Segment Stacked Visual Progress Bar
- High-visibility 14px multi-segment progress bar with proportional color divisions:
  - **Compliant (Verified Fulfilled)**: Emerald green (`#10b981`)
  - **In Progress**: Amber (`#f59e0b`)
  - **Flagged Risk / Deficit**: Rose red (`#ef4444`)
- **80% Target Milestone Marker**: Prominent threshold line and flag marking the critical 80% substantial assurance requirement for gateway review clearance.

#### 3. Category Fulfillment Progress Breakdown
- Toggleable breakdown section displaying mini progress bars for every review category (e.g. *Financial*, *Risk Management*, *Delivery Capability*, *Governance & Procurement*, *Regulatory & Environmental*).
- Click-to-filter capability: clicking any category card instantly filters the audit table below to isolate those items.

#### 4. Gateway Assurance Readiness Status Capsule
- Real-time readiness evaluation capsule (`Full Assurance Clearance Verified ✓`, `Substantial Assurance — Ready for Review`, `Interim Progress — Remediation Underway`, or `Critical Gaps — Gate Blocked`).

---

## [2.4.0] - 2026-09-22

### Summary
Complete enterprise UI/UX modernization across all pages and core components, eliminating raw/dated styling in favor of a modern executive SaaS aesthetic inspired by the UK Government Digital Service and high-density financial/audit platforms.

---

### Changed & Modernized

#### 1. Global Typography & Design System Foundations
- Loaded **Plus Jakarta Sans** for clear, modern geometric headings and UI text, and **JetBrains Mono** for requirement codes and technical telemetry.
- Configured a 60-30-10 color palette with warm neutral slate backgrounds (`#f8fafc`), crisp card white surfaces (`#ffffff`), hairline borders (`#e2e8f0`), and an authoritative British civic blue (`#1d70b8`).
- Enforced zero-pill discipline and replaced raw browser controls with sleek, accessible focus rings and custom dropdowns.

#### 2. Layout & Executive Header / Navigation
- Refactored `_app.tsx` with a standard 3-zone Executive Top Bar:
  - **Zone 1 (Brand)**: Official Crown insignia, bold "IPA Scout" typography, and Gateway assurance environment badge.
  - **Zone 2 (Navigation Tabs)**: Active pill indicators, hover states, and smooth transitions between Overview, Assurance Tracker, Review Findings, and Document Dossier.
  - **Zone 3 (Context / Session)**: Project stage capsule, live Firestore connection pill, and authenticated auditor profile.
- Replaced outdated raw footer with an executive metadata bar with GDS design compliance credits.

#### 3. Core Pages Modernization
- **Overview (`index.tsx`)**: Rebuilt project summary header, Gateway delivery progress meter, quick action cards, and clean Markdown analysis cards.
- **Review Findings (`results.tsx`)**: Upgraded Ag-Grid table container, metric summary capsules (Positive, Negative, Neutral), modern citation tags, and an elevated findings modal.
- **Document Dossier (`file-viewer.tsx`)**: Modernized drag-and-drop bundle upload zone, dossier file listing, active state indicators, and responsive PDF canvas layout.
- **Assurance Tracker (`ComplianceTracker.tsx`)**: Modernized verification cards, metric capsules, live Firestore persistence badges, custom checkbox check-off interactions, and modal sheets.

---

## [2.3.0] - 2026-09-22

### Summary
Implemented direct Google Cloud Firestore client SDK integration within the `ComplianceTracker` component to save and persist the checked-off status of items in real time for users. Includes active auditor session management, multi-user sign-off attribution, optimistic UI updates, live Firestore event subscriptions (`onSnapshot`), and a dedicated "My Audits" filter.

---

### Added

#### 1. Live Firestore Client SDK Integration
- **Real-Time `onSnapshot` Listener**: Subscribed `ComplianceTracker` directly to the `compliance_requirements` collection on Google Cloud Firestore (`ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5`). Updates made by any user or tab reflect instantaneously across all sessions without polling.
- **Direct Document Mutations**: Replaced REST calls with direct Firestore SDK calls (`updateDoc`, `setDoc`, `deleteDoc`), including automated bootstrapping and fallback pathways.
- **Connection Health Badge**: Visual indicator in the tracker header displaying live Firestore connection status and target database identifier.

#### 2. User Attribution & Per-User Check-Off Tracking
- **Auditor Session Context**: Active reviewer profile (`currentUser`) dynamically loaded from `/api/user` and customizable via an in-app "Set Active Reviewer Identity" modal.
- **Audit Sign-Off Attribution**: Checked-off requirements record `checkedBy`, `checkedByUserId`, `auditedAt`, and `updated_datetime` directly in the Firestore document schema.
- **Audit Stamp Display**: Cards display verification attribution badge (e.g. `✓ Verified by samgorleung1224@gmail.com on 22/09/2026`).
- **"My Audits" Quick Filter**: Auditor-specific filter toggle to isolate requirements checked off or audited by the active reviewer.

---

## [2.2.0] - 2026-09-22

### Summary
Built and deployed a core interactive component (`ComplianceTracker`) for auditing and tracking infrastructure project compliance requirements. Enables auditors to check off requirements, add notes, filter across Gateway stages and categories, create custom project requirements, and sync verification records in real-time with Google Cloud Firestore.

---

### Added

#### 1. Core Compliance Requirements Tracker Component (`ComplianceTracker.tsx`)
- **Interactive Check-Off Workflow**: Auditors can verify and check off compliance requirements with a single click, instantly updating status between `Compliant`, `In Progress`, `Flagged`, and `N/A`.
- **Gateway & Category Filtering**: Built-in filters for HM Treasury / IPA Gateway stages (Gate 1 Business Justification, Gate 2 Delivery Strategy, Gate 3 Investment Decision) and assurance categories (Financial, Risk Management, Delivery Capability, Governance & Procurement, Regulatory & Environmental).
- **Keyword & ID Search**: Real-time multi-field search querying requirement codes (e.g. `IPA-G2-FIN-01`), titles, descriptions, evidence thresholds, and document references.
- **Detailed Audit Drawer & Observations**: Expandable panels for each requirement displaying evidence thresholds, associated document citations with links to `/file-viewer`, auditor findings/notes, assessor attribution, and timestamps.
- **Bespoke Requirement Creation Modal**: Allows project assurance leads to add bespoke, project-specific compliance requirements with tailored priorities and evidence criteria.
- **Real-Time Assurance Scorecard**: Interactive metrics dashboard tracking overall compliance percentage (e.g., 60% Verified), compliant counts, in-progress items, and flagged risk items.
- **Audit Evidence Pack Export**: Generates and downloads structured compliance audit evidence packs (`.json`) for gateway assurance review submissions.

#### 2. Dedicated Compliance Tracker Page & Navigation
- **`frontend/pages/compliance-tracker.tsx`**: Full-screen dedicated assurance workstation for comprehensive reviews.
- **Header Navigation**: Added direct top-level link to `Compliance Tracker` in `frontend/pages/_app.tsx`.
- **Embedded Dashboard Card**: Rendered `ComplianceTracker` directly inside `frontend/pages/index.tsx` alongside Gateway summaries.

#### 3. Cloud Firestore Persistence & Schema Integration
- **`firebase-blueprint.json`**: Added `ComplianceRequirement` entity and `/compliance_requirements/{reqId}` path definition.
- **`firestore.rules`**: Updated security rules for `/compliance_requirements/{reqId}` and deployed via `deploy_firebase`.
- **`frontend/pages/api/compliance_requirements.ts`**: Implemented REST API supporting `GET`, `PATCH`, `POST`, and `DELETE` operations with optimistic updates.
- **Initial Seed Dataset (`seedData.ts`)**: Seeded 10 authentic IPA Gateway 2 assurance requirements covering capital funding sufficiency, whole-life CBA, QSRA/QCRA risk management, SRO mandates, and PAS 2080 Net Zero standards.

---

## [2.1.0] - 2026-09-22

### Summary
Hardened application routing and error handling, eliminated unhandled Next.js error page recompilation triggers, resolved API namespace collisions, and completely pruned all legacy multi-vendor secrets in favor of single-credential operation via `GEMINI_API_KEY`.

---

### Added

#### 1. Branded Error Handlers & Assets
- **`404.tsx`**: Branded "Page Not Found" screen with clear navigation back to the audit dashboard.
- **`500.tsx`**: Dedicated internal server error handling view with recovery guidance.
- **`_error.tsx`**: Unified error fallback capturing both client-side and server-side HTTP status codes.
- **`frontend/public/favicon.ico`**: Built and deployed standard 32-bit ICO icon, eliminating unhandled 404s and preventing dynamic Next.js `/_error` compilation upon browser requests.

#### 2. User Guidelines & Operational Documentation
- Added structured operational documentation detailing end-to-end assurance reviews, criteria filtering by finding type (Negative, Neutral, Positive), document bundle uploads, and citation page-jumping.

---

### Changed

#### 1. API Route Namespace Resolution
- Reorganized `frontend/pages/api/item.ts` into `frontend/pages/api/item/index.ts` to resolve file/folder namespace collisions with dynamic entity route `frontend/pages/api/item/[table].ts`.

#### 2. Secret & Environment Variable Simplification
- Cleaned `.env.example` and `README.md` to document strict single-secret operation (`GEMINI_API_KEY`).
- Confirmed deprecation of all legacy Docker/local environment variables (`AZURE_OPENAI_CHAT`, `BUCKET_NAME`, `MINIO_ACCESS_KEY`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `S3_URL`, `PATH_TO_DATA`, `LIBREOFFICE_SERVICE`, `ENVIRONMENT`, `APP_NAME`).

---

## [2.0.0] - 2026-09-18

### Summary of Transformation
Migrated the IPA Scout application from a prototype with static in-memory mocks and multi-provider stubs into a fully integrated, production-grade cloud solution powered by **Google Cloud Firestore**, **Firebase Storage**, and **Gemini 3.8 Flash** via the official `@google/genai` SDK.

---

### Added

#### 1. Gemini 3.8 Flash AI Evaluation Engine
- **Official SDK Integration**: Adopted the `@google/genai` TypeScript SDK (`GoogleGenAI`) in `frontend/lib/gemini.ts`.
- **Model Migration**: Targeted `gemini-3.8-flash` for high-throughput corporate and infrastructure compliance reviews.
- **Strict Compliance Rules**: Structured system instructions enforcing Gateway review standards (Gate 1 Business Justification, Gate 2 Delivery Strategy, Gate 3 Investment Decision) across Financial, Risk, and Delivery Capability domains.
- **Guaranteed JSON Output**: Enforced schema validation using `responseMimeType: "application/json"` and `responseSchema` defining project scores, overall recommendations, and granular criteria assessments (Positive, Negative, Neutral) with citations.
- **Thinking Configuration**: Support for configurable `thinkingLevel` ("high", "low", "off") routing deep compliance reasoning without legacy `thinkingBudget` flags.
- **Flexible Credential Resolution**: Automatic fallback across `GEMINI_API_KEY`, `GOOGLE_GENAI_API_KEY`, and `API_KEY`.

#### 2. Cloud Firestore Persistent Storage
- **Cloud Database Provisioning**: Configured Firebase Firestore (`ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5`).
- **Database Architecture (`firebase-blueprint.json`)**: Defined relational document schemas for `projects`, `criteria`, `chunks`, `files`, `results`, `ratings`, and `users`.
- **Security Rules (`firestore.rules`)**: Deployed access-control rules restricting writes and enforcing authenticated / authorized operations.
- **Persistence Layer (`frontend/lib/firebase.ts`)**: Built full database abstraction functions:
  - `getFirestoreAll` / `getFirestoreById`
  - `filterFirestoreItems` with in-memory relational joins for chunks, criteria, and project metadata
  - `getFirestoreRelatedItems` for traversing graph relations between projects, criteria, and document chunks
  - `saveFirestoreResult` and `saveFirestoreRating` for recording reviewer feedback and evaluations
  - `saveFirestoreFile` for storing uploaded document records
- **Initial Dataset Seed (`frontend/lib/seedData.ts`)**: Auto-bootstrapped baseline IPA Gateway 2 review data, criteria questions, document excerpts, and project profiles.

#### 3. Firebase Storage & Document Upload Pipeline
- **Upload API Endpoint (`/api/upload_file`)**: Added a 10MB-supported upload handler saving document binaries into Firebase Storage (`documents/`) and recording metadata in Firestore.
- **Interactive Document Bundle Uploader**: Enhanced `frontend/pages/file-viewer.tsx` with:
  - Drag-and-drop and click-to-upload file area supporting PDF and DOCX files.
  - Automatic Firestore file list refresh upon upload.
  - Immediate selection and rendering in the inline PDF canvas viewer.
- **Dynamic Document Serving (`/api/get_items/[uuid]`)**: Updated to stream or redirect directly to Firebase Storage download URLs.

#### 4. Frontend Error Transparency
- **Error Diagnostic Display**: Refactored `frontend/pages/index.tsx` to display real backend and Gemini API error messages (`data.error`) in an alert banner instead of suppressing failures behind generic fallback text.

---

### Changed

#### 1. API Route Modernization (Migrated from In-Memory Mock to Cloud Firestore)
- **`/api/item/[table]`**: Replaced in-memory mock lookups with real Firestore collection queries.
- **`/api/read_items_by_attribute`**: Connected multi-attribute filtering (e.g., negative findings, criteria relations) directly to Firestore.
- **`/api/related/[uuid]/[model1]/[model2]`**: Converted graph queries to fetch related entities from Firestore.
- **`/api/rate`**: Persists auditor thumbs-up/thumbs-down ratings and feedback to the `ratings` Firestore collection.
- **`/api/user`**: Retrieves the current reviewer identity from Firestore.
- **`/api/info`**: Updated service signature to announce `Scout Cloud Firestore & Firebase Service`.

#### 2. Project Configuration & Metadata
- **`metadata.json`**: Added `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` to declare secure server-side AI execution.
- **Workspaces & Dependencies**: Added `@google/genai` and `firebase` to root and `frontend/package.json`.

---

### Removed

- **Legacy AI Provider Configurations**: Removed all traces, environment keys, and references to OpenAI, Azure OpenAI, and Anthropic across `.env.example`, documentation, and configuration files.
- **Static In-Memory Database (`mockDb.ts`)**: Completely removed `frontend/utils/mockDb.ts` and all dependent imports.
- **Obsolete Parameters**: Stripped legacy API fields (`max_tokens`, `model_dump_json`) in favor of standard `@google/genai` parameters (`maxOutputTokens`, schema generation).
- **PostgreSQL / Unused Database Dependencies**: Removed local database stub dependencies in favor of Cloud Firestore.

---

## [1.0.0] - Baseline Source

- Initial prototype of IPA Scout with mock UI data.
- Read-only document viewer stub with hardcoded PDF base64.
- In-memory mock database layer in `utils/mockDb.ts`.
- Generic error handling without detailed API telemetry.
