/* 
 * MMM-SmartThings - Minimale Konfiguration
 * 
 * Kopiere diese Beispiele und passe sie an deine SmartThings-Umgebung an.
 */

// ==========================================
// STANDARD KONFIGURATION
// ==========================================
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    // ERFORDERLICH
    token: "YOUR_SMARTTHINGS_TOKEN_HERE",
    deviceIds: [
      "device-id-1",
      "device-id-2", 
      "device-id-3"
    ],
    
    // OPTIONAL - Energie-Monitoring
    energyDeviceIds: [
      "energy-device-id-1",
      "energy-device-id-2"
    ],
    
    // ANZEIGE
    showIcons: true,
    showLastUpdate: true,
    showEnergyStats: true,
    maxDevices: 10,
    
    // DESIGN
    layout: "vertical",     // "vertical" oder "horizontal"
    theme: "default",       // "default", "dark", "modern"
    compactMode: false,
    
    // UPDATES
    updateInterval: 60 * 1000,  // 1 Minute
    
    // DEBUG
    debug: false
  }
},

// ==========================================
// KOMPAKTE KONFIGURATION
// ==========================================
{
  module: "MMM-SmartThings",
  position: "bottom_left",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["device-1", "device-2"],
    compactMode: true,
    theme: "dark",
    layout: "horizontal",
    showEnergyStats: false
  }
},

// ==========================================
// ENERGIE-FOKUS KONFIGURATION
// ==========================================
{
  module: "MMM-SmartThings",
  position: "middle_center",
  header: "Energieverbrauch",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["washer-id", "dryer-id", "tv-id"],
    energyDeviceIds: ["washer-id", "dryer-id", "tv-id"],
    showEnergyStats: true,
    theme: "modern",
    layout: "vertical",
    maxDevices: 5
  }
},

// ==========================================
// MODERN DESIGN KONFIGURATION
// ==========================================
{
  module: "MMM-SmartThings",
  position: "top_center",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: [
      "living-room-switch",
      "front-door-sensor",
      "washing-machine",
      "samsung-tv"
    ],
    energyDeviceIds: [
      "washing-machine",
      "samsung-tv"
    ],
    theme: "modern",
    layout: "horizontal",
    showIcons: true,
    showEnergyStats: true,
    updateInterval: 30 * 1000
  }
}

/*
 * TOKEN ERSTELLEN:
 * 1. Gehe zu: https://smartthings.developer.samsung.com/workspace/
 * 2. Erstelle einen "Personal Access Token"
 * 3. Wähle diese Berechtigungen:
 *    - r:devices:*
 *    - r:deviceprofiles:*
 *    - r:events:*
 * 
 * DEVICE IDs FINDEN:
 * curl -H "Authorization: Bearer YOUR_TOKEN" https://api.smartthings.com/v1/devices
 * 
 * ODER mit PowerShell:
 * Invoke-RestMethod -Uri "https://api.smartthings.com/v1/devices" -Headers @{ "Authorization" = "Bearer YOUR_TOKEN" }
 */