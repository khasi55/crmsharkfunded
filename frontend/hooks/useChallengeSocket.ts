
import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export function useChallengeSubscription(challengeId: string | undefined | null) {
    const { socket, isConnected, isAuthenticated } = useSocket();

    useEffect(() => {
        if (!socket || !isConnected || !isAuthenticated || !challengeId) return;

        // console.log(`📡 Subscribing to challenge: ${challengeId}`);
        socket.emit('subscribe_challenge', challengeId);

        return () => {
            // console.log(`📴 Unsubscribing from challenge: ${challengeId}`);
            socket.emit('unsubscribe_challenge', challengeId);
        };
    }, [socket, isConnected, isAuthenticated, challengeId]);
}
