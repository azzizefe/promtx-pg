import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface FullTextSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const FullTextSearch: React.FC<FullTextSearchProps> = ({ onSearch, placeholder = 'Search...' }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '8px', padding: '5px 10px', width: '100%', maxWidth: '400px' }}>
      <Search size={18} color="#666" style={{ marginRight: '8px' }} />
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{ border: 'none', background: 'transparent', flex: 1, padding: '8px 0', outline: 'none' }}
      />
      <button type="submit" style={{ display: 'none' }}>Search</button>
    </form>
  );
};
