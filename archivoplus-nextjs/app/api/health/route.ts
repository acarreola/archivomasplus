import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: true, app: 'archivoplus-nextjs' }, { status: 200 });
}
