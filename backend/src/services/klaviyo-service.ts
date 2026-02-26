
import axios from 'axios';

export class KlaviyoService {
    private static API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;
    private static LIST_ID = process.env.KLAVIYO_LIST_ID;
    private static BASE_URL = 'https://a.klaviyo.com/api';

    /**
     * Sync a user to Klaviyo
     */
    static async syncUser(email: string, firstName?: string, lastName?: string, phone?: string) {
        if (!this.API_KEY) {
            console.warn('[KlaviyoService] Missing KLAVIYO_PRIVATE_API_KEY. Sync skipped.');
            return;
        }

        try {
            // 1. Create/Update Profile
            const profilePayload = {
                data: {
                    type: 'profile',
                    attributes: {
                        email: email,
                        first_name: firstName,
                        last_name: lastName,
                        phone_number: phone,
                        properties: {
                            source: 'SharkFunded CRM'
                        }
                    }
                }
            };

            const profileResponse = await axios.post(`${this.BASE_URL}/profiles`, profilePayload, {
                headers: {
                    Authorization: `Klaviyo-API-Key ${this.API_KEY}`,
                    accept: 'application/json',
                    'content-type': 'application/json',
                    revision: '2024-02-15'
                }
            });

            const profileId = profileResponse.data.data.id;
            console.log(`[KlaviyoService] Profile synced: ${email} (ID: ${profileId})`);

            // 2. Add to List if LIST_ID is provided
            if (this.LIST_ID && profileId) {
                await this.addToList(profileId);
            }

            return profileId;
        } catch (error: any) {
            console.error('[KlaviyoService] Error syncing user:', error.response?.data || error.message);
        }
    }

    /**
     * Add a profile to a specific list
     */
    private static async addToList(profileId: string) {
        try {
            const listPayload = {
                data: [{
                    type: 'profile',
                    id: profileId
                }]
            };

            await axios.post(`${this.BASE_URL}/lists/${this.LIST_ID}/relationships/profiles`, listPayload, {
                headers: {
                    Authorization: `Klaviyo-API-Key ${this.API_KEY}`,
                    accept: 'application/json',
                    'content-type': 'application/json',
                    revision: '2024-02-15'
                }
            });
            console.log(`[KlaviyoService] Added profile ${profileId} to list ${this.LIST_ID}`);
        } catch (error: any) {
            console.error('[KlaviyoService] Error adding to list:', error.response?.data || error.message);
        }
    }
}
