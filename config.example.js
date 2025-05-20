/* 
 * MMM-SmartThings - Beispielkonfiguration v1.1.0
 * 
 * Kopieren Sie diese Datei und passen Sie die Werte an Ihre SmartThings-Umgebung an.
 * Fügen Sie die Konfiguration zu Ihrer config/config.js in MagicMirror hinzu.
 */

// ==========================================
// VOLLSTÄNDIGE BEISPIELKONFIGURATION
// ==========================================
{
  module: "MMM-SmartThings",
  position: "top_right", // top_left, top_center, top_right, middle_center, bottom_left, bottom_center, bottom_right
  config: {
    // ==========================================
    // ERFORDERLICHE EINSTELLUNGEN
    // ==========================================
    
    // SmartThings Personal Access Token
    // Erstellen Sie einen Token unter: https://smartthings.developer.samsung.com/workspace/
    // Benötigte Berechtigungen: r:devices:*, r:deviceprofiles:*, r:events:*
    token: "YOUR_SMARTTHINGS_TOKEN_HERE",
    
    // Liste der Geräte-IDs, die angezeigt werden sollen
    // Ermitteln Sie Ihre Device IDs mit PowerShell:
    // Invoke-RestMethod -Uri "https://api.smartthings.com/v1/devices" -Headers @{ "Authorization" = "Bearer YOUR_TOKEN" }
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
    
    showIcons: true,           // SVG-Icons für Gerätetypen anzeigen
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
    // Nur Geräte mit powerMeter-Capability verwenden
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
    },
    
    // ==========================================
    // PERFORMANCE & DEBUG (NEU in v2.0.0)
    // ==========================================
    
    debug: false,                    // Debug-Modus aktivieren
    enablePerformanceMonitoring: true, // Performance-Tracking
    cacheEnabled: true,              // Intelligentes Caching
    showPerformanceStats: false      // Performance-Stats anzeigen
  }
},

// ==========================================
// ALTERNATIVE KONFIGURATIONEN
// ==========================================

// KOMPAKTE KONFIGURATION (Minimal)
{
  module: "MMM-SmartThings",
  position: "bottom_left", 
  header: "Smart Home",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["device-1", "device-2"],
    compactMode: true,
    showChart: false,
    showLastUpdate: false,
    layout: "horizontal",
    theme: "default"
  }
},

// CHART-FOKUSSIERTE KONFIGURATION  
{
  module: "MMM-SmartThings", 
  position: "middle_center",
  header: "Stromverbrauch",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["power-device-1"],
    powerDeviceIds: ["power-device-1"],
    showChart: true,
    chartHistoryHours: 48,
    layout: "vertical",
    theme: "dark",
    maxDevices: 3,
    updateInterval: 30 * 1000    // Häufigere Updates für Charts
  }
},

// GRID-LAYOUT FÜR VIELE GERÄTE
{
  module: "MMM-SmartThings",
  position: "top_center", 
  header: "Alle Geräte",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["dev-1", "dev-2", "dev-3", "dev-4", "dev-5", "dev-6"],
    layout: "grid",
    maxDevices: 20,
    compactMode: true,
    theme: "colorful",
    showChart: false,
    showLastUpdate: false
  }
},

// DEBUG & ENTWICKLUNG KONFIGURATION
{
  module: "MMM-SmartThings",
  position: "bottom_right",
  header: "Debug",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["test-device-1", "test-device-2"],
    debug: true,                     // Debug-Modus aktiviert
    enablePerformanceMonitoring: true,
    showPerformanceStats: true,      // Performance-Stats sichtbar
    updateInterval: 10 * 1000,       // Schnelle Updates für Testing
    compactMode: true,
    layout: "vertical"
  }
},

// PRODUCTION-OPTIMIERTE KONFIGURATION
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: [
      "living-room-switch",
      "front-door-sensor", 
      "washing-machine",
      "kitchen-power-meter"
    ],
    powerDeviceIds: [
      "kitchen-power-meter",
      "washing-machine"
    ],
    
    // Optimierte Performance-Einstellungen
    updateInterval: 60 * 1000,
    chartUpdateInterval: 10 * 60 * 1000,
    cacheEnabled: true,
    enablePerformanceMonitoring: true,
    
    // UI-Einstellungen
    showIcons: true,
    showChart: true,
    showLastUpdate: true,
    maxDevices: 8,
    compactMode: false,
    layout: "vertical",
    theme: "default",
    chartHistoryHours: 24,
    
    // Selektive Benachrichtigungen
    notifications: {
      enabled: true,
      washingMachine: true,
      dryer: false,          // Kein Trockner vorhanden
      lowBattery: true,
      doorOpen: true
    }
  }
}
