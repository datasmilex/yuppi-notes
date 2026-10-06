'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NoteUser } from '../types/note';

interface UserContextType {
  currentUser: NoteUser;
  updateUser: (name: string, avatar: string, color: string) => void;
  onlineCount: number;
  setOnlineCount: (count: number) => void;
}

const DEFAULT_USER: NoteUser = {
  id: 'user-default',
  name: 'Yunus',
  avatar: '👑',
  color: '#F59E0B',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<NoteUser>(DEFAULT_USER);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('yuppi_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      } else {
        const randomId = 'user-' + Math.random().toString(36).substring(2, 9);
        const newUser = { ...DEFAULT_USER, id: randomId };
        setCurrentUser(newUser);
        localStorage.setItem('yuppi_user', JSON.stringify(newUser));
      }
    } catch {
      // ignore
    }
  }, []);

  const updateUser = (name: string, avatar: string, color: string) => {
    const updated = {
      ...currentUser,
      name: name.trim() || 'Gizli Yazar',
      avatar: avatar || '🐱',
      color: color || '#F59E0B',
    };
    setCurrentUser(updated);
    try {
      localStorage.setItem('yuppi_user', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, updateUser, onlineCount, setOnlineCount }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
