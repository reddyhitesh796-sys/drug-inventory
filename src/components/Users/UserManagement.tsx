import { useState, useMemo } from 'react';
import { Mail, Clock, CheckCircle, Plus, Edit2, Trash2, X, User as UserIcon, Search, Shield, Eye, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../Common/ConfirmDialog';
import EmptyState from '../Common/EmptyState';
import type { User } from '../../types';
import { ROLE_PERMISSIONS, type Role } from '../../types/permissions';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Inventory Manager': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Sales Manager': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Purchase Manager': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Accountant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Auditor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Custom: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function UserManagement() {
  const { users, addUser, updateUser, deleteUser, toggleUserActive } = useApp();
  const { currentUser, switchUser, hasPermission, getEffectivePermissions } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    role: 'Inventory Manager' as User['role'],
    isActive: true,
  });

  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleOpenAdd = () => {
    setEditing(null);
    setFormData({ name: '', email: '', phone: '', role: 'Inventory Manager', isActive: true });
    setShowForm(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditing(u);
    setFormData({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, isActive: u.isActive });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateUser({ ...editing, ...formData });
    } else {
      addUser({ ...formData, createdAt: new Date().toISOString().substring(0, 10) });
    }
    setShowForm(false);
  };

  const handleDelete = () => {
    deleteUser(confirmDelete.id);
    setConfirmDelete({ open: false, id: '', name: '' });
  };

  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    users.forEach(u => { stats[u.role] = (stats[u.role] || 0) + 1; });
    return stats;
  }, [users]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, color: 'bg-blue-500' },
          { label: 'Active', value: users.filter(u => u.isActive).length, color: 'bg-emerald-500' },
          { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, color: 'bg-red-500' },
          { label: 'Disabled', value: users.filter(u => !u.isActive).length, color: 'bg-slate-400' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${s.color}`} />
            <div><p className="text-[10px] uppercase text-slate-500">{s.label}</p><p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="All">All Roles</option>
            {(Object.keys(ROLE_PERMISSIONS) as Role[]).map(r => <option key={r} value={r}>{r} ({roleStats[r] || 0})</option>)}
          </select>
        </div>
        {canCreate && (
          <button onClick={handleOpenAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"><Plus size={16} /> Add User</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={<UserIcon size={28} />} title="No users found" message="Add a new user to get started." action={canCreate ? <button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add First User</button> : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(user => {
            const isCurrent = user.id === currentUser.id;
            const perms = getEffectivePermissions(user);
            return (
              <div key={user.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${isCurrent ? 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-700'} p-5 hover:shadow-lg transition-shadow group`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      {user.name}
                      {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">YOU</span>}
                    </h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-500"><Mail size={12} /><span className="truncate">{user.email}</span></div>
                  {user.phone && <div className="flex items-center gap-2 text-slate-500"><Phone size={12} /><span>{user.phone}</span></div>}
                  <div className="flex items-center gap-2 text-slate-500"><Clock size={12} /><span>Last: {user.lastLogin}</span></div>
                  <div className="flex items-center gap-2 text-slate-500"><Shield size={12} /><span>{perms.length} permissions</span></div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={12} className={user.isActive ? 'text-green-500' : 'text-red-500'} />
                    <span className={user.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{user.isActive ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => switchUser(user)} disabled={!user.isActive} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 disabled:opacity-30" title="Login as this user"><Eye size={14} /></button>
                  {canUpdate && <button onClick={() => handleOpenEdit(user)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600" title="Edit"><Edit2 size={14} /></button>}
                  {canUpdate && (
                    <button onClick={() => toggleUserActive(user.id)} disabled={isCurrent} className={`p-1.5 rounded-lg ${user.isActive ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500' : 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-500'} disabled:opacity-30`} title={isCurrent ? 'Cannot disable yourself' : user.isActive ? 'Disable' : 'Enable'}>
                      {user.isActive ? <X size={14} /> : <CheckCircle size={14} />}
                    </button>
                  )}
                  {canDelete && !isCurrent && <button onClick={() => setConfirmDelete({ open: true, id: user.id, name: user.name })} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" title="Delete"><Trash2 size={14} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit User' : 'Add New User'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editing ? 'Update user details and role' : 'Create a new user account'}</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., John Doe" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="user@ddias.com" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91-9876543210" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Role *</label>
                <select required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as User['role'] })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white">
                  {(Object.keys(ROLE_PERMISSIONS) as Role[]).filter(r => r !== 'Custom').map(r => (
                    <option key={r} value={r}>{r} ({ROLE_PERMISSIONS[r].length} permissions)</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">For custom permissions, edit user from Settings → Access Control after creation</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Account Active</p>
                  <p className="text-[10px] text-slate-500">User can log in immediately</p>
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} className={`relative w-10 h-5 rounded-full ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${formData.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">{editing ? 'Save Changes' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Delete User?"
        message={`Permanently delete user "${confirmDelete.name}"? This action will be logged in the audit trail.`}
        variant="danger"
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: '', name: '' })}
      />
    </div>
  );
}
