import React, { useState } from 'react';
import { Header } from './components/Header';
import { Preview3D } from './components/Preview3D';
import { ControlPanel } from './components/ControlPanel';
import { useObjectTransforms } from './hooks/useObjectTransforms';

export const ControllerStudio: React.FC = () => {
  const [activeObject, setActiveObject] = useState<'truck' | 'fuelSensor' | 'telematicsDisplay' | 'logo'>('telematicsDisplay');
  const { transforms, updateTransform, exportConfig, importConfig, resetToDefault, connectionStatus } = useObjectTransforms();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f1419 0%, #1d2635 100%)',
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff'
    }}>
      {/* Header */}
      <Header connectionStatus={connectionStatus} />

      {/* Main Content: Split View */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '20px',
        padding: '20px',
        overflow: 'hidden'
      }}>
        {/* Left: 3D Preview */}
        <Preview3D
          transforms={transforms}
          activeObject={activeObject}
        />

        {/* Right: Control Panel */}
        <ControlPanel
          activeObject={activeObject}
          onActiveObjectChange={setActiveObject}
          transforms={transforms}
          onTransformChange={updateTransform}
          onExport={exportConfig}
          onImport={importConfig}
          onReset={resetToDefault}
        />
      </div>
    </div>
  );
};
