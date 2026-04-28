import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import styles from './LeaderboardPage.module.css'

const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardPage() {
  const { pin } = useParams()
  const navigate = useNavigate()
  const { playerName, userUuid } = useAuthStore()

  const [room, setRoom] = useState(null)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [pulse, setPulse] = useState(false)

  // Resolve room
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

  // Load scores + real-time subscription
  useEffect(() => {
    if (!room) return

    const loadScores = async () => {
      const { data } = await supabase
        .from('scores')
        .select('player_name, score, user_uuid, extras, created_at, match_uuid')
        .eq('leaderboard_id', room.id)
        .order('score', { ascending: false })

      setScores(data || [])
      setLastUpdate(new Date())
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
    }

    loadScores()

    const channel = supabase
      .channel(`leaderboard-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `leaderboard_id=eq.${room.id}`,
        },
        () => loadScores()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [room])

  const myRank = scores.findIndex((s) => s.user_uuid === userUuid)
  const myScore = scores[myRank]

  const formatTime = (date) => {
    if (!date) return ''
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  if (loading) return <div className={styles.center}><span className={styles.spinner} /></div>
  if (error) return <div className={styles.center}><p className={styles.errorMsg}>{error}</p></div>

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(`/lobby/${pin}`)}>
          ← Sala
        </button>
        <div className={styles.liveIndicator}>
          <span className={`${styles.liveDot} ${pulse ? styles.liveDotPulse : ''}`} />
          EN VIVO
        </div>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Ranking</h1>
        <div className={styles.pinBadge}>PIN: <span>{pin}</span></div>
        {lastUpdate && (
          <p className={styles.updateTime}>
            Actualizado {formatTime(lastUpdate)}
          </p>
        )}
      </div>

      {/* My score card (if played) */}
      {myScore && (
        <div className={styles.myCard}>
          <div className={styles.myRank}>#{myRank + 1}</div>
          <div className={styles.myInfo}>
            <p className={styles.myName}>{myScore.player_name} <span className={styles.youTag}>tú</span></p>
            <p className={styles.myScoreLabel}>tu puntaje</p>
          </div>
          <div className={styles.myScore}>{myScore.score.toLocaleString()}</div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className={styles.tableWrap}>
        {scores.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Aún no hay puntajes</p>
            <p className={styles.emptyHint}>¡Sé el primero en jugar!</p>
            <button
              className={styles.btnPlay}
              onClick={() => navigate(`/lobby/${pin}`)}
            >
              Ir a la sala
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tableHeader}>
              <span>#</span>
              <span>Jugador</span>
              <span>Puntaje</span>
            </div>
            {scores.map((s, i) => (
              <div
                key={s.user_uuid || i}
                className={`
                  ${styles.row}
                  ${i === 0 ? styles.rowGold : ''}
                  ${s.user_uuid === userUuid ? styles.rowMe : ''}
                `}
              >
                <span className={styles.rank}>
                  {i < 3 ? <span className={styles.medal}>{MEDALS[i]}</span> : (
                    <span className={styles.rankNum}>{i + 1}</span>
                  )}
                </span>
                <span className={styles.name}>
                  {s.player_name}
                  {s.user_uuid === userUuid && <span className={styles.youTag}>tú</span>}
                </span>
                <span className={styles.score}>{s.score.toLocaleString()}</span>
                {s.extras && Object.keys(s.extras).length > 0 && (
                  <details className={styles.extras}>
                    <summary className={styles.extrasSummary}>detalles</summary>
                    <div className={styles.extrasContent}>
                      {Object.entries(s.extras).map(([k, v]) => (
                        <div key={k} className={styles.extrasRow}>
                          <span>{k.replace(/_/g, ' ')}</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.btnJugar} onClick={() => navigate(`/lobby/${pin}`)}>
          Jugar de nuevo
        </button>
        <button className={styles.btnHome} onClick={() => navigate('/')}>
          Menú principal
        </button>
      </div>
    </div>
  )
}
