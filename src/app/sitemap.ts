import { MetadataRoute } from 'next'
 
const toolPaths = [
  '/pdf-tools',
  '/image-tools',
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
  '/unit-converters',
  '/qr-code',
  '/url-shortener',
  '/cover-letter-generator'
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
      changeFrequency: 'yearly',
      priority: 1,
    },
    ...toolUrls
  ]
}
