import React, { createContext, useContext, useState, useEffect } from 'react';

interface ShopContextType {
  selectedBranch: string | 'all';
  setSelectedBranch: (branch: string | 'all') => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<string | 'all'>(() => {
    return localStorage.getItem('selectedBranch') || 'all';
  });

  const setSelectedBranch = (branch: string | 'all') => {
    setSelectedBranchState(branch);
    localStorage.setItem('selectedBranch', branch);
  };

  return (
    <ShopContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
