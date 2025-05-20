# MMM-SmartThings - Minimalistisch

Ein elegantes MagicMirror-Modul für SmartThings mit Fokus auf Design und Benutzerfreundlichkeit.

## ✨ Features

- **Minimalistisches Design** - Clean und modern
- **Energieverbrauch Anzeige** - Aktuell, heute, diesen/letzten Monat  
- **Samsung Appliances** - Waschmaschine, Trockner, TV Support
- **3 Design-Themes** - Default, Dark, Modern
- **Responsive Layout** - Vertikal und horizontal
- **Performance-optimiert** - Caching und intelligente Updates

## 📱 Screenshot

![Smart Home Interface](https://via.placeholder.com/400x300/1a1a1a/ffffff?text=Smart+Home+Interface)

## 🚀 Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/example/MMM-SmartThings.git
cd MMM-SmartThings
npm install
```

## ⚙️ Konfiguration

### Basis-Setup

```javascript
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    token: "YOUR_SMARTTHINGS_TOKEN",
    deviceIds: ["device-1", "device-2", "device-3"],
    energyDeviceIds: ["washing-machine", "samsung-tv"]
  }
}
```

### 🔑 Token erstellen

1. **SmartThings Developer Console** öffnen: https://smartthings.developer.samsung.com/workspace/
2. **Personal Access Token** erstellen
3. **Berechtigungen** wählen:
   - `r:devices:*`
   - `r:deviceprofiles:*` 
   - `r:events:*`

### 🔍 Device IDs finden

```bash
# Mit curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices

# Mit PowerShell
Invoke-RestMethod -Uri "https://api.smartthings.com/v1/devices" \
  -Headers @{ "Authorization" = "Bearer YOUR_TOKEN" }
```

## 🎨 Design-Optionen

| Option | Beschreibung | Werte |
|--------|-------------|-------|
| `theme` | Design-Theme | `"default"`, `"dark"`, `"modern"` |
| `layout` | Layout-Richtung | `"vertical"`, `"horizontal"` |
| `compactMode` | Kompakte Darstellung | `true/false` |
| `showIcons` | Device-Icons anzeigen | `true/false` |
| `showEnergyStats` | Energieverbrauch anzeigen | `true/false` |

## ⚡ Energieverbrauch

Das Modul zeigt Energiestatistiken für Samsung-Geräte:

- **Aktuelle Leistung** (W)
- **Energie heute** (kWh)
- **Energie diesen Monat** (kWh)  
- **Energie letzten Monat** (kWh)

### Unterstützte Geräte
- Samsung Waschmaschinen
- Samsung Trockner
- Samsung TVs
- Smart Plugs mit Energiemessung

## 📋 Vollständige Konfiguration

```javascript
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    // ERFORDERLICH
    token: "YOUR_SMARTTHINGS_TOKEN",
    deviceIds: ["device-1", "device-2"],
    
    // ENERGIE-MONITORING
    showEnergyStats: true,
    energyDeviceIds: ["energy-device-1"],
    
    // ANZEIGE
    showIcons: true,
    showLastUpdate: true,
    maxDevices: 10,
    
    // DESIGN
    layout: "vertical",        // "vertical", "horizontal"
    theme: "modern",           // "default", "dark", "modern"  
    compactMode: false,
    
    // PERFORMANCE
    updateInterval: 60000,     // 1 Minute
    debug: false
  }
}
```

## 🎭 Themes

### Default Theme
- **Transparent** mit Glasmorphismus
- **Blaue Akzente** und sanfte Übergänge
- **Perfekt** für helle Spiegel

### Dark Theme  
- **Dunkler Hintergrund** für besseren Kontrast
- **Reduzierte Transparenz**
- **Ideal** für dunkle Umgebungen

### Modern Theme
- **Gradient-Hintergründe**
- **Erweiterte Glaseffekte** 
- **Premium Look** mit besonderen Akzenten

## 🔧 Beispiel-Konfigurationen

### Kompakt für wenig Platz
```javascript
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
}
```

### Energie-fokussiert
```javascript
{
  module: "MMM-SmartThings", 
  position: "middle_center",
  header: "Energieverbrauch",
  config: {
    token: "YOUR_TOKEN",
    deviceIds: ["washer", "dryer", "tv"],
    energyDeviceIds: ["washer", "dryer", "tv"],
    theme: "modern",
    showEnergyStats: true,
    maxDevices: 5
  }
}
```

## 🐛 Debugging

Debug-Modus aktivieren:
```javascript
config: {
  debug: true
}
```

Browser-Konsole öffnen für detaillierte Logs:
- Browser F12 → Console
- Logs beginnen mit `[MMM-SmartThings]`

## 🚀 Performance

- **Intelligentes Caching** (1 Minute TTL)
- **Optimierte API-Calls** mit Retry-Logic
- **Minimale Speichernutzung**
- **Responsive Updates** nur bei Änderungen

## 🔗 Unterstützte Geräte

| Typ | Samsung SmartThings Support |
|-----|---------------------------|
| **Waschmaschinen** | ✅ Vollständig (Status + Energie) |
| **Trockner** | ✅ Vollständig (Status + Energie) |
| **TVs** | ✅ Vollständig (Status + Energie) |
| **Smart Switches** | ✅ Status |
| **Sensoren** | ✅ Status (Temperatur, Kontakt, Bewegung) |
| **Smart Plugs** | ✅ Status + Energie |

## 📝 Changelog

### v2.0.0 (Aktuell)
- ✨ Minimalistisches UI-Design
- ✨ Energieverbrauch-Anzeige  
- ✨ 3 moderne Design-Themes
- ✨ Verbesserte Samsung-Geräte-Unterstützung
- ⚡ Performance-Optimierungen
- 🐛 Bug-Fixes und Stabilität

## 🆘 Häufige Probleme

**Module lädt nicht?**
- Token und Device IDs prüfen
- MagicMirror Logs checken: `pm2 logs mm`

**Keine Energie-Daten?**
- `energyDeviceIds` konfigurieren
- Gerät muss `powerConsumptionReport` unterstützen

**Device IDs finden?**
- SmartThings API direkt abfragen (siehe oben)
- Debug-Modus aktivieren für Details

## 📄 Lizenz

MIT License - siehe [LICENSE.md](LICENSE.md)

## 🤝 Beitragen

Issues und Pull Requests sind willkommen!

1. Fork das Repository
2. Feature Branch erstellen
3. Änderungen commiten  
4. Pull Request erstellen

---

*Entwickelt für MagicMirror² mit ❤️*