import { useState } from 'react';
import { useAuth } from '../App';
import { getRoleColor, getRoleLabel } from '../services/pb';

const DEMO_ACCOUNTS = [
    { email: 'giamdoc@mkg.vn', password: '12345678', name: 'Nguyễn Văn An', role: 'director' },
    { email: 'truongphong@mkg.vn', password: '12345678', name: 'Trần Thị Bình', role: 'manager' },
    { email: 'nhanvien@mkg.vn', password: '12345678', name: 'Lê Minh Cường', role: 'staff' },
];

export default function LoginForm() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError('Sai email hoặc mật khẩu');
        } finally {
            setLoading(false);
        }
    }

    async function handleDemo(account) {
        setError('');
        setLoading(true);
        try {
            await login(account.email, account.password);
        } catch (err) {
            setError('Tài khoản demo chưa được tạo trên database');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>📋 Giao Việc</h1>
                <p>Quản lý công việc dễ dàng, hiệu quả</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="email@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
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
                        />
                    </div>
                    <button className="btn-login" type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                    {error && <div className="login-error">{error}</div>}
                </form>

                <div className="demo-accounts">
                    <h3>Tài khoản demo</h3>
                    {DEMO_ACCOUNTS.map(acc => (
                        <button
                            key={acc.email}
                            className="demo-btn"
                            onClick={() => handleDemo(acc)}
                            disabled={loading}
                        >
                            <span className="role-dot" style={{ background: getRoleColor(acc.role) }} />
                            <span><strong>{acc.name}</strong> – {getRoleLabel(acc.role)}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
