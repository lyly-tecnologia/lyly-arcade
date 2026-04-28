import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import styles from './LobbyPage.module.css'

export function LobbyPage() {
  const { pin } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const gameCode = searchParams.get('game') || 'G001'
  const isHost = searchParams.get('host') === 'true'

  const { playerName, accessToken } = useAuthStore()
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Resolve room id from PIN
  useEffect(() => {
    supabase
      .from('leaderboards')
      .select('id, pin, created_at')
      .eq('pin', pin)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('Sala no encontrada'); setLoading(false); return }
        setRoom(data)
        setLoading(false)
      })
  }, [pin])

  // Load and subscribe to scores (players who have joined)
  useEffect(() => {
    if (!room) return

    const load = async () => {
      const { data } = await supabase
        .from('scores')
        .select('player_name, score, created_at, user_uuid')
        .eq('leaderboard_id', room.id)
        .order('created_at', { ascending: true })
      setPlayers(data || [])
    }

    load()

    const channel = supabase
      .channel(`lobby-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `leaderboard_id=eq.${room.id}` },
        () => load()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [room])

  const handleCopy = () => {
    navigator.clipboard.writeText(pin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePlay = () => {
    if (!accessToken) { navigate('/'); return }
    navigate(`/play/${pin}/${gameCode}?roomId=${room?.id}`)
  }

  const handleLeaderboard = () => {
    navigate(`/leaderboard/${pin}`)
  }

  if (loading) return <div className={styles.center}><span className={styles.spinner} /></div>
  if (error) return <div className={styles.center}><p className={styles.errorMsg}>{error}</p></div>

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/')}>← Inicio</button>

      <div className={styles.pinCard}>
        <p className={styles.pinLabel}>PIN DE SALA</p>
        <div className={styles.pinDisplay}>{pin}</div>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? '✓ Copiado' : 'Copiar PIN'}
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Jugadores en sala</h2>
          <span className={styles.badge}>{players.length}</span>
        </div>

        <div className={styles.playerList}>
          {players.length === 0 ? (
            <p className={styles.empty}>Nadie ha jugado aún · ¡Sé el primero!</p>
          ) : (
            players.map((p, i) => (
              <div key={p.user_uuid} className={styles.playerRow}>
                <span className={styles.playerIdx}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.playerName}>
                  {p.player_name}
                  {p.player_name === playerName && <span className={styles.you}> tú</span>}
                </span>
                <span className={styles.playerScore}>
                  {p.score > 0 ? p.score.toLocaleString() : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnPlay} onClick={handlePlay}>
          ▶ Jugar ahora
        </button>
        <button className={styles.btnSecondary} onClick={handleLeaderboard}>
          Ver ranking
        </button>
      </div>

      <p className={styles.hint}>
        El juego seleccionado es <strong>{gameCode}</strong>. Comparte el PIN para que otros se unan.
      </p>
    </div>
  )
}
