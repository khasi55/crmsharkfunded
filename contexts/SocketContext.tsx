"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { createClient } from '@/utils/supabase/client';

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    isAuthenticated: boolean;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
    isAuthenticated: false
});

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const supabase = createClient();

    useEffect(() => {
        // Mock socket implementation for demo
        const mockSocket = {
            on: (event: string, callback: any) => {
                if (event === 'connect') setTimeout(() => callback(), 100);
                if (event === 'authenticated') setTimeout(() => callback({ success: true, challenges: [] }), 200);
            },
            off: () => {},
            emit: (event: string, data: any) => {
                console.log(`[MOCK SOCKET] Emit ${event}`, data);
            },
            close: () => {},
            disconnect: () => {},
        } as any;

        setSocket(mockSocket);
        setIsConnected(true);
        setIsAuthenticated(true);

        return () => {
            mockSocket.close();
        };
    }, []); // Empty deps - only initialize once

    return (
        <SocketContext.Provider value={{ socket, isConnected, isAuthenticated }}>
            {children}
        </SocketContext.Provider>
    );
}
