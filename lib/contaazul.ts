// Configurações e helpers da API ContaAzul

export const CA_CLIENT_ID     = process.env.CONTAAZUL_CLIENT_ID!
export const CA_CLIENT_SECRET = process.env.CONTAAZUL_CLIENT_SECRET!
export const CA_REDIRECT_URI  = process.env.CONTAAZUL_REDIRECT_URI!

export const CA_AUTH_URL  = 'https://auth.contaazul.com/oauth2/authorize'
export const CA_TOKEN_URL = 'https://auth.contaazul.com/oauth2/token'
export const CA_API_BASE  = 'https://api-v2.contaazul.com'
export const CA_SCOPES    = 'openid profile aws.cognito.signin.user.admin'

function authHeader() {
  const cred = Buffer.from(`${CA_CLIENT_ID}:${CA_CLIENT_SECRET}`).toString('base64')
  return { Authorization: `Basic ${cred}` }
}

export async function trocarCodigoPorToken(code: string) {
  const res = await fetch(CA_TOKEN_URL, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: CA_REDIRECT_URI,
      client_id:    CA_CLIENT_ID,
    })
  })
  if (!res.ok) throw new Error(`Erro ao obter token: ${await res.text()}`)
  return res.json()
}

export async function renovarToken(refreshToken: string) {
  const res = await fetch(CA_TOKEN_URL, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CA_CLIENT_ID,
    })
  })
  if (!res.ok) throw new Error('Falha ao renovar token')
  return res.json()
}

export async function apiGet(accessToken: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${CA_API_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  })
  return { data: res.ok ? await res.json() : null, status: res.status }
}

export async function apiPost(accessToken: string, path: string, body: object) {
  const res = await fetch(`${CA_API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  let data: any
  try { data = await res.json() } catch { data = { raw: await res.text() } }
  return { data, status: res.status }
}
