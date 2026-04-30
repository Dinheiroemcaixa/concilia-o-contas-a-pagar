import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { trocarCodigoPorToken } from '@/lib/contaazul'
import { salvarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

async function rpc(fn: string, params: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify(params),
  })
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error')

  if (error) return NextResponse.redirect(new URL(`/?erro=${encodeURIComponent('Erro: ' + error)}`, req.url))
  if (!code) return NextResponse.redirect(new URL('/?erro=Codigo+ausente', req.url))

  const parts = state.split(':')
  const empresaId = parts.length >= 2 ? parts.slice(1).join(':') : ''

  try {
    const tokens = await trocarCodigoPorToken(code)

    if (empresaId) {
      await rpc('salvar_token_empresa', {
        p_empresa_id:    empresaId,
        p_access_token:  tokens.access_token,
        p_refresh_token: tokens.refresh_token || '',
        p_expires_in:    tokens.expires_in || 3600,
      })
    }

    const session = await getSession()
    const sessionId = await salvarTokensSessao({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in:    tokens.expires_in,
    })
    session.sessionId  = sessionId
    session.oauthState = undefined
    await session.save()

    const dest = empresaId ? `/?conectado=${encodeURIComponent(empresaId)}` : '/'
    return NextResponse.redirect(new URL(dest, req.url))
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/?erro=${encodeURIComponent(e.message)}`, req.url))
  }
}
