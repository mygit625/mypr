
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            fontFamily: '"Geist"',
            padding: '40px',
          }}
        >
          {/* Main Card Element - A recreation of the page UI */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '24px 32px',
              width: '1100px',
              height: '550px',
            }}
          >
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
              {/* Icon */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e53935" // Primary Red
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: '16px' }}
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <path d="m3.27 6.96 8.73 5.05 8.73-5.05"></path>
                <path d="M12 22.08V12"></path>
              </svg>

              {/* Title */}
              <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#111827', margin: 0, marginBottom: '8px' }}>
                Merge PDF Files
              </h1>
              {/* Description */}
              <p style={{ fontSize: '22px', color: '#6b7280', margin: 0, maxWidth: '80%' }}>
                Combine multiple PDF documents into one. Drag and drop to reorder.
              </p>
            </div>

            {/* Upload Zone */}
            <div
                style={{
                  width: '100%',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '40px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexGrow: 1,
                  backgroundColor: '#f9fafb'
                }}
              >
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: '12px' }}
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                <p style={{ fontSize: '20px', color: '#6b7280', margin: 0 }}>
                  <span style={{ color: '#e53935', fontWeight: '500' }}>Click to upload</span> or drag and drop
                </p>
                <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0, marginTop: '4px' }}>
                  PDF files only. Up to 10 files initially.
                </p>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('Failed to generate OG image', e);
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
