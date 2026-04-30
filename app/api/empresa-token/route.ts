import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
  }
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

export async function GET(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const empresaId = req.nextUrl.searchParams.get('empresa_id')
  if (!empresaId) return NextResponse.json({ conectada: false })

  const res = await fetch(
    `${SB_URL}/rest/v1/tokens_empresa?empresa_id=eq.${encodeURIComponent(empresaId)}&select=access_token,token_expiry&limit=1`,
    { headers: sbHeaders() }
  )
  if (!res.ok) return NextResponse.json({ conectada: false })

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0 || !data[0]?.access_token) {
    return NextResponse.json({ conectada: false })
  }

  const expiry = data[0].token_expiry
  const expirou = expiry ? new Date(expiry) < new Date() : true
  return NextResponse.json({ conectada: !expirou, expirou })
}
