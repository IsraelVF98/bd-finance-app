// src/pages/Login.jsx
import logo from "../assets/logo.png"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api/client"
import { Lock, UserPlus } from "lucide-react" // UPGRADE: Importando os ícones da biblioteca Lucide

export default function Login() {
  const [aba, setAba] = useState("login")
  const [form, setForm] = useState({ username: "", password: "", confirm: "" })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogin = async () => {
    setErro(""); setLoading(true)
    try {
      const { data } = await api.post("/auth/login", { username: form.username, password: form.password })
      login(data.access_token, data.username)
      navigate("/dashboard")
    } catch (e) {
      setErro(e.response?.data?.detail || "Erro ao fazer login.")
    } finally { setLoading(false) }
  }

  const handleRegister = async () => {
    setErro(""); setSucesso("")
    if (form.password !== form.confirm) { setErro("As senhas não coincidem."); return }
    setLoading(true)
    try {
      await api.post("/auth/register", { username: form.username, password: form.password })
      setSucesso("Conta criada! Agora faça login.")
      setAba("login")
    } catch (e) {
      setErro(e.response?.data?.detail || "Erro ao criar conta.")
    } finally { setLoading(false) }
  }

  const onKey = (e, fn) => e.key === "Enter" && fn()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo alinhada de forma compacta e com alto contraste */}
        <div className="flex flex-col items-center justify-center text-center mb-4">
          <div className="flex items-center justify-center gap-4">
            <img src={logo} alt="B&D Finance Logo" className="w-20 h-20 object-contain" />
            <div className="text-4xl font-bold tracking-tight">
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          
          {/* UPGRADE: Abas de Login/Registro com alinhamento e ícones Lucide */}
          <div className="flex bg-surface2 rounded-lg p-1 mb-6 gap-1">
            {["login", "register"].map(t => {
              const isLogin = t === "login"
              const Icon = isLogin ? Lock : UserPlus
              const label = isLogin ? "Entrar" : "Criar Conta"

              return (
                <button 
                  key={t} 
                  onClick={() => { setAba(t); setErro(""); setSucesso("") }}
                  className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    aba === t ? "bg-green text-bg font-bold" : "text-muted hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {erro && <p className="text-red text-sm mb-4 bg-red/10 px-3 py-2 rounded-lg">{erro}</p>}
          {sucesso && <p className="text-green text-sm mb-4 bg-green/10 px-3 py-2 rounded-lg">{sucesso}</p>}

          <div className="space-y-4">
            <div>
              <label className="text-muted text-xs font-medium block mb-1">Usuário</label>
              <input value={form.username} onChange={e => set("username", e.target.value)}
                onKeyDown={e => onKey(e, aba === "login" ? handleLogin : handleRegister)}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green transition-colors"
                placeholder="seu_usuario" autoFocus />
            </div>
            <div>
              <label className="text-muted text-xs font-medium block mb-1">Senha</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                onKeyDown={e => onKey(e, aba === "login" ? handleLogin : handleRegister)}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green transition-colors"
                placeholder="••••••••" />
            </div>
            {aba === "register" && (
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Confirmar Senha</label>
                <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
                  onKeyDown={e => onKey(e, handleRegister)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green transition-colors"
                  placeholder="••••••••" />
              </div>
            )}
            <button
              onClick={aba === "login" ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full bg-green text-bg font-bold py-2.5 rounded-lg text-sm hover:bg-green/90 active:scale-95 transition-all disabled:opacity-50">
              {loading ? "Aguarde..." : aba === "login" ? "Entrar no Sistema" : "Criar Conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}