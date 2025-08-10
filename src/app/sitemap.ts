
import { MetadataRoute } from 'next'
 
const toolPaths = [
  // PDF Tools
  '/pdf-tools',
  '/merge',
  '/split',
  '/compress',
  '/organize',
  '/rotate',
  '/remove-pages',
  '/add-pages',
  '/summarize',
  '/repair',
  '/ocr',
  '/word-to-pdf',
  '/powerpoint-to-pdf',
  '/excel-to-pdf',
  '/jpg-to-pdf',
  '/html-to-pdf',
  '/pdf-to-word',
  '/pdf-to-powerpoint',
  '/pdf-to-excel',
  '/pdf-to-jpg',
  '/pdf-to-pdfa',
  '/edit',
  '/add-page-numbers',
  '/watermark',

  // Image Tools
  '/image-tools',
  '/crop-image',
  '/circle-crop',
  '/remove-background',
  
  // AI Tools
  '/cover-letter-generator',

  // Utility Tools
  '/unit-converters',
  '/qr-code',
  '/smart-url-shortener',

  // Automation Tools
  '/automation-tools',

  // Informational Pages
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/data-deletion',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolsinn.com';

  const toolUrls = toolPaths.map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...toolUrls
  ]
}
