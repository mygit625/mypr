
"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Minimize2, Loader2, Info, ArrowDownToLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { compressPdfAction } from './actions';
import { Progress } from '@/components/ui/progress';

interface CompressionResultStats {
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResultStats | null>(null);
  const [compressedPdfUri, setCompressedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    } else {
      setFile(null);
    }
    setCompressionStats(null);
    setCompressedPdfUri(null);
    setError(null);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes < 0) bytes = 0; // Ensure bytes is not negative
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to compress.",
        variant: "destructive",
      });
      return;
    }

    setIsCompressing(true);
    setCompressionStats(null);
    setCompressedPdfUri(null);
    setError(null);

    try {
      const pdfDataUri = await readFileAsDataURL(file);
      const result = await compressPdfAction({ pdfDataUri });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Compression Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.compressedPdfDataUri && result.originalSize !== undefined && result.compressedSize !== undefined) {
        const reduction = result.originalSize > 0 ? ((result.originalSize - result.compressedSize) / result.originalSize) * 100 : 0;
        setCompressionStats({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            reductionPercentage: parseFloat(reduction.toFixed(2))
        });
        setCompressedPdfUri(result.compressedPdfDataUri);
        downloadDataUri(result.compressedPdfDataUri, `compressed_${file.name}`);
        toast({
          title: "Compression Successful!",
          description: `Your PDF has been compressed. Download has started.`,
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during compression.";
      setError(errorMessage);
      toast({
        title: "Compression Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRedownload = () => {
    if (compressedPdfUri && file) {
        downloadDataUri(compressedPdfUri, `compressed_${file.name}`);
        toast({ description: "Download started again." });
    } else {
        toast({ description: "No compressed file available to download. Please process a file first.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <Minimize2 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Compress PDF File</h1>
        <p className="text-muted-foreground mt-2">
          Reduce the file size of your PDF while maintaining quality. Upload your file below.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Select or drag and drop the PDF file you want to compress.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button
            onClick={handleCompress}
            disabled={!file || isCompressing}
            className="w-full"
            size="lg"
          >
            {isCompressing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compressing...
              </>
            ) : (
              <>
                <Minimize2 className="mr-2 h-4 w-4" />
                Compress PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {compressionStats && compressedPdfUri && !error && (
        <div className="mt-4 space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-700">Compression Complete!</AlertTitle>
                <AlertDescription className="text-green-600">
                    Your PDF has been successfully compressed and download has started.
                    Original: {formatBytes(compressionStats.originalSize)}, Compressed: {formatBytes(compressionStats.compressedSize)} ({compressionStats.reductionPercentage}% reduction).
                </AlertDescription>
            </Alert>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Compression Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Original Size:</span>
                            <span>{formatBytes(compressionStats.originalSize)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Compressed Size:</span>
                            <span>{formatBytes(compressionStats.compressedSize)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-primary mb-2">
                            <span>Reduction:</span>
                            <span>{compressionStats.reductionPercentage}%</span>
                        </div>
                        <Progress value={compressionStats.reductionPercentage} className="h-3" aria-label={`${compressionStats.reductionPercentage}% reduction`} />
                    </div>
                    <Button
                        onClick={handleRedownload}
                        variant="outline"
                        className="w-full mt-2"
                        disabled={!compressedPdfUri || !file || isCompressing}
                    >
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Download Compressed PDF Again
                    </Button>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground text-center w-full">
                        Note: Compression effectiveness varies. For already optimized or primarily text-based PDFs, reduction may be minimal.
                    </p>
                </CardFooter>
            </Card>
        </div>
      )}
    </div>
  );
}
