"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Item Component
const ToastItem = ({ id, message, type, onClose }: { id: string, message: string, type: ToastType, onClose: (id: string) => void }) => {
    // Auto-dismiss logic handled by the parent/provider for simplicity or here?
    // Let's handle generic icons and styles
    const styles = {
        success: 'bg-emerald-500 text-white border-emerald-600',
        error: 'bg-red-500 text-white border-red-600',
        info: 'bg-blue-500 text-white border-blue-600',
        warning: 'bg-amber-500 text-white border-amber-600',
    };

    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertCircle size={20} />,
        info: <Info size={20} />,
        warning: <AlertTriangle size={20} />,
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/5 border mb-2 pointer-events-auto min-w-[300px] max-w-md w-full backdrop-blur-md",
                "bg-white/90 text-slate-800 border-white/20", // Default Glassy Light
                type === 'error' && "bg-red-50 border-red-100 text-red-800",
                type === 'success' && "bg-emerald-50 border-emerald-100 text-emerald-800"
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                type === 'success' && "bg-emerald-100 text-emerald-600",
                type === 'error' && "bg-red-100 text-red-600",
                type === 'info' && "bg-blue-100 text-blue-600",
                type === 'warning' && "bg-amber-100 text-amber-600"
            )}>
                {icons[type]}
            </div>

            <p className="flex-1 text-sm font-medium leading-snug">{message}</p>

            <button
                onClick={() => onClose(id)}
                className="p-1 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toast, removeToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
                <AnimatePresence mode='popLayout'>
                    {toasts.map((t) => (
                        <ToastItem key={t.id} {...t} onClose={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
