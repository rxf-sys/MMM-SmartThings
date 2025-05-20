/* 
 * MMM-SmartThings - Beispielkonfiguration
 * 
 * Kopieren Sie diese Datei und passen Sie die Werte an Ihre SmartThings-Umgebung an.
 * Fügen Sie die Konfiguration zu Ihrer config/config.js in MagicMirror hinzu.
 */

// VOLLSTÄNDIGE BEISPIELKONFIGURATION
{
  module: "MMM-SmartThings",
  position: "top_right", // top_left, top_center, top_right, middle_center, bottom_left, bottom_center, bottom_right
  config: {
    // ==========================================
    // ERFORDERLICHE EINSTELLUNGEN
    // ==========================================
    
    // SmartThings Personal Access Token
    // Erstellen Sie einen Token unter: https://smartthings.developer.samsung.com/workspace/
    token: "YOUR_SMARTTHINGS_TOKEN_HERE",
    
    // Liste der Geräte-IDs, die angezeigt werden sollen
    // Ermitteln Sie Ihre Device IDs mit:
    // curl -H "Authorization: Bearer YOUR_TOKEN" https://api.smartthings.com/v1/devices
    deviceIds: [
      "device-id-1",
      "device-id-2", 
      "device-id-3"
    ],
    
    // ==========================================
    // UPDATE-EINSTELLUNGEN
    // ==========================================
    
    updateInterval: 60 * 1000,        // Hauptupdate-Intervall (1 Minute)
    chartUpdateInterval: 5 * 60 * 1000, // Chart-Update-Intervall (5 Minuten)
    
    // ==========================================
    // ANZEIGE-OPTIONEN  
    // ==========================================
    
    showIcons: true,           // Icons für Gerätetypen anzeigen
    showChart: true,           // Stromverbrauchschart anzeigen
    showLastUpdate: true,      // Zeitpunkt der letzten Aktualisierung anzeigen
    maxDevices: 10,            // Maximale Anzahl angezeigter Geräte
    compactMode: false,        // Kompakte Darstellung (weniger Details)
    
    // ==========================================
    // LAYOUT UND DESIGN
    // ==========================================
    
    layout: "vertical",        // "vertical", "horizontal", "grid" 
    theme: "default",          // "default", "dark", "colorful"
    
    // ==========================================
    // CHART-KONFIGURATION
    // ==========================================
    
    chartHistoryHours: 24,     // Anzahl Stunden für Chart-Historie
    
    // IDs der Geräte, die im Stromverbrauchschart angezeigt werden sollen
    powerDeviceIds: [
      "power-device-id-1",
      "power-device-id-2"
    ],
    
    // ==========================================
    // BENACHRICHTIGUNGEN
    // ==========================================
    
    notifications: {
      enabled: true,           // Benachrichtigungen aktivieren
      washingMachine: true,    // Waschmaschine fertig
      dryer: true,             // Trockner fertig  
      lowBattery: true,        // Niedrige Batterie (< 20%)
      doorOpen: true           // Tür/Fenster geöffnet
    }
  }
},

// ==========================================
// ALTERNATIVE KONFIGURATIONEN
// ==========================================

// KOMPAKTE KONFIGURATION (Minimal)
{
  module: "MMM-SmartThings",
  position: "bottom_left",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["device-1", "device-2"],
    compactMode: true,
    showChart: false,
    layout: "horizontal"
  }
},

// CHART-FOKUSSIERTE KONFIGURATION  
{
  module: "MMM-SmartThings", 
  position: "middle_center",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["device-1"],
    powerDeviceIds: ["device-1"],
    showChart: true,
    chartHistoryHours: 48,
    layout: "vertical",
    theme: "dark"
  }
},

// GRID-LAYOUT FÜR VIELE GERÄTE
{
  module: "MMM-SmartThings",
  position: "top_center", 
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["dev-1", "dev-2", "dev-3", "dev-4", "dev-5", "dev-6"],
    layout: "grid",
    maxDevices: 20,
    compactMode: true,
    theme: "colorful"
  }
}

// ==========================================
// GERÄTE-ID ERMITTLUNG
// ==========================================

/*
# Mit curl alle Geräte auflisten:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices | \
     jq '.items[] | {deviceId, label, deviceTypeName}'

# Oder detaillierte Info für ein bestimmtes Gerät:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices/DEVICE_ID

# Status eines Geräts abfragen:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices/DEVICE_ID/status
*/

// ==========================================
// TYPISCHE DEVICE TYPES
// ==========================================

/*
Häufige SmartThings Device Types:
- OCF Switch: Normale Schalter/Steckdosen
- OCF Motion Sensor: Bewegungsmelder  
- OCF Contact Sensor: Tür/Fensterkontakte
- Power Meter: Stromverbrauchsmesser
- Temperature Sensor: Temperatursensoren
- Multipurpose Sensor: Mehrzwecksensoren
- Smart Lock: Intelligente Türschlösser
- Smart Bulb: Intelligente Beleuchtung
- Washing Machine: Waschmaschinen
- Dryer: Wäschetrockner
*/