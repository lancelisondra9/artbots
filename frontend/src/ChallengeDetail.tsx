import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

type Prompt = {
  id: number
  dayNumber: number
  text: string
}

type Challenge = {
  id: number
  title: string
  startDate: string
  prompts: Prompt[]
}

type TodayResponse = {
  dayNumber: number
  promptText: string | null
}

type ChallengeDetailProps = {
  challenge: Challenge
  onBack: () => void
}

// Tilts for the day stamps, keyed off the day number so a stamp always sits
// at the same angle instead of jittering on every render.
const STAMP_TILTS = ['-2.2deg', '1.6deg', '-1deg', '2.4deg', '-1.7deg', '0.9deg']

function stampTilt(dayNumber: number): string {
  return STAMP_TILTS[Math.abs(dayNumber) % STAMP_TILTS.length]
}

// A scribbled ring, drawn around the current day so it can't be missed.
function ScribbleRing({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" fill="none" className={className}>
      <path
        d="M62 9C41 2 15 12 9 33c-6 22 8 48 33 54 24 6 46-9 50-31 4-21-9-40-30-46-6-2-13-2-19-1"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChallengeDetail({ challenge, onBack }: ChallengeDetailProps) {
  const { getAccessTokenSilently } = useAuth0()
  const [today, setToday] = useState<TodayResponse | null>(null)
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchToday = async () => {
      const token = await getAccessTokenSilently()
      const response = await fetch(
        `http://localhost:8080/api/challenges/${challenge.id}/today`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setToday(data)
    }

    fetchToday().catch((error) => console.error('Failed to fetch today:', error))
  }, [challenge.id, getAccessTokenSilently])

  const submitSubmission = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!today) return

    const token = await getAccessTokenSilently()
    const response = await fetch('http://localhost:8080/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: submissionUrl,
        dayNumber: today.dayNumber,
        challengeId: challenge.id,
      }),
    })

    if (!response.ok) {
      console.error('Failed to submit:', response.status)
      return
    }

    setSubmissionUrl('')
    setSubmitted(true)
  }

  // Display-only: the prompts already came down with the challenge, this
  // just puts them in day order for the calendar strip below.
  const orderedPrompts = [...challenge.prompts].sort((a, b) => a.dayNumber - b.dayNumber)
  const currentDay = today?.dayNumber ?? null

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <button
        onClick={onBack}
        className="riso-btn mb-9 bg-paper-deep px-4 py-2 text-xs tracking-[0.14em] uppercase hover:bg-powder"
      >
        ← Back to challenges
      </button>

      <p className="riso-label">Challenge no. {challenge.id}</p>
      <h1 className="handwrite mt-1 text-[clamp(2.5rem,10vw,4.75rem)] leading-[0.85] font-black tracking-[-0.045em] text-ink">
        {challenge.title}
      </h1>
      <p className="riso-label mt-4 text-ink-soft">
        Begins {challenge.startDate} · {challenge.prompts.length} prompts
      </p>

      {/* --- Today's panel ------------------------------------------------ */}
      {today === null ? (
        <div
          className="riso-card mt-8 bg-paper-deep px-6 py-7"
          style={{ '--tilt': '-0.8deg' } as React.CSSProperties}
        >
          <p className="font-body text-ink-soft italic">Loading today's prompt...</p>
        </div>
      ) : today.promptText === null ? (
        <div
          className="riso-card mt-8 bg-paper-deep px-6 py-7"
          style={{ '--tilt': '-0.8deg' } as React.CSSProperties}
        >
          <p className="riso-label">
            {today.dayNumber < 1 ? 'Not started' : 'Wrapped'}
          </p>
          <p className="handwrite mt-1.5 text-2xl font-black tracking-tight text-ink">
            {today.dayNumber < 1
              ? "This challenge hasn't started yet."
              : 'This challenge has ended.'}
          </p>
        </div>
      ) : (
        <div
          className="riso-card mt-8 bg-butter px-5 py-7 sm:px-8"
          style={{ '--tilt': '-1.1deg' } as React.CSSProperties}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="riso-label rounded-riso border-[2.5px] border-ink bg-blush px-2.5 py-1 text-[0.6rem] text-ink shadow-riso-sm">
              Today · Day {today.dayNumber}
            </span>
          </div>

          <p className="handwrite mt-4 text-[clamp(2rem,7vw,3.25rem)] leading-[0.9] font-black tracking-[-0.035em] text-ink">
            {today.promptText}
          </p>

          {submitted ? (
            <div className="mt-7 inline-flex items-center gap-3 rounded-riso border-[2.5px] border-ink bg-sage px-4 py-3 shadow-riso-sm">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                className="h-5 w-5 shrink-0 text-ink"
              >
                <path
                  d="M4 13l5 5L20 6"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="font-body text-sm font-bold text-ink">
                Submitted! Come back tomorrow for the next prompt.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submitSubmission}
              className="mt-7 flex max-w-md flex-col gap-3"
            >
              <label className="block">
                <span className="riso-label">Your piece</span>
                <input
                  type="text"
                  placeholder="Image URL"
                  value={submissionUrl}
                  onChange={(event) => setSubmissionUrl(event.target.value)}
                  className="riso-field mt-1.5"
                />
              </label>
              <button
                type="submit"
                className="riso-btn self-start bg-paper px-5 py-2.5 text-sm tracking-[0.1em] uppercase hover:bg-sage"
              >
                Submit Day {today.dayNumber}
              </button>
            </form>
          )}
        </div>
      )}

      {/* --- The full run of prompts -------------------------------------- */}
      {orderedPrompts.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline gap-4">
            <h2 className="handwrite text-3xl leading-none font-black tracking-[-0.035em] text-ink">
              The full run
            </h2>
            <span className="riso-label hidden text-ink-faint sm:inline">
              every day, in order
            </span>
          </div>

          <ol className="prompt-connector mt-7 flex flex-col gap-4">
            {orderedPrompts.map((prompt) => {
              const isToday = currentDay === prompt.dayNumber
              const isPast = currentDay !== null && prompt.dayNumber < currentDay

              return (
                <li key={prompt.id} className="relative flex items-center gap-4 sm:gap-5">
                  {/* Day stamp. The current day gets scaled up, inked in
                      butter, ringed by hand and flagged. */}
                  <span className="relative z-10 flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center">
                    {isToday && (
                      <ScribbleRing className="pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] text-brick" />
                    )}
                    <span
                      className={`stamp-edge flex h-full w-full items-center justify-center transition-[rotate] duration-200 ${
                        isToday
                          ? 'scale-110 bg-butter shadow-riso'
                          : isPast
                            ? 'bg-paper-edge shadow-riso-sm'
                            : 'bg-paper shadow-riso-sm'
                      }`}
                      style={{ '--tilt': stampTilt(prompt.dayNumber) } as React.CSSProperties}
                    >
                      <span
                        className={`handwrite text-xl leading-none font-black ${
                          isPast && !isToday ? 'text-ink-faint' : 'text-ink'
                        }`}
                      >
                        {prompt.dayNumber}
                      </span>
                    </span>
                  </span>

                  <div
                    className={`riso-card min-w-0 flex-1 px-4 py-3 sm:px-5 ${
                      isToday ? 'bg-blush' : isPast ? 'bg-paper-deep' : 'bg-paper'
                    }`}
                    style={{ '--tilt': isToday ? '-1.2deg' : '0deg' } as React.CSSProperties}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="riso-label text-[0.6rem]">Day {prompt.dayNumber}</p>
                      {isToday && (
                        <span className="today-flag riso-label rounded-riso border-2 border-ink bg-paper px-1.5 py-0.5 text-[0.55rem] text-ink">
                          You are here
                        </span>
                      )}
                      {isPast && !isToday && (
                        <span className="riso-label text-[0.55rem] text-ink-faint">done</span>
                      )}
                    </div>
                    <p
                      className={`handwrite mt-0.5 text-lg leading-tight font-bold break-words ${
                        isPast && !isToday ? 'text-ink-soft' : 'text-ink'
                      }`}
                    >
                      {prompt.text}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}

export default ChallengeDetail
