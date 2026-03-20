import { useState, useEffect } from 'react';
import { getUsers, getRoleLabel, getRoleColor, getInitials } from '../services/pb';
import { useAuth } from '../hooks/useAuth';
import pb from '../services/pb';

const ROLE_OPTIONS = [
    { value: 'staff', label: 'Nhân viên' },
    { value: 'manager', label: 'Trưởng phòng' },
    { value: 'hr', label: 'Nhân sự' },
    { value: 'assistant_director', label: 'Trợ lý GĐ' },
    { value: 'director', label: 'Giám đốc' },
];

export default function AdminSettings({ onClose, departments, onDepartmentsChange }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('departments');
    const [users, setUsers] = useState([]);
    const [newDept, setNewDept] = useState('');
    const [editingDept, setEditingDept] = useState(null);
    const [editDeptValue, setEditDeptValue] = useState('');
    const [savingUser, setSavingUser] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const allUsers = await getUsers();
            setUsers(allUsers);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }

    // ===== Department management =====
    function handleAddDept() {
        if (!newDept.trim()) return;
        if (departments.includes(newDept.trim())) return;
        onDepartmentsChange([...departments, newDept.trim()]);
        setNewDept('');
    }

    function handleRemoveDept(dept) {
        if (!confirm(`Xóa phòng ban "${dept}"?`)) return;
        onDepartmentsChange(departments.filter(d => d !== dept));
    }

    function handleEditDept(dept) {
        setEditingDept(dept);
        setEditDeptValue(dept);
    }

    function handleSaveEditDept() {
        if (!editDeptValue.trim() || editDeptValue.trim() === editingDept) {
            setEditingDept(null);
            return;
        }
        onDepartmentsChange(departments.map(d => d === editingDept ? editDeptValue.trim() : d));
        setEditingDept(null);
    }

    // ===== Role management =====
    async function handleRoleChange(userId, newRole) {
        setSavingUser(userId);
        try {
            await pb.collection('task_users').update(userId, { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error('Failed to update role:', err);
            alert('Không thể cập nhật quyền: ' + err.message);
        } finally {
            setSavingUser(null);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content admin-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header-top">
                        <h2 className="modal-title">⚙ Quản lý hệ thống</h2>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'departments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('departments')}
                    >🏢 Phòng ban</button>
                    <button
                        className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('roles')}
                    >👥 Phân quyền</button>
                </div>

                <div className="modal-body">
                    {/* ===== DEPARTMENTS TAB ===== */}
                    {activeTab === 'departments' && (
                        <div className="admin-section">
                            <div className="admin-add-row">
                                <input
                                    type="text"
                                    placeholder="Tên phòng ban mới..."
                                    value={newDept}
                                    onChange={e => setNewDept(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddDept(); }}
                                />
                                <button className="admin-add-btn" onClick={handleAddDept} disabled={!newDept.trim()}>+ Thêm</button>
                            </div>

                            <div className="admin-dept-list">
                                {departments.map((dept, i) => (
                                    <div key={i} className="admin-dept-item">
                                        {editingDept === dept ? (
                                            <div className="admin-dept-edit">
                                                <input
                                                    type="text"
                                                    value={editDeptValue}
                                                    onChange={e => setEditDeptValue(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEditDept(); if (e.key === 'Escape') setEditingDept(null); }}
                                                    autoFocus
                                                />
                                                <button className="admin-save-btn" onClick={handleSaveEditDept}>✓</button>
                                                <button className="admin-cancel-btn" onClick={() => setEditingDept(null)}>✕</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="admin-dept-name">🏷️ {dept}</span>
                                                <div className="admin-dept-actions">
                                                    <button className="admin-icon-btn" onClick={() => handleEditDept(dept)} title="Sửa">✏️</button>
                                                    <button className="admin-icon-btn danger" onClick={() => handleRemoveDept(dept)} title="Xóa">🗑️</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {departments.length === 0 && (
                                    <div className="admin-empty">Chưa có phòng ban nào</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== ROLES TAB ===== */}
                    {activeTab === 'roles' && (
                        <div className="admin-section">
                            <div className="admin-user-list">
                                {users.map(u => (
                                    <div key={u.id} className="admin-user-item">
                                        <div className="admin-user-info">
                                            <span className="admin-user-avatar" style={{ background: getRoleColor(u.role) }}>
                                                {getInitials(u.name)}
                                            </span>
                                            <div>
                                                <div className="admin-user-name">{u.name}</div>
                                                <div className="admin-user-email">{u.email}</div>
                                            </div>
                                        </div>
                                        <select
                                            className="admin-role-select"
                                            value={u.role || 'staff'}
                                            onChange={e => handleRoleChange(u.id, e.target.value)}
                                            disabled={u.id === user.id || savingUser === u.id}
                                        >
                                            {ROLE_OPTIONS.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                                {users.length === 0 && (
                                    <div className="admin-empty">Đang tải...</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
