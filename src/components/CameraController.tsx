import React, { useState } from 'react';
import { Copy, Check, Camera } from 'lucide-react';

interface CameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
}

interface CameraPhase {
  start: CameraKeyframe;
  end: CameraKeyframe;
}

interface CameraConfig {
  intro: CameraPhase;
  cabApproach: CameraPhase;
  cabInterior: CameraPhase;
  trailerSide: CameraPhase;
  fuelTank: CameraPhase;
  containerMid: CameraPhase;
  trailerBack: CameraPhase;
  outro: CameraPhase;
}

interface CameraControllerProps {
  initialConfig: CameraConfig;
  onConfigChange: (config: CameraConfig) => void;
  scrollProgress?: number;
  onPreviewKeyframe?: (preview: { phase: keyof CameraConfig; keyframe: 'start' | 'end' } | null) => void;
  embedded?: boolean;
}

export const CameraController: React.FC<CameraControllerProps> = ({ 
  initialConfig, 
  onConfigChange,
  scrollProgress = 0,
  onPreviewKeyframe,
  embedded = false
}) => {
  const [config, setConfig] = useState<CameraConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(embedded ? true : false);
  const [activePhase, setActivePhase] = useState<keyof CameraConfig>('intro');
  const [activeKeyframe, setActiveKeyframe] = useState<'start' | 'end'>('start');

  React.useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  // Trigger camera preview when keyframe selection changes
  React.useEffect(() => {
    if (onPreviewKeyframe && isOpen) {
      onPreviewKeyframe({ phase: activePhase, keyframe: activeKeyframe });
    }
  }, [activePhase, activeKeyframe, isOpen, onPreviewKeyframe]);

  // Determine active phase based on scroll progress
  React.useEffect(() => {
    if (scrollProgress < 0.05) setActivePhase('intro');
    else if (scrollProgress < 0.15) setActivePhase('cabApproach');
    else if (scrollProgress < 0.25) setActivePhase('cabInterior');
    else if (scrollProgress < 0.35) setActivePhase('trailerSide');
    else if (scrollProgress < 0.50) setActivePhase('fuelTank');
    else if (scrollProgress < 0.70) setActivePhase('containerMid');
    else if (scrollProgress < 0.85) setActivePhase('trailerBack');
    else setActivePhase('outro');
  }, [scrollProgress]);

  const updatePosition = (phase: keyof CameraConfig, keyframe: 'start' | 'end', index: number, value: number) => {
    setConfig(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [keyframe]: {
          ...prev[phase][keyframe],
          position: prev[phase][keyframe].position.map((v, i) => i === index ? value : v) as [number, number, number]
        }
      }
    }));
  };

  const updateTarget = (phase: keyof CameraConfig, keyframe: 'start' | 'end', index: number, value: number) => {
    setConfig(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [keyframe]: {
          ...prev[phase][keyframe],
          target: prev[phase][keyframe].target.map((v, i) => i === index ? value : v) as [number, number, number]
        }
      }
    }));
  };

  const copyJSON = () => {
    const json = JSON.stringify({
      ...config,
      currentPhase: activePhase,
      scrollProgress: `${(scrollProgress * 100).toFixed(1)}%`
    }, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetConfig = () => {
    setConfig(initialConfig);
  };

  const phases: Array<{ 
    key: keyof CameraConfig; 
    label: string; 
    color: string; 
    range: string;
    focus: string;
    transition: string;
  }> = [
    { 
      key: 'intro', 
      label: 'Wide Shot', 
      color: '#3b82f6', 
      range: '0-5%',
      focus: 'Establish full truck overview',
      transition: 'Slow ease-in from static'
    },
    { 
      key: 'cabApproach', 
      label: 'Cab Approach', 
      color: '#8b5cf6', 
      range: '5-15%',
      focus: 'Move toward cab',
      transition: 'Smooth dolly with parallax'
    },
    { 
      key: 'cabInterior', 
      label: 'Cab Interior', 
      color: '#ec4899', 
      range: '15-25%',
      focus: 'GPS & ADAS devices',
      transition: 'Smooth dolly into interior'
    },
    { 
      key: 'trailerSide', 
      label: 'Trailer Side', 
      color: '#f59e0b', 
      range: '25-35%',
      focus: 'Side view of trailer',
      transition: 'Horizontal pan for depth'
    },
    { 
      key: 'fuelTank', 
      label: 'Fuel Tank', 
      color: '#10b981', 
      range: '35-50%',
      focus: 'Fuel level sensor reveal',
      transition: 'Smooth zoom into tank'
    },
    { 
      key: 'containerMid', 
      label: 'Container', 
      color: '#06b6d4', 
      range: '50-70%',
      focus: 'Container details',
      transition: 'Glide along container'
    },
    { 
      key: 'trailerBack', 
      label: 'Back Lock', 
      color: '#f43f5e', 
      range: '70-85%',
      focus: 'Container lock focus',
      transition: 'Subtle rotation & dolly'
    },
    { 
      key: 'outro', 
      label: 'Outro', 
      color: '#84cc16', 
      range: '85-100%',
      focus: 'Final wide reveal',
      transition: 'Pull back with deceleration'
    }
  ];

  return (
    <div style={{ position: embedded ? 'relative' : 'fixed', bottom: embedded ? 'auto' : '24px', right: embedded ? 'auto' : '24px', zIndex: embedded ? 'auto' : 50 }}>
      {!embedded && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            marginBottom: '8px',
            padding: '8px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Camera size={16} />
          {isOpen ? '✕ CLOSE' : '📹 CAMERA CONTROLS'}
        </button>
      )}

      {isOpen && (
        <div style={{
          backgroundColor: embedded ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
          borderRadius: embedded ? '0' : '8px',
          boxShadow: embedded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: embedded ? 'none' : '2px solid #7c3aed',
          padding: '16px',
          width: embedded ? '100%' : '380px',
          maxHeight: embedded ? 'none' : '70vh',
          overflowY: embedded ? 'visible' : 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '2px solid #7c3aed'
          }}>
            <h3 style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#5b21b6', fontSize: '14px', margin: 0 }}>
              CAMERA KEYFRAME CONTROLS
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

          {/* Phase Selector */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#374151' }}>
              SELECT CAMERA PHASE
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {phases.map(phase => (
                <button
                  key={phase.key}
                  onClick={() => setActivePhase(phase.key)}
                  style={{
                    padding: '8px',
                    border: activePhase === phase.key ? `2px solid ${phase.color}` : '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    backgroundColor: activePhase === phase.key ? phase.color : 'white',
                    color: activePhase === phase.key ? 'white' : '#374151',
                    fontWeight: activePhase === phase.key ? 'bold' : 'normal',
                    position: 'relative'
                  }}
                >
                  <div>{phase.label}</div>
                  <div style={{ fontSize: '9px', opacity: 0.8 }}>{phase.range}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Keyframe Selector */}
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#fef3c7', border: '2px solid #fbbf24' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#92400e' }}>
              🎬 SELECT KEYFRAME
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(['start', 'end'] as const).map((kf) => (
                <button
                  key={kf}
                  onClick={() => setActiveKeyframe(kf)}
                  style={{
                    padding: '10px',
                    border: activeKeyframe === kf ? '2px solid #f59e0b' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    backgroundColor: activeKeyframe === kf ? '#fbbf24' : 'white',
                    color: activeKeyframe === kf ? 'white' : '#374151',
                    fontWeight: activeKeyframe === kf ? 'bold' : 'normal',
                    textTransform: 'uppercase'
                  }}
                >
                  {kf === 'start' ? '▶ START' : '⏹ END'}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#92400e', fontFamily: 'monospace' }}>
              {activeKeyframe === 'start' ? '▶ Beginning of phase' : '⏹ End of phase'}
            </div>
          </div>

          {/* Camera Position */}
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#eff6ff', border: '1px solid #93c5fd' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#1e40af' }}>
              📷 CAMERA POSITION (X, Y, Z) - {activeKeyframe.toUpperCase()}
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
                  value={config[activePhase][activeKeyframe].position[index]}
                  onChange={(e) => updatePosition(activePhase, activeKeyframe, index, parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={config[activePhase][activeKeyframe].position[index].toFixed(1)}
                  onChange={(e) => updatePosition(activePhase, activeKeyframe, index, parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                  step="0.1"
                />
              </div>
            ))}
          </div>

          {/* Camera Target (LookAt) */}
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#faf5ff', border: '1px solid #d8b4fe' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#7c3aed' }}>
              🎯 CAMERA TARGET (X, Y, Z) - {activeKeyframe.toUpperCase()}
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
                  value={config[activePhase][activeKeyframe].target[index]}
                  onChange={(e) => updateTarget(activePhase, activeKeyframe, index, parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={config[activePhase][activeKeyframe].target[index].toFixed(1)}
                  onChange={(e) => updateTarget(activePhase, activeKeyframe, index, parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                  step="0.1"
                />
              </div>
            ))}
          </div>

          {/* Current Values Display */}
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#15803d' }}>
              📊 CURRENT PHASE: {activePhase.toUpperCase()}
            </h4>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151' }}>
              <div><strong>Start Position:</strong> [{config[activePhase].start.position.map((v: number) => v.toFixed(1)).join(', ')}]</div>
              <div><strong>End Position:</strong> [{config[activePhase].end.position.map((v: number) => v.toFixed(1)).join(', ')}]</div>
              <div style={{ marginTop: '4px' }}><strong>Start Target:</strong> [{config[activePhase].start.target.map((v: number) => v.toFixed(1)).join(', ')}]</div>
              <div><strong>End Target:</strong> [{config[activePhase].end.target.map((v: number) => v.toFixed(1)).join(', ')}]</div>
              <div style={{ marginTop: '4px', color: '#059669', fontWeight: 'bold' }}>
                Scroll: {(scrollProgress * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Transition Info */}
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#92400e' }}>
              🎬 TRANSITION INFO
            </h4>
            {phases.map(phase => phase.key === activePhase && (
              <div key={phase.key} style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: '#374151' }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: phase.color }}>Focus:</strong> {phase.focus}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: phase.color }}>Transition:</strong> {phase.transition}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '8px', padding: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                  💡 <strong>Smooth Easing:</strong> Cubic ease-in-out applied<br/>
                  📐 <strong>Interpolation:</strong> Vector3.lerpVectors()<br/>
                  🎯 <strong>LookAt:</strong> Smooth target transition
                </div>
              </div>
            ))}
          </div>

          {/* JSON Output */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', color: '#374151' }}>
              JSON CONFIG
            </h4>
            <pre style={{
              backgroundColor: '#1a1a1a',
              color: '#4ade80',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'monospace',
              overflowX: 'auto',
              margin: 0,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {JSON.stringify({
                ...config,
                currentPhase: activePhase,
                scrollProgress: `${(scrollProgress * 100).toFixed(1)}%`
              }, null, 2)}
            </pre>
          </div>

          {/* Reset Button */}
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
