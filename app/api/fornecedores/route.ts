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

async function autenticado(): Promise<boolean> {
  const session = await getSession()
  if (session.appUsuario) return true
  if (session.sessionId) {
    const tokens = await buscarTokensSessao(session.sessionId)
    return tokens !== null
  }
  return false
}

export async function GET(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const empresaId = req.nextUrl.searchParams.get('empresa_id') || 'default'

  const res = await fetch(
    supabaseUrl(`fornecedores?empresa_id=eq.${encodeURIComponent(empresaId)}&select=nome,cnpj&order=nome`),
    { headers: supabaseHeaders() }
  )
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ erro: data?.message || 'Erro ao buscar fornecedores' }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { xmlContent, empresa_id } = await req.json()
  const eid = empresa_id || 'default'
  if (!xmlContent) return NextResponse.json({ erro: 'XML nao fornecido' }, { status: 400 })

  const fornecedores: { nome: string; cnpj: string }[] = []
  const matches = xmlContent.matchAll(/<fornecedor>([\s\S]*?)<\/fornecedor>/g)
  for (const match of matches) {
    const block = match[1]
    const nomeMatch = block.match(/<Nome>(.*?)<\/Nome>/)
    const cnpjMatch = block.match(/<CNPJ>(.*?)<\/CNPJ>/)
    if (nomeMatch && nomeMatch[1].trim()) {
      fornecedores.push({ nome: nomeMatch[1].trim(), cnpj: cnpjMatch ? cnpjMatch[1].trim() : '' })
    }
  }

  if (!fornecedores.length) return NextResponse.json({ erro: 'Nenhum fornecedor encontrado no XML' }, { status: 400 })

  // Deleta fornecedores antigos
  await fetch(
    supabaseUrl(`fornecedores?empresa_id=eq.${encodeURIComponent(eid)}`),
    { method: 'DELETE', headers: supabaseHeaders() }
  )

  // Insere novos
  const rows = fornecedores.map(f => ({ empresa_id: eid, nome: f.nome, cnpj: f.cnpj }))
  const res = await fetch(
    supabaseUrl('fornecedores'),
    { method: 'POST', headers: supabaseHeaders(), body: JSON.stringify(rows) }
  )
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ erro: data?.message || 'Erro ao inserir fornecedores' }, { status: 500 })
  return NextResponse.json({ importados: fornecedores.length })
}
