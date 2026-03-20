import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToTasks } from '../services/pb';

export function useNotifications(userId) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const seenIdsRef = useRef(new Set());

    // Load from localStorage
    useEffect(() => {
        if (!userId) return;
        try {
            const saved = localStorage.getItem(`task_notifs_${userId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setNotifications(parsed);
                setUnreadCount(parsed.filter(n => !n.read).length);
                parsed.forEach(n => seenIdsRef.current.add(n.id));
            }
        } catch { }
    }, [userId]);

    // Save to localStorage
    function persist(notifs) {
        if (!userId) return;
        // Keep only last 50
        const trimmed = notifs.slice(0, 50);
        localStorage.setItem(`task_notifs_${userId}`, JSON.stringify(trimmed));
    }

    // Listen for task changes → create notifications
    useEffect(() => {
        if (!userId) return;
        const unsub = subscribeToTasks((e) => {
            const { action, record } = e;
            // Notify when a task is CREATED or UPDATED and user is in assigned_to
            const assignedTo = Array.isArray(record.assigned_to) ? record.assigned_to : record.assigned_to ? [record.assigned_to] : [];
            const isAssignedToMe = assignedTo.includes(userId);
            const isNotMyTask = record.assigned_by !== userId;

            if (isAssignedToMe && isNotMyTask) {
                const notifId = `${action}_${record.id}_${Date.now()}`;
                // Avoid duplicate notifications for the same task in quick succession
                if (seenIdsRef.current.has(`${action}_${record.id}`) && action === 'update') return;
                seenIdsRef.current.add(`${action}_${record.id}`);

                let message = '';
                if (action === 'create') {
                    message = `Bạn được giao việc mới: "${record.title}"`;
                } else if (action === 'update') {
                    message = `Công việc "${record.title}" đã được cập nhật`;
                }

                if (message) {
                    const notif = {
                        id: notifId,
                        taskId: record.id,
                        message,
                        time: new Date().toISOString(),
                        read: false,
                        type: action === 'create' ? 'assigned' : 'updated',
                    };
                    setNotifications(prev => {
                        const updated = [notif, ...prev].slice(0, 50);
                        persist(updated);
                        return updated;
                    });
                    setUnreadCount(prev => prev + 1);

                    // Browser notification (if permission granted)
                    if (Notification.permission === 'granted') {
                        new Notification('📋 Giao Việc MKG', { body: message, icon: '/favicon.svg' });
                    }
                }
            }
        });
        return unsub;
    }, [userId]);

    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            persist(updated);
            return updated;
        });
        setUnreadCount(0);
    }, [userId]);

    const markRead = useCallback((notifId) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === notifId ? { ...n, read: true } : n);
            persist(updated);
            return updated;
        });
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, [userId]);

    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
        if (userId) localStorage.removeItem(`task_notifs_${userId}`);
    }, [userId]);

    return { notifications, unreadCount, markAllRead, markRead, clearAll };
}
