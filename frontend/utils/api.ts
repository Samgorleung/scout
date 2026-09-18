interface Filters {
    model: string;
    filters: Record<string, any>;
}

export async function fetchAPIInfo() {
    const res = await fetch(`/api/info`);
    if (!res.ok) {
        throw new Error('Failed to fetch data');
    }
    const data = await res.json();
    return data.backend
}

export const fetchUser = async () => {
    const res = await fetch(`/api/user`)
    if (res.ok) {
        const resJSON = await res.json()
        const result = resJSON.response
        if (result) {
            return result
        }
    }
    throw new Error('Service unavailable')
}

export const fetchReadItemsByAttribute = async (filters: Filters): Promise<any> => {
    const response = await fetch(`/api/read_items_by_attribute`, {
        method: 'POST',
        body: JSON.stringify(filters),
    });
    if (!response.ok) throw new Error('Failed to read items by attribute');
    return response.json();
};


export const fetchItems = async (table: string, uuid?: string): Promise<any> => {
    let url = `/api/item/${table}`;
    if (uuid) url += `?uuid=${encodeURIComponent(uuid)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
};


export const fetchRelatedItems = async (uuid: string, model1: string, model2: string, limit_to_user: boolean): Promise<any> => {
    const response = await fetch(`/api/related/${uuid}/${model1}/${model2}?limit_to_user=${limit_to_user}`);
    if (!response.ok) throw new Error('Failed to fetch related items');
    return response.json();
};

export const fetchFile = async (uuid: string): Promise<{ url: string; fileType: string }> => {
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
    const response = await fetch(`/api/rate`, {
        method: 'POST',
        body: JSON.stringify(ratingRequest),
    });
    if (!response.ok) throw new Error('Failed to submit rating');
    return response.json();
};
