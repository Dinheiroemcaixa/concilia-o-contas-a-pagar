import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

// Cria client fresco a cada request para evitar cache de schema
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { db: { schema: 'public' } }
  )
}

async function buscarCnpj(cnpj: string) {
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 'ERROR') return null
    return { razaoSocial: data.nome || '', nomeFantasia: data.fantasia || '' }
  } catch { return null }
}

// GET - lista empresas
export async function GET() {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const sb = getSupabase()
  const { data, error } = await sb.from('empresas_clientes').select('id, nome, cnpj, razao_social, nome_fantasia').order('nome')
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST - cadastra empresa (busca CNPJ automaticamente)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })

  const { nome, cnpj } = await req.json()
  const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : ''

  let nomeEmpresa = nome?.trim() || ''
  let razaoSocial = ''
  let nomeFantasia = ''

  // Busca dados do CNPJ se fornecido
  if (cnpjLimpo.length === 14) {
    const dadosCnpj = await buscarCnpj(cnpjLimpo)
    if (dadosCnpj) {
      razaoSocial  = dadosCnpj.razaoSocial
      nomeFantasia = dadosCnpj.nomeFantasia
      if (!nomeEmpresa) {
        nomeEmpresa = nomeFantasia || razaoSocial
      }
    }
  }

  if (!nomeEmpresa) return NextResponse.json({ erro: 'Informe o nome ou um CNPJ valido' }, { status: 400 })

  // Gera ID a partir do nome
  const id = nomeEmpresa
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  const sb = getSupabase()
  const { error } = await sb.from('empresas_clientes').upsert({
    id,
    nome: nomeEmpresa,
    cnpj: cnpjLimpo || null,
    razao_social: razaoSocial || null,
    nome_fantasia: nomeFantasia || null,
  })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ id, nome: nomeEmpresa, cnpj: cnpjLimpo, razao_social: razaoSocial, nome_fantasia: nomeFantasia })
}

// DELETE - remove empresa e seus fornecedores
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { id } = await req.json()
  const sb = getSupabase()
  await sb.from('fornecedores').delete().eq('empresa_id', id)
  await sb.from('empresas_clientes').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
