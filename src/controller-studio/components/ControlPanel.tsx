import React, { useState } from 'react';
import { Download, Upload, Copy, Check } from 'lucide-react';
import type { ObjectTransforms } from '../hooks/useObjectTransforms';
import { ObjectControls } from './ObjectControls';

interface ControlPanelProps {
  activeObject: 'truck' | 'fuelSensor' | 'telematicsDisplay' | 'logo';
  onActiveObjectChange: (object: 'truck' | 'fuelSensor' | 'telematicsDisplay' | 'logo') => void;
  transforms: ObjectTransforms;
  onTransformChange: (object: keyof ObjectTransforms, updates: any) => void;
  onExport: () => Promise<boolean>;
  onImport: () => Promise<boolean>;
  onReset: (object: keyof ObjectTransforms) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  activeObject,
  onActiveObjectChange,
  transforms,
  onTransformChange,
  onExport,
  onImport,
  onReset
}) => {
  const [exported, setExported] = useState(false);
  const [imported, setImported] = useState(false);

  const handleExport = async () => {
    const success = await onExport();
    if (success) {
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }
  };

  const handleImport = async () => {
    const success = await onImport();
    if (success) {
      setImported(true);
      setTimeout(() => setImported(false), 2000);
    }
  };

  const tabs = [
    { key: 'telematicsDisplay' as const, label: 'Display', icon: '📺' },
    { key: 'fuelSensor' as const, label: 'Fuel', icon: '⛽' },
    { key: 'truck' as const, label: 'Truck', icon: '🚛' },
    { key: 'logo' as const, label: 'Logo', icon: '🏷️' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(29, 38, 53, 0.95)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Action Buttons */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={handleImport}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            background: imported ? '#209771' : '#6c6c6c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {imported ? <Check size={16} /> : <Upload size={16} />}
          {imported ? 'LOADED' : 'IMPORT'}
        </button>
        <button
          onClick={handleExport}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            background: exported ? '#209771' : '#be202e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {exported ? <Check size={16} /> : <Download size={16} />}
          {exported ? 'COPIED' : 'EXPORT'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onActiveObjectChange(tab.key)}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeObject === tab.key ? 'rgba(190, 32, 46, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeObject === tab.key ? '2px solid #be202e' : '2px solid transparent',
              color: activeObject === tab.key ? '#ffffff' : '#b8b8b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        <ObjectControls
          objectType={activeObject}
          transform={transforms[activeObject]}
          onChange={(updates) => onTransformChange(activeObject, updates)}
        />
        
        {/* Reset Button */}
        <button
          onClick={() => onReset(activeObject)}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '16px',
            background: 'rgba(190, 32, 46, 0.2)',
            border: '1px solid #be202e',
            borderRadius: '6px',
            color: '#be202e',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🔄 Reset to Default
        </button>
      </div>
    </div>
  );
};
