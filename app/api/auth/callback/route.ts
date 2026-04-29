import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { trocarCodigoPorToken } from '@/lib/contaazul'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?erro=${encodeURIComponent('Erro na autenticação: ' + error)}`, req.url))
  }

  const session = await getSession()

  if (state !== session.oauthState) {
    return NextResponse.redirect(new URL('/?erro=Estado+OAuth+invalido', req.url))
  }

  try {
    const tokens = await trocarCodigoPorToken(code!)
    session.accessToken  = tokens.access_token
    session.refreshToken = tokens.refresh_token
    session.tokenExpiry  = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    session.oauthState   = undefined
    await session.save()
    return NextResponse.redirect(new URL('/', req.url))
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/?erro=${encodeURIComponent(e.message)}`, req.url))
  }
}
