import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchWithAuth } from '../lib/api'

function getOrCreateUUID() {
  const key = 'lyly_user_uuid'
  let uuid = localStorage.getItem(key)
  if (!uuid) {
    uuid = crypto.randomUUID()
    localStorage.setItem(key, uuid)
  }
  return uuid
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      userUuid: getOrCreateUUID(),
      playerName: '',
      accessToken: null,
      refreshToken: null,

      setPlayerName: (name) => set({ playerName: name }),

      login: async (playerName) => {
        const apiUrl = import.meta.env.VITE_API_URL
        const userUuid = get().userUuid
        const res = await fetch(`${apiUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userUuid, playerName }),
        })
        const data = await res.json()
        if (data.detail === 'ok') {
          set({
            playerName,
            accessToken: data.result.access_token,
            refreshToken: data.result.refresh_token,
          })
          return true
        }
        return false
      },

      updateName: async (newName) => {
        const apiUrl = import.meta.env.VITE_API_URL
        const { accessToken } = get()
        const res = await fetchWithAuth(`/update-name`, {
          method: 'POST',
          body: JSON.stringify({ playerName: newName }),
        })
        const data = await res.json()
        if (data.detail === 'ok') {
          set({
            playerName: newName,
            accessToken: data.result.access_token,
            refreshToken: data.result.refresh_token,
          })
          return true
        }
        return false
      },

      logout: () => set({ accessToken: null, refreshToken: null, playerName: '' }),
    }),
    {
      name: 'lyly-auth',
      partialize: (state) => ({
        userUuid: state.userUuid,
        playerName: state.playerName,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

export const useRoomStore = create((set) => ({
  currentRoom: null,
  setRoom: (room) => set({ currentRoom: room }),
  clearRoom: () => set({ currentRoom: null }),
}))
