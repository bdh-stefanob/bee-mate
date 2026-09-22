import { NextResponse } from 'next/server';
import { ferma } from '@/lib/registro';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ fermata: ferma(id) });
}
