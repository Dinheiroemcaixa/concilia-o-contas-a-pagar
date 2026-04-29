import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiGet } from '@/lib/contaazul'
import { buscarTokensSessao } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session.sessionId) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const tokens = await buscarTokensSessao(session.sessionId)
  if (!tokens) return NextResponse.json({ erro: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
  const { data, status } = await apiGet(tokens.access_token, '/financial/v1/categories', { type: 'EXPENSE' })
  return NextResponse.json(data ?? [], { status: data ? 200 : status })
}
