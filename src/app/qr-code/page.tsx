
"use client";

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  QrCode, Link as LinkIcon, Type, Mail, MessageSquare, Wifi, Download, Palette,
  Contact2, CalendarPlus, MapPin, Phone
} from 'lucide-react';
import { downloadDataUri } from '@/lib/download-utils';
import { useToast } from '@/hooks/use-toast';

type QrType = 'url' | 'text' | 'email' | 'sms' | 'wifi' | 'vcard' | 'event' | 'location' | 'phone';

export default function QrCodeGeneratorPage() {
  const [qrType, setQrType] = useState<QrType>('url');
  
  // This state tracks the raw input values
  const [qrValue, setQrValue] = useState('https://toolsinn.com');
  // This state tracks the value that is actually rendered in the QR code preview
  const [generatedQrValue, setGeneratedQrValue] = useState('https://toolsinn.com');

  // Input states for each type
  const [url, setUrl] = useState('https://toolsinn.com');
  const [text, setText] = useState('Hello, world!');
  const [email, setEmail] = useState({ to: '', subject: '', body: '' });
  const [sms, setSms] = useState({ phone: '', message: '' });
  const [wifi, setWifi] = useState({ ssid: '', password: '', encryption: 'WPA' });
  const [vCard, setVCard] = useState({ name: '', phone: '', email: '', company: '', title: '', website: '' });
  const [event, setEvent] = useState({ title: '', start: '', end: '', location: '', description: '' });
  const [location, setLocation] = useState({ latitude: '', longitude: '' });
  const [phoneNumber, setPhoneNumber] = useState('');


  // Customization states
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(256);
  const [level, setLevel] = useState('L'); // L, M, Q, H

  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let newValue = '';
    switch (qrType) {
      case 'url':
        newValue = url;
        break;
      case 'text':
        newValue = text;
        break;
      case 'email':
        newValue = `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
        break;
      case 'sms':
        newValue = `smsto:${sms.phone}:${encodeURIComponent(sms.message)}`;
        break;
      case 'wifi':
        newValue = `WIFI:T:${wifi.encryption};S:${wifi.ssid};P:${wifi.password};;`;
        break;
      case 'vcard':
        newValue = `BEGIN:VCARD\nVERSION:3.0\nFN:${vCard.name}\nORG:${vCard.company}\nTITLE:${vCard.title}\nTEL;TYPE=WORK,VOICE:${vCard.phone}\nEMAIL:${vCard.email}\nURL:${vCard.website}\nEND:VCARD`;
        break;
      case 'event':
        const formatDateTime = (dt: string) => dt.replace(/[-:]/g, "") + "00";
        newValue = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${event.title}\nDTSTART:${formatDateTime(event.start)}\nDTEND:${formatDateTime(event.end)}\nLOCATION:${event.location}\nDESCRIPTION:${event.description}\nEND:VEVENT\nEND:VCALENDAR`;
        break;
      case 'location':
        newValue = `geo:${location.latitude},${location.longitude}`;
        break;
      case 'phone':
        newValue = `tel:${phoneNumber}`;
        break;
      default:
        newValue = 'https://toolsinn.com';
    }
    setQrValue(newValue || ' '); // Use a space if empty to prevent library errors
  }, [qrType, url, text, email, sms, wifi, vCard, event, location, phoneNumber]);

  const handleGenerate = () => {
    if (!qrValue.trim() || qrValue === ' ') {
      toast({ title: 'Input is empty', description: 'Please enter content for the QR code.', variant: 'destructive' });
      return;
    }
    setGeneratedQrValue(qrValue);
    toast({ title: 'QR Code Generated!', description: 'Your QR code has been updated in the preview.' });
  };
  
  const handleDownload = (format: 'png' | 'svg') => {
    if (!generatedQrValue.trim() || generatedQrValue === ' ') {
      toast({ title: 'Nothing to download', description: 'Please generate a QR code first.', variant: 'destructive' });
      return;
    }
    if (format === 'svg') {
      const svgElement = document.getElementById('qr-code-svg');
      if (svgElement) {
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);
        if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
          source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
          source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
        downloadDataUri(dataUri, 'qrcode.svg');
        toast({ title: 'SVG Downloaded', description: 'Your QR code has been saved as an SVG.' });
      }
    } else { // PNG
      const canvas = document.querySelector('#qr-code-canvas canvas') as HTMLCanvasElement;
      if (canvas) {
        const dataUri = canvas.toDataURL('image/png');
        downloadDataUri(dataUri, 'qrcode.png');
        toast({ title: 'PNG Downloaded', description: 'Your QR code has been saved as a PNG.' });
      }
    }
  };

  const qrTabs = [
    { type: 'url', icon: LinkIcon, label: 'URL' },
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'email', icon: Mail, label: 'Email' },
    { type: 'phone', icon: Phone, label: 'Phone' },
    { type: 'sms', icon: MessageSquare, label: 'SMS' },
    { type: 'wifi', icon: Wifi, label: 'WiFi' },
    { type: 'vcard', icon: Contact2, label: 'vCard' },
    { type: 'event', icon: CalendarPlus, label: 'Event' },
    { type: 'location', icon: MapPin, label: 'Location' },
  ];

  return (
    <div className="space-y-12">
      <header className="text-center py-8">
        <QrCode className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">QR Code Generator</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Create custom QR codes for websites, text, WiFi, and more. Free, fast, and easy to use.
        </p>
      </header>

      <Card className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left/Main Column: Options */}
          <div className="lg:col-span-2 p-6 space-y-6">
            <Tabs value={qrType} onValueChange={(val) => setQrType(val as QrType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
                {qrTabs.map(tab => (
                  <TabsTrigger key={tab.type} value={tab.type} className="py-2 flex-col sm:flex-row gap-1 sm:gap-2">
                    <tab.icon className="h-5 w-5" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="url" className="mt-4">
                <Label htmlFor="url-input">Website URL</Label>
                <Input id="url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <Label htmlFor="text-input">Your Text</Label>
                <Textarea id="text-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter any text here" />
              </TabsContent>
              <TabsContent value="email" className="mt-4 space-y-3">
                <Label>Email Details</Label>
                <Input value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} placeholder="Email address (to)" />
                <Input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} placeholder="Subject" />
                <Textarea value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} placeholder="Message" />
              </TabsContent>
               <TabsContent value="phone" className="mt-4">
                <Label htmlFor="phone-input">Phone Number</Label>
                <Input id="phone-input" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1234567890" />
              </TabsContent>
              <TabsContent value="sms" className="mt-4 space-y-3">
                <Label>SMS Details</Label>
                <Input type="tel" value={sms.phone} onChange={(e) => setSms({ ...sms, phone: e.target.value })} placeholder="Phone number" />
                <Textarea value={sms.message} onChange={(e) => setSms({ ...sms, message: e.target.value })} placeholder="Message" />
              </TabsContent>
              <TabsContent value="wifi" className="mt-4 space-y-3">
                <Label>WiFi Network</Label>
                <Input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} placeholder="Network Name (SSID)" />
                <Input type="password" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} placeholder="Password" />
                <Select value={wifi.encryption} onValueChange={(val) => setWifi({ ...wifi, encryption: val })}>
                  <SelectTrigger><SelectValue placeholder="Encryption" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WPA">WPA/WPA2</SelectItem>
                    <SelectItem value="WEP">WEP</SelectItem>
                    <SelectItem value="nopass">None</SelectItem>
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="vcard" className="mt-4 space-y-3">
                <Label>vCard Contact Details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={vCard.name} onChange={e => setVCard({...vCard, name: e.target.value})} placeholder="Full Name" />
                  <Input type="tel" value={vCard.phone} onChange={e => setVCard({...vCard, phone: e.target.value})} placeholder="Phone Number" />
                  <Input type="email" value={vCard.email} onChange={e => setVCard({...vCard, email: e.target.value})} placeholder="Email Address" />
                  <Input value={vCard.company} onChange={e => setVCard({...vCard, company: e.target.value})} placeholder="Company" />
                  <Input value={vCard.title} onChange={e => setVCard({...vCard, title: e.target.value})} placeholder="Job Title" />
                  <Input type="url" value={vCard.website} onChange={e => setVCard({...vCard, website: e.target.value})} placeholder="Website" />
                </div>
              </TabsContent>
              <TabsContent value="event" className="mt-4 space-y-3">
                <Label>Calendar Event Details</Label>
                <Input value={event.title} onChange={e => setEvent({...event, title: e.target.value})} placeholder="Event Title" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-time" className="text-xs">Start Time</Label>
                    <Input id="start-time" type="datetime-local" value={event.start} onChange={e => setEvent({...event, start: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="end-time" className="text-xs">End Time</Label>
                    <Input id="end-time" type="datetime-local" value={event.end} onChange={e => setEvent({...event, end: e.target.value})} />
                  </div>
                </div>
                <Input value={event.location} onChange={e => setEvent({...event, location: e.target.value})} placeholder="Location" />
                <Textarea value={event.description} onChange={e => setEvent({...event, description: e.target.value})} placeholder="Description" />
              </TabsContent>
              <TabsContent value="location" className="mt-4 space-y-3">
                <Label>Geo Location</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={location.latitude} onChange={e => setLocation({...location, latitude: e.target.value})} placeholder="Latitude (e.g., 40.7128)" />
                  <Input value={location.longitude} onChange={e => setLocation({...location, longitude: e.target.value})} placeholder="Longitude (e.g., -74.0060)" />
                </div>
              </TabsContent>
            </Tabs>

            <Card className="bg-muted/30">
              <Accordion type="single" collapsible>
                <AccordionItem value="customize">
                  <AccordionTrigger className="px-6">
                    <div className="flex items-center gap-2"><Palette className="h-5 w-5" /> Customize Design</div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6">
                    <div className="space-y-4 pt-2">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fg-color">Foreground Color</Label>
                          <Input id="fg-color" type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="p-1 h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bg-color">Background Color</Label>
                          <Input id="bg-color" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="p-1 h-10" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="size-slider">Size: {size}px</Label>
                        <Slider id="size-slider" min={64} max={1024} step={8} value={[size]} onValueChange={(v) => setSize(v[0])} />
                      </div>
                      <div>
                          <Label>Error Correction</Label>
                          <Select value={level} onValueChange={setLevel}>
                            <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L">Low (L)</SelectItem>
                              <SelectItem value="M">Medium (M)</SelectItem>
                              <SelectItem value="Q">Quartile (Q)</SelectItem>
                              <SelectItem value="H">High (H)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            <Button onClick={handleGenerate} size="lg" className="w-full text-lg py-7">
              <QrCode className="mr-2 h-6 w-6" />
              Generate QR Code
            </Button>
          </div>

          {/* Right Column: Preview */}
          <div className="bg-muted/50 p-6 flex flex-col items-center justify-center border-l">
            <Card className="p-4 shadow-lg bg-white">
              <div ref={qrCanvasRef} id="qr-code-canvas">
                <QRCodeCanvas
                  value={generatedQrValue}
                  size={size}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level={level}
                />
              </div>
               {/* Hidden SVG for download */}
                <QRCodeSVG
                  id="qr-code-svg"
                  value={generatedQrValue}
                  size={size}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level={level}
                  style={{ display: 'none' }}
                />
            </Card>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => handleDownload('png')} size="lg">
                <Download className="mr-2 h-5 w-5" /> PNG
              </Button>
              <Button onClick={() => handleDownload('svg')} variant="outline" size="lg">
                <Download className="mr-2 h-5 w-5" /> SVG
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-center mb-8">How to Create a QR Code</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">1</div>
                <h3 className="text-xl font-semibold mb-2">Select Type</h3>
                <p className="text-muted-foreground">Choose what you want to share: a URL, contact card, WiFi network, and more.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">2</div>
                <h3 className="text-xl font-semibold mb-2">Enter Data & Generate</h3>
                <p className="text-muted-foreground">Fill in the fields and click "Generate" to see your QR code preview instantly.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">3</div>
                <h3 className="text-xl font-semibold mb-2">Customize & Download</h3>
                <p className="text-muted-foreground">Change the colors and size to match your brand, then download in PNG or SVG.</p>
            </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Are the generated QR codes free to use?</AccordionTrigger>
            <AccordionContent>
              Yes, all QR codes you create are completely free for both personal and commercial use. There are no restrictions.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Do the QR codes expire?</AccordionTrigger>
            <AccordionContent>
              No, the QR codes you generate are static and do not expire. They encode the data directly and will work as long as the data (like a website URL) is valid.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>What is the difference between PNG and SVG?</AccordionTrigger>
            <AccordionContent>
              PNG is a pixel-based image format (raster), best for web use and digital applications where a fixed size is sufficient. SVG is a vector format, which means you can scale it to any size without losing quality, making it ideal for print and high-resolution displays.
            </AccordionContent>
          </AccordionItem>
           <AccordionItem value="item-4">
            <AccordionTrigger>What does "Error Correction Level" mean?</AccordionTrigger>
            <AccordionContent>
              Error correction allows a QR code to be readable even if it's partially damaged or covered. A higher level (like 'H') allows for more damage to be corrected, but it also increases the density of the QR code. For most cases, the default 'L' (Low) or 'M' (Medium) level is sufficient.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
