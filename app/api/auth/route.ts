import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { CA_AUTH_URL, CA_CLIENT_ID, CA_REDIRECT_URI, CA_SCOPES } from '@/lib/contaazul'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''
  const session = await getSession()
  const nonce = crypto.randomBytes(8).toString('hex')
  const state = empresaId ? `${nonce}:${empresaId}` : nonce
  session.oauthState = nonce
  await session.save()

  const url = new URL(CA_AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CA_CLIENT_ID)
  url.searchParams.set('redirect_uri', CA_REDIRECT_URI)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', CA_SCOPES)

  return NextResponse.redirect(url.toString())
}
