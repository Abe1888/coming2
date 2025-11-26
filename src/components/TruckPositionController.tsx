import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface TruckPositionConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

interface TruckPositionControllerProps {
  initialConfig: TruckPositionConfig;
  onConfigChange: (config: TruckPositionConfig) => void;
  scrollProgress?: number;
  embedded?: boolean;
}

export const TruckPositionController: React.FC<TruckPositionControllerProps> = ({ 
  initialConfig, 
  onConfigChange,
  scrollProgress = 0,
  embedded = false
}) => {
  const [config, setConfig] = useState<TruckPositionConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(embedded ? true : false);

  React.useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updatePosition = (index: number, value: number) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      newConfig.position = [...newConfig.position] as [number, number, number];
      newConfig.position[index] = value;
      return newConfig;
    });
  };

  const updateRotation = (index: number, value: number) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      newConfig.rotation = [...newConfig.rotation] as [number, number, number];
      newConfig.rotation[index] = value;
      return newConfig;
    });
  };

  const updateScale = (index: number, value: number) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      newConfig.scale = [...newConfig.scale] as [number, number, number];
      newConfig.scale[index] = value;
      return newConfig;
    });
  };

  const updateUniformScale = (value: number) => {
    setConfig(prev => ({
      ...prev,
      scale: [value, value, value]
    }));
  };

  const copyJSON = () => {
    const json = JSON.stringify({
      ...config,
      scrollProgress: `${(scrollProgress * 100).toFixed(1)}%`,
      scrollProgressRaw: scrollProgress
    }, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetConfig = () => {
    setConfig({
      position: [0, -1.4, 0],
      rotation: [0, Math.PI / 2, 0],
      scale: [50, 50, 50]
    });
  };

  return (
    <div style={{ position: embedded ? 'relative' : 'fixed', bottom: embedded ? 'auto' : '24px', left: embedded ? 'auto' : '24px', zIndex: embedded ? 'auto' : 50 }}>
      {!embedded && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            marginBottom: '8px',
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isOpen ? '✕ CLOSE' : '🚛 TRUCK POSITION'}
        </button>
      )}

      {isOpen && (
        <div style={{
          backgroundColor: embedded ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
          borderRadius: embedded ? '0' : '8px',
          boxShadow: embedded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: embedded ? 'none' : '2px solid #2563eb',
          padding: '16px',
          width: embedded ? '100%' : '320px',
          maxHeight: embedded ? 'none' : '70vh',
          overflowY: embedded ? 'visible' : 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '2px solid #2563eb'
          }}>
            <h3 style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e3a8a', fontSize: '14px', margin: 0 }}>
              TRUCK POSITION CONTROLS
            </h3>
            <button
              onClick={copyJSON}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          {/* Scroll Progress Indicator */}
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0ea5e9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: '#0369a1', margin: 0 }}>
                📜 SCROLL PROGRESS
              </h4>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', color: '#0369a1' }}>
                {(scrollProgress * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0f2fe',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid #bae6fd'
            }}>
              <div style={{
                width: `${scrollProgress * 100}%`,
                height: '100%',
                backgroundColor: '#0ea5e9',
                transition: 'width 0.1s ease-out',
                boxShadow: scrollProgress > 0 ? '0 0 8px rgba(14, 165, 233, 0.5)' : 'none'
              }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>0% - Intro</span>
                <span>15% - Chase</span>
                <span>35% - Scan</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>55% - X-Ray</span>
                <span>75% - Hold</span>
                <span>100% - Top</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#eff6ff', border: '1px solid #93c5fd' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#1e40af' }}>
              TRUCK POSITION (X, Y, Z)
            </h4>
            {(['X', 'Y', 'Z'] as const).map((axis, index) => (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ width: '32px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                  {axis}:
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="0.1"
                  value={config.position[index]}
                  onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={config.position[index].toFixed(1)}
                  onChange={(e) => updatePosition(index, parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                  step="0.1"
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#faf5ff', border: '1px solid #d8b4fe' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#7c3aed' }}>
              TRUCK ROTATION (X, Y, Z) - DEGREES
            </h4>
            {(['X', 'Y', 'Z'] as const).map((axis, index) => (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ width: '32px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                  {axis}:
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={(config.rotation[index] * 180 / Math.PI).toFixed(0)}
                  onChange={(e) => updateRotation(index, parseFloat(e.target.value) * Math.PI / 180)}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={(config.rotation[index] * 180 / Math.PI).toFixed(0)}
                  onChange={(e) => updateRotation(index, (parseFloat(e.target.value) || 0) * Math.PI / 180)}
                  style={{ width: '80px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                  step="1"
                />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>°</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#fff7ed', border: '1px solid #fdba74' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#c2410c' }}>
              TRUCK SCALE
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#4b5563', marginBottom: '8px' }}>
                Uniform Scale:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={config.scale[0]}
                  onChange={(e) => updateUniformScale(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={config.scale[0].toFixed(0)}
                  onChange={(e) => updateUniformScale(parseFloat(e.target.value) || 1)}
                  style={{ width: '80px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                  step="1"
                />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => updateUniformScale(preset)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      backgroundColor: Math.abs(config.scale[0] - preset) < 1 ? '#ea580c' : '#e5e7eb',
                      color: Math.abs(config.scale[0] - preset) < 1 ? 'white' : '#374151'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            {(['X', 'Y', 'Z'] as const).map((axis, index) => (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ width: '32px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                  {axis}:
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={config.scale[index]}
                  onChange={(e) => updateScale(index, parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={config.scale[index].toFixed(0)}
                  onChange={(e) => updateScale(index, parseFloat(e.target.value) || 1)}
                  style={{ width: '80px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                  step="1"
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#15803d' }}>
              QUICK PRESETS
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setConfig({ position: [0, -1.4, 0], rotation: [0, Math.PI / 2, 0], scale: [50, 50, 50] })}
                style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', backgroundColor: '#22c55e', color: 'white' }}
              >
                DEFAULT
              </button>
              <button
                onClick={() => setConfig({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [50, 50, 50] })}
                style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', backgroundColor: '#22c55e', color: 'white' }}
              >
                ORIGIN
              </button>
              <button
                onClick={() => setConfig({ position: [0, -1.4, 0], rotation: [0, 0, 0], scale: [50, 50, 50] })}
                style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', backgroundColor: '#eab308', color: 'white' }}
              >
                NO ROTATION
              </button>
              <button
                onClick={() => setConfig({ position: [0, -1.4, 0], rotation: [0, Math.PI, 0], scale: [50, 50, 50] })}
                style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', backgroundColor: '#eab308', color: 'white' }}
              >
                180° FLIP
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#374151' }}>
              JSON CONFIG
            </h4>
            <pre style={{
              backgroundColor: '#1a1a1a',
              color: '#4ade80',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              overflowX: 'auto',
              margin: 0
            }}>
              {JSON.stringify({
                ...config,
                scrollProgress: `${(scrollProgress * 100).toFixed(1)}%`
              }, null, 2)}
            </pre>
          </div>

          <button
            onClick={resetConfig}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            RESET TO DEFAULT
          </button>
        </div>
      )}
    </div>
  );
};
