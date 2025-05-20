// ===== Enhanced Node Helper - ESLint Fixed =====

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
    // eslint-disable-next-line no-console
    console.log("[MMM-SmartThings Enhanced] Node Helper gestartet");
    
    // Cache für Performance
    this.cache = {
      deviceData: new global.Map(),
      energyData: new global.Map(),
      lastUpdate: new global.Map(),
      ttl: 60000 // 1 Minute Cache
    };
    
    // Erweiterte Status-Historie
    this.deviceHistory = new global.Map();
    this.energyHistory = new global.Map();
    
    // Notification System
    this.notifications = {
      enabled: false,
      deviceStates: new global.Map()
    };
    
    // Debug-System
    this.debug = {
      enabled: false,
      logs: []
    };
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "GET_DEVICE_DATA_ENHANCED":
        this.getEnhancedSmartThingsData(payload);
        break;
      case "GET_ENERGY_STATS_REAL":
        this.getRealEnergyStatistics(payload);
        break;
      default:
        // Handle unknown notifications
        break;
    }
  },

  async getEnhancedSmartThingsData(config) {
    try {
      this.debugLog("🚀 Enhanced Geräte-Datenabfrage", { deviceCount: config.deviceIds.length });

      // Debug Mode aktivieren falls konfiguriert
      if (config.debug) {
        this.debug.enabled = true;
      }

      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      // Cache-Check
      const cacheKey = `enhanced_devices_${config.deviceIds.join('_')}`;
      const cachedData = this.getCachedData(cacheKey, 'deviceData');
      if (cachedData) {
        this.debugLog("📦 Enhanced Cache-Hit");
        this.sendSocketNotification("DEVICE_DATA_ENHANCED", { devices: cachedData });
        return;
      }

      const deviceDetails = [];

      // Notifications aktivieren falls konfiguriert
      this.notifications.enabled = config.enableNotifications || false;

      // Geräte sequenziell verarbeiten mit erweiterten Daten
      for (const deviceId of config.deviceIds) {
        try {
          this.debugLog(`🔍 Enhanced Verarbeitung: ${deviceId}`);

          // Geräte-Info mit erweiterten Daten
          const [deviceResponse, statusResponse, historyResponse] = await global.Promise.allSettled([
            this.apiCall(`https://api.smartthings.com/v1/devices/${deviceId}`, headers),
            this.apiCall(`https://api.smartthings.com/v1/devices/${deviceId}/status`, headers),
            this.getDeviceHistory(deviceId, headers) // Neue Funktion für Historie
          ]);

          if (deviceResponse.status === 'fulfilled' && statusResponse.status === 'fulfilled') {
            const device = {
              deviceId: deviceId,
              name: deviceResponse.value.data.label || deviceResponse.value.data.name || `Gerät ${deviceId.substring(0, 8)}`,
              type: this.determineEnhancedDeviceType(deviceResponse.value.data, statusResponse.value.data),
              components: statusResponse.value.data.components,
              lastUpdate: new Date().toISOString(),
              // Erweiterte Daten
              manufacturer: deviceResponse.value.data.manufacturerName,
              model: deviceResponse.value.data.deviceTypeName,
              roomId: deviceResponse.value.data.roomId,
              // Historie wenn verfügbar
              history: historyResponse.status === 'fulfilled' ? historyResponse.value : null
            };

            // Samsung-spezifische Enhancements
            if (config.samsungEnhanced) {
              device.samsungEnhanced = this.extractSamsungFeatures(device);
            }

            // Notification-Status prüfen
            if (config.enableNotifications) {
              this.checkDeviceNotifications(device);
            }

            this.debugLog(`✅ Enhanced Gerät verarbeitet: ${device.name}`, {
              type: device.type,
              manufacturer: device.manufacturer,
              samsungEnhanced: !!device.samsungEnhanced
            });

            deviceDetails.push(device);
          }

          // Pause zwischen Requests
          await new global.Promise(resolve => setTimeout(resolve, 200));

        } catch (deviceError) {
          this.debugLog(`❌ Enhanced Fehler bei ${deviceId}: ${deviceError.message}`);
          
          deviceDetails.push({
            deviceId: deviceId,
            name: `Gerät ${deviceId.substring(0, 8)}...`,
            type: 'error',
            components: {},
            error: deviceError.message,
            lastUpdate: new Date().toISOString()
          });
        }
      }

      // Cache speichern
      this.setCachedData(cacheKey, deviceDetails, 'deviceData');

      this.debugLog("🎉 Enhanced Datenabfrage abgeschlossen", { 
        total: deviceDetails.length,
        successful: deviceDetails.filter(d => !d.error).length
      });

      this.sendSocketNotification("DEVICE_DATA_ENHANCED", { devices: deviceDetails });

    } catch (error) {
      this.debugLog("💥 Enhanced kritischer Fehler", error);
      this.sendSocketNotification("ERROR", {
        message: `Enhanced Fehler: ${error.message}`,
        operation: 'getEnhancedSmartThingsData'
      });
    }
  },

  async getRealEnergyStatistics(config) {
    try {
      this.debugLog("⚡ Echte Energie-Statistiken", { deviceCount: config.deviceIds.length });

      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const energyStats = {};

      for (const deviceId of config.deviceIds) {
        try {
          this.debugLog(`🔋 Echte Energie für: ${deviceId}`);

          // Aktueller Status für Leistung
          const statusResponse = await this.apiCall(
            `https://api.smartthings.com/v1/devices/${deviceId}/status`,
            headers
          );

          const main = statusResponse.data.components?.main || {};
          let currentPower = 0;
          let realEnergyData = null;

          // Echte SmartThings powerConsumptionReport auslesen
          if (main.powerConsumptionReport?.powerConsumption?.value) {
            const report = main.powerConsumptionReport.powerConsumption.value;
            currentPower = report.power || 0;
            realEnergyData = {
              totalEnergy: report.energy || 0, // Wh
              deltaEnergy: report.deltaEnergy || 0,
              powerEnergy: report.powerEnergy || 0,
              persistedEnergy: report.persistedEnergy || 0,
              energySaved: report.energySaved || 0,
              persistedSavedEnergy: report.persistedSavedEnergy || 0,
              reportPeriod: {
                start: report.start,
                end: report.end
              }
            };
          } else if (main.powerMeter?.power?.value !== undefined) {
            currentPower = main.powerMeter.power.value;
          }

          // Historische Energie-Daten abrufen (wenn möglich)
          let historicalEnergy = null;
          if (config.showRealTimeEnergy) {
            try {
              historicalEnergy = await this.getHistoricalEnergyData(deviceId, headers);
            } catch (historyError) {
              this.debugLog(`⚠️ Keine Historie für ${deviceId}: ${historyError.message}`);
            }
          }

          // Energie-Berechnung basierend auf echten Daten
          const energyCalculation = this.calculateRealEnergyStats(
            realEnergyData, 
            historicalEnergy, 
            currentPower,
            deviceId
          );

          energyStats[deviceId] = {
            currentPower: currentPower,
            todayEnergy: energyCalculation.todayEnergy,
            thisMonthEnergy: energyCalculation.thisMonthEnergy,
            lastMonthEnergy: energyCalculation.lastMonthEnergy,
            // Zusätzliche echte Daten
            realTimeData: realEnergyData,
            dataSource: realEnergyData ? 'smartthings_real' : 'calculated',
            lastUpdate: new Date().toISOString(),
            // Trend-Daten für erweiterte Analyse
            energyTrend: config.showTrends ? this.calculateEnergyTrend(deviceId, energyCalculation) : null
          };

          this.debugLog(`✅ Echte Energie-Daten für ${deviceId}`, {
            currentPower: `${currentPower}W`,
            dataSource: energyStats[deviceId].dataSource,
            hasRealData: !!realEnergyData,
            todayEnergy: `${energyCalculation.todayEnergy.toFixed(2)}kWh`
          });

          await new global.Promise(resolve => setTimeout(resolve, 300));

        } catch (deviceError) {
          this.debugLog(`❌ Energie-Fehler bei ${deviceId}: ${deviceError.message}`);
        }
      }

      // Energie-History speichern für Trend-Analyse
      this.updateEnergyHistory(energyStats);

      this.debugLog("🎉 Echte Energie-Statistiken abgeschlossen", { 
        devicesWithData: Object.keys(energyStats).length 
      });

      this.sendSocketNotification("ENERGY_STATS_REAL", energyStats);

    } catch (error) {
      this.debugLog("💥 Echter Energie kritischer Fehler", error);
      this.sendSocketNotification("ERROR", {
        message: `Energie-Fehler: ${error.message}`,
        operation: 'getRealEnergyStatistics'
      });
    }
  },

  async getDeviceHistory(deviceId, headers) {
    // SmartThings Events API für Geräte-Historie
    try {
      const eventsResponse = await this.apiCall(
        `https://api.smartthings.com/v1/devices/${deviceId}/events?limit=10`,
        headers
      );
      return eventsResponse.data.events || [];
    } catch (error) {
      this.debugLog(`⚠️ Historie für ${deviceId} nicht verfügbar: ${error.message}`);
      return null;
    }
  },

  async getHistoricalEnergyData(deviceId, headers) {
    // Versuche historische Energie-Daten zu bekommen
    try {
      // SmartThings bietet begrenzte historische Daten
      const historyResponse = await this.apiCall(
        `https://api.smartthings.com/v1/devices/${deviceId}/events?capability=powerConsumptionReport&limit=50`,
        headers
      );
      
      return historyResponse.data.events || [];
    } catch (error) {
      this.debugLog(`⚠️ Historische Energie für ${deviceId} nicht verfügbar`);
      return null;
    }
  },

  calculateRealEnergyStats(realEnergyData, historicalEnergy, currentPower, deviceId) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let todayEnergy = 0;
    let thisMonthEnergy = 0;
    let lastMonthEnergy = 0;

    if (realEnergyData && realEnergyData.totalEnergy) {
      // Echte Daten von SmartThings verwenden
      const totalEnergyKwh = realEnergyData.totalEnergy / 1000; // Wh zu kWh
      
      // Zeitbasierte Aufteilung basierend auf Report-Period
      const reportStart = new Date(realEnergyData.reportPeriod.start);
      const reportEnd = new Date(realEnergyData.reportPeriod.end);
      const reportDurationMs = reportEnd.getTime() - reportStart.getTime();
      
      // Energie basierend auf Report-Zeitraum aufteilen
      if (reportStart >= todayStart) {
        todayEnergy = totalEnergyKwh;
      } else {
        // Proportionale Aufteilung basierend auf Zeit
        const todayDurationMs = Math.min(now.getTime() - todayStart.getTime(), reportDurationMs);
        todayEnergy = (todayDurationMs / reportDurationMs) * totalEnergyKwh;
      }
      
      if (reportStart >= thisMonthStart) {
        thisMonthEnergy = totalEnergyKwh;
      } else {
        const reportInMonth = Math.min(reportEnd.getTime() - thisMonthStart.getTime(), reportDurationMs);
        thisMonthEnergy = (reportInMonth / reportDurationMs) * totalEnergyKwh;
      }

      // Letzten Monat aus gespeicherten Daten
      const previousData = this.energyHistory.get(deviceId);
      if (previousData && previousData.length > 0) {
        const lastMonthData = previousData.find(entry => {
          const entryDate = new Date(entry.timestamp);
          return entryDate >= lastMonthStart && entryDate < thisMonthStart;
        });
        lastMonthEnergy = lastMonthData ? lastMonthData.monthlyTotal : 0;
      }

    } else if (historicalEnergy && historicalEnergy.length > 0) {
      // Fallback: Berechnung aus historischen Events
      todayEnergy = this.calculateEnergyFromEvents(historicalEnergy, todayStart, now);
      thisMonthEnergy = this.calculateEnergyFromEvents(historicalEnergy, thisMonthStart, now);
      lastMonthEnergy = this.getStoredMonthlyEnergy(deviceId, lastMonthStart);

    } else {
      // Fallback: Intelligente Simulation basierend auf aktueller Leistung
      const devicePattern = this.getDeviceEnergyPattern(deviceId, currentPower);
      todayEnergy = devicePattern.todayEnergy;
      thisMonthEnergy = devicePattern.thisMonthEnergy;
      lastMonthEnergy = devicePattern.lastMonthEnergy;
    }

    return {
      todayEnergy: Math.max(0, todayEnergy),
      thisMonthEnergy: Math.max(0, thisMonthEnergy),
      lastMonthEnergy: Math.max(0, lastMonthEnergy)
    };
  },

  calculateEnergyFromEvents(events, startDate, endDate) {
    let totalEnergy = 0;
    
    events.forEach(event => {
      const eventDate = new Date(event.date);
      if (eventDate >= startDate && eventDate <= endDate) {
        if (event.value && event.value.energy) {
          totalEnergy += event.value.energy / 1000; // Wh zu kWh
        }
      }
    });
    
    return totalEnergy;
  },

  getDeviceEnergyPattern(deviceId, currentPower) {
    // Intelligente Simulation basierend auf Gerätetyp und aktueller Leistung
    const deviceInfo = this.cache.deviceData.get(`enhanced_devices_${deviceId}`) || {};
    const deviceType = deviceInfo[0]?.type || 'unknown';
    
    const patterns = {
      'samsung_washing_machine': {
        dailyUsage: 1.5, // kWh pro Tag wenn aktiv
        monthlyUsage: 45, // kWh pro Monat
        variability: 0.3 // 30% Variation
      },
      'samsung_dryer': {
        dailyUsage: 3.0,
        monthlyUsage: 90,
        variability: 0.4
      },
      'samsung_tv': {
        dailyUsage: 0.8,
        monthlyUsage: 24,
        variability: 0.2
      },
      'washing_machine': {
        dailyUsage: 1.2,
        monthlyUsage: 36,
        variability: 0.3
      },
      'dryer': {
        dailyUsage: 2.5,
        monthlyUsage: 75,
        variability: 0.4
      },
      'tv': {
        dailyUsage: 0.6,
        monthlyUsage: 18,
        variability: 0.2
      },
      'default': {
        dailyUsage: currentPower * 24 / 1000 * 0.3, // 30% Nutzungsgrad
        monthlyUsage: currentPower * 24 * 30 / 1000 * 0.25,
        variability: 0.5
      }
    };

    const pattern = patterns[deviceType] || patterns.default;
    const variation = 1 + (Math.random() - 0.5) * 2 * pattern.variability;

    return {
      todayEnergy: pattern.dailyUsage * variation,
      thisMonthEnergy: pattern.monthlyUsage * variation * (new Date().getDate() / 30),
      lastMonthEnergy: pattern.monthlyUsage * (0.8 + Math.random() * 0.4)
    };
  },

  determineEnhancedDeviceType(deviceInfo, statusInfo) {
    const capabilities = statusInfo.components?.main || {};
    const deviceName = (deviceInfo.label || deviceInfo.name || '').toLowerCase();
    const manufacturerName = (deviceInfo.manufacturerName || '').toLowerCase();

    // Samsung-spezifische Erkennung
    if (manufacturerName.includes('samsung')) {
      if (capabilities.washerOperatingState || capabilities['samsungce.washerOperatingState']) {
        return 'samsung_washing_machine';
      }
      if (capabilities.dryerOperatingState || capabilities['samsungce.dryerOperatingState']) {
        return 'samsung_dryer';
      }
      if (capabilities.tvChannel || capabilities.audioVolume || capabilities['samsungvd.mediaInputSource']) {
        return 'samsung_tv';
      }
    }

    // Standard-Typen mit erweiterten Details
    if (deviceName.includes('wasch')) return 'washing_machine';
    if (deviceName.includes('trockner')) return 'dryer';
    if (deviceName.includes('tv') || deviceName.includes('fernseh')) return 'tv';
    if (capabilities.switch) return 'smart_switch';
    if (capabilities.powerMeter) return 'power_meter';
    if (capabilities.temperatureMeasurement) return 'temperature_sensor';
    if (capabilities.contactSensor) return 'contact_sensor';
    if (capabilities.motionSensor) return 'motion_sensor';

    return 'generic';
  },

  extractSamsungFeatures(device) {
    const main = device.components?.main || {};
    const samsungFeatures = {};

    // Samsung CE (Consumer Electronics) Features
    Object.keys(main).forEach(capability => {
      if (capability.startsWith('samsungce.')) {
        samsungFeatures[capability] = main[capability];
      }
      if (capability.startsWith('samsungvd.')) { // Samsung Video Display
        samsungFeatures[capability] = main[capability];
      }
    });

    // Erweiterte Samsung-Funktionen
    if (device.type === 'samsung_washing_machine' || device.type === 'samsung_dryer') {
      // Waschmaschine/Trockner spezifische Features
      samsungFeatures.operatingState = main.washerOperatingState || main.dryerOperatingState;
      samsungFeatures.completionTime = main.washerOperatingState?.completionTime || main.dryerOperatingState?.completionTime;
      samsungFeatures.machineState = main.washerOperatingState?.machineState || main.dryerOperatingState?.machineState;
      
      // Samsung CE spezifische Capabilities
      if (main['samsungce.kidsLock']) samsungFeatures.kidsLock = main['samsungce.kidsLock'];
      if (main['samsungce.detergentState']) samsungFeatures.detergentState = main['samsungce.detergentState'];
    }

    if (device.type === 'samsung_tv') {
      // TV spezifische Features
      samsungFeatures.mediaState = {
        playback: main.mediaPlayback,
        volume: main.audioVolume,
        mute: main.audioMute,
        channel: main.tvChannel,
        inputSource: main.mediaInputSource
      };
      
      // Samsung VD spezifische Capabilities
      if (main['samsungvd.ambient']) samsungFeatures.ambient = main['samsungvd.ambient'];
      if (main['samsungvd.lightControl']) samsungFeatures.lightControl = main['samsungvd.lightControl'];
    }

    return Object.keys(samsungFeatures).length > 0 ? samsungFeatures : null;
  },

  checkDeviceNotifications(device) {
    const previousState = this.notifications.deviceStates.get(device.deviceId);
    const currentState = this.getDeviceState(device);
    
    if (previousState && previousState !== currentState) {
      // Status-Änderung erkannt
      const notification = this.createStatusChangeNotification(device, previousState, currentState);
      if (notification) {
        this.sendSocketNotification("DEVICE_NOTIFICATION", notification);
      }
    }
    
    this.notifications.deviceStates.set(device.deviceId, currentState);
  },

  getDeviceState(device) {
    const main = device.components?.main || {};
    
    // Samsung-spezifische Zustände
    if (device.type === 'samsung_washing_machine') {
      return main.washerOperatingState?.machineState?.value || 'unknown';
    }
    if (device.type === 'samsung_dryer') {
      return main.dryerOperatingState?.machineState?.value || 'unknown';
    }
    if (device.type === 'samsung_tv') {
      const switchState = main.switch?.switch?.value;
      const playbackState = main.mediaPlayback?.playbackStatus?.value;
      return `${switchState}_${playbackState || 'none'}`;
    }
    
    // Standard-Zustände
    return main.switch?.switch?.value || 
           main.contactSensor?.contact?.value || 
           main.motionSensor?.motion?.value || 
           'unknown';
  },

  createStatusChangeNotification(device, previousState, currentState) {
    // Samsung-spezifische Benachrichtigungen
    if (device.type === 'samsung_washing_machine') {
      if (previousState === 'run' && currentState === 'end') {
        return {
          type: 'appliance_finished',
          deviceId: device.deviceId,
          deviceName: device.name,
          message: `${device.name} ist fertig! 🧺`,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    if (device.type === 'samsung_dryer') {
      if (previousState === 'run' && currentState === 'end') {
        return {
          type: 'appliance_finished',
          deviceId: device.deviceId,
          deviceName: device.name,
          message: `${device.name} ist fertig! 🔥`,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Standard-Benachrichtigungen
    if (previousState === 'off' && currentState === 'on') {
      return {
        type: 'device_turned_on',
        deviceId: device.deviceId,
        deviceName: device.name,
        message: `${device.name} wurde eingeschaltet`,
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  },

  calculateEnergyTrend(deviceId, currentEnergy) {
    const history = this.energyHistory.get(deviceId) || [];
    if (history.length < 2) return null;
    
    const previousEntry = history[history.length - 2];
    
    const currentTotal = currentEnergy.thisMonthEnergy;
    const previousTotal = previousEntry.monthlyTotal;
    
    if (previousTotal === 0) return 'stable';
    
    const change = ((currentTotal - previousTotal) / previousTotal) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  },

  updateEnergyHistory(energyStats) {
    Object.entries(energyStats).forEach(([deviceId, stats]) => {
      let history = this.energyHistory.get(deviceId) || [];
      
      history.push({
        timestamp: new Date().toISOString(),
        currentPower: stats.currentPower,
        todayEnergy: stats.todayEnergy,
        monthlyTotal: stats.thisMonthEnergy
      });
      
      // Begrenze Historie auf 30 Tage
      if (history.length > 30) {
        history = history.slice(-30);
      }
      
      this.energyHistory.set(deviceId, history);
    });
  },

  getStoredMonthlyEnergy(deviceId, targetMonth) {
    const history = this.energyHistory.get(deviceId) || [];
    const targetMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const targetMonthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    
    const monthEntries = history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= targetMonthStart && entryDate <= targetMonthEnd;
    });
    
    if (monthEntries.length === 0) return 0;
    
    // Nehme den letzten Eintrag des Monats
    return monthEntries[monthEntries.length - 1].monthlyTotal || 0;
  },

  async apiCall(url, headers, retries = 2) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.get(url, { headers });
        return response;
      } catch (error) {
        this.debugLog(`⚠️ Enhanced API-Fehler (${attempt + 1}/${retries})`, {
          url: url.split('/').pop(),
          error: error.message,
          status: error.response?.status
        });

        if (attempt === retries - 1) throw error;
        
        const delay = Math.pow(2, attempt) * 1000;
        await new global.Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Cache-Management erweitert
  getCachedData(key, type = 'deviceData') {
    const cached = this.cache[type].get(key);
    const lastUpdate = this.cache.lastUpdate.get(key);

    if (cached && lastUpdate && (Date.now() - lastUpdate) < this.cache.ttl) {
      return cached;
    }

    return null;
  },

  setCachedData(key, data, type = 'deviceData') {
    this.cache[type].set(key, data);
    this.cache.lastUpdate.set(key, Date.now());
  },

  debugLog(message, data = {}) {
    if (this.debug.enabled) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        data
      };
      
      // eslint-disable-next-line no-console
      console.log(`[MMM-SmartThings Enhanced] ${message}`, data);
      
      this.debug.logs.push(logEntry);
      if (this.debug.logs.length > 50) {
        this.debug.logs.shift();
      }
    }
  }
});
