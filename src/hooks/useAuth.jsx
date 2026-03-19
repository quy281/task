import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as pbLogin, logout as pbLogout, onAuthChange, getRoleLabel, canAssignTo } from '../services/pb';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(getCurrentUser());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUser(getCurrentUser());
        setLoading(false);
        const unsubscribe = onAuthChange(() => {
            setUser(getCurrentUser());
        });
        return unsubscribe;
    }, []);

    async function login(email, password) {
        const result = await pbLogin(email, password);
        setUser(result.record);
        return result;
    }

    function logout() {
        pbLogout();
        setUser(null);
    }

    const value = {
        user,
        loading,
        login,
        logout,
        isDirector: user?.role === 'director',
        isManager: user?.role === 'manager',
        isStaff: user?.role === 'staff',
        canAssign: user ? (target) => canAssignTo(user, target) : () => false,
        roleLabel: user ? getRoleLabel(user.role) : '',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
