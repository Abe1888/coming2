import React, { useState } from 'react';
import { Copy, Check, Download, Upload } from 'lucide-react';
import { exportToConfig, importFromConfig } from '../utils/configSync';

interface FuelSensorConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  probeLength: number;
}

interface FuelSensorControllerProps {
  initialConfig: FuelSensorConfig;
  onConfigChange: (config: FuelSensorConfig) => void;
  embedded?: boolean;
}

export const FuelSensorController: React.FC<FuelSensorControllerProps> = ({ 
  initialConfig, 
  onConfigChange, 
  embedded = false 
}) => {
  const [config, setConfig] = useState<FuelSensorConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [imported, setImported] = useState(false);

  // Call onConfigChange whenever config changes
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

  const updateScale = (value: number) => {
    setConfig(prev => ({ ...prev, scale: value }));
  };

  const updateProbeLength = (value: number) => {
    setConfig(prev => ({ ...prev, probeLength: value }));
  };

  const copyJSON = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      await exportToConfig('fuelSensor', config);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleImport = async () => {
    try {
      const importedConfig = await importFromConfig('fuelSensor');
      setConfig(importedConfig);
      setImported(true);
      setTimeout(() => setImported(false), 2000);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Check console for details.');
    }
  };

  const resetConfig = () => {
    setConfig({
      position: [3.1, 0.6, -5],
      rotation: [0, 0, 0],
      scale: 1,
      probeLength: 0.6
    });
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
          Fuel Sensor Controls
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
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
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
              onChange={(e) => updatePosition(index, parseFloat(e.target.value) || 0)}
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
              step="0.01"
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

      {/* Scale Control */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #fdba74' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Scale
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.01"
            value={config.scale}
            onChange={(e) => updateScale(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={config.scale.toFixed(2)}
            onChange={(e) => updateScale(parseFloat(e.target.value) || 0.1)}
            style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
            step="0.01"
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          {[0.5, 1, 1.5, 2].map((preset) => (
            <button
              key={preset}
              onClick={() => updateScale(preset)}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: Math.abs(config.scale - preset) < 0.01 ? '#be202e' : '#e5e7eb',
                color: Math.abs(config.scale - preset) < 0.01 ? 'white' : '#1d2635',
                fontWeight: 600
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Probe Length Control */}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
        <h4 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#1d2635' }}>
          Probe Length
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={config.probeLength}
            onChange={(e) => updateProbeLength(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={config.probeLength.toFixed(1)}
            onChange={(e) => updateProbeLength(parseFloat(e.target.value) || 0.1)}
            style={{ width: '80px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
            step="0.1"
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          {[0.3, 0.6, 1.0, 1.5].map((preset) => (
            <button
              key={preset}
              onClick={() => updateProbeLength(preset)}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: Math.abs(config.probeLength - preset) < 0.1 ? '#be202e' : '#e5e7eb',
                color: Math.abs(config.probeLength - preset) < 0.1 ? 'white' : '#1d2635',
                fontWeight: 600
              }}
            >
              {preset}
            </button>
          ))}
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
          {`"fuelSensor": {"position": [${config.position.join(', ')}], "rotation": [${config.rotation.join(', ')}], "scale": ${config.scale}, "probeLength": ${config.probeLength}}`}
          {'\n'}
          {'='.repeat(50)}
        </pre>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetConfig}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#be202e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
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
