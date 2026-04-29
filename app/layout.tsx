import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Datacar → ContaAzul | Contas a Pagar',
  description: 'Importe contas a pagar do Datacar direto no ContaAzul',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
