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
      ttl: 120000 // 2 Minuten Cache TTL (erhöht von 30s)
    };

    // Debug-System
    this.debug = {
      enabled: false,
      performance: new Map(),
      apiCalls: [],
      memoryUsage: []
    };

    // Rate Limiting Circuit Breaker
    this.rateLimiter = {
      failures: 0,
      lastFailure: null,
      backoffMultiplier: 1,
      isCircuitOpen: false,
      maxFailures: 3,
      circuitResetTime: 5 * 60 * 1000, // 5 Minuten
      baseDelay: 1000 // 1 Sekunde basis delay
    };

    // Memory Management
    this.memoryCleanupInterval = setInterval(() => {
      this.cleanupMemory();
    }, 600000); // 10 Minuten

    // Performance Monitoring
    this.performanceCleanupInterval = setInterval(() => {
      this.cleanupPerformanceData();
    }, 3600000); // 1 Stunde

    // Rate Limiter Reset Timer
    this.rateLimiterResetInterval = setInterval(() => {
      this.checkRateLimiterReset();
    }, 60000); // Jede Minute prüfen
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

    // Circuit Breaker Check
    if (this.rateLimiter.isCircuitOpen) {
      const timeSinceLastFailure = Date.now() - this.rateLimiter.lastFailure;
      if (timeSinceLastFailure < this.rateLimiter.circuitResetTime) {
        this.debugLog("🚫 Circuit Breaker OPEN - Skipping API calls", {
          failureCount: this.rateLimiter.failures,
          timeUntilReset: this.rateLimiter.circuitResetTime - timeSinceLastFailure
        });

        // Verwende Cache falls verfügbar, oder sende leere Antwort
        const cacheKey = `devices_${config.deviceIds.join('_')}`;
        const cachedData = this.cache.deviceData.get(cacheKey);
        if (cachedData) {
          this.sendSocketNotification("DEVICE_DATA", { devices: cachedData });
        } else {
          this.sendSocketNotification("ERROR", {
            message: `Rate Limit Protection aktiv. Nächster Versuch in ${Math.ceil((this.rateLimiter.circuitResetTime - timeSinceLastFailure) / 1000)}s`,
            timestamp: new Date().toISOString(),
            operation: 'circuit_breaker_protection'
          });
        }
        return;
      } else {
        // Circuit Reset
        this.resetCircuitBreaker();
      }
    }

    try {
      // Debug Mode aktivieren falls konfiguriert
      if (config.debug) {
        this.enableDebugMode(true);
      }

      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      // Cache-Check mit längerer TTL
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

      // AGGRESSIVE RATE LIMITING - Sequentielle Verarbeitung mit langen Delays
      const deviceDetails = [];
      const baseDelay = this.rateLimiter.baseDelay * this.rateLimiter.backoffMultiplier;

      for (let i = 0; i < config.deviceIds.length; i++) {
        const deviceId = config.deviceIds[i];

        try {
          // Aggressive Rate Limiting Delay zwischen Geräten
          if (i > 0) {
            const delay = baseDelay + (i * 500); // Zunehmende Delays: 1s, 1.5s, 2s, etc.
            this.debugLog(`⏳ Rate Limiting Delay: ${delay}ms`, { deviceIndex: i + 1 });
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          this.debugLog(`📱 Processing device ${i + 1}/${config.deviceIds.length}`, { deviceId });

          // Geräte-Info abrufen mit reduzierten Retries
          const deviceResponse = await this.apiCallWithRetry(
            `https://api.smartthings.com/v1/devices/${deviceId}`,
            headers,
            `device_info_${deviceId}`,
            2  // Nur 2 Retries bei Rate Limiting
          );

          // Längerer Delay vor Status-Abfrage
          await new Promise(resolve => setTimeout(resolve, baseDelay));

          // Status abrufen mit reduzierten Retries
          const statusResponse = await this.apiCallWithRetry(
            `https://api.smartthings.com/v1/devices/${deviceId}/status`,
            headers,
            `device_status_${deviceId}`,
            2  // Nur 2 Retries bei Rate Limiting
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

          this.debugLog(`✅ Device processed: ${device.name}`, {
            deviceId,
            type: device.type,
            components: Object.keys(device.components?.main || {})
          });

          deviceDetails.push(device);

          // Erfolg - Reset Rate Limiter Failures
          if (this.rateLimiter.failures > 0) {
            this.rateLimiter.failures = Math.max(0, this.rateLimiter.failures - 1);
            this.debugLog("✅ Rate Limiter failure count reduced", { failures: this.rateLimiter.failures });
          }

        } catch (error) {
          this.debugLog(`❌ Error processing device ${deviceId}:`, error.message);
          console.error(`[MMM-SmartThings] Fehler bei Gerät ${deviceId}:`, error.message);

          // Rate Limiting spezielle Behandlung
          if (error.message.includes('Rate Limit') || error.message.includes('429')) {
            this.handleRateLimitFailure();

            // Bei Rate Limiting: Stoppe weitere Verarbeitung
            this.debugLog("🚫 Rate Limit detected - Stopping further device processing", { devicesSoFar: deviceDetails.length });
            break; // Stoppe die Schleife
          }

          // Gerät mit Fehler-Info hinzufügen
          deviceDetails.push({
            deviceId: deviceId,
            name: `Device ${deviceId.substring(0, 8)}...`,
            type: 'Unknown (Error)',
            components: {},
            error: error.message,
            lastUpdate: new Date().toISOString()
          });
        }
      }

      // Cache speichern mit noch längerer TTL
      this.setCachedData(cacheKey, deviceDetails);

      // Performance Monitoring Ende
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.debug.performance.set(`fetch_${startTime}`, {
        ...this.debug.performance.get(`fetch_${startTime}`),
        endTime,
        duration,
        successCount: deviceDetails.filter(d => !d.error).length,
        errorCount: deviceDetails.filter(d => d.error).length
      });

      this.debugLog("🎉 SmartThings data fetch completed", {
        duration: `${duration}ms`,
        successCount: deviceDetails.filter(d => !d.error).length,
        errorCount: deviceDetails.filter(d => d.error).length,
        totalRequested: config.deviceIds.length,
        cacheStored: true,
        rateLimiterState: this.rateLimiter
      });

      this.sendSocketNotification("DEVICE_DATA", {
        devices: deviceDetails,
        performance: {
          duration,
          cacheHit: false,
          deviceCount: deviceDetails.length
        }
      });

    } catch (error) {
      this.debugLog("💥 Critical error in getSmartThingsData:", error);
      console.error("[MMM-SmartThings] Fehler beim Abrufen der Gerätedaten:", error.message);

      // Rate Limiting Error behandeln
      if (error.message.includes('Rate Limit') || error.message.includes('429')) {
        this.handleRateLimitFailure();
      }

      this.sendSocketNotification("ERROR", {
        message: `Fehler beim Abrufen der Daten: ${error.message}`,
        timestamp: new Date().toISOString(),
        operation: 'getSmartThingsData'
      });
    }
  },

  // FIXED: Neue verbesserte Power History Methode
  async getPowerHistory(config) {
    try {
      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const historyData = {};
      const now = new Date();
      const startTime = new Date(now.getTime() - (config.hours * 60 * 60 * 1000));

      this.debugLog("📊 Starting power history fetch with corrected API endpoints", {
        deviceCount: config.deviceIds.length,
        hours: config.hours,
        startTime: startTime.toISOString(),
        endTime: now.toISOString()
      });

      // Erste Methode: Versuche die corrected History API
      for (const deviceId of config.deviceIds) {
        try {
          this.debugLog(`🔌 Fetching power history for device using history API`, { deviceId });

          // Methode 1: /v1/history/devices endpoint mit korrekten Parametern
          const historyUrl = `https://api.smartthings.com/v1/history/devices?deviceId=${deviceId}&capability=powerMeter&capability=powerConsumptionReport&capability=energyMeter&startTime=${startTime.toISOString()}&endTime=${now.toISOString()}&max=100`;
          
          const historyResponse = await this.apiCallWithRetry(
            historyUrl,
            headers,
            `power_history_v1_${deviceId}`,
            2
          );

          if (historyResponse.data.items && historyResponse.data.items.length > 0) {
            const powerEvents = historyResponse.data.items.filter(item => 
              item.capability === 'powerMeter' || 
              item.capability === 'powerConsumptionReport' ||
              item.capability === 'energyMeter' ||
              (item.attribute && (item.attribute === 'power' || item.attribute === 'energy'))
            );

            this.debugLog(`📈 Found ${powerEvents.length} power history events with v1 API`, {
              deviceId,
              totalEvents: historyResponse.data.items.length,
              powerEvents: powerEvents.length
            });

            if (powerEvents.length > 0) {
              // Daten für Chart aufbereiten
              const timestamps = powerEvents.map(event =>
                new Date(event.date).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              ).reverse();

              const values = powerEvents.map(event => {
                const value = parseFloat(event.value) || 0;
                // Konvertiere verschiedene Einheiten zu Watt
                if (event.unit === 'kW') return value * 1000;
                if (event.unit === 'mW') return value / 1000;
                return value;
              }).reverse();

              historyData[deviceId] = {
                timestamps,
                values,
                unit: 'W',
                capability: powerEvents[0].capability,
                attribute: powerEvents[0].attribute,
                eventCount: powerEvents.length,
                method: 'history_v1_api'
              };

              this.debugLog(`📈 Chart data prepared using history API`, {
                deviceId,
                dataPoints: values.length,
                maxValue: Math.max(...values),
                minValue: Math.min(...values),
                avgValue: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
              });

              continue; // Erfolgreich - nächstes Gerät
            }
          }

          // Methode 2: Fallback - Simuliere Daten basierend auf aktuellen Capabilities
          this.debugLog(`🔄 Trying fallback method: simulate data from current status`, { deviceId });
          
          const statusResponse = await this.apiCallWithRetry(
            `https://api.smartthings.com/v1/devices/${deviceId}/status`,
            headers,
            `device_status_fallback_${deviceId}`,
            1
          );

          if (statusResponse.data.components?.main) {
            const main = statusResponse.data.components.main;
            let currentPower = 0;

            // Extrahiere aktuellen Stromverbrauch
            if (main.powerMeter?.power?.value) {
              currentPower = parseFloat(main.powerMeter.power.value);
            } else if (main.powerConsumptionReport?.power?.value) {
              currentPower = parseFloat(main.powerConsumptionReport.power.value);
            } else if (main.energyMeter?.power?.value) {
              currentPower = parseFloat(main.energyMeter.power.value);
            }

            if (currentPower > 0) {
              // Generiere simulierte historische Daten basierend auf dem aktuellen Wert
              const simulatedDataPoints = 24; // 24 Stunden = 24 Datenpunkte
              const timestamps = [];
              const values = [];

              for (let i = simulatedDataPoints - 1; i >= 0; i--) {
                const time = new Date(Date.now() - (i * 60 * 60 * 1000)); // Jede Stunde
                timestamps.push(time.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                }));

                // Simuliere realistische Variationen (±20%)
                const variation = 0.8 + (Math.random() * 0.4); // 0.8 bis 1.2
                values.push(Math.round(currentPower * variation));
              }

              historyData[deviceId] = {
                timestamps,
                values,
                unit: 'W',
                capability: 'simulated',
                attribute: 'power',
                eventCount: simulatedDataPoints,
                method: 'simulated_from_current',
                note: 'Simulated data based on current power consumption'
              };

              this.debugLog(`📈 Generated simulated power history`, {
                deviceId,
                currentPower,
                dataPoints: simulatedDataPoints,
                avgSimulated: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
              });
            }
          }

        } catch (error) {
          this.debugLog(`❌ Error fetching power history for ${deviceId}:`, error.message);
          console.error(`[MMM-SmartThings] Fehler bei Power-History für ${deviceId}:`, error.message);
        }
      }

      this.debugLog("🎉 Power history fetch completed with corrected methods", {
        devicesWithData: Object.keys(historyData).length,
        totalDataPoints: Object.values(historyData).reduce((sum, data) => sum + data.values.length, 0),
        devices: Object.keys(historyData),
        methods: Object.values(historyData).map(d => d.method)
      });

      this.sendSocketNotification("POWER_HISTORY", historyData);

    } catch (error) {
      this.debugLog("💥 Critical error in getPowerHistory:", error);
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

  // Hilfsfunktion für API-Aufrufe mit Retry-Logik und Rate Limiting
  async apiCallWithRetry(url, headers, operationId = '', retries = 3) {
    const startTime = Date.now();

    // SSL-sichere Axios-Konfiguration
    const axiosConfig = {
      headers,
      timeout: 30000, // 30 Sekunden
      httpsAgent: httpsAgent,
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
        const statusCode = error.response?.status || 0;

        // Rate Limiting (429) spezielle Behandlung
        if (statusCode === 429) {
          const retryAfter = error.response?.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 2) * 1000; // 4s, 8s, 16s

          this.debugLog(`🚦 Rate Limit Hit (429)`, {
            operationId,
            attempt: attempt + 1,
            retryAfter: retryAfter || 'not specified',
            waitTime: `${waitTime}ms`,
            isLastAttempt
          });

          if (!isLastAttempt) {
            this.debugLog(`⏳ Waiting for rate limit reset: ${waitTime}ms`, { operationId });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Nächsten Versuch ohne weitere Verzögerung
          }
        }

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
          statusCode: statusCode,
          isRateLimit: statusCode === 429
        });

        this.debugLog(`❌ API Call failed`, {
          operationId,
          attempt: attempt + 1,
          error: error.message,
          errorCode: error.code,
          statusCode: statusCode,
          isLastAttempt,
          isRateLimit: statusCode === 429
        });

        if (isLastAttempt) {
          // Bessere Fehlermeldung für verschiedene Problemtypen
          if (statusCode === 429) {
            throw new Error(`Rate Limit erreicht (429). Reduzieren Sie updateInterval oder deviceIds. Original: ${error.message}`);
          }
          if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            throw new Error(`SSL-Zertifikatsproblem: ${error.message}. Verwenden Sie NODE_TLS_REJECT_UNAUTHORIZED=0`);
          }
          throw error;
        }

        // Standard Exponentieller Backoff (aber kürzer für Rate Limiting)
        const delay = statusCode === 429 ?
          Math.min(Math.pow(2, attempt + 1) * 500, 5000) :  // Rate Limit: 1s, 2s, 4s (max 5s)
          Math.min(Math.pow(2, attempt) * 1000, 10000);     // Normal: 1s, 2s, 4s (max 10s)

        this.debugLog(`⏳ Retrying in ${delay}ms`, { operationId, nextAttempt: attempt + 2, reason: statusCode === 429 ? 'rate_limit' : 'general_error' });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Rate Limiter Management
  handleRateLimitFailure() {
    this.rateLimiter.failures++;
    this.rateLimiter.lastFailure = Date.now();
    this.rateLimiter.backoffMultiplier = Math.min(this.rateLimiter.backoffMultiplier * 2, 8); // Max 8x

    if (this.rateLimiter.failures >= this.rateLimiter.maxFailures) {
      this.rateLimiter.isCircuitOpen = true;
      console.warn(`[MMM-SmartThings] Circuit Breaker OPENED nach ${this.rateLimiter.failures} Rate Limit Fehlern. Pausiere für ${this.rateLimiter.circuitResetTime / 1000}s`);
    }

    this.debugLog("🚦 Rate Limit failure handled", {
      failures: this.rateLimiter.failures,
      backoffMultiplier: this.rateLimiter.backoffMultiplier,
      circuitOpen: this.rateLimiter.isCircuitOpen
    });
  },

  resetCircuitBreaker() {
    this.rateLimiter.isCircuitOpen = false;
    this.rateLimiter.failures = 0;
    this.rateLimiter.backoffMultiplier = 1;
    this.rateLimiter.lastFailure = null;

    console.log("[MMM-SmartThings] Circuit Breaker RESET - Normale API-Calls werden fortgesetzt");
    this.debugLog("✅ Circuit Breaker reset", { rateLimiter: this.rateLimiter });
  },

  checkRateLimiterReset() {
    if (this.rateLimiter.isCircuitOpen && this.rateLimiter.lastFailure) {
      const timeSinceLastFailure = Date.now() - this.rateLimiter.lastFailure;
      if (timeSinceLastFailure >= this.rateLimiter.circuitResetTime) {
        this.resetCircuitBreaker();
      }
    }

    // Graduelle Verbesserung des Backoff Multipliers
    if (this.rateLimiter.backoffMultiplier > 1 && !this.rateLimiter.isCircuitOpen) {
      const timeSinceLastFailure = this.rateLimiter.lastFailure ? Date.now() - this.rateLimiter.lastFailure : Infinity;
      if (timeSinceLastFailure > 2 * 60 * 1000) { // 2 Minuten ohne Fehler
        this.rateLimiter.backoffMultiplier = Math.max(1, this.rateLimiter.backoffMultiplier * 0.8);
        this.debugLog("📉 Backoff multiplier reduced", { newMultiplier: this.rateLimiter.backoffMultiplier });
      }
    }
  },

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

  cleanupOldData() {
    // Cleanup method for old data (placeholder)
    // Add implementation for cleaning up old device states if needed
  }
});