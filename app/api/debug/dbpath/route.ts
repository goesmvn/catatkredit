import { NextResponse } from 'next/server'
import { getDbPath } from '@/lib/db/server/sqlite'

export async function GET() {
  try {
    return NextResponse.json({ dbPath: getDbPath() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
