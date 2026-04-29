import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Salva um registro de importação no histórico
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
