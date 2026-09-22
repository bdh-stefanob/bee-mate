import { NextResponse } from 'next/server';
import { ferma } from '@/lib/registro';
import { daAltraOrigine } from '@/lib/stessa-origine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  const { id } = await params;
  return NextResponse.json({ fermata: ferma(id) });
}
