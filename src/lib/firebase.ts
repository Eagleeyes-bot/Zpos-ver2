import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// --- MOCK SYSTEM FOR LOCALSTORAGE ---
// This allows the app to "really work" without a real Firebase project provisioned.

export const IS_MOCK = firebaseConfig.projectId === 'remixed-project-id' || !firebaseConfig.apiKey;

class MockAuth {
  currentUser: any = null;
  private listeners: ((user: any) => void)[] = [];

  constructor() {
    const saved = localStorage.getItem('mock_auth_user');
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }

    // Pre-populate approved users in mock mode if not already present
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const adminEmail = 'admin@eagleeyes.com';
    const adminIndex = users.findIndex((u: any) => u.email === adminEmail);
    
    const adminData = { 
      uid: 'admin-1', 
      email: adminEmail, 
      password: '8888',
      displayName: 'System Admin',
      lastLogin: new Date().toISOString()
    };

    if (adminIndex === -1) {
      users.push(adminData);
      localStorage.setItem('mock_users', JSON.stringify(users));
    } else {
      // Ensure the password is updated if it was different
      if (users[adminIndex].password !== adminData.password) {
        users[adminIndex].password = adminData.password;
        localStorage.setItem('mock_users', JSON.stringify(users));
      }
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithEmailAndPassword(auth: any, email: string, pass: string) {
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const index = users.findIndex((u: any) => u.email === email && u.password === pass);
    if (index === -1) throw new Error('Invalid username or password');
    
    const user = { ...users[index], lastLogin: new Date().toISOString() };
    users[index] = user;
    
    localStorage.setItem('mock_users', JSON.stringify(users));
    this.currentUser = user;
    localStorage.setItem('mock_auth_user', JSON.stringify(user));
    this.listeners.forEach(l => l(user));
  }

  async createUserWithEmailAndPassword(auth: any, email: string, pass: string) {
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    if (users.find((u: any) => u.email === email)) throw new Error('Username already exists');
    
    const newUser = { 
      uid: Math.random().toString(36).substr(2, 9), 
      email, 
      password: pass,
      lastLogin: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('mock_users', JSON.stringify(users));
    this.currentUser = newUser;
    localStorage.setItem('mock_auth_user', JSON.stringify(newUser));
    this.listeners.forEach(l => l(newUser));
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('mock_auth_user');
    this.listeners.forEach(l => l(null));
  }

  async updatePassword(auth: any, newPass: string) {
    if (!this.currentUser) throw new Error('Not authenticated');
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const index = users.findIndex((u: any) => u.email === this.currentUser.email);
    if (index === -1) throw new Error('User not found');
    users[index].password = newPass;
    localStorage.setItem('mock_users', JSON.stringify(users));
    this.currentUser = users[index];
    localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
  }

  setMockUser(user: any) {
    this.currentUser = user;
    localStorage.setItem('mock_auth_user', JSON.stringify(user));
    this.listeners.forEach(l => l(user));
  }

  getUsers() {
    return JSON.parse(localStorage.getItem('mock_users') || '[]');
  }

  deleteUser(email: string) {
    let users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const user = users.find((u: any) => u.email === email);
    if (!user) return;

    users = users.filter((u: any) => u.email !== email);
    localStorage.setItem('mock_users', JSON.stringify(users));
    
    // Clear user data
    mockFirestore.resetUserData(user.uid);

    // If deleted user is current user, log them out
    if (this.currentUser?.email === email) {
      this.signOut();
    }
  }

  resetUserData(userId: string) {
    mockFirestore.resetUserData(userId);
  }
}

function processData(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(processData);
  
  const newObj: any = {};
  for (const key in obj) {
    let val = obj[key];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      const date = new Date(val);
      val = { 
        toDate: () => date, 
        toMillis: () => date.getTime(), 
        _isTimestamp: true,
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1e6
      };
    } else if (val instanceof Date) {
      val = { 
        toDate: () => val, 
        toMillis: () => val.getTime(), 
        _isTimestamp: true,
        seconds: Math.floor(val.getTime() / 1000),
        nanoseconds: (val.getTime() % 1000) * 1e6
      };
    } else if (typeof val === 'object' && val !== null && !val._isTimestamp) {
      val = processData(val);
    }
    newObj[key] = val;
  }
  return newObj;
}

function serializeData(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(serializeData);
  if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (obj instanceof Date) return obj.toISOString();
  
  const newObj: any = {};
  for (const key in obj) {
    newObj[key] = serializeData(obj[key]);
  }
  return newObj;
}

class MockFirestore {
  constructor() {
    this.addDoc = this.addDoc.bind(this);
    this.setDoc = this.setDoc.bind(this);
    this.updateDoc = this.updateDoc.bind(this);
    this.deleteDoc = this.deleteDoc.bind(this);
    this.onSnapshot = this.onSnapshot.bind(this);
    this.resetUserData = this.resetUserData.bind(this);
    this.getUserDataUsage = this.getUserDataUsage.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.notify = this.notify.bind(this);
  }

  private getCollection(path: string) {
    return JSON.parse(localStorage.getItem(`mock_db_${path}`) || '[]');
  }

  private setCollection(path: string, data: any[]) {
    localStorage.setItem(`mock_db_${path}`, JSON.stringify(data));
  }

  collection(_db: any, path: string) {
    return { path };
  }

  doc(_db: any, path: string, id: string) {
    return { path: `${path}/${id}`, id };
  }

  async addDoc(colRef: any, data: any) {
    const col = this.getCollection(colRef.path);
    const newDoc = { ...serializeData(data), id: Math.random().toString(36).substr(2, 9) };
    col.push(newDoc);
    this.setCollection(colRef.path, col);
    this.notify(colRef.path);
    return newDoc;
  }

  async setDoc(docRef: any, data: any) {
    const [path] = docRef.path.split('/');
    const col = this.getCollection(path);
    const index = col.findIndex((d: any) => d.id === docRef.id);
    const serialized = serializeData(data);
    if (index > -1) col[index] = { ...serialized, id: docRef.id };
    else col.push({ ...serialized, id: docRef.id });
    this.setCollection(path, col);
    this.notify(path);
  }

  async updateDoc(docRef: any, data: any) {
    const [path] = docRef.path.split('/');
    const col = this.getCollection(path);
    const index = col.findIndex((d: any) => d.id === docRef.id);
    if (index > -1) {
      const currentDoc = col[index];
      const nextDoc = { ...currentDoc };
      
      for (const key in data) {
        const val = data[key];
        if (val && typeof val === 'object' && val.type === 'arrayUnion') {
          const currentArray = Array.isArray(nextDoc[key]) ? nextDoc[key] : [];
          const newElements = Array.isArray(val.elements) ? val.elements : [];
          nextDoc[key] = [...currentArray, ...serializeData(newElements)];
        } else {
          nextDoc[key] = serializeData(val);
        }
      }
      
      col[index] = nextDoc;
      this.setCollection(path, col);
      this.notify(path);
    }
  }

  async deleteDoc(docRef: any) {
    const [path] = docRef.path.split('/');
    const col = this.getCollection(path);
    const filtered = col.filter((d: any) => d.id !== docRef.id);
    this.setCollection(path, filtered);
    this.notify(path);
  }

  onSnapshot(query: any, callback: (snap: any) => void) {
    const path = query.path || query.colRef?.path;
    const handler = () => {
      let data = this.getCollection(path);
      if (query.constraints) {
        query.constraints.forEach((c: any) => {
          if (c.type === 'where') {
            switch (c.op) {
              case '==': data = data.filter((d: any) => d[c.field] === c.value); break;
              case '!=': data = data.filter((d: any) => d[c.field] !== c.value); break;
              case '<': data = data.filter((d: any) => d[c.field] < c.value); break;
              case '<=': data = data.filter((d: any) => d[c.field] <= c.value); break;
              case '>': data = data.filter((d: any) => d[c.field] > c.value); break;
              case '>=': data = data.filter((d: any) => d[c.field] >= c.value); break;
              case 'array-contains': data = data.filter((d: any) => Array.isArray(d[c.field]) && d[c.field].includes(c.value)); break;
            }
          }
        });
      }
      callback({
        docs: data.map((d: any) => ({
          id: d.id,
          data: () => processData(d),
        })),
        forEach: function(cb: any) {
          data.forEach((d: any) => {
            cb({
              id: d.id,
              data: () => processData(d),
            });
          });
        },
        empty: data.length === 0,
        size: data.length
      });
    };
    
    this.subscribe(path, handler);
    handler();
    return () => this.unsubscribe(path, handler);
  }

  query(colRef: any, ...constraints: any[]) {
    return { path: colRef.path, constraints };
  }

  where(field: string, op: string, value: any) {
    return { type: 'where', field, op, value };
  }

  writeBatch() {
    const ops: (() => Promise<void>)[] = [];
    return {
      set: (docRef: any, data: any) => {
        ops.push(() => this.setDoc(docRef, data));
      },
      update: (docRef: any, data: any) => {
        ops.push(() => this.updateDoc(docRef, data));
      },
      delete: (docRef: any) => {
        ops.push(() => this.deleteDoc(docRef));
      },
      commit: async () => {
        for (const op of ops) {
          await op();
        }
      }
    };
  }

  resetUserData(userId: string) {
    const collections = ['customers', 'sales', 'devices', 'installments', 'suppliers', 'stores', 'inventory', 'messages'];
    collections.forEach(path => {
      const data = JSON.parse(localStorage.getItem(`mock_db_${path}`) || '[]');
      const filtered = data.filter((d: any) => d.userId !== userId);
      localStorage.setItem(`mock_db_${path}`, JSON.stringify(filtered));
      this.notify(path);
    });
  }

  getUserDataUsage(userId: string) {
    const collections = ['customers', 'sales', 'devices', 'installments', 'suppliers', 'stores', 'inventory'];
    let totalBytes = 0;
    collections.forEach(path => {
      const data = JSON.parse(localStorage.getItem(`mock_db_${path}`) || '[]');
      const userDocs = data.filter((d: any) => d.userId === userId);
      // More realistic size calculation
      totalBytes += new Blob([JSON.stringify(userDocs)]).size;
    });
    
    // Return in MB for display
    return (totalBytes / (1024 * 1024)).toFixed(2);
  }

  sendMessage(userId: string, from: string, message: string) {
    const messages = JSON.parse(localStorage.getItem('mock_db_messages') || '[]');
    messages.push({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      from,
      message,
      timestamp: new Date().toISOString(),
      read: false
    });
    localStorage.setItem('mock_db_messages', JSON.stringify(messages));
    this.notify('messages');
  }

  private subscribers: Record<string, (() => void)[]> = {};
  private subscribe(path: string, cb: () => void) {
    if (!this.subscribers[path]) this.subscribers[path] = [];
    this.subscribers[path].push(cb);
  }
  private unsubscribe(path: string, cb: () => void) {
    if (this.subscribers[path]) {
      this.subscribers[path] = this.subscribers[path].filter(s => s !== cb);
    }
  }
  private notify(path: string) {
    if (this.subscribers[path]) {
      this.subscribers[path].forEach(cb => cb());
    }
  }
}

const mockAuth = new MockAuth();
const mockFirestore = new MockFirestore();

// --- EXPORTS ---

export type { User } from 'firebase/auth';

let realApp, realDb, realAuth;
if (!IS_MOCK) {
  realApp = initializeApp(firebaseConfig);
  realDb = getFirestore(realApp, firebaseConfig.firestoreDatabaseId);
  realAuth = getAuth(realApp);
}

// Real Firebase Helpers for Reset/Usage
const realGetUserDataUsage = async (userId: string) => {
  const collections = ['customers', 'sales', 'devices', 'installments', 'suppliers', 'stores', 'inventory'];
  let totalDocs = 0;
  for (const path of collections) {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    totalDocs += snap.size;
  }
  return (totalDocs * 0.05).toFixed(2); // Estimate MB based on docs
};

const realResetUserData = async (userId: string) => {
  const collections = ['customers', 'sales', 'devices', 'installments', 'suppliers', 'stores', 'inventory', 'messages'];
  for (const path of collections) {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    // Note: This is simplified. In a real app, use writeBatch for efficiency.
    for (const d of snap.docs) {
      await deleteDoc(doc(db, path, d.id));
    }
  }
};

const realGetUsers = async () => {
  const q = query(collection(db, 'users'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
};

const realSendMessage = async (userId: string, from: string, message: string) => {
  await addDoc(collection(db, 'messages'), {
    userId,
    from,
    message,
    timestamp: new Date().toISOString(),
    read: false
  });
};

export const db = IS_MOCK ? (mockFirestore as any) : realDb;
export const auth = IS_MOCK ? (mockAuth as any) : realAuth;

// Add methods to the objects if they are missing
if (!IS_MOCK) {
  (auth as any).getUsers = realGetUsers;
  (auth as any).deleteUser = async (email: string) => { console.log('Delete user requested for', email); };
  (auth as any).resetUserData = realResetUserData;
  (db as any).getUserDataUsage = realGetUserDataUsage;
  (db as any).sendMessage = realSendMessage;
}

// Re-export common functions to handle mock vs real
export const signInWithEmailAndPassword = IS_MOCK 
  ? ((_a: any, e: string, p: string) => mockAuth.signInWithEmailAndPassword(null, e, p))
  : (await import('firebase/auth')).signInWithEmailAndPassword;

export const createUserWithEmailAndPassword = IS_MOCK 
  ? ((_a: any, e: string, p: string) => mockAuth.createUserWithEmailAndPassword(null, e, p))
  : (await import('firebase/auth')).createUserWithEmailAndPassword;

export const onAuthStateChanged = IS_MOCK
  ? ((_a: any, cb: any) => mockAuth.onAuthStateChanged(cb))
  : (await import('firebase/auth')).onAuthStateChanged;

export const signOut = IS_MOCK
  ? ((_a: any) => mockAuth.signOut())
  : (await import('firebase/auth')).signOut;

export const updatePassword = IS_MOCK
  ? ((_a: any, p: string) => mockAuth.updatePassword(null, p))
  : (await import('firebase/auth')).updatePassword;

export const GoogleAuthProvider = IS_MOCK ? class {
  static credentialFromResult(result: any) {
    return result.credential;
  }
  addScope() {}
} as any : (await import('firebase/auth')).GoogleAuthProvider;

export const signInWithPopup = IS_MOCK ? (async (auth: any) => {
  // Simulate a bit of delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const result = {
    credential: { accessToken: 'mock_google_drive_token_' + Math.random().toString(36).substring(7) },
    user: {
      uid: 'google-mock-user-123',
      email: 'eagleeye.tokyo@gmail.com',
      displayName: 'ZPOS Admin (Mock)',
      emailVerified: true
    }
  };

  // If this is for login (e.g. called via Login page)
  if (auth && (auth as any).onAuthStateChanged) {
    // In mock mode, we manually trigger the Auth status change
    const userWithLogin = { ...result.user, lastLogin: new Date().toISOString() };
    
    // Update the stored user list with lastLogin
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email === result.user.email);
    if (userIndex > -1) {
      users[userIndex].lastLogin = userWithLogin.lastLogin;
      localStorage.setItem('mock_users', JSON.stringify(users));
    } else {
      // Add a new user if it doesn't exist
      users.push({ ...userWithLogin, password: 'password' });
      localStorage.setItem('mock_users', JSON.stringify(users));
    }

    mockAuth.setMockUser(userWithLogin);
  }

  return result;
}) : (await import('firebase/auth')).signInWithPopup;

// Firestore exports
export const collection = IS_MOCK ? mockFirestore.collection.bind(mockFirestore) : (await import('firebase/firestore')).collection;
export const doc = IS_MOCK ? mockFirestore.doc.bind(mockFirestore) : (await import('firebase/firestore')).doc;
export const addDoc = IS_MOCK ? mockFirestore.addDoc.bind(mockFirestore) : (await import('firebase/firestore')).addDoc;
export const setDoc = IS_MOCK ? mockFirestore.setDoc.bind(mockFirestore) : (await import('firebase/firestore')).setDoc;
export const updateDoc = IS_MOCK ? mockFirestore.updateDoc.bind(mockFirestore) : (await import('firebase/firestore')).updateDoc;
export const deleteDoc = IS_MOCK ? mockFirestore.deleteDoc.bind(mockFirestore) : (await import('firebase/firestore')).deleteDoc;
export const onSnapshot = IS_MOCK ? mockFirestore.onSnapshot.bind(mockFirestore) : (await import('firebase/firestore')).onSnapshot;
export const query = IS_MOCK ? mockFirestore.query.bind(mockFirestore) : (await import('firebase/firestore')).query;
export const where = IS_MOCK ? mockFirestore.where.bind(mockFirestore) : (await import('firebase/firestore')).where;
export const getDocs = IS_MOCK ? (async (q: any) => {
  let result: any = { docs: [] };
  mockFirestore.onSnapshot(q, (snap) => { result = snap; })(); // immediate call
  return result;
}) : (await import('firebase/firestore')).getDocs;

export const writeBatch = IS_MOCK ? mockFirestore.writeBatch.bind(mockFirestore) : (await import('firebase/firestore')).writeBatch;

export const limit = IS_MOCK ? ((n: number) => ({ type: 'limit', value: n })) as any : (await import('firebase/firestore')).limit;
export const orderBy = IS_MOCK ? ((f: string, d: string) => ({ type: 'orderBy', field: f, dir: d })) as any : (await import('firebase/firestore')).orderBy;

export const arrayUnion = IS_MOCK ? ((...elements: any[]) => ({ type: 'arrayUnion', elements })) as any : (await import('firebase/firestore')).arrayUnion;

export const Timestamp = {
  now: () => {
    const date = new Date();
    return { 
      toDate: () => date, 
      toMillis: () => date.getTime(), 
      _isTimestamp: true,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: (date.getTime() % 1000) * 1e6
    };
  },
  fromDate: (date: Date) => ({ 
    toDate: () => date, 
    toMillis: () => date.getTime(), 
    _isTimestamp: true,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6
  }),
};

export const serverTimestamp = () => new Date().toISOString();

export const getBranchTitle = () => 'ZPOS Terminal';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, _operationType: OperationType, _path: string | null) {
  console.error('Database Error: ', error);
  throw error;
}
