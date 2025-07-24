
"use client";

import { useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { allTools } from '@/lib/all-tools';
import { FeatureCard } from '@/components/feature/feature-card';
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
        <h1 className="text-3xl font-bold tracking-tight">
          Search Results for &quot;{query}&quot;
        </h1>
        <p className="text-muted-foreground mt-2">
          Found {filteredTools.length} matching tool{filteredTools.length !== 1 ? 's' : ''}.
        </p>
      </header>

      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredTools.map((tool) => (
            <FeatureCard
              key={tool.title}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              Icon={tool.Icon}
              iconColor={tool.iconColor}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <SearchX className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">No Tools Found</h2>
          <p className="text-muted-foreground mt-2">
            We couldn&apos;t find any tools matching your search. Try a different term.
          </p>
        </div>
      )}
    </div>
  );
}

// Wrap the component in Suspense to handle the case where searchParams are not immediately available.
export default function SearchPage() {
    return (
        <Suspense fallback={<div>Loading search results...</div>}>
            <SearchResults />
        </Suspense>
    )
}
