import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buscarTokensSessao } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session.sessionId) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const tokens = await buscarTokensSessao(session.sessionId)
  if (!tokens) return NextResponse.json({ erro: 'Sessao expirada' }, { status: 401 })

  const token = tokens.access_token
  const base = 'https://api-v2.contaazul.com'
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const resultados: Record<string, any> = {}

  // Testa endpoints que ja sabemos que funcionam
  const funcionam = [
    '/financial/v1/categories?type=EXPENSE',
    '/financial/v1/bank-accounts',
    '/financial/v1/payable?page=0&size=1',
  ]
  for (const ep of funcionam) {
    const res = await fetch(`${base}${ep}`, { headers: h })
    let body: any
    try { body = await res.json() } catch { body = await res.text() }
    resultados[ep] = { status: res.status, body: JSON.stringify(body).slice(0, 300) }
  }

  // Testa com header de empresa (diferentes formatos que a API pode aceitar)
  const empresaHeaders = [
    'X-Tenant-Id',
    'X-Company-Id', 
    'X-Empresa-Id',
    'tenant_id',
    'company_id',
  ]
  // Pega o primeiro resultado de categorias para extrair algum tenant_id se vier
  const resCat = await fetch(`${base}/financial/v1/categories?type=EXPENSE`, { headers: h })
  const catHeaders: Record<string, string> = {}
  resCat.headers.forEach((v, k) => { catHeaders[k] = v })
  resultados['response_headers_categorias'] = catHeaders

  return NextResponse.json(resultados)
}
