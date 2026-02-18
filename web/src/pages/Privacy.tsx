import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <>
      <header style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a3a5c 100%)',
        color: 'white',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        borderRadius: '0 0 24px 24px',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Privacy</h1>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem', fontWeight: 500 }}>← Back</Link>

        <div style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: '1rem' }}>SmartPocketBuddy stores data locally on your device only.</p>
          <p style={{ marginBottom: '1rem' }}><strong>Location</strong> — Used only when you activate Safety Mode, shared with your chosen emergency contact via SMS. Not stored on our servers.</p>
          <p style={{ marginBottom: '1rem' }}><strong>Recordings</strong> — Stored on your device. You control sharing.</p>
          <p style={{ marginBottom: '1rem' }}><strong>Contacts</strong> — Used only to let you select an emergency contact. Not uploaded anywhere.</p>
          <p style={{ marginBottom: '1rem' }}>We do not collect, sell, or share your personal data.</p>
        </div>
      </main>
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <Link to="/">Home</Link> · <Link to="/support">Support</Link> · <a href="https://github.com/BTheCoderr/smartprobonopocketbuddy">GitHub</a>
      </footer>
    </>
  )
}
