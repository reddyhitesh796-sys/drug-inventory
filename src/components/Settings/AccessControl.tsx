import { useState, useMemo } from 'react';
import { Shield, Users, ShieldCheck, ShieldAlert, Search, Edit3, Save, X, CheckCircle2, XCircle, ChevronDown, ChevronRight, Building2, Lock, Unlock, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { PERMISSION_GROUPS, ROLE_PERMISSIONS, type Permission, type Role } from '../../types/permissions';
import type { User } from '../../types';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Inventory Manager': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Sales Manager': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Purchase Manager': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Accountant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Auditor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Custom: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function AccessControl() {
  const { users, warehouses, updateUser, toggleUserActive, updateUserPermissions } = useApp();
  const { currentUser, getEffectivePermissions, switchUser } = useAuth();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);
  const [editWarehouseAccess, setEditWarehouseAccess] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'matrix'>('users');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['dashboard', 'drugs', 'batches']);
  const [previewRole, setPreviewRole] = useState<Role | null>(null);

  const filtered = useMemo(() => {
    return users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditPermissions(getEffectivePermissions(user));
    setEditWarehouseAccess(user.warehouseAccess || []);
  };

  const handleTogglePermission = (perm: Permission) => {
    setEditPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const handleToggleGroup = (groupId: string, allPerms: Permission[]) => {
    const allChecked = allPerms.every(p => editPermissions.includes(p));
    if (allChecked) {
      setEditPermissions(prev => prev.filter(p => !allPerms.includes(p)));
    } else {
      setEditPermissions(prev => [...new Set([...prev, ...allPerms])]);
    }
    if (!expandedGroups.includes(groupId)) {
      setExpandedGroups(prev => [...prev, groupId]);
    }
  };

  const handleApplyRolePreset = (role: Role) => {
    setEditPermissions(ROLE_PERMISSIONS[role]);
  };

  const handleToggleWarehouse = (whId: string) => {
    setEditWarehouseAccess(prev => prev.includes(whId) ? prev.filter(w => w !== whId) : [...prev, whId]);
  };

  const handleSavePermissions = () => {
    if (!editingUser) return;
    updateUser({
      ...editingUser,
      customPermissions: editPermissions,
      role: 'Custom',
      warehouseAccess: editWarehouseAccess.length === warehouses.length ? [] : editWarehouseAccess,
    });
    updateUserPermissions(editingUser.id, editPermissions);
    setEditingUser(null);
  };

  const handleResetToRole = (role: Role) => {
    if (!editingUser) return;
    updateUser({
      ...editingUser,
      role,
      customPermissions: undefined,
    });
    setEditingUser(null);
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]);
  };

  const isAdmin = currentUser.role === 'Admin';

  if (!isAdmin) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <ShieldAlert size={28} className="text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-amber-900 dark:text-amber-300 mb-1">Admin Access Required</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">Only administrators can manage user access and permissions. Please contact your system administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit">
        {[
          { id: 'users' as const, label: 'User Permissions', icon: <Users size={14} /> },
          { id: 'roles' as const, label: 'Role Templates', icon: <Shield size={14} /> },
          { id: 'matrix' as const, label: 'Access Matrix', icon: <ShieldCheck size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* USER PERMISSIONS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-72">
              <Search size={16} className="text-slate-400 mr-2" />
              <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 dark:text-slate-300" />
            </div>
            <p className="text-xs text-slate-500">{filtered.length} of {users.length} users</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Permissions</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse Access</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Last Login</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => {
                    const perms = getEffectivePermissions(user);
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <tr key={user.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isCurrent ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                {user.name}
                                {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">YOU</span>}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-700'}`}>{user.role}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <Shield size={12} className="text-blue-500" />
                            <span className="text-slate-900 dark:text-white">{perms.length}</span>
                            <span className="text-slate-400">/ {PERMISSION_GROUPS.flatMap(g => g.permissions).length}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!user.warehouseAccess || user.warehouseAccess.length === 0 ? (
                            <span className="text-xs text-emerald-600 font-medium">All Warehouses</span>
                          ) : (
                            <span className="text-xs text-violet-600 font-medium">{user.warehouseAccess.length} restricted</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">{user.lastLogin}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleUserActive(user.id)}
                            disabled={isCurrent}
                            className={`relative w-10 h-5 rounded-full transition-colors ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isCurrent ? 'Cannot disable yourself' : user.isActive ? 'Click to disable' : 'Click to enable'}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${user.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => switchUser(user)}
                              disabled={!user.isActive}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 disabled:opacity-30"
                              title="Login as this user (preview their access)"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600"
                              title="Edit permissions"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROLE TEMPLATES TAB */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
            <ShieldCheck size={18} className="text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <p className="font-semibold mb-0.5">Built-in Role Templates</p>
              <p>These are predefined permission sets for each role. Click on a role to view its included permissions. Custom user permissions take precedence over role templates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(ROLE_PERMISSIONS) as Role[]).filter(r => r !== 'Custom').map(role => {
              const perms = ROLE_PERMISSIONS[role];
              const userCount = users.filter(u => u.role === role).length;
              const totalPerms = PERMISSION_GROUPS.flatMap(g => g.permissions).length;
              const percentage = (perms.length / totalPerms) * 100;
              return (
                <button
                  key={role}
                  onClick={() => setPreviewRole(role)}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role]}`}>{role}</span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">{userCount} active user{userCount !== 1 ? 's' : ''}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Shield size={18} className="text-slate-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Permissions</span>
                      <span className="font-bold text-slate-900 dark:text-white">{perms.length} / {totalPerms}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full ${percentage === 100 ? 'bg-red-500' : percentage >= 70 ? 'bg-blue-500' : percentage >= 40 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3 font-medium">Click to view permissions →</p>
                </button>
              );
            })}
          </div>

          {previewRole && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setPreviewRole(null)}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[previewRole]}`}>{previewRole}</span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-2">Permissions for {previewRole}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{ROLE_PERMISSIONS[previewRole].length} permissions assigned by default</p>
                  </div>
                  <button onClick={() => setPreviewRole(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-3">
                  {PERMISSION_GROUPS.map(group => {
                    const groupPerms = group.permissions.filter(p => ROLE_PERMISSIONS[previewRole].includes(p.id));
                    if (groupPerms.length === 0) return null;
                    return (
                      <div key={group.module} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{group.label}</span>
                          <span className="text-xs text-slate-500">{groupPerms.length} of {group.permissions.length}</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {group.permissions.map(p => {
                            const has = ROLE_PERMISSIONS[previewRole].includes(p.id);
                            return (
                              <div key={p.id} className={`flex items-center gap-2 p-1.5 rounded ${has ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                                {has ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={14} className="text-slate-300 flex-shrink-0" />}
                                <span className="text-xs flex-1">{p.label}</span>
                                <span className="text-[10px] text-slate-400 hidden md:inline">{p.description}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACCESS MATRIX TAB */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3 flex items-start gap-2">
            <ShieldCheck size={18} className="text-violet-600 mt-0.5" />
            <div className="text-xs text-violet-700 dark:text-violet-400">
              <p className="font-semibold mb-0.5">Permission Matrix</p>
              <p>Quick overview of which roles have access to each module. Green ✓ = has access, Red ✗ = no access.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-700/50">Module / Permission</th>
                    {(Object.keys(ROLE_PERMISSIONS) as Role[]).filter(r => r !== 'Custom').map(role => (
                      <th key={role} className="text-center py-3 px-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[100px]">
                        <span className={`block px-1.5 py-0.5 rounded-full text-[10px] ${ROLE_COLORS[role]}`}>{role}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_GROUPS.map(group => (
                    <>
                      <tr key={`group-${group.module}`} className="bg-slate-100/50 dark:bg-slate-700/30">
                        <td colSpan={(Object.keys(ROLE_PERMISSIONS) as Role[]).filter(r => r !== 'Custom').length + 1} className="py-2 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          {group.label}
                        </td>
                      </tr>
                      {group.permissions.map(p => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="py-2 px-4 text-xs text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800">
                            <p className="font-medium">{p.label}</p>
                            <p className="text-[10px] text-slate-500">{p.description}</p>
                          </td>
                          {(Object.keys(ROLE_PERMISSIONS) as Role[]).filter(r => r !== 'Custom').map(role => {
                            const has = ROLE_PERMISSIONS[role].includes(p.id);
                            return (
                              <td key={role} className="py-2 px-3 text-center">
                                {has ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <XCircle size={16} className="text-slate-300 mx-auto" />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setEditingUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                    {editingUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingUser.name}</h3>
                    <p className="text-xs text-slate-500">{editingUser.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[editingUser.role] || 'bg-slate-100'}`}>{editingUser.role}</span>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} className="text-slate-500" /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Quick Role Apply */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Apply Role Template (overwrites current)</h4>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ROLE_PERMISSIONS) as Role[]).filter(r => r !== 'Custom').map(role => (
                    <button
                      key={role}
                      onClick={() => handleApplyRolePreset(role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${ROLE_COLORS[role]} hover:scale-105 transition-transform border-current/30`}
                    >
                      {role} ({ROLE_PERMISSIONS[role].length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Warehouse Access */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                  <Building2 size={14} /> Warehouse Access Restriction
                </h4>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-3">Select warehouses this user can access. Leave all selected for full access.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {warehouses.map(wh => (
                      <label key={wh.id} className="flex items-center gap-2 p-2 rounded hover:bg-white dark:hover:bg-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editWarehouseAccess.length === 0 || editWarehouseAccess.includes(wh.id)}
                          onChange={() => {
                            if (editWarehouseAccess.length === 0) {
                              // Currently "all" - switch to selecting all then toggle off this one
                              setEditWarehouseAccess(warehouses.filter(w => w.id !== wh.id).map(w => w.id));
                            } else {
                              handleToggleWarehouse(wh.id);
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">{wh.name}</span>
                        <span className="text-[10px] text-slate-400">({wh.location})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Permission Groups */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Shield size={14} /> Module Permissions</span>
                  <span className="text-blue-600 normal-case font-semibold">{editPermissions.length} selected</span>
                </h4>
                <div className="space-y-2">
                  {PERMISSION_GROUPS.map(group => {
                    const groupPerms = group.permissions.map(p => p.id);
                    const allChecked = groupPerms.every(p => editPermissions.includes(p));
                    const someChecked = groupPerms.some(p => editPermissions.includes(p));
                    const isExpanded = expandedGroups.includes(group.module);
                    return (
                      <div key={group.module} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30">
                          <button onClick={() => toggleGroupExpanded(group.module)} className="flex items-center gap-2 flex-1 text-left">
                            {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{group.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold">
                              {group.permissions.filter(p => editPermissions.includes(p.id)).length}/{group.permissions.length}
                            </span>
                          </button>
                          <button
                            onClick={() => handleToggleGroup(group.module, groupPerms)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                              allChecked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                              someChecked ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {allChecked ? <><Unlock size={10} /> ALL</> : someChecked ? <><Shield size={10} /> PARTIAL</> : <><Lock size={10} /> NONE</>}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="p-3 space-y-2 animate-fade-in">
                            {group.permissions.map(p => {
                              const checked = editPermissions.includes(p.id);
                              return (
                                <label key={p.id} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleTogglePermission(p.id)}
                                    className="mt-0.5 rounded text-blue-600"
                                  />
                                  <div className="flex-1">
                                    <p className={`text-xs font-medium ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{p.label}</p>
                                    <p className="text-[10px] text-slate-400">{p.description}</p>
                                  </div>
                                  <code className="text-[9px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{p.id}</code>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between sticky bottom-0 bg-white dark:bg-slate-800">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-blue-600">{editPermissions.length}</span> permissions selected
              </div>
              <div className="flex items-center gap-2">
                {editingUser.role !== 'Admin' && editingUser.customPermissions && (
                  <button onClick={() => handleResetToRole(editingUser.role === 'Custom' ? 'Inventory Manager' : (editingUser.role as Role))} className="px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg font-medium">
                    Reset to Role Default
                  </button>
                )}
                <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                <button onClick={handleSavePermissions} className="flex items-center gap-1.5 px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow">
                  <Save size={14} /> Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
