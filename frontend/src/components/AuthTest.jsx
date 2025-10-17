import { useAuth } from '../context/AuthContext';

function AuthTest() {
  const auth = useAuth();
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#1a1a1a',
      color: '#fff',
      padding: '20px',
      fontFamily: 'monospace',
      fontSize: '14px',
      zIndex: 9999,
      borderBottom: '3px solid #00ff00'
    }}>
      <h2 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>🔍 AUTH DEBUG PANEL</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px' }}>
        <div style={{ color: '#888' }}>Loading:</div>
        <div style={{ color: auth.loading ? '#ff9900' : '#00ff00', fontWeight: 'bold' }}>
          {auth.loading ? '⏳ TRUE' : '✅ FALSE'}
        </div>
        
        <div style={{ color: '#888' }}>User:</div>
        <div style={{ color: auth.user ? '#00ff00' : '#ff0000', fontWeight: 'bold' }}>
          {auth.user ? `✅ ${auth.user.username || 'LOGGED IN'}` : '❌ NULL'}
        </div>
        
        <div style={{ color: '#888' }}>Authenticated:</div>
        <div style={{ color: auth.isAuthenticated ? '#00ff00' : '#ff0000', fontWeight: 'bold' }}>
          {auth.isAuthenticated ? '✅ TRUE' : '❌ FALSE'}
        </div>
        
        <div style={{ color: '#888' }}>Auth Error:</div>
        <div style={{ color: auth.authError ? '#ff0000' : '#00ff00' }}>
          {auth.authError ? '🚫 TRUE' : '✅ FALSE'}
        </div>
      </div>
      
      {auth.user && (
        <details style={{ marginTop: '15px', cursor: 'pointer' }}>
          <summary style={{ color: '#00ff00' }}>📦 Full User Object</summary>
          <pre style={{ 
            background: '#000', 
            padding: '10px', 
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '200px',
            fontSize: '12px'
          }}>
            {JSON.stringify(auth.user, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default AuthTest;
