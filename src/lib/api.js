import { useAuthStore } from '../store/index.js'

export async function fetchWithAuth(endpoint, options = {}) {
  const apiUrl = import.meta.env.VITE_API_URL

  let { accessToken, playerName, login, logout } = useAuthStore.getState()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  let response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    console.warn('Token expirado o inválido. Intentando re-autenticar silenciosamente...')
    
    const loginSuccess = await login(playerName || 'Jugador Anónimo')

    if (loginSuccess) {
      accessToken = useAuthStore.getState().accessToken
      headers['Authorization'] = `Bearer ${accessToken}`
      response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        headers,
      })
    } else {
      logout()
    }
  }

  return response
}