
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Pencil, 
  Signature, 
  Building, 
  Type, 
  Upload, 
  File,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Custom DrawIcon as it's not in lucide-react
const DrawIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.44 2.9 8.19 6.84 9.49" />
    <path d="M20.35 6.65A9.94 9.94 0 0 0 12 2" />
    <path d="M12 12H2" />
    <path d="M12 22v-3" />
    <path d="M17 3.5v3" />
    <path d="M20.5 8.5h-3" />
  </svg>
);

const signatureStyles = [
  { id: 'style1', font: 'font-dancing-script', size: 'text-3xl' },
  { id: 'style2', font: 'font-pacifico', size: 'text-2xl' },
  { id: 'style3', font: 'font-caveat', size: 'text-3xl' },
  { id: 'style4', font: 'font-cursive', size: 'text-2xl' },
];

const colorOptions = [
  { id: 'black', value: '#000000', ringColor: 'ring-blue-500' },
  { id: 'red', value: '#e53935', ringColor: 'ring-red-500' },
  { id: 'blue', value: '#1e88e5', ringColor: 'ring-blue-500' },
  { id: 'green', value: '#43a047', ringColor: 'ring-green-500' },
];

export default function SignPdfPage() {
  const [fullName, setFullName] = useState('Test Signature');
  const [initials, setInitials] = useState('TS');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedSignatureStyle, setSelectedSignatureStyle] = useState('style1');
  
  // This state will be used later to control dialog visibility
  const [showSignatureDialog, setShowSignatureDialog] = useState(true);

  return (
    <div className="flex h-[calc(100vh-12rem)] w-full bg-muted/20">
      {/* Left Sidebar: Thumbnails */}
      <aside className="w-64 bg-card p-4 border-r hidden md:block">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-40 h-52 bg-white shadow-md border flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Page {i}</p>
                </div>
                <span className="text-sm mt-1">{i}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content: PDF Viewer */}
      <main className="flex-1 flex flex-col">
        <div className="bg-card border-b p-2 flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5"/></Button>
            <div className="flex items-center gap-1">
                <Input defaultValue="1" className="w-12 h-8 text-center" />
                <span className="text-muted-foreground text-sm">/ 2</span>
            </div>
            <Button variant="ghost" size="icon"><ChevronRight className="h-5 w-5"/></Button>
            <div className="h-6 border-l mx-2"></div>
            <Button variant="ghost" size="icon"><ZoomOut className="h-5 w-5"/></Button>
            <Button variant="ghost" size="icon"><ZoomIn className="h-5 w-5"/></Button>
        </div>
        <div className="flex-1 p-4 overflow-auto flex justify-center">
          <div className="w-[800px] h-[1100px] bg-white shadow-lg border flex items-center justify-center">
            <p className="text-muted-foreground">PDF Document View</p>
          </div>
        </div>
      </main>

      {/* Right Sidebar: Signing Options */}
      <aside className="w-80 bg-card p-6 border-l hidden lg:block">
        <h2 className="text-xl font-semibold mb-4">Signing options</h2>
        <div className="space-y-4">
            <Card className="text-center p-4 cursor-pointer border-primary ring-2 ring-primary">
                <CardContent className="p-0">
                    <Signature className="h-8 w-8 text-primary mx-auto mb-2"/>
                    <p className="font-semibold text-primary">Simple Signature</p>
                </CardContent>
            </Card>
             <Card className="text-center p-4 cursor-pointer hover:border-primary/50">
                <CardContent className="p-0">
                    <p className="text-xs text-yellow-500 font-bold absolute top-2 right-2">PRO</p>
                    <Signature className="h-8 w-8 text-muted-foreground mx-auto mb-2"/>
                    <p className="font-semibold text-muted-foreground">Digital Signature</p>
                </CardContent>
            </Card>
        </div>
        <div className="mt-8 space-y-2">
            <p className="text-sm font-medium">Required fields</p>
            <Button variant="outline" className="w-full justify-start"><Signature className="mr-2 h-4 w-4"/> Signature</Button>
        </div>
        <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Optional fields</p>
            <Button variant="outline" className="w-full justify-start">AC Initials</Button>
            <Button variant="outline" className="w-full justify-start"><User className="mr-2 h-4 w-4"/> Name</Button>
        </div>
        <div className="absolute bottom-6 right-6 w-72">
            <Button size="lg" className="w-full h-12 text-lg">Sign</Button>
        </div>
      </aside>

      {/* Signature Dialog */}
      {showSignatureDialog && (
          <div className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center">
              <Card className="w-full max-w-2xl shadow-2xl z-50">
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle className="text-2xl">Set your signature details</CardTitle>
                      </div>
                      <Button variant="outline">Login</Button>
                  </CardHeader>
                  <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-1 relative">
                              <Label htmlFor="full-name">Full name</Label>
                              <User className="absolute left-3 top-8 h-5 w-5 text-muted-foreground" />
                              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10"/>
                          </div>
                          <div className="space-y-1">
                              <Label htmlFor="initials">Initials</Label>
                              <Input id="initials" value={initials} onChange={(e) => setInitials(e.target.value)} />
                          </div>
                      </div>

                      <Tabs defaultValue="signature" className="w-full">
                          <TabsList variant="underline" className="grid w-full grid-cols-3">
                              <TabsTrigger value="signature" className="tabs-trigger-underline"><Pencil className="mr-2 h-4 w-4"/>Signature</TabsTrigger>
                              <TabsTrigger value="initials" className="tabs-trigger-underline"><Signature className="mr-2 h-4 w-4"/>Initials</TabsTrigger>
                              <TabsTrigger value="company_stamp" className="tabs-trigger-underline"><Building className="mr-2 h-4 w-4"/>Company Stamp</TabsTrigger>
                          </TabsList>
                          <TabsContent value="signature" className="mt-4">
                              <div className="flex">
                                  <Tabs defaultValue="text" orientation="vertical" className="w-32 border-r mr-4">
                                      <TabsList className="grid grid-cols-1 h-auto p-0 bg-transparent">
                                          <TabsTrigger value="text" className="tabs-trigger-underline justify-start h-12"><Type className="mr-2 h-5 w-5"/> Text</TabsTrigger>
                                          <TabsTrigger value="draw" className="tabs-trigger-underline justify-start h-12"><DrawIcon className="mr-2 h-5 w-5"/> Draw</TabsTrigger>
                                          <TabsTrigger value="upload" className="tabs-trigger-underline justify-start h-12"><Upload className="mr-2 h-5 w-5"/> Upload</TabsTrigger>
                                      </TabsList>
                                  </Tabs>
                                  <div className="flex-1">
                                      <RadioGroup value={selectedSignatureStyle} onValueChange={setSelectedSignatureStyle} className="grid grid-cols-2 gap-4">
                                          {signatureStyles.map(style => (
                                              <div key={style.id} className="flex items-center">
                                                  <RadioGroupItem value={style.id} id={style.id} />
                                                  <Label htmlFor={style.id} className="ml-2 w-full cursor-pointer">
                                                      <div className={`py-2 px-3 border rounded-md ${selectedSignatureStyle === style.id ? 'border-primary' : ''}`}>
                                                          <p className={`${style.font} ${style.size}`} style={{ color: selectedColor }}>
                                                              {fullName || 'Your Name'}
                                                          </p>
                                                      </div>
                                                  </Label>
                                              </div>
                                          ))}
                                      </RadioGroup>
                                      <div className="mt-6 flex items-center gap-4">
                                          <Label>Color:</Label>
                                          <div className="flex items-center gap-2">
                                              {colorOptions.map(color => (
                                                  <button
                                                      key={color.id}
                                                      onClick={() => setSelectedColor(color.value)}
                                                      className={`w-6 h-6 rounded-full transition-all ${selectedColor === color.value ? `ring-2 ${color.ringColor} ring-offset-2` : ''}`}
                                                      style={{ backgroundColor: color.value }}
                                                      aria-label={`Select ${color.id} color`}
                                                  />
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </TabsContent>
                          <TabsContent value="initials">
                               <p className="text-center text-muted-foreground p-8">Initials content goes here.</p>
                          </TabsContent>
                           <TabsContent value="company_stamp">
                               <p className="text-center text-muted-foreground p-8">Company Stamp content goes here.</p>
                          </TabsContent>
                      </Tabs>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                      <Button size="lg" className="h-12 px-8 text-base">Apply</Button>
                  </CardFooter>
              </Card>
          </div>
      )}
    </div>
  );
}
