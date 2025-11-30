import React, { useState } from 'react';
import { Copy, Check, Download, Upload } from 'lucide-react';
import { exportToConfig, importFromConfig } from '../utils/configSync';

interface TelematicsDisplayConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}

interface TelematicsDisplayControllerProps {
  initialConfig: TelematicsDisplayConfig;
  onConfigChange: (config: TelematicsDisplayConfig) => void;
  embedded?: boolean;
}

export const TelematicsDisplayController: React.FC<TelematicsDisplayControllerProps> = ({ 
  initialConfig, 
  onConfigChange,
  embedded = false
}) => {
  const [config, setConfig] = useState<TelematicsDisplayConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [imported, setImported] = useState(false);

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

  const updateSize = (index: number, value: number) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      newConfig.size = [...newConfig.size] as [number, number];
      newConfig.size[index] = value;
      return newConfig;
    });
  };

  const copyJSON = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      await exportToConfig('telematicsDisplay', config);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleImport = async () => {
    try {
      const importedConfig = await importFromConfig('telematicsDisplay');
      setConfig(importedConfig);
      setImported(true);
      setTimeout(() => setImported(false), 2000);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Check console for details.');
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '2px solid #be202e'
      }}>
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#1d2635', fontSize: '16px', margin: 0 }}>
          Telematics Display Controls
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleImport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: imported ? '#209771' : '#6c6c6c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Import from objectTransforms.json"
          >
            {imported ? <Check size={14} /> : <Upload size={14} />}
            {imported ? 'LOADED!' : 'IMPORT'}
          </button>
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: exported ? '#209771' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Export to objectTransforms.json (copies to clipboard)"
          >
            {exported ? <Check size={14} /> : <Download size={14} />}
            {exported ? 'EXPORTED!' : 'EXPORT'}
          </button>
          <button
            onClick={copyJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: '#209771',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Copy JSON to clipboard"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'COPIED!' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Position Controls */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #93c5fd' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Position (X, Y, Z)
        </h4>
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ width: '32px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6c6c6c' }}>
              {axis}:
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={config.position[index]}
              onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={config.position[index].toFixed(1)}
              onChange={(e) => updatePosition(index, parseFloat(e.target.value) || 0)}
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
              step="0.1"
            />
          </div>
        ))}
      </div>

      {/* Rotation Controls */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#faf5ff', border: '1px solid #d8b4fe' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Rotation (Degrees)
        </h4>
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ width: '32px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6c6c6c' }}>
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
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
              step="1"
            />
            <span style={{ fontSize: '12px', color: '#6c6c6c' }}>°</span>
          </div>
        ))}
      </div>

      {/* Size Controls */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #fdba74' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Display Size (Width, Height)
        </h4>
        {(['Width', 'Height'] as const).map((label, index) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ width: '60px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6c6c6c' }}>
              {label}:
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={config.size[index]}
              onChange={(e) => updateSize(index, parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={config.size[index].toFixed(1)}
              onChange={(e) => updateSize(index, parseFloat(e.target.value) || 1)}
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
              step="0.5"
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          {[[9, 5], [12, 6], [15, 8]].map(([w, h]) => (
            <button
              key={`${w}x${h}`}
              onClick={() => setConfig(prev => ({ ...prev, size: [w, h] }))}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: config.size[0] === w && config.size[1] === h ? '#be202e' : '#e5e7eb',
                color: config.size[0] === w && config.size[1] === h ? 'white' : '#1d2635',
                fontWeight: 600
              }}
            >
              {w}×{h}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Quick Presets
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => setConfig({ 
              position: [1.1, -1.9, 2.4], 
              rotation: [-1.605702911834783, 0.03490658503988659, 1.5707963267948966], 
              size: [8, 4.5] 
            })}
            style={{ 
              padding: '10px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              cursor: 'pointer', 
              backgroundColor: '#209771', 
              color: 'white' 
            }}
          >
            DEFAULT
          </button>
          <button
            onClick={() => setConfig({ 
              position: [-3.5, 2.0, 7], 
              rotation: [0, -Math.PI / 2, 0], 
              size: [12, 6] 
            })}
            style={{ 
              padding: '10px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              cursor: 'pointer', 
              backgroundColor: '#209771', 
              color: 'white' 
            }}
          >
            LARGE
          </button>
          <button
            onClick={() => setConfig({ 
              position: [-3.5, 1.5, 7], 
              rotation: [0, 0, 0], 
              size: [9, 5] 
            })}
            style={{ 
              padding: '10px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              cursor: 'pointer', 
              backgroundColor: '#f59e0b', 
              color: 'white' 
            }}
          >
            FRONT FACING
          </button>
          <button
            onClick={() => setConfig({ 
              position: [0, 1.5, 7], 
              rotation: [0, -Math.PI / 2, 0], 
              size: [9, 5] 
            })}
            style={{ 
              padding: '10px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              cursor: 'pointer', 
              backgroundColor: '#f59e0b', 
              color: 'white' 
            }}
          >
            CENTERED
          </button>
        </div>
      </div>

      {/* JSON Output */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#1d2635' }}>
          JSON Config (objectTransforms.json format)
        </h4>
        <pre style={{
          backgroundColor: '#1d2635',
          color: '#209771',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          overflowX: 'auto',
          margin: 0
        }}>
          {JSON.stringify({ telematicsDisplay: config }, null, 2)}
        </pre>
      </div>

      {/* Reset Button */}
      <button
        onClick={() => setConfig({
          position: [-3.5, 1.5, 7],
          rotation: [0, -Math.PI / 2, 0],
          size: [9, 5]
        })}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#be202e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        RESET TO DEFAULT
      </button>
    </div>
  );
};
