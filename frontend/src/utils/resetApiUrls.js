import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper utility to reset all stored API URL preferences
 * Use this to clear any cached emulator URLs like 10.0.2.2
 * and reset to the actual IP address for proper connectivity
 */
export const resetApiUrlPreferences = async () => {
  console.log('Resetting all API URL preferences...');
  
  try {
    // Clear all stored URL preferences
    await AsyncStorage.removeItem('@PulseCare:manualApiUrl');
    await AsyncStorage.removeItem('@PulseCare:lastWorkingUrl');
    await AsyncStorage.removeItem('@PulseCare:useAutoDetect');
    
    console.log('Successfully cleared all stored API URL preferences');
    console.log('App will now use the default actual IP address (192.168.3.1:5000/api)');
    
    return true;
  } catch (error) {
    console.error('Failed to reset API URL preferences:', error);
    return false;
  }
};

// Add option to set the preferred URL explicitly
export const setPreferredApiUrl = async (useActualIp = true) => {
  try {
    if (useActualIp) {
      // Store a preference to use actual IP
      await AsyncStorage.setItem('@PulseCare:useAutoDetect', 'true');
      await AsyncStorage.setItem('@PulseCare:lastWorkingUrl', 'http://192.168.3.1:5000/api');
      console.log('Set preferred URL to actual IP: http://192.168.3.1:5000/api');
    } else {
      // Store a preference to use localhost
      await AsyncStorage.setItem('@PulseCare:useAutoDetect', 'false');
      await AsyncStorage.setItem('@PulseCare:lastWorkingUrl', 'http://localhost:5000/api');
      console.log('Set preferred URL to localhost: http://localhost:5000/api');
    }
    
    // Make sure to remove any Android emulator URLs
    const allKeys = await AsyncStorage.getAllKeys();
    for (const key of allKeys) {
      if (key.includes('PulseCare')) {
        const value = await AsyncStorage.getItem(key);
        if (value && value.includes('10.0.2.2')) {
          console.log(`Found emulator URL in ${key}, removing...`);
          await AsyncStorage.removeItem(key);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to set preferred API URL:', error);
    return false;
  }
};
