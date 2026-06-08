// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("bd_token"))
  const [username, setUsername] = useState(() => localStorage.getItem("bd_username"))

  const login = (token, username) => {
    localStorage.setItem("bd_token", token)
    localStorage.setItem("bd_username", username)
    setToken(token)
    setUsername(username)
  }

  const logout = () => {
    localStorage.removeItem("bd_token")
    localStorage.removeItem("bd_username")
    setToken(null)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ token, username, login, logout, logado: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
