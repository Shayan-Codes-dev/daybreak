import { useEffect, useMemo, useState } from 'react'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from './firebase'
import './App.css'

const experiences = [
  { id: 'city-match', title: 'Which Pakistani city is your vibe?', description: 'A tiny personality quiz for your next big-city daydream.', category: 'QUIZ', time: '2 MIN', color: 'mint', icon: '✳', featured: true },
  { id: 'chai-calculator', title: 'The chai on your mind', description: 'How many cups can your daily chai budget really buy?', category: 'LITTLE TOOL', time: '1 MIN', color: 'peach', icon: '☕' },
  { id: 'pakistan-quiz', title: 'Pakistan, actually', description: 'A quick-fire quiz about the place we call home.', category: 'TRIVIA', time: '3 MIN', color: 'blue', icon: '✺' },
]

const cityQuestions = [
  {
    question: 'Your ideal Saturday starts with…',
    options: [
      { label: 'A strong coffee and a gallery opening', city: 'Lahore' },
      { label: 'A long drive with the windows down', city: 'Karachi' },
      { label: 'A hike before the city wakes up', city: 'Islamabad' },
      { label: 'A slow breakfast with a mountain view', city: 'Skardu' },
    ],
  },
  {
    question: 'Pick your perfect evening plan.',
    options: [
      { label: 'Street food, old streets, and no plans', city: 'Lahore' },
      { label: 'Sea breeze and a late-night bite', city: 'Karachi' },
      { label: 'A sunset walk somewhere green', city: 'Islamabad' },
      { label: 'A sky full of stars and absolute quiet', city: 'Skardu' },
    ],
  },
  {
    question: 'Choose the soundtrack to your life.',
    options: [
      { label: 'Qawwali that gives you goosebumps', city: 'Lahore' },
      { label: 'A playlist that jumps between everything', city: 'Karachi' },
      { label: 'Instrumentals for a scenic drive', city: 'Islamabad' },
      { label: 'Wind, water, and no notifications', city: 'Skardu' },
    ],
  },
  {
    question: 'Your kind of view?',
    options: [
      { label: 'A glowing food street after dark', city: 'Lahore' },
      { label: 'The Arabian Sea at golden hour', city: 'Karachi' },
      { label: 'Margalla hills from a quiet trail', city: 'Islamabad' },
      { label: 'A glacier-fed lake between peaks', city: 'Skardu' },
    ],
  },
]

const cityResults = {
  Lahore: { emoji: '🪷', line: 'A little dramatic, always full of heart.', detail: 'You find the good stuff in the details: one more cup, one more story, one more plate for the table.' },
  Karachi: { emoji: '🌊', line: 'Big energy. Bigger appetite for life.', detail: 'You make your own rhythm, keep your options open, and know the night is still young.' },
  Islamabad: { emoji: '🌿', line: 'Calm on the outside, curious underneath.', detail: 'You like a little breathing room, a good view, and plans that leave room for a detour.' },
  Skardu: { emoji: '🏔️', line: 'Your soul has an out-of-office reply.', detail: 'You are happiest somewhere wide-open, where the air is crisp and the group chat has no signal.' },
}

const quizQuestions = [
  { question: 'Which city is home to Pakistan’s famous Faisal Mosque?', options: ['Lahore', 'Islamabad', 'Peshawar', 'Quetta'], answer: 'Islamabad', note: 'Its striking design was created by Turkish architect Vedat Dalokay.' },
  { question: 'What is the national animal of Pakistan?', options: ['Markhor', 'Snow leopard', 'Chinkara', 'Indus dolphin'], answer: 'Markhor', note: 'The markhor is a wild goat known for its distinctive spiral horns.' },
  { question: 'Which sea borders Pakistan to the south?', options: ['Red Sea', 'Arabian Sea', 'Caspian Sea', 'Andaman Sea'], answer: 'Arabian Sea', note: 'Pakistan’s southern coastline stretches along the Arabian Sea.' },
  { question: 'What is the name of the ancient Indus Valley city near Larkana?', options: ['Taxila', 'Mohenjo-daro', 'Harappa', 'Merv'], answer: 'Mohenjo-daro', note: 'Mohenjo-daro was one of the major urban centres of the Indus Valley Civilization.' },
  { question: 'Which peak is the second-highest mountain on Earth?', options: ['Nanga Parbat', 'Broad Peak', 'K2', 'Gasherbrum I'], answer: 'K2', note: 'K2, also called the Savage Mountain, rises to 8,611 metres.' },
]

const filters = ['Everything', 'Little tools', 'Quizzes', 'Saved']
const formatRupees = (amount) => `Rs ${Math.round(amount).toLocaleString('en-PK')}`

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(`${value}T12:00:00+05:00`)
  return !Number.isNaN(date.getTime()) && getPakistanDateKey(date) === value
}

function getPakistanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

function getDailyQuestion(dateKey) {
  const dayNumber = Number(dateKey.replaceAll('-', ''))
  return quizQuestions[dayNumber % quizQuestions.length]
}

function getDailyHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('daybreak:daily-history') || '[]')
    return Array.isArray(history) ? history.filter((date) => typeof date === 'string') : []
  } catch {
    return []
  }
}

function getSavedFavorites() {
  try {
    const favorites = JSON.parse(localStorage.getItem('daybreak:favorites') || '[]')
    return Array.isArray(favorites) ? favorites.filter((id) => experiences.some((experience) => experience.id === id)) : []
  } catch {
    return []
  }
}

function getDailyStreak(history, today) {
  const days = new Set(history)
  let cursor = new Date(`${today}T00:00:00Z`)
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1)

  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1 2.5 2 1-2 1-1 2.5-1-2.5-2-1 2-1 1-2.5Z" /></>,
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="google-mark" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.5 13.4l7.8 6.1C12.2 13.8 17.6 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M47.5 24.5c0-1.6-.2-3.2-.5-4.7H24v9.4h13.2c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.6-10.1 7.6-17.7Z" />
      <path fill="#FBBC05" d="M10.3 28.5a14.5 14.5 0 0 1 0-9l-7.8-6.1a24 24 0 0 0 0 21.2l7.8-6.1Z" />
      <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.5 2.2-6.4 0-11.8-4.3-13.7-10l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  )
}

function AuthDialog({ onClose, user, onUserChange }) {
  const [mode, setMode] = useState('signin')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  function firebaseError(error) {
    const messages = {
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/invalid-credential': 'Incorrect email or password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
      'auth/popup-closed-by-user': 'The Google sign-in window was closed.',
      'auth/popup-blocked': 'Your browser blocked the popup. Allow popups and try again.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
      'auth/unauthorized-domain': 'This domain is not authorized in Firebase.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    }
    return messages[error?.code] || 'Something went wrong. Please try again.'
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const values = new FormData(event.currentTarget)
    const submittedEmail = String(values.get('email') || '').trim()

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, submittedEmail)
        setMessage('Reset link sent. Check your inbox.')
        return
      }

      await setPersistence(auth, browserLocalPersistence)
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, submittedEmail, String(values.get('password') || ''))
        const displayName = String(values.get('name') || '').trim()
        if (displayName) await updateProfile(credential.user, { displayName })
        onUserChange(auth.currentUser)
        onClose()
      } else {
        const credential = await signInWithEmailAndPassword(auth, submittedEmail, String(values.get('password') || ''))
        onUserChange(credential.user)
        onClose()
      }
    } catch (error) {
      setMessage(firebaseError(error))
    } finally {
      setBusy(false)
    }
  }

  async function googleSignIn() {
    setBusy(true)
    setMessage('')
    try {
      await setPersistence(auth, browserLocalPersistence)
      const credential = await signInWithPopup(auth, new GoogleAuthProvider())
      onUserChange(credential.user)
      onClose()
    } catch (error) {
      setMessage(firebaseError(error))
    } finally {
      setBusy(false)
    }
  }

  async function signOutAccount() {
    setBusy(true)
    setMessage('')
    try {
      await signOut(auth)
      onUserChange(null)
      onClose()
    } catch (error) {
      setMessage(firebaseError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close sign in dialog"><Icon name="close" size={19} /></button>
        {user ? (
          <>
            <div className="dialog-kicker">YOUR DAYBREAK ACCOUNT</div>
            <h2 id="auth-title">You’re in, {user.displayName?.split(' ')[0] || 'friend'}.</h2>
            <p className="dialog-description">{user.email || 'Signed in with Google'}</p>
            {message && <div className="notice error-notice" role="alert">{message}</div>}
            <button className="auth-submit" type="button" onClick={signOutAccount} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>
          </>
        ) : (
          <>
            <div className="dialog-kicker">A LITTLE SPACE TO GROW</div>
            <h2 id="auth-title">{mode === 'signup' ? 'Join the playground' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
            <p className="dialog-description">{mode === 'signup' ? 'Save your favourites and make yourself at home.' : mode === 'reset' ? 'We’ll email you a link to get back in.' : 'Sign in to save your favourite little discoveries.'}</p>
            {mode !== 'reset' && <button className="google-button dialog-google" type="button" onClick={googleSignIn} disabled={busy}><GoogleMark /><span>Continue with Google</span></button>}
            {mode !== 'reset' && <div className="divider"><span>or use your email</span></div>}
            <form className="dialog-form" onSubmit={submit}>
              {mode === 'signup' && <label>Your name<input name="name" type="text" autoComplete="name" placeholder="e.g. Noor Ahmed" required /></label>}
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              {mode !== 'reset' && <label>Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} required /></label>}
              {message && <div className={`notice ${message.startsWith('Reset link') ? 'success-notice' : 'error-notice'}`} role="status">{message}</div>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
            </form>
            <div className="auth-dialog-switch">
              {mode === 'reset'
                ? <><span>Remembered it?</span> <button type="button" onClick={() => { setMode('signin'); setMessage('') }}>Back to sign in</button></>
                : mode === 'signup'
                  ? <><span>Already have an account?</span> <button type="button" onClick={() => { setMode('signin'); setMessage('') }}>Sign in</button></>
                  : <><span>New around here?</span> <button type="button" onClick={() => { setMode('signup'); setMessage('') }}>Create an account</button><button className="forgot-link" type="button" onClick={() => { setMode('reset'); setMessage('') }}>Forgot password?</button></>}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function DailyChallenge({ dateKey, peerScore, onShare }) {
  const question = getDailyQuestion(dateKey)
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`daybreak:daily:${dateKey}`) || 'null')
      return saved && typeof saved.correct === 'boolean' ? saved : null
    } catch {
      return null
    }
  })
  const [shareMessage, setShareMessage] = useState('')
  const answered = Boolean(selected)
  const correct = selected === question.answer
  const history = getDailyHistory()
  const streak = getDailyStreak(history, getPakistanDateKey())
  const dateLabel = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00+05:00`))

  function lockResult() {
    const nextResult = { correct, answer: selected }
    setResult(nextResult)
    try {
      const updatedHistory = [...new Set([...getDailyHistory(), dateKey])]
      localStorage.setItem('daybreak:daily-history', JSON.stringify(updatedHistory))
      localStorage.setItem(`daybreak:daily:${dateKey}`, JSON.stringify(nextResult))
    } catch {
      setShareMessage('Your result is saved for this visit, but this browser blocked local storage.')
    }
  }

  async function shareDailyResult() {
    setShareMessage('')
    await onShare({
      title: 'Daybreak daily challenge',
      text: `I got ${result.correct ? '1' : '0'}/1 on Daybreak’s daily Pakistan challenge. Your turn!`,
      params: { daily: '1', day: dateKey, score: result.correct ? '1' : '0' },
      onStatus: setShareMessage,
    })
  }

  return (
    <div className="daily-challenge" id="daily-play">
      <div className="daily-header">
        <div>
          <span className="daily-kicker"><span className="daily-spark">✳</span> Aaj ka challenge · {dateLabel}</span>
          <h2>One question. Same for everyone.</h2>
          <p>A tiny daily brain-break, picked for today in Pakistan.</p>
        </div>
        <div className="daily-streak"><span>✦</span><strong>{streak}</strong><small>day streak</small></div>
      </div>

      {result ? (
        <div className="daily-result">
          <div className="daily-result-copy">
            <span className={`daily-score-icon${result.correct ? ' correct' : ''}`}>{result.correct ? '✓' : '↻'}</span>
            <div>
              <strong>{result.correct ? 'You got it!' : 'Good one to remember.'}</strong>
              <p>{question.note}</p>
              {peerScore !== null && peerScore !== undefined && (
                <p className="friend-comparison">
                  Your friend got {peerScore}/1. {Number(peerScore) === Number(result.correct) ? 'You matched!' : Number(peerScore) > Number(result.correct) ? 'They got this one!' : 'You got this one!'}
                </p>
              )}
            </div>
          </div>
          <div className="daily-result-actions">
            <button className="daily-share-button" type="button" onClick={shareDailyResult}><Icon name="arrow" size={16} /> Challenge a friend</button>
            {shareMessage && <span className="share-feedback" role="status">{shareMessage}</span>}
          </div>
        </div>
      ) : (
        <>
          <div className="daily-question-row">
            <h3>{question.question}</h3>
            <span className="daily-question-count">01 / 01</span>
          </div>
          {!answered ? (
            <div className="daily-options">
              {question.options.map((option) => (
                <button type="button" key={option} onClick={() => setSelected(option)}>{option}<Icon name="arrow" size={16} /></button>
              ))}
            </div>
          ) : (
            <div className="daily-answer-review">
              <div className={`daily-answer-note${correct ? ' is-correct' : ' is-incorrect'}`}>
                <strong>{correct ? 'That’s right.' : `Not quite — it’s ${question.answer}.`}</strong>
                <span>{question.note}</span>
              </div>
              <button className="daily-share-button" type="button" onClick={lockResult}>Lock in today’s result <Icon name="arrow" size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CityMatch({ peerCity, onShare }) {
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState({})
  const [shareMessage, setShareMessage] = useState('')
  const done = step >= cityQuestions.length
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Lahore'

  function answer(city) {
    setScores((current) => ({ ...current, [city]: (current[city] || 0) + 1 }))
    setStep((current) => current + 1)
  }

  function restart() {
    setScores({})
    setStep(0)
  }

  return (
    <div className="experience-content city-experience">
      {done ? (
        <div className="city-result">
          <div className="result-emoji">{cityResults[winner].emoji}</div>
          <span className="experience-eyebrow">YOUR CITY IS</span>
          <h3>{winner}</h3>
          <p className="result-line">{cityResults[winner].line}</p>
          <p>{cityResults[winner].detail}</p>
          {peerCity && (
            <div className={`city-match-note${peerCity === winner ? ' is-match' : ''}`}>
              <span>{peerCity === winner ? '✳' : '↗'}</span>
              <p>Your friend got <strong>{peerCity}</strong>. {peerCity === winner ? 'Same-city energy!' : `Different cities, good company. ${cityResults[peerCity]?.line || ''}`}</p>
            </div>
          )}
          <button
            className="play-again-button"
            type="button"
            onClick={async () => {
              setShareMessage('')
              await onShare({
                title: 'Which Pakistani city is your vibe?',
                text: `I got ${winner} on Daybreak. Take the quiz and see if we match!`,
                params: { challenge: 'city-match', city: winner },
                onStatus: setShareMessage,
              })
            }}
          >
            Challenge a friend <Icon name="arrow" size={17} />
          </button>
          {shareMessage && <span className="share-feedback city-share-feedback" role="status">{shareMessage}</span>}
          <button className="play-again-button" type="button" onClick={restart}>Take it again <Icon name="arrow" size={17} /></button>
        </div>
      ) : (
        <>
          <div className="question-progress"><span>QUESTION {step + 1} / {cityQuestions.length}</span><div><i style={{ width: `${((step + 1) / cityQuestions.length) * 100}%` }} /></div></div>
          <h3>{cityQuestions[step].question}</h3>
          <div className="answer-grid">
            {cityQuestions[step].options.map((option) => <button type="button" key={option.city} onClick={() => answer(option.city)}>{option.label}<Icon name="arrow" size={17} /></button>)}
          </div>
        </>
      )}
    </div>
  )
}

function ChaiCalculator() {
  const [cups, setCups] = useState(14)
  const pricePerCup = 100
  const weeklySpend = cups * pricePerCup
  const yearlySpend = weeklySpend * 52
  const yearlyBooks = Math.floor(yearlySpend / 1200)

  return (
    <div className="experience-content chai-experience">
      <div className="chai-total">
        <span>YOUR WEEKLY CHAI BUDGET</span>
        <strong>{formatRupees(weeklySpend)}</strong>
        <small>At an estimated {formatRupees(pricePerCup)} per cup</small>
      </div>
      <label className="range-label" htmlFor="chai-cups"><span>How many cups do you have in a week?</span><strong>{cups} cups</strong></label>
      <input id="chai-cups" className="chai-range" type="range" min="1" max="50" value={cups} onChange={(event) => setCups(Number(event.target.value))} />
      <div className="range-limits"><span>1 cup</span><span>50 cups</span></div>
      <div className="chai-comparison">
        <span className="comparison-cup">☕</span>
        <p>That’s <strong>{formatRupees(yearlySpend)}</strong> a year — or about <strong>{yearlyBooks} books</strong> at Rs 1,200 each. No judgement. Chai is important.</p>
      </div>
      <p className="tool-disclaimer">A playful estimate. Actual chai prices vary by city, cafe, and how long you stay for “one last cup”.</p>
    </div>
  )
}

function PakistanQuiz() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState('')
  const finished = questionIndex >= quizQuestions.length
  const question = quizQuestions[questionIndex]

  function choose(option) {
    if (selected) return
    setSelected(option)
    if (option === question.answer) setScore((current) => current + 1)
  }

  function next() {
    setSelected('')
    setQuestionIndex((current) => current + 1)
  }

  function restart() {
    setQuestionIndex(0)
    setScore(0)
    setSelected('')
  }

  if (finished) {
    const response = score === quizQuestions.length ? 'A+ energy. You know your Pakistan.' : score >= 3 ? 'Solid score. You know a thing or two.' : 'A few new facts for your next chai break.'
    return <div className="experience-content quiz-result"><div className="result-emoji">{score === quizQuestions.length ? '🏆' : '🇵🇰'}</div><span className="experience-eyebrow">YOUR SCORE</span><h3>{score} <span>/ {quizQuestions.length}</span></h3><p>{response}</p><button className="play-again-button" type="button" onClick={restart}>Play again <Icon name="arrow" size={17} /></button></div>
  }

  return (
    <div className="experience-content trivia-experience">
      <div className="question-progress"><span>QUESTION {questionIndex + 1} / {quizQuestions.length}</span><div><i style={{ width: `${((questionIndex + 1) / quizQuestions.length) * 100}%` }} /></div></div>
      <h3>{question.question}</h3>
      <div className="trivia-options">
        {question.options.map((option) => {
          const isCorrect = selected && option === question.answer
          const isWrong = selected === option && option !== question.answer
          return <button className={isCorrect ? 'is-correct' : isWrong ? 'is-wrong' : ''} type="button" key={option} onClick={() => choose(option)} disabled={Boolean(selected)}>{option}{isCorrect && <Icon name="check" size={17} />}</button>
        })}
      </div>
      {selected && <div className="trivia-feedback"><p>{question.note}</p><button className="play-again-button" type="button" onClick={next}>{questionIndex === quizQuestions.length - 1 ? 'See your score' : 'Next question'} <Icon name="arrow" size={17} /></button></div>}
    </div>
  )
}

function ExperiencePanel({ experience, onClose, peerCity, onShare }) {
  const active = experiences.find((item) => item.id === experience)
  if (!active) return null

  return (
    <section className={`experience-panel panel-${active.color}`} id="play">
      <div className="experience-topline">
        <div><span className="experience-eyebrow">{active.category} · {active.time}</span><h2>{active.title}</h2></div>
        <button className="experience-close" type="button" onClick={onClose} aria-label="Close experience"><Icon name="close" size={19} /></button>
      </div>
      <p className="experience-description">{active.description}</p>
      {active.id === 'city-match' ? <CityMatch peerCity={peerCity} onShare={onShare} /> : active.id === 'chai-calculator' ? <ChaiCalculator /> : <PakistanQuiz />}
    </section>
  )
}

function App() {
  const initialParams = new URLSearchParams(window.location.search)
  const initialCity = initialParams.get('city')
  const initialDay = initialParams.get('day')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState(() => (
    initialParams.get('challenge') === 'city-match' && cityResults[initialCity] ? 'city-match' : ''
  ))
  const [peerCity, setPeerCity] = useState(() => cityResults[initialCity] ? initialCity : '')
  const [dailyOpen, setDailyOpen] = useState(() => initialParams.get('daily') === '1')
  const [dailyDate, setDailyDate] = useState(() => (
    initialParams.get('daily') === '1' && /^\d{4}-\d{2}-\d{2}$/.test(initialDay || '')
      && isDateKey(initialDay)
      ? initialDay
      : getPakistanDateKey()
  ))
  const [peerDailyScore] = useState(() => {
    const score = initialParams.get('score')
    return initialParams.get('daily') === '1' && (score === '0' || score === '1') ? Number(score) : null
  })
  const [filter, setFilter] = useState('Everything')
  const [search, setSearch] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [favorites, setFavorites] = useState(() => {
    return getSavedFavorites()
  })

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser)
    setAuthLoading(false)
  }, () => setAuthLoading(false)), [])

  useEffect(() => {
    if (!selectedExperience && !dailyOpen) return undefined
    const targetId = dailyOpen ? 'daily-play' : 'play'
    const timeout = window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    return () => window.clearTimeout(timeout)
  }, [dailyOpen, selectedExperience])

  const visibleExperiences = useMemo(() => experiences.filter((experience) => {
    const matchesFilter = filter === 'Everything'
      || (filter === 'Little tools' && experience.category === 'LITTLE TOOL')
      || (filter === 'Quizzes' && ['QUIZ', 'TRIVIA'].includes(experience.category))
      || (filter === 'Saved' && favorites.includes(experience.id))
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${experience.title} ${experience.description} ${experience.category}`.toLowerCase().includes(query)
    return matchesFilter && matchesSearch
  }), [favorites, filter, search])

  function toggleFavorite(id) {
    const nextFavorites = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [...favorites, id]

    try {
      localStorage.setItem('daybreak:favorites', JSON.stringify(nextFavorites))
      setFavorites(nextFavorites)
      setStorageWarning('')
    } catch {
      setStorageWarning('This browser blocked saving favourites. You can still play without saving them.')
    }
  }

  function openExperience(id) {
    setPeerCity('')
    setSelectedExperience(id)
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, '', url)
  }

  async function shareLink({ title, text, params, onStatus }) {
    const url = new URL(window.location.href)
    url.search = ''
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    url.hash = params.daily ? 'daily-play' : 'play'

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url.toString() })
        onStatus('Challenge shared. Let the friendly rivalry begin!')
      } catch (error) {
        if (error.name !== 'AbortError') onStatus('Could not open sharing. Try copying the link from your browser.')
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url.toString())
      onStatus('Challenge link copied. Send it to your friend!')
    } catch {
      onStatus(`Copy this challenge link: ${url.toString()}`)
    }
  }

  function openDailyChallenge() {
    setDailyDate(getPakistanDateKey())
    setDailyOpen(true)
  }

  function clearChallengeUrl() {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    window.history.replaceState({}, '', url)
  }

  function closeExperience() {
    setSelectedExperience('')
    setPeerCity('')
    clearChallengeUrl()
  }

  const dateText = new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className="daybreak-app">
      <header className="site-header">
        <a href="#home" className="site-brand" aria-label="Daybreak home">
          <span className="brand-mark"><Icon name="spark" size={20} /></span>
          <span>daybreak<span className="brand-period">.</span></span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#daily-challenge">Today</a>
          <a className="nav-active" href="#discover">Discover</a>
          <a href="#about">About</a>
        </nav>
        <div className="header-actions">
          <span className="date-chip">{dateText}</span>
          {authLoading
            ? <span className="header-loading" aria-label="Checking account" />
            : <button className={`account-button${user ? ' signed-in' : ''}`} type="button" onClick={() => setAuthOpen(true)}>
              {user?.photoURL
                ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                : user ? (user.displayName?.[0] || user.email?.[0] || 'D').toUpperCase() : 'Sign in'}
            </button>}
        </div>
      </header>

      <main id="home">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="live-dot" /> A LITTLE INTERNET, MADE HERE <span className="flag-stamp">پاکستان</span></div>
            <h1>Curiosity looks<br />good on <em>you.</em></h1>
            <p>Small things to click, think about, and send to your group chat. Made with love, from Pakistan.</p>
            <a className="hero-link" href="#discover">Find your next little thing <Icon name="arrow" size={17} /></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-sun" />
            <div className="art-moon">✳</div>
            <div className="art-mountain mountain-back" />
            <div className="art-mountain mountain-front" />
            <div className="art-orbit orbit-a" />
            <div className="art-orbit orbit-b" />
            <span className="art-label label-top">33° 41′ N</span>
            <span className="art-label label-bottom">SOMEWHERE IN PAKISTAN</span>
            <span className="art-star star-one">✦</span>
            <span className="art-star star-two">✧</span>
          </div>
          <div className="hero-footnote"><span>NO BIG PLAN. JUST GOOD CURIOSITY.</span><span>01 — 03</span></div>
        </section>

        <section className="discover-section" id="discover">
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE PLAYGROUND</span>
              <h2>A few things to get lost in<span>.</span></h2>
            </div>
            <div className="play-count"><strong>{experiences.length.toString().padStart(2, '0')}</strong><span>little experiences<br />and counting</span></div>
          </div>

          <section className="daily-challenge-card" id="daily-challenge">
            <div className="daily-card-intro">
              <span className="daily-kicker"><span className="daily-spark">✳</span> A LITTLE SOMETHING FOR TODAY</span>
              <h2>Aaj ka challenge.</h2>
              <p>One question for everyone. Answer it, then send the same challenge to your people.</p>
            </div>
            <div className="daily-card-action">
              <span className="daily-time">01 QUESTION · UNDER A MINUTE</span>
              <button type="button" onClick={() => {
                if (dailyOpen) {
                  setDailyOpen(false)
                  clearChallengeUrl()
                } else {
                  openDailyChallenge()
                }
              }}>
                {dailyOpen ? 'Hide today’s challenge' : 'Play today’s challenge'}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </section>
          {dailyOpen && <DailyChallenge dateKey={dailyDate} peerScore={peerDailyScore} onShare={shareLink} />}
          {selectedExperience && <ExperiencePanel key={selectedExperience} experience={selectedExperience} onClose={closeExperience} peerCity={peerCity} onShare={shareLink} />}
          {storageWarning && <p className="storage-warning" role="status">{storageWarning}</p>}

          <div className="browse-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter experiences">
              {filters.map((item) => <button className={filter === item ? 'filter-active' : ''} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}
            </div>
            <label className="search-box">
              <Icon name="search" size={17} />
              <input type="search" aria-label="Search experiences" placeholder="Find a little something" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>

          {visibleExperiences.length ? (
            <div className="experience-grid">
              {visibleExperiences.map((experience, index) => {
                const isFavorite = favorites.includes(experience.id)
                return (
                  <article className={`experience-card card-${experience.color}${experience.featured ? ' featured-card' : ''}`} key={experience.id}>
                    <div className="card-topline"><span>{experience.category}</span><button type="button" className={`favorite-button${isFavorite ? ' favorited' : ''}`} onClick={() => toggleFavorite(experience.id)} aria-label={isFavorite ? 'Remove from saved' : 'Save experience'} aria-pressed={isFavorite}><Icon name="heart" size={18} /></button></div>
                    <button className="card-main" type="button" onClick={() => openExperience(experience.id)}>
                      <div className="card-illustration" aria-hidden="true"><span>{experience.icon}</span><i>{String(index + 1).padStart(2, '0')}</i></div>
                      <div className="card-copy"><span className="card-time">{experience.time}</span><h3>{experience.title}</h3><p>{experience.description}</p></div>
                      <span className="card-arrow"><Icon name="arrow" size={18} /></span>
                    </button>
                    <div className="card-bottom"><span>{isFavorite ? 'SAVED FOR LATER' : 'A DAYBREAK ORIGINAL'}</span><span>↗</span></div>
                  </article>
                )
              })}
            </div>
          ) : <div className="empty-results"><span>✳</span><h3>No little things found.</h3><p>Try another search or switch the filter.</p></div>}
        </section>

        <section className="closing-note" id="about">
          <div className="closing-symbol">✳</div>
          <p>Made for curious minds, wherever you’re from.<br /><span>Made with extra love in Pakistan.</span></p>
          <a href="#home" aria-label="Back to top">↑</a>
        </section>
      </main>
      <footer className="site-footer"><a href="#home">daybreak<span>.</span></a><span>A softer corner of the internet · © 2026</span><span>اسلام علیکم ✳</span></footer>
      {authOpen && <AuthDialog user={user} onUserChange={setUser} onClose={() => setAuthOpen(false)} />}
    </div>
  )
}

export default App
