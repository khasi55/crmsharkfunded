import axios from 'axios';

const DIDIT_API_BASE_URL = 'https://verification.didit.me';
const DIDIT_API_KEY = process.env.DIDIT_CLIENT_SECRET;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface CreateSessionPayload {
    workflow_id: string;
    callback: string;
    vendor_data: string;
    callback_method?: string;
}

interface DiditSessionResponse {
    session_id: string;
    session_number: string;
    session_token: string;
    status: string;
    workflow_id: string;
    callback: string;
    url: string;
}

export async function createDiditSession(userId: string): Promise<DiditSessionResponse> {
    if (!DIDIT_API_KEY) {
        throw new Error('DIDIT_CLIENT_SECRET is not configured');
    }

    if (!DIDIT_WORKFLOW_ID) {
        throw new Error('DIDIT_WORKFLOW_ID is not configured');
    }

    const payload: CreateSessionPayload = {
        workflow_id: DIDIT_WORKFLOW_ID,
        callback: `${FRONTEND_URL}/kyc/callback`,
        vendor_data: userId,
        callback_method: 'both',
    };

    try {
        const response = await axios.post<DiditSessionResponse>(
            `${DIDIT_API_BASE_URL}/v2/session/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': DIDIT_API_KEY,
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Didit API error:', error.response?.data || error.message);
        throw new Error(
            error.response?.data?.message ||
            error.response?.data?.error ||
            'Failed to create Didit verification session'
        );
    }
}
