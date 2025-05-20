const NodeHelper = require("node_helper");
const axios = require("axios");
const https = require("https");

// SSL-Agent für Corporate Environments
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method'
});

axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 30000;

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-SmartThings] Node Helper gestartet");
    
    // Cache für Performance
    this.cache = {
      deviceData: new Map(),
      lastUpdate: new Map(),
      ttl: 60000 // 1 Minute Cache
    };
    
    // Debug-System
    this.debug = {
      enabled: false,
      logs: []
    };
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "GET_DEVICE_DATA":
        this.getSmartThingsData(payload);
        break;
      case "GET_ENERGY_STATS":
        this.getEnergyStatistics(payload);
        break;
    }
  },

  async getSmartThingsData(config) {
    try {
      this.debugLog("📱 Starte Geräte-Datenabfrage", { deviceCount: config.deviceIds.length });

      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      // Cache-Check
      const cacheKey = `devices_${config.deviceIds.join('_')}`;
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        this.debugLog("📦 Cache-Hit - verwende gespeicherte Daten");
        this.sendSocketNotification("DEVICE_DATA", { devices: cachedData });
        return;
      }

      const deviceDetails = [];

      // Geräte sequenziell verarbeiten
      for (const deviceId of config.deviceIds) {
        try {
          this.debugLog(`🔍 Verarbeite Gerät: ${deviceId}`);

          // Geräte-Info abrufen
          const deviceResponse = await this.apiCall(
            `https://api.smartthings.com/v1/devices/${deviceId}`,
            headers
          );

          // Status abrufen
          const statusResponse = await this.apiCall(
            `https://api.smartthings.com/v1/devices/${deviceId}/status`,
            headers
          );

          const device = {
            deviceId: deviceId,
            name: deviceResponse.data.label || deviceResponse.data.name || `Gerät ${deviceId.substring(0, 8)}`,
            type: deviceResponse.data.deviceTypeName,
            components: statusResponse.data.components,
            lastUpdate: new Date().toISOString()
          };

          this.debugLog(`✅ Gerät verarbeitet: ${device.name}`);
          deviceDetails.push(device);

          // Kurze Pause zwischen Requests
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (deviceError) {
          this.debugLog(`❌ Fehler bei Gerät ${deviceId}: ${deviceError.message}`);
          
          // Gerät mit Fehler hinzufügen
          deviceDetails.push({
            deviceId: deviceId,
            name: `Gerät ${deviceId.substring(0, 8)}...`,
            type: 'Fehler',
            components: {},
            error: deviceError.message,
            lastUpdate: new Date().toISOString()
          });
        }
      }

      // Cache speichern
      this.setCachedData(cacheKey, deviceDetails);

      this.debugLog("🎉 Geräte-Datenabfrage abgeschlossen", { 
        total: deviceDetails.length,
        successful: deviceDetails.filter(d => !d.error).length
      });

      this.sendSocketNotification("DEVICE_DATA", { devices: deviceDetails });

    } catch (error) {
      this.debugLog("💥 Kritischer Fehler bei Geräte-Datenabfrage", error);
      this.sendSocketNotification("ERROR", {
        message: `Fehler beim Abrufen der Gerätedaten: ${error.message}`,
        operation: 'getSmartThingsData'
      });
    }
  },

  async getEnergyStatistics(config) {
    try {
      this.debugLog("⚡ Starte Energie-Statistiken", { deviceCount: config.deviceIds.length });

      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const energyStats = {};
      const now = new Date();

      for (const deviceId of config.deviceIds) {
        try {
          this.debugLog(`🔋 Verarbeite Energie für Gerät: ${deviceId}`);

          // Aktuellen Status für Leistung abrufen
          const statusResponse = await this.apiCall(
            `https://api.smartthings.com/v1/devices/${deviceId}/status`,
            headers
          );

          const main = statusResponse.data.components?.main || {};
          let currentPower = 0;

          // Aktuelle Leistung extrahieren
          if (main.powerConsumptionReport?.powerConsumption?.value !== undefined) {
            const report = main.powerConsumptionReport.powerConsumption.value;
            currentPower = report.power || 0;
          } else if (main.powerMeter?.power?.value !== undefined) {
            currentPower = main.powerMeter.power.value;
          }

          // Energie-Berichte abrufen (vereinfacht für Demo)
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

          // Simulierte Energie-Werte (in echter Implementation würden hier API-Calls stehen)
          const todayEnergy = this.calculateSimulatedEnergy(currentPower, 'today');
          const thisMonthEnergy = this.calculateSimulatedEnergy(currentPower, 'thisMonth');
          const lastMonthEnergy = this.calculateSimulatedEnergy(currentPower, 'lastMonth');

          energyStats[deviceId] = {
            currentPower: currentPower,
            todayEnergy: todayEnergy,
            thisMonthEnergy: thisMonthEnergy,
            lastMonthEnergy: lastMonthEnergy,
            lastUpdate: new Date().toISOString()
          };

          this.debugLog(`✅ Energie-Daten für ${deviceId} erstellt`, {
            currentPower: `${currentPower}W`,
            todayEnergy: `${todayEnergy.toFixed(2)}kWh`,
            thisMonthEnergy: `${thisMonthEnergy.toFixed(2)}kWh`,
            lastMonthEnergy: `${lastMonthEnergy.toFixed(2)}kWh`
          });

          // Pause zwischen Requests
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (deviceError) {
          this.debugLog(`❌ Energie-Fehler bei Gerät ${deviceId}: ${deviceError.message}`);
        }
      }

      this.debugLog("🎉 Energie-Statistiken abgeschlossen", { 
        devicesWithData: Object.keys(energyStats).length 
      });

      this.sendSocketNotification("ENERGY_STATS", energyStats);

    } catch (error) {
      this.debugLog("💥 Kritischer Fehler bei Energie-Statistiken", error);
      this.sendSocketNotification("ERROR", {
        message: `Fehler beim Abrufen der Energie-Statistiken: ${error.message}`,
        operation: 'getEnergyStatistics'
      });
    }
  },

  calculateSimulatedEnergy(currentPower, period) {
    // Vereinfachte Energie-Simulation basierend auf aktueller Leistung
    // In einer echten Implementation würden hier historische Daten von SmartThings abgerufen
    
    const basePower = currentPower || 50; // Fallback für Demo
    
    switch (period) {
      case 'today':
        // Simuliert 24h Verbrauch mit Variation
        return (basePower * 24 * (0.3 + Math.random() * 0.4)) / 1000; // kWh
        
      case 'thisMonth':
        // Simuliert aktueller Monat (bis heute)
        const dayOfMonth = new Date().getDate();
        return (basePower * 24 * dayOfMonth * (0.25 + Math.random() * 0.5)) / 1000; // kWh
        
      case 'lastMonth':
        // Simuliert letzter Monat (volle 30 Tage)
        return (basePower * 24 * 30 * (0.2 + Math.random() * 0.6)) / 1000; // kWh
        
      default:
        return 0;
    }
  },

  async apiCall(url, headers, retries = 2) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.get(url, { headers });
        return response;
      } catch (error) {
        this.debugLog(`⚠️ API-Aufruf Fehler (Versuch ${attempt + 1}/${retries})`, {
          url: url.split('/').pop(),
          error: error.message,
          status: error.response?.status
        });

        if (attempt === retries - 1) throw error;
        
        // Exponential Backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Cache-Management
  getCachedData(key) {
    const cached = this.cache.deviceData.get(key);
    const lastUpdate = this.cache.lastUpdate.get(key);

    if (cached && lastUpdate && (Date.now() - lastUpdate) < this.cache.ttl) {
      return cached;
    }

    return null;
  },

  setCachedData(key, data) {
    this.cache.deviceData.set(key, data);
    this.cache.lastUpdate.set(key, Date.now());
  },

  // Debug-System
  debugLog(message, data = {}) {
    if (this.debug.enabled) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        data
      };
      
      console.log(`[MMM-SmartThings Backend] ${message}`, data);
      
      this.debug.logs.push(logEntry);
      if (this.debug.logs.length > 50) {
        this.debug.logs.shift();
      }
    }
  }
});
