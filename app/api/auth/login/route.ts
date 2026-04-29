import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../../../../lib/session'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function hashSenha(senha: string): string {
  return createHash('sha256').update(senha + 'datacar-salt-2026').digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const usuario: string = (body.usuario || '').trim().toLowerCase()
    const senha: string = (body.senha || '').trim()

    if (!usuario || !senha) {
      return NextResponse.json({ erro: 'Preencha usuario e senha.' }, { status: 400 })
    }

    const { data: user } = await supabase
      .from('usuarios')
      .select('id, nome, usuario, senha_hash')
      .eq('usuario', usuario)
      .maybeSingle()

    if (!user || user.senha_hash !== hashSenha(senha)) {
      return NextResponse.json({ erro: 'Usuario ou senha incorretos.' }, { status: 401 })
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.appUsuario = user.usuario
    session.appNome = user.nome
    await session.save()

    return NextResponse.json({ ok: true, nome: user.nome, usuario: user.usuario })
  } catch (e: any) {
    return NextResponse.json({ erro: 'Erro interno: ' + e.message }, { status: 500 })
  }
}
