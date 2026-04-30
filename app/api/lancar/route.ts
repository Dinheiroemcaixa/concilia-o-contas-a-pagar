import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiPost, renovarToken } from '@/lib/contaazul'
import { salvarImportacao, buscarTokensSessao, salvarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

async function rpc(fn: string, params: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

async function buscarTokenEmpresa(empresaId: string) {
  const { ok, data } = await rpc('buscar_token_empresa', { p_empresa_id: empresaId })
  if (!ok || !Array.isArray(data) || data.length === 0) return null
  return data[0] as { access_token: string; refresh_token: string; token_expiry: string }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario && !session.sessionId) {
    return NextResponse.json({ erro: 'Nao autenticado. Faca login primeiro.' }, { status: 401 })
  }

  const body = await req.json()
  const { contas, categoria_id, conta_financeira_id, empresa_id } = body

  if (!contas?.length) return NextResponse.json({ erro: 'Nenhuma conta selecionada' }, { status: 400 })

  // Busca token: primeiro tenta da empresa específica, depois o token global da sessão
  let accessToken: string | null = null

  if (empresa_id) {
    const tokenEmp = await buscarTokenEmpresa(empresa_id)
    if (tokenEmp) {
      // Renova se necessário
      if (tokenEmp.token_expiry && new Date() >= new Date(new Date(tokenEmp.token_expiry).getTime() - 5 * 60 * 1000)) {
        try {
          const novos = await renovarToken(tokenEmp.refresh_token)
          await rpc('salvar_token_empresa', {
            p_empresa_id:    empresa_id,
            p_access_token:  novos.access_token,
            p_refresh_token: novos.refresh_token || tokenEmp.refresh_token,
            p_expires_in:    novos.expires_in || 3600,
          })
          accessToken = novos.access_token
        } catch {
          return NextResponse.json({ erro: 'Token da empresa expirado. Reconecte ao ContaAzul.' }, { status: 401 })
        }
      } else {
        accessToken = tokenEmp.access_token
      }
    }
  }

  // Fallback: token global da sessão
  if (!accessToken && session.sessionId) {
    let tokens = await buscarTokensSessao(session.sessionId)
    if (!tokens) return NextResponse.json({ erro: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
    if (tokens.token_expiry && new Date() >= new Date(new Date(tokens.token_expiry).getTime() - 5 * 60 * 1000)) {
      try {
        const novos = await renovarToken(tokens.refresh_token!)
        const novoId = await salvarTokensSessao({ access_token: novos.access_token, refresh_token: novos.refresh_token || tokens.refresh_token, expires_in: novos.expires_in })
        session.sessionId = novoId
        await session.save()
        tokens = await buscarTokensSessao(novoId)
        if (!tokens) return NextResponse.json({ erro: 'Erro ao renovar sessao.' }, { status: 401 })
      } catch {
        return NextResponse.json({ erro: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
      }
    }
    accessToken = tokens.access_token
  }

  if (!accessToken) return NextResponse.json({ erro: 'Empresa nao conectada ao ContaAzul. Clique em "Conectar" na aba Fornecedores.' }, { status: 401 })

  const resultados = []
  for (const conta of contas) {
    const payload: Record<string, any> = {
      description: `${conta.fornecedor} - NF ${conta.nf}`,
      amount:      conta.valor,
      due_date:    conta.vencimento,
    }
    if (conta.emissao)         payload.competence_date      = conta.emissao
    if (categoria_id)          payload.category_id          = categoria_id
    if (conta_financeira_id)   payload.financial_account_id = conta_financeira_id
    if (conta.documento)       payload.document_number      = conta.documento

    const { data, status } = await apiPost(accessToken, '/financial/v1/payable', payload)
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
    ok, erros, detalhes: resultados,
  })

  return NextResponse.json({ total: resultados.length, ok, erros, resultados })
}
