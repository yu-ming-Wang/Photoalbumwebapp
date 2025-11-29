import type React from 'react';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for people, objects, actions, landmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="pl-10 h-12"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          className="h-12 px-6"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
