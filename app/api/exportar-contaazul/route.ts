import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import * as XLSX from 'xlsx'

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

  // Monta os dados no formato exato do modelo ContaAzul
  const rows: any[][] = []

  // Cabecalho igual ao modelo original
  rows.push([
    'Data de Competência',
    'Data de Vencimento',
    'Data de Pagamento',
    'Valor',
    'Categoria',
    'Descrição',
    'Cliente/Fornecedor',
    'CNPJ/CPF Cliente/Fornecedor',
    'Centro de Custo',
    'Observações'
  ])

  for (const c of contas) {
    rows.push([
      fmtDate(c.emissao || c.vencimento),  // Data de Competencia
      fmtDate(c.vencimento),                // Data de Vencimento
      '',                                   // Data de Pagamento (vazio = nao baixado)
      -Math.abs(c.valor),                   // Valor negativo = despesa
      categoria || '',                      // Categoria
      `${c.fornecedor} - NF ${c.nf}`,      // Descricao
      c.fornecedor || '',                   // Cliente/Fornecedor
      c.documento || '',                    // CNPJ/CPF
      '',                                   // Centro de Custo
      c.nf ? `NF ${c.nf}` : '',            // Observacoes
    ])
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')

  // Gera no formato XLS (Excel 97-2003) exatamente como o modelo
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xls' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': 'attachment; filename="contaazul_importacao.xls"',
    }
  })
}
