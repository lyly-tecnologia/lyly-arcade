import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import styles from './RoomPage.module.css'

const MEDALS = ['🥇', '🥈', '🥉']

const STATUS_CONFIG = {
  active:   { banner: null },
  paused:   { banner: { icon: '⏸', text: 'Sala pausada', sub: 'El administrador ha pausado esta sala temporalmente. Puedes ver el ranking pero no jugar.', color: 'orange' } },
  archived: { banner: { icon: '🏁', text: 'Sala finalizada', sub: 'Esta sala ha sido cerrada. El ranking es definitivo.', color: 'dim' } },
}

export function RoomPage() {
  const { pin } = useParams()
  const navigate = useNavigate()
  const { playerName, accessToken, userUuid, updateName } = useAuthStore()

  const [room, setRoom] = useState(null)
  const [scores, setScores] = useState([])
  const [onlineUsers, setOnlineUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const channelRef = useRef(null)

  // Edición de nombre
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const nameInputRef = useRef(null)

  // 1. Resolver sala por PIN (con status)
  useEffect(() => {
    supabase
      .from('leaderboards')
      .select('id, pin, game_code, creator_name, created_at, status')
      .eq('pin', pin)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Sala no encontrada. Verifica el PIN.')
          setLoading(false)
          return
        }
        setRoom(data)
        setLoading(false)
      })
  }, [pin])

  // 2. Scores + Presence + suscripción a cambios de status de la sala
  useEffect(() => {
    if (!room || !userUuid) return

    const loadScores = async () => {
      const { data, error: err } = await supabase
        .from('scores')
        .select('player_name, score, user_uuid, extras, created_at')
        .eq('leaderboard_id', room.id)
        .order('score', { ascending: false })

      if (!err) {
        setScores(data || [])
        setLastUpdate(new Date())
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      }
    }

    loadScores()

    const channel = supabase
      .channel(`room-${room.id}`, {
        config: {
          broadcast: { self: true },
          presence: { key: userUuid },
        },
      })
      // Cambios en scores → recargar ranking
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'scores',
        filter: `leaderboard_id=eq.${room.id}`,
      }, () => loadScores())
      // Cambios en la sala (status, etc.) → actualizar room en tiempo real
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'leaderboards',
        filter: `id=eq.${room.id}`,
      }, ({ new: updated }) => {
        setRoom(prev => ({ ...prev, ...updated }))
      })
      // Presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = {}
        Object.keys(state).forEach((key) => { online[key] = true })
        setOnlineUsers(online)
      })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_uuid: userUuid,
          name: playerName || 'Jugador',
          joined_at: new Date().toISOString(),
        })
      }
    })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [room?.id, userUuid, playerName])

  // Focus al abrir editor
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  const handleOpenEdit = () => {
    setNameInput(playerName || '')
    setNameError('')
    setEditingName(true)
  }

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed) { setNameError('El nombre no puede estar vacío'); return }
    if (trimmed === playerName) { setEditingName(false); return }
    setNameLoading(true)
    setNameError('')
    const ok = await updateName(trimmed)
    setNameLoading(false)
    if (ok) setEditingName(false)
    else setNameError('Error al actualizar. Intenta de nuevo.')
  }

  const handleNameKey = (e) => {
    if (e.key === 'Enter') handleSaveName()
    if (e.key === 'Escape') setEditingName(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(pin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePlay = () => {
    if (!accessToken) { navigate('/'); return }
    navigate(`/play/${pin}/${room.game_code}?roomId=${room.id}`)
  }

  const myRank = scores.findIndex((s) => s.user_uuid === userUuid)
  const myScore = myRank >= 0 ? scores[myRank] : null
  const onlineCount = Object.keys(onlineUsers).length

  const roomStatus = room?.status || 'active'
  const canPlay = roomStatus === 'active'
  const statusConfig = STATUS_CONFIG[roomStatus] || STATUS_CONFIG.active

  const formatTime = (date) =>
    date?.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || ''

  if (loading) return <div className={styles.center}><span className={styles.spinner} /></div>
  if (error) return (
    <div className={styles.center}>
      <div className={styles.errorBox}>
        <p>{error}</p>
        <button className={styles.btnBack} onClick={() => navigate('/')}>Volver al inicio</button>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/')}>← Inicio</button>
        <div className={styles.topRight}>
          {onlineCount > 0 && (
            <div className={styles.onlineCount}>
              <span className={styles.onlineDot} />
              {onlineCount} en línea
            </div>
          )}
          {canPlay ? (
            <div className={styles.liveIndicator}>
              <span className={`${styles.liveDot} ${pulse ? styles.liveDotPulse : ''}`} />
              EN VIVO
            </div>
          ) : (
            <div className={`${styles.statusPill} ${styles['statusPill_' + roomStatus]}`}>
              {roomStatus === 'paused' ? '⏸ Pausada' : '🏁 Finalizada'}
            </div>
          )}
        </div>
      </div>

      {/* Status banner — visible cuando no está activa */}
      {statusConfig.banner && (
        <div className={`${styles.statusBanner} ${styles['statusBanner_' + statusConfig.banner.color]}`}>
          <span className={styles.bannerIcon}>{statusConfig.banner.icon}</span>
          <div>
            <p className={styles.bannerTitle}>{statusConfig.banner.text}</p>
            <p className={styles.bannerSub}>{statusConfig.banner.sub}</p>
          </div>
        </div>
      )}

      {/* PIN card */}
      <div className={styles.pinCard}>
        <div className={styles.pinMeta}>
          <span className={styles.pinLabel}>PIN DE SALA</span>
          <span className={styles.gameTag}>{room.game_code}</span>
        </div>
        <div className={styles.pinDisplay}>{pin}</div>
        <div className={styles.pinFooter}>
          <span className={styles.creatorText}>Creado por {room.creator_name || 'Anónimo'}</span>
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? '✓ Copiado' : 'Copiar PIN'}
          </button>
        </div>
      </div>

      {/* Mi identidad — solo si puede jugar */}
      {canPlay && (
        <div className={styles.identityCard}>
          {editingName ? (
            <div className={styles.nameEditor}>
              <input
                ref={nameInputRef}
                className={styles.nameInput}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleNameKey}
                maxLength={20}
                placeholder="Tu nombre"
              />
              <button className={styles.nameSaveBtn} onClick={handleSaveName} disabled={nameLoading}>
                {nameLoading ? '...' : 'Guardar'}
              </button>
              <button className={styles.nameCancelBtn} onClick={() => setEditingName(false)} disabled={nameLoading}>
                ✕
              </button>
              {nameError && <p className={styles.nameError}>{nameError}</p>}
            </div>
          ) : (
            <div className={styles.nameDisplay}>
              <div className={styles.nameLeft}>
                <span className={styles.nameLabel}>Jugando como</span>
                <span className={styles.nameValue}>{playerName || 'Anónimo'}</span>
              </div>
              <button className={styles.nameEditBtn} onClick={handleOpenEdit}>✏️ Cambiar</button>
            </div>
          )}
        </div>
      )}

      {/* Mi puntaje */}
      {myScore && (
        <div className={styles.myCard}>
          <div className={styles.myRank}>#{myRank + 1}</div>
          <div className={styles.myInfo}>
            <p className={styles.myName}>
              {myScore.player_name}
              <span className={styles.youTag}>tú</span>
            </p>
            <p className={styles.myLabel}>tu mejor puntaje</p>
          </div>
          <div className={styles.myScore}>{myScore.score.toLocaleString()}</div>
        </div>
      )}

      {/* Ranking */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ranking</h2>
          <div className={styles.headerRight}>
            {lastUpdate && <span className={styles.updateTime}>{formatTime(lastUpdate)}</span>}
            <span className={styles.badge}>{scores.length} jugadores</span>
          </div>
        </div>

        {scores.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nadie ha jugado aún</p>
            {canPlay && <p className={styles.emptyHint}>¡Sé el primero!</p>}
          </div>
        ) : (
          <div className={styles.scoreList}>
            {scores.map((s, i) => {
              const isOnline = !!onlineUsers[s.user_uuid]
              const isMe = s.user_uuid === userUuid
              return (
                <div
                  key={s.user_uuid}
                  className={`${styles.scoreRow} ${i === 0 ? styles.rowGold : ''} ${isMe ? styles.rowMe : ''}`}
                >
                  <span className={styles.rank}>
                    {i < 3
                      ? <span className={styles.medal}>{MEDALS[i]}</span>
                      : <span className={styles.rankNum}>{i + 1}</span>
                    }
                  </span>
                  <span className={styles.playerName}>
                    <span
                      className={`${styles.presenceDot} ${isOnline ? styles.presenceDotOnline : styles.presenceDotOffline}`}
                      title={isOnline ? 'En línea' : 'Desconectado'}
                    />
                    {s.player_name}
                    {isMe && <span className={styles.youTag}>tú</span>}
                  </span>
                  <span className={styles.scoreVal}>{s.score.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Botón de jugar — solo si está activa */}
      {canPlay && (
        <button className={styles.btnPlay} onClick={handlePlay}>
          ▶ {myScore ? 'Jugar de nuevo' : 'Jugar ahora'}
        </button>
      )}
    </div>
  )
}
