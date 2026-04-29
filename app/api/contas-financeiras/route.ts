import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { apiGet } from '@/lib/contaazul'

export async function GET() {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const { data, status } = await apiGet(session.accessToken, '/financial/v1/financial-accounts')
  return NextResponse.json(data ?? [], { status: data ? 200 : status })
}
