import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarHistorico } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const historico = await buscarHistorico()
  return NextResponse.json(historico)
}
