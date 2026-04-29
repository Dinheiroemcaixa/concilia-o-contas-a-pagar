import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiPost, renovarToken } from '@/lib/contaazul'
import { salvarImportacao, buscarTokensSessao, salvarTokensSessao } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session.sessionId) {
    return NextResponse.json({ erro: 'Nao autenticado. Faca login primeiro.' }, { status: 401 })
  }

  let tokens = await buscarTokensSessao(session.sessionId)
  if (!tokens) {
    return NextResponse.json({ erro: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
  }

  if (tokens.token_expiry && new Date() >= new Date(new Date(tokens.token_expiry).getTime() - 5 * 60 * 1000)) {
    try {
      const novosTokens = await renovarToken(tokens.refresh_token!)
      const novoId = await salvarTokensSessao({
        access_token:  novosTokens.access_token,
        refresh_token: novosTokens.refresh_token || tokens.refresh_token,
        expires_in:    novosTokens.expires_in
      })
      session.sessionId = novoId
      await session.save()
      tokens = await buscarTokensSessao(novoId)
      if (!tokens) return NextResponse.json({ erro: 'Erro ao renovar sessao.' }, { status: 401 })
    } catch {
      return NextResponse.json({ erro: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
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
    if (conta.emissao)       payload.competence_date      = conta.emissao
    if (categoria_id)        payload.category_id          = categoria_id
    if (conta_financeira_id) payload.financial_account_id = conta_financeira_id
    if (conta.documento)     payload.document_number      = conta.documento

    const { data, status } = await apiPost(tokens.access_token, '/financial/v1/payable', payload)

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
