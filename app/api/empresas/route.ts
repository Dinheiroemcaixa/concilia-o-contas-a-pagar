import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

// GET - lista empresas cadastradas
export async function GET() {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { data, error } = await supabase.from('empresas_clientes').select('id, nome, cnpj, razao_social, nome_fantasia').order('nome')
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST - cadastra nova empresa (com busca de CNPJ se fornecido)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })

  const { nome, cnpj } = await req.json()

  let nomeEmpresa = nome?.trim() || ''
  let razaoSocial = ''
  let nomeFantasia = ''
  let cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : ''

  // Se CNPJ informado, busca dados na ReceitaWS
  if (cnpjLimpo && cnpjLimpo.length === 14) {
    try {
      const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        headers: { 'Accept': 'application/json' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status !== 'ERROR') {
          razaoSocial   = data.nome || ''
          nomeFantasia  = data.fantasia || ''
          if (!nomeEmpresa) {
            nomeEmpresa = nomeFantasia || razaoSocial
          }
        }
      }
    } catch (_) {}
  }

  if (!nomeEmpresa) return NextResponse.json({ erro: 'Informe o nome ou CNPJ da empresa' }, { status: 400 })

  // Gera ID a partir do nome
  const id = nomeEmpresa.toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

  const { error } = await supabase.from('empresas_clientes').upsert({
    id,
    nome: nomeEmpresa,
    cnpj: cnpjLimpo || null,
    razao_social: razaoSocial || null,
    nome_fantasia: nomeFantasia || null,
  })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ id, nome: nomeEmpresa, cnpj: cnpjLimpo, razao_social: razaoSocial, nome_fantasia: nomeFantasia })
}

// DELETE - remove empresa e seus fornecedores
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.appUsuario) return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
  const { id } = await req.json()
  await supabase.from('fornecedores').delete().eq('empresa_id', id)
  await supabase.from('empresas_clientes').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
