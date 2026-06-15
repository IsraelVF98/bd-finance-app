// src/pages/Login.jsx
import logo from "../assets/logo.png"
import only_logo from "../assets/only_logo.png"
import name from "../assets/name.png" // UPGRADE: Importando a imagem de texto do nome
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api/client"
import { Lock, UserPlus, KeyRound } from "lucide-react"

// Função auxiliar no React para validar os requisitos em tempo real
const validarRequisitos = (senha) => {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /\d/.test(senha),
    especial: /[@$!%*?&#_\-.]/.test(senha)
  }
}

export default function Login() {
  const [aba, setAba] = useState("login")
  const [form, setForm] = useState({ 
    username: "", email: "", password: "", confirm: "", 
    codigo: "", newPassword: "" 
  })
  
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
      await api.post("/auth/register", { 
        username: form.username, 
        email: form.email,
        password: form.password 
      })
      setSucesso("Conta criada! Agora faça login.")
      setAba("login")
    } catch (e) {
      setErro(e.response?.data?.detail || "Erro ao criar conta.")
    } finally { setLoading(false) }
  }

  const handleForgotPassword = async () => {
    setErro(""); setSucesso("")
    if (!form.email) { setErro("Por favor, preencha o e-mail."); return }
    setLoading(true)
    try {
      await api.post("/auth/forgot-password", { email: form.email })
      setSucesso("Se o e-mail estiver cadastrado, o código foi enviado!")
      setForm(f => ({ ...f, codigo: "", newPassword: "" }))
    } catch (e) {
      setErro(e.response?.data?.detail || "Erro ao solicitar código.")
    } finally { setLoading(false) }
  }

  const handleResetPassword = async () => {
    setErro(""); setSucesso("")
    if (!form.email || !form.codigo || !form.newPassword) { setErro("Todos os campos de redefinição são obrigatórios."); return }
    setLoading(true)
    try {
      await api.post("/auth/reset-password", {
        email: form.email,
        codigo: form.codigo,
        new_password: form.newPassword
      })
      setSucesso("Sua senha foi redefinida com sucesso! Faça login.")
      setAba("login")
    } catch (e) {
      setErro(e.response?.data?.detail || "Erro ao redefinir senha.")
    } finally { setLoading(false) }
  }

  const onKey = (e, fn) => e.key === "Enter" && fn()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* UPGRADE: Cabeçalho com logo e imagem do nome alinhadas de forma minimalista sem o subtítulo */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="flex items-center justify-center gap-4">
            <img src={only_logo} alt="B&D Finance Logo" className="w-20 h-20 object-contain" />
            <img src={name} alt="B&D Finance" className="w-36 h-9 object-contain" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          
          {/* Abas Dinâmicas */}
          <div className="flex bg-surface2 rounded-lg p-1 mb-6 gap-1">
            {[
              { id: "login", label: "Entrar", icon: Lock },
              { id: "register", label: "Cadastrar", icon: UserPlus },
              { id: "forgot", label: "Recuperar", icon: KeyRound }
            ].map(({ id, label, icon: Icon }) => (
              <button 
                key={id} 
                onClick={() => { setAba(id); setErro(""); setSucesso("") }}
                className={`flex-1 py-2 rounded-md text-[11px] md:text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  aba === id ? "bg-brand-brown text-white font-bold" : "text-muted hover:text-white"
                }`}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {erro && <p className="text-red text-sm mb-4 bg-red/10 px-3 py-2 rounded-lg">{erro}</p>}
          {sucesso && <p className="text-green text-sm mb-4 bg-green/10 px-3 py-2 rounded-lg">{sucesso}</p>}

          {/* Form de Login */}
          {aba === "login" && (
            <div className="space-y-4">
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Usuário</label>
                <input value={form.username} onChange={e => set("username", e.target.value)}
                  onKeyDown={e => onKey(e, handleLogin)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="seu_usuario" autoFocus />
              </div>
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Senha</label>
                <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                  onKeyDown={e => onKey(e, handleLogin)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="••••••••" />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Aguarde..." : "Entrar no Sistema"}
              </button>
            </div>
          )}

          {/* Form de Cadastro */}
          {aba === "register" && (
            <div className="space-y-4">
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Usuário</label>
                <input value={form.username} onChange={e => set("username", e.target.value)}
                  onKeyDown={e => onKey(e, handleRegister)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="nome_usuario" autoFocus />
              </div>
              <div>
                <label className="text-muted text-xs font-medium block mb-1">E-mail</label>
                <input value={form.email} onChange={e => set("email", e.target.value)}
                  onKeyDown={e => onKey(e, handleRegister)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="seu@email.com" />
              </div>
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Senha</label>
                <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                  onKeyDown={e => onKey(e, handleRegister)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="Senha de acesso" />
                
                {form.password && (
                  <div className="mt-2.5 p-3 bg-surface2 border border-border rounded-lg space-y-1.5 text-[10px] md:text-xs text-muted font-sans font-medium transition-all">
                    <p className="text-white font-semibold mb-1">Requisitos da senha:</p>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.password).tamanho ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.password).tamanho ? "✓" : "○"} Mínimo 8 caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.password).maiuscula ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.password).maiuscula ? "✓" : "○"} Pelo menos uma letra maiúscula (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.password).minuscula ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.password).minuscula ? "✓" : "○"} Pelo menos uma letra minúscula (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.password).numero ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.password).numero ? "✓" : "○"} Pelo menos um número (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.password).especial ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.password).especial ? "✓" : "○"} Um caractere especial (ex: @, !, #, $, etc.)
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-muted text-xs font-medium block mb-1">Confirmar Senha</label>
                <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
                  onKeyDown={e => onKey(e, handleRegister)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="••••••••" />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Aguarde..." : "Criar Minha Conta"}
              </button>
            </div>
          )}

          {/* Form de Recuperação de Senha (Forgot/Reset) */}
          {aba === "forgot" && (
            <div className="space-y-4">
              <div>
                <label className="text-muted text-xs font-medium block mb-1">E-mail Cadastrado</label>
                <input value={form.email} onChange={e => set("email", e.target.value)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="seu@email.com" />
              </div>
              
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Enviando..." : "Solicitar Código de Verificação"}
              </button>

              <hr className="border-border/60 my-2" />

              <div>
                <label className="text-muted text-xs font-medium block mb-1">Código de Verificação (6 dígitos)</label>
                <input value={form.codigo} onChange={e => set("codigo", e.target.value)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown font-mono"
                  placeholder="000000" />
              </div>

              <div>
                <label className="text-muted text-xs font-medium block mb-1">Nova Senha Forte</label>
                <input type="password" value={form.newPassword} onChange={e => set("newPassword", e.target.value)}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-brown transition-colors"
                  placeholder="Nova senha forte de acesso" />
                
                {form.newPassword && (
                  <div className="mt-2.5 p-3 bg-surface2 border border-border rounded-lg space-y-1.5 text-[10px] md:text-xs text-muted font-sans font-medium transition-all">
                    <p className="text-white font-semibold mb-1">Requisitos da nova senha:</p>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.newPassword).tamanho ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.newPassword).tamanho ? "✓" : "○"} Mínimo 8 caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.newPassword).maiuscula ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.newPassword).maiuscula ? "✓" : "○"} Pelo menos uma letra maiúscula (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.newPassword).minuscula ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.newPassword).minuscula ? "✓" : "○"} Pelo menos uma letra minúscula (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.newPassword).numero ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.newPassword).numero ? "✓" : "○"} Pelo menos um número (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={validarRequisitos(form.newPassword).especial ? "text-green font-bold" : "text-subtle"}>
                        {validarRequisitos(form.newPassword).especial ? "✓" : "○"} Um caractere especial (ex: @, !, #, $, etc.)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-brand-brown text-white font-bold py-2.5 rounded-lg text-sm hover:bg-brand-brownHover active:scale-95 transition-all disabled:opacity-50">
                {loading ? "Redefinindo..." : "Definir Nova Senha"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}