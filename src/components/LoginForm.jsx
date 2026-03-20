import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginForm() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!username.trim() || !password) return;
        setError('');
        setLoading(true);
        try {
            await login(username.trim(), password);
        } catch (_) {
            setError('Sai tên đăng nhập hoặc mật khẩu');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>📋 Giao Việc</h1>
                <p>Hệ thống quản lý công việc MKG</p>

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
