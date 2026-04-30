import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

async function rpc(fn: string, params: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  return { ok: res.ok, data, status: res.status }
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
  const { ok, data } = await rpc('listar_empresas', {})
  if (!ok) return NextResponse.json({ erro: data?.message || 'Erro ao buscar empresas' }, { status: 500 })
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

  const { ok, data } = await rpc('salvar_empresa', { p_id: id, p_nome: nomeEmpresa, p_cnpj: cnpjLimpo })
  if (!ok) return NextResponse.json({ erro: data?.message || 'Erro ao salvar empresa' }, { status: 500 })
  const empresa = Array.isArray(data) ? data[0] : data
  return NextResponse.json(empresa)
}

export async function DELETE(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { id } = await req.json()
  await rpc('remover_empresa', { p_id: id })
  return NextResponse.json({ ok: true })
}
// recriated Thu Apr 30 14:28:04 UTC 2026
