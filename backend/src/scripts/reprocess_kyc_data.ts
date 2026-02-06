import { supabase } from '../lib/supabase';

/**
 * Re-extract data from raw_response for existing KYC sessions that have empty fields
 * Run this once to fix existing approved sessions
 */
async function reprocessKYCData() {
    console.log('🔍 Fetching KYC sessions with missing data...');

    // Get sessions that have raw_response but missing personal data
    const { data: sessions, error } = await supabase
        .from('kyc_sessions')
        .select('*')
        .is('first_name', null)
        .not('raw_response', 'is', null);

    if (error) {
        console.error('Error fetching sessions:', error);
        return;
    }

    console.log(`📋 Found ${sessions?.length || 0} sessions to reprocess`);

    for (const session of sessions || []) {
        console.log(`\n🔄 Processing session: ${session.id}`);

        const fullData = session.raw_response;
        const updateData: any = {};

        // Same extraction logic as webhook handler
        const idVerification = fullData.id_verifications?.[0] || fullData.decision?.id_verification || {};
        const extractedData = fullData.id_document?.extracted_data || fullData.decision?.id_verification?.extracted_data || {};
        const decision = fullData.decision || {};
        const liveness = decision.liveness || fullData.liveness || {};
        const faceMatch = decision.face_match || fullData.face_match || {};

        // Identity Mapping
        updateData.first_name = extractedData.first_name || decision.first_name || idVerification.first_name || fullData.first_name || fullData.firstName;
        updateData.last_name = extractedData.last_name || decision.last_name || idVerification.last_name || fullData.last_name || fullData.lastName;
        updateData.date_of_birth = extractedData.date_of_birth || decision.date_of_birth || idVerification.date_of_birth || fullData.date_of_birth || fullData.dateOfBirth;
        updateData.nationality = decision.nationality || fullData.nationality || extractedData.issuing_country || idVerification.nationality;

        // Document Mapping
        updateData.document_type = extractedData.document_type || decision.document_type || idVerification.document_type || fullData.document_type || fullData.documentType;
        updateData.document_number = extractedData.document_number || decision.document_number || idVerification.document_number || fullData.document_number || fullData.documentNumber;
        updateData.document_country = extractedData.issuing_country || decision.issuing_country || idVerification.issuing_country || fullData.document_country;

        // Risk/Biometric Data
        updateData.aml_status = decision.aml?.status || fullData.aml_status || fullData.amlStatus;
        updateData.face_match_score = faceMatch.score || fullData.face_match?.score;
        updateData.liveness_score = liveness.score || fullData.liveness_score;

        console.log('📝 Extracted data:', {
            name: `${updateData.first_name || '?'} ${updateData.last_name || '?'}`,
            liveness: updateData.liveness_score,
            aml: updateData.aml_status
        });

        // Update the session
        const { error: updateError } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('id', session.id);

        if (updateError) {
            console.error(`❌ Error updating session ${session.id}:`, updateError);
        } else {
            console.log(`✅ Successfully updated session ${session.id}`);
        }
    }

    console.log('\n✨ Reprocessing complete!');
}

// Run the script
reprocessKYCData().catch(console.error);
