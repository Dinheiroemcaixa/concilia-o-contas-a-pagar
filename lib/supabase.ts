import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Salva tokens OAuth no Supabase e retorna um sessionId pequeno para o cookie
export async function salvarTokensSessao(tokens: {
  access_token: string
  refresh_token?: string
  expires_in?: number
}): Promise<string> {
  const id = crypto.randomBytes(16).toString('hex')
  const expiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  const { error } = await supabase.from('sessoes').upsert({
    id,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry:  expiry,
    atualizado_em: new Date().to