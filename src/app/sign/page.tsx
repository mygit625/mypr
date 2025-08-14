
"use client";

import { useState, useEffect, useRef } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PenTool, Upload, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, User, Signature, Pencil, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readFileAsDataURL } from '@/lib/file-utils';
import { useToast } from '@/hooks/use-toast';
import PdfPagePreview from '@/components/feature/pdf-page-preview';

interface PageInfo {
  pageIndex: number;
}

const signatureFonts = [
  "font-cursive",
  "font-dancing-script",
  "font-pacifico",
  "font-caveat"
];

const signatureColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#e53935' },
  { name: 'Blue', value: '#1e88e5' },
  { name: 'Green', value: '#43a047' },
];

export default function SignPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const { toast } = useToast();

  const [fullName, setFullName] = useState('Test Signature');
  const [initials, setInitials] = useState('TS');
  const [selectedSignatureStyle, setSelectedSignatureStyle] = useState(signatureFonts[0]);
  const [selectedColor, setSelectedColor] = useState(signatureColors[0].value);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setIsLoadingPdf(true);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
        // Mock loading pages
        setTimeout(() => {
          setPages([{ pageIndex: 0 }, { pageIndex: 1 }]);
          setIsLoadingPdf(false);
        }, 1000);
      } catch (e: any) {
        toast({ title: "File Error", description: e.message, variant: "destructive" });
        setIsLoadingPdf(false);
      }
    }
  };
  
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFullName(name);
    const nameParts = name.trim().split(' ');
    const newInitials = nameParts.map(part => part[0] || '').join('').toUpperCase();
    setInitials(newInitials);
  };

  return (
    <div className="max-w-full mx-auto space-y-8">
      {!file && (
        <>
          <header className="text-center py-8">
            <PenTool className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold tracking-tight">Sign PDF</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Sign yourself or request electronic signatures from others. Secure and easy.
            </p>
          </header>
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Upload PDF to Sign</CardTitle>
              <CardDescription>Select or drag the PDF file you want to sign.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
          </Card>
        </>
      )}

      {isLoadingPdf && (
         <div className="flex justify-center items-center h-[calc(100vh-200px)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
         </div>
      )}

      {file && pdfDataUri && !isLoadingPdf && (
         <Dialog open={true}>
            <div className="flex h-[calc(100vh-120px)] bg-muted/30 -m-4">
                {/* Left Sidebar: Page Thumbnails */}
                <aside className="w-64 bg-background border-r p-2">
                    <ScrollArea className="h-full">
                        <div className="space-y-2">
                        {pages.map((page) => (
                            <div
                            key={page.pageIndex}
                            onClick={() => setCurrentPage(page.pageIndex)}
                            className={cn(
                                "cursor-pointer border-2 rounded-md overflow-hidden",
                                currentPage === page.pageIndex ? "border-primary" : "border-transparent"
                            )}
                            >
                            <PdfPagePreview pdfDataUri={pdfDataUri} pageIndex={page.pageIndex} targetHeight={150} />
                             <p className="text-center text-xs text-muted-foreground bg-card py-0.5">{page.pageIndex + 1}</p>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                </aside>
                
                {/* Main Content: PDF Viewer */}
                <main className="flex-1 flex flex-col">
                    <header className="flex-shrink-0 h-14 bg-background border-b flex items-center justify-between px-4">
                       <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft/></Button>
                           <Input type="number" value={currentPage + 1} readOnly className="w-16 text-center" />
                           <span className="text-muted-foreground">/ {pages.length}</span>
                           <Button variant="ghost" size="icon" disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight/></Button>
                       </div>
                       <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon"><ZoomOut/></Button>
                           <span className="text-sm font-medium">100%</span>
                           <Button variant="ghost" size="icon"><ZoomIn/></Button>
                       </div>
                    </header>
                    <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
                         <PdfPagePreview pdfDataUri={pdfDataUri} pageIndex={currentPage} targetHeight={800} className="shadow-lg" />
                    </div>
                </main>

                {/* Right Sidebar: Signing Options */}
                <aside className="w-80 bg-background border-l p-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Signing options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Button variant="outline" className="w-full h-20 text-lg">Simple Signature</Button>
                             <Button variant="outline" className="w-full h-20 text-lg" disabled>Digital Signature</Button>
                        </CardContent>
                        <CardFooter>
                            <Button size="lg" className="w-full">Sign</Button>
                        </CardFooter>
                    </Card>
                </aside>
                
                {/* Signature Dialog */}
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Set your signature details</DialogTitle>
                            <Button variant="outline" size="sm">Login</Button>
                        </div>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div className="space-y-1">
                            <Label htmlFor="full-name">Full name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="full-name" value={fullName} onChange={handleFullNameChange} className="pl-10" />
                            </div>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="initials">Initials</Label>
                            <Input id="initials" value={initials} readOnly />
                        </div>
                    </div>
                    <Tabs defaultValue="signature">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="signature"><Pencil className="mr-2 h-4 w-4"/>Signature</TabsTrigger>
                            <TabsTrigger value="initials"><Signature className="mr-2 h-4 w-4"/>Initials</TabsTrigger>
                            <TabsTrigger value="company-stamp"><Building className="mr-2 h-4 w-4"/>Company Stamp</TabsTrigger>
                        </TabsList>
                        <TabsContent value="signature" className="p-4">
                             <RadioGroup value={selectedSignatureStyle} onValueChange={setSelectedSignatureStyle} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    {signatureFonts.map((fontClass) => (
                                        <Label key={fontClass} htmlFor={fontClass} className="flex items-center space-x-3 p-2 border rounded-md cursor-pointer hover:bg-accent/50 has-[:checked]:bg-accent/80 has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                            <RadioGroupItem value={fontClass} id={fontClass} />
                                            <span className={cn("text-2xl w-full", fontClass)} style={{ color: selectedColor }}>
                                                {fullName || "Your Name"}
                                            </span>
                                        </Label>
                                    ))}
                                </div>
                            </RadioGroup>
                            <div className="mt-6">
                                <Label className="mb-2 block text-sm font-medium">Color</Label>
                                <div className="flex items-center gap-4">
                                    {signatureColors.map(color => (
                                        <button 
                                            key={color.name}
                                            onClick={() => setSelectedColor(color.value)}
                                            className={cn(
                                                "h-8 w-8 rounded-full border-2 transition-transform transform hover:scale-110",
                                                selectedColor === color.value ? "border-primary scale-110 ring-2 ring-primary ring-offset-2" : "border-muted"
                                            )}
                                            style={{ backgroundColor: color.value }}
                                            aria-label={`Select ${color.name} color`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                         <TabsContent value="initials" className="p-4 text-center text-muted-foreground">Initials signing options will be here.</TabsContent>
                         <TabsContent value="company-stamp" className="p-4 text-center text-muted-foreground">Company stamp options will be here.</TabsContent>
                    </Tabs>
                    <div className="flex justify-end">
                        <Button size="lg" className="bg-red-600 hover:bg-red-700">Apply</Button>
                    </div>
                </DialogContent>
            </div>
         </Dialog>
      )}
    </div>
  );
}
