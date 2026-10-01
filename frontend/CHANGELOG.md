# Changelog

All notable changes to the IPA Scout compliance and assurance review platform from the original source repository to the current release are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

---

## [2.39.0] - 2026-09-30

### Summary
Implemented all three approved core enhancements to empower infrastructure assurance reviewers, SROs, and HM Treasury Approvals Committees:
1. **AI-Powered Executive Gateway Determination & SRO Briefing Generator (`/api/generate-briefing`, `ProjectDashboard.tsx`)**:
   - Integrated Google GenAI (`@google/genai` targeting flagship `gemini-3.8-flash`) into the official Gateway Assurance Pack generation workflow.
   - Automatically synthesizes formal, authoritative HM Treasury Green Book and IPA Gateway Review determination narratives (highlighting 5-case strengths, endorsement conditions, specific remediation stipulations, and final delivery recommendations) tailored to live project metrics.
   - Seamlessly injects the generated narrative into the Gateway Assurance Pack PDF signature block.
2. **Interactive "What-If" Gateway Scenario & Mitigation Simulator (`ProjectDashboard.tsx`)**:
   - Built a real-time scenario simulation engine in the Project Assurance console allowing auditors and SROs to test prospective mitigation levers (+6% Critical Deficit Mitigation, +5% Economic Case BCR Verification, +4% Commercial & Procurement Strategy, +5% Statutory Planning Mitigation).
   - Recalculates overall assurance scores and statutory Delivery Confidence Assessment (DCA) ratings (Red → Amber/Red → Amber → Amber/Green → Green) dynamically.
   - Provides a one-click action to inject simulated scenarios and projected scores directly into the Gateway Assurance Pack generator.
3. **Cross-Project Peer Benchmarking & 5-Case Green Book Comparison Workspace (`PeerBenchmarkingView.tsx`, `PortfolioDashboard.tsx`)**:
   - Developed a dedicated comparative analytics module comparing any two GMPP major projects.
   - Features side-by-side KPI metric cards (Assurance Score, DCA badge, Capital Budget, SRO, Gate, Critical Risks, Verified Criteria), a Recharts comparative grouped bar chart benchmarking both projects across all five Green Book cases against the 80% passing standard, winner delta badges, and direct navigation into project assurance workspaces.
   - Integrated into the Portfolio Hub Visual Analytics Hub with tab toggling and fault-isolated error boundaries.
4. **Assurance Playbook & User Guide Synchronization (`UserGuideModal.tsx`)**:
   - Updated the global user guide to document the What-If Gateway Simulator, Cross-Project Peer Benchmarking, and Gemini AI SRO Determination auto-drafting workflows.

---

## [2.38.0] - 2026-09-29

### Summary
Implemented comprehensive User Guide, Assurance Playbook, and Onboarding System following user approval of Option 1:
1. **Interactive Global User Guide & Playbook Modal (`UserGuideModal.tsx`)**:
   - Built a 5-tab interactive walkthrough accessible from any page (Workflow, 4 Core Pillars, Green Book & Gateways, Gateway Pack Artifacts, and Pro Tips & Shortcuts).
2. **Persistent Global Header & Footer Entry Points (`_app.tsx`)**:
   - Added an **"Assurance Guide"** pill with `HelpIcon` in the header actions area and a **"User Guide & Playbook"** action in the corporate footer.
   - Global event listener (`'open-user-guide'`) allowing any button in the app to open the guide.
3. **First-Time User Onboarding Banner (`PortfolioDashboard.tsx`)**:
   - Added a dismissible welcome and quick-start banner on the Portfolio Hub with `localStorage` persistence.

---

## [2.37.0] - 2026-09-29

### Summary
Implemented both prioritized core enhancements following user approval:
1. **Embedded Review Findings & Evidence Workspace in Project Console (`ProjectDashboard.tsx`, `results.tsx`)**:
   - Added a dedicated 4th tab to the Project Console: **"Review Findings & Evidence"** (`activeTab === 'findings'`), bringing the complete criteria evaluation corpus directly into the reviewer's single-project workspace.
   - Interactive severity scorecards (**Critical**, **High**, **Medium**, **Low**), search query input, and multi-faceted status/category filtering.
   - Integrated `FindingExpandableDetailView` drawer displaying evidence thresholds, citations, and step-by-step remediation roadmaps with carousel navigation.
   - Added bidirectional Project Scope selection and synchronization to the dedicated findings view (`results.tsx`) with URL deep-linking (`?projectId=...`).
2. **Official HM Treasury Gateway Assurance Pack & Executive Review Dossier Generator (`exportProjectGatewayPackPdf`)**:
   - Engineered publication-grade Gateway Assurance Pack PDF export (`exportCompliancePdf.ts`) formatted to HM Treasury Green Book and IPA standards.
   - Compiles Project Metadata, SRO & Lead Auditor credentials, Gateway Delivery Confidence Assessment (Green, Amber/Green, Amber, Amber/Red, Red), 5-Case Model maturity analysis against the 80% passing benchmark, Key Risk Exposure matrix, Audit Findings Log, Statutory Milestone Timeline, and official tripartite sign-off seals.
   - Added interactive Gateway Assurance Pack Generator modal in `ProjectDashboard.tsx` with delivery confidence picker, customizable executive remarks, and section toggles.

---

## [2.36.0] - 2026-09-29

### Summary
Reorganized and streamlined application layout, information hierarchy, and global navigation around **4 core intuitive pillars**, resolving cognitive overload and eliminating component duplication:
- **Consolidated 4-Pillar Top Navigation (`_app.tsx`)**:
  1. **Portfolio Hub** (`/` and `/dashboard`): Macro portfolio health, cross-project GMPP assurance index, sector/gate benchmarks, upcoming statutory milestones, and cross-project portfolio table.
  2. **Project Assurance** (`/project-dashboard` and `/compliance-tracker`): Unified single-project console combining the Green Book 5-Case model, Gateway criteria donut, risk exposure bar chart, velocity area timeline, and the full interactive compliance checklist in a tabbed workspace.
  3. **Review Findings** (`/results`): Dedicated evidence review surface with interactive severity pie chart filtering and expandable remediation drawers.
  4. **Document Dossier** (`/file-viewer`): PDF evidence canvas inspection, chunk citation jumping, and bundle upload.

---

## [2.35.0] - 2026-09-29

### Summary
Created a dedicated **Project Dashboard** view (`ProjectDashboard.tsx`, `/project-dashboard`) providing infrastructure project review teams and Senior Responsible Owners (SROs) with an executive summary of project status, key risk metrics, and recent audit activity using **Recharts** data visualizations:
- **Project Status Summary**: Recharts Donut chart displaying gateway criteria breakdown (Compliant, In Progress, Flagged Deficits) and 5-Case Green Book assurance bar chart (Strategic, Economic, Commercial, Financial, Management Case maturity vs 80% passing benchmark).
- **Key Risk Metrics**: Recharts severity bar chart comparing risk exposure against tolerance thresholds, accompanied by financial impact cards across statutory planning, procurement, environmental mitigation, and BIM compliance.
- **Recent Audit Activity & Velocity**: Recharts 6-week timeline area chart tracking verification velocity (compliant transitions, risk flags, evidence submissions) with real-time Firestore sync and chronological log feed.
- **Interactive Project Switcher**: Deep-linking, project selection dropdown, print-to-PDF export, and seamless integration with the Portfolio Dashboard and navigation header.

---

## [2.34.0] - 2026-09-29

### Summary
Created a high-fidelity **Findings Severity Pie Chart** (`FindingsSeverityPieChart.tsx`) secondary data visualization section that presents audit findings categorized by their regulatory risk severity levels (**Critical**, **High**, **Medium**, and **Low**). Integrated across the Findings evaluation view (`results.tsx`), Portfolio Dashboard visual analytics hub (`PortfolioDashboard.tsx`), Overview assurance synthesis (`index.tsx`), and Executive scorecard (`AuditFindingsSummaryCard.tsx`) with interactive slice filtering, Donut/Pie view modes, 4 severity KPI summary cards, and real-time synchronization with findings tables.

---

## [2.33.1] - 2026-09-29

### Summary
Fixed the React warning `Cannot update a component ('AuditFindingsSummaryCard') while rendering a different component ('AutoRefreshToggle')` by decoupling countdown interval ticks from poll callback execution in `AutoRefreshToggle.tsx`, wrapping poll handlers in `useCallback`, and dispatching asynchronous background polling outside React state updater reducers.

---

## [2.33.0] - 2026-09-29

### Summary
Implemented a configurable **Auto-Refresh Toggle** component (`AutoRefreshToggle.tsx`) across the Portfolio Dashboard (`PortfolioDashboard.tsx`) and Executive Audit Scorecard (`AuditFindingsSummaryCard.tsx`) that automatically polls the audit log source (`audit_activities`, `compliance_requirements`, and evaluation findings) every 30 seconds, dynamically synchronizing dashboard metrics, finding status counts, and the recent activity feed with countdown badges and live state indicators.

---

## [2.32.0] - 2026-09-29

### Summary
Created a high-fidelity **'Expandable Detail View'** component (`FindingExpandableDetailView.tsx`) that opens when any row in the findings table (`results.tsx`) is clicked. It presents full evidence thresholds, analytical justification, referenced document sources, and actionable step-by-step engineering and governance remediation roadmaps with task trackers, print capabilities, fullscreen mode, and sequential carousel navigation.

---

## [2.31.0] - 2026-09-29

### Summary
Implemented a real-time keyword search input component (`DashboardAuditFindingsSearch.tsx`) in the dashboard header (`PortfolioDashboard.tsx`) and enhanced global navigation search (`GlobalHeaderSearch.tsx`) allowing auditors to query audit findings across **Criterion** (question, category, gate, evidence) and cited **Sources** (document references, chunk citations) with live keyword highlighting, match count badges, and direct navigation to detailed findings.

---

## [2.30.0] - 2026-09-29

### Summary
Added a prominent **'Download PDF'** button to dashboard and audit findings view headers (`PortfolioDashboard.tsx`, `results.tsx`, `AuditFindingsSummaryCard.tsx`, and `index.tsx`) that leverages browser print media stylesheets (`@media print` in `frontend/public/styles/index.css`) to trigger high-fidelity browser print-to-PDF generation with clean layout wrapping, hidden UI chrome, and official sensitivity footer markings.

---

## [2.29.0] - 2026-09-29

### Summary
Resolved development server startup issue by synchronizing workspace dependencies (`framer-motion`, `jspdf`, `jspdf-autotable`, `pdfjs-dist`) between root and `frontend/package.json`, re-indexing bun lockfile, and executing a clean development server restart on port 3000.

---

### Fixed & Enhanced

#### 1. Dependency Resolution & Server Stability
- Synchronized `frontend/package.json` dependencies with the root workspace definitions.
- Verified build and TypeScript compilation (`compile_applet` passed successfully).
- Relaunched the Next.js development server process on port 3000.

---

## [2.28.0] - 2026-09-29

### Summary
Implemented an interactive line chart component using Recharts (`AuditFindingsTrendChart.tsx`) to visualize the chronological trajectory of audit findings (**Passed**, **Failed**, **Pending**) over time based on available log data and status transitions. Integrated the chart into the Overview page (`frontend/pages/index.tsx`) and the top Executive Audit Summary Card (`AuditFindingsSummaryCard.tsx`).

---

### Added & Enhanced

#### 1. Recharts Audit Findings Trend Chart (`frontend/components/AuditFindingsTrendChart.tsx`)
- **Multi-Series Chronological Line Graph**:
  - **Passed Findings Line**: Emerald green stroke (`#10b981`) tracking verified compliant items over time.
  - **Failed Findings Line**: Crimson red stroke (`#ef4444`) tracking flagged project risks and remediation deficits.
  - **Pending Findings Line**: Warm amber dashed stroke (`#f59e0b`) tracking requirements undergoing active review.
- **Dynamic View Modes & Controls**:
  - **Cumulative Mode**: Running balance of verified Passed, Failed, and Pending findings across the review lifecycle.
  - **Pass Rate % Mode**: Area trajectory comparing current project pass rate against the official HM Treasury 70% assurance threshold.
  - **Time Range Filtering**: Quick selectors for `30 Days`, `90 Days`, `6 Months`, and `All Time`.
  - **Interactive Series Toggles**: KPI summary cards allow clicking to show/hide individual lines dynamically.
  - **Custom Tooltip & CSV Export**: Displays date stamps, milestone narratives, auditor signatures, and enables raw trend dataset downloads.

---

## [2.27.0] - 2026-09-29

### Summary
Built a filtering dropdown component (`SeverityFilterDropdown.tsx`) that allows users to toggle the visibility of audit findings based on their severity level (**Critical**, **High**, **Medium**, **Low**). Integrated the severity filtering system into the `EvaluationSearchBar` component, the Review Findings table (`results.tsx`), and the Executive Audit Summary Card (`AuditFindingsSummaryCard.tsx`).

---

### Added & Enhanced

#### 1. Severity Filter Dropdown Component (`frontend/components/SeverityFilterDropdown.tsx`)
- **Four-Tier Severity Classification**:
  - **Critical Severity**: Crimson red indicator (`#dc2626`) for immediate statutory non-compliance or critical delivery blockers.
  - **High Severity**: Dark orange indicator (`#ea580c`) for significant assurance gaps or heightened project risks.
  - **Medium Severity**: Warm amber indicator (`#d97706`) for standard review criteria or items pending clarification.
  - **Low Severity**: Forest green indicator (`#059669`) for minor observations, routine notes, or verified criteria.
- **Multi-Select & Single-Select Filtering**:
  - Checkbox toggles per severity level with live item count badges.
  - One-click `Select All`, `Reset`, and `only` isolation shortcuts.
  - Outside-click detection and accessible ARIA listbox markup.

#### 2. Surface Integrations
- **Review Findings & Search Bar (`frontend/pages/results.tsx`, `frontend/components/EvaluationSearchBar.tsx`)**:
  - Integrated `SeverityFilterDropdown` into the faceted search toolbar.
  - Added a dedicated `Severity` column to the Ag-Grid review findings table.
  - Updated live match counts and CSV export routines to honor active severity selections.
- **Executive Summary Card (`frontend/components/AuditFindingsSummaryCard.tsx`)**:
  - Embedded severity filter controls directly into the executive scorecard header with real-time requirement count distribution.

---

## [2.26.0] - 2026-09-29

### Summary
Created a high-level executive summary scorecard component (`AuditFindingsSummaryCard.tsx`) positioned at the top of the main content area in `frontend/pages/_app.tsx`. It displays live counts and percentages of **'Passed'**, **'Failed'**, and **'Pending'** findings derived in real time from Cloud Firestore and the audit activity event log, complete with multi-segment compliance distribution progress and an expandable audit log stream.

---

### Added & Enhanced

#### 1. High-Level Audit Findings Summary Card (`frontend/components/AuditFindingsSummaryCard.tsx`)
- **Metrics & Pillar Cards**:
  - **Passed Findings (Compliant)**: Emerald green pillar displaying total compliant findings verified against IPA & Green Book standards, with percentage of total and direct link to `/compliance-tracker?filter=Compliant`.
  - **Failed Findings (Flagged Risks)**: Crimson red pillar highlighting critical non-compliance or remediation gaps requiring mitigation, linked to `/compliance-tracker?filter=Flagged`.
  - **Pending Findings (In Review)**: Amber orange pillar indicating items undergoing deliberation or awaiting supplementary evidence, linked to `/compliance-tracker?filter=In%20Progress`.
- **Multi-Segment Health Distribution Bar**:
  - Displays total evaluated scope with continuous visual breakdown across Passed, Failed, and Pending finding proportions and overall assurance health rate.
- **Collapsible Audit Log Activity Feed**:
  - Integrated timeline drawer displaying the latest audit transitions, evidence uploads, and risk flags with actor stamps and filter chips (`All`, `Passed`, `Failed`, `Pending`).
- **Interactive State & Print Optimization**:
  - Minimizable to a slim executive summary bar with user preference cached in `localStorage`.
  - Fully compatible with `@media print` PDF exports.

---

## [2.25.0] - 2026-09-27

### Summary
Fixed the `Error fetching gate URL: Failed to fetch` runtime error in `frontend/utils/getGateUrl.ts` by replacing fragile runtime relative network `fetch('/gate_urls.json')` requests with direct bundled static JSON mappings and standard Gateway Phase key normalization.

---

### Fixed & Enhanced

#### 1. Robust Gateway URL Resolution (`frontend/utils/getGateUrl.ts`)
- Replaced runtime relative URL fetching with direct static bundling from `frontend/public/gate_urls.json`.
- Added key normalization (`normalizeGateKey`) supporting multiple gateway representation formats (`GATE_0` through `GATE_4`, `Gate 2: Delivery Strategy`, `Strategic Assessment`, `Business Justification`, etc.).
- Provided fallback to official HM Treasury & IPA Assurance Review Toolkit URL.

---

## [2.24.0] - 2026-09-27

### Summary
Added specific `@media print` CSS overrides for Ag-Grid table layouts in `frontend/public/styles/index.css` to guarantee that long textual content within evaluation cells wraps correctly, prevents horizontal clipping, and eliminates page edge bleed during PDF export or physical printing.

---

### Added & Enhanced

#### 1. Ag-Grid Print Layout & Fluid Formatting (`frontend/public/styles/index.css`)
- **Container & Viewport Geometry**:
  - Overrode `.ag-root-wrapper`, `.ag-root`, `.ag-body`, `.ag-body-viewport`, `.ag-center-cols-clipper`, and `.ag-center-cols-container` to `position: static !important; overflow: visible !important; width: 100% !important; max-width: 100% !important; contain: none !important;` so that all rows render continuously down the page without clipping or virtual scroll truncation.
- **Suppression of Print Distortions**:
  - Hid horizontal and vertical scrollbars, left/right horizontal spacers, column resize handles, filter menus, and scroll sizers (`display: none !important;`).
- **Flexible Row & Header Flow**:
  - Converted absolute transforms on `.ag-header-row` and `.ag-row` into fluid flexbox rows (`display: flex !important; flex-direction: row !important; transform: none !important; min-height: 32pt !important;`) with `page-break-inside: avoid !important;`.
- **Text Wrapping & Page Edge Containment**:
  - Applied `white-space: normal !important; overflow-wrap: break-word !important; word-break: break-word !important; word-wrap: break-word !important; text-overflow: clip !important; hyphens: auto !important;` to `.ag-cell`, `.ag-cell-value`, header cells, and nested inner `div`/`p`/`span` elements.
- **Proportional Column Width Balancing**:
  - Configured print-calibrated width ratios:
    - **Assurance Criterion (`Criterion`)**: `flex: 5 1 45% !important; width: 45% !important; max-width: 45% !important;` with left text alignment for in-depth question and finding narratives.
    - **Category (`Category`)**: `flex: 1.5 1 15% !important; width: 15% !important; max-width: 15% !important;` centered.
    - **Status (`Status`)**: `flex: 1.2 1 12% !important; width: 12% !important; max-width: 12% !important;` centered.
    - **Document Sources (`Sources`)**: `flex: 2.8 1 28% !important; width: 28% !important; max-width: 28% !important;` with word-break and inline citation chip wrapping.

---

## [2.23.0] - 2026-09-27

### Summary
Added a comprehensive CSS print media query (`@media print`) in `frontend/public/styles/index.css` to format project evaluation logs, review findings, criteria audit lists, and transition timelines cleanly when printed or exported to PDF.

---

### Added & Enhanced

#### 1. CSS Print Media Query (`frontend/public/styles/index.css`)
- **Page Geometry & Base Layout**:
  - Configured `@page` for A4 portrait with consistent 14mm/12mm/16mm/12mm margins.
  - Enforced `-webkit-print-color-adjust: exact` and `print-color-adjust: exact` so audit badges, risk status colors, and borders retain fidelity in print preview.
  - Reset body and `.App` backgrounds to clean white (`#ffffff`) and deep slate typography (`#0f172a`), eliminating ink-heavy backgrounds.
- **Chrome & Interactive Element Suppression**:
  - Automatically hides navigation headers (`.App-header`), search inputs, interactive toolbars, sticky offline banners, floating drawers, modal backdrops, pagination/stepper arrows, and action buttons (`Export CSV`, `Reset Filters`).
- **Unrestricted Viewport for Ag-Grid & Evaluation Logs**:
  - Overrides fixed-height scrolling containers (`height: auto !important; max-height: none !important; overflow: visible !important; position: static !important;`) across `.ag-theme-alpine`, `.ag-root-wrapper`, `.ag-body-viewport`, and audit feed drawers so evaluation rows print in their entirety without clipping.
  - Added `page-break-inside: avoid; break-inside: avoid;` to evaluation cards, log entries, table rows, and findings cards to avoid orphan splits across pages.
  - Enforced `display: table-header-group` on table headers to repeat column definitions cleanly across multi-page printouts.
- **Evaluation Evidence & Badging Styling**:
  - Formatted evidence quotations, citations, and justifications with distinct left borders (`#1d70b8`) and monospace font rendering.
  - Applied subtle borders to status badges (`Positive`, `Negative`, `Neutral`) for maximum legibility in black-and-white or color printing.
- **Audit Footer Watermark**:
  - Added official sensitivity assurance footer note on printed evaluation dossiers.

---

## [2.22.0] - 2026-09-27

### Summary
Built a comprehensive local CSV reporting and export utility (`exportEvaluationFindingsCsv` in `utils/exportComplianceCsv.ts`) for project evaluation findings, analytical justifications, and filtered search results. Integrated one-click CSV export buttons with dynamic item counts into both the executive header summary and the `EvaluationSearchBar` component on the Review Findings surface.

---

### Added & Enhanced

#### 1. Evaluation Findings CSV Reporting Utility (`frontend/utils/exportComplianceCsv.ts`)
- **`exportEvaluationFindingsCsv(options)`**:
  - Implements standard RFC-4180 CSV generation with recursive character escaping and `\uFEFF` UTF-8 BOM encoding for seamless Microsoft Excel and Apple Numbers compatibility.
  - Comprehensive reporting schema covering:
    - `Finding ID` & `Project Name`
    - `Gateway Review Phase` (e.g., Gate 2: Delivery Strategy)
    - `Assurance Category` (Commercial, Financial, Management, Strategic)
    - `Evaluation Question / Criterion`
    - `Assurance Status` (`Positive`, `Negative`, `Neutral`)
    - `Risk Profile` (High Risk / Non-Compliant Finding, Low Risk / Validated Criteria, Neutral)
    - `Confidence Score` & `Evidence Excerpt`
    - `Analytical Justification & Findings`
    - `Cited Source Documents` (with page references where applicable)
    - `Evaluation Timestamp`
    - `Filter Scope Description` (documents active query, category, and status filters applied at the moment of export)
    - `Export Date & Time`
  - Automated timestamped filename generation: `IPA_Evaluation_Findings_{Project}_{Scope}_{Date}.csv`.

#### 2. Review Findings UI Integration (`frontend/pages/results.tsx` & `components/EvaluationSearchBar.tsx`)
- **Executive Header Export Button**:
  - Prominent "Export CSV" button placed directly in the top KPI summary cluster alongside the Positive, Negative, and Neutral metrics.
- **Search Bar Integrated Export Button**:
  - Added dynamic `Export CSV (X)` button inside `EvaluationSearchBar.tsx` that updates in real time to reflect the number of matching filtered items.
  - Automatically disables when no items match the filter criteria.
- **Telemetry & Event Tracking**:
  - Logs `export_evaluation_csv` telemetry events with item counts, active search queries, and filter parameters via `logger.trackEvent`.

---

## [2.21.0] - 2026-09-27

### Summary
Engineered an enterprise client-side search bar and multi-attribute filter system (`components/EvaluationSearchBar.tsx`) to rapidly filter project evaluation items, review findings, and audit evidence. Features real-time multi-field text querying, category and risk-status faceted filtering, match counter badges, keyboard navigation shortcuts (`/`, `Cmd+K`, `Esc`), and step-through navigation controls integrated into the AgGrid dataset and inspection modal.

---

### Added & Enhanced

#### 1. Client-Side Evaluation Search Bar (`frontend/components/EvaluationSearchBar.tsx`)
- **Multi-Field Instant Search**:
  - Dynamically searches across question text, assurance criteria, category, risk status (`Positive`, `Negative`, `Neutral`), justification analysis, and document file citations.
- **Faceted Status & Category Filters**:
  - Direct status pills for all findings, negative / high-risk items, positive / validated criteria, and neutral findings with custom color accents.
  - Category dropdown automatically populated from available dataset attributes (e.g. Commercial, Management, Strategic).
- **Match Tracking & Counters**:
  - Displays instant match counter: `Showing X of Y items` with a `Filtered` status chip.
  - One-click `Reset Filters` control when filters or queries are active.
- **Quick Navigation & Stepper**:
  - Previous (`<`) and Next (`>`) stepper controls to cycle directly between matching evaluation items.
  - Active item position counter (`Index X / Total`).
- **Keyboard Shortcuts**:
  - Focus search input with `/` or `Cmd+K` / `Ctrl+K`.
  - Clear search query or unfocus with `Esc`.

#### 2. Review Findings & Criteria Integration (`frontend/pages/results.tsx`)
- Integrated `EvaluationSearchBar` between the metric header and AgGrid table.
- Connected search state to global `useSearch()` context, synchronizing with the top header navigation search bar.
- Updated `AgGridReact` to bind to `filteredResults`.
- Implemented a clean empty state with a "Clear All Filters" button when no items match the query.
- Enhanced the detailed findings inspection modal with top-bar quick navigation arrows to step through filtered items without closing the modal.

---

## [2.20.0] - 2026-09-27

### Summary
Implemented a real-time browser connectivity monitoring system and visual status indicator (`components/ConnectivityStatus.tsx`), featuring an executive header status badge with detailed network diagnostic popover, a persistent sticky offline notification banner informing users of local caching safeguards, and an automated reconnection banner when Cloud Firestore synchronization resumes.

---

### Added & Enhanced

#### 1. Connectivity Monitoring System (`frontend/components/ConnectivityStatus.tsx`)
- **Reactive State Management (`ConnectivityProvider`, `useConnectivity`)**:
  - Automatically binds to browser `online` and `offline` window events, synchronized with `navigator.onLine`.
  - Verifies round-trip network integrity via proactive health check pings against `/api/health` with automated abort timeout handling.
  - Integrates with `logger.warn` and `logger.info` under the `network` telemetry category for auditing disconnect and reconnect milestones.
- **Executive Header Status Pill (`ConnectivityHeaderBadge`)**:
  - Displays real-time connectivity status pill in the persistent navigation bar:
    - **Online**: Soft emerald pulse dot (`#10b981`), indicating live WebSocket connection to Cloud Firestore (`ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5`).
    - **Offline**: Amber/crimson warning pulse dot (`#ef4444`), indicating disconnected network with local cache fallback active.
  - Interactive popover card displaying Database Ledger name, active Sync Mode (Real-time WebSocket vs. Local IndexedDB Cache), last verification timestamp, and a manual "Test Network" diagnostic action.
- **Sticky Viewport Notice Banner (`OfflineNoticeBanner`)**:
  - **Active Offline Mode**: Fixed sticky crimson banner pinned directly beneath the navigation header with warning icon, detailing that cached assurance criteria and review findings remain operational and queued modifications will synchronize upon reconnection.
  - **Reconnected Mode**: Temporary celebratory emerald banner confirming Cloud Firestore database re-synchronization with 4.5-second auto-dismissal.

#### 2. Root Layout Integration (`frontend/pages/_app.tsx`)
- Wrapped global layout with `<ConnectivityProvider>`.
- Positioned `<ConnectivityHeaderBadge />` in the top header action cluster alongside the Gate 2 Auditor session pill.
- Positioned `<OfflineNoticeBanner />` directly beneath the fixed navigation header.

---

## [2.19.0] - 2026-09-27

### Summary
Engineered an enterprise global loading spinner and skeleton screen design system (`components/LoadingSystem.tsx`), featuring a global ambient provider (`GlobalLoadingProvider` and `useGlobalLoading`), source-aware visual states tailored for Gemini AI reasoning and Firebase Cloud Firestore live synchronization, and domain-specific skeleton screens (`ResultsSkeleton`, `TrackerSkeleton`, `CardSkeleton`, `TableSkeleton`, `AiEvaluationSkeleton`).

---

### Added & Enhanced

#### 1. Global Loading & Skeleton System (`frontend/components/LoadingSystem.tsx`)
- **Global Ambient Provider (`GlobalLoadingProvider`, `useGlobalLoading`)**:
  - Global reactive context providing `startLoading({ message, source, subtext })` and `stopLoading()` across all pages.
  - Source-aware visual design:
    - **Gemini AI Mode (`source: 'gemini'`)**: Violet/fuchsia gradient ring with glowing spark (`✦`) emblem, animated status pill, and automated step progress text.
    - **Firebase Firestore Mode (`source: 'firebase'`)**: Amber/orange sync ring with database lightning badge (`⚡`), communicating live ledger hydration.
    - **Gateway Assurance Mode (`source: 'general'`)**: Deep GovUK navy/blue corporate spinner.
- **Standalone SVG Spinner (`GlobalLoadingSpinner`)**:
  - Scalable dual-track vector SVG with customizable sizes (`sm`, `md`, `lg`, `xl` or custom numeric pixel diameter) and variants (`primary`, `gemini`, `firebase`, `neutral`).
- **Domain-Specific Skeleton Screens**:
  - `ResultsSkeleton`: Full criteria overview, KPI pills, and review findings card list skeleton matching `pages/results.tsx`.
  - `TrackerSkeleton`: Multi-gate filter bar, search input, and structured requirement rows skeleton matching `components/ComplianceTracker.tsx`.
  - `CardSkeleton`: Analytics KPI cards skeleton for dashboard metrics.
  - `TableSkeleton`: Configurable row/column table skeleton.
  - `AiEvaluationSkeleton`: Shimmering placeholder with Gemini intelligence badge for real-time compliance assessments.
- **CSS Shimmer & Keyframes (`styles/index.css`)**:
  - Added high-performance `@keyframes shimmerWave`, `@keyframes spinSmooth`, and `@keyframes pulseGlow` with hardware-accelerated gradient offsets.

#### 2. Application Integrations
- **Application Root (`pages/_app.tsx`)**:
  - Wrapped global layout with `<GlobalLoadingProvider>` inside `<SearchProvider>`.
- **Review Findings Page (`pages/results.tsx`)**:
  - Replaced legacy GIF loader with `ResultsSkeleton` during data fetching.
- **Compliance Requirements Tracker (`components/ComplianceTracker.tsx`)**:
  - Replaced generic loading text with `TrackerSkeleton` during Cloud Firestore collection subscription.
- **Corporate Entity Evaluation (`pages/index.tsx`)**:
  - Integrated `AiEvaluationSkeleton` inside `ComplianceOfficerWidget` during live Gemini AI evaluation calls.

---

## [2.18.0] - 2026-09-27

### Summary
Built a high-performance client-side logging and telemetry utility (`utils/logger.ts`) for tracking application events, navigation transitions, and error diagnostics in development and preview environments. Features strict recursive payload sanitization and credential masking (API keys, JWTs, Bearer tokens, private keys, passwords, and PII), rolling in-memory telemetry buffering, and seamless integration with `ErrorBoundary.tsx` and Next.js navigation lifecycles.

---

### Added & Enhanced

#### 1. Client-Side Logging & Telemetry Utility (`frontend/utils/logger.ts`)
- **Structured Severity Levels**: Supports `DEBUG`, `INFO`, `WARN`, `ERROR`, and `EVENT` with dynamic threshold filtering (`setLevel`).
- **Data Sanitization & Credential Masking Engine (`sanitizePayload`)**:
  - Automatically scrubs sensitive property keys matching `/password|secret|token|apikey|auth|bearer|credentials|cookie|cvv|ssn/i`.
  - Pattern matches and redacts Google API keys (`AIzaSy...`), OpenAI keys (`sk-...`), Bearer authorization headers, JSON Web Tokens (JWT), and multi-line private keys.
  - Partially masks email addresses (e.g. `j***@cabinetoffice.gov.uk`) to preserve diagnostic domain context without leaking personal identifiability.
  - Features circular reference protection (`WeakSet`) and recursion depth clamping.
- **Rolling In-Memory Telemetry Buffer**:
  - Maintains a circular buffer of the most recent 100 application events and anomalies.
  - Provides `getTelemetryBuffer(limit)` and `exportTelemetryJson(limit)` for generating sanitized diagnostics on demand.
- **Visual Console Formatter**: Styled, color-coded browser console log entries with categorized badges (`[IPA Scout • LEVEL • category]`).

#### 2. Telemetry Integrations Across Components
- **Error Boundary Telemetry (`components/ErrorBoundary.tsx`)**:
  - Integrated `logger.error` within `componentDidCatch` to track runtime failures under the `ui-guard` category.
  - Embedded sanitized telemetry breadcrumbs into the "Copy Diagnostics" clipboard report.
  - Logged state recovery events on `resetErrorBoundary`.
- **Navigation Lifecycle Tracking (`pages/_app.tsx`)**:
  - Recorded application mount events and subscribed to Next.js `routeChangeComplete` to log `page_view` telemetry under the `navigation` category.

---

## [2.17.0] - 2026-09-27

### Summary
Engineered an enterprise-grade React Error Boundary component (`ErrorBoundary.tsx`) providing fault isolation, graceful fallback UI, one-click recovery, telemetry diagnostics, and automatic route-change resetting. Integrated the component into the application viewport (`_app.tsx`), portfolio analytics charts, real-time activity feed, transition timeline, and document PDF canvas viewer.

---

### Added & Enhanced

#### 1. React Error Boundary Component (`frontend/components/ErrorBoundary.tsx`)
- **Fault-Tolerant Error Handling**:
  - Implemented standard React lifecycle boundaries (`componentDidCatch`, `static getDerivedStateFromError`) with strong TypeScript typing (`ErrorBoundaryProps`, `ErrorBoundaryState`, `FallbackProps`).
  - Supports automatic boundary resets when dependency keys change via `resetKeys` (e.g. Next.js router route transitions).
  - Supports custom fallback components or render-prop functions `(props: FallbackProps) => ReactNode`.
  - Exposes `withErrorBoundary` Higher-Order Component (HOC) for declarative wrapping of complex components.
- **Graceful Fallback UI**:
  - **Executive Page-Level View**: Reassuring status banner, clear component attribution, explanation that Firestore data remains secure, "Recover Component State" button, "Reload Application" button, and "Return to Overview" link.
  - **Inline Isolated Widget Mode (`isolate={true}`)**: Compact card fallback tailored for embedded dashboard widgets, charts, and activity feeds.
  - **Diagnostics & Telemetry**: One-click "Copy Diagnostics" with clipboard integration and collapsible formatted stack trace / component tree view.

#### 2. Application & Viewport Integration
- **Root Page Protection (`pages/_app.tsx`)**:
  - Wrapped Next.js `<Component {...pageProps} />` with `<ErrorBoundary componentName="Application Viewport" resetKeys={[router.asPath]}>`, ensuring unhandled page errors show graceful fallback instead of crashing the app.
- **Portfolio Analytics Protection (`components/PortfolioDashboard.tsx`)**:
  - Wrapped Recharts `ComplianceStatusPieChart` and D3 `ReviewStatusDistributionChart` in isolated error boundary mode.
- **Assurance Tracker & Live Feed Protection (`components/ComplianceTracker.tsx`)**:
  - Wrapped `GlobalActivityFeed` and `ComplianceTransitionTimeline` with isolated error boundaries.
- **Document Dossier Protection (`pages/file-viewer.tsx`)**:
  - Wrapped `PdfCanvasViewer` in an isolated error boundary to safeguard document viewing sessions.

---

## [2.16.1] - 2026-09-25

### Summary
Diagnosed and resolved 4 client-side gRPC `PERMISSION_DENIED` stream errors by restoring direct Firebase client initialization from `firebase-applet-config.json`, establishing a strict single-secret architecture centered exclusively on server-side `GEMINI_API_KEY`, pruning redundant `NEXT_PUBLIC_FIREBASE_*` environment dependencies, and verifying real-time Firestore synchronization on database `ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5`.

---

### Added & Enhanced

#### 1. Real-Time Stream Diagnostics & Permission Denial Resolution
- **Root Cause Analysis**: Identified that Next.js Webpack compile-time bundling of unpopulated `NEXT_PUBLIC_FIREBASE_*` environment variables caused client instances to attempt gRPC `Listen` streams against mismatched resource targets, triggering 4 concurrent/sequential `7 PERMISSION_DENIED` stream errors.
- **Affected Stream Components Verified**:
  - `GlobalHeaderSearch.tsx` (`onSnapshot` on `compliance_requirements`)
  - `ComplianceTracker.tsx` (`onSnapshot` on `compliance_requirements` & `compliance_comments`)
  - `GlobalActivityFeed.tsx` (`onSnapshot` on `compliance_activities`)
  - `ComplianceItemComments.tsx` (`onSnapshot` on comment threads)
- **Direct Configuration Restoration (`frontend/lib/firebase.ts`)**: Reverted dynamic `process.env` indirection to direct ingestion from `firebase-applet-config.json`, ensuring immediate and exact binding to Firestore database `ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5`.

#### 2. Single-Secret Architecture & Environment Pruning
- **Streamlined Secret Management**:
  - Established a strict single-secret standard: only `GEMINI_API_KEY` is required in the environment and Secrets panel.
  - Formally deprecated all `NEXT_PUBLIC_FIREBASE_*` secrets and duplicate `GOOGLE_GENAI_API_KEY` entries from the environment configuration.
  - Updated `.env.example` to remove obsolete client variable placeholders, maintaining strict isolation for server-side evaluation endpoints (`/api/evaluate`).

#### 3. Security Rules Synchronization & Dev Server Verification
- **Firestore Security Rules**: Deployed validated rules allowing structured read/write operations across all compliance schema collections via `deploy_firebase`.
- **Cache Purge & Dev Server Recovery**: Purged `.next` build caches, restarted the dev server on port 3000 (`HTTP/1.1 200 OK`), and confirmed zero linting and compilation errors.

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
