import React from 'react';

interface ObjectControlsProps {
  objectType: 'truck' | 'fuelSensor' | 'telematicsDisplay' | 'logo';
  transform: any;
  onChange: (updates: any) => void;
}

export const ObjectControls: React.FC<ObjectControlsProps> = ({
  objectType,
  transform,
  onChange
}) => {
  const updatePosition = (index: number, value: number) => {
    const newPosition = [...transform.position];
    newPosition[index] = value;
    onChange({ position: newPosition });
  };

  const updateRotation = (index: number, value: number) => {
    const newRotation = [...transform.rotation];
    newRotation[index] = value * (Math.PI / 180); // Convert to radians
    onChange({ rotation: newRotation });
  };

  const SliderGroup = ({ label, value, onChange, min = -20, max = 20, step = 0.01, unit = '', decimals = 2 }: any) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
          {label}
        </label>
        <input
          type="number"
          value={value.toFixed(decimals)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          style={{
            width: '80px',
            padding: '4px 8px',
            background: 'rgba(32, 151, 113, 0.1)',
            border: '1px solid rgba(32, 151, 113, 0.3)',
            borderRadius: '4px',
            color: '#209771',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'right',
            outline: 'none'
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: 'linear-gradient(to right, #be202e 0%, #be202e ' + ((value - min) / (max - min) * 100) + '%, #3a3a3a ' + ((value - min) / (max - min) * 100) + '%, #3a3a3a 100%)',
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  );

  return (
    <div>
      {/* Position */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(32, 151, 113, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(32, 151, 113, 0.3)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 700,
          color: '#209771',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📍 Position
        </h3>
        <SliderGroup
          label="X (Left/Right)"
          value={transform.position[0]}
          onChange={(v: number) => updatePosition(0, v)}
          step={0.01}
          decimals={2}
        />
        <SliderGroup
          label="Y (Up/Down)"
          value={transform.position[1]}
          onChange={(v: number) => updatePosition(1, v)}
          step={0.01}
          decimals={2}
        />
        <SliderGroup
          label="Z (Forward/Back)"
          value={transform.position[2]}
          onChange={(v: number) => updatePosition(2, v)}
          step={0.01}
          decimals={2}
        />
      </div>

      {/* Rotation */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(190, 32, 46, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(190, 32, 46, 0.3)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 700,
          color: '#be202e',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          🔄 Rotation
        </h3>
        <SliderGroup
          label="X (Pitch)"
          value={transform.rotation[0] * (180 / Math.PI)}
          onChange={(v: number) => updateRotation(0, v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <SliderGroup
          label="Y (Yaw)"
          value={transform.rotation[1] * (180 / Math.PI)}
          onChange={(v: number) => updateRotation(1, v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
        <SliderGroup
          label="Z (Roll)"
          value={transform.rotation[2] * (180 / Math.PI)}
          onChange={(v: number) => updateRotation(2, v)}
          min={-180}
          max={180}
          step={1}
          unit="°"
        />
      </div>

      {/* Object-specific controls */}
      {objectType === 'truck' && (
        <div style={{
          padding: '16px',
          background: 'rgba(108, 108, 108, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(108, 108, 108, 0.3)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: '#6c6c6c',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📏 Scale
          </h3>
          <SliderGroup
            label="Uniform Scale"
            value={transform.scale[0]}
            onChange={(v: number) => onChange({ scale: [v, v, v] })}
            min={0.1}
            max={3}
            step={0.1}
          />
        </div>
      )}

      {objectType === 'telematicsDisplay' && (
        <div style={{
          padding: '16px',
          background: 'rgba(108, 108, 108, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(108, 108, 108, 0.3)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: '#6c6c6c',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📐 Size
          </h3>
          <SliderGroup
            label="Width"
            value={transform.size[0]}
            onChange={(v: number) => onChange({ size: [v, transform.size[1]] })}
            min={1}
            max={15}
            step={0.5}
          />
          <SliderGroup
            label="Height"
            value={transform.size[1]}
            onChange={(v: number) => onChange({ size: [transform.size[0], v] })}
            min={1}
            max={10}
            step={0.5}
          />
        </div>
      )}

      {objectType === 'fuelSensor' && (
        <div style={{
          padding: '16px',
          background: 'rgba(108, 108, 108, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(108, 108, 108, 0.3)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: '#6c6c6c',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ⚙️ Properties
          </h3>
          <SliderGroup
            label="Scale"
            value={transform.scale}
            onChange={(v: number) => onChange({ scale: v })}
            min={0.1}
            max={3}
            step={0.1}
          />
          <SliderGroup
            label="Probe Length"
            value={transform.probeLength}
            onChange={(v: number) => onChange({ probeLength: v })}
            min={0.1}
            max={3}
            step={0.1}
          />
        </div>
      )}

      {objectType === 'logo' && (
        <div style={{
          padding: '16px',
          background: 'rgba(108, 108, 108, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(108, 108, 108, 0.3)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: '#6c6c6c',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ⚙️ Properties
          </h3>
          <SliderGroup
            label="Scale X"
            value={transform.scale[0]}
            onChange={(v: number) => onChange({ scale: [v, transform.scale[1]] })}
            min={0.1}
            max={3}
            step={0.1}
          />
          <SliderGroup
            label="Scale Y"
            value={transform.scale[1]}
            onChange={(v: number) => onChange({ scale: [transform.scale[0], v] })}
            min={0.1}
            max={3}
            step={0.1}
          />
          <SliderGroup
            label="Offset Z"
            value={transform.offsetZ}
            onChange={(v: number) => onChange({ offsetZ: v })}
            min={-5}
            max={5}
            step={0.01}
            decimals={2}
          />
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={() => onChange({ visible: !transform.visible })}
              style={{
                width: '100%',
                padding: '12px',
                background: transform.visible ? '#209771' : '#be202e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {transform.visible ? '👁️ Visible' : '🚫 Hidden'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
