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
        // Get backend URL from environment or default to localhost
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';



        // Initialize socket connection
        // console.log("🔌 SocketContext: Connecting to backendUrl:", backendUrl);
        const newSocket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', async () => {

            setIsConnected(true);

            // Authenticate with user ID
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {

                    newSocket.emit('authenticate', { userId: user.id });
                }
            } catch (error) {
                console.error('❌ Failed to get user for socket auth:', error);
            }
        });

        newSocket.on('authenticated', (data: { success: boolean; challenges: string[] }) => {

            setIsAuthenticated(true);
        });

        newSocket.on('auth_error', (data: { message: string }) => {
            console.error('❌ Socket authentication failed:', data.message);
            setIsAuthenticated(false);
        });

        newSocket.on('disconnect', (reason) => {

            setIsConnected(false);
            setIsAuthenticated(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            setIsConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {

        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {

        });

        // Cleanup on unmount
        return () => {

            newSocket.close();
            socketRef.current = null;
        };
    }, []); // Empty deps - only initialize once

    return (
        <SocketContext.Provider value={{ socket, isConnected, isAuthenticated }}>
            {children}
        </SocketContext.Provider>
    );
}
