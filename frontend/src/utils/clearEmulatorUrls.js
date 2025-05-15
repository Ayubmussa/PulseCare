import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper function to find and clear any Android emulator URLs that might be cached
 * This is useful for debugging and fixing issues with API connections
 */
export const clearEmulatorUrls = async () => {
  console.log('Scanning for Android emulator URLs in AsyncStorage...');
  
  try {
    // Get all storage keys
    const keys = await AsyncStorage.getAllKeys();
    
    // Find keys related to our app's URL storage
    const urlKeys = keys.filter(key => 
      key.includes('PulseCare') && 
      (key.includes('Url') || key.includes('URL'))
    );
    
    console.log(`Found ${urlKeys.length} potential URL storage keys`);
    
    // Check each key for emulator URLs
    const emulatorUrls = [];
    for (const key of urlKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value && value.includes('10.0.2.2')) {
        emulatorUrls.push({ key, value });
        
        // Delete any emulator URLs
        console.log(`Removing emulator URL from ${key}: ${value}`);
        await AsyncStorage.removeItem(key);
      }
    }
    
    if (emulatorUrls.length > 0) {
      console.log(`Cleared ${emulatorUrls.length} emulator URLs from storage`);
      return { 
        success: true, 
        clearedUrls: emulatorUrls 
      };
    } else {
      console.log('No emulator URLs found in storage');
      return { 
        success: true, 
        clearedUrls: [] 
      };
    }
  } catch (error) {
    console.error('Error while clearing emulator URLs:', error);
    return { 
      success: false, 
      error 
    };
  }
};

/**
 * Helper function to print all stored URLs for debugging
 */
export const printStoredUrls = async () => {
  try {
    // Get all storage keys
    const keys = await AsyncStorage.getAllKeys();
    
    console.log('=== Current AsyncStorage URL Entries ===');
    
    // Check for all keys containing URL-like data
    for (const key of keys) {
      if (key.includes('PulseCare')) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}: ${value}`);
      }
    }
    
    console.log('======================================');
    return true;
  } catch (error) {
    console.error('Error reading stored URLs:', error);
    return false;
  }
};

/**
 * Sets API URL to the device's IP address and clears any other stored URLs
 */
export const forceUseActualIpAddress = async (actualIp = '172.20.17.37') => {
  console.log(`Forcing API URL to actual IP address: ${actualIp}`);
  
  try {
    // Clear all previous URL settings
    await AsyncStorage.removeItem('@PulseCare:manualApiUrl');
    await AsyncStorage.removeItem('@PulseCare:lastWorkingUrl');
    
    // Set to use auto-detection with known working URL
    await AsyncStorage.setItem('@PulseCare:useAutoDetect', 'true');
    await AsyncStorage.setItem('@PulseCare:lastWorkingUrl', `http://${actualIp}:5000/api`);
    
    console.log('Successfully forced API URL to actual IP address');
    return true;
  } catch (error) {
    console.error('Failed to force actual IP address:', error);
    return false;
  }
};

export default {
  clearEmulatorUrls,
  printStoredUrls,
  forceUseActualIpAddress
};
