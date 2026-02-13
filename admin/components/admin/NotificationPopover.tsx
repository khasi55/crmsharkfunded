'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle, CheckCircle, Info, DollarSign, FileCheck, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/simple-popover';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';


// Type badge configuration
const TYPE_CONFIG = {
    payout: { icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', label: 'Payout' },
    kyc: { icon: FileCheck, color: 'text-blue-600 bg-blue-50', label: 'KYC' },
    risk: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', label: 'Risk' },
    success: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Success' },
    warning: { icon: AlertCircle, color: 'text-amber-600 bg-amber-50', label: 'Warning' },
    error: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Error' },
    info: { icon: Info, color: 'text-slate-600 bg-slate-50', label: 'Info' },
};

export function NotificationPopover() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`/api/admin/notifications`, {
                headers: { 'x-admin-api-key': 'sk_admin_2026_sharkfunded_crm_key' }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (id: string) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await fetch(`/api/admin/notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': 'sk_admin_2026_sharkfunded_crm_key'
                },
                body: JSON.stringify({ id })
            });
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const markAllAsRead = async () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        try {
            await fetch(`/api/admin/notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-api-key': 'sk_admin_2026_sharkfunded_crm_key'
                },
                body: JSON.stringify({ all: true })
            });
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    const deleteNotification = async (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
        try {
            await fetch(`/api/admin/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-api-key': 'sk_admin_2026_sharkfunded_crm_key' }
            });
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={(open: boolean) => {
            setIsOpen(open);
            if (open) fetchNotifications();
        }}>
            <PopoverTrigger asChild>
                <button className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white ring-2 ring-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 shadow-xl border border-slate-200 rounded-xl overflow-hidden" align="end">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
                    <div>
                        <h4 className="font-semibold text-base text-slate-900">Notifications</h4>
                        {unreadCount > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">{unreadCount} unread</p>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
                <div className="max-h-[32rem] overflow-y-auto bg-slate-50/30">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => {
                            const typeConfig = TYPE_CONFIG[notification.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
                            const Icon = typeConfig.icon;

                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "relative p-4 border-b border-slate-100 hover:bg-white transition-all duration-150 group",
                                        !notification.read ? "bg-blue-50/40" : "bg-white"
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                            typeConfig.color
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-slate-900 leading-tight">
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        {!notification.read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 hover:text-blue-700 transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                                            title="Delete"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-16 px-4 text-center bg-white">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                                <Bell className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-900">No notifications</p>
                            <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
