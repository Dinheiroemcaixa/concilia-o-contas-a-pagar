import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { trocarCodigoPorToken } from '@/lib/contaazul'
import { salvarTokensSessao } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?erro=${encodeURIComponent('Erro na autenticacao: ' + error)}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?erro=Codigo+de+autorizacao+ausente', req.url))
  }

  try {
    const tokens = await trocarCodigoPorToken(code)

    const sessionId = await salvarTokensSessao({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in:    tokens.expires_in
    })

    const session = await getSession()
    session.sessionId  = sessionId
    session.oauthState = undefined
    await session.save()

    return NextResponse.redirect(new URL('/', req.url))
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/?erro=${encodeURIComponent(e.message)}`, req.url))
  }
}
