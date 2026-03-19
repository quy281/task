import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

// Quick-access accounts (click để login ngay)
const QUICK_ACCOUNTS = [
    { label: 'Admin MKG', username: 'admin', password: 'mkg20144', role: 'director', color: '#ef4444' },
    { label: 'Thuỷ Lê', username: 'thuyle', password: 'Mkg2024!', role: 'manager', color: '#f59e0b' },
];

export default function LoginForm() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function doLogin(uname, pwd) {
        setError('');
        setLoading(true);
        try {
            await login(uname, pwd);
        } catch (_) {
            setError('Sai tên đăng nhập hoặc mật khẩu');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        await doLogin(username.trim(), password);
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>📋 Giao Việc</h1>
                <p>Hệ thống quản lý công việc MKG</p>

                {/* Quick login buttons */}
                <div className="demo-accounts">
                    <h3>Đăng nhập nhanh</h3>
                    {QUICK_ACCOUNTS.map(acc => (
                        <button
                            key={acc.username}
                            className="demo-btn"
                            onClick={() => doLogin(acc.username, acc.password)}
                            disabled={loading}
                        >
                            <span className="role-dot" style={{ background: acc.color }} />
                            <span>
                                <strong>{acc.label}</strong>
                                <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>
                                    ({acc.username})
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>hoặc nhập thủ công</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Tên đăng nhập</label>
                        <input
                            type="text"
                            placeholder="admin, thuyle, ..."
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="input-group">
                        <label>Mật khẩu</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button className="btn-login" type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                    {error && <div className="login-error">{error}</div>}
                </form>

                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Liên hệ admin để được cấp tài khoản
                </div>
            </div>
        </div>
    );
}
