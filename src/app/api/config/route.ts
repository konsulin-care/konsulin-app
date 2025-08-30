import { serverConfig } from '@/lib/config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Define the safe configuration values to be exposed to the client
    const safeConfig = {
      APP_NAME: serverConfig.APP_NAME,
      API_URL: serverConfig.API_URL,
      API_BASE_PATH: serverConfig.API_BASE_PATH,
      APP_URL: serverConfig.APP_URL,
      APP_AUTH_PATH: serverConfig.APP_AUTH_PATH,
      TERMINOLOGY_SERVER: serverConfig.TERMINOLOGY_SERVER
    };

    const response = NextResponse.json(safeConfig, { status: 200 });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    // Add caching headers (e.g., cache for 1 hour)
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, must-revalidate'
    );

    return response;
  } catch (error) {
    console.error('Error fetching client configuration:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  return response;
}
