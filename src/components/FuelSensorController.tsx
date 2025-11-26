import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface FuelSensorConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  probeLength: number;
  manualPosition?: boolean;
}

interface FuelSensorControllerProps {
  initialConfig: FuelSensorConfig;
  onConfigChange: (config: FuelSensorConfig) => void;
  onManualToggle?: (manual: boolean) => void;
  embedded?: boolean;
}

export const FuelSensorController: React.FC<FuelSensorControllerProps> = ({ initialConfig, onConfigChange, onManualToggle, embedded = false }) => {
  const [config, setConfig] = useState<FuelSensorConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(embedded ? true : false);
  const [manualMode, setManualMode] = useState(initialConfig.manualPosition ?? true);

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

  const resetConfig = () => {
    setConfig({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 0.025,
      probeLength: 0.6
    });
  };
  
  const toggleManualMode = () => {
    const newMode = !manualMode;
    setManualMode(newMode);
    if (onManualToggle) {
      onManualToggle(newMode);
    }
  };

  return (
    <div className={embedded ? 'relative' : 'fixed bottom-24 right-6 z-50'}>
      {/* Toggle Button */}
      {!embedded && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mb-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all font-mono text-sm font-bold"
        >
          {isOpen ? '✕ CLOSE' : '⛽ FUEL SENSOR'}
        </button>
      )}

      {/* Control Panel */}
      {isOpen && (
        <div className={`${embedded ? 'bg-transparent' : 'bg-white/95 backdrop-blur-sm'} ${embedded ? '' : 'rounded-lg shadow-2xl border-2 border-red-500'} p-4 ${embedded ? 'w-full' : 'w-80'} ${embedded ? '' : 'max-h-[70vh] overflow-y-auto'}`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-red-500">
            <h3 className="font-mono font-bold text-red-900 text-sm">FUEL SENSOR CONTROLS</h3>
            <button
              onClick={copyJSON}
              className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          {/* Manual/Auto Mode Toggle */}
          <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-300">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-mono font-bold text-xs text-yellow-700 uppercase">Positioning Mode</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {manualMode ? '🎮 Manual - Using UI controls' : '🤖 Auto - Detects fuel tank'}
                </p>
              </div>
              <button
                onClick={toggleManualMode}
                className={`px-3 py-2 rounded font-mono text-xs font-bold transition-colors ${
                  manualMode 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {manualMode ? 'MANUAL' : 'AUTO'}
              </button>
            </div>
          </div>

          {/* Position Controls */}
          <div className="mb-4 p-3 bg-red-50 rounded border border-red-300">
            <h4 className="font-mono font-bold text-xs text-red-700 mb-2 uppercase">Sensor Position (X, Y, Z) - Fine Control</h4>
            <div className="space-y-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="w-8 font-mono text-xs font-bold text-gray-600">{axis}:</label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="0.01"
                    value={config.position[index]}
                    onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={config.position[index].toFixed(2)}
                    onChange={(e) => updatePosition(index, parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600 font-mono">
              <div>• X: Left (-) / Right (+)</div>
              <div>• Y: Down (-) / Up (+)</div>
              <div>• Z: Back (-) / Front (+)</div>
              <div className="text-green-600 font-bold mt-1">• Step: 0.01 (Fine precision)</div>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-300">
            <h4 className="font-mono font-bold text-xs text-purple-700 mb-2 uppercase">Sensor Rotation (X, Y, Z) - Degrees</h4>
            <div className="space-y-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="w-8 font-mono text-xs font-bold text-gray-600">{axis}:</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={(config.rotation[index] * 180 / Math.PI).toFixed(0)}
                    onChange={(e) => updateRotation(index, parseFloat(e.target.value) * Math.PI / 180)}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={(config.rotation[index] * 180 / Math.PI).toFixed(0)}
                    onChange={(e) => updateRotation(index, (parseFloat(e.target.value) || 0) * Math.PI / 180)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                    step="1"
                  />
                  <span className="text-xs text-gray-500">°</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600 font-mono">
              <div>• X: Pitch (tilt forward/back)</div>
              <div>• Y: Yaw (rotate left/right)</div>
              <div>• Z: Roll (tilt sideways)</div>
            </div>
          </div>

          {/* Scale Control */}
          <div className="mb-4 p-3 bg-orange-50 rounded border border-orange-300">
            <h4 className="font-mono font-bold text-xs text-orange-700 mb-2 uppercase">Sensor Scale</h4>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.001"
                max="5"
                step="0.001"
                value={config.scale}
                onChange={(e) => updateScale(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={config.scale.toFixed(3)}
                onChange={(e) => updateScale(parseFloat(e.target.value) || 0.001)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                step="0.001"
              />
            </div>
            <div className="flex gap-1 mt-2">
              {[0.015, 0.025, 0.05, 0.1, 0.5, 1.0, 2.0].map((preset) => (
                <button
                  key={preset}
                  onClick={() => updateScale(preset)}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                    Math.abs(config.scale - preset) < 0.001
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Probe Length Control */}
          <div className="mb-4 p-3 bg-green-50 rounded border border-green-300">
            <h4 className="font-mono font-bold text-xs text-green-700 mb-2 uppercase">Probe Length (Tank Height)</h4>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={config.probeLength}
                onChange={(e) => updateProbeLength(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={config.probeLength.toFixed(1)}
                onChange={(e) => updateProbeLength(parseFloat(e.target.value) || 0.1)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                step="0.1"
              />
            </div>
            <div className="flex gap-1 mt-2">
              {[0.3, 0.6, 1.0, 1.5, 2.0].map((preset) => (
                <button
                  key={preset}
                  onClick={() => updateProbeLength(preset)}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                    Math.abs(config.probeLength - preset) < 0.1
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-300">
            <h4 className="font-mono font-bold text-xs text-blue-700 mb-2 uppercase">Quick Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfig({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.025, probeLength: 0.6 })}
                className="px-3 py-2 bg-blue-500 text-white rounded text-xs font-mono hover:bg-blue-600 transition-colors"
              >
                DEFAULT
              </button>
              <button
                onClick={() => setConfig({ position: [0, -20, -100], rotation: [0, 0, 0], scale: 0.025, probeLength: 0.6 })}
                className="px-3 py-2 bg-blue-500 text-white rounded text-xs font-mono hover:bg-blue-600 transition-colors"
              >
                UNDER CHASSIS
              </button>
              <button
                onClick={() => setConfig({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 2.0, probeLength: 0.6 })}
                className="px-3 py-2 bg-yellow-500 text-white rounded text-xs font-mono hover:bg-yellow-600 transition-colors"
              >
                HUGE (DEBUG)
              </button>
              <button
                onClick={() => setConfig({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.015, probeLength: 0.6 })}
                className="px-3 py-2 bg-purple-500 text-white rounded text-xs font-mono hover:bg-purple-600 transition-colors"
              >
                TINY
              </button>
            </div>
          </div>

          {/* JSON Output */}
          <div className="mb-4">
            <h4 className="font-mono font-bold text-xs text-gray-700 mb-2 uppercase">JSON Config</h4>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetConfig}
            className="w-full px-4 py-2 bg-red-500 text-white rounded font-mono text-xs font-bold hover:bg-red-600 transition-colors"
          >
            RESET TO DEFAULT
          </button>
        </div>
      )}
    </div>
  );
};
