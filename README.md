# 🔍 IPA Scout

> **Cloud Assurance & Compliance Review Platform**  
> Powered by **Gemini 3.8 Flash**, **Google Cloud Firestore**, and **Firebase Storage**.

IPA Scout automatically analyses infrastructure project documentation against IPA guidance and gate workbooks, flagging potential compliance problems, risk gaps, and funding deficits as early as possible to expedite assurance review teams.

---

## Architecture Overview

1. **AI Compliance Evaluation Engine**:
   - Built with the official `@google/genai` TypeScript SDK targeting `gemini-3.8-flash`.
   - Strictly enforces Gateway review standards (Gate 1 Business Justification, Gate 2 Delivery Strategy, Gate 3 Investment Decision) across Financial, Risk, and Delivery Capability domains.
   - Enforces structured JSON schema evaluations with citations and reasoning.

2. **Cloud Persistence (Firestore)**:
   - All projects, criteria, audit results, chunks, and reviewer feedback ratings are stored persistently in Google Cloud Firestore (`ai-studio-scout-d32152a8-4a4e-4ea6-84c3-214b5ae51fa5`).

3. **Document Management (Firebase Storage)**:
   - Upload project document bundles directly via drag-and-drop.
   - In-browser PDF canvas inspection with citation page jumping.

---

## Environment Variables & Secrets

The application operates exclusively with **one single secret**:

| Secret Key | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | Official Gemini API credential for running compliance and assurance evaluations. |

All legacy keys (PostgreSQL, MinIO / S3, Azure OpenAI, LibreOffice, and local path variables) have been completely phased out and can be safely deleted from your environment secrets.
