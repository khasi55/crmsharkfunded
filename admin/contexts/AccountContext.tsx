"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Account {
    id: string;
    challenge_id: string;
    account_number: string;
    account_type: string;
    balance: number;
    equity: number;
    initial_balance: number;
    status: string;
}

interface AccountContextType {
    selectedAccount: Account | null;
    setSelectedAccount: (account: Account | null) => void;
    accounts: Account[];
    loading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Fetch user's accounts/challenges
                const { data, error } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error fetching accounts:', error);
                } else if (data && data.length > 0) {
                    const accountsData = data.map(challenge => ({
                        id: challenge.id,
                        challenge_id: challenge.id,
                        account_number: challenge.challenge_number || `#${challenge.id.slice(0, 8)}`,
                        account_type: challenge.challenge_type || 'Phase 1',
                        balance: Number(challenge.current_balance),
                        equity: Number(challenge.current_equity),
                        initial_balance: Number(challenge.initial_balance),
                        status: challenge.status || 'active',
                    }));

                    setAccounts(accountsData);
                    // Auto-select first account if none selected
                    if (!selectedAccount) {
                        setSelectedAccount(accountsData[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AccountContext.Provider value={{ selectedAccount, setSelectedAccount, accounts, loading }}>
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
