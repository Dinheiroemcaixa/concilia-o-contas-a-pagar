import * as XLSX from 'xlsx'

export interface ContaPagar {
  empresa:    string
  nf:         string
  fornecedor: string
  documento:  string
  emissao:    string | null
  vencimento: string
  valor:      number
}

function excelDateToISO(val: any): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  if (typeof val === 'number') {
    // Número serial do Excel → Date
    const date = XLSX.SSF.parse_date_code(val)
    if (!date) return null
    const y = date.y
    const m = String(date.m).padStart(2, '0')
    const d = String(date.d).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'string' && val.includes('/')) {
    // Formato dd/mm/aaaa
    const [d, m, y] = val.split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return String(val)
}

export function parseDatacarBuffer(buffer: ArrayBuffer): { empresa: string; contas: ContaPagar[] } {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Empresa: linha 0, coluna 0
  const empresa = String(rows[0]?.[0] || '').trim()

  const contas: ContaPagar[] = []

  for (let i = 10; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c: any) => c === null || c === '')) continue

    const nfRaw = row[0]
    if (nfRaw === null || nfRaw === undefined) continue

    const nfStr = String(nfRaw).trim()

    // Ignora cabeçalhos e totalizadores
    const ignorar = ['NF', 'TOTAIS DO DIA', 'TOTAIS EMPRESA', 'TOTAIS GERAIS', '1/1']
    if (ignorar.includes(nfStr.toUpperCase())) continue
    if (nfStr.toLowerCase().includes('totais')) continue
    // Ignora linhas que são código de empresa (sem números)
    if (nfStr && !/\d/.test(nfStr)) continue

    const emissao  = row[8]
    const fornec   = row[13]
    const doc      = row[16]
    const vencim   = row[19]
    const valor    = row[23]

    if (valor === null || fornec === null || vencim === null) continue

    const vencStr = excelDateToISO(vencim)
    if (!vencStr) continue

    contas.push({
      empresa,
      nf:         nfStr,
      fornecedor: String(fornec).trim(),
      documento:  doc ? String(doc).trim() : '',
      emissao:    excelDateToISO(emissao),
      vencimento: vencStr,
      valor:      typeof valor === 'number' ? valor : parseFloat(String(valor))
    })
  }

  return { empresa, contas }
}
