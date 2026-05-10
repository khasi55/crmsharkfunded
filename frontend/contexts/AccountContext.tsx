"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchFromBackend } from '@/lib/backend-api';
import { useSocket } from './SocketContext';
import { useChallengeSubscription } from '@/hooks/useChallengeSocket';

interface Account {
    id: string;
    challenge_id: string;
    user_id: string;
    login: number;
    password?: string;
    server?: string;
    account_number: string;
    account_type: string;
    balance: number;
    equity: number;
    initial_balance: number;
    status: string;
    group?: string;
    metadata?: any;
    is_public?: boolean;
    share_token?: string;
    is_archived?: boolean;
    created_at?: string;
}

interface AccountContextType {
    selectedAccount: Account | null;
    setSelectedAccount: (account: Account | null) => void;
    accounts: Account[];
    loading: boolean;
    refreshAccounts: () => Promise<void>;
    archiveAccount: (id: string, isArchived: boolean) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const lastSocketUpdateRef = useRef<number>(0);

    useEffect(() => {
        // Realtime Subscription for Account Updates
        const supabase = createClient();

        // Skip subscription if we are using placeholder keys (prevents console errors)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
            // Attempt to fetch once but don't subscribe
            fetchAccounts();
            return;
        }

        fetchAccounts();

        const initRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const filter = `user_id=eq.${user.id}`;

            const channel = supabase
                .channel(`realtime-accounts-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'challenges',
                        filter: filter
                    },
                    (payload) => {
                        // Only refresh if NOT a minor equity change already handled by WebSocket
                        // or if we haven't had a socket update in the last 2 seconds
                        const now = Date.now();
                        if (now - lastSocketUpdateRef.current > 2000) {
                            fetchAccounts();
                        } else {
                            // If it's a status change, we MUST refresh regardless
                            if (payload.new.status !== payload.old.status) {
                                fetchAccounts();
                            }
                        }
                    }
                )
                .subscribe();

            return channel;
        };

        let activeChannel: any = null;
        initRealtime().then(ch => { activeChannel = ch; });

        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, []);

    const fetchAccounts = async () => {
        try {
            // Auth check handled by middleware and backend
            const supabase = createClient();


            const data = await fetchFromBackend('/api/dashboard/accounts');


            if (data && data.accounts) {

                const accountsData = data.accounts.map((challenge: any) => ({
                    id: challenge.id,
                    challenge_id: challenge.id,
                    user_id: challenge.user_id,
                    login: challenge.login,
                    password: challenge.master_password,
                    server: /STOX|AURO|BULGE|BLUGE|OCEAN|MARKETS/i.test(challenge.server || '') ? 'Xylo Markets Ltd' : (challenge.server || 'Xylo Markets Ltd'),
                    account_number: challenge.challenge_number || `SF-${challenge.id.slice(0, 8)}`,
                    account_type: challenge.challenge_type || 'Phase 1',
                    balance: Number(challenge.current_balance),
                    equity: Number(challenge.current_equity),
                    initial_balance: Number(challenge.initial_balance),
                    status: challenge.status || 'active',
                    group: challenge.group,
                    metadata: challenge.metadata,
                    is_public: challenge.is_public,
                    share_token: challenge.share_token,
                    is_archived: !!challenge.is_archived,
                    created_at: challenge.created_at,
                }));

                // Optimize: Only update state if data actually changed
                // This prevents the whole dashboard from re-rendering every 15s if data is same
                setAccounts(prev => {
                    const isSame = JSON.stringify(prev) === JSON.stringify(accountsData);
                    return isSame ? prev : accountsData;
                });
                // Auto-select first account if none selected
                if (!selectedAccount) {
                    setSelectedAccount(accountsData[0]);
                } else {
                    // Update currently selected account with fresh data
                    const updatedCurrent = accountsData.find((a: any) => a.id === selectedAccount.id);
                    if (updatedCurrent) {
                        // FRESHNESS LOCK: If we had a socket update in the last 3s,
                        // don't let the DB fetch overwrite the high-precision equity/balance
                        // unless there's a significant gap.
                        const now = Date.now();
                        const isRecentlyUpdatedBySocket = (now - lastSocketUpdateRef.current) < 3000;

                        const hasStatusChanged = updatedCurrent.status !== selectedAccount.status;
                        const hasEquityChangedSignificant = Math.abs(updatedCurrent.equity - selectedAccount.equity) > 0.01;

                        if (hasStatusChanged || (!isRecentlyUpdatedBySocket && hasEquityChangedSignificant)) {
                            setSelectedAccount(updatedCurrent);
                        }
                    }
                }
            }
        } catch (error) {
            // Error logged silently in production
        } finally {
            setLoading(false);
        }
    };

    // WebSocket Listener for real-time updates
    const { socket } = useSocket();
    useChallengeSubscription(selectedAccount?.id);

    useEffect(() => {
        if (!socket) return;

        const handleBalanceUpdate = (update: any) => {
            // Update freshness lock
            lastSocketUpdateRef.current = Date.now();

            // Update the selected account if it matches
            setSelectedAccount(prev => {
                if (!prev) return null;
                const matches = prev.id === update.challenge_id || prev.id === update.id;
                
                if (matches) {
                    // Update only if values changed
                    if (prev.equity !== update.equity || prev.balance !== update.balance) {
                        return {
                            ...prev,
                            equity: update.equity,
                            balance: update.balance || prev.balance
                        };
                    }
                }
                return prev;
            });

            // Update in the accounts list too
            setAccounts(prev => {
                return prev.map(acc => {
                    const matches = acc.id === update.challenge_id || acc.id === update.id;
                    if (matches) {
                        if (acc.equity !== update.equity || acc.balance !== update.balance) {
                            return {
                                ...acc,
                                equity: update.equity,
                                balance: update.balance || acc.balance
                            };
                        }
                    }
                    return acc;
                });
            });
        };

        socket.on('balance_update', handleBalanceUpdate);
        return () => {
            socket.off('balance_update', handleBalanceUpdate);
        };
    }, [socket]);

    const archiveAccount = async (id: string, isArchived: boolean) => {
        try {
            await fetchFromBackend('/api/dashboard/archive-account', {
                method: 'POST',
                body: JSON.stringify({
                    challenge_id: id,
                    is_archived: isArchived
                })
            });
            await fetchAccounts();
        } catch (error) {
            console.error('Failed to archive account:', error);
            throw error;
        }
    };

    return (
        <AccountContext.Provider value={{ selectedAccount, setSelectedAccount, accounts, loading, refreshAccounts: fetchAccounts, archiveAccount }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error('useAccount must be used within an AccountProvider');
    }
    return context;
}
