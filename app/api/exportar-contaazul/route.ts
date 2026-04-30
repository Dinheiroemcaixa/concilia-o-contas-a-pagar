import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) {
    return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { contas, categoria } = body

  if (!contas?.length) {
    return NextResponse.json({ erro: 'Nenhuma conta selecionada' }, { status: 400 })
  }

  function fmtDate(s: string | null): string {
    if (!s) return ''
    const p = s.split('-')
    if (p.length !== 3) return s
    return `${p[2]}/${p[1]}/${p[0]}`
  }

  const linhas: string[] = []
  linhas.push('Data de Competência;Data de Vencimento;Data de Pagamento;Valor;Categoria;Descrição;Cliente/Fornecedor;CNPJ/CPF Cliente/Fornecedor;Centro de Custo;Observações')

  for (const c of contas) {
    const competencia = fmtDate(c.emissao || c.vencimento)
    const vencimento  = fmtDate(c.vencimento)
    const pagamento   = ''
    const valor       = (-Math.abs(c.valor)).toFixed(2).replace('.', ',')
    const cat         = (categoria || '').replace(/;/g, ' ')
    const descricao   = `${c.fornecedor} - NF ${c.nf}`.replace(/;/g, ' ')
    const fornecedor  = (c.fornecedor || '').replace(/;/g, ' ')
    const cnpj        = (c.documento || '').replace(/;/g, ' ')
    const centro      = ''
    const obs         = c.nf ? `NF ${c.nf}` : ''
    linhas.push([competencia, vencimento, pagamento, valor, cat, descricao, fornecedor, cnpj, centro, obs].join(';'))
  }

  const csv = '﻿' + linhas.join('\r\n')
  const bytes = Buffer.from(csv, 'utf-8')

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contaazul_importacao.csv"`,
    }
  })
}
