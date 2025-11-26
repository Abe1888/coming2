import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CargoLockConfig {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface CargoLockControllerProps {
  initialConfig: CargoLockConfig;
  onConfigChange: (config: CargoLockConfig) => void;
  embedded?: boolean;
}

export const CargoLockController: React.FC<CargoLockControllerProps> = ({ initialConfig, onConfigChange, embedded = false }) => {
  const [config, setConfig] = useState<CargoLockConfig>(initialConfig);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(embedded ? true : false);

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

  const copyJSON = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetConfig = () => {
    setConfig({
      position: [-9, 1.5, 0],
      rotation: [0, Math.PI / 2, 0]
    });
  };

  return (
    <div className={embedded ? 'relative' : 'fixed bottom-24 right-96 z-50'}>
      {/* Toggle Button */}
      {!embedded && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mb-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-all font-mono text-sm font-bold"
        >
          {isOpen ? '✕ CLOSE' : '🔒 CARGO LOCK'}
        </button>
      )}

      {/* Control Panel */}
      {isOpen && (
        <div className={`${embedded ? 'bg-transparent' : 'bg-white/95 backdrop-blur-sm'} ${embedded ? '' : 'rounded-lg shadow-2xl border-2 border-purple-500'} p-4 ${embedded ? 'w-full' : 'w-80'} ${embedded ? '' : 'max-h-[70vh] overflow-y-auto'}`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-purple-500">
            <h3 className="font-mono font-bold text-purple-900 text-sm">CARGO LOCK POSITION</h3>
            <button
              onClick={copyJSON}
              className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          {/* Position Controls */}
          <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-300">
            <h4 className="font-mono font-bold text-xs text-purple-700 mb-2 uppercase">Position</h4>
            <div className="space-y-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="w-8 font-mono text-xs font-bold text-gray-600">{axis}:</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.1"
                    value={config.position[index]}
                    onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={config.position[index].toFixed(1)}
                    onChange={(e) => updatePosition(index, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="mb-4 p-3 bg-indigo-50 rounded border border-indigo-300">
            <h4 className="font-mono font-bold text-xs text-indigo-700 mb-2 uppercase">Rotation (Radians)</h4>
            <div className="space-y-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="w-8 font-mono text-xs font-bold text-gray-600">{axis}:</label>
                  <input
                    type="range"
                    min="-3.14159"
                    max="3.14159"
                    step="0.01"
                    value={config.rotation[index]}
                    onChange={(e) => updateRotation(index, parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={config.rotation[index].toFixed(2)}
                    onChange={(e) => updateRotation(index, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                    step="0.01"
                  />
                </div>
              ))}
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
