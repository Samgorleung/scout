import { UUID } from 'crypto';

// Types for our mock database
export interface Project {
    id: string;
    created_datetime: string;
    updated_datetime: string | null;
    name: string;
    results_summary: string | null;
    review_type: string;
}

export interface File {
    id: string;
    created_datetime: string;
    updated_datetime: string | null;
    type: string;
    name: string;
    clean_name: string | null;
    summary: string | null;
    source: string | null;
    published_date: string | null;
    s3_bucket: string | null;
    s3_key: string | null;
    storage_kind: string;
    url: string | null;
    project?: { id: string; name: string };
}

export interface Criterion {
    id: string;
    created_datetime: string;
    updated_datetime: string | null;
    gate: string;
    category: string;
    question: string;
    evidence: string;
}

export interface Chunk {
    id: string;
    idx: number;
    text: string;
    page_num: number;
    created_datetime: string;
    updated_datetime: string | null;
    file: {
        id: string;
        name: string;
        clean_name: string | null;
    };
}

export interface Rating {
    id: string;
    project_id: string;
    result_id: string;
    user_id: string;
    positive_rating: boolean;
    created_datetime: string;
    updated_datetime: string | null;
}

export interface Result {
    id: string;
    created_datetime: string;
    updated_datetime: string | null;
    answer: string;
    full_text: string;
    criterion: Criterion;
    project: {
        id: string;
        name: string;
        results_summary: string | null;
    };
    chunks: { id: string }[];
}

export interface User {
    id: string;
    email: string;
    created_datetime: string;
    updated_datetime: string | null;
    projects: Project[];
}

// In-Memory Database State
const PROJECT_ID = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
const USER_ID = "e2f0a174-8dbb-4fc6-b7b5-2fa07eb578a1";

export const projects: Project[] = [
    {
        id: PROJECT_ID,
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        name: "IPA Infrastructure Audit",
        review_type: "GATE_2",
        results_summary: "Scout has completed the automated compliance review of the 'IPA Infrastructure Audit' project documentation. Nine key criteria were analyzed across Financial, Risk, and Delivery Capability categories. We identified 2 major Negative findings regarding contingency funding deficits and unassigned risk ownerships, 1 Neutral item requiring manual clarification regarding trigger points, and 6 Positive findings where the documentation fully met or exceeded the criteria guidelines."
    }
];

export const files: File[] = [
    {
        id: "f1111111-2222-3333-4444-555555555555",
        created_datetime: "2026-08-01T10:05:00Z",
        updated_datetime: null,
        type: "pdf",
        name: "Project_Business_Case.pdf",
        clean_name: "Project Business Case",
        summary: "The main business case document for the IPA Infrastructure Audit, outlining strategic objectives and governance.",
        source: "Uploads",
        published_date: "2026-07-15",
        s3_bucket: "scout-bucket",
        s3_key: "Project_Business_Case.pdf",
        storage_kind: "local",
        url: "http://localhost:3000/mock-pdf-1"
    },
    {
        id: "f2222222-2222-3333-4444-555555555555",
        created_datetime: "2026-08-01T10:06:00Z",
        updated_datetime: null,
        type: "pdf",
        name: "Risk_Register_Q3.pdf",
        clean_name: "Risk Register Q3",
        summary: "Active risk log outlining likelihood, impact, ownership, and mitigation protocols for project risks.",
        source: "Uploads",
        published_date: "2026-07-20",
        s3_bucket: "scout-bucket",
        s3_key: "Risk_Register_Q3.pdf",
        storage_kind: "local",
        url: "http://localhost:3000/mock-pdf-2"
    },
    {
        id: "f3333333-2222-3333-4444-555555555555",
        created_datetime: "2026-08-01T10:07:00Z",
        updated_datetime: null,
        type: "pdf",
        name: "Financial_Model_v4.pdf",
        clean_name: "Financial Model v4",
        summary: "Phased financial projections detailing capital expenditures, operating expenses, and audit-trail validations.",
        source: "Uploads",
        published_date: "2026-07-22",
        s3_bucket: "scout-bucket",
        s3_key: "Financial_Model_v4.pdf",
        storage_kind: "local",
        url: "http://localhost:3000/mock-pdf-3"
    }
];

export const criteria: Criterion[] = [
    {
        id: "c1111111-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Financial",
        question: "Is there a clear financial model outlining the projected costs and benefits of the project?",
        evidence: "Detailed financial forecasts and models._Breakdown of expected costs and benefits._Evidence of financial review and validation."
    },
    {
        id: "c2222222-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Financial",
        question: "Has funding been secured and is it sufficient to cover the project scope?",
        evidence: "Confirmation of funding sources._Budget sufficiency analysis._Documentation of financial commitments."
    },
    {
        id: "c3333333-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Financial",
        question: "Are there plans in place to monitor and control project expenditures?",
        evidence: "Budget monitoring and reporting framework._Regular financial audits._Evidence of expenditure tracking and adjustments."
    },
    {
        id: "c4444444-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Risk",
        question: "Is there a comprehensive risk management plan that identifies major project risks and mitigation strategies?",
        evidence: "Risk management plan._Risk register with likelihood and impact ratings._Assigned risk owners."
    },
    {
        id: "c5555555-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Risk",
        question: "Have contingency plans been developed for high-impact risks?",
        evidence: "Risk mitigation actions._Contingency plans._Trigger points for contingency actions."
    },
    {
        id: "c6666666-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Delivery Capability",
        question: "Does the project team have the necessary skills and resources to deliver the project?",
        evidence: "Resource management plan._Skills matrix._Evidence of key resource availability."
    },
    {
        id: "c7777777-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Delivery Capability",
        question: "Is there a clear governance structure with defined roles and responsibilities?",
        evidence: "Governance framework._Organization chart._Terms of reference for governance boards."
    },
    {
        id: "c8888888-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Governance",
        question: "Are project milestones clearly defined and aligned with the overall timeline?",
        evidence: "Project schedule._Milestone chart._Critical path analysis."
    },
    {
        id: "c9999999-1111-1111-1111-111111111111",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        gate: "GATE_2",
        category: "Benefits",
        question: "Is there a benefits realization plan to track and measure the project outcomes?",
        evidence: "Benefits realization plan._Benefits register with KPIs._Assigned benefits owners."
    }
];

export const chunks: Chunk[] = [
    {
        id: "k1111111-3333-3333-3333-333333333333",
        idx: 1,
        text: "Section 4.1 Financial Forecasts: The total projected capital expenditure for the infrastructure audit is £12.4m over 3 years. Operating costs are estimated at £1.2m annually. Phased cost sheets are validated. Review and validation was formally conducted and signed off by the Central Finance Committee on June 12, 2026.",
        page_num: 3,
        created_datetime: "2026-08-01T10:10:00Z",
        updated_datetime: null,
        file: {
            id: "f3333333-2222-3333-4444-555555555555",
            name: "Financial_Model_v4.pdf",
            clean_name: "Financial Model v4"
        }
    },
    {
        id: "k2222222-3333-3333-3333-333333333333",
        idx: 2,
        text: "Risk Register: High Risk ID 04 (Contingency Deficit) - The budget allocation does not currently include a formal contingency reserve, creating a major exposure of £1.5m to unforeseen overruns. No contingency reserves are committed at this stage, waiting for Gate 2 finalization.",
        page_num: 2,
        created_datetime: "2026-08-01T10:11:00Z",
        updated_datetime: null,
        file: {
            id: "f2222222-2222-3333-4444-555555555555",
            name: "Risk_Register_Q3.pdf",
            clean_name: "Risk Register Q3"
        }
    },
    {
        id: "k3333333-3333-3333-3333-333333333333",
        idx: 3,
        text: "Section 1.2 governance structure: SRO (Senior Responsible Owner) has been appointed to lead the review boards. SRO acts under central authorization. Bi-weekly Steering Group sessions are scheduled. Governance chart outlines all critical roles, skills, and resources, satisfying all appendix constraints.",
        page_num: 1,
        created_datetime: "2026-08-01T10:12:00Z",
        updated_datetime: null,
        file: {
            id: "f1111111-2222-3333-4444-555555555555",
            name: "Project_Business_Case.pdf",
            clean_name: "Project Business Case"
        }
    }
];

export const results: Result[] = [
    {
        id: "r1111111-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:20:00Z",
        updated_datetime: null,
        answer: "Positive",
        full_text: "The financial model is detailed and lists £12.4m capex and £1.2m opex. The breakdown is clearly aligned with the project's phased delivery plan. Review and validation was formally completed by the Central Finance Committee on June 12, 2026, satisfying all requirements.",
        criterion: criteria[0],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k1111111-3333-3333-3333-333333333333" }]
    },
    {
        id: "r2222222-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:21:00Z",
        updated_datetime: null,
        answer: "Negative",
        full_text: "Although the project scope is set, there is no secured contingency funding. Risk ID 04 highlights a critical contingency deficit of £1.5m, indicating that the budget is highly vulnerable to unexpected changes and is currently insufficient to safely cover the full scope.",
        criterion: criteria[1],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k2222222-3333-3333-3333-333333333333" }]
    },
    {
        id: "r3333333-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:22:00Z",
        updated_datetime: null,
        answer: "Positive",
        full_text: "Plans for budget monitoring are in place with monthly financial reviews and quarterly external audits led by the Central PMO, as evidenced in Section 4.5 of the Business Case.",
        criterion: criteria[2],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k1111111-3333-3333-3333-333333333333" }]
    },
    {
        id: "r4444444-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:23:00Z",
        updated_datetime: null,
        answer: "Negative",
        full_text: "While a risk register exists, several critical schedule risks (specifically around resource bottle-necks) do not have assigned owners or clear mitigation actions, which could delay the milestone timelines.",
        criterion: criteria[3],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k2222222-3333-3333-3333-333333333333" }]
    },
    {
        id: "r5555555-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:24:00Z",
        updated_datetime: null,
        answer: "Neutral",
        full_text: "Contingency plans exist for technical risks, but trigger points for executing these plans are vague and require manual clarification before entering GATE_2.",
        criterion: criteria[4],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k2222222-3333-3333-3333-333333333333" }]
    },
    {
        id: "r6666666-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:25:00Z",
        updated_datetime: null,
        answer: "Positive",
        full_text: "Resource management plan is highly detailed. A completed skills matrix is provided in Appendix C, showing sufficient competency coverage for all major roles.",
        criterion: criteria[5],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k3333333-3333-3333-3333-333333333333" }]
    },
    {
        id: "r7777777-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:26:00Z",
        updated_datetime: null,
        answer: "Positive",
        full_text: "A clear governance structure is documented. SRO has been appointed, Steering Group meets bi-weekly, and Terms of Reference are signed off.",
        criterion: criteria[6],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k3333333-3333-3333-3333-333333333333" }]
    },
    {
        id: "r8888888-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:27:00Z",
        updated_datetime: null,
        answer: "Positive",
        full_text: "Project milestones are well-defined in the schedule. The critical path analysis is complete and aligned with the national infrastructure program timeline.",
        criterion: criteria[7],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k3333333-3333-3333-3333-333333333333" }]
    },
    {
        id: "r9999999-4444-4444-4444-444444444444",
        created_datetime: "2026-08-01T10:28:00Z",
        updated_datetime: null,
        answer: "Positive",
        full_text: "Benefits realization plan is comprehensive. Key Performance Indicators (KPIs) have been defined, and benefit owners have been designated for each area.",
        criterion: criteria[8],
        project: {
            id: PROJECT_ID,
            name: "IPA Infrastructure Audit",
            results_summary: projects[0].results_summary
        },
        chunks: [{ id: "k1111111-3333-3333-3333-333333333333" }]
    }
];

export const ratings: Rating[] = [];

export const users: User[] = [
    {
        id: USER_ID,
        email: "test@test.co.uk",
        created_datetime: "2026-08-01T10:00:00Z",
        updated_datetime: null,
        projects: projects
    }
];

// Helper Functions
export function getById(table: string, id: string) {
    const tableLower = table.toLowerCase();
    if (tableLower === 'project') return projects.find(p => p.id === id);
    if (tableLower === 'file') return files.find(f => f.id === id);
    if (tableLower === 'criterion') return criteria.find(c => c.id === id);
    if (tableLower === 'chunk') {
        const chunk = chunks.find(ch => ch.id === id);
        if (chunk) {
            const file = files.find(f => f.id === chunk.file.id);
            return {
                ...chunk,
                file: file || chunk.file
            };
        }
        return undefined;
    }
    if (tableLower === 'result') {
        const result = results.find(r => r.id === id);
        if (result) {
            const matchCriterion = criteria.find(c => c.id === result.criterion.id) || result.criterion;
            const matchChunks = result.chunks.map(chRef => {
                const fullChunk = chunks.find(ch => ch.id === chRef.id);
                return fullChunk || chRef;
            });
            const matchRatings = ratings.filter(rt => rt.result_id === result.id);
            return {
                ...result,
                criterion: matchCriterion,
                chunks: matchChunks,
                ratings: matchRatings
            };
        }
        return undefined;
    }
    if (tableLower === 'rating') return ratings.find(r => r.id === id);
    if (tableLower === 'user') return users.find(u => u.id === id);
    return undefined;
}

export function getAll(table: string) {
    const tableLower = table.toLowerCase();
    if (tableLower === 'project') return projects;
    if (tableLower === 'file') return files;
    if (tableLower === 'criterion') return criteria;
    if (tableLower === 'chunk') {
        return chunks.map(chunk => {
            const file = files.find(f => f.id === chunk.file.id);
            return {
                ...chunk,
                file: file || chunk.file
            };
        });
    }
    if (tableLower === 'result') {
        return results.map(result => {
            const matchCriterion = criteria.find(c => c.id === result.criterion.id) || result.criterion;
            const matchChunks = result.chunks.map(chRef => {
                const fullChunk = chunks.find(ch => ch.id === chRef.id);
                return fullChunk || chRef;
            });
            const matchRatings = ratings.filter(rt => rt.result_id === result.id);
            return {
                ...result,
                criterion: matchCriterion,
                chunks: matchChunks,
                ratings: matchRatings
            };
        });
    }
    if (tableLower === 'rating') return ratings;
    if (tableLower === 'user') return users;
    return [];
}

export function filterItems(table: string, filters: Record<string, any>) {
    const all = getAll(table);
    return all.filter((item: any) => {
        for (const [key, value] of Object.entries(filters)) {
            if (value === null || value === undefined) continue;
            if (item[key] !== value) return false;
        }
        return true;
    });
}

export function getRelatedItems(uuid: string, model1: string, model2: string, limitToUser: boolean = false) {
    const m1 = model1.toLowerCase();
    const m2 = model2.toLowerCase();
    if (m1 === 'result' && m2 === 'rating') {
        return ratings.filter(r => r.result_id === uuid && (!limitToUser || r.user_id === USER_ID));
    }
    return [];
}

export function createOrUpdateRating(result_id: string, positive_rating: boolean) {
    const existing = ratings.find(r => r.result_id === result_id && r.user_id === USER_ID);
    if (existing) {
        existing.positive_rating = positive_rating;
        existing.updated_datetime = new Date().toISOString();
        return existing;
    } else {
        const newRating: Rating = {
            id: `rt-${Math.random().toString(36).substr(2, 9)}`,
            project_id: PROJECT_ID,
            result_id: result_id,
            user_id: USER_ID,
            positive_rating: positive_rating,
            created_datetime: new Date().toISOString(),
            updated_datetime: null
        };
        ratings.push(newRating);
        return newRating;
    }
}
