import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

async function rpc(fn: string, params: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

async function autenticado(): Promise<boolean> {
  const session = await getSession()
  if (session.appUsuario) return true
  if (session.sessionId) {
    const t = await buscarTokensSessao(session.sessionId)
    return t !== null
  }
  return false
}

// GET /api/empresa-token?empresa_id=xxx — verifica se empresa está conectada
export async function GET(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const empresaId = req.nextUrl.searchParams.get('empresa_id')
  if (!empresaId) return NextResponse.json({ conectada: false })

  const { ok, data } = await rpc('buscar_token_empresa', { p_empresa_id: empresaId })
  const conectada = ok && Array.isArray(data) && data.length > 0 && !!data[0]?.access_token
  const expirou = conectada && data[0]?.token_expiry ? new Date(data[0].token_expiry) < new Date() : false
  return NextResponse.json({ conectada: conectada && !expirou, expirou })
}
