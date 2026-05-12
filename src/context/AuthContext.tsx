import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import type { Permission, Role } from '../types/permissions';
import { ROLE_PERMISSIONS } from '../types/permissions';

interface AuthContextType {
  currentUser: User;
  switchUser: (user: User) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  getEffectivePermissions: (user: User) => Permission[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAdmin: User = {
  id: 'U001',
  name: 'Admin User',
  email: 'admin@ddias.com',
  role: 'Admin',
  isActive: true,
  lastLogin: new Date().toISOString().substring(0, 16).replace('T', ' '),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(defaultAdmin);

  const getEffectivePermissions = (user: User): Permission[] => {
    if (user.customPermissions && user.customPermissions.length > 0) {
      return user.customPermissions as Permission[];
    }
    return ROLE_PERMISSIONS[user.role as Role] || [];
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser.isActive) return false;
    const perms = getEffectivePermissions(currentUser);
    return perms.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const switchUser = (user: User) => {
    setCurrentUser({ ...user, lastLogin: new Date().toISOString().substring(0, 16).replace('T', ' ') });
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchUser, hasPermission, hasAnyPermission, getEffectivePermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
