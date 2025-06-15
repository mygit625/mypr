
"use client";

// Polyfill for Promise.withResolvers
// Required by pdfjs-dist v4.0.379+ if the environment doesn't support it.
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { getInitialPageDataAction, type PageData, addTextToPdfAction } from './actions';
import { Edit3, Loader2, Info, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const PREVIEW_TARGET_HEIGHT_EDIT = 200;

const addTextSchema = z.object({
  text: z.string().min(1, "Text cannot be empty."),
  pageNumber: z.coerce.number().min(1, "Page number must be at least 1."),
  x: z.coerce.number(),
  y: z.coerce.number(),
  fontSize: z.coerce.number().min(1, "Font size must be at least 1.").max(200, "Font size too large."),
});

type AddTextFormValues = z.infer<typeof addTextSchema>;

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AddTextFormValues>({
    resolver: zodResolver(addTextSchema),
    defaultValues: {
      text: "Hello, PDF!",
      pageNumber: 1,
      x: 50,
      y: 50,
      fontSize: 12,
    },
  });

  useEffect(() => {
    if (totalPages > 0) {
      form.setValue('pageNumber', Math.min(form.getValues('pageNumber'), totalPages));
    }
  }, [totalPages, form]);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setError(null);
      setPages([]);
      setPdfDataUri(null);
      setTotalPages(0);
      setIsLoadingPdf(true);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          setError(result.error);
          toast({ title: "Error loading PDF", description: result.error, variant: "destructive" });
          setFile(null);
          setPdfDataUri(null);
        } else if (result.pages) {
          setPages(result.pages);
          setTotalPages(result.pages.length);
          if (result.pages.length > 0) {
            form.setValue('pageNumber', 1); // Reset to page 1 for new PDF
          }
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process file.");
        toast({ title: "File Error", description: e.message, variant: "destructive" });
        setFile(null);
        setPdfDataUri(null);
      } finally {
        setIsLoadingPdf(false);
      }
    } else {
      setFile(null);
      setPdfDataUri(null);
      setPages([]);
      setTotalPages(0);
    }
  };

  const onSubmit: SubmitHandler<AddTextFormValues> = async (data) => {
    if (!pdfDataUri || !file) {
      toast({ title: "No PDF loaded", description: "Please upload a PDF file first.", variant: "destructive" });
      return;
    }
    if (data.pageNumber > totalPages) {
        form.setError("pageNumber", { type: "manual", message: `Page number cannot exceed total pages (${totalPages}).`});
        return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const result = await addTextToPdfAction({
        pdfDataUri,
        text: data.text,
        pageNumber: data.pageNumber,
        x: data.x,
        y: data.y,
        fontSize: data.fontSize,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Edit Error", description: result.error, variant: "destructive" });
      } else if (result.processedPdfDataUri) {
        downloadDataUri(result.processedPdfDataUri, `edited_${file.name}`);
        toast({ title: "Edit Successful!", description: "Text added to your PDF. Download has started." });
        // Optionally reset file and form here
        // setFile(null); setPdfDataUri(null); setPages([]); setTotalPages(0); form.reset();
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage);
      toast({ title: "Edit Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Edit3 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Edit PDF</h1>
        <p className="text-muted-foreground mt-2">
          Add text to your PDF documents. More editing features coming soon!
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow lg:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Select the PDF file you want to edit.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
          </Card>

          {isLoadingPdf && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading PDF pages...</p>
            </div>
          )}

          {pdfDataUri && pages.length > 0 && !isLoadingPdf && (
            <Card>
              <CardHeader>
                <CardTitle>Page Previews ({totalPages} Pages)</CardTitle>
                <CardDescription>Visual representation of your PDF. Text will be added based on coordinates.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] border rounded-md p-2 bg-muted/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-3">
                    {pages.map((page) => (
                      <div key={`preview-${page.originalIndex}-${page.id}`} className="flex flex-col items-center p-2 border rounded-md bg-card shadow-sm">
                        <PdfPagePreview
                            pdfDataUri={pdfDataUri}
                            pageIndex={page.originalIndex}
                            rotation={page.rotation || 0}
                            targetHeight={PREVIEW_TARGET_HEIGHT_EDIT}
                            className="my-1"
                        />
                        <span className="text-xs mt-2 text-muted-foreground">Page {page.originalIndex + 1}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-20 self-start">
          {pdfDataUri && totalPages > 0 && !isLoadingPdf && (
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-semibold">Add Text to PDF</CardTitle>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Text to Add</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter text here..." {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pageNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Number (1 to {totalPages})</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max={totalPages} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="x"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>X Position</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="y"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Y Position</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <FormDescription className="text-xs">
                        X and Y coordinates are from the bottom-left corner of the page.
                     </FormDescription>
                    <FormField
                      control={form.control}
                      name="fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Size</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="mt-2 border-t pt-4">
                    <Button
                      type="submit"
                      disabled={isProcessing || isLoadingPdf}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Add Text & Download
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}
          {!pdfDataUri && !isLoadingPdf && (
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Upload a PDF</AlertTitle>
                <AlertDescription>
                  Please upload a PDF file to enable editing options.
                </AlertDescription>
              </Alert>
          )}
        </div>
      </div>

      {error && !isProcessing && (
        <Alert variant="destructive" className="mt-6 max-w-xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
