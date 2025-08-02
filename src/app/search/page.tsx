
"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { allTools } from '@/lib/all-tools';
import { FeatureCard } from '@/components/feature/feature-card';
import { getToolIcon } from '@/components/icons/tool-icons';
import { SearchX } from 'lucide-react';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const filteredTools = useMemo(() => {
    if (!query) return [];
    const lowerCaseQuery = query.toLowerCase();
    return allTools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(lowerCaseQuery) ||
        tool.description.toLowerCase().includes(lowerCaseQuery) ||
        tool.category.toLowerCase().includes(lowerCaseQuery)
    );
  }, [query]);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        {query ? (
          <p className="text-muted-foreground mt-2">
            Showing results for: <span className="font-semibold text-foreground">{query}</span>
          </p>
        ) : (
          <p className="text-muted-foreground mt-2">Please enter a search term.</p>
        )}
      </header>

      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {filteredTools.map((tool) => {
            const Icon = getToolIcon(tool.Icon as any);
            return (
              <FeatureCard
                key={tool.title}
                title={tool.title}
                description={tool.description}
                href={tool.href}
                Icon={Icon}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <SearchX className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">No Tools Found</h2>
          <p className="text-muted-foreground mt-2">
            We couldn't find any tools matching your search. Try a different term.
          </p>
        </div>
      )}
    </div>
  );
}


export default function SearchPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchResults />
        </Suspense>
    )
}
