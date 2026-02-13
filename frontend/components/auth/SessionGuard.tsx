'use client';

import { useRef, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchFromBackend } from '@/lib/backend-api';
import PageLoader from '@/components/ui/PageLoader';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [isSynced, setIsSynced] = useState(false);
    const syncInProgress = useRef(false);

    useEffect(() => {
        const syncSession = async (force = false) => {
            if (syncInProgress.current && !force) return;

            try {
                // Optimized: Skip sync if already synced in this browser tab
                const isAlreadySynced = sessionStorage.getItem('sf_backend_synced') === 'true';
                if (isAlreadySynced && !force) {
                    setIsSynced(true);
                    return;
                }

                syncInProgress.current = true;
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    try {
                        await fetchFromBackend('/api/auth/session', {
                            method: 'POST',
                        });
                        // Mark as synced for this browser session only on success
                        sessionStorage.setItem('sf_backend_synced', 'true');
                    } catch (syncErr) {
                        console.error('[SessionGuard] Backend session sync failed:', syncErr);
                        // We allow it to proceed to the dashboard anyway, as the backend 
                        // now supports JWT-only auth as a fallback.
                    }
                }
            } catch (err) {
                console.error('[SessionGuard] Critical guard error:', err);
            } finally {
                syncInProgress.current = false;
                setIsSynced(true);
            }
        };

        syncSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Clear sync flag on new login to force a re-sync
                const wasSynced = sessionStorage.getItem('sf_backend_synced') === 'true';
                if (!wasSynced) {
                    syncSession(true);
                }
            } else if (event === 'SIGNED_OUT') {
                sessionStorage.removeItem('sf_backend_synced');
                setIsSynced(true);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    if (!isSynced) {
        return <PageLoader isLoading={true} text="SYNCING SESSION..." />;
    }

    return <>{children}</>;
}
