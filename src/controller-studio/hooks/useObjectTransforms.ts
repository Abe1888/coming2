import { useState, useEffect, useCallback } from 'react';
import objectTransforms from '../../config/objectTransforms.json';

export interface ObjectTransforms {
  truck: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  fuelSensor: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    probeLength: number;
  };
  telematicsDisplay: {
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number];
  };
  logo: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number];
    offsetZ: number;
    visible: boolean;
  };
}

const STORAGE_KEYS = {
  TRUCK: 'truck-config',
  FUEL_SENSOR: 'fuel-sensor-config',
  TELEMATICS: 'telematics-display-config',
  LOGO: 'logo-config'
};

export const useObjectTransforms = () => {
  const [transforms, setTransforms] = useState<ObjectTransforms>({
    truck: {
      position: objectTransforms.truck.position as [number, number, number],
      rotation: objectTransforms.truck.rotation as [number, number, number],
      scale: objectTransforms.truck.scale as [number, number, number]
    },
    fuelSensor: {
      position: objectTransforms.fuelSensor.position as [number, number, number],
      rotation: objectTransforms.fuelSensor.rotation as [number, number, number],
      scale: objectTransforms.fuelSensor.scale,
      probeLength: objectTransforms.fuelSensor.probeLength
    },
    telematicsDisplay: {
      position: objectTransforms.telematicsDisplay.position as [number, number, number],
      rotation: objectTransforms.telematicsDisplay.rotation as [number, number, number],
      size: objectTransforms.telematicsDisplay.size as [number, number]
    },
    logo: {
      position: objectTransforms.logo.position as [number, number, number],
      rotation: objectTransforms.logo.rotation as [number, number, number],
      scale: objectTransforms.logo.scale as [number, number],
      offsetZ: objectTransforms.logo.offsetZ,
      visible: objectTransforms.logo.visible
    }
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Force load from JSON on mount
  useEffect(() => {
    const loadFromJSON = async () => {
      try {
        const response = await fetch('/src/config/objectTransforms.json?t=' + Date.now());
        const config = await response.json();
        
        setTransforms({
          truck: {
            position: config.truck.position as [number, number, number],
            rotation: config.truck.rotation as [number, number, number],
            scale: config.truck.scale as [number, number, number]
          },
          fuelSensor: {
            position: config.fuelSensor.position as [number, number, number],
            rotation: config.fuelSensor.rotation as [number, number, number],
            scale: config.fuelSensor.scale,
            probeLength: config.fuelSensor.probeLength
          },
          telematicsDisplay: {
            position: config.telematicsDisplay.position as [number, number, number],
            rotation: config.telematicsDisplay.rotation as [number, number, number],
            size: config.telematicsDisplay.size as [number, number]
          },
          logo: {
            position: config.logo.position as [number, number, number],
            rotation: config.logo.rotation as [number, number, number],
            scale: config.logo.scale as [number, number],
            offsetZ: config.logo.offsetZ,
            visible: config.logo.visible
          }
        });
        
        console.log('✓ Controller Studio loaded from objectTransforms.json');
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    
    loadFromJSON();
  }, []);

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      const lastUpdate = localStorage.getItem('last-main-page-update');
      if (lastUpdate) {
        const timeDiff = Date.now() - parseInt(lastUpdate);
        setConnectionStatus(timeDiff < 5000 ? 'connected' : 'disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync to localStorage
  const syncToStorage = useCallback((key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('controller-update-timestamp', Date.now().toString());
    
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(value),
      url: window.location.href
    }));
  }, []);

  // Update transform
  const updateTransform = useCallback((
    object: keyof ObjectTransforms,
    updates: Partial<ObjectTransforms[typeof object]>
  ) => {
    setTransforms(prev => {
      const newTransforms = {
        ...prev,
        [object]: { ...prev[object], ...updates }
      };

      // Sync to localStorage
      const storageKey = {
        truck: STORAGE_KEYS.TRUCK,
        fuelSensor: STORAGE_KEYS.FUEL_SENSOR,
        telematicsDisplay: STORAGE_KEYS.TELEMATICS,
        logo: STORAGE_KEYS.LOGO
      }[object];

      syncToStorage(storageKey, newTransforms[object]);

      return newTransforms;
    });
  }, [syncToStorage]);

  // Export config
  const exportConfig = useCallback(async () => {
    try {
      const config = {
        telematicsDisplay: transforms.telematicsDisplay,
        fuelSensor: transforms.fuelSensor,
        truck: transforms.truck,
        logo: transforms.logo
      };
      
      const json = JSON.stringify(config, null, 2);
      await navigator.clipboard.writeText(json);
      console.log('✓ Config exported to clipboard');
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }, [transforms]);

  // Import config
  const importConfig = useCallback(async () => {
    try {
      // Force reload to get latest version
      const response = await fetch('/src/config/objectTransforms.json?t=' + Date.now());
      const config = await response.json();
      
      setTransforms({
        truck: {
          position: config.truck.position as [number, number, number],
          rotation: config.truck.rotation as [number, number, number],
          scale: config.truck.scale as [number, number, number]
        },
        fuelSensor: {
          position: config.fuelSensor.position as [number, number, number],
          rotation: config.fuelSensor.rotation as [number, number, number],
          scale: config.fuelSensor.scale,
          probeLength: config.fuelSensor.probeLength
        },
        telematicsDisplay: {
          position: config.telematicsDisplay.position as [number, number, number],
          rotation: config.telematicsDisplay.rotation as [number, number, number],
          size: config.telematicsDisplay.size as [number, number]
        },
        logo: {
          position: config.logo.position as [number, number, number],
          rotation: config.logo.rotation as [number, number, number],
          scale: config.logo.scale as [number, number],
          offsetZ: config.logo.offsetZ,
          visible: config.logo.visible
        }
      });
      
      console.log('✓ Config imported from objectTransforms.json');
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }, []);

  // Reset to default (from JSON file)
  const resetToDefault = useCallback(async (object: keyof ObjectTransforms) => {
    try {
      const response = await fetch('/src/config/objectTransforms.json?t=' + Date.now());
      const config = await response.json();
      
      const defaultConfig = {
        truck: {
          position: [...config.truck.position] as [number, number, number],
          rotation: [...config.truck.rotation] as [number, number, number],
          scale: [...config.truck.scale] as [number, number, number]
        },
        fuelSensor: {
          position: [...config.fuelSensor.position] as [number, number, number],
          rotation: [...config.fuelSensor.rotation] as [number, number, number],
          scale: config.fuelSensor.scale,
          probeLength: config.fuelSensor.probeLength
        },
        telematicsDisplay: {
          position: [...config.telematicsDisplay.position] as [number, number, number],
          rotation: [...config.telematicsDisplay.rotation] as [number, number, number],
          size: [...config.telematicsDisplay.size] as [number, number]
        },
        logo: {
          position: [...config.logo.position] as [number, number, number],
          rotation: [...config.logo.rotation] as [number, number, number],
          scale: [...config.logo.scale] as [number, number],
          offsetZ: config.logo.offsetZ,
          visible: config.logo.visible
        }
      };
      
      console.log(`🔄 Resetting ${object} to default:`, defaultConfig[object]);
      
      setTransforms(prev => {
        const newTransforms = {
          ...prev,
          [object]: { ...defaultConfig[object] }
        };
        console.log(`✓ New transforms state:`, newTransforms);
        return newTransforms;
      });
      
      // Also sync to localStorage
      const storageKey = {
        truck: STORAGE_KEYS.TRUCK,
        fuelSensor: STORAGE_KEYS.FUEL_SENSOR,
        telematicsDisplay: STORAGE_KEYS.TELEMATICS,
        logo: STORAGE_KEYS.LOGO
      }[object];
      
      syncToStorage(storageKey, defaultConfig[object]);
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset failed. Check console for details.');
    }
  }, [syncToStorage]);

  return {
    transforms,
    updateTransform,
    exportConfig,
    importConfig,
    resetToDefault,
    connectionStatus
  };
};
