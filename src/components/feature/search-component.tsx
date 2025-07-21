
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { allTools, type Tool } from '@/lib/all-tools';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export function SearchComponent() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    setOpen(query.length > 1 && filteredTools.length > 0);
  }, [query, filteredTools.length]);

  const handleSelect = (href: string) => {
    router.push(href);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
             <Input
                ref={inputRef}
                type="search"
                placeholder="Search for a tool (e.g., Merge PDF, Compress Image...)"
                className="w-full pl-10 h-12 text-base"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (query.length > 1 && filteredTools.length > 0) {
                    setOpen(true);
                  }
                }}
              />
          </div>
      </PopoverAnchor>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            {filteredTools.length === 0 && query.length > 1 ? (
                 <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredTools.map((tool) => (
                  <CommandItem
                    key={tool.href}
                    value={tool.title}
                    onSelect={() => handleSelect(tool.href)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                        <tool.Icon className="h-4 w-4 text-muted-foreground"/>
                        <span>{tool.title}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
