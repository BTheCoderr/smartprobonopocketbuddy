import { Link } from 'react-router-dom'

export default function Support() {
  return (
    <>
      <header style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a3a5c 100%)',
        color: 'white',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        borderRadius: '0 0 24px 24px',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Support</h1>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem', fontWeight: 500 }}>← Back</Link>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Thank you for using SmartPocketBuddy.</p>

        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', margin: '1rem 0', boxShadow: '0 2px 8px rgba(15,43,70,0.06)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Getting started</h3>
          <ul style={{ marginLeft: '1.25rem', color: 'var(--text-muted)' }}>
            <li>Set emergency contact in Settings → Setup Contact</li>
            <li>Tap Start on Home to enter Safety Mode</li>
            <li>Confirm with second tap — location shared, guidance shown</li>
          </ul>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', margin: '1rem 0', boxShadow: '0 2px 8px rgba(15,43,70,0.06)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>FAQ</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>Where is my data stored?</strong> On your device only. Nothing is sent to servers.</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>How do I share a recording?</strong> History → tap event → Share recording.</p>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', margin: '1rem 0', boxShadow: '0 2px 8px rgba(15,43,70,0.06)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Contact</h3>
          <a href="https://github.com/BTheCoderr/smartprobonopocketbuddy/issues">Open an issue on GitHub</a>
        </div>
      </main>
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <Link to="/">Home</Link> · <Link to="/privacy">Privacy</Link> · <a href="https://github.com/BTheCoderr/smartprobonopocketbuddy">GitHub</a>
      </footer>
    </>
  )
}
