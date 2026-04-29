import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiGet } from '@/lib/contaazul'
import { buscarTokensSessao } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session.sessionId) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const tokens = await buscarTokensSessao(session.sessionId)
  if (!tokens) return NextResponse.json({ erro: 'Sessão expirada. Faça 