import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, Upload } from 'lucide-react';
import { exportToConfig, importFromConfig } from '../utils/configSync';

export interface LogoConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number];
  offsetZ: number; // Forward/backward offset from logo mesh
  visible: boolean;
}

interface LogoControllerProps {
  initialConfig: LogoConfig;
  onConfigChange: (config: LogoConfig) => void;
  embedded?: boolean;
}

export const LogoController: React.FC<LogoControllerProps> = ({
  initialConfig,
  onConfigChange,
  embedded = false
}) => {
  const [config, setConfig] = useState<LogoConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [imported, setImported] = useState(false);

  // Notify parent of config changes
  useEffect(() => {
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
      newConfig.rotation[index] = value * (Math.PI / 180); // Convert degrees to radians
      return newConfig;
    });
  };

  const updateScale = (index: number, value: number) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      newConfig.scale = [...newConfig.scale] as [number, number];
      newConfig.scale[index] = value;
      return newConfig;
    });
  };

  const updateOffsetZ = (value: number) => {
    setConfig(prev => ({ ...prev, offsetZ: value }));
  };

  const toggleVisibility = () => {
    setConfig(prev => ({ ...prev, visible: !prev.visible }));
  };

  const resetToDefault = () => {
    setConfig({
      position: [0, 2.25, 5.35],
      rotation: [0, 0, 0.017453292519943295],
      scale: [1, 0.96],
      offsetZ: -0.5,
      visible: true
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
      await exportToConfig('logo', config);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleImport = async () => {
    try {
      const importedConfig = await importFromConfig('logo');
      setConfig(importedConfig as LogoConfig);
      setImported(true);
      setTimeout(() => setImported(false), 2000);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Check console for details.');
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '8px', borderBottom: '2px solid #be202e' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1d2635', fontFamily: 'Inter, sans-serif' }}>
          Logo Controls
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

      {/* Visibility Toggle */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: config.visible ? '#d1fae5' : '#fee2e2',
        borderRadius: '8px',
        border: `2px solid ${config.visible ? '#209771' : '#be202e'}`
      }}>
        <button
          onClick={toggleVisibility}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            background: config.visible ? '#209771' : '#be202e',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {config.visible ? '👁️ Logo Visible' : '🚫 Logo Hidden'}
        </button>
      </div>

      {/* Position Controls */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        border: '2px solid #fbbf24'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#92400e' }}>
          📍 Position (World Space)
        </h4>
        
        {['X', 'Y', 'Z'].map((axis, index) => (
          <div key={axis} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#1d2635' }}>
              {axis}: {config.position[index].toFixed(2)}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.01"
                value={config.position[index]}
                onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                value={config.position[index].toFixed(2)}
                onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
                style={{
                  width: '80px',
                  padding: '6px',
                  border: '1px solid #6c6c6c',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Rotation Controls */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#e0e7ff',
        borderRadius: '8px',
        border: '2px solid #818cf8'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#3730a3' }}>
          🔄 Rotation (Degrees)
        </h4>
        
        {['X', 'Y', 'Z'].map((axis, index) => (
          <div key={axis} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#1d2635' }}>
              {axis}: {(config.rotation[index] * (180 / Math.PI)).toFixed(1)}°
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={config.rotation[index] * (180 / Math.PI)}
                onChange={(e) => updateRotation(index, parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                value={(config.rotation[index] * (180 / Math.PI)).toFixed(1)}
                onChange={(e) => updateRotation(index, parseFloat(e.target.value))}
                style={{
                  width: '80px',
                  padding: '6px',
                  border: '1px solid #6c6c6c',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Scale Controls */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#fed7aa',
        borderRadius: '8px',
        border: '2px solid #f97316'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#9a3412' }}>
          📏 Scale
        </h4>
        
        {['Width', 'Height'].map((label, index) => (
          <div key={label} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#1d2635' }}>
              {label}: {config.scale[index].toFixed(2)}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.01"
                value={config.scale[index]}
                onChange={(e) => updateScale(index, parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                value={config.scale[index].toFixed(2)}
                onChange={(e) => updateScale(index, parseFloat(e.target.value))}
                style={{
                  width: '80px',
                  padding: '6px',
                  border: '1px solid #6c6c6c',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Forward/Backward Offset */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#dbeafe',
        borderRadius: '8px',
        border: '2px solid #3b82f6'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e3a8a' }}>
          ↔️ Forward/Backward Offset
        </h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#1d2635' }}>
            Z Offset: {config.offsetZ.toFixed(2)} (negative = forward)
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={config.offsetZ}
              onChange={(e) => updateOffsetZ(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={config.offsetZ.toFixed(2)}
              onChange={(e) => updateOffsetZ(parseFloat(e.target.value))}
              style={{
                width: '80px',
                padding: '6px',
                border: '1px solid #6c6c6c',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => updateOffsetZ(-0.5)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              background: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⬅️ Front (Default)
          </button>
          <button
            onClick={() => updateOffsetZ(0.5)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              background: '#6c6c6c',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ➡️ Back
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#e0f2fe',
        borderRadius: '8px',
        border: '2px solid #0ea5e9'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#075985' }}>
          ⚡ Quick Presets
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={resetToDefault}
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: '#be202e',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔄 Reset Default
          </button>
          <button
            onClick={() => setConfig(prev => ({ ...prev, scale: [1.5, 1.5] }))}
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: '#0ea5e9',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📏 Scale 1.5x
          </button>
          <button
            onClick={() => setConfig(prev => ({ ...prev, scale: [2, 2] }))}
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: '#0ea5e9',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📏 Scale 2x
          </button>
          <button
            onClick={() => setConfig(prev => ({ ...prev, rotation: [0, 0, 0] }))}
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: '#0ea5e9',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔄 No Rotation
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
          {`"logo": {"position": [${config.position.join(', ')}], "rotation": [${config.rotation.join(', ')}], "scale": [${config.scale.join(', ')}], "offsetZ": ${config.offsetZ}, "visible": ${config.visible}}`}
          {'\n'}
          {'='.repeat(50)}
        </pre>
      </div>
    </div>
  );
};
