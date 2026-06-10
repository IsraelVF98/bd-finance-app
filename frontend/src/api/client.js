// src/api/client.js
import axios from "axios"

// Captura o hostname atual para permitir testes locais no celular físico de forma automática
const hostname = window.location.hostname
const localApiUrl = (hostname === "localhost" || hostname.startsWith("192.168."))
  ? `http://${hostname}:8000` // Conecta no IP do computador local de onde o app foi aberto
  : "http://localhost:8000"

const api = axios.create({
  // Se houver VITE_API_URL (produção), usa ela. Caso contrário, usa o fallback dinâmico local.
  baseURL: import.meta.env.VITE_API_URL || localApiUrl,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bd_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("bd_token")
      localStorage.removeItem("bd_username")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api