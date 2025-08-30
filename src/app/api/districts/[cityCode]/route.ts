import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cityCode = url.pathname.split('/').pop();
  try {
    const response = await axios.get(
      `https://wilayah.id/api/districts/${cityCode}.json`
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching districts:', error.message);

    return NextResponse.json(
      { message: 'Error fetching districts' },
      { status: 500 }
    );
  }
}
