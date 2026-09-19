import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast, useQuery } from '../lib/hooks'
import Icon from './Icon'

/* ---------------- colours ---------------- */
export const THEMES = [
  ['#cfa947', '#8f6b1a'], // 0 gold
  ['#f0616d', '#b3243a'], // 1 rose
  ['#6b6ef2', '#3b3fb5'], // 2 indigo
  ['#22c08a', '#047857'], // 3 emerald
  ['#fb923c', '#c2410c'], // 4 sunset
  ['#a855f7', '#6b21a8'], // 5 purple
  ['#38bdf8', '#0369a1'], // 6 sky
]
export const OPT_COLORS = ['#f0616d', '#6b6ef2', '#10b981', '#f59e0b', '#a855f7', '#0ea5e9', '#ec4899', '#14b8a6']
export const VS_COLORS = [['#5b8cff', '#2f5fe0'], ['#ff7ab6', '#d6336c']]

export const themeIndex = (poll, i = 0) => (Number.isInteger(poll.theme) ? poll.theme % THEMES.length : i % THEMES.length)
export const themeGradient = (poll, i = 0) => {
  const [a, b] = THEMES[themeIndex(poll, i)]
  return `linear-gradient(135deg, ${a}, ${b})`
}

export const kindLabel = (poll) =>
  ({ single: 'Pick one', multi: `Pick up to ${poll.max_choices}`, rating: 'Rate it', versus: 'This or that' })[poll.kind]
const kindIcon = { single: 'poll', multi: 'check', rating: 'star', versus: 'heart' }

/* ---------------- data ---------------- */
/** Polls + results + my votes. filter: (query) => query, e.g. (q) => q.eq('on_home', true) */
export async function fetchPollData(uid, { filter } = {}) {
  let pq = supabase.from('polls').select('*').order('sort').order('created_at')
  if (filter) pq = filter(pq)
  const [polls, results, mine] = await Promise.all([
    pq,
    supabase.rpc('get_poll_results'),
    supabase.from('poll_votes').select('*').eq('user_id', uid),
  ])
  if (polls.error) throw polls.error
  const res = new Map()
  for (const r of results.data || []) {
    const e = res.get(r.poll_id) || { opts: {}, voters: Number(r.voters), avg: r.avg_rating }
    e.opts[r.opt] = Number(r.votes)
    res.set(r.poll_id, e)
  }
  return { polls: polls.data || [], res, mine: new Map((mine.data || []).map((v) => [v.poll_id, v])) }
}

const pctOf = (res, idx) => {
  const voters = res?.voters || 0
  return voters ? Math.round(((res?.opts?.[idx] || 0) / voters) * 100) : 0
}

/* ---------------- the poll itself (used in cards and in stories) ---------------- */
export function PollBody({ poll, res, mine, uid, canVote, onVoted }) {
  const [local, setLocal] = useState(null)
  useEffect(() => setLocal(null), [res, mine])
  const data = local || { res, mine }
  const [pending, setPending] = useState(mine?.choices || [])
  const voters = data.res?.voters || 0
  const opts = poll.options || []
  const myChoices = data.mine?.choices || []

  const vote = async (patch) => {
    if (!canVote) return
    const { error } = await supabase.from('poll_votes').upsert(
      { poll_id: poll.id, user_id: uid, ...patch }, { onConflict: 'poll_id,user_id' })
    if (error) { console.error(error); return toast('Could not save your vote') }
    try {
      const fresh = await fetchPollData(uid, { filter: (q) => q.eq('id', poll.id) })
      setLocal({ res: fresh.res.get(poll.id), mine: fresh.mine.get(poll.id) })
    } catch (e) { console.error(e) }
    onVoted?.(poll)
  }

  let body
  if (poll.kind === 'versus') {
    const p0 = pctOf(data.res, 0)
    body = (
      <>
        <div className="vs">
          {[0, 1].map((idx) => {
            const [a, b] = VS_COLORS[idx]
            const isMine = myChoices.includes(idx)
            const votes = data.res?.opts?.[idx] || 0
            return (
              <button key={idx} className={`vside ${isMine ? 'mine' : ''} ${myChoices.length && !isMine ? 'dim' : ''}`}
                style={{ background: `linear-gradient(160deg, ${a}, ${b})` }} disabled={!canVote}
                onClick={() => vote({ choices: [idx] })} aria-pressed={isMine}>
                {isMine && <span className="vcheck"><Icon name="check" size={14} stroke={3} /></span>}
                <span className="vname">{opts[idx]}</span>
                <span className="vpct">{pctOf(data.res, idx)}%</span>
                <span className="vsub">{isMine ? 'Your pick' : `${votes} vote${votes === 1 ? '' : 's'}`}</span>
              </button>
            )
          })}
          <div className="vsbadge" aria-hidden="true">VS</div>
        </div>
        <div className="vsbar" aria-hidden="true">
          <i style={{ width: `${voters ? p0 : 50}%`, background: VS_COLORS[0][0] }} />
          <i style={{ width: `${voters ? 100 - p0 : 50}%`, background: VS_COLORS[1][0] }} />
        </div>
      </>
    )
  } else if (poll.kind === 'rating') {
    const mineRating = data.mine?.rating || 0
    body = (
      <>
        <div className="stars big" role="group" aria-label="Rate from 1 to 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} disabled={!canVote} onClick={() => vote({ rating: n, choices: [] })} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
              <Icon name="star" size={38} stroke={1.5} color="#f5b301" fill={mineRating >= n ? '#f5b301' : 'none'} />
            </button>
          ))}
        </div>
        {data.res?.avg && (
          <div className="avgpill"><b>{data.res.avg}</b> average from {voters} rating{voters === 1 ? '' : 's'}</div>
        )}
      </>
    )
  } else {
    body = (
      <>
        {opts.map((o, idx) => {
          const color = OPT_COLORS[idx % OPT_COLORS.length]
          const pct = pctOf(data.res, idx)
          const isMine = poll.kind === 'single' ? myChoices.includes(idx) : pending.includes(idx)
          const onClick = () => {
            if (!canVote) return
            if (poll.kind === 'single') return vote({ choices: [idx] })
            setPending((cur) => (cur.includes(idx) ? cur.filter((x) => x !== idx) : cur.length < poll.max_choices ? [...cur, idx] : cur))
          }
          return (
            <button key={idx} className={`popt ${isMine ? 'mine' : ''}`} style={{ '--c': color }} onClick={onClick} aria-pressed={!!isMine} disabled={!canVote}>
              <div className="fill" style={{ width: `${pct}%` }} />
              <div className="in">
                <span className="badge">{isMine ? <Icon name="check" size={15} stroke={3} color="#fff" /> : String.fromCharCode(65 + idx)}</span>
                <span className="lab">{o}</span>
                <span className="pct">{pct}%</span>
              </div>
            </button>
          )
        })}
        {poll.kind === 'multi' && canVote && (
          <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => vote({ choices: pending })} disabled={!pending.length}>
            {data.mine ? 'Update my picks' : 'Submit'}
          </button>
        )}
      </>
    )
  }

  return (
    <div className="pbodyin">
      {body}
      <div className="pfoot">
        <Icon name="users" size={14} /> {voters} vote{voters === 1 ? '' : 's'}
        {!poll.is_open && ' · voting closed'}
      </div>
    </div>
  )
}

/* ---------------- card on the Play along page ---------------- */
export function PollCard({ poll, index, res, mine, uid, isAdmin, onVoted, onToggle }) {
  return (
    <section className="pcard">
      <div className="phead" style={{ background: themeGradient(poll, index) }}>
        <div className="row between" style={{ position: 'relative', zIndex: 2 }}>
          <span className="pchip"><Icon name={kindIcon[poll.kind]} size={14} stroke={2.2} /> {kindLabel(poll)}</span>
          {isAdmin && <Link to={`/admin/engage/poll/${poll.id}`} className="pedit" aria-label="Edit poll"><Icon name="pencil" size={16} /></Link>}
        </div>
        <h2 className="pq">{poll.question}</h2>
      </div>
      <div className="pbody">
        <PollBody poll={poll} res={res} mine={mine} uid={uid} canVote={poll.is_open} onVoted={onVoted} />
        {isAdmin && (
          <div className="scroll-x" aria-label="Admin options">
            <button className={`chip ${poll.on_home ? 'on' : ''}`} onClick={() => onToggle(poll, 'on_home')}>{poll.on_home ? 'On Home ✓' : 'Show results on Home'}</button>
            <button className={`chip ${poll.in_story ? 'on' : ''}`} onClick={() => onToggle(poll, 'in_story')}>{poll.in_story ? 'In Stories ✓' : 'Add to Stories'}</button>
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------------- full-screen story slide ---------------- */
export function PollStage({ item, uid, onAnswered }) {
  const { poll, res, mine } = item
  const stop = (e) => e.stopPropagation()
  return (
    <div className="pstage" style={{ background: themeGradient(poll) }}>
      <span className="pchip"><Icon name={kindIcon[poll.kind]} size={14} stroke={2.2} /> {kindLabel(poll)}</span>
      <h2 className="pq big">{poll.question}</h2>
      <div onPointerDown={stop} onPointerUp={stop}>
        <PollBody poll={poll} res={res} mine={mine} uid={uid} canVote={poll.is_open} onVoted={onAnswered} />
      </div>
    </div>
  )
}

/* ---------------- Home: live results ---------------- */
function ResultCard({ poll, index, res, mine }) {
  const voters = res?.voters || 0
  const opts = poll.options || []
  let body
  if (poll.kind === 'versus') {
    const p0 = pctOf(res, 0)
    body = (
      <>
        <div className="row between rvs">
          <div><b style={{ color: VS_COLORS[0][1] }}>{opts[0]}</b><span style={{ color: VS_COLORS[0][1] }}>{p0}%</span></div>
          <div style={{ textAlign: 'right' }}><b style={{ color: VS_COLORS[1][1] }}>{opts[1]}</b><span style={{ color: VS_COLORS[1][1] }}>{voters ? 100 - p0 : 0}%</span></div>
        </div>
        <div className="vsbar" aria-hidden="true">
          <i style={{ width: `${voters ? p0 : 50}%`, background: VS_COLORS[0][0] }} />
          <i style={{ width: `${voters ? 100 - p0 : 50}%`, background: VS_COLORS[1][0] }} />
        </div>
      </>
    )
  } else if (poll.kind === 'rating') {
    body = (
      <div className="row" style={{ gap: 10 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: '#d99a00' }}>{res?.avg || '–'}</span>
        <Icon name="star" size={26} stroke={1.5} color="#f5b301" fill="#f5b301" />
        <span className="small muted">average</span>
      </div>
    )
  } else {
    const rows = opts.map((o, idx) => ({ o, idx, pct: pctOf(res, idx) })).sort((a, b) => b.pct - a.pct).slice(0, 4)
    body = rows.map(({ o, idx, pct }, r) => (
      <div key={idx} className="rrow">
        <div className="row between"><span style={{ fontWeight: r === 0 && pct ? 700 : 500 }}>{o}</span><b style={{ color: OPT_COLORS[idx % OPT_COLORS.length] }}>{pct}%</b></div>
        <div className="rtrack"><i style={{ width: `${pct}%`, background: OPT_COLORS[idx % OPT_COLORS.length] }} /></div>
      </div>
    ))
  }
  return (
    <Link to="/engage" state={{ tab: 'polls' }} className="rcard">
      <div className="rstrip" style={{ background: themeGradient(poll, index) }} />
      <div className="rq">{poll.question}</div>
      {body}
      <div className="small muted">{voters} vote{voters === 1 ? '' : 's'} · {mine ? 'you voted' : 'tap to vote'}</div>
    </Link>
  )
}

export function HomePolls({ uid }) {
  const q = useQuery(() => fetchPollData(uid, { filter: (x) => x.eq('on_home', true) }), [uid])
  const polls = q.data?.polls || []
  if (!polls.length) return null
  return (
    <section className="col" style={{ gap: 10, flexShrink: 0 }}>
      <div className="row between">
        <div className="eyebrow">Poll results</div>
        <Link to="/engage" className="small" style={{ color: 'var(--accent)', fontWeight: 700 }}>Play along</Link>
      </div>
      <div className="hres">
        {polls.map((p, i) => <ResultCard key={p.id} poll={p} index={i} res={q.data.res.get(p.id)} mine={q.data.mine.get(p.id)} />)}
      </div>
    </section>
  )
}