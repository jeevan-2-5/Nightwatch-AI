import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User;
  role: UserRole;
  setRole: (role: UserRole) => void;
  usersList: User[];
  setUserByEmail: (email: string) => void;
}

const mockUsers: User[] = [
  {
    id: 'usr-1',
    name: 'Alex Vance (Lead SRE)',
    email: 'alex.vance@nightwatch.internal',
    role: 'Admin',
  },
  {
    id: 'usr-2',
    name: 'Elena Rostova (Incident Responder)',
    email: 'elena.rostova@nightwatch.internal',
    role: 'Engineer',
  },
  {
    id: 'usr-3',
    name: 'Devin Cole (Security Auditor)',
    email: 'devin.cole@nightwatch.internal',
    role: 'Viewer',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(mockUsers[1]); // Default to Engineer

  const setRole = (role: UserRole) => {
    const matched = mockUsers.find((u) => u.role === role);
    if (matched) {
      setUser(matched);
    } else {
      setUser((prev) => ({ ...prev, role }));
    }
  };

  const setUserByEmail = (email: string) => {
    const matched = mockUsers.find((u) => u.email === email);
    if (matched) setUser(matched);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        setRole,
        usersList: mockUsers,
        setUserByEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
