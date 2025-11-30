/**
 * Config Sync Utility
 * 
 * Provides utilities for syncing controller values with objectTransforms.json
 * Enables automatic updates from manual controller adjustments to config file
 */

const CONFIG_PATH = '/src/config/objectTransforms.json';

export interface ConfigSyncOptions {
  autoSave?: boolean;
  debounceMs?: number;
}

/**
 * Read the entire objectTransforms.json config
 */
export async function readConfig(): Promise<any> {
  try {
    const response = await fetch(CONFIG_PATH);
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to read config:', error);
    throw error;
  }
}

/**
 * Export a specific object's config to clipboard
 * User must manually paste into objectTransforms.json
 */
export async function exportToConfig(
  objectKey: string,
  config: any
): Promise<void> {
  try {
    const existingConfig = await readConfig();
    existingConfig[objectKey] = config;
    
    const updatedJSON = JSON.stringify(existingConfig, null, 2);
    await navigator.clipboard.writeText(updatedJSON);
    
    console.log(`✓ ${objectKey} config exported to clipboard`);
    console.log('📋 Paste into src/config/objectTransforms.json');
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Import a specific object's config from objectTransforms.json
 */
export async function importFromConfig(objectKey: string): Promise<any> {
  try {
    const config = await readConfig();
    
    if (!config[objectKey]) {
      throw new Error(`No config found for key: ${objectKey}`);
    }
    
    console.log(`✓ ${objectKey} config imported from objectTransforms.json`);
    return config[objectKey];
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

/**
 * Generate formatted JSON for a specific object config
 */
export function formatConfigJSON(config: any): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Generate full config file JSON with updated object
 */
export async function generateFullConfigJSON(
  objectKey: string,
  config: any
): Promise<string> {
  const existingConfig = await readConfig();
  existingConfig[objectKey] = config;
  return JSON.stringify(existingConfig, null, 2);
}
