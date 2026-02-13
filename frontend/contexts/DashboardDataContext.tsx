"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAccount } from './AccountContext';
import { useSocket } from './SocketContext';
import { fetchFromBackend } from '@/lib/backend-api';

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
    refreshData: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
    const { selectedAccount } = useAccount();
    useEffect(() => {
        console.log("[DashboardData] DashboardDataProvider Mounted");
    }, []);

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

    const fetchAllData = useCallback(async () => {
        if (!selectedAccount) return;

        setLoading(prev => ({ ...prev, global: true }));
        setError(null);

        const challengeId = selectedAccount.id;
        console.log(`[DashboardData] Fetching all data for challenge: ${challengeId}`);

        try {
            // Consolidated bulk fetch
            const bulkData = await fetchFromBackend(`/api/dashboard/bulk?challenge_id=${challengeId}`, {
                method: 'GET'
            });

            console.log('[DashboardData] Bulk Data Received:', {
                objectives: !!bulkData.objectives,
                hasDailyLoss: !!bulkData.objectives?.daily_loss,
                hasAnalysis: !!bulkData.analysis
            });

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
            console.error('[DashboardData] Bulk fetch error:', err);
            setError(err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(prev => ({ ...prev, global: false }));
        }
    }, [selectedAccount?.id]);

    const { socket } = useSocket();

    // Socket listeners for live updates
    useEffect(() => {
        if (!socket || !selectedAccount?.id) return;

        const handleBalanceUpdate = (update: any) => {
            console.log('[DashboardData] Live Balance Update:', update);
            setData(prev => {
                if (!prev.objectives) return prev;
                return {
                    ...prev,
                    objectives: {
                        ...prev.objectives,
                        equity: update.equity,
                        floating_pl: update.floating_pl,
                        stats: {
                            ...prev.objectives.stats,
                            equity: update.equity,
                            // If net_pnl is realized, we might need a separate field for floating
                        }
                    }
                };
            });
        };

        const handleTradeUpdate = (update: any) => {
            console.log('[DashboardData] Live Trade Update:', update);
            // Refresh trades list or could selectively append
            fetchAllData();
        };

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('trade_update', handleTradeUpdate);

        return () => {
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('trade_update', handleTradeUpdate);
        };
    }, [socket, selectedAccount?.id, fetchAllData]);

    useEffect(() => {
        if (selectedAccount?.id) {
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
        throw new Error('useDashboardData must be used within a DashboardDataProvider');
    }
    return context;
}
