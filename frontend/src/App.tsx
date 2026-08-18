import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import ChallengeDetail from './ChallengeDetail'

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

// Same "days since start, +1" math as the backend's /today endpoint --
// kept in sync manually for now since this is just for sorting
// challenges into tabs, not anything that needs to be authoritative.
function getDayNumber(startDate: string): number {
  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - start.getTime()) / 86400000)
  return diffDays + 1
}

// A challenge is archived once today's day number has passed its last
// prompt. Not-yet-started challenges (dayNumber <= 0) fall through to
// "not archived," which keeps them in the Active tab.
function isArchived(challenge: Challenge): boolean {
  return getDayNumber(challenge.startDate) > challenge.prompts.length
}

// The last day's date = startDate + (number of prompts - 1) days,
// since startDate itself counts as day 1.
function getEndDate(challenge: Challenge): string {
  const end = new Date(`${challenge.startDate}T00:00:00`)
  end.setDate(end.getDate() + challenge.prompts.length - 1)
  return end.toISOString().split('T')[0]
}

// A JWT is three base64url-encoded parts separated by dots; the middle
// one is the payload holding the claims. Reading it client-side is only
// safe for deciding what UI to SHOW -- anyone can edit their own copy of
// a token, so the backend's hasAuthority("delete:challenges") check is
// what actually protects the data. This just avoids showing a delete
// button that would 403 anyway.
function getPermissions(accessToken: string): string[] {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    return payload.permissions ?? []
  } catch {
    return []
  }
}

// --- Press-shop decoration ------------------------------------------------
// The riso plates a card can be printed on, and the tilts it can be pasted
// down at. Both are keyed off the challenge id rather than the array index
// so a card keeps the same colour and angle when you switch tabs.
const PLATES = ['bg-blush', 'bg-butter', 'bg-sage', 'bg-powder', 'bg-lilac']
const TILTS = ['-1.5deg', '1.2deg', '-0.8deg', '1.9deg', '-1.9deg', '0.7deg']

function plateFor(id: number): string {
  return PLATES[Math.abs(id) % PLATES.length]
}

function tiltFor(id: number): string {
  return TILTS[Math.abs(id) % TILTS.length]
}

// Inline-SVG flourishes. No external image files anywhere in here.
function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
      className={className}
    >
      <path
        d="M0 6c12-9 24 9 36 0s24-9 36 0 24 9 36 0 24-9 36 0 24 9 36 0 24-9 36 0 24 9 36 0 24-9 36 0"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Asterisk({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={className}>
      <path
        d="M12 3v18M4 7l16 10M20 7L4 17"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function App() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0()
  const [newTitle, setNewTitle] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newPrompts, setNewPrompts] = useState('')
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [isAdmin, setIsAdmin] = useState(false)

  const deleteChallenge = async (id: number) => {
    const token = await getAccessTokenSilently()
    const response = await fetch(`http://localhost:8080/api/challenges/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      console.error('Failed to delete challenge:', response.status)
      return
    }

    // Drop it from local state rather than refetching -- we already
    // know exactly which one went away.
    setChallenges((current) => current.filter((challenge) => challenge.id !== id))
  }

  const createChallenge = async (event: React.FormEvent) => {
  event.preventDefault()

  // .trim() means whitespace-only input (e.g. someone just hits the
  // spacebar) is treated the same as empty -- guards against a
  // technically-non-empty string that's still useless data.
  if (!newTitle.trim() || !newStartDate.trim() || !newPrompts.trim()) {
    setFormError('Please add params for this challenge')
    return
  }
  setFormError(null)

  const token = await getAccessTokenSilently()
  const response = await fetch('http://localhost:8080/api/challenges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: newTitle,
      startDate: newStartDate,
      prompts: newPrompts,
    }),
  })

    if (!response.ok) {
      console.error('Failed to create challenge:', response.status)
      return
    }

    // Clear the form, then refetch the list so the new card shows up.
    setNewTitle('')
    setNewStartDate('')
    setNewPrompts('')
    const updated = await fetch('http://localhost:8080/api/challenges', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json())
    setChallenges(updated)
  }


  useEffect(() => {
    if (!isAuthenticated) return

    const fetchChallenges = async () => {
      const token = await getAccessTokenSilently()
      setIsAdmin(getPermissions(token).includes('delete:challenges'))

      const response = await fetch('http://localhost:8080/api/challenges', {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Checking response.ok BEFORE parsing means a 500/401/etc. never
      // gets treated as if it were the real data -- we bail out here
      // with a clear error instead of handing a malformed shape to
      // setChallenges() and crashing the render later.
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Belt-and-suspenders: even on a 200, guard against the body not
      // actually being an array before trusting it.
      if (!Array.isArray(data)) {
        throw new Error('Expected an array of challenges, got something else')
      }

      setChallenges(data)
    }

    fetchChallenges().catch((error) => console.error('Failed to fetch:', error))
  }, [isAuthenticated, getAccessTokenSilently])

  // Early return: while logged out, this component only ever renders
  // the onboarding screen -- none of the header/form/grid JSX below
  // even runs, so there's nothing for a logged-out visitor to see
  // besides the login prompt.
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        <div
          className="riso-card w-full max-w-md bg-paper px-7 py-10 text-center sm:px-10"
          style={{ '--tilt': '-1.4deg' } as React.CSSProperties}
        >
          <p className="riso-label">Est. in a sketchbook</p>

          <h1 className="handwrite mt-3 text-[clamp(3.25rem,16vw,5.5rem)] leading-[0.82] font-black tracking-[-0.045em] text-ink">
            artbots
          </h1>

          <Squiggle className="mx-auto mt-5 h-3 w-48 text-blush" />

          <p className="mx-auto mt-5 max-w-xs font-body text-[0.975rem] leading-relaxed text-ink-soft">
            Post your art for 30-day challenges with friends.
          </p>

          {/* Three plates, misregistered on purpose. */}
          <div className="mt-7 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-5 w-5 rotate-3 rounded-full border-[2.5px] border-ink bg-butter" />
            <span className="h-5 w-5 -rotate-6 rounded-full border-[2.5px] border-ink bg-sage" />
            <span className="h-5 w-5 rotate-6 rounded-full border-[2.5px] border-ink bg-powder" />
          </div>

          <button
            onClick={() => loginWithRedirect()}
            className="riso-btn mt-7 bg-butter px-8 py-3 text-base tracking-wide hover:bg-blush"
          >
            Log In
          </button>
        </div>

        <p className="riso-label mt-8 text-center text-ink-faint">
          One prompt a day · No excuses
        </p>
      </div>
    )
  }

  const visibleChallenges = challenges.filter((challenge) =>
    activeTab === 'archived' ? isArchived(challenge) : !isArchived(challenge),
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-paper/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <h1 className="handwrite text-3xl leading-none font-black tracking-[-0.04em] text-ink sm:text-4xl">
              artbots
            </h1>
            <Asterisk className="h-4 w-4 shrink-0 -rotate-12 self-center text-blush" />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden font-body text-sm font-semibold text-ink-soft sm:inline">
              {user?.name}
            </span>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="riso-btn bg-paper-deep px-3 py-1.5 text-xs tracking-[0.14em] uppercase hover:bg-blush"
            >
              Log Out
            </button>
          </div>

          {/* Tab switcher. The indicator is one absolutely-positioned pill that
              slides between the two halves; the labels sit on top of it. */}
          <nav className="order-last w-full sm:order-none sm:w-auto">
            <div className="relative grid w-full grid-cols-2 gap-1 rounded-riso border-[2.5px] border-ink bg-paper-deep p-1 shadow-riso-sm sm:w-[22rem]">
              <span
                aria-hidden="true"
                className={`tab-slider pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-riso border-[2.5px] border-ink ${
                  activeTab === 'archived' ? 'translate-x-full bg-lilac' : 'translate-x-0 bg-butter'
                }`}
              />
              <button
                onClick={() => setActiveTab('active')}
                aria-pressed={activeTab === 'active'}
                className={`relative z-10 cursor-pointer rounded-riso px-2 py-1.5 font-body text-[0.7rem] font-bold tracking-[0.16em] uppercase transition-colors duration-150 sm:text-xs ${
                  activeTab === 'active' ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                aria-pressed={activeTab === 'archived'}
                className={`relative z-10 cursor-pointer rounded-riso px-2 py-1.5 font-body text-[0.7rem] font-bold tracking-[0.16em] uppercase transition-colors duration-150 sm:text-xs ${
                  activeTab === 'archived' ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Archived
              </button>
            </div>
          </nav>
        </div>
      </header>

      {selectedChallenge ? (
        <ChallengeDetail
          challenge={selectedChallenge}
          onBack={() => setSelectedChallenge(null)}
        />
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          {/* Masthead */}
          <div className="mb-10">
            <p className="riso-label">
              {activeTab === 'archived' ? 'The back catalogue' : 'Now printing'}
            </p>
            <h2 className="handwrite mt-1 text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.85] font-black tracking-[-0.045em] text-ink">
              {activeTab === 'archived' ? 'Archived' : 'Active'}
              <br />
              <span className="text-ink-soft italic">challenges</span>
            </h2>
            <Squiggle className="mt-4 h-3 w-full max-w-sm text-sage" />
          </div>

          {/* Create form, dressed as a filled-out index card. */}
          <form
            onSubmit={createChallenge}
            className="riso-card index-card relative mb-14 max-w-md px-5 pt-9 pb-6 sm:px-7"
            style={{ '--tilt': '-0.9deg' } as React.CSSProperties}
          >
            {/* Tabbed divider sticking out of the top of the card. */}
            <span className="riso-label absolute -top-4 left-5 rotate-[-2deg] rounded-riso border-[2.5px] border-ink bg-butter px-2.5 py-1 text-[0.6rem] text-ink shadow-riso-sm">
              New Challenge
            </span>

            {/* The red margin rule and its punched hole. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-4 left-3 w-px bg-blush sm:left-4"
            />
            <span
              aria-hidden="true"
              className="absolute top-4 right-4 h-3.5 w-3.5 rounded-full border-[2.5px] border-ink bg-paper"
            />

            <div className="relative flex flex-col gap-4">
              <label className="block">
                <span className="riso-label">Title</span>
                <input
                  type="text"
                  placeholder="Challenge title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  className="riso-field mt-1.5"
                />
              </label>

              <label className="block">
                <span className="riso-label">Starts on</span>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(event) => setNewStartDate(event.target.value)}
                  className="riso-field mt-1.5"
                />
              </label>

              <label className="block">
                <span className="riso-label">Prompts, comma separated</span>
                <textarea
                  placeholder="cat, dog, forest, ocean, mountain..."
                  value={newPrompts}
                  onChange={(event) => setNewPrompts(event.target.value)}
                  rows={3}
                  className="riso-field mt-1.5 resize-y"
                />
              </label>

              <button
                type="submit"
                className="riso-btn mt-1 self-start bg-sage px-5 py-2.5 text-sm tracking-[0.1em] uppercase hover:bg-butter"
              >
                Create Challenge
              </button>

              {formError && (
                <p className="flex items-start gap-2 font-body text-sm font-bold text-brick">
                  <Asterisk className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-12" />
                  <span className="border-b-[2.5px] border-brick/45 pb-0.5">{formError}</span>
                </p>
              )}
            </div>
          </form>

          {visibleChallenges.length === 0 ? (
            <div
              className="mx-auto max-w-md rotate-[-1deg] rounded-riso border-[3px] border-dashed border-ink/40 px-6 py-14 text-center"
            >
              {/* An empty frame, hung crooked. */}
              <svg
                viewBox="0 0 80 64"
                aria-hidden="true"
                fill="none"
                className="mx-auto h-16 w-20 text-ink/35"
              >
                <rect
                  x="6"
                  y="6"
                  width="68"
                  height="52"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  d="M16 46l14-16 10 11 8-7 16 12"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="handwrite mt-4 text-2xl font-black tracking-tight text-ink">
                {activeTab === 'archived' ? 'Nothing in the archive' : 'Nothing on the press'}
              </p>
              <p className="mt-2 font-body text-sm text-ink-soft">
                {activeTab === 'archived'
                  ? 'Finished challenges will collect here.'
                  : 'Start one above and it lands right here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
              {visibleChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => setSelectedChallenge(challenge)}
                  className={`riso-card riso-card-interactive flex flex-col ${plateFor(challenge.id)} p-5`}
                  style={{ '--tilt': tiltFor(challenge.id) } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="handwrite text-2xl leading-[0.95] font-black tracking-[-0.03em] text-ink">
                      {challenge.title}
                    </h2>
                    {isAdmin && (
                      <button
                        onClick={(event) => {
                          // Without stopPropagation the click would also
                          // bubble up to the card's onClick and open the
                          // detail view of the challenge we just deleted.
                          event.stopPropagation()
                          deleteChallenge(challenge.id)
                        }}
                        aria-label={`Delete ${challenge.title}`}
                        className="riso-btn shrink-0 border-brick bg-brick-wash px-2.5 py-1 text-[0.6rem] tracking-[0.16em] text-brick uppercase shadow-[3px_3px_0_0_var(--color-brick)] hover:bg-brick hover:text-paper hover:shadow-[5px_5px_0_0_var(--color-brick)] active:shadow-none"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div
                    aria-hidden="true"
                    className="my-4 border-t-[3px] border-dotted border-ink/45"
                  />

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3">
                    <p className="riso-label text-ink">
                      {isArchived(challenge)
                        ? `Ended ${getEndDate(challenge)}`
                        : `Starts ${challenge.startDate}`}
                    </p>

                    {/* Day counter as a ticket stub, notched on both edges. */}
                    <span className="ticket-notch ml-2 inline-flex items-baseline gap-1.5 rounded-riso border-[2.5px] border-ink bg-paper px-3.5 py-1">
                      <span className="handwrite text-lg leading-none font-black text-ink">
                        {challenge.prompts.length}
                      </span>
                      <span className="riso-label text-[0.6rem] text-ink-soft">days</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  )
}

export default App
