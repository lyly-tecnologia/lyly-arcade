import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/index.js'
import styles from './HomePage.module.css'
import { fetchWithAuth } from '../lib/api.js'

const GAMES = [
  { code: 'G001', name: 'Cat Boom', emoji: '🐱' },
  { code: 'G002', name: 'Señor Bee',    emoji: '🐝' },
  { code: 'G003', name: 'Tiempo de surf',   emoji: '🌊' },
  { code: 'G005', name: 'Emparejados',  emoji: '🔗' },
  { code: 'G006', name: '2048',  emoji: '🔢' },
  { code: 'G007', name: 'Aplastados',  emoji: '👻' },
  { code: 'G008', name: 'Galaxy Taxi',  emoji: '🚕' },
  { code: 'G009', name: 'Crossy Pollo',   emoji: '🐔' },
  { code: 'G010', name: 'Cosecha Arcana', emoji: '🧙' },
  { code: 'G011', name: 'Salchi dogo',   emoji: '🌭' },
  { code: 'G014', name: 'Ahorcados',   emoji: '🪢' },
  { code: 'G016', name: 'Sliderz',   emoji: '🧩' },
  { code: 'G019', name: 'Busca minas',   emoji: '💣' },
  { code: 'G020', name: 'Sudoku',   emoji: '🔢' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { playerName, accessToken, login } = useAuthStore()

  const [nameInput, setNameInput] = useState(playerName || '')
  const [pinInput, setPinInput] = useState('')
  const [selectedGame, setSelectedGame] = useState(GAMES[0].code)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('create') // 'create' | 'join'

  const apiUrl = import.meta.env.VITE_API_URL

  const ensureLogin = async () => {
    if (!nameInput.trim()) {
      setError('Ingresa tu nombre primero')
      return false
    }
    if (!accessToken) {
      const ok = await login(nameInput.trim())
      if (!ok) { setError('Error al conectar con el servidor'); return false }
    }
    return true
  }

  const handleCreate = async () => {
    setError('')
    const ok = await ensureLogin()
    if (!ok) return
    setLoading(true)
    try {
      const { accessToken } = useAuthStore.getState()
      const res = await fetchWithAuth(`/create-room`, {
        method: 'POST',
        body: JSON.stringify({ game_code: selectedGame }),
      })
      const data = await res.json()
      if (data.detail !== 'ok') throw new Error('Error al crear sala')
      navigate(`/room/${data.result.pin}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    setError('')
    if (!pinInput.trim()) { setError('Ingresa el PIN de la sala'); return }
    const ok = await ensureLogin()
    if (!ok) return
    navigate(`/room/${pinInput.toUpperCase().trim()}`)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>▶</span>
          LYLY<span className={styles.logoAccent}>ARCADE</span>
        </div>
        <p className={styles.tagline}>Juegos en tiempo real · Compite con amigos</p>
      </header>

      <main className={styles.main}>
        {/* Name input */}
        <section className={styles.nameSection}>
          <label className={styles.label}>Tu nombre</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Ej: MegaPlayer99"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={20}
          />
        </section>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`}
            onClick={() => setTab('create')}
          >
            Crear sala
          </button>
          <button
            className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`}
            onClick={() => setTab('join')}
          >
            Unirme
          </button>
        </div>

        {tab === 'create' ? (
          <div className={styles.panel}>
            <label className={styles.label}>Elige el juego</label>
            <div className={styles.gameGrid}>
              {GAMES.map((g) => (
                <button
                  key={g.code}
                  className={`${styles.gameCard} ${selectedGame === g.code ? styles.gameCardSelected : ''}`}
                  onClick={() => setSelectedGame(g.code)}
                >
                  <span className={styles.gameEmoji}>{g.emoji}</span>
                  <span className={styles.gameName}>{g.name}</span>
                  <span className={styles.gameCode}>{g.code}</span>
                </button>
              ))}
            </div>
            <button
              className={styles.btnPrimary}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear sala'}
            </button>
          </div>
        ) : (
          <div className={styles.panel}>
            <label className={styles.label}>PIN de la sala</label>
            <input
              className={`${styles.input} ${styles.pinInput}`}
              type="text"
              placeholder="AB1C2"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <button
              className={styles.btnPrimary}
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? 'Conectando...' : 'Unirme a la sala'}
            </button>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  )
}
