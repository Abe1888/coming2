import { useState } from 'react';
import { Layers } from 'lucide-react';

interface TruckControlsProps {
  onPositionChange: (position: { x: number; y: number; z: number }) => void;
  onScaleChange: (scale: number) => void;
  initialPosition?: { x: number; y: number; z: number };
  initialScale?: number;
}

export const TruckControls = ({ 
  onPositionChange, 
  onScaleChange, 
  initialPosition = { x: 0, y: 0, z: 0 },
  initialScale = 1.5625 
}: TruckControlsProps) => {
  const [showControls, setShowControls] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    onPositionChange(newPosition);
  };

  const handleScaleChange = (value: number) => {
    setScale(value);
    onScaleChange(value);
  };

  const handleReset = () => {
    setPosition({ x: 0, y: 0, z: 0 });
    setScale(1.5625);
    onPositionChange({ x: 0, y: 0, z: 0 });
    onScaleChange(1.5625);
  };

  return (
    <>
      <button 
        onClick={() => setShowControls(!showControls)}
        className="group flex items-center gap-2 px-3 py-1 border border-red-600/30 bg-red-900/10 hover:bg-red-600 hover:text-black transition-all"
      >
        <span className="text-[10px] tracking-widest font-bold">TRUCK CONTROLS</span>
        <Layers size={16} />
      </button>

      {showControls && (
        <div className="fixed top-20 right-4 bg-black/90 border border-red-600/50 p-4 rounded-lg z-50 pointer-events-auto backdrop-blur-sm w-80">
          <h3 className="text-red-500 text-sm font-bold mb-4 tracking-wider">TRUCK CONTROLS</h3>
          <div className="space-y-3 mb-4">
            <div className="text-xs text-gray-400 mb-2">POSITION</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-6">X:</label>
              <input type="range" min="-20" max="20" step="0.1" value={position.x} onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              <span className="text-xs text-white w-12 text-right">{position.x.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-6">Y:</label>
              <input type="range" min="-10" max="10" step="0.1" value={position.y} onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              <span className="text-xs text-white w-12 text-right">{position.y.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-6">Z:</label>
              <input type="range" min="-20" max="20" step="0.1" value={position.z} onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              <span className="text-xs text-white w-12 text-right">{position.z.toFixed(1)}</span>
            </div>
          </div>
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <div className="text-xs text-gray-400 mb-2">SCALE</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-6">S:</label>
              <input type="range" min="0.1" max="5" step="0.05" value={scale} onChange={(e) => handleScaleChange(parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600" />
              <span className="text-xs text-white w-12 text-right">{scale.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={handleReset} className="w-full mt-4 px-3 py-2 bg-red-600/20 hover:bg-red-600 border border-red-600/50 text-xs font-bold tracking-wider transition-all">RESET</button>
        </div>
      )}
    </>
  );
};
