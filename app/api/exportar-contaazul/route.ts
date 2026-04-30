import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { normalizarFornecedor } from '@/lib/supabase'
import * as XLSX from 'xlsx'

function dateToExcelSerial(dateStr: string | null): number | null {
  if (!dateStr) return null
  try {
    let d: Date
    if (dateStr.includes('-')) {
      const [y, m, day] = dateStr.split('-').map(Number)
      d = new Date(y, m - 1, day)
    } else if (dateStr.includes('/')) {
      const [day, m, y] = dateStr.split('/').map(Number)
      d = new Date(y, m - 1, day)
    } else return null
    // Serial do Excel: dias desde 30/12/1899 (compativel com Excel/ContaAzul)
    const base = new Date(1899, 11, 30)
    const diff = Math.round((d.getTime() - base.getTime()) / 86400000)
    return diff
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) {
    return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { contas, categoria, empresa_id } = body
  const eid = empresa_id || 'default'

  if (!contas?.length) {
    return NextResponse.json({ erro: 'Nenhuma conta selecionada' }, { status: 400 })
  }

  const wb = XLSX.utils.book_new()

  // === Aba Dados ===
  const dadosRows: any[][] = []

  // Cabecalho identico ao modelo
  dadosRows.push([
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
    const serialComp = dateToExcelSerial(c.emissao || c.vencimento)
    const serialVenc = dateToExcelSerial(c.vencimento)
    const valor = -Math.abs(c.valor)
    // Observacoes: NF + documento (parcela)
    const docInfo = c.documento ? `NF ${c.nf} - Doc ${c.documento}` : (c.nf ? `NF ${c.nf}` : '')

    const nomeFornecedor = await normalizarFornecedor(c.fornecedor || '', eid)
    dadosRows.push([
      serialComp,
      serialVenc,
      '',            // Data pagamento vazio = Em Aberto
      valor,
      categoria || '',
      `${nomeFornecedor} - NF ${c.nf}`,
      nomeFornecedor,
      '',            // CNPJ/CPF vazio - ContaAzul so aceita CPF/CNPJ validos
      '',
      docInfo,
    ])
  }

  const wsDados = XLSX.utils.aoa_to_sheet(dadosRows)

  // Aplica formato de data nas colunas 0, 1 (A e B) para todas as linhas de dados
  const dateFormat = 'DD/MM/YYYY'
  for (let i = 1; i < dadosRows.length; i++) {
    const cellA = XLSX.utils.encode_cell({ r: i, c: 0 })
    const cellB = XLSX.utils.encode_cell({ r: i, c: 1 })
    if (wsDados[cellA] && dadosRows[i][0]) {
      wsDados[cellA].t = 'n'
      wsDados[cellA].z = dateFormat
    }
    if (wsDados[cellB] && dadosRows[i][1]) {
      wsDados[cellB].t = 'n'
      wsDados[cellB].z = dateFormat
    }
  }

  XLSX.utils.book_append_sheet(wb, wsDados, 'Dados')

  // === Aba Orientações (igual ao modelo) ===
  const orientacoesRows = [
    ['Orientações de preenchimento da planilha:'],
    ['* A data de pagamento precisa ser igual ou inferior a data de hoje, caso a mesma seja superior ao dia de hoje o lançamento será importado com o status: "Em Aberto".'],
    ['* Não utilizar caracteres especiais, como por exemplo: \' " ! @ #  %  ¨  &  *  (  )  ª  º  §  + _  - ? ° [ { } ] : ;'],
    ['* Cole as informações planilha utilizando a função "Colar Especial > Colar Valores" para não perder a formatação padrão das células;'],
    ['* Verificar se não ficou espaços entre os dados informados, principalmente quando as informações são coladas;'],
    ['* As células não podem conter fórmulas;'],
  ]
  const wsOrientacoes = XLSX.utils.aoa_to_sheet(orientacoesRows)
  XLSX.utils.book_append_sheet(wb, wsOrientacoes, 'Orientações')

  // Gera XLS (Excel 97-2003) - formato OLE2 identico ao modelo
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xls' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': 'attachment; filename="contaazul_importacao.xls"',
    }
  })
}
