import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Prefer': 'return=representation',
  }
}

async function autenticado(): Promise<boolean> {
  const session = await getSession()
  if (session.appUsuario) return true
  if (session.sessionId) {
    const tokens = await buscarTokensSessao(session.sessionId)
    return tokens !== null
  }
  return false
}

export async function GET() {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  
  const res = await fetch(`${SB_URL}/rest/v1/empresas_clientes?select=id,nome,cnpj&order=nome`, {
    headers: sbHeaders(),
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ erro: data?.message || 'Erro ao buscar empresas' }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { nome, cnpj } = await req.json()
  const nomeEmpresa = nome?.trim() || ''
  const cnpjLimpo = (cnpj || '').replace(/\D/g, '')
  if (!nomeEmpresa) return NextResponse.json({ erro: 'Informe o nome da empresa' }, { status: 400 })

  const id = nomeEmpresa
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  const res = await fetch(`${SB_URL}/rest/v1/empresas_clientes`, {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      'Prefer': 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify({ id, nome: nomeEmpresa, cnpj: cnpjLimpo }),
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ erro: data?.message || 'Erro ao salvar empresa' }, { status: 500 })
  const empresa = Array.isArray(data) ? data[0] : data
  return NextResponse.json(empresa)
}

export async function DELETE(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { id } = await req.json()
  await fetch(`${SB_URL}/rest/v1/empresas_clientes?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  })
  return NextResponse.json({ ok: true })
}
