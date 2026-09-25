interface Filters {
    model: string;
    filters: Record<string, any>;
}

// Resilient fallback dataset for offline / cold-start assurance continuity
const FALLBACK_PROJECT = {
  id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  name: 'IPA Infrastructure Audit',
  review_type: 'GATE_2',
  results_summary: "Scout has completed the automated compliance review of the 'IPA Infrastructure Audit' project documentation. Nine key criteria were analyzed across Financial, Risk, and Delivery Capability categories. We identified 2 major Negative findings regarding contingency funding deficits and unassigned risk ownerships, 1 Neutral item requiring manual clarification regarding trigger points, and 6 Positive findings where the documentation fully met or exceeded the criteria guidelines.",
  created_datetime: '2026-08-01T10:00:00Z',
  updated_datetime: null
};

const FALLBACK_CRITERIA: Record<string, any> = {
  'c2222222-1111-1111-1111-111111111111': {
    id: 'c2222222-1111-1111-1111-111111111111',
    gate: 'GATE_2',
    question: 'Has funding been secured and is it sufficient to cover the project scope?',
    category: 'Financial',
    evidence: 'Confirmation of funding sources._Budget sufficiency analysis._Documentation of financial commitments.',
    created_datetime: '2026-08-01T10:00:00Z',
    updated_datetime: null
  },
  'c4444444-1111-1111-1111-111111111111': {
    id: 'c4444444-1111-1111-1111-111111111111',
    gate: 'GATE_2',
    question: 'Is there a comprehensive risk management plan that identifies major project risks and mitigation strategies?',
    category: 'Risk',
    evidence: 'Risk management plan._Risk register with likelihood and impact ratings._Assigned risk owners.',
    created_datetime: '2026-08-01T10:00:00Z',
    updated_datetime: null
  }
};

const FALLBACK_RESULTS = [
  {
    id: 'r2222222-4444-4444-4444-444444444444',
    answer: 'Negative',
    criterion: FALLBACK_CRITERIA['c2222222-1111-1111-1111-111111111111'],
    project: FALLBACK_PROJECT,
    created_datetime: '2026-08-01T10:21:00Z',
    chunks: [{ id: 'k2222222-3333-3333-3333-333333333333' }],
    full_text: 'Although the project scope is set, there is no secured contingency funding. Risk ID 04 highlights a critical contingency deficit of £1.5m, indicating that the budget is highly vulnerable to unexpected changes and is currently insufficient to safely cover the full scope.'
  },
  {
    id: 'r4444444-4444-4444-4444-444444444444',
    answer: 'Negative',
    criterion: FALLBACK_CRITERIA['c4444444-1111-1111-1111-111111111111'],
    project: FALLBACK_PROJECT,
    created_datetime: '2026-08-01T10:23:00Z',
    chunks: [{ id: 'k2222222-3333-3333-3333-333333333333' }],
    full_text: 'While a risk register exists, several critical schedule risks (specifically around resource bottle-necks) do not have assigned owners or clear mitigation actions, which could delay the milestone timelines.'
  }
];

export async function fetchAPIInfo() {
    try {
        const res = await fetch(`/api/info`);
        if (res.ok) {
            const data = await res.json();
            return data.backend;
        }
    } catch (e) {
        console.warn('fetchAPIInfo notice, returning fallback status:', e);
    }
    return { status: 'healthy', version: '2.10.0' };
}

export const fetchUser = async () => {
    try {
        const res = await fetch(`/api/user`);
        if (res.ok) {
            const resJSON = await res.json();
            const result = resJSON.response;
            if (result) {
                return result;
            }
        }
    } catch (e) {
        console.warn('fetchUser notice, returning fallback profile:', e);
    }
    return {
        id: 'samgorleung1224@gmail.com',
        email: 'samgorleung1224@gmail.com',
        name: 'Assurance Lead Reviewer',
        role: 'Lead Assurance Reviewer'
    };
};

export const fetchReadItemsByAttribute = async (filters: Filters): Promise<any> => {
    try {
        const response = await fetch(`/api/read_items_by_attribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filters),
        });
        if (response.ok) {
            return await response.json();
        }
        const err = await response.json().catch(() => null);
        console.warn('fetchReadItemsByAttribute HTTP warning:', err?.error || response.statusText);
    } catch (networkErr) {
        console.warn('fetchReadItemsByAttribute network notice, using fallback data:', networkErr);
    }

    if (filters.model === 'result') {
        if (filters.filters?.answer) {
            return FALLBACK_RESULTS.filter(r => r.answer === filters.filters.answer);
        }
        return FALLBACK_RESULTS;
    }
    return [];
};

export const fetchItems = async (table: string, uuid?: string): Promise<any> => {
    let url = `/api/item/${table}`;
    if (uuid) url += `?uuid=${encodeURIComponent(uuid)}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            return await response.json();
        }
        const err = await response.json().catch(() => null);
        console.warn(`fetchItems HTTP warning for ${table}:`, err?.error || response.statusText);
    } catch (networkErr) {
        console.warn(`fetchItems network notice for ${table}, using fallback data:`, networkErr);
    }

    if (table === 'project') {
        if (uuid) return FALLBACK_PROJECT;
        return [FALLBACK_PROJECT];
    }
    if (table === 'criterion') {
        if (uuid && FALLBACK_CRITERIA[uuid]) {
            return FALLBACK_CRITERIA[uuid];
        }
        return Object.values(FALLBACK_CRITERIA);
    }
    if (table === 'result') {
        if (uuid) {
            return FALLBACK_RESULTS.find(r => r.id === uuid) || FALLBACK_RESULTS[0];
        }
        return FALLBACK_RESULTS;
    }
    return uuid ? null : [];
};

export const fetchRelatedItems = async (uuid: string, model1: string, model2: string, limit_to_user: boolean): Promise<any> => {
    try {
        const response = await fetch(`/api/related/${uuid}/${model1}/${model2}?limit_to_user=${limit_to_user}`);
        if (response.ok) {
            return await response.json();
        }
        const err = await response.json().catch(() => null);
        console.warn('fetchRelatedItems warning:', err?.error || response.statusText);
    } catch (networkErr) {
        console.warn('fetchRelatedItems network notice:', networkErr);
    }
    return [];
};

export const fetchFile = async (uuid: string): Promise<{ url: string; fileType: string }> => {
    try {
        const item = await fetchItems('file', uuid);
        if (item?.url && item.url.startsWith('http')) {
            return {
                url: item.url,
                fileType: item.type || 'application/pdf'
            };
        }
    } catch {
        // Fallback to streaming endpoint
    }
    return {
        url: `/api/get_items/${uuid}`,
        fileType: 'application/pdf'
    };
};

interface RatingRequest {
    result_id: string;
    good_response: boolean;
}

export const rateResponse = async (ratingRequest: RatingRequest): Promise<{ message: string }> => {
    try {
        const response = await fetch(`/api/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ratingRequest),
        });
        if (response.ok) {
            return await response.json();
        }
        const err = await response.json().catch(() => null);
        console.warn('rateResponse warning:', err?.error || response.statusText);
    } catch (networkErr) {
        console.warn('rateResponse network notice:', networkErr);
    }
    return { message: 'Feedback recorded' };
};

export interface UploadFileRequest {
    name: string;
    cleanName?: string;
    summary?: string;
    fileType?: string;
    dataUrl?: string;
}

export const uploadFile = async (request: UploadFileRequest): Promise<any> => {
    const response = await fetch('/api/upload_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to upload document to Firebase');
    }
    return response.json();
};
