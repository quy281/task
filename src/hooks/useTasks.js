import { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask, subscribeToTasks } from '../services/pb';

export function useTasks(filter = '') {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    // Realtime updates
    useEffect(() => {
        const unsub = subscribeToTasks(() => {
            fetchTasks();
        });
        return unsub;
    }, [fetchTasks]);

    const addTask = async (data) => {
        const result = await createTask(data);
        await fetchTasks();
        return result;
    };

    const editTask = async (id, data) => {
        const result = await updateTask(id, data);
        await fetchTasks();
        return result;
    };

    const removeTask = async (id) => {
        await deleteTask(id);
        await fetchTasks();
    };

    return { tasks, loading, error, refresh: fetchTasks, addTask, editTask, removeTask };
}
