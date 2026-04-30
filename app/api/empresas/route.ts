import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
    'Prefer': 'return=representation',
  }
}

function supabaseUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`
}

// Verifica se o usuario esta autenticado (por login interno OU por ContaAzul OAuth)
async function autenticado(): Promise<boolean> {
  const session = await getSession()
  if (session.appUsuario) return true
  if (session.sessionId) {
    const tokens = await buscarTokensSessao(session.sessionId)
    return tokens !== null
  }
  return false
}

// GET - lista empresas
export async function GET() {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })

  const res = await fetch(
    supabaseUrl('empresas_clientes?select=id,nome,cnpj,razao_social,nome_fantasia&order=nome'),
    { headers: supabaseHeaders() }
  )
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ erro: data?.message || 'Erro ao buscar empresas' }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST - cadastra empresa (manual, so nome e CNPJ)
export async function POST(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })

  const { nome, cnpj } = await req.json()
  const nomeEmpresa = nome?.trim() || ''
  const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null

  if (!nomeEmpresa) return NextResponse.json({ erro: 'Informe o nome da empresa' }, { status: 400 })

  // Gera ID a partir do nome
  const id = nomeEmpresa
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  const body = { id, nome: nomeEmpresa, cnpj: cnpjLimpo || null }

  const res = await fetch(
    supabaseUrl('empresas_clientes'),
    {
      method: 'POST',
      headers: { ...supabaseHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ erro: data?.message || 'Erro ao cadastrar empresa' }, { status: 500 })
  const empresa = Array.isArray(data) ? data[0] : data
  return NextResponse.json(empresa)
}

// DELETE - remove empresa e seus fornecedores
export async function DELETE(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { id } = await req.json()

  await fetch(
    supabaseUrl(`fornecedores?empresa_id=eq.${encodeURIComponent(id)}`),
    { method: 'DELETE', headers: supabaseHeaders() }
  )
  await fetch(
    supabaseUrl(`empresas_clientes?id=eq.${encodeURIComponent(id)}`),
    { method: 'DELETE', headers: supabaseHeaders() }
  )
  return NextResponse.json({ ok: true })
}
