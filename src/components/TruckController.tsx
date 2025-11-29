import React, { useState } from 'react';
import { Copy, Check, Layers } from 'lucide-react';

interface TruckConfig {
  position: [number, number, number];
  scale: number;
}

interface TruckControllerProps {
  initialConfig: TruckConfig;
  onConfigChange: (config: TruckConfig) => void;
  embedded?: boolean;
}

export const TruckController: React.FC<TruckControllerProps> = ({ initialConfig, onConfigChange, embedded = false }) => {
  const [config, setConfig] = useState<TruckConfig>(initialConfig);
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

  const updateScale = (value: number) => {
    setConfig(prev => ({ ...prev, scale: value }));
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
      scale: 1.5625
    });
  };

  return (
    <div className={embedded ? 'relative' : 'fixed top-20 right-4 z-50'}>
      {/* Toggle Button */}
      {!embedded && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mb-2 px-3 py-1 bg-red-900/10 border border-red-600/30 text-white rounded hover:bg-red-600 hover:text-black transition-all font-mono text-[10px] font-bold tracking-widest flex items-center gap-2"
        >
          <span>TRUCK CONTROLS</span>
          <Layers size={16} />
        </button>
      )}

      {/* Control Panel */}
      {isOpen && (
        <div className="bg-black/90 backdrop-blur-sm rounded-lg shadow-2xl border border-red-600/50 p-4 w-80 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-red-600/50">
            <h3 className="font-mono font-bold text-red-500 text-sm tracking-wider">TRUCK CONTROLS</h3>
            <button
              onClick={copyJSON}
              className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-600/50 text-white rounded text-xs hover:bg-red-600 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          {/* Position Controls */}
          <div className="mb-4 p-3 bg-red-900/10 rounded border border-red-600/30">
            <h4 className="font-mono font-bold text-xs text-gray-400 mb-2 uppercase">Position</h4>
            <div className="space-y-2">
              {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="w-6 font-mono text-xs font-bold text-gray-500">{axis}:</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.1"
                    value={config.position[index]}
                    onChange={(e) => updatePosition(index, parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <input
                    type="number"
                    value={config.position[index].toFixed(1)}
                    onChange={(e) => updatePosition(index, parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-white"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scale Control */}
          <div className="mb-4 p-3 bg-red-900/10 rounded border border-red-600/30">
            <h4 className="font-mono font-bold text-xs text-gray-400 mb-2 uppercase">Scale</h4>
            <div className="flex items-center gap-2">
              <label className="w-6 font-mono text-xs font-bold text-gray-500">S:</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.05"
                value={config.scale}
                onChange={(e) => updateScale(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
              <input
                type="number"
                value={config.scale.toFixed(2)}
                onChange={(e) => updateScale(parseFloat(e.target.value) || 0.1)}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-white"
                step="0.05"
              />
            </div>
          </div>

          {/* JSON Output */}
          <div className="mb-4">
            <h4 className="font-mono font-bold text-xs text-gray-400 mb-2 uppercase">JSON Config</h4>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto border border-gray-700">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetConfig}
            className="w-full px-4 py-2 bg-red-600/20 border border-red-600/50 text-white rounded font-mono text-xs font-bold hover:bg-red-600 transition-colors tracking-wider"
          >
            RESET TO DEFAULT
          </button>
        </div>
      )}
    </div>
  );
};
