import { NextRequest, NextResponse } from 'next/server'
import { parseDatacarBuffer } from '@/lib/parseDatacar'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const arquivo = formData.get('arquivo') as File | null

    if (!arquivo) {
      return NextResponse.json({ erro: 'Nenhum arquivo enviado' }, { status: 400 })
    }
    if (!arquivo.name.endsWith('.xlsx')) {
      return NextResponse.json({ erro: 'Envie um arquivo .xlsx' }, { status: 400 })
    }

    const buffer = await arquivo.arrayBuffer()
    const { empresa, contas } = parseDatacarBuffer(buffer)

    return NextResponse.json({
      empresa,
      contas,
      total: contas.length,
      totalValor: contas.reduce((s, c) => s + c.valor, 0)
    })
  } catch (e: any) {
    return NextResponse.json({ erro: `Erro ao ler planilha: ${e.message}` }, { status: 500 })
  }
}
