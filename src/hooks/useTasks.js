import { useState, useEffect, useCallback, useRef } from 'react';
import { getTasks, createTask, updateTask, deleteTask, subscribeToTasks } from '../services/pb';

export function useTasks(filter = '') {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getTasks(filter);
            setTasks(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Realtime: smart incremental updates instead of full refetch
    useEffect(() => {
        const unsub = subscribeToTasks((e) => {
            const { action, record } = e;
            switch (action) {
                case 'create':
                    // Avoid duplicates: if record already exists (from optimistic add), replace it
                    setTasks(prev => {
                        const exists = prev.some(t => t.id === record.id);
                        if (exists) return prev.map(t => t.id === record.id ? { ...t, ...record } : t);
                        // Replace temp record if any
                        const tempIdx = prev.findIndex(t => t.id?.startsWith('_temp_'));
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            updated[tempIdx] = record;
                            return updated;
                        }
                        return [record, ...prev];
                    });
                    break;
                case 'update':
                    setTasks(prev => prev.map(t => t.id === record.id ? { ...t, ...record } : t));
                    break;
                case 'delete':
                    setTasks(prev => prev.filter(t => t.id !== record.id));
                    break;
                default:
                    fetchTasks();
            }
        });
        return unsub;
    }, [fetchTasks]);

    // Optimistic add
    const addTask = async (data) => {
        const tempId = '_temp_' + Date.now();
        const optimistic = { ...data, id: tempId, created: new Date().toISOString(), updated: new Date().toISOString() };
        setTasks(prev => [optimistic, ...prev]);
        try {
            const result = await createTask(data);
            // Replace temp with real record
            setTasks(prev => prev.map(t => t.id === tempId ? result : t));
            return result;
        } catch (err) {
            // Revert on failure
            setTasks(prev => prev.filter(t => t.id !== tempId));
            throw err;
        }
    };

    // Optimistic edit
    const editTask = async (id, data) => {
        const prev = tasksRef.current;
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
        try {
            const result = await updateTask(id, data);
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...result } : t));
            return result;
        } catch (err) {
            setTasks(prev); // revert
            throw err;
        }
    };

    // Optimistic remove
    const removeTask = async (id) => {
        const prev = tasksRef.current;
        setTasks(p => p.filter(t => t.id !== id));
        try {
            await deleteTask(id);
        } catch (err) {
            setTasks(prev); // revert
            throw err;
        }
    };

    // Reorder (local only, for drag & drop)
    const reorderTasks = (fromIndex, toIndex) => {
        setTasks(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            return updated;
        });
    };

    return { tasks, loading, error, refresh: fetchTasks, addTask, editTask, removeTask, reorderTasks };
}
