import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { TruckPositionController } from './components/TruckPositionController';
import { CameraController } from './components/CameraController';
import { FuelSensorController } from './components/FuelSensorController';
import { CargoLockController } from './demo/components/CargoLockController';

// Storage keys for real-time sync
const STORAGE_KEYS = {
  TRUCK_CONFIG: 'truck-config',
  CAMERA_CONFIG: 'camera-config',
  FUEL_SENSOR_CONFIG: 'fuel-sensor-config',
  CARGO_LOCK_CONFIG: 'cargo-lock-config',
  AUDIO_STATE: 'audio-state',
  GRID_VISIBLE: 'grid-visible',
  MODE: 'mode',
  TRIGGER_HORN: 'trigger-horn'
};

function ControllerApp() {
  const [activeTab, setActiveTab] = useState<'demo' | 'truck' | 'camera' | 'fuel' | 'lock'>('demo');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  
  // Load initial configs from localStorage
  const [truckConfig, setTruckConfig] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRUCK_CONFIG);
    return saved ? JSON.parse(saved) : {
      position: [-3.4, -1.4, 0] as [number, number, number],
      rotation: [0, Math.PI / 2, 0] as [number, number, number],
      scale: [50, 50, 50] as [number, number, number]
    };
  });

  const [cameraKeyframes, setCameraKeyframes] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAMERA_CONFIG);
    return saved ? JSON.parse(saved) : {
      intro: {
        start: { position: [12.4, 0, 0], target: [0, 1.1, 0] },
        end: { position: [3.2, 4.8, 16.1], target: [0, 0, 0] }
      },
      cabApproach: {
        start: { position: [3.3, 4.9, 16.2], target: [0, 0, 0] },
        end: { position: [-7.5, 1.1, 8.1], target: [0, 0, 0] }
      },
      cabInterior: {
        start: { position: [-4.8, 1.6, 4.3], target: [-3.8, 0, 0.5] },
        end: { position: [-3.8, 3.2, 5.4], target: [-3.8, 0, 0.5] }
      },
      trailerSide: {
        start: { position: [-4.3, 3.5, 5.6], target: [-3.8, 0, 0.5] },
        end: { position: [-2.7, 1.6, 2.2], target: [-9.1, -11.8, -4.3] }
      },
      fuelTank: {
        start: { position: [-2.9, 1.8, 2.3], target: [-9, -11.2, -4.3] },
        end: { position: [14.5, 17.2, 0], target: [-9.7, -2.2, 0] }
      },
      containerMid: {
        start: { position: [15.6, 16, 0.6], target: [-9.7, -2.2, 0] },
        end: { position: [12.4, 0.5, -8.1], target: [0.5, 1.1, -1.6] }
      },
      trailerBack: {
        start: { position: [11.3, 0.5, -10.2], target: [-1.6, 1.1, -1.6] },
        end: { position: [-22.6, 4.3, -22.6], target: [-12.9, 0, 1.6] }
      },
      outro: {
        start: { position: [-30.1, 6.5, -16.1], target: [-12.9, 0, 1.6] },
        end: { position: [-32.8, 2.7, -4.8], target: [-2.7, 0, 1.6] }
      }
    };
  });

  const [fuelSensorConfig, setFuelSensorConfig] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FUEL_SENSOR_CONFIG);
    return saved ? JSON.parse(saved) : {
      position: [-1.18, 1.28, -0.01] as [number, number, number],
      rotation: [0, -4.71238898038469, 0] as [number, number, number],
      scale: 1.053,
      probeLength: 0.8
    };
  });

  const [cargoLockConfig, setCargoLockConfig] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CARGO_LOCK_CONFIG);
    return saved ? JSON.parse(saved) : {
      position: [0, 2.8, -16.3] as [number, number, number],
      rotation: [0.09, 3.13841, 0] as [number, number, number]
    };
  });

  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIO_STATE);
    return saved ? JSON.parse(saved).isMuted : true;
  });

  const [gridVisible, setGridVisible] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GRID_VISIBLE);
    return saved ? JSON.parse(saved) : false;
  });

  const [mode, setMode] = useState<'SCAN' | 'BLUEPRINT'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE);
    return saved ? JSON.parse(saved) : 'SCAN';
  });

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      // Check if main page has written to storage recently
      const lastUpdate = localStorage.getItem('last-main-page-update');
      if (lastUpdate) {
        const timeDiff = Date.now() - parseInt(lastUpdate);
        setConnectionStatus(timeDiff < 5000 ? 'connected' : 'disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage and trigger storage event
  const saveToStorage = useCallback((key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('controller-update-timestamp', Date.now().toString());
    // Trigger storage event for same-window communication
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(value),
      url: window.location.href
    }));
  }, []);

  // Handle truck config changes
  const handleTruckConfigChange = useCallback((newConfig: typeof truckConfig) => {
    setTruckConfig(newConfig);
    saveToStorage(STORAGE_KEYS.TRUCK_CONFIG, newConfig);
  }, [saveToStorage]);

  // Handle camera config changes
  const handleCameraConfigChange = useCallback((newConfig: typeof cameraKeyframes) => {
    setCameraKeyframes(newConfig);
    saveToStorage(STORAGE_KEYS.CAMERA_CONFIG, newConfig);
  }, [saveToStorage]);

  // Handle fuel sensor config changes
  const handleFuelSensorConfigChange = useCallback((newConfig: typeof fuelSensorConfig) => {
    setFuelSensorConfig(newConfig);
    saveToStorage(STORAGE_KEYS.FUEL_SENSOR_CONFIG, newConfig);
  }, [saveToStorage]);

  // Handle cargo lock config changes
  const handleCargoLockConfigChange = useCallback((newConfig: typeof cargoLockConfig) => {
    setCargoLockConfig(newConfig);
    saveToStorage(STORAGE_KEYS.CARGO_LOCK_CONFIG, newConfig);
  }, [saveToStorage]);

  // Handle audio toggle
  const toggleAudio = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    saveToStorage(STORAGE_KEYS.AUDIO_STATE, { isMuted: newState });
  }, [isMuted, saveToStorage]);

  // Handle horn trigger
  const triggerHorn = useCallback(() => {
    saveToStorage(STORAGE_KEYS.TRIGGER_HORN, { timestamp: Date.now() });
  }, [saveToStorage]);

  // Handle grid toggle
  const toggleGrid = useCallback(() => {
    const newState = !gridVisible;
    setGridVisible(newState);
    saveToStorage(STORAGE_KEYS.GRID_VISIBLE, newState);
  }, [gridVisible, saveToStorage]);

  // Handle mode toggle
  const toggleMode = useCallback(() => {
    const newMode = mode === 'SCAN' ? 'BLUEPRINT' : 'SCAN';
    setMode(newMode);
    saveToStorage(STORAGE_KEYS.MODE, newMode);
  }, [mode, saveToStorage]);

  // Camera preview handler (not needed for controller, but required by component)
  const handleCameraPreview = useCallback(() => {
    // No-op for controller
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#333', fontFamily: 'Rajdhani, sans-serif' }}>
              🎮 Controller Panel
            </h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
              Real-time control for 3D Truck Demo
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: connectionStatus === 'connected' ? '#10b981' : '#ef4444',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Rajdhani, sans-serif'
          }}>
            {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb'
        }}>
          {[
            { key: 'demo' as const, label: 'Demo', icon: '🎮' },
            { key: 'truck' as const, label: 'Truck', icon: '🚛' },
            { key: 'camera' as const, label: 'Camera', icon: '📹' },
            { key: 'fuel' as const, label: 'Fuel', icon: '⛽' },
            { key: 'lock' as const, label: 'Lock', icon: '🔒' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                borderBottom: activeTab === tab.key ? '3px solid #667eea' : '3px solid transparent',
                color: activeTab === tab.key ? '#667eea' : '#6b7280',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px' }}>
          {activeTab === 'demo' && (
            <div>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 600, color: '#333', fontFamily: 'Rajdhani, sans-serif' }}>
                🎮 Demo Controls
              </h3>
              
              {/* Audio Controls */}
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '2px solid #fbbf24' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#92400e', fontFamily: 'Rajdhani, sans-serif' }}>
                  🔊 Audio Controls
                </h4>
                <button onClick={toggleAudio} style={{
                  width: '100%',
                  padding: '12px',
                  margin: '8px 0',
                  border: 'none',
                  borderRadius: '6px',
                  background: isMuted ? '#ef4444' : '#10b981',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Rajdhani, sans-serif'
                }}>
                  {isMuted ? '🔇 Audio OFF' : '🔊 Audio ON'}
                </button>
                <button onClick={triggerHorn} disabled={isMuted} style={{
                  width: '100%',
                  padding: '12px',
                  margin: '8px 0',
                  border: 'none',
                  borderRadius: '6px',
                  background: isMuted ? '#9ca3af' : '#f59e0b',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: isMuted ? 'not-allowed' : 'pointer',
                  fontFamily: 'Rajdhani, sans-serif',
                  opacity: isMuted ? 0.5 : 1
                }}>
                  📯 Truck Horn
                </button>
              </div>
              
              {/* Visual Controls */}
              <button onClick={toggleGrid} style={{
                width: '100%',
                padding: '12px',
                margin: '8px 0',
                border: 'none',
                borderRadius: '6px',
                background: '#0066ff',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Rajdhani, sans-serif'
              }}>
                {gridVisible ? 'Hide Grid' : 'Show Grid'}
              </button>
              <button onClick={toggleMode} style={{
                width: '100%',
                padding: '12px',
                margin: '8px 0',
                border: 'none',
                borderRadius: '6px',
                background: '#0066ff',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Rajdhani, sans-serif'
              }}>
                Switch to {mode === 'SCAN' ? 'Blueprint' : 'Scan'}
              </button>
            </div>
          )}

          {activeTab === 'truck' && (
            <TruckPositionController
              initialConfig={truckConfig}
              onConfigChange={handleTruckConfigChange}
              scrollProgress={0}
              embedded={true}
            />
          )}

          {activeTab === 'camera' && (
            <CameraController
              initialConfig={cameraKeyframes}
              onConfigChange={handleCameraConfigChange}
              scrollProgress={0}
              onPreviewKeyframe={handleCameraPreview}
              embedded={true}
            />
          )}

          {activeTab === 'fuel' && (
            <FuelSensorController
              initialConfig={fuelSensorConfig}
              onConfigChange={handleFuelSensorConfigChange}
              embedded={true}
            />
          )}

          {activeTab === 'lock' && (
            <CargoLockController
              initialConfig={cargoLockConfig}
              onConfigChange={handleCargoLockConfigChange}
              embedded={true}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#333', fontFamily: 'Rajdhani, sans-serif' }}>
          📖 Instructions
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666', fontFamily: 'Inter, sans-serif', lineHeight: '1.8' }}>
          <li>Open the main page in another tab/window</li>
          <li>All changes here update the main page in real-time</li>
          <li>Connection status shows if main page is active</li>
          <li>Use tabs to access different controls</li>
        </ul>
      </div>
    </div>
  );
}

// Mount React app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ControllerApp />
    </React.StrictMode>
  );
}
