
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
            backgroundColor: '#fff',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          {/* Main Content Area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Tool Icon */}
            <svg
              width="96"
              height="96"
              viewBox="0 0 24 24"
              style={{
                stroke: '#e53935', // Primary Red
                strokeWidth: '1.5',
                fill: 'none',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                marginBottom: '16px',
              }}
            >
              <rect width="8" height="8" x="2" y="2" rx="2" />
              <rect width="8" height="8" x="14" y="14" rx="2" />
              <path d="M14 2h4a2 2 0 0 1 2 2v4" />
              <path d="M10 22H6a2 2 0 0 1-2-2v-4" />
            </svg>

            {/* Title */}
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1A202C',
                margin: 0,
                marginBottom: '8px',
              }}
            >
              Merge PDF Files
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '22px',
                color: '#718096',
                margin: 0,
                maxWidth: '80%',
              }}
            >
              Combine multiple PDF documents into one. Drag and drop to reorder.
            </p>

            {/* Upload Card */}
            <div
              style={{
                marginTop: '48px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                padding: '24px',
                width: '600px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#1A202C',
                  margin: 0,
                }}
              >
                Upload PDFs
              </h2>
              <p style={{ fontSize: '16px', color: '#718096', margin: 0, marginTop: '4px' }}>
                Select or drag and drop the PDF files you want to merge (up to 10 files initially).
              </p>
              
              {/* Dashed Dropzone */}
              <div
                style={{
                  marginTop: '16px',
                  width: '100%',
                  border: '2px dashed #CBD5E0',
                  borderRadius: '8px',
                  padding: '40px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: '12px' }}
                >
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                    <line x1="12" x2="12" y1="12" y2="22" />
                    <line x1="8" x2="8" y1="12" y2="22" />
                    <line x1="16" x2="16" y1="12" y2="22" />
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <path d="M21 15h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3H17" />
                    <path d="M12 22v-6" />
                </svg>
                <p style={{ fontSize: '16px', color: '#718096', margin: 0 }}>
                  <span style={{ color: '#e53935', fontWeight: '500' }}>Click to upload</span> or drag and drop
                </p>
                <p style={{ fontSize: '14px', color: '#A0AEC0', margin: 0, marginTop: '4px' }}>
                  PDF files only. Up to 10 files.
                </p>
              </div>
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
