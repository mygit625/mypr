import { FeatureCard } from '@/components/feature/feature-card';
import { 
  Combine, Split, FileText, Minimize2, FileCode, FileSpreadsheet,
  FileImage, Edit3, PenTool, Droplets, RotateCcw, Globe, Unlock, Lock, LayoutGrid,
  Archive, Wrench, ListOrdered, ScanText, FileType, Presentation, Table2, ImagePlus, BarChart3,
  Crop, Diff, Paintbrush, PanelTop, FileMinus2, FilePlus2, FlaskConical, BrainCircuit
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string; 
}

interface FeatureCategory {
  name: string;
  features: Feature[];
}

const featuresByCategory: FeatureCategory[] = [
  {
    name: 'Organize PDF',
    features: [
      { title: 'Merge PDF', description: 'Combine multiple PDF documents into one single PDF file.', href: '/merge', Icon: Combine, iconColor: 'text-orange-500' },
      { title: 'Split PDF', description: 'Separate one page or a whole set for easy conversion into independent PDF files.', href: '/split', Icon: Split, iconColor: 'text-red-500' },
      { title: 'Compress PDF', description: 'Reduce file size while optimizing for maximal PDF quality.', href: '/compress', Icon: Minimize2, iconColor: 'text-green-500' },
      { title: 'Organize PDF', description: 'Sort, add, and delete PDF pages. You can also merge multiple PDFs.', href: '/organize', Icon: LayoutGrid, iconColor: 'text-purple-500' },
      { title: 'Rotate PDF', description: 'Rotate your PDFs the way you need them. Rotate multiple PDFs at once!', href: '/rotate', Icon: RotateCcw, iconColor: 'text-gray-500' },
      { title: 'Remove PDF Pages', description: 'Delete one or several pages from your PDF document.', href: '/remove-pages', Icon: FileMinus2, iconColor: 'text-rose-500' },
      { title: 'Add PDF Pages', description: 'Insert new pages into an existing PDF document easily.', href: '/add-pages', Icon: FilePlus2, iconColor: 'text-lime-500' },
    ],
  },
  {
    name: 'Optimize PDF',
    features: [
      { title: 'Summarize PDF', description: 'Leverage AI to get a concise summary of your PDF content.', href: '/summarize', Icon: FileText, iconColor: 'text-teal-500' },
      { title: 'Repair PDF', description: 'Attempt to fix a damaged PDF and recover data from corrupt PDFs.', href: '/repair', Icon: Wrench, iconColor: 'text-gray-600' },
      { title: 'OCR PDF', description: 'Convert scanned PDFs to text using AI. Extracts text from images of pages.', href: '/ocr', Icon: ScanText, iconColor: 'text-indigo-500' },
    ],
  },
  {
    name: 'Convert to PDF',
    features: [
      { title: 'Word to PDF', description: 'Make DOCX files easy to read by converting them to PDF.', href: '/word-to-pdf', Icon: FileCode, iconColor: 'text-blue-700' },
      { title: 'PowerPoint to PDF', description: 'Make PPT and PPTX slideshows easy to view by converting to PDF.', href: '/powerpoint-to-pdf', Icon: Presentation, iconColor: 'text-orange-700' },
      { title: 'Excel to PDF', description: 'Make Excel spreadsheets easy to read by converting them to PDF.', href: '/excel-to-pdf', Icon: Table2, iconColor: 'text-green-700' },
      { title: 'JPG to PDF', description: 'Convert JPG images to PDF. Adjust orientation and margins.', href: '/jpg-to-pdf', Icon: ImagePlus, iconColor: 'text-yellow-600' },
      { title: 'HTML to PDF', description: 'Convert webpages in HTML to PDF. Copy and paste the URL.', href: '/html-to-pdf', Icon: Globe, iconColor: 'text-sky-500' },
    ],
  },
  {
    name: 'Convert from PDF',
    features: [
      { title: 'PDF to Word', description: 'Easily convert your PDF files into editable DOC and DOCX documents.', href: '/pdf-to-word', Icon: FileCode, iconColor: 'text-blue-500' },
      { title: 'PDF to PowerPoint', description: 'Convert your PDFs into easy-to-edit PPT and PPTX slideshows.', href: '/pdf-to-powerpoint', Icon: BarChart3, iconColor: 'text-red-600' },
      { title: 'PDF to Excel', description: 'Pull data straight from PDFs into Excel spreadsheets in a few clicks.', href: '#', Icon: FileSpreadsheet, iconColor: 'text-green-600' },
      { title: 'PDF to JPG', description: 'Convert each PDF page into a JPG or extract all images in a PDF.', href: '/pdf-to-jpg', Icon: FileImage, iconColor: 'text-yellow-500' },
      { title: 'PDF to PDF/A', description: 'Transform PDF to PDF/A for long-term archiving.', href: '/pdf-to-pdfa', Icon: Archive, iconColor: 'text-slate-500' },
    ],
  },
  {
    name: 'Edit & Sign PDF',
    features: [
      { title: 'Edit PDF', description: 'Add text, images, shapes or freehand annotations to a PDF.', href: '/edit', Icon: Edit3, iconColor: 'text-pink-500' },
      { title: 'Add Page Numbers', description: 'Add page numbers to your PDF documents with ease.', href: '/add-page-numbers', Icon: ListOrdered, iconColor: 'text-cyan-500' },
      { title: 'Watermark', description: 'Stamp an image or text over your PDFs in seconds.', href: '/watermark', Icon: Droplets, iconColor: 'text-blue-400' },
      { title: 'Sign PDF', description: 'Sign yourself or request electronic signatures from others.', href: '#', Icon: PenTool, iconColor: 'text-purple-600' },
      { title: 'Crop PDF', description: 'Select and crop areas of your PDF pages.', href: '#', Icon: Crop, iconColor: 'text-indigo-400' },
      { title: 'Redact PDF', description: 'Permanently remove sensitive information from your PDF.', href: '#', Icon: Paintbrush, iconColor: 'text-gray-700' },
      { title: 'Add Header/Footer', description: 'Easily add headers and footers to your PDF documents.', href: '#', Icon: PanelTop, iconColor: 'text-teal-400' },
    ],
  },
  {
    name: 'PDF Security',
    features: [
      { title: 'Unlock PDF', description: 'Remove PDF password security, for freedom to use your PDFs.', href: '#', Icon: Unlock, iconColor: 'text-lime-500' },
      { title: 'Protect PDF', description: 'Protect PDF files with a password to prevent unauthorized access.', href: '#', Icon: Lock, iconColor: 'text-rose-500' },
    ],
  },
  {
    name: 'View & Compare',
    features: [
       { title: 'Compare PDF', description: 'Highlight differences between two PDF files.', href: '#', Icon: Diff, iconColor: 'text-amber-500'},
       { title: 'PDF Reader', description: 'View and read your PDF documents online.', href: '#', Icon: FileType, iconColor: 'text-blue-300'}, 
    ],
  }
];

export default function PdfToolsPage() {
  return (
    <div className="space-y-12 md:space-y-16 pb-16">
      <section className="text-center pt-12 pb-8 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Every tool you need to work with PDFs in one place
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Every tool you need to use PDFs, at your fingertips. All are 100% FREE and easy to use! Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
          </p>
        </div>
      </section>

      {featuresByCategory.map((category) => (
        <section key={category.name}>
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6 md:mb-8 text-center md:text-left">
              {category.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {category.features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  href={feature.href}
                  Icon={feature.Icon}
                  iconColor={feature.iconColor}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
