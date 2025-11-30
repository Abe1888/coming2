import React from 'react';

interface HeaderProps {
  connectionStatus: 'connected' | 'disconnected';
}

export const Header: React.FC<HeaderProps> = ({ connectionStatus }) => {
  return (
    <div style={{
      background: 'rgba(29, 38, 53, 0.95)',
      borderBottom: '2px solid #be202e',
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(10px)'
    }}>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '28px' }}>🎨</span>
          Controller Studio
        </h1>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '13px',
          color: '#b8b8b8'
        }}>
          Real-time 3D object positioning and configuration
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          background: connectionStatus === 'connected' ? 'rgba(32, 151, 113, 0.2)' : 'rgba(190, 32, 46, 0.2)',
          border: `1px solid ${connectionStatus === 'connected' ? '#209771' : '#be202e'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connectionStatus === 'connected' ? '#209771' : '#be202e',
            boxShadow: `0 0 8px ${connectionStatus === 'connected' ? '#209771' : '#be202e'}`
          }} />
          {connectionStatus === 'connected' ? 'Main App Connected' : 'Main App Disconnected'}
        </div>
      </div>
    </div>
  );
};
