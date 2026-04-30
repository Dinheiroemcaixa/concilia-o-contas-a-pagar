import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

// GET - lista fornecedores salvos
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })

  const empresaId = req.nextUrl.searchParams.get('empresa_id') || 'default'
  const { data, error } = await supabase
    .from('fornecedores')
    .select('nome, cnpj')
    .eq('empresa_id', empresaId)
    .order('nome')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST - importa XML do ContaAzul
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })

  const body = await req.json()
  const { xmlContent, empresa_id } = body
  const eid = empresa_id || 'default'

  if (!xmlContent) return NextResponse.json({ erro: 'XML nao fornecido' }, { status: 400 })

  // Parse XML simples - extrai Nome e CNPJ de cada fornecedor
  const fornecedores: { nome: string; cnpj: string }[] = []
  const matches = xmlContent.matchAll(/<fornecedor>([\s\S]*?)<\/fornecedor>/g)
  for (const match of matches) {
    const block = match[1]
    const nomeMatch = block.match(/<Nome>(.*?)<\/Nome>/)
    const cnpjMatch = block.match(/<CNPJ>(.*?)<\/CNPJ>/)
    if (nomeMatch && nomeMatch[1].trim()) {
      fornecedores.push({
        nome: nomeMatch[1].trim(),
        cnpj: cnpjMatch ? cnpjMatch[1].trim() : '',
      })
    }
  }

  if (!fornecedores.length) return NextResponse.json({ erro: 'Nenhum fornecedor encontrado no XML' }, { status: 400 })

  // Apaga os anteriores desta empresa e insere os novos
  await supabase.from('fornecedores').delete().eq('empresa_id', eid)

  const rows = fornecedores.map(f => ({ empresa_id: eid, nome: f.nome, cnpj: f.cnpj }))
  const { error } = await supabase.from('fornecedores').insert(rows)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ importados: fornecedores.length })
}
