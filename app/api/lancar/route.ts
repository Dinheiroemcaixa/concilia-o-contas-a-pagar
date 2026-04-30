import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiPost, renovarToken } from '@/lib/contaazul'
import { salvarImportacao, buscarTokensSessao, salvarTokensSessao } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!

async function sbFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${SB_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      ...(opts.headers || {}),
    },
  })
}

async function buscarTokenEmpresa(empresaId: string) {
  const res = await sbFetch(`/rest/v1/rpc/buscar_token_empresa`, {
    method: 'POST',
    body: JSON.stringify({ p_empresa_id: empresaId }),
  })
  const data = await res.json()
  if (!res.ok || !Array.isArray(data) || data.length === 0) return null
  return data[0] as { access_token: string; refresh_token: string; token_expiry: string }
}

async function salvarTokenEmpresa(empresaId: string, tokens: { access_token: string; refresh_token: string; expires_in: number }) {
  await sbFetch(`/rest/v1/rpc/salvar_token_empresa`, {
    method: 'POST',
    body: JSON.stringify({
      p_access_token:  tokens.access_token,
      p_empresa_id:    empresaId,
      p_expires_in:    tokens.expires_in,
      p_refresh_token: tokens.refresh_token,
    }),
  })
}

function tokenExpirado(expiry: string | null) {
  if (!expiry) return true
  return new Date() >= new Date(new Date(expiry).getTime() - 5 * 60 * 1000)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario && !session.sessionId) {
    return NextResponse.json({ erro: 'Nao autenticado. Faca login primeiro.' }, { status: 401 })
  }

  const body = await req.json()
  const { contas, categoria_id, conta_financeira_id, empresa_id } = body

  if (!contas?.length) return NextResponse.json({ erro: 'Nenhuma conta selecionada' }, { status: 400 })

  let accessToken: string | null = null

  // 1. Tenta token específico da empresa
  if (empresa_id) {
    const tokenEmp = await buscarTokenEmpresa(empresa_id)
    if (tokenEmp) {
      if (tokenExpirado(tokenEmp.token_expiry)) {
        try {
          const novos = await renovarToken(tokenEmp.refresh_token)
          await salvarTokenEmpresa(empresa_id, {
            access_token:  novos.access_token,
            refresh_token: novos.refresh_token || tokenEmp.refresh_token,
            expires_in:    novos.expires_in || 3600,
          })
          accessToken = novos.access_token
        } catch (e: any) {
          console.error('Erro ao renovar token empresa:', e.message)
        }
      } else {
        accessToken = tokenEmp.access_token
      }
    }
  }

  // 2. Fallback: token global da sessão
  if (!accessToken && session.sessionId) {
    let tokens = await buscarTokensSessao(session.sessionId)
    if (!tokens) {
      return NextResponse.json({ erro: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
    }
    if (tokenExpirado(tokens.token_expiry)) {
      try {
        const novos = await renovarToken(tokens.refresh_token!)
        const novoId = await salvarTokensSessao({
          access_token:  novos.access_token,
          refresh_token: novos.refresh_token || tokens.refresh_token,
          expires_in:    novos.expires_in || 3600,
        })
        session.sessionId = novoId
        await session.save()
        tokens = await buscarTokensSessao(novoId)
        if (!tokens) return NextResponse.json({ erro: 'Erro ao renovar sessao.' }, { status: 401 })
      } catch (e: any) {
        console.error('Erro ao renovar token sessao:', e.message)
        return NextResponse.json({ erro: 'Token expirado. Faca logout e login novamente.' }, { status: 401 })
      }
    }
    accessToken = tokens!.access_token
  }

  if (!accessToken) {
    return NextResponse.json({ erro: 'Empresa nao conectada ao ContaAzul. Clique em "Conectar" na aba Fornecedores.' }, { status: 401 })
  }

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

    const { data, status } = await apiPost(accessToken, '/v1/payables', payload)
    const sucesso = status === 200 || status === 201
    if (!sucesso) {
      console.error(`Erro ContaAzul [${status}] para ${conta.fornecedor}:`, JSON.stringify(data))
    }
    resultados.push({
      fornecedor:  conta.fornecedor,
      nf:          conta.nf,
      valor:       conta.valor,
      status:      sucesso ? 'ok' : 'erro',
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
