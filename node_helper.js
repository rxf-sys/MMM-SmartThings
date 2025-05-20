const NodeHelper = require("node_helper");
const axios = require("axios");
const https = require("https");

// SSL/TLS Zertifikat-Fix für Windows/Corporate Environments
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // NUR für Development - in Production sollte das true sein
  secureProtocol: 'TLSv1_2_method',
  ciphers: 'ALL'
});

// Axios Default-Konfiguration mit SSL-Fix
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 30000; // 30 Sekunden Timeout

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-SmartThings] Node Helper gestartet");
    this.powerHistory = {};
    this.deviceStates = {};
    
    // Performance-Optimierungen
    this.cache = {
      deviceData: new Map(),
      lastUpdate: new Map(),
      ttl: 30000 // 30 Sekunden Cache TTL
    };
    
    // Debug-System
    this.debug = {
      enabled: false,
      performance: new Map(),
      apiCalls: [],
      memoryUsage: []
    };
    
    // Memory Management
    this.memoryCleanupInterval = setInterval(() => {
      this.cleanupMemory();
    }, 600000); // 10 Minuten
    
    // Performance Monitoring
    this.performanceCleanupInterval = setInterval(() => {
      this.cleanupPerformanceData();
    }, 3600000); // 1 Stunde
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "GET_DEVICE_DATA":
        this.getSmartThingsData(payload);
        break;
      case "GET_POWER_HISTORY":
        this.getPowerHistory(payload);
        break;
      case "ENABLE_DEBUG":
        this.enableDebugMode(payload.enabled);
        break;
      case "GET_DEBUG_DATA":
        this.sendSocketNotification("DEBUG_DATA", this.getDebugData());
        break;
      case "CLEAR_CACHE":
        this.clearCache();
        break;
    }
  },

  async getSmartThingsData(config) {
    const startTime = Date.now();
    this.debugLog("🚀 Starting SmartThings data fetch", { deviceCount: config.deviceIds.length });
    
    try {
      // Debug Mode aktivieren falls konfiguriert
      if (config.debug) {
        this.enableDebugMode(true);
      }
      
      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      // Cache-Check
      const cacheKey = `devices_${config.deviceIds.join('_')}`;
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        this.debugLog("📦 Using cached device data", { cacheAge: Date.now() - this.cache.lastUpdate.get(cacheKey) });
        this.sendSocketNotification("DEVICE_DATA", { devices: cachedData });
        return;
      }

      // Performance Monitoring Start
      this.debug.performance.set(`fetch_${Date.now()}`, {
        operation: 'device_fetch',
        startTime,
        deviceCount: config.deviceIds.length
      });

      // Alle konfigurierten Geräte abrufen
      const deviceDetails = await Promise.all(
        config.deviceIds.map(async (deviceId, index) => {
          try {
            // Request Delay für Rate Limiting
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Geräte-Info abrufen mit Retry-Logik
            const deviceResponse = await this.apiCallWithRetry(
              `https://api.smartthings.com/v1/devices/${deviceId}`, 
              headers,
              `device_info_${deviceId}`
            );
            
            // Status abrufen mit Retry-Logik
            const statusResponse = await this.apiCallWithRetry(
              `https://api.smartthings.com/v1/devices/${deviceId}/status`, 
              headers,
              `device_status_${deviceId}`
            );

            const device = {
              deviceId: deviceId,
              name: deviceResponse.data.label || deviceResponse.data.name,
              type: deviceResponse.data.deviceTypeName,
              components: statusResponse.data.components,
              lastUpdate: new Date().toISOString()
            };

            // Benachrichtigungen prüfen
            this.checkNotifications(device, config.notifications);

            this.debugLog(`✅ Device fetched: ${device.name}`, { 
              deviceId, 
              type: device.type,
              components: Object.keys(device.components?.main || {})
            });

            return device;
          } catch (error) {
            this.debugLog(`❌ Error fetching device ${deviceId}:`, error.message);
            console.error(`[MMM-SmartThings] Fehler bei Gerät ${deviceId}:`, error.message);
            return null;
          }
        })
      );

      // Null-Werte herausfiltern
      const validDevices = deviceDetails.filter(device => device !== null);
      
      // Cache speichern
      this.setCachedData(cacheKey, validDevices);
      
      // Performance Monitoring Ende
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.debug.performance.set(`fetch_${startTime}`, {
        ...this.debug.performance.get(`fetch_${startTime}`),
        endTime,
        duration,
        successCount: validDevices.length,
        errorCount: config.deviceIds.length - validDevices.length
      });

      this.debugLog("🎉 SmartThings data fetch completed", {
        duration: `${duration}ms`,
        successCount: validDevices.length,
        totalRequested: config.deviceIds.length,
        cacheStored: true
      });

      this.sendSocketNotification("DEVICE_DATA", {
        devices: validDevices,
        performance: {
          duration,
          cacheHit: false,
          deviceCount: validDevices.length
        }
      });

    } catch (error) {
      this.debugLog("💥 Critical error in getSmartThingsData:", error);
      console.error("[MMM-SmartThings] Fehler beim Abrufen der Gerätedaten:", error.message);
      this.sendSocketNotification("ERROR", {
        message: `Fehler beim Abrufen der Daten: ${error.message}`,
        timestamp: new Date().toISOString(),
        operation: 'getSmartThingsData'
      });
    }
  },

  async getPowerHistory(config) {
    try {
      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const historyData = {};
      const now = new Date();
      const startTime = new Date(now.getTime() - (config.hours * 60 * 60 * 1000));

      for (const deviceId of config.deviceIds) {
        try {
          // Power-History für die letzten X Stunden abrufen
          const historyResponse = await axios.get(
            `https://api.smartthings.com/v1/devices/${deviceId}/events`,
            {
              headers,
              params: {
                capability: 'powerMeter',
                attribute: 'power',
                startTime: startTime.toISOString(),
                endTime: now.toISOString(),
                max: 200
              }
            }
          );

          const events = historyResponse.data.events || [];
          
          if (events.length > 0) {
            // Daten für Chart aufbereiten
            const timestamps = events.map(event => 
              new Date(event.date).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
              })
            ).reverse();
            
            const values = events.map(event => 
              parseFloat(event.value) || 0
            ).reverse();

            historyData[deviceId] = {
              timestamps,
              values
            };
          }
        } catch (error) {
          console.error(`[MMM-SmartThings] Fehler bei Power-History für ${deviceId}:`, error.message);
        }
      }

      this.sendSocketNotification("POWER_HISTORY", historyData);

    } catch (error) {
      console.error("[MMM-SmartThings] Fehler beim Abrufen der Power-History:", error.message);
    }
  },

  checkNotifications(device, notificationConfig) {
    if (!notificationConfig.enabled) return;

    const deviceId = device.deviceId;
    const main = device.components?.main || {};
    const previousState = this.deviceStates[deviceId] || {};

    // Aktuellen Status speichern
    this.deviceStates[deviceId] = {
      switch: main.switch?.switch?.value,
      washerOperatingState: main.washerOperatingState?.machineState?.value,
      dryerOperatingState: main.dryerOperatingState?.machineState?.value,
      battery: main.battery?.battery?.value,
      contact: main.contactSensor?.contact?.value,
      lastCheck: new Date()
    };

    const currentState = this.deviceStates[deviceId];

    // Waschmaschinen-Benachrichtigungen
    if (notificationConfig.washingMachine && 
        main.washerOperatingState && 
        previousState.washerOperatingState !== currentState.washerOperatingState) {
      
      if (currentState.washerOperatingState === 'none' && 
          previousState.washerOperatingState === 'run') {
        this.sendSocketNotification("NOTIFICATION", {
          type: "washing_done",
          deviceName: device.name,
          message: `${device.name} ist fertig!`
        });
      }
    }

    // Trockner-Benachrichtigungen  
    if (notificationConfig.dryer && 
        main.dryerOperatingState && 
        previousState.dryerOperatingState !== currentState.dryerOperatingState) {
      
      if (currentState.dryerOperatingState === 'none' && 
          previousState.dryerOperatingState === 'run') {
        this.sendSocketNotification("NOTIFICATION", {
          type: "dryer_done",
          deviceName: device.name,
          message: `${device.name} ist fertig!`
        });
      }
    }

    // Batterie-Benachrichtigungen
    if (notificationConfig.lowBattery && 
        main.battery && 
        currentState.battery < 20 && 
        (!previousState.battery || previousState.battery >= 20)) {
      
      this.sendSocketNotification("NOTIFICATION", {
        type: "low_battery",
        deviceName: device.name,
        message: `Niedrige Batterie bei ${device.name}: ${currentState.battery}%`
      });
    }

    // Tür/Fenster-Benachrichtigungen
    if (notificationConfig.doorOpen && 
        main.contactSensor && 
        currentState.contact === 'open' && 
        previousState.contact === 'closed') {
      
      this.sendSocketNotification("NOTIFICATION", {
        type: "door_open",
        deviceName: device.name,
        message: `${device.name} wurde geöffnet`
      });
    }
  },

  // Hilfsfunktion für API-Aufrufe mit Retry-Logik und Exponential Backoff
  async apiCallWithRetry(url, headers, operationId = '', retries = 3) {
    const startTime = Date.now();
    
    // SSL-sichere Axios-Konfiguration
    const axiosConfig = {
      headers,
      timeout: 30000, // 30 Sekunden
      httpsAgent: httpsAgent,
      // Zusätzliche SSL-Optionen für problematische Umgebungen
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    };
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        this.debugLog(`🌐 API Call Attempt ${attempt + 1}/${retries}`, { url, operationId });
        
        const response = await axios.get(url, axiosConfig);
        
        // API Call Statistiken
        const duration = Date.now() - startTime;
        this.debug.apiCalls.push({
          url,
          operationId,
          attempt: attempt + 1,
          success: true,
          duration,
          timestamp: new Date().toISOString(),
          statusCode: response.status
        });
        
        this.debugLog(`✅ API Call successful`, { operationId, duration: `${duration}ms`, attempt: attempt + 1 });
        return response;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const isLastAttempt = attempt === retries - 1;
        
        // Spezielle Behandlung für SSL-Fehler
        if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || 
            error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
            error.message?.includes('certificate')) {
          
          console.warn(`[MMM-SmartThings] SSL-Zertifikatsproblem erkannt. Versuche alternative Konfiguration...`);
          
          // Alternative Axios-Konfiguration mit zusätzlichen SSL-Fixes
          axiosConfig.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined,
            secureProtocol: 'TLSv1_2_method'
          });
        }
        
        // API Call Fehler-Statistiken
        this.debug.apiCalls.push({
          url,
          operationId,
          attempt: attempt + 1,
          success: false,
          duration,
          timestamp: new Date().toISOString(),
          error: error.message,
          errorCode: error.code,
          statusCode: error.response?.status || 0
        });
        
        this.debugLog(`❌ API Call failed`, { 
          operationId, 
          attempt: attempt + 1, 
          error: error.message,
          errorCode: error.code,
          statusCode: error.response?.status,
          isLastAttempt
        });
        
        if (isLastAttempt) {
          // Bessere Fehlermeldung für SSL-Probleme
          if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            throw new Error(`SSL-Zertifikatsproblem: ${error.message}. Versuchen Sie NODE_TLS_REJECT_UNAUTHORIZED=0 oder aktualisieren Sie Node.js.`);
          }
          throw error;
        }
        
        // Exponentieller Backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Max 10s
        this.debugLog(`⏳ Retrying in ${delay}ms`, { operationId, nextAttempt: attempt + 2 });
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
    
    // Cache abgelaufen
    this.cache.deviceData.delete(key);
    this.cache.lastUpdate.delete(key);
    return null;
  },
  
  setCachedData(key, data) {
    this.cache.deviceData.set(key, data);
    this.cache.lastUpdate.set(key, Date.now());
    this.debugLog("💾 Data cached", { key, dataSize: JSON.stringify(data).length });
  },
  
  clearCache() {
    const cacheSize = this.cache.deviceData.size;
    this.cache.deviceData.clear();
    this.cache.lastUpdate.clear();
    this.debugLog("🗑️ Cache cleared", { previousSize: cacheSize });
  },

  // Debug-System
  enableDebugMode(enabled) {
    this.debug.enabled = enabled;
    console.log(`[MMM-SmartThings] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      this.debugLog("🐛 Debug mode activated", {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      });
    }
  },
  
  debugLog(message, data = {}) {
    if (!this.debug.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data,
      memory: process.memoryUsage()
    };
    
    console.log(`[MMM-SmartThings DEBUG] ${timestamp} - ${message}`, data);
    
    // Debug-Log in Memory speichern (begrenzt auf 100 Einträge)
    if (!this.debug.logs) this.debug.logs = [];
    this.debug.logs.push(logEntry);
    if (this.debug.logs.length > 100) {
      this.debug.logs.shift();
    }
  },
  
  getDebugData() {
    const memoryUsage = process.memoryUsage();
    
    return {
      enabled: this.debug.enabled,
      memory: {
        current: memoryUsage,
        history: this.debug.memoryUsage.slice(-10) // Letzte 10 Messungen
      },
      performance: Array.from(this.debug.performance.values()).slice(-10),
      apiCalls: this.debug.apiCalls.slice(-20), // Letzte 20 API Calls
      cache: {
        size: this.cache.deviceData.size,
        keys: Array.from(this.cache.deviceData.keys()),
        ttl: this.cache.ttl
      },
      logs: this.debug.logs ? this.debug.logs.slice(-20) : [] // Letzte 20 Log-Einträge
    };
  },

  // Memory Management
  cleanupMemory() {
    const beforeMemory = process.memoryUsage();
    
    // Alte Performance-Daten löschen (älter als 1 Stunde)
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, data] of this.debug.performance.entries()) {
      if (data.startTime < oneHourAgo) {
        this.debug.performance.delete(key);
      }
    }
    
    // Alte API-Call-Daten löschen (mehr als 100 Einträge)
    if (this.debug.apiCalls.length > 100) {
      this.debug.apiCalls = this.debug.apiCalls.slice(-50);
    }
    
    // Device States cleanup (älter als 48h)
    this.cleanupOldData();
    
    // Memory Usage tracking
    const afterMemory = process.memoryUsage();
    this.debug.memoryUsage.push({
      timestamp: new Date().toISOString(),
      before: beforeMemory,
      after: afterMemory,
      freed: beforeMemory.heapUsed - afterMemory.heapUsed
    });
    
    // Memory Usage History begrenzen
    if (this.debug.memoryUsage.length > 50) {
      this.debug.memoryUsage = this.debug.memoryUsage.slice(-25);
    }
    
    this.debugLog("🧹 Memory cleanup completed", {
      memoryFreed: beforeMemory.heapUsed - afterMemory.heapUsed,
      performanceEntriesRemoved: this.debug.performance.size,
      currentMemory: afterMemory
    });
    
    // Garbage Collection forcieren falls verfügbar
    if (global.gc) {
      global.gc();
      this.debugLog("🗑️ Garbage collection triggered");
    }
  },
  
  cleanupPerformanceData() {
    const beforeSize = this.debug.performance.size + this.debug.apiCalls.length;
    
    // Performance-Daten älter als 4 Stunden löschen
    const fourHoursAgo = Date.now() - 14400000;
    for (const [key, data] of this.debug.performance.entries()) {
      if (data.startTime < fourHoursAgo) {
        this.debug.performance.delete(key);
      }
    }
    
    // API-Call-Historie auf 50 Einträge begrenzen
    if (this.debug.apiCalls.length > 50) {
      this.debug.apiCalls = this.debug.apiCalls.slice(-50);
    }
    
    const afterSize = this.debug.performance.size + this.debug.apiCalls.length;
    
    this.debugLog("📊 Performance data cleanup", {
      entriesRemoved: beforeSize - afterSize,
      remainingEntries: afterSize
    });
  },
});