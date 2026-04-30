import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function salvarTokensSessao(tokens: {
  access_token: string
  refresh_token?: string
  expires_in?: number
}): Promise<string> {
  const id = crypto.randomBytes(16).toString('hex')
  const expiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  const { error } = await supabase.from('sessoes').insert({
    id,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry:  expiry,
    atualizado_em: new Date().toISOString()
  })

  if (error) throw new Error('Erro ao salvar sessao: ' + error.message)
  return id
}

export async function buscarTokensSessao(sessionId: string) {
  const { data, error } = await supabase
    .from('sessoes')
    .select('access_token, refresh_token, token_expiry')
    .eq('id', sessionId)
    .single()

  if (error || !data) return null
  return data
}

export async function removerSessao(sessionId: string) {
  await supabase.from('sessoes').delete().eq('id', sessionId)
}

export async function salvarImportacao(dados: {
  empresa: string
  total_contas: number
  total_valor: number
  ok: number
  erros: number
  detalhes: object[]
}) {
  const { error } = await supabase.from('importacoes').insert({
    ...dados,
    criado_em: new Date().toISOString()
  })
  if (error) console.error('Erro ao salvar no Supabase:', error)
}

export async function buscarHistorico() {
  const { data, error } = await supabase
    .from('importacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50)
  if (error) return []
  return data
}

// Busca o nome correto do fornecedor no ContaAzul por similaridade
export async function normalizarFornecedor(nome: string, empresaId: string = 'default'): Promise<string> {
  const { data } = await supabase
    .from('fornecedores')
    .select('nome')
    .eq('empresa_id', empresaId)

  if (!data || data.length === 0) return nome

  const nomeUp = nome.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim()
  const palavras = nomeUp.split(/\s+/).filter((p: string) => p.length > 2)

  let melhor = { nome, score: 0 }

  for (const f of data) {
    const fUp = f.nome.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim()
    // Conta palavras em comum
    const fPalavras = fUp.split(/\s+/).filter((p: string) => p.length > 2)
    const comuns = palavras.filter(p => fPalavras.includes(p)).length
    const score = comuns / Math.max(palavras.length, fPalavras.length)
    if (score > melhor.score && score >= 0.5) {
      melhor = { nome: f.nome, score }
    }
  }

  return melhor.nome
}
