import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()

  let tokenInfo = null
  if (session.sessionId) {
    const tokens = await buscarTokensSessao(session.sessionId)
    tokenInfo = tokens
      ? { temAccessToken: !!tokens.access_token, temRefreshToken: !!tokens.refresh_token, expiry: tokens.token_expiry }
      : null
  }

  return NextResponse.json({
    sessionId: session.sessionId || null,
    oauthState: session.oauthState || null,
    empresaNome: session.empresaNome || null,
    appUsuario: session.appUsuario || null,
    appNome: session.appNome || null,
    tokenNoSupabase: tokenInfo,
  })
}
