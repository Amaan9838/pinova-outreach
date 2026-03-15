'use client';

export default function UserPickerModal({ onSelect }) {
  const users = [
    { name: 'Amaan', initials: 'AM', color: '#2563eb' },
    { name: 'Ayushman', initials: 'AY', color: '#7c3aed' },
  ];

  return (
    <div className="m-overlay open" style={{ zIndex: 9999 }}>
      <div style={{
        background: 'var(--s1)', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%',
        margin: 'auto', marginTop: '20vh', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>👋</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', margin: '8px 0 4px' }}>Welcome to Pulse</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Who are you?</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {users.map(u => (
            <button
              key={u.name}
              onClick={() => onSelect(u.name)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 28px', borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--s2)', cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: u.color,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600,
              }}>{u.initials}</div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
