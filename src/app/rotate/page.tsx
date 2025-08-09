
"use client";

import { useState, useRef, ChangeEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { RotateCcw, RotateCw, Loader2, Info, Plus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { rotateAllPagesAction } from '@/app/rotate/actions';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SelectedPdfFileItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
  numPages: number;
  rotation: number;
  processedUri?: string | null;
}

const PREVIEW_TARGET_HEIGHT_ROTATE = 220;

export default function RotatePdfPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfFileItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]): Promise<SelectedPdfFileItem[]> => {
    setIsLoadingPreviews(true);
    const newFileItems: SelectedPdfFileItem[] = [];

    for (const file of files) {
      try {
        const dataUri = await readFileAsDataURL(file);
        const base64Marker = ';base64,';
        const base64Index = dataUri.indexOf(base64Marker);
        if (base64Index === -1) throw new Error('Invalid PDF data URI format.');
        const pdfBase64Data = dataUri.substring(base64Index + base64Marker.length);
        const pdfBinaryData = atob(pdfBase64Data);
        const pdfDataArray = new Uint8Array(pdfBinaryData.length);
        for (let i = 0; i < pdfBinaryData.length; i++) {
          pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
        }

        const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument({ data: pdfDataArray }).promise;
        
        newFileItems.push({
          id: crypto.randomUUID(),
          file: file,
          dataUri: dataUri,
          name: file.name,
          numPages: pdfDoc.numPages,
          rotation: 0, 
        });
      } catch (e: any) {
        toast({ title: "File Process Error", description: `Could not process file: ${file.name}. ${e.message}`, variant: "destructive" });
      }
    }
    setIsLoadingPreviews(false);
    return newFileItems;
  };

  const handleFilesSelected = async (newFilesFromInput: File[]) => {
    if (newFilesFromInput.length === 0) return;
    const processedNewFileItems = await processFiles(newFilesFromInput);
    setSelectedPdfItems(prev => [...prev, ...processedNewFileItems]);
  };

  const handleRemoveFile = (idToRemove: string) => {
    setSelectedPdfItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
  };
  
  const handleRotateFile = (fileId: string, direction: 'cw' | 'ccw') => {
    setSelectedPdfItems(prevItems =>
      prevItems.map(item => {
        if (item.id === fileId) {
          const newRotation = (item.rotation + (direction === 'cw' ? 90 : -90) + 360) % 360;
          return { ...item, rotation: newRotation };
        }
        return item;
      })
    );
  };

  const handleApplyRotation = async (item: SelectedPdfFileItem) => {
    if (item.rotation === 0) {
      toast({ description: "No rotation to apply." });
      return;
    }

    setIsProcessingId(item.id);
    setError(null);
    
    try {
      const result = await rotateAllPagesAction({ 
        pdfDataUri: item.processedUri || item.dataUri, 
        rotation: item.rotation 
      });
      if (result.error) throw new Error(result.error);
      
      setSelectedPdfItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, processedUri: result.processedPdfDataUri, rotation: 0 } : i
      ));
    } catch (e: any) {
      toast({ title: `Error rotating ${item.name}`, description: e.message, variant: "destructive" });
    } finally {
      setIsProcessingId(null);
    }
  };
  
  const handleDownload = (item: SelectedPdfFileItem) => {
    const uri = item.processedUri || item.dataUri;
    downloadDataUri(uri, `rotated_${item.name}`);
  }

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <RotateCcw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Rotate PDF Files</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDFs, apply rotations, and download the modified files.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select or drag PDF files to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFilesSelected} multiple={true} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

      {isLoadingPreviews && selectedPdfItems.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Processing PDF files...</p>
        </div>
      )}

      {selectedPdfItems.length > 0 && (
        <>
        <div className="flex justify-center">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle>Rotate Files</CardTitle>
                    <CardDescription>Apply rotations to each file individually, then download.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] p-2 border rounded-md">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedPdfItems.map((fileItem) => (
                                <Card key={fileItem.id} className="flex flex-col items-center p-3 shadow-sm">
                                    <div className="relative w-full mb-2">
                                        <div className="flex justify-center items-center w-full h-auto border rounded" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_ROTATE + 20}px`}}>
                                        <PdfPagePreview
                                            pdfDataUri={fileItem.processedUri || fileItem.dataUri}
                                            pageIndex={0}
                                            rotation={0}
                                            targetHeight={PREVIEW_TARGET_HEIGHT_ROTATE}
                                            className="bg-white"
                                        />
                                        </div>
                                    </div>
                                    <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={fileItem.name}>
                                        {fileItem.name}
                                    </p>
                                    <div className="flex justify-center space-x-2 my-2">
                                        <Button size="sm" variant="outline" onClick={() => handleRotateFile(fileItem.id, 'ccw')}><RotateCcw className="h-4 w-4 mr-1"/> Left</Button>
                                        <Button size="sm" variant="outline" onClick={() => handleRotateFile(fileItem.id, 'cw')}><RotateCw className="h-4 w-4 mr-1"/> Right</Button>
                                    </div>
                                    <p className="text-sm font-bold text-primary h-5">{fileItem.rotation !== 0 ? `${fileItem.rotation}°` : ''}</p>
                                    <div className="w-full mt-2 space-y-2">
                                      <Button size="sm" className="w-full" onClick={() => handleApplyRotation(fileItem)} disabled={isProcessingId !== null || fileItem.rotation === 0}>
                                        {isProcessingId === fileItem.id ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply Rotation"}
                                      </Button>
                                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" onClick={() => handleDownload(fileItem)}>
                                          <Download className="h-4 w-4 mr-2"/> Download
                                      </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-2">
                    <Button onClick={() => setSelectedPdfItems([])} variant="destructive" className="w-full">
                        Clear All
                    </Button>
                </CardFooter>
            </Card>
        </div>
        </>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6 max-w-xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
