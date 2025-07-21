
import type { LucideIcon } from 'lucide-react';
import {
  Combine, Split, Minimize2, LayoutGrid, RotateCcw, FileMinus2, FilePlus2,
  FileText, Wrench, ScanText, FileCode, Presentation, Table2, ImagePlus, Globe,
  BarChart3, FileImage, Archive, Edit3, ListOrdered, Droplets, Unlock, Lock,
  Diff, FileType, Crop, Paintbrush, PanelTop, FileSpreadsheet,
  Image as ImageIcon, Expand, Wand2, CircleEllipsis, Type, ArrowRightLeft, ImageUp,
  BrainCircuit, QrCode, Link as LinkIcon, Scale, Calculator, Bot, Waypoints, FileJson
} from 'lucide-react';

export interface Tool {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  category: string;
}

export const allTools: Tool[] = [
  // PDF Tools
  { title: 'Merge PDF', description: 'Combine multiple PDF documents into one single PDF file.', href: '/merge', Icon: Combine, category: 'PDF' },
  { title: 'Split PDF', description: 'Separate pages into independent PDF files.', href: '/split', Icon: Split, category: 'PDF' },
  { title: 'Compress PDF', description: 'Reduce PDF file size while optimizing for quality.', href: '/compress', Icon: Minimize2, category: 'PDF' },
  { title: 'Organize PDF', description: 'Sort, add, delete, and merge PDF pages.', href: '/organize', Icon: LayoutGrid, category: 'PDF' },
  { title: 'Rotate PDF', description: 'Rotate your PDF files the way you need them.', href: '/rotate', Icon: RotateCcw, category: 'PDF' },
  { title: 'Remove PDF Pages', description: 'Delete one or several pages from your PDF document.', href: '/remove-pages', Icon: FileMinus2, category: 'PDF' },
  { title: 'Add PDF Pages', description: 'Insert new pages into an existing PDF document easily.', href: '/add-pages', Icon: FilePlus2, category: 'PDF' },
  { title: 'Summarize PDF', description: 'Leverage AI to get a concise summary of your PDF content.', href: '/summarize', Icon: FileText, category: 'PDF' },
  { title: 'Repair PDF', description: 'Attempt to fix a damaged or corrupt PDF file.', href: '/repair', Icon: Wrench, category: 'PDF' },
  { title: 'OCR PDF', description: 'Extract text from scanned PDFs using AI.', href: '/ocr', Icon: ScanText, category: 'PDF' },
  { title: 'Word to PDF', description: 'Convert DOCX files to PDF.', href: '/word-to-pdf', Icon: FileCode, category: 'PDF' },
  { title: 'PowerPoint to PDF', description: 'Convert PPTX slideshows to PDF.', href: '/powerpoint-to-pdf', Icon: Presentation, category: 'PDF' },
  { title: 'Excel to PDF', description: 'Convert Excel spreadsheets to PDF.', href: '/excel-to-pdf', Icon: Table2, category: 'PDF' },
  { title: 'JPG to PDF', description: 'Convert JPG images to PDF documents.', href: '/jpg-to-pdf', Icon: ImagePlus, category: 'PDF' },
  { title: 'HTML to PDF', description: 'Convert webpages to PDF from a URL.', href: '/html-to-pdf', Icon: Globe, category: 'PDF' },
  { title: 'PDF to Word', description: 'Convert PDF files into editable DOCX documents.', href: '/pdf-to-word', Icon: FileCode, category: 'PDF' },
  { title: 'PDF to PowerPoint', description: 'Convert PDFs into editable PPTX slideshows.', href: '/pdf-to-powerpoint', Icon: BarChart3, category: 'PDF' },
  { title: 'PDF to Excel', description: 'Extract data from PDFs into Excel spreadsheets.', href: '/pdf-to-excel', Icon: FileSpreadsheet, category: 'PDF' },
  { title: 'PDF to JPG', description: 'Convert PDF pages into JPG images.', href: '/pdf-to-jpg', Icon: FileImage, category: 'PDF' },
  { title: 'PDF to PDF/A', description: 'Convert PDF to PDF/A for long-term archiving.', href: '/pdf-to-pdfa', Icon: Archive, category: 'PDF' },
  { title: 'Edit PDF', description: 'Add text, images, or annotations to a PDF.', href: '/edit', Icon: Edit3, category: 'PDF' },
  { title: 'Add Page Numbers', description: 'Insert page numbers into your PDF documents.', href: '/add-page-numbers', Icon: ListOrdered, category: 'PDF' },
  { title: 'Watermark PDF', description: 'Stamp an image or text over your PDF files.', href: '/watermark', Icon: Droplets, category: 'PDF' },

  // Image Tools
  { title: 'Compress Image', description: 'Reduce file size of JPG, PNG, and GIF images.', href: '#', Icon: Minimize2, category: 'Image' },
  { title: 'Resize Image', description: 'Change the dimensions of your images.', href: '#', Icon: Expand, category: 'Image' },
  { title: 'Crop Image', description: 'Cut your images to a specific size.', href: '#', Icon: Crop, category: 'Image' },
  { title: 'Circle Crop Image', description: 'Crop your image into a perfect circle.', href: '/circle-crop', Icon: CircleEllipsis, category: 'Image' },
  { title: 'Image Editor', description: 'Add text, filters, or annotations to photos.', href: '#', Icon: Wand2, category: 'Image' },
  { title: 'Watermark Image', description: 'Stamp a text or image watermark over pictures.', href: '#', Icon: Droplets, category: 'Image' },
  { title: 'Remove Background', description: 'Automatically erase the background from any image.', href: '/remove-background', Icon: ImageIcon, category: 'Image' },
  { title: 'Convert to JPG', description: 'Transform PNG, GIF, or TIF images to JPG.', href: '#', Icon: ArrowRightLeft, category: 'Image' },
  { title: 'Convert from JPG', description: 'Change JPG images to other formats.', href: '#', Icon: ArrowRightLeft, category: 'Image' },
  { title: 'Upscale Image', description: 'Increase image resolution using AI.', href: '#', Icon: ImageUp, category: 'Image' },
  { title: 'Add Text to Image', description: 'Easily add text and captions to photos.', href: '#', Icon: Type, category: 'Image' },

  // AI Tools
  { title: 'AI Cover Letter Generator', description: 'Create professional, personalized cover letters.', href: '/cover-letter-generator', Icon: BrainCircuit, category: 'AI' },

  // Other Tools
  { title: 'QR Code Generator', description: 'Create custom QR codes for URLs, text, Wi-Fi, and more.', href: '/qr-code', Icon: QrCode, category: 'Utilities' },
  { title: 'URL Shortener', description: 'Create short links that redirect based on device.', href: '/smart-url-shortener', Icon: LinkIcon, category: 'Utilities' },
  { title: 'Unit Converters', description: 'Convert between different units of measurement.', href: '/unit-converters', Icon: Scale, category: 'Utilities' },
  { title: 'N8N Templates', description: 'Jumpstart workflows with pre-built N8N templates.', href: '#', Icon: Bot, category: 'Automation' },
  { title: 'Sitemap Generator', description: 'Create an XML sitemap for your website.', href: '#', Icon: Waypoints, category: 'Automation' },
  { title: 'JSON to CSV', description: 'Convert JSON data into structured CSV files.', href: '#', Icon: FileJson, category: 'Automation' },
];
