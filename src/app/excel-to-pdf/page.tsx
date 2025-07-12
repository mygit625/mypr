"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Table2, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ExcelToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handleFileSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  const handleConvert = () => {
    if (files.length === 0) {
      toast({
        title: "No file selected",
        description: "Please upload an Excel file to convert.",
        variant: "destructive",
      });
      return;
    }
    
    // Placeholder for conversion logic
    setIsConverting(true);
    toast({
      title: "Feature In Progress",
      description: "Native Excel to PDF conversion is not yet implemented.",
    });
    setTimeout(() => setIsConverting(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Table2 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Excel to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your Excel spreadsheets to PDF documents seamlessly.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Excel File</CardTitle>
          <CardDescription>Select the .xlsx or .xls file you want to convert to PDF.</CardDescription>
        </CardHeader>
        <CardContent>
           <FileUploadZone 
                onFilesSelected={handleFileSelected} 
                multiple={false} 
                accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            />
        </CardContent>
        <CardFooter>
            <Button onClick={handleConvert} disabled={isConverting || files.length === 0} className="w-full" size="lg">
                 {isConverting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                    </>
                 ) : (
                    <>
                        <FileText className="mr-2 h-4 w-4" />
                        Convert to PDF
                    </>
                 )}
            </Button>
        </CardFooter>
      </Card>
      
      <Alert variant="default">
        <AlertTitle>Feature Coming Soon</AlertTitle>
        <AlertDescription>
          The native conversion for Excel to PDF is under construction. The UI is ready, but the backend logic will be implemented shortly.
        </AlertDescription>
      </Alert>

    </div>
  );
}
