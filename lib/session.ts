import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  accessToken?:  string
  refreshToken?: string
  tokenExpiry?:  string
  oauthState?:   string
  empresaNome?:  string
  appUsuario?:   string
  appNome?:      string
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'senha-super-secreta-troque-isso-32chars!!',
  cookieName: 'datacar_ca_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8 // 8 horas
  }
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}
