import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <header style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a3a5c 100%)',
        color: 'white',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        borderRadius: '0 0 24px 24px',
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>SmartPocketBuddy</h1>
        <p style={{ opacity: 0.9, fontSize: '1rem' }}>AAA for legal situations</p>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          SmartPocketBuddy helps you stay calm and take the right steps during legal or law enforcement interactions.
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          One tap launches Safety Mode: your location is shared with a trusted contact, and you get simple, step-by-step guidance.
        </p>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Features</h2>
        <ul style={{ listStyle: 'none', margin: '1.5rem 0' }}>
          {['One-tap Safety Mode', 'Share location with emergency contacts', 'Calm on-screen guidance', 'Optional recording', 'Event history', 'No jargon. Just support.'].map((f) => (
            <li key={f} style={{
              padding: '0.75rem 0',
              borderBottom: '1px solid #E2E8EC',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
        <Link
          to="/support"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-end))',
            color: 'white',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          Get Support →
        </Link>
      </main>
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <Link to="/support">Support</Link> · <Link to="/privacy">Privacy</Link> · <a href="https://github.com/BTheCoderr/smartprobonopocketbuddy">GitHub</a>
      </footer>
    </>
  )
}
