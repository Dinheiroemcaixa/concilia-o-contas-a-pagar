import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../../../../lib/session'
import { cookies } from 'next/headers'

export async function POST() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.appUsuario = undefined
  session.appNome = undefined
  await session.save()
  return NextResponse.json({ ok: true })
}
