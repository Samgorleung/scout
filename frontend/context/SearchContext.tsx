import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface SearchContextType {
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  clearSearch: () => void;
  searchMatchCount: number | null;
  setSearchMatchCount: (count: number | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [searchMatchCount, setSearchMatchCount] = useState<number | null>(null);

  // Sync from router query param ?q= on initial load
  useEffect(() => {
    if (router.isReady && typeof router.query.q === 'string') {
      setGlobalSearchQuery(router.query.q);
    }
  }, [router.isReady, router.query.q]);

  const clearSearch = () => {
    setGlobalSearchQuery('');
    setSearchMatchCount(null);
  };

  return (
    <SearchContext.Provider
      value={{
        globalSearchQuery,
        setGlobalSearchQuery,
        clearSearch,
        searchMatchCount,
        setSearchMatchCount
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export default SearchContext;
