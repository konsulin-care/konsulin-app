import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, res: NextResponse) {
  try {
    const response = await axios.get('https://wilayah.id/api/provinces.json');
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching provinces:', error.message);
    return NextResponse.json(
      { message: 'Error fetching provinces' },
      { status: 500 }
    );
  }
}
