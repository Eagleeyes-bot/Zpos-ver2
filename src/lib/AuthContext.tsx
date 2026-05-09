import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from './firebase';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithEmail: (username: string, pass: string) => Promise<void>;
  registerWithEmail: (username: string, pass: string) => Promise<void>;
  updateUserPassword: (newPass: string) => Promise<void>;
  getAllUsers: () => any[];
  deleteUserAccount: (email: string) => Promise<void>;
  resetUserData: (userId: string) => Promise<void>;
  getUserUsage: (userId: string) => string;
  sendMessageToUser: (userId: string, message: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = async (username: string, pass: string) => {
    const email = username.includes('@') ? username : `${username}@eagleeyes.com`;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (username: string, pass: string) => {
    const email = username.includes('@') ? username : `${username}@eagleeyes.com`;
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const updateUserPassword = async (newPass: string) => {
    // Only works if a real user is signed in
    if (!auth.currentUser) throw new Error('No user is currently signed in.');
    const { updatePassword } = await import('./firebase');
    await updatePassword(auth.currentUser, newPass);
  };

  const getAllUsers = () => {
    const { getUsers } = (auth as any);
    return getUsers ? getUsers() : [];
  };

  const deleteUserAccount = async (email: string) => {
    if ((auth as any).deleteUser) {
      (auth as any).deleteUser(email);
    }
  };

  const resetUserData = async (userId: string) => {
    if ((auth as any).resetUserData) {
      (auth as any).resetUserData(userId);
    }
  };

  const getUserUsage = (userId: string) => {
    if ((db as any).getUserDataUsage) {
      return (db as any).getUserDataUsage(userId);
    }
    return '0.00';
  };

  const sendMessageToUser = async (userId: string, message: string) => {
    if ((db as any).sendMessage && user) {
      (db as any).sendMessage(userId, user.email, message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = user?.email === 'eagleeye.tokyo@gmail.com' || 
                  user?.email === 'admin@eagleeyes.com';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, loginWithEmail, registerWithEmail, updateUserPassword, getAllUsers, deleteUserAccount, resetUserData, getUserUsage, sendMessageToUser, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
