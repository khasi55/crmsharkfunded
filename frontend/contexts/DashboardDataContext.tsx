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
    const lastSocketUpdateRef = useRef<number>(0);
    const lastThrottleUpdateRef = useRef<number>(0);
    const pendingUpdateRef = useRef<any>(null);

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

            // console.log(`[DashboardData] ${isSilent ? 'Silent' : 'Full'} refresh received`);

            const now = Date.now();
            const isRecentlyUpdatedBySocket = (now - lastSocketUpdateRef.current) < 3000;

            setData(prev => {
                if (isRecentlyUpdatedBySocket && prev.objectives?.stats) {
                    // MELD: Preserve the high-precision socket metrics inside the bulk update
                    return {
                        ...prev,
                        objectives: {
                            ...bulkData.objectives,
                            daily_loss: {
                                ...bulkData.objectives.daily_loss,
                                current: prev.objectives.daily_loss.current,
                                remaining: prev.objectives.daily_loss.remaining,
                            },
                            total_loss: {
                                ...bulkData.objectives.total_loss,
                                current: prev.objectives.total_loss.current,
                                remaining: prev.objectives.total_loss.remaining,
                            },
                            stats: {
                                ...bulkData.objectives.stats,
                                equity: prev.objectives.stats.equity,
                                floating_pl: prev.objectives.stats.floating_pl,
                            }
                        },
                        stats: {
                            ...bulkData.objectives?.stats,
                            equity: prev.stats?.equity || bulkData.objectives?.stats?.equity,
                            floating_pl: prev.stats?.floating_pl || bulkData.objectives?.stats?.floating_pl,
                        },
                        risk: bulkData.risk || null,
                        consistency: bulkData.consistency || null,
                        calendar: bulkData.calendar || null,
                        trades: bulkData.trades?.trades || null,
                        analysis: bulkData.analysis || null,
                    };
                }

                return {
                    objectives: bulkData.objectives || null,
                    stats: bulkData.objectives?.stats || null,
                    risk: bulkData.risk || null,
                    consistency: bulkData.consistency || null,
                    calendar: bulkData.calendar || null,
                    trades: bulkData.trades?.trades || null,
                    analysis: bulkData.analysis || null,
                };
            });
        } catch (err: any) {
            console.error('[DashboardData] Fetch error:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            if (!isSilent) setLoading(prev => ({ ...prev, global: false }));
        }
    }, [selectedAccount?.id]); // FIX: Only depend on ID, not the entire object (which changes on every equity tick)

    // --- Real-time WebSocket event handlers ---
    const { socket } = useSocket();
    const refreshInFlightRef = useRef(false);

    useEffect(() => {
        if (!socket || !selectedAccount?.id) return;

        const applyUpdate = (update: any) => {
            setData((prev) => {
                // IGNORE Zero Equity Glitch from bridge (Aggressive Check)
                if (Number(update.equity) === 0) {
                    return prev;
                }

                if (!prev.objectives || !prev.objectives.challenge) {
                    if (!refreshInFlightRef.current) {
                        refreshInFlightRef.current = true;
                        fetchAllData().finally(() => { refreshInFlightRef.current = false; });
                    }
                    return prev;
                }

                const currentEquity = update.equity;
                const floatingPl = update.floating_pl ?? 0;
                const startOfDayEquity = prev.objectives.daily_loss?.start_of_day_equity || 0;
                const initialBalance = Number(prev.objectives.challenge.initial_balance) || 0;
                const maxDailyLoss = prev.objectives.daily_loss?.max_allowed || 0;
                const maxTotalLoss = prev.objectives.total_loss?.max_allowed || 0;

                const dailyNet = currentEquity - startOfDayEquity;
                const calcDailyLoss = dailyNet >= 0 ? 0 : Math.abs(dailyNet);
                const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
                const calcDailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);

                const totalNet = currentEquity - initialBalance;
                const calcTotalLoss = totalNet >= 0 ? 0 : Math.abs(totalNet);
                const totalBreachLevel = initialBalance - maxTotalLoss;
                const calcTotalRemaining = Math.max(0, currentEquity - totalBreachLevel);

                return {
                    ...prev,
                    objectives: {
                        ...prev.objectives,
                        daily_loss: {
                            ...prev.objectives.daily_loss,
                            current: update.daily_drawdown !== undefined ? update.daily_drawdown : calcDailyLoss,
                            remaining: update.daily_remaining !== undefined ? update.daily_remaining : calcDailyRemaining,
                        },
                        total_loss: {
                            ...prev.objectives.total_loss,
                            current: update.max_drawdown !== undefined ? update.max_drawdown : calcTotalLoss,
                            remaining: update.total_remaining !== undefined ? update.total_remaining : calcTotalRemaining,
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

        // Handle trailing update
        const intervalId = setInterval(() => {
            if (pendingUpdateRef.current) {
                applyUpdate(pendingUpdateRef.current);
                pendingUpdateRef.current = null;
                lastThrottleUpdateRef.current = Date.now();
            }
        }, 200);

        const handleBalanceUpdate = (update: any) => {
            lastSocketUpdateRef.current = Date.now();
            
            const now = Date.now();
            if (now - lastThrottleUpdateRef.current < 200) {
                pendingUpdateRef.current = update;
                return;
            }

            applyUpdate(update);
            lastThrottleUpdateRef.current = now;
        };

        const handleTradeUpdate = (update: any) => {
            // console.log('📊 [DashboardData] trade_update received:', update);
            fetchAllData();
        };

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('trade_update', handleTradeUpdate);

        return () => {
            clearInterval(intervalId);
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('trade_update', handleTradeUpdate);
        };
    }, [socket, selectedAccount?.id, fetchAllData]);

    // --- Periodic Polling Fallback ---
    useEffect(() => {
        if (!selectedAccount?.id) return;

        const pollInterval = setInterval(() => {
            const now = Date.now();
            const wasRecentlySocketActive = (now - lastSocketUpdateRef.current) < 30000;

            // Only poll if socket HAS NOT been active for 30s
            // This satisfies the user's request to use WebSocket and not poll unnecessarily
            if (!wasRecentlySocketActive) {
                console.log('[DashboardData] Periodic polling refresh (silent)...');
                fetchAllData(true); // Silent: No loading spinners
            }
        }, 120000); // Poll every 120s as fallback

        return () => clearInterval(pollInterval);
    }, [selectedAccount?.id, fetchAllData]);


    useEffect(() => {
        if (selectedAccount?.id) {
            // console.log('[DashboardData] selectedAccount trigger. ID:', selectedAccount.id);
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
