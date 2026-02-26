import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { email, password, fullName, referralCode, country, phone } = await request.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    referral_code: referralCode,
                    country: country,
                    phone_number: phone,
                },
            },
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        // AFFILIATE FIX: Manually link referrer if code exists
        if (referralCode && data.user?.id) {
            try {
                // Use Admin Client to bypass RLS and look up referrer
                const supabaseAdmin = createAdminClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                const { data: referrer } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('referral_code', referralCode)
                    .single();

                if (referrer) {
                    console.log(`🔗 Linking user ${data.user.id} to referrer ${referrer.id}`);
                    await supabaseAdmin
                        .from('profiles')
                        .update({ referred_by: referrer.id })
                        .eq('id', data.user.id);
                } else {
                    console.warn(`⚠️ Invalid referral code used: ${referralCode}`);
                }
            } catch (refError) {
                console.error('⚠️ Failed to link referral:', refError);
            }
        }

        // 🛡️ KLAVIYO SYNC
        try {
            const klaviyoApiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
            const klaviyoListId = process.env.KLAVIYO_LIST_ID;

            if (klaviyoApiKey) {
                const [firstName, ...rest] = fullName.split(' ');
                const lastName = rest.join(' ');

                const profileResponse = await fetch('https://a.klaviyo.com/api/profiles', {
                    method: 'POST',
                    headers: {
                        Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
                        accept: 'application/json',
                        'content-type': 'application/json',
                        revision: '2024-02-15'
                    },
                    body: JSON.stringify({
                        data: {
                            type: 'profile',
                            attributes: {
                                email,
                                first_name: firstName,
                                last_name: lastName,
                                phone_number: phone,
                                properties: { source: 'Frontend Signup' }
                            }
                        }
                    })
                });

                if (profileResponse.ok && klaviyoListId) {
                    const profileData = await profileResponse.json();
                    const profileId = profileData.data.id;

                    await fetch(`https://a.klaviyo.com/api/lists/${klaviyoListId}/relationships/profiles`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
                            accept: 'application/json',
                            'content-type': 'application/json',
                            revision: '2024-02-15'
                        },
                        body: JSON.stringify({
                            data: [{ type: 'profile', id: profileId }]
                        })
                    });
                    console.log(`[Klaviyo] Signup sync successful for ${email}`);
                }
            }
        } catch (klaviyoError) {
            console.error('[Klaviyo] Signup sync failed:', klaviyoError);
        }

        return NextResponse.json({
            success: true,
            user: {
                id: data.user?.id,
                email: data.user?.email,
            },
            message: 'Please check your email to confirm your account',
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
