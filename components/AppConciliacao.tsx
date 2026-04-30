'use client'

import { useEffect, useState, useRef } from 'react'
import '../app/datacar.css'

interface Conta {
  empresa: string
  nf: string
  fornecedor: string
  documento: string
  emissao: string | null
  vencimento: string
  valor: number
}

interface Resultado {
  fornecedor: string
  nf: string
  valor: number
  status: string
}

interface Msg {
  tipo: string
  txt: string
}

interface Resumo {
  ok: number
  erros: number
}

function getMsgBg(tipo: string): string {
  if (tipo === 'ok') return 'var(--badge-ok)'
  if (tipo === 'erro') return 'rgba(220,38,38,0.1)'
  return 'rgba(91,94,244,0.08)'
}
function getMsgBorderColor(tipo: string): string {
  if (tipo === 'ok') return '#16a34a'
  if (tipo === 'erro') return '#dc2626'
  return '#5b5ef4'
}
function getMsgColor(tipo: string): string {
  if (tipo === 'ok') return 'var(--badge-ok-text)'
  if (tipo === 'erro') return '#dc2626'
  return '#5b5ef4'
}
function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(s: string | null): string {
  if (!s) return '—'
  const p = s.split('-')
  if (p.length !== 3) return s
  return p[2] + '/' + p[1] + '/' + p[0]
}

const iconFile = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const iconFileSm = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const iconSun = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const iconMoon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
)
const iconUpload = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const iconCheck = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M5 12l5 5L20 7"/>
  </svg>
)

interface TelaAuthProps {
  isDark: boolean
  toggleTema: () => void
  onLogin: (usuario: string, nome: string) => void
}

function TelaAuth(props: TelaAuthProps) {
  const [tela, setTela] = useState<'login' | 'cadastro'>('login')
  const [carregando, setCarregando] = useState<boolean>(false)
  const [loginUser, setLoginUser] = useState<string>('')
  const [loginPass, setLoginPass] = useState<string>('')
  const [loginErro, setLoginErro] = useState<string>('')
  const [cadNome, setCadNome] = useState<string>('')
  const [cadUser, setCadUser] = useState<string>('')
  const [cadPass, setCadPass] = useState<string>('')
  const [cadPass2, setCadPass2] = useState<string>('')
  const [cadErro, setCadErro] = useState<string>('')
  const [cadOk, setCadOk] = useState<string>('')

  async function handleLogin() {
    if (!loginUser || !loginPass) { setLoginErro('Preencha usuario e senha.'); return }
    setCarregando(true); setLoginErro('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: loginUser, senha: loginPass }),
      })
      const data = await res.json()
      if (data.erro) { setLoginErro(data.erro) } else {
        props.onLogin(data.usuario, data.nome || data.usuario)
      }
    } catch (_) { setLoginErro('Erro de conexao. Tente novamente.') }
    setCarregando(false)
  }

  async function handleCadastro() {
    setCadErro(''); setCadOk('')
    if (!cadNome || !cadUser || !cadPass || !cadPass2) { setCadErro('Preencha todos os campos.'); return }
    if (cadPass !== cadPass2) { setCadErro('As senhas nao coincidem.'); return }
    if (cadPass.length < 6) { setCadErro('Senha deve ter ao menos 6 caracteres.'); return }
    setCarregando(true)
    try {
      const res = await fetch('/api/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: cadNome, usuario: cadUser, senha: cadPass }),
      })
      const data = await res.json()
      if (data.erro) { setCadErro(data.erro) } else {
        setCadOk('Cadastro realizado! Faca login agora.')
        setCadNome(''); setCadUser(''); setCadPass(''); setCadPass2('')
        setTimeout(function () { setTela('login') }, 1500)
      }
    } catch (_) { setCadErro('Erro de conexao. Tente novamente.') }
    setCarregando(false)
  }

  return (
    <div className={'dc-app' + (props.isDark ? ' dc-dark' : '')}>
      <div className="dc-thm">
        <div className="dc-icon-btn" onClick={props.toggleTema} title="Alternar tema">{props.isDark ? iconSun : iconMoon}</div>
      </div>
      <div className="dc-lw">
        <div className="dc-lc">
          <div className="dc-ll"><div className="dc-li">{iconFile}</div></div>
          <div className="dc-lt">Conciliação Contas a Pagar</div>
          {tela === 'login' && (
            <div>
              <div className="dc-ls">Faca login para continuar</div>
              <label className="dc-llbl">Usuario</label>
              <input className="dc-linp" type="text" placeholder="seu.usuario" value={loginUser} onChange={e => setLoginUser(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} />
              <label className="dc-llbl">Senha</label>
              <input className="dc-linp" type="password" placeholder="..." value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} />
              <button className="dc-lbtn" onClick={handleLogin} disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
              {loginErro && <div className="dc-lerro">{loginErro}</div>}
              <div className="dc-lsep">Nao tem conta?</div>
              <button className="dc-lbtn2" onClick={() => { setTela('cadastro'); setLoginErro('') }}>Criar conta</button>
            </div>
          )}
          {tela === 'cadastro' && (
            <div>
              <div className="dc-ls">Crie sua conta de acesso</div>
              <label className="dc-llbl">Nome completo</label>
              <input className="dc-linp" type="text" placeholder="Seu Nome" value={cadNome} onChange={e => setCadNome(e.target.value)} />
              <label className="dc-llbl">Usuario</label>
              <input className="dc-linp" type="text" placeholder="seu.usuario" value={cadUser} onChange={e => setCadUser(e.target.value)} />
              <label className="dc-llbl">Senha</label>
              <input className="dc-linp" type="password" placeholder="Minimo 6 caracteres" value={cadPass} onChange={e => setCadPass(e.target.value)} />
              <label className="dc-llbl">Confirmar senha</label>
              <input className="dc-linp" type="password" placeholder="Repita a senha" value={cadPass2} onChange={e => setCadPass2(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCadastro() }} />
              <button className="dc-lbtn" onClick={handleCadastro} disabled={carregando}>{carregando ? 'Cadastrando...' : 'Criar conta'}</button>
              {cadErro && <div className="dc-lerro">{cadErro}</div>}
              {cadOk && <div className="dc-lok">{cadOk}</div>}
              <div className="dc-lsep">Ja tem conta?</div>
              <button className="dc-lbtn2" onClick={() => { setTela('login'); setCadErro(''); setCadOk('') }}>Voltar ao login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AppConciliacao() {
  const [logado, setLogado] = useState<boolean>(false)
  const [usuarioAtual, setUsuarioAtual] = useState<string>('')
  const [nomeAtual, setNomeAtual] = useState<string>('')
  const [tema, setTema] = useState<string>('light')
  const [contas, setContas] = useState<Conta[]>([])
  const [empresa, setEmpresa] = useState<string>('')
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [categorias, setCategorias] = useState<any[]>([])
  const [contasFin, setContasFin] = useState<any[]>([])
  const [catId, setCatId] = useState<string>('')
  const [contaFinId, setContaFinId] = useState<string>('')
  const [uploadMsg, setUploadMsg] = useState<Msg | null>(null)
  const [lancando, setLancando] = useState<boolean>(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [drag, setDrag] = useState<boolean>(false)
  const [historico, setHistorico] = useState<any[]>([])
  const [abaAtiva, setAbaAtiva] = useState<string>('importar')
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [empresasClientes, setEmpresasClientes] = useState<any[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('')
  const [empresaLancamento, setEmpresaLancamento] = useState<string>('')
  const [novaEmpresaNome, setNovaEmpresaNome] = useState<string>('')
  const [novaEmpresaCnpj, setNovaEmpresaCnpj] = useState<string>('')
  const [xmlMsg, setXmlMsg] = useState<string>('')
  const [xmlOk, setXmlOk] = useState<boolean>(false)
  const [empMsg, setEmpMsg] = useState<string>('')
  const [conexoes, setConexoes] = useState<Record<string, boolean>>({})
  const xmlRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregarOpcoes(empresaId?: string) {
    try {
      const eid = empresaId || empresaLancamento
      const rc = await fetch('/api/categorias' + (eid ? `?empresa_id=${eid}` : ''), { credentials: 'include' })
      const cats = await rc.json()
      const rf = await fetch('/api/contas-financeiras' + (eid ? `?empresa_id=${eid}` : ''), { credentials: 'include' })
      const cfs = await rf.json()
      if (Array.isArray(cats)) setCategorias(cats)
      if (Array.isArray(cfs)) setContasFin(cfs)
    } catch (_) {}
  }

  async function verificarConexoes(empresas: any[]) {
    const novas: Record<string, boolean> = {}
    await Promise.all(empresas.map(async (e) => {
      try {
        const res = await fetch(`/api/empresa-token?empresa_id=${e.id}`, { credentials: 'include' })
        const data = await res.json()
        novas[e.id] = data.conectada === true
      } catch (_) { novas[e.id] = false }
    }))
    setConexoes(novas)
  }

  async function carregarEmpresas() {
    try {
      const res = await fetch('/api/empresas', { credentials: 'include' })
      const data = await res.json()
      if (Array.isArray(data)) {
        setEmpresasClientes(data)
        if (data.length > 0 && !empresaSelecionada) setEmpresaSelecionada(data[0].id)
        if (data.length > 0 && !empresaLancamento) setEmpresaLancamento(data[0].id)
        verificarConexoes(data)
      }
    } catch (_) {}
  }

  async function carregarHistorico() {
    try {
      const res = await fetch('/api/historico', { credentials: 'include' })
      const data = await res.json()
      if (Array.isArray(data)) setHistorico(data)
    } catch (_) {}
  }

  useEffect(function () {
    carregarEmpresas()
    fetch('/api/auth/me-app', { credentials: 'include' }).then(r => r.json()).then(d => {
      if (d.logado) { setLogado(true); setUsuarioAtual(d.usuario); setNomeAtual(d.nome || d.usuario) }
    }).catch(() => {})
    const params = new URLSearchParams(window.location.search)
    const erro = params.get('erro')
    const conectado = params.get('conectado')
    if (erro) setUploadMsg({ tipo: 'erro', txt: decodeURIComponent(erro) })
    if (conectado) {
      setUploadMsg({ tipo: 'ok', txt: 'Empresa conectada ao ContaAzul com sucesso!' })
      window.history.replaceState({}, '', '/')
      setAbaAtiva('fornecedores')
    }
    try { setTema(localStorage.getItem('tema') || 'light') } catch (_) {}
  }, [])

  function toggleTema() {
    const novo = tema === 'light' ? 'dark' : 'light'
    setTema(novo)
    try { localStorage.setItem('tema', novo) } catch (_) {}
  }

  function handleAba(aba: string) {
    setAbaAtiva(aba)
    if (aba === 'historico') carregarHistorico()
    if (aba === 'fornecedores') { carregarEmpresas(); carregarFornecedores() }
    if (aba === 'importar') carregarEmpresas()
  }

  async function processarArquivo(file: File) {
    if (!file.name.endsWith('.xlsx')) { setUploadMsg({ tipo: 'erro', txt: 'Selecione um arquivo .xlsx gerado pelo Datacar.' }); return }
    setUploadMsg({ tipo: 'loading', txt: 'Lendo ' + file.name + '...' })
    const form = new FormData()
    form.append('arquivo', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (data.erro) { setUploadMsg({ tipo: 'erro', txt: data.erro }); return }
      setEmpresa(data.empresa); setContas(data.contas)
      const todos: Set<number> = new Set()
      for (let idx = 0; idx < data.contas.length; idx++) todos.add(idx)
      setSelecionadas(todos)
      setUploadMsg({ tipo: 'ok', txt: data.total + ' contas carregadas — ' + data.empresa })
      setResultados(null)
    } catch (e: any) { setUploadMsg({ tipo: 'erro', txt: 'Erro: ' + e.message }) }
  }

  function toggleSel(i: number) {
    const n: Set<number> = new Set(selecionadas)
    if (n.has(i)) { n.delete(i) } else { n.add(i) }
    setSelecionadas(n)
  }

  function toggleTodas(v: boolean) {
    if (v) {
      const todos: Set<number> = new Set()
      for (let idx = 0; idx < contas.length; idx++) todos.add(idx)
      setSelecionadas(todos)
    } else setSelecionadas(new Set())
  }

  async function lancar() {
    if (selecionadas.size === 0) return
    if (!empresaLancamento) { setUploadMsg({ tipo: 'erro', txt: 'Selecione uma empresa cliente antes de lancar.' }); return }
    if (!conexoes[empresaLancamento]) { setUploadMsg({ tipo: 'erro', txt: 'Empresa nao conectada ao ContaAzul. Va em Fornecedores e clique em Conectar.' }); return }
    setLancando(true); setResultados(null)
    const payload: Conta[] = []
    selecionadas.forEach(i => { if (contas[i]) payload.push(contas[i]) })
    try {
      const res = await fetch('/api/lancar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contas: payload, categoria_id: catId, conta_financeira_id: contaFinId, empresa_id: empresaLancamento }),
      })
      const data = await res.json()
      if (data.erro) { setUploadMsg({ tipo: 'erro', txt: data.erro }); setLancando(false); return }
      setResultados(data.resultados); setResumo({ ok: data.ok, erros: data.erros })
    } catch (e: any) { setUploadMsg({ tipo: 'erro', txt: 'Erro: ' + e.message }) }
    setLancando(false)
  }

  async function cadastrarEmpresa() {
    if (!novaEmpresaNome.trim()) return
    setEmpMsg('')
    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nome: novaEmpresaNome, cnpj: novaEmpresaCnpj }),
      })
      const data = await res.json()
      if (data.erro) { setEmpMsg('Erro: ' + data.erro); return }
      setNovaEmpresaNome(''); setNovaEmpresaCnpj('')
      setEmpMsg('Empresa cadastrada: ' + data.nome)
      setEmpresaSelecionada(data.id)
      carregarEmpresas()
    } catch (e: any) { setEmpMsg('Erro: ' + e.message) }
  }

  async function removerEmpresa(id: string) {
    if (!confirm('Remover empresa e todos os fornecedores?')) return
    await fetch('/api/empresas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    })
    if (empresaSelecionada === id) setEmpresaSelecionada('')
    carregarEmpresas()
  }

  async function carregarFornecedores(eid?: string) {
    try {
      const res = await fetch('/api/fornecedores?empresa_id=' + (eid || empresaSelecionada), { credentials: 'include' })
      const data = await res.json()
      if (Array.isArray(data)) setFornecedores(data)
    } catch (_) {}
  }

  async function importarXML(file: File) {
    setXmlMsg('Lendo arquivo...'); setXmlOk(false)
    try {
      const text = await file.text()
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ xmlContent: text, empresa_id: empresaSelecionada }),
      })
      const data = await res.json()
      if (data.erro) { setXmlMsg('Erro: ' + data.erro); return }
      setXmlMsg(data.importados + ' fornecedores importados!')
      setXmlOk(true)
      carregarFornecedores()
    } catch (e: any) { setXmlMsg('Erro: ' + e.message) }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout-app', { method: 'POST', credentials: 'include' }).catch(() => {})
    setLogado(false); setUsuarioAtual(''); setNomeAtual('')
  }

  if (!logado) {
    return (
      <TelaAuth
        isDark={tema === 'dark'}
        toggleTema={toggleTema}
        onLogin={(u, n) => { setLogado(true); setUsuarioAtual(u); setNomeAtual(n) }}
      />
    )
  }

  const isDark = tema === 'dark'
  const initials = (nomeAtual || usuarioAtual).slice(0, 2).toUpperCase()
  let valorSel = 0
  selecionadas.forEach(i => { if (contas[i]) valorSel += contas[i].valor })
  let totalValor = 0
  for (let i = 0; i < contas.length; i++) totalValor += contas[i].valor

  const empresaConectada = empresaLancamento ? conexoes[empresaLancamento] === true : false

  return (
    <div className={'dc-app' + (isDark ? ' dc-dark' : '')}>
      <header className="dc-topbar">
        <div className="dc-logo">
          <div className="dc-logo-icon">{iconFileSm}</div>
          <div>
            <div className="dc-logo-name">Conciliação Contas a Pagar</div>
            <div className="dc-logo-sub">Importacao de Contas a Pagar</div>
          </div>
        </div>
        <div className="dc-topbar-right">
          <div className="dc-icon-btn" onClick={toggleTema} title="Alternar tema">{isDark ? iconSun : iconMoon}</div>
          <div className="dc-user-pill" onClick={handleLogout} title="Clique para sair">
            <div className="dc-user-av">{initials}</div>
            <span className="dc-user-nm">{nomeAtual || usuarioAtual}</span>
          </div>
        </div>
      </header>

      <div className="dc-tabs">
        <button className={'dc-tab' + (abaAtiva === 'importar' ? ' dc-tab-on' : '')} onClick={() => handleAba('importar')}>Importar planilha</button>
        <button className={'dc-tab' + (abaAtiva === 'historico' ? ' dc-tab-on' : '')} onClick={() => handleAba('historico')}>Historico</button>
        <button className={'dc-tab' + (abaAtiva === 'fornecedores' ? ' dc-tab-on' : '')} onClick={() => handleAba('fornecedores')}>Fornecedores</button>
      </div>

      <div className="dc-content">

        {/* ABA HISTORICO */}
        {abaAtiva === 'historico' && (
          <div className="dc-card">
            <div className="dc-ct">Historico de importacoes</div>
            {historico.length === 0 && <p style={{ color: 'var(--text3)', fontSize: '13px' }}>Nenhuma importacao registrada ainda.</p>}
            {historico.length > 0 && (
              <div className="dc-tw">
                <table className="dc-tbl">
                  <thead className="dc-thead">
                    <tr>
                      <th className="dc-th">Data</th><th className="dc-th">Empresa</th>
                      <th className="dc-th">Contas</th><th className="dc-th">Valor Total</th>
                      <th className="dc-th">OK</th><th className="dc-th">Erros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h, i) => (
                      <tr key={i}>
                        <td className="dc-td">{new Date(h.criado_em).toLocaleString('pt-BR')}</td>
                        <td className="dc-td">{h.empresa}</td>
                        <td className="dc-td">{h.total_contas}</td>
                        <td className="dc-td" style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmtMoeda(h.total_valor)}</td>
                        <td className="dc-td" style={{ color: 'var(--success)', fontWeight: 600 }}>{h.ok}</td>
                        <td className="dc-td" style={{ fontWeight: 600 }}>{h.erros}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA FORNECEDORES */}
        {abaAtiva === 'fornecedores' && (
          <div className="dc-card">
            <div className="dc-ct">Empresas Clientes</div>

            {/* Cadastrar empresa */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: '13px', marginBottom: '10px' }}>Cadastrar nova empresa cliente</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <div className="dc-fl">CNPJ</div>
                  <input className="dc-linp" style={{ width: '160px', marginBottom: 0 }} type="text" placeholder="00.000.000/0001-00" value={novaEmpresaCnpj} onChange={e => setNovaEmpresaCnpj(e.target.value)} />
                </div>
                <div>
                  <div className="dc-fl">Nome da empresa</div>
                  <input className="dc-linp" style={{ width: '220px', marginBottom: 0 }} type="text" placeholder="Nome da empresa" value={novaEmpresaNome} onChange={e => setNovaEmpresaNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') cadastrarEmpresa() }} />
                </div>
                <button className="dc-btn-g" onClick={cadastrarEmpresa}>Cadastrar</button>
              </div>
              {empMsg && <div style={{ fontSize: '12px', color: empMsg.startsWith('Erro') ? '#dc2626' : 'var(--success)', marginTop: '6px' }}>{empMsg}</div>}
            </div>

            {/* Lista de empresas com botão Conectar */}
            {empresasClientes.length > 0 && (
              <div className="dc-tw" style={{ marginBottom: '20px' }}>
                <table className="dc-tbl">
                  <thead className="dc-thead">
                    <tr>
                      <th className="dc-th">Empresa</th>
                      <th className="dc-th">CNPJ</th>
                      <th className="dc-th">Status ContaAzul</th>
                      <th className="dc-th">Fornecedores XML</th>
                      <th className="dc-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresasClientes.map(e => (
                      <tr key={e.id} style={{ background: empresaSelecionada === e.id ? 'rgba(91,94,244,0.06)' : undefined }}>
                        <td className="dc-td" style={{ fontWeight: 600 }}>{e.nome}</td>
                        <td className="dc-td" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {e.cnpj ? e.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'}
                        </td>
                        <td className="dc-td">
                          {conexoes[e.id]
                            ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '12px' }}>✓ Conectada</span>
                            : <a href={`/api/auth?empresa_id=${e.id}`} style={{ display: 'inline-block', background: 'var(--accent)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                                Conectar ao ContaAzul
                              </a>
                          }
                        </td>
                        <td className="dc-td">
                          <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => { setEmpresaSelecionada(e.id); carregarFornecedores(e.id) }}>
                            Ver fornecedores
                          </button>
                        </td>
                        <td className="dc-td">
                          <button style={{ fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removerEmpresa(e.id)}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Importar XML de fornecedores */}
            {empresaSelecionada && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text1)', marginBottom: '8px' }}>
                  Fornecedores do ContaAzul — {empresasClientes.find(e => e.id === empresaSelecionada)?.nome || empresaSelecionada}
                </div>
                <p style={{ color: 'var(--text2)', fontSize: '12px', marginBottom: '10px' }}>
                  Exporte em: ContaAzul → Cadastros → Fornecedores → Exportar → XML
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button className="dc-btn-g" onClick={() => { if (xmlRef.current) xmlRef.current.click() }}>Importar XML do ContaAzul</button>
                  <input ref={xmlRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) importarXML(e.target.files[0]) }} />
                  <button style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', color: 'var(--text1)', fontSize: '13px', cursor: 'pointer' }} onClick={() => carregarFornecedores()}>Ver lista</button>
                </div>
                {xmlMsg && (
                  <div className="dc-msg" style={{ marginTop: 0, marginBottom: '12px', background: xmlOk ? 'var(--badge-ok)' : 'rgba(220,38,38,0.1)', borderLeftColor: xmlOk ? '#16a34a' : '#dc2626', color: xmlOk ? 'var(--badge-ok-text)' : '#dc2626' }}>
                    {xmlMsg}
                  </div>
                )}
                {fornecedores.length > 0 && (
                  <div className="dc-tw" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="dc-tbl">
                      <thead className="dc-thead"><tr><th className="dc-th">Nome no ContaAzul</th><th className="dc-th">CNPJ</th></tr></thead>
                      <tbody>
                        {fornecedores.map((f, i) => (
                          <tr key={i}><td className="dc-td" style={{ fontWeight: 500 }}>{f.nome}</td><td className="dc-td">{f.cnpj || '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA IMPORTAR */}
        {abaAtiva === 'importar' && (
          <div>
            {/* Seletor de empresa */}
            <div className="dc-card">
              <div className="dc-ct"><div className="dc-step">1</div>Selecionar empresa cliente</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div className="dc-fl">Empresa cliente</div>
                  <select className="dc-sel" style={{ width: '280px' }} value={empresaLancamento}
                    onChange={e => { setEmpresaLancamento(e.target.value); carregarOpcoes(e.target.value) }}>
                    <option value="">Selecione uma empresa</option>
                    {empresasClientes.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>
                {empresaLancamento && (
                  <div style={{ marginTop: '18px' }}>
                    {empresaConectada
                      ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>✓ Conectada ao ContaAzul</span>
                      : <span style={{ color: '#dc2626', fontSize: '13px' }}>⚠ Nao conectada — <a href={`/api/auth?empresa_id=${empresaLancamento}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>Conectar agora</a></span>
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Upload planilha */}
            <div className="dc-card">
              <div className="dc-ct"><div className="dc-step">2</div>Importar planilha do Datacar</div>
              <div className="dc-up"
                onClick={() => { if (fileRef.current) fileRef.current.click() }}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.[0]) processarArquivo(e.dataTransfer.files[0]) }}
                style={{ borderColor: drag ? 'var(--accent)' : undefined }}
              >
                <div className="dc-up-ico">{iconUpload}</div>
                <div className="dc-up-t">Clique aqui ou arraste o arquivo .xlsx</div>
                <div className="dc-up-s">Relatorio CpRl010 — Previsao de Pagamentos</div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processarArquivo(e.target.files[0]) }} />
              {uploadMsg && (
                <div className="dc-msg" style={{ background: getMsgBg(uploadMsg.tipo), borderLeftColor: getMsgBorderColor(uploadMsg.tipo), color: getMsgColor(uploadMsg.tipo) }}>
                  {uploadMsg.txt}
                </div>
              )}
            </div>

            {contas.length > 0 && (
              <div>
                <div className="dc-card">
                  <div className="dc-ct"><div className="dc-step">3</div>Configurar lancamento</div>
                  <div className="dc-stats">
                    <div className="dc-stat"><div className="dc-sv">{contas.length}</div><div className="dc-sl">Contas</div></div>
                    <div className="dc-stat"><div className="dc-sv" style={{ fontSize: '15px' }}>{fmtMoeda(totalValor)}</div><div className="dc-sl">Valor total</div></div>
                    <div className="dc-stat"><div className="dc-sv" style={{ fontSize: '13px', marginTop: '3px' }}>{empresa}</div><div className="dc-sl">Empresa (planilha)</div></div>
                  </div>
                  <div className="dc-sels">
                    <div>
                      <div className="dc-fl">Categoria de despesa</div>
                      <select className="dc-sel" value={catId} onChange={e => setCatId(e.target.value)}>
                        <option value="">Sem categoria</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.name || c.description || c.id}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="dc-fl">Conta financeira</div>
                      <select className="dc-sel" value={contaFinId} onChange={e => setContaFinId(e.target.value)}>
                        <option value="">Sem conta especifica</option>
                        {contasFin.map(c => <option key={c.id} value={c.id}>{c.name || c.description || c.id}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="dc-card">
                  <div className="dc-ct"><div className="dc-step">4</div>Revisar e lancar</div>
                  <div className="dc-toolbar">
                    <label className="dc-chk-lbl">
                      <input type="checkbox" checked={selecionadas.size === contas.length && contas.length > 0} onChange={e => toggleTodas(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent)' }} />
                      Selecionar todas
                    </label>
                    <span className="dc-info"><strong style={{ color: 'var(--text1)' }}>{selecionadas.size}</strong> de {contas.length} &nbsp;|&nbsp; Total: <strong style={{ color: 'var(--text1)' }}>{fmtMoeda(valorSel)}</strong></span>
                    <div style={{ flex: 1 }} />
                    {empresaConectada
                      ? <button className="dc-btn-g" onClick={lancar} disabled={selecionadas.size === 0 || lancando} style={{ opacity: selecionadas.size === 0 || lancando ? 0.6 : 1, cursor: selecionadas.size === 0 || lancando ? 'not-allowed' : 'pointer' }}>
                          {iconCheck}{lancando ? 'Lancando...' : 'Lancar no ContaAzul'}
                        </button>
                      : <button className="dc-btn-d">Conecte a empresa ao ContaAzul primeiro</button>
                    }
                  </div>
                  <div className="dc-tw">
                    <table className="dc-tbl">
                      <thead className="dc-thead">
                        <tr>
                          <th className="dc-th" style={{ width: '32px' }}></th>
                          <th className="dc-th">Fornecedor</th><th className="dc-th">NF</th>
                          <th className="dc-th">Documento</th><th className="dc-th">Emissao</th>
                          <th className="dc-th">Vencimento</th><th className="dc-th">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contas.map((c, i) => (
                          <tr key={i}>
                            <td className="dc-td"><input type="checkbox" checked={selecionadas.has(i)} onChange={() => toggleSel(i)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent)' }} /></td>
                            <td className="dc-td" style={{ fontWeight: 500, color: 'var(--text1)' }}>{c.fornecedor}</td>
                            <td className="dc-td">{c.nf}</td>
                            <td className="dc-td">{c.documento || '—'}</td>
                            <td className="dc-td">{fmtData(c.emissao)}</td>
                            <td className="dc-td" style={{ fontWeight: 500, color: 'var(--warning)' }}>{fmtData(c.vencimento)}</td>
                            <td className="dc-td" style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmtMoeda(c.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {resultados !== null && resumo !== null && (
              <div className="dc-card">
                <div className="dc-ct">Resultado do lancamento</div>
                <div className="dc-msg" style={{ marginTop: 0, marginBottom: '12px', background: resumo.erros === 0 ? 'var(--badge-ok)' : 'rgba(220,38,38,0.1)', borderLeftColor: resumo.erros === 0 ? '#16a34a' : '#dc2626', color: resumo.erros === 0 ? 'var(--badge-ok-text)' : 'var(--danger)' }}>
                  {resumo.ok} lancadas com sucesso{resumo.erros > 0 && <span> | {resumo.erros} com erro</span>}
                </div>
                {resultados.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: '6px', marginBottom: '4px', fontSize: '12px', background: r.status === 'ok' ? 'var(--badge-ok)' : 'rgba(220,38,38,0.08)' }}>
                    <span style={{ color: r.status === 'ok' ? 'var(--badge-ok-text)' : 'var(--danger)' }}>{r.status === 'ok' ? 'OK' : 'ERRO'} — {r.fornecedor} — NF {r.nf}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmtMoeda(r.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
