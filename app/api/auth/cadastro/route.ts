import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

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
    const nome: string = (body.nome || '').trim()
    const usuario: string = (body.usuario || '').trim().toLowerCase()
    const senha: string = (body.senha || '').trim()

    if (!nome || !usuario || !senha) {
      return NextResponse.json({ erro: 'Preencha todos os campos.' }, { status: 400 })
    }
    if (usuario.length < 3) {
      return NextResponse.json({ erro: 'Usuario deve ter ao menos 3 caracteres.' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ erro: 'Senha deve ter ao menos 6 caracteres.' }, { status: 400 })
    }

    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('usuario', usuario)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ erro: 'Este usuario ja esta em uso.' }, { status: 400 })
    }

    const { error } = await supabase.from('usuarios').insert({
      nome,
      usuario,
      senha_hash: hashSenha(senha),
    })

    if (error) {
      return NextResponse.json({ erro: 'Erro ao cadastrar: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: 'Erro interno: ' + e.message }, { status: 500 })
  }
}
