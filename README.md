# MMM-SmartThings Enhanced

<div align="center">
  <img src="https://img.shields.io/badge/MagicMirror-Module-blue" alt="MagicMirror Module">
  <img src="https://img.shields.io/badge/Version-2.0.0-green" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
  <img src="https://img.shields.io/badge/Samsung-Enhanced-red" alt="Samsung Enhanced">
</div>

Ein elegantes und leistungsstarkes MagicMirror²-Modul für Samsung SmartThings mit fortgeschrittenen Features wie Echtzeit-Energiemonitoring, intelligenten Benachrichtigungen und Samsung-spezifischen Enhancements.

## Hauptfeatures

### **Modernes Design**
- **3 Premium-Themes**: Default, Dark, Modern mit Glasmorphismus-Effekten
- **Responsive Layout**: Automatische Anpassung an verschiedene Bildschirmgrößen
- **MagicMirror-Design-System**: Konsistent mit anderen Modulen
- **Animationen**: Sanfte Übergänge und Statusanzeigen

### **Echtes Energiemonitoring**
- **Live-Verbrauchsdaten** direkt von SmartThings API
- **Historische Trends** mit Vergleich zu Vormonaten
- **Intelligente Berechnungen** für Geräte ohne native Energiemessung
- **Kostenberechnungen** und Effizienzanalysen

### **Samsung Appliances Enhanced**
- **Waschmaschinen**: Status, Restzeit, Programmende-Benachrichtigungen
- **Trockner**: Betriebsmodi, Completion-Alerts, Energieverbrauch
- **Smart TVs**: Medienstatus, Lautstärke, Kanal-Information
- **Spezielle Samsung CE Capabilities** für erweiterte Features

### **Intelligente Benachrichtigungen**
- **Appliance-Finish-Alerts**: Automatische Benachrichtigungen wenn Geräte fertig sind
- **Status-Change-Notifications**: Bei wichtigen Zustandsänderungen
- **Browser-Notifications**: Integration in MagicMirror Notification-System

### **Performance & Zuverlässigkeit**
- **Intelligentes Caching** mit TTL-Management
- **Retry-Logic** für API-Ausfälle
- **Error-Handling** mit detailliertem Debugging
- **Memory-optimiert** für Dauerbetrieb

## Screenshots

### Modern Theme mit Energiemonitoring
```
┌─ Smart Home ─────────────────── 15:42 ─┐
│  ⚡ Energieverbrauch                     │
│  🧺 Samsung Waschmaschine              │
│      Aktuell: 1,200W    Heute: 2.4kWh  │
│      Diesen Monat: 45.2kWh ↗           │
│                                         │
│  🏠 Wohnzimmer TV         [Ein]  📺    │
│      Vol: 15   Kanal: ARD              │
│  💡 Küchenlicht          [Aus]  💡     │
│  🚪 Haustür             [Geschlossen]   │
└─────────────────────────────────────────┘
```

## Quick Start

### 1. Installation
```bash
cd ~/MagicMirror/modules
git clone https://github.com/example/MMM-SmartThings.git
cd MMM-SmartThings
npm install
```

### 2. SmartThings Token erstellen
1. Gehen Sie zu: https://smartthings.developer.samsung.com/workspace/
2. **Personal Access Token** → **Generate new token**
3. Wählen Sie folgende Scopes:
   ```
   ✅ r:devices:*           (Geräte lesen)
   ✅ r:deviceprofiles:*    (Geräteprofile lesen)
   ✅ r:events:*            (Events/Historie lesen)
   ✅ r:locations:*         (Standorte lesen)
   ```

### 3. Device IDs ermitteln
Mit curl (Linux/Mac):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.smartthings.com/v1/devices" | jq '.items[] | {deviceId, label}'
```

Mit PowerShell (Windows):
```powershell
$headers = @{ "Authorization" = "Bearer YOUR_TOKEN" }
(Invoke-RestMethod -Uri "https://api.smartthings.com/v1/devices" -Headers $headers).items | 
  Select-Object deviceId, label
```

### 4. Basis-Konfiguration
```javascript
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    token: "YOUR_SMARTTHINGS_TOKEN",
    deviceIds: [
      "12345678-1234-1234-1234-123456789abc",
      "87654321-4321-4321-4321-cba987654321"
    ],
    energyDeviceIds: [
      "12345678-1234-1234-1234-123456789abc"  // Nur Geräte mit Energiemessung
    ]
  }
}
```

## Vollständige Konfiguration

```javascript
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    // ========== ERFORDERLICH ==========
    token: "YOUR_SMARTTHINGS_TOKEN",              // SmartThings Personal Access Token
    deviceIds: ["device-1", "device-2"],          // Array der zu überwachenden Geräte-IDs
    
    // ========== ENERGIEMONITORING ==========
    showEnergyStats: true,                        // Energiestatistiken anzeigen
    energyDeviceIds: ["device-1"],                // Geräte mit Energiemessung
    showRealTimeEnergy: true,                     // Echte SmartThings Energiedaten verwenden
    showEnergyTrends: true,                       // Trend-Indikatoren (↗↘→)
    
    // ========== SAMSUNG ENHANCEMENTS ==========
    samsungEnhanced: true,                        // Samsung-spezifische Features
    enableNotifications: true,                    // Intelligente Benachrichtigungen
    
    // ========== ANZEIGE & LAYOUT ==========
    layout: "vertical",                           // "vertical" | "horizontal"
    theme: "modern",                              // "default" | "dark" | "modern"
    compactMode: false,                           // Kompakte Darstellung
    showIcons: true,                              // Device-Icons anzeigen
    showLastUpdate: true,                         // Zeitstempel der letzten Aktualisierung
    maxDevices: 10,                               // Maximum anzuzeigende Geräte
    showAnimations: true,                         // Sanfte Animationen
    
    // ========== UPDATE-INTERVALLE ==========
    updateInterval: 60 * 1000,                   // Standard-Updates (1 Minute)
    energyUpdateInterval: 5 * 60 * 1000,         // Energie-Updates (5 Minuten)
    
    // ========== DEBUGGING ==========
    debug: false                                  // Debug-Modus für Entwicklung
  }
}
```

## Design-Themes

### Default Theme
- **Glasmorphismus-Design** mit subtiler Transparenz
- **Blaue Akzentfarben** passend zu SmartThings
- **Optimiert für helle Umgebungen**

```javascript
config: {
  theme: "default"
}
```

### Dark Theme
- **Dunkler Hintergrund** für bessere Lesbarkeit
- **Erhöhte Kontraste** für nächtliche Nutzung
- **Reduzierte Helligkeit**

```javascript
config: {
  theme: "dark"
}
```

### Modern Theme
- **Gradient-Hintergründe** mit Premium-Look
- **Erweiterte Glaseffekte** und Schatten
- **Moderne Farbpalette** mit Accents

```javascript
config: {
  theme: "modern"
}
```

## Unterstützte Geräte

| Gerätetyp | Standard Support | Samsung Enhanced | Energiemonitoring |
|-----------|------------------|------------------|-------------------|
| **Samsung Waschmaschinen** | ✅ Status | ✅ Restzeit, Programme, Alerts | ✅ Echtzeit-Verbrauch |
| **Samsung Trockner** | ✅ Status | ✅ Betriebsmodi, Completion-Alerts | ✅ Echtzeit-Verbrauch |
| **Samsung Smart TVs** | ✅ Ein/Aus | ✅ Mediensteuerung, Lautstärke | ✅ Standby-Verbrauch |
| **Smart Switches** | ✅ Ein/Aus Status | ➖ | ✅ Verbrauchsmessung |
| **Smart Plugs** | ✅ Ein/Aus Status | ➖ | ✅ Echtzeit-Verbrauch |
| **Sensoren** | ✅ Temperatur, Kontakt, Bewegung | ➖ | ➖ |
| **LED-Strips** | ✅ Ein/Aus, Helligkeit | ➖ | ✅ Verbrauchsmessung |

### Samsung CE (Consumer Electronics) Features
- **Betriebszustände**: run, pause, finished, error
- **Restzeit-Anzeige**: Minuten/Stunden bis Programmende
- **Kindersicherung**: Status der Kids-Lock-Funktion
- **Waschmittel-Status**: Füllstand bei kompatiblen Geräten

## Energiemonitoring im Detail

### Echte SmartThings Daten
Das Modul nutzt die native `powerConsumptionReport` Capability von SmartThings:
```javascript
{
  "powerConsumptionReport": {
    "powerConsumption": {
      "value": {
        "power": 1200,              // Aktuelle Leistung in Watt
        "energy": 2400,             // Gesamtenergie in Wh
        "deltaEnergy": 120,         // Energie seit letztem Report
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-01T01:00:00Z"
      }
    }
  }
}
```

### Berechnete Werte
Für Geräte ohne native Energiemessung verwendet das Modul intelligente Berechnungen:
- **Gerätespezifische Profile** basierend auf Typ und Hersteller
- **Nutzungsmuster-Erkennung** für realistische Schätzungen
- **Historische Daten** für Trend-Berechnungen

### Trend-Indikatoren
- **↗ Steigend**: >5% Zunahme zum Vormonat
- **↘ Fallend**: >5% Abnahme zum Vormonat  
- **→ Stabil**: ±5% Schwankung

## Benachrichtigungssystem

### Appliance-Benachrichtigungen
```javascript
// Samsung Waschmaschine fertig
{
  type: "appliance_finished",
  message: "Samsung Waschmaschine ist fertig!",
  title: "SmartThings",
  timer: 8000
}

// Samsung Trockner fertig  
{
  type: "appliance_finished", 
  message: "Samsung Trockner ist fertig!",
  title: "SmartThings",
  timer: 8000
}
```

### Geräte-Status-Änderungen
- Ein/Aus-Schalter betätigt
- Tür/Fenster geöffnet/geschlossen
- Bewegungsmelder aktiviert
- Temperatur-Schwellwerte überschritten

## Beispiel-Konfigurationen

### Kompakte Sidebar
```javascript
{
  module: "MMM-SmartThings",
  position: "top_left", 
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["device-1", "device-2", "device-3"],
    compactMode: true,
    theme: "dark",
    layout: "vertical",
    showEnergyStats: false,
    maxDevices: 5
  }
}
```

### Energie-Dashboard
```javascript
{
  module: "MMM-SmartThings",
  position: "middle_center",
  header: "Energieverbrauch Live",
  config: {
    token: "YOUR_TOKEN", 
    deviceIds: ["washer", "dryer", "tv", "dishwasher"],
    energyDeviceIds: ["washer", "dryer", "tv", "dishwasher"],
    theme: "modern",
    layout: "horizontal",
    showEnergyStats: true,
    showRealTimeEnergy: true,
    showEnergyTrends: true,
    samsungEnhanced: true,
    updateInterval: 30000  // 30 Sekunden für Live-Updates
  }
}
```

### Samsung Appliance Center
```javascript
{
  module: "MMM-SmartThings",
  position: "bottom_right",
  header: "Samsung Geräte",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["samsung-washer", "samsung-dryer", "samsung-tv"],
    energyDeviceIds: ["samsung-washer", "samsung-dryer"],
    theme: "default",
    samsungEnhanced: true,
    enableNotifications: true,
    showEnergyStats: true,
    showAnimations: true,
    compactMode: false
  }
}
```

## 🛠️ Entwicklung & Debugging

### Debug-Modus aktivieren
```javascript
config: {
  debug: true
}
```

### Log-Ausgaben
**MagicMirror Logs:**
```bash
pm2 logs mm
# oder
tail -f ~/.pm2/logs/mm-out.log
```

**Browser-Konsole:**
- F12 → Console Tab
- Logs beginnen mit `[MMM-SmartThings Enhanced]`

### API-Tests
```bash
# Geräte auflisten
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.smartthings.com/v1/devices"

# Gerätestatus abrufen
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.smartthings.com/v1/devices/DEVICE_ID/status"

# Energieverbrauch abrufen
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.smartthings.com/v1/devices/DEVICE_ID/events?capability=powerConsumptionReport"
```

## Troubleshooting

### Häufige Probleme

**❌ Module lädt nicht**
- Token-Format prüfen (sollte mit `c6592bf7-...` beginnen)
- Device IDs validieren (UUID-Format erforderlich)
- MagicMirror Neustart: `pm2 restart mm`

**❌ Keine Geräte-Daten**
```javascript
// Debug aktivieren und Logs prüfen
config: {
  debug: true
}
```

**❌ Energiedaten fehlen**
- `energyDeviceIds` konfigurieren
- Gerät muss `powerConsumptionReport` oder `powerMeter` unterstützen
- Alternative: Intelligente Berechnung wird automatisch verwendet

**❌ Samsung-Features funktionieren nicht** 
- `samsungEnhanced: true` setzen
- Gerät muss Samsung CE Capabilities haben
- Samsung Developer Account erforderlich

### Erweiterte Diagnostik
```javascript
{
  module: "MMM-SmartThings",
  config: {
    debug: true,
    // Minimale Konfiguration zum Testen
    token: "YOUR_TOKEN",
    deviceIds: ["ONE_DEVICE_ID"],
    updateInterval: 10000,  // 10 Sekunden für schnelles Testing
    energyUpdateInterval: 30000
  }
}
```

## Performance-Optimierung

### Empfohlene Einstellungen
```javascript
config: {
  // Reduzierte Update-Frequenz für bessere Performance
  updateInterval: 2 * 60 * 1000,         // 2 Minuten
  energyUpdateInterval: 10 * 60 * 1000,  // 10 Minuten
  
  // Begrenzte Gerätezahl
  maxDevices: 8,
  
  // Kompakter Modus für weniger DOM-Elemente
  compactMode: true,
  
  // Animationen deaktivieren bei schwacher Hardware
  showAnimations: false
}
```

### Cache-Verhalten
- **Standard-Cache**: 1 Minute TTL
- **Energie-Cache**: 5 Minuten TTL
- **Automatische Bereinigung** bei Speichermangel

## Roadmap

### Version 2.1.0 (Q2 2024)
- [ ] **Chart.js Integration** für Energieverlauf-Diagramme
- [ ] **Erweiterte Themes** mit benutzerdefinierten Farben
- [ ] **Location-Support** für Raum-basierte Gruppierung
- [ ] **Voice-Alerts** über MagicMirror Notification-System

### Version 2.2.0 (Q3 2024)
- [ ] **SmartThings Rules Integration** 
- [ ] **Geofence-Support** für Anwesenheits-basierte Features
- [ ] **Multi-Location-Support** für mehrere SmartThings-Hubs
- [ ] **Advanced Scheduling** für zeitbasierte Automatisierung

## Beitragen

Contributions sind herzlich willkommen! 

### Entwicklungsumgebung
```bash
git clone https://github.com/example/MMM-SmartThings.git
cd MMM-SmartThings
npm install
npm run lint  # ESLint-Prüfung
npm run format  # Code-Formatierung
```

### Pull Request Guideline
1. **Fork** das Repository
2. **Feature Branch** erstellen: `git checkout -b feature/amazing-feature`
3. **Änderungen committen**: `git commit -m 'Add amazing feature'`
4. **Branch pushen**: `git push origin feature/amazing-feature`
5. **Pull Request** erstellen

## Lizenz

MIT License - siehe [LICENSE.md](LICENSE.md) für Details.

## Credits

- **MagicMirror²** Framework
- **Samsung SmartThings API**
- **Chart.js** für zukünftige Diagramm-Features
- **Axios** für HTTP-Requests

---

<div align="center">
  <strong>Entwickelt mit ❤️ für die MagicMirror Community</strong><br>
  <sub>Samsung SmartThings Enhanced Integration</sub>
</div>
