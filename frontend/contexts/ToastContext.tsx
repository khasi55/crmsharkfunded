"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[400px] pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className={cn(
                                "pointer-events-auto relative flex items-start gap-4 p-4 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden group",
                                toast.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                                toast.type === 'error' && "bg-rose-500/10 border-rose-500/20 text-rose-400",
                                toast.type === 'warning' && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                                toast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            )}
                        >
                            {/* Icon */}
                            <div className={cn(
                                "shrink-0 p-2 rounded-xl bg-white/5",
                                toast.type === 'success' && "text-emerald-500",
                                toast.type === 'error' && "text-rose-500",
                                toast.type === 'warning' && "text-amber-500",
                                toast.type === 'info' && "text-blue-500"
                            )}>
                                {toast.type === 'success' && <CheckCircle size={20} />}
                                {toast.type === 'error' && <AlertCircle size={20} />}
                                {toast.type === 'warning' && <AlertCircle size={20} />}
                                {toast.type === 'info' && <Info size={20} />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 py-1">
                                <h4 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-0.5">
                                    {toast.type}
                                </h4>
                                <p className="text-sm font-medium leading-relaxed text-slate-100">
                                    {toast.message}
                                </p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X size={16} className="text-white/40 hover:text-white" />
                            </button>

                            {/* Progress Bar (Optional) */}
                            {toast.duration && toast.duration > 0 && (
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: toast.duration / 1000, ease: "linear" }}
                                    className={cn(
                                        "absolute bottom-0 left-0 h-0.5 opacity-30",
                                        toast.type === 'success' && "bg-emerald-500",
                                        toast.type === 'error' && "bg-rose-500",
                                        toast.type === 'warning' && "bg-amber-500",
                                        toast.type === 'info' && "bg-blue-500"
                                    )}
                                />
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
