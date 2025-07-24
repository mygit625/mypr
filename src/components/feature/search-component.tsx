"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { allTools } from '@/lib/all-tools';
import { getToolIcon } from '@/components/icons/tool-icons';
import { Input } from '@/components/ui/input';

export function SearchComponent() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const filteredTools = useMemo(() => {
    if (!query || query.length < 2) return [];
    const lowerCaseQuery = query.toLowerCase();
    return allTools
      .filter(tool =>
        tool.title.toLowerCase().includes(lowerCaseQuery) ||
        tool.description.toLowerCase().includes(lowerCaseQuery) ||
        tool.category.toLowerCase().includes(lowerCaseQuery)
      )
      .slice(0, 10); // Limit to 10 results
  }, [query]);

  const showSuggestions = isFocused && filteredTools.length > 0;

  const handleSelect = (href: string) => {
    router.push(href);
    setQuery('');
    setIsFocused(false);
  };

  // Handle clicks outside the search component to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={searchContainerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search for a tool (e.g., Merge PDF, Compress Image...)"
        className="w-full pl-10 h-12 text-base"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        autoComplete="off"
      />
      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-card border rounded-md shadow-lg z-50">
          <ul className="py-1">
            {filteredTools.length > 0 ? (
              filteredTools.map((tool) => {
                const Icon = getToolIcon(tool.Icon);
                return (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-card-foreground hover:bg-accent rounded-md transition-colors"
                      onClick={() => handleSelect(tool.href)}
                      onMouseDown={(e) => e.preventDefault()} // Prevents input blur before navigation
                    >
                      {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <span>{tool.title}</span>
                    </Link>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No results found.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}