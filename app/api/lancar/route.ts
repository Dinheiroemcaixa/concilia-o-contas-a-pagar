import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiPost, renovarToken } from '@/lib/contaazul'
import { salvarImportacao } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session.accessToken) {
    return NextResponse.json({ erro: 'Não autenticado. Faça login primeiro.' }, { status: 401 })
  }

  // Renova token se necessário
  if (session.tokenExpiry && new Date() >= new Date(new Date(session.tokenExpiry).getTime() - 5 * 60 * 1000)) {
    try {
      const tokens = await renovarToken(session.refreshToken!)
      session.accessToken  = tokens.access_token
      session.refreshToken = tokens.refresh_token || session.refreshToken
      session.tokenExpiry  = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await session.save()
    } catch {
      return NextResponse.json({ erro: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
    }
  }

  const body = await req.json()
  const { contas, categoria_id, conta_financeira_id } = body

  if (!contas?.length) {
    return NextResponse.json({ erro: 'Nenhuma conta selecionada' }, { status: 400 })
  }

  const resultados = []

  for (const conta of contas) {
    const payload: Record<string, any> = {
      description: `${conta.fornecedor} - NF ${conta.nf}`,
      amount:      conta.valor,
      due_date:    conta.vencimento,
    }
    if (conta.emissao)          payload.competence_date        = conta.emissao
    if (categoria_id)           payload.category_id            = categoria_id
    if (conta_financeira_id)    payload.financial_account_id   = conta_financeira_id
    if (conta.documento)        payload.document_number        = conta.documento

    const { data, status } = await apiPost(session.accessToken!, '/financial/v1/payable', payload)

    resultados.push({
      fornecedor:  conta.fornecedor,
      nf:          conta.nf,
      valor:       conta.valor,
      status:      status === 200 || status === 201 ? 'ok' : 'erro',
      http_status: status,
      detalhe:     data,
    })
  }

  const ok    = resultados.filter(r => r.status === 'ok').length
  const erros = resultados.filter(r => r.status === 'erro').length

  // Salva histórico no Supabase
  await salvarImportacao({
    empresa:      contas[0]?.empresa || '',
    total_contas: contas.length,
    total_valor:  contas.reduce((s: number, c: any) => s + c.valor, 0),
    ok,
    erros,
    detalhes:     resultados,
  })

  return NextResponse.json({ total: resultados.length, ok, erros, resultados })
}
