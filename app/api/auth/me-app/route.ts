import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../../../../lib/session'
import { cookies } from 'next/headers'

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (session.appUsuario) {
    return NextResponse.json({ logado: true, usuario: session.appUsuario, nome: session.appNome })
  }
  return NextResponse.json({ logado: false })
}
