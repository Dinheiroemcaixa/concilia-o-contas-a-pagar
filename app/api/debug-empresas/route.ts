import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session.sessionId) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const tokens = await buscarTokensSessao(session.sessionId)
  if (!tokens) return NextResponse.json({ erro: 'Sessao expirada' }, { status: 401 })

  const token = tokens.access_token
  const base = 'https://api-v2.contaazul.com'
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const endpoints = [
    '/v1/companies',
    '/v1/tenants',
    '/v1/accounts',
    '/financial/v1/companies',
    '/v1/users/me',
    '/v1/me',
  ]

  const resultados: Record<string, any> = {}
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep}`, { headers })
      let body: any
      try { body = await res.json() } catch { body = await res.text() }
      resultados[ep] = { status: res.status, body }
    } catch (e: any) {
      resultados[ep] = { erro: e.message }
    }
  }

  return NextResponse.json(resultados)
}
