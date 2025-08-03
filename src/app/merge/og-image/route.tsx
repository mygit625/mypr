
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
            fontFamily: 'sans-serif', // Use a default font
          }}
        >
          {/* Main Tool Icon: Combine */}
          <svg
            width="128"
            height="128"
            viewBox="0 0 24 24"
            style={{
              stroke: '#e53935', // Primary Red
              strokeWidth: '1.5',
              fill: 'none',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <rect width="8" height="8" x="2" y="2" rx="2" />
            <rect width="8" height="8" x="14" y="14" rx="2" />
            <path d="M14 2h4a2 2 0 0 1 2 2v4" />
            <path d="M10 22H6a2 2 0 0 1-2-2v-4" />
          </svg>
          
          <div
            style={{
              fontSize: 82,
              fontWeight: 'bold',
              color: '#1A202C',
              marginTop: 30,
            }}
          >
            Merge PDF
          </div>
          
          <div
            style={{
              fontSize: 44,
              color: '#4A5568',
              marginTop: 10,
            }}
          >
            Toolsinn.com
          </div>
          
          {/* Logo at the bottom center */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              style={{
                stroke: '#e53935', // Primary Red
                strokeWidth: '2',
                fill: 'none',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <div
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: '#e53935', // Primary Red
                marginLeft: '12px',
              }}
            >
              Toolsinn
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
