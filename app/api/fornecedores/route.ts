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

export async function GET(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const empresaId = req.nextUrl.searchParams.get('empresa_id') || 'default'

  const res = await fetch(
    `${SB_URL}/rest/v1/fornecedores?empresa_id=eq.${encodeURIComponent(empresaId)}&select=id,nome,cnpj&order=nome`,
    { headers: sbHeaders() }
  )
  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ erro: err?.message || 'Erro ao buscar fornecedores' }, { status: 500 })
  }
  const data = await res.json()
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!(await autenticado())) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { xmlContent, empresa_id } = await req.json()
  const eid = empresa_id || 'default'
  if (!xmlContent) return NextResponse.json({ erro: 'XML nao fornecido' }, { status: 400 })

  // Extrai fornecedores do XML
  const fornecedores: { empresa_id: string; nome: string; cnpj: string }[] = []
  const matches = xmlContent.matchAll(/<fornecedor>([\s\S]*?)<\/fornecedor>/g)
  for (const match of matches) {
    const block = match[1]
    const nomeMatch = block.match(/<Nome>(.*?)<\/Nome>/)
    const cnpjMatch = block.match(/<CNPJ>(.*?)<\/CNPJ>/)
    if (nomeMatch && nomeMatch[1].trim()) {
      fornecedores.push({
        empresa_id: eid,
        nome: nomeMatch[1].trim(),
        cnpj: cnpjMatch ? cnpjMatch[1].trim() : '',
      })
    }
  }

  if (!fornecedores.length) return NextResponse.json({ erro: 'Nenhum fornecedor encontrado no XML' }, { status: 400 })

  // INSERT com upsert por (empresa_id, cnpj)
  const res = await fetch(`${SB_URL}/rest/v1/fornecedores`, {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      'Prefer': 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify(fornecedores),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[fornecedores POST] erro:', res.status, err)
    return NextResponse.json({ erro: err?.message || 'Erro ao salvar fornecedores' }, { status: 500 })
  }

  return NextResponse.json({ importados: fornecedores.length })
}
