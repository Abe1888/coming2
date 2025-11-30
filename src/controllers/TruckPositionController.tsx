import React, { useState } from 'react';
import { Copy, Check, Download, Upload } from 'lucide-react';
import { exportToConfig, importFromConfig } from '../utils/configSync';

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

  const updateUniformScale = (value: number) => {
    setConfig(prev => ({
      ...prev,
      scale: [value, value, value]
    }));
  };

  const copyJSON = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      await exportToConfig('truck', config);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleImport = async () => {
    try {
      const importedConfig = await importFromConfig('truck');
      setConfig(importedConfig as TruckPositionConfig);
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
          Truck Position Controls
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

      {/* Scale Controls */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #fdba74' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Scale
        </h4>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6c6c6c', marginBottom: '8px' }}>
            Uniform Scale:
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={config.scale[0]}
              onChange={(e) => updateUniformScale(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={config.scale[0].toFixed(1)}
              onChange={(e) => updateUniformScale(parseFloat(e.target.value) || 0.1)}
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
              step="0.1"
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {[0.5, 1.0, 1.5, 2.0].map((preset) => (
              <button
                key={preset}
                onClick={() => updateUniformScale(preset)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: Math.abs(config.scale[0] - preset) < 0.1 ? '#be202e' : '#e5e7eb',
                  color: Math.abs(config.scale[0] - preset) < 0.1 ? 'white' : '#1d2635',
                  fontWeight: 600
                }}
              >
                {preset}
              </button>
            ))}
          </div>
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
              position: [1.1, -1.1, -5.3], 
              rotation: [0, Math.PI, 0], 
              scale: [1.50, 1.50, 1.50] 
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
              position: [0, -1.1, -5.3], 
              rotation: [0, 0, 0], 
              scale: [1.50, 1.50, 1.50] 
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
            CENTERED
          </button>
          <button
            onClick={() => setConfig({ 
              position: [1.1, -1.1, -5.3], 
              rotation: [0, Math.PI / 2, 0], 
              scale: [1.50, 1.50, 1.50] 
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
            90° TURN
          </button>
          <button
            onClick={() => setConfig({ 
              position: [1.1, -1.1, -5.3], 
              rotation: [0, 0, 0], 
              scale: [1.50, 1.50, 1.50] 
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
            NO ROTATION
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
          fontSize: '11px',
          fontFamily: 'monospace',
          overflowX: 'auto',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {'='.repeat(50)}
          {'\n'}
          {`"truck": {"position": [${config.position.join(', ')}], "rotation": [${config.rotation.join(', ')}], "scale": [${config.scale.join(', ')}]}`}
          {'\n'}
          {'='.repeat(50)}
        </pre>
      </div>

      {/* Reset Button */}
      <button
        onClick={() => setConfig({
          position: [1.1, -1.1, -5.3],
          rotation: [0, Math.PI, 0],
          scale: [1.50, 1.50, 1.50]
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
