import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  const url = new URL(req.url);
  const provinceCode = url.pathname.split('/').pop();
  try {
    const response = await axios.get(
      `https://wilayah.id/api/regencies/${provinceCode}.json`
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching provinces:', error.message);

    return NextResponse.json(
      { message: 'Error fetching cities' },
      { status: 500 }
    );
  }
}
