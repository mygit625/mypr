
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calculator, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { recalculateCountsAction } from '@/app/smart-url-shortener/actions';

export default function RecalculateCountsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const handleRecalculate = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await recalculateCountsAction();
            if (response.success) {
                setResult({ message: `Successfully updated click counts for ${response.updatedCount} link(s).`, type: 'success' });
            } else {
                setResult({ message: `An error occurred: ${response.error || 'Unknown error'}`, type: 'error' });
            }
        } catch (e: any) {
            setResult({ message: `A client-side error occurred: ${e.message}`, type: 'error' });
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Recalculate Click Counts</h1>
                <p className="text-muted-foreground mt-2">
                    Manually update the click counts for all short links based on the recorded click data.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Manual Count Update</CardTitle>
                    <CardDescription>
                        This tool iterates through all created short links, counts the number of individual click records for each one, and updates the 'clickCount' field. Use this if you notice a discrepancy or if real-time counting fails.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleRecalculate} disabled={isLoading} className="w-full" size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recalculating...
                            </>
                        ) : (
                             <>
                                <Calculator className="mr-2 h-4 w-4" />
                                Start Recalculation
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Alert variant={result.type === 'error' ? 'destructive' : 'default'} className={result.type === 'success' ? 'border-green-500' : ''}>
                    {result.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{result.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                    <AlertDescription>
                        {result.message}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
