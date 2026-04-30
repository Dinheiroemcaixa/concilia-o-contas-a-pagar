import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

// GET - lista empresas cadastradas
export async function GET() {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { data, error } = await supabase.from('empresas_clientes').select('id, nome').order('nome')
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST - cadastra nova empresa
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatorio' }, { status: 400 })
  // Gera ID automatico a partir do nome
  const id = nome.trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const { error } = await supabase.from('empresas_clientes').upsert({ id, nome: nome.trim() })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ id, nome: nome.trim() })
}

// DELETE - remove empresa
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { id } = await req.json()
  await supabase.from('empresas_clientes').delete().eq('id', id)
  await supabase.from('fornecedores').delete().eq('empresa_id', id)
  return NextResponse.json({ ok: true })
}
