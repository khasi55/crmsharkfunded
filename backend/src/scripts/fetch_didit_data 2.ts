
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const DIDIT_API_BASE_URL = 'https://verification.didit.me';
const DIDIT_API_KEY = process.env.DIDIT_CLIENT_SECRET;

async function fetchAndSyncDiditSession(sessionId: string) {
    console.log(`🌍 Fetching real data from Didit for ${sessionId}...`);

    if (!DIDIT_API_KEY) {
        console.error("❌ Missing DIDIT_CLIENT_SECRET");
        return;
    }

    try {
        // Try to get session details/decision
        const response = await axios.get(
            `${DIDIT_API_BASE_URL}/v2/session/${sessionId}/decision/`,
            {
                headers: {
                    'Authorization': `Bearer ${DIDIT_API_KEY}`, // Trying Bearer first, or X-Api-Key
                    'X-Api-Key': DIDIT_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;
        console.log("✅ Didit Response Keys:", Object.keys(data));
        console.log("✅ Didit Response (Full):", JSON.stringify(data, null, 2));

        // Map the real data
        const updateData: any = {
            updated_at: new Date().toISOString(),
            status: data.status === 'Approved' ? 'approved' : data.status.toLowerCase(),
            raw_response: data,

            // Correct Mapping based on Didit V2 response structure
            first_name: data.id_document?.extracted_data?.first_name || data.first_name,
            last_name: data.id_document?.extracted_data?.last_name || data.last_name,

            // Address (Prefer POA, fallback to ID if available, else null)
            address_line1: data.poa?.extracted_data?.address_line_1 || data.poa?.extracted_data?.address || null,
            city: data.poa?.extracted_data?.city || null,
            state: data.poa?.extracted_data?.state || null,
            postal_code: data.poa?.extracted_data?.zip_code || null,
            country: data.id_document?.extracted_data?.issuing_country || data.ip_analysis?.ip_country_code || null,

            document_type: data.id_document?.extracted_data?.document_type || data.document_type,
            document_number: data.id_document?.extracted_data?.document_number || data.document_number,
            document_country: data.id_document?.extracted_data?.issuing_country,

            date_of_birth: data.id_document?.extracted_data?.date_of_birth || data.date_of_birth,
        };

        if (data.status === 'Approved') {
            updateData.completed_at = new Date().toISOString();
        }

        console.log("💾 Sycing to database...");
        const { error } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('didit_session_id', sessionId);

        if (error) {
            console.error("❌ DB Update Error:", error.message);
        } else {
            console.log("✅ Database updated with REAL data.");
        }

    } catch (error: any) {
        console.error("❌ Didit API Error:", error.response?.data || error.message);
    }
}

fetchAndSyncDiditSession('ec8fb6f7-9ec6-4525-96a5-fdca6ed526a3');
