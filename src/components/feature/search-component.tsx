
"use client";

import { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { allTools } from '@/lib/all-tools';
import { getToolIcon } from '@/components/icons/tool-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchComponent() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const filteredTools = useMemo(() => {
    if (!query) return [];
    const lowerCaseQuery = query.toLowerCase();
    return allTools
      .filter(tool =>
        tool.title.toLowerCase().includes(lowerCaseQuery) ||
        tool.description.toLowerCase().includes(lowerCaseQuery) ||
        tool.category.toLowerCase().includes(lowerCaseQuery)
      );
  }, [query]);

  const showSuggestions = isFocused && query.length > 1 && filteredTools.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = () => {
    setQuery('');
    setIsFocused(false);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div ref={searchContainerRef} className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center w-full">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            name="q"
            type="search"
            placeholder="Search for a tool (e.g., Merge PDF, Compress Image...)"
            className="w-full pl-12 pr-28 h-14 text-base rounded-full shadow-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            autoComplete="off"
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 rounded-full px-6"
          >
            Search
          </Button>
        </div>
      </form>

      {showSuggestions && (
        <div 
          className="absolute z-10 top-full mt-2 w-full bg-card border rounded-lg shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ul className="py-2 max-h-80 overflow-y-auto">
            {filteredTools.slice(0, 7).map((tool) => {
              const Icon = getToolIcon(tool.Icon as any);
              return (
                <li key={tool.title}>
                  <Link
                    href={tool.href}
                    onClick={handleSuggestionClick}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-card-foreground hover:bg-accent rounded-md transition-colors"
                  >
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground"/>}
                    <span>{tool.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
