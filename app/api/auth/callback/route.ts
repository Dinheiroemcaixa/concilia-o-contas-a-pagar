import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { trocarCodigoPorToken } from '@/lib/contaazul'
import { salvarTokensSessao } from '@/lib/supabase'

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

    // Salva tokens grandes no Supabase, guarda só o ID pequeno no cookie
    const sessionId = await salvarTokensSessao({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in:    tokens.expires_in
    })

    session.sessionId   = sessionId
    session.oauthState  = undefined
    await session.save()

    return NextR