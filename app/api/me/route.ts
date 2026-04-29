import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  const temTokenCA = session.sessionId
    ? !!(await buscarTokensSessao(session.sessionId))
    : false
  return NextResponse.json({
    autenticado: temTokenCA,
    empresaNome: session.empresaNome || '',
  })
}
