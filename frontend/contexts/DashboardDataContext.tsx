"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAccount } from './AccountContext';
import { useSocket } from './SocketContext';
import { fetchFromBackend } from '@/lib/backend-api';
import { useChallengeSubscription } from '@/hooks/useChallengeSocket';

interface DashboardData {
    objectives: any | null;
    stats: any | null;
    trades: any[] | null;
    risk: any | null;
    consistency: any | null;
    calendar: any | null;
    analysis: any | null;
}

interface DashboardDataContextType {
    data: DashboardData;
    loading: {
        objectives: boolean;
        trades: boolean;
        risk: boolean;
        consistency: boolean;
        calendar: boolean;
        global: boolean;
    };
    error: string | null;
    refreshData: (isSilent?: boolean) => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
    const { selectedAccount } = useAccount();

    // Subscribe to real-time updates for the selected challenge (Centralized here)
    useChallengeSubscription(selectedAccount?.id);

    const [data, setData] = useState<DashboardData>({
        objectives: null,
        stats: null,
        trades: null,
        risk: null,
        consistency: null,
        calendar: null,
        analysis: null,
    });

    const [loading, setLoading] = useState({
        objectives: false,
        trades: false,
        risk: false,
        consistency: false,
        calendar: false,
        global: false,
    });

    const [error, setError] = useState<string | null>(null);

    const fetchAllData = useCallback(async (isSilent = false) => {
        if (!selectedAccount) return;

        if (!isSilent) setLoading(prev => ({ ...prev, global: true }));
        setError(null);

        const challengeId = selectedAccount.id;

        try {
            // Consolidated bulk fetch
            const bulkData = await fetchFromBackend(`/api/dashboard/bulk?challenge_id=${challengeId}`, {
                credentials: 'include'
            });

            console.log(`[DashboardData] ${isSilent ? 'Silent' : 'Full'} refresh received`);

            setData({
                objectives: bulkData.objectives || null,
                stats: bulkData.objectives?.stats || null,
                risk: bulkData.risk || null,
                consistency: bulkData.consistency || null,
                calendar: bulkData.calendar || null,
                trades: bulkData.trades?.trades || null,
                analysis: bulkData.analysis || null,
            });
        } catch (err: any) {
            console.error('[DashboardData] Fetch error:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            if (!isSilent) setLoading(prev => ({ ...prev, global: false }));
        }
    }, [selectedAccount]);

    // --- Real-time WebSocket event handlers ---
    const { socket } = useSocket();
    const refreshInFlightRef = useRef(false);

    useEffect(() => {
        if (!socket || !selectedAccount?.id) return;

        const handleBalanceUpdate = (update: any) => {
            console.log('📊 [DashboardData] balance_update received:', update);
            setData((prev) => {
                // IGNORE Zero Equity Glitch from bridge (Aggressive Check)
                // We ignore any update with 0 equity to prevent UI from showing "Failed" before Risk Engine syncs.
                // Real blowouts will be handled by 'status' updates or Risk Engine passing valid low equity.
                if (Number(update.equity) === 0) {
                    console.warn('⚠️ [DashboardData] Ignoring 0 equity update (glitch protection)');
                    return prev;
                }

                if (!prev.objectives || !prev.objectives.challenge) {
                    // Trigger refresh if update arrives before primary data
                    if (!refreshInFlightRef.current) {
                        refreshInFlightRef.current = true;
                        fetchAllData().finally(() => { refreshInFlightRef.current = false; });
                    }
                    return prev;
                }

                // Recalculate objectives with new equity
                const currentEquity = update.equity;
                const floatingPl = update.floating_pl ?? 0;

                const startOfDayEquity = prev.objectives.daily_loss?.start_of_day_equity || 0;
                const initialBalance = Number(prev.objectives.challenge.initial_balance) || 0;
                const maxDailyLoss = prev.objectives.daily_loss?.max_allowed || 0;
                const maxTotalLoss = prev.objectives.total_loss?.max_allowed || 0;

                const dailyNet = currentEquity - startOfDayEquity;
                const dailyLoss = dailyNet >= 0 ? 0 : Math.abs(dailyNet);
                const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
                const dailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);

                const totalNet = currentEquity - initialBalance;
                const totalLoss = totalNet >= 0 ? 0 : Math.abs(totalNet);
                const totalBreachLevel = initialBalance - maxTotalLoss;
                const totalRemaining = Math.max(0, currentEquity - totalBreachLevel);

                return {
                    ...prev,
                    objectives: {
                        ...prev.objectives,
                        daily_loss: {
                            ...prev.objectives.daily_loss,
                            current: dailyLoss,
                            remaining: dailyRemaining,
                        },
                        total_loss: {
                            ...prev.objectives.total_loss,
                            current: totalLoss,
                            remaining: totalRemaining,
                        },
                        stats: {
                            ...prev.objectives.stats,
                            equity: currentEquity,
                            floating_pl: floatingPl,
                        },
                    },
                    stats: {
                        ...prev.stats,
                        equity: currentEquity,
                        floating_pl: floatingPl,
                    },
                };
            });
        };

        const handleTradeUpdate = (update: any) => {
            console.log('📊 [DashboardData] trade_update received:', update);
            fetchAllData();
        };

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('trade_update', handleTradeUpdate);

        return () => {
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('trade_update', handleTradeUpdate);
        };
    }, [socket, selectedAccount?.id, fetchAllData]);

    // --- Periodic Polling Fallback ---
    useEffect(() => {
        if (!selectedAccount?.id) return;

        const pollInterval = setInterval(() => {
            console.log('[DashboardData] Periodic polling refresh (silent)...');
            fetchAllData(true); // Silent: No loading spinners
        }, 120000); // Poll every 120s as fallback (Reduced from 30s)

        return () => clearInterval(pollInterval);
    }, [selectedAccount?.id, fetchAllData]);

    // --- Initial Fetch Trigger ---
    // Only fetch when account truly changes or is first loaded
    // Relying on this instead of mount-time effect to avoid double calls
    useEffect(() => {
        if (selectedAccount?.id) {
            console.log('[DashboardData] selectedAccount trigger. ID:', selectedAccount.id);
            fetchAllData();
        }
    }, [selectedAccount?.id, fetchAllData]);

    return (
        <DashboardDataContext.Provider value={{ data, loading, error, refreshData: fetchAllData }}>
            {children}
        </DashboardDataContext.Provider>
    );
}

export function useDashboardData() {
    const context = useContext(DashboardDataContext);
    if (context === undefined) {
        return {
            data: {
                objectives: null,
                stats: null,
                trades: null,
                risk: null,
                consistency: null,
                calendar: null,
                analysis: null,
            },
            loading: {
                objectives: false,
                trades: false,
                risk: false,
                consistency: false,
                calendar: false,
                global: false,
            },
            error: null,
            refreshData: async () => { },
        } as DashboardDataContextType;
    }
    return context;
}
