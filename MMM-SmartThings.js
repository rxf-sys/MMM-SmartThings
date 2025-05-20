Module.register("MMM-SmartThings", {
  defaults: {
    // API Konfiguration
    token: "",
    deviceIds: [],

    // Update-Intervalle
    updateInterval: 60 * 1000, // 1 Minute

    // Anzeige-Optionen
    showIcons: true,
    showChart: true,
    showLastUpdate: true,
    maxDevices: 10,

    // Chart-Konfiguration
    chartHistoryHours: 24,
    chartUpdateInterval: 5 * 60 * 1000, // 5 Minuten
    powerDeviceIds: [], // Geräte für Stromverbrauchschart

    // Benachrichtigungen
    notifications: {
      enabled: true,
      washingMachine: true,
      dryer: true,
      lowBattery: true,
      doorOpen: true
    },

    // Layout
    layout: "vertical", // "vertical", "horizontal", "grid"
    compactMode: false,
    theme: "default", // "default", "dark", "colorful"

    // Performance & Debug
    debug: false,
    enablePerformanceMonitoring: true,
    cacheEnabled: true,
    showPerformanceStats: false
  },

  requiresVersion: "2.1.0",

  start() {
    Log.info(`[${this.name}] Modul wird gestartet...`);

    // Initialisierung
    this.devices = [];
    this.powerHistory = {};
    this.lastUpdate = null;
    this.error = null;
    this.loaded = false;

    // Performance Monitoring
    this.performance = {
      renderTimes: [],
      updateTimes: [],
      lastRenderTime: 0,
      domUpdates: 0
    };

    // Debug-Capabilities
    this.debugData = null;

    // Validierung der Konfiguration
    if (!this.config.token) {
      this.error = "SmartThings Token fehlt in der Konfiguration";
      Log.error(`[${this.name}] ${this.error}`);
      return;
    }

    if (!this.config.deviceIds.length) {
      this.error = "Keine Device IDs konfiguriert";
      Log.error(`[${this.name}] ${this.error}`);
      return;
    }

    // Debug-Modus aktivieren
    if (this.config.debug) {
      this.enableDebugMode();
    }

    // Performance Monitoring aktivieren
    if (this.config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    // Erste Datenabfrage
    this.getData();

    // Regelmäßige Updates
    this.updateInterval = setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Chart-Updates (wenn aktiviert und powerDeviceIds konfiguriert)
    if (this.config.showChart && this.config.powerDeviceIds && this.config.powerDeviceIds.length > 0) {
      Log.info(`[${this.name}] Chart-Updates aktiviert für ${this.config.powerDeviceIds.length} Geräte`);

      // Erste Chart-Daten sofort laden
      setTimeout(() => {
        this.updatePowerHistory();
      }, 5000); // 5 Sekunden nach Start

      // Regelmäßige Chart-Updates
      this.chartInterval = setInterval(() => {
        this.updatePowerHistory();
      }, this.config.chartUpdateInterval);
    } else {
      Log.warn(`[${this.name}] Charts deaktiviert. showChart: ${this.config.showChart}, powerDeviceIds: ${this.config.powerDeviceIds?.length || 0}`);
    }

    // Keyboard shortcuts für Debug
    if (this.config.debug) {
      this.setupDebugKeyboardShortcuts();
    }
  },

  getData() {
    const startTime = Date.now();
    this.sendSocketNotification("GET_DEVICE_DATA", {
      token: this.config.token,
      deviceIds: this.config.deviceIds,
      powerDeviceIds: this.config.powerDeviceIds,
      notifications: this.config.notifications,
      debug: this.config.debug
    });

    // Performance Tracking
    if (this.config.enablePerformanceMonitoring) {
      this.performance.updateTimes.push({
        timestamp: new Date().toISOString(),
        startTime,
        type: 'getData'
      });

      // Begrenzt auf 50 Einträge
      if (this.performance.updateTimes.length > 50) {
        this.performance.updateTimes = this.performance.updateTimes.slice(-25);
      }
    }
  },

  updatePowerHistory() {
    this.sendSocketNotification("GET_POWER_HISTORY", {
      token: this.config.token,
      deviceIds: this.config.powerDeviceIds,
      hours: this.config.chartHistoryHours
    });
  },

  socketNotificationReceived(notification, payload) {
    const startTime = Date.now();

    switch (notification) {
      case "DEVICE_DATA":
        this.devices = payload.devices;
        this.lastUpdate = new Date();
        this.error = null;
        this.loaded = true;

        // Performance-Daten von Backend
        if (payload.performance && this.config.enablePerformanceMonitoring) {
          this.performance.lastBackendDuration = payload.performance.duration;
          this.performance.lastCacheHit = payload.performance.cacheHit;
        }

        this.debugLog("📱 Device data received", {
          deviceCount: this.devices.length,
          deviceNames: this.devices.map(d => d.name)
        });

        this.updateDom(300);
        break;

      case "POWER_HISTORY":
        this.debugLog("⚡ Power history received", {
          deviceCount: Object.keys(payload).length,
          devices: Object.keys(payload),
          sampleData: Object.values(payload).map(d => ({
            method: d.method,
            deviceType: d.deviceType,
            dataPoints: d.values ? d.values.length : 0,
            powerRange: d.values && d.values.length > 0 ? `${Math.min(...d.values)}-${Math.max(...d.values)}W` : 'No data'
          }))
        });

        this.powerHistory = payload;
        
        // Force chart update after power history is received
        setTimeout(() => {
          this.debugLog("🔄 Triggering chart update after power history");
          if (Object.keys(this.powerHistory).length > 0) {
            if (this.chart) {
              this.updateChart();
            } else {
              this.initChart();
            }
          } else {
            this.debugLog("⚠️ No power history data to display");
          }
        }, 500); // Small delay to ensure DOM is ready
        break;

      case "NOTIFICATION":
        this.showNotification(payload);
        break;

      case "DEBUG_DATA":
        this.debugData = payload;
        Log.info(`[${this.name}] Debug data received:`, payload);
        break;

      case "ERROR":
        this.error = payload.message;
        this.loaded = true;
        this.updateDom(300);
        Log.error(`[${this.name}] ${payload.message}`);

        // Performance-Tracking für Fehler
        if (this.config.enablePerformanceMonitoring) {
          this.performance.errors = this.performance.errors || [];
          this.performance.errors.push({
            timestamp: new Date().toISOString(),
            message: payload.message,
            operation: payload.operation || 'unknown'
          });
        }
        break;
    }

    // Socket Notification Performance Tracking
    if (this.config.enablePerformanceMonitoring) {
      const duration = Date.now() - startTime;
      this.performance.socketNotifications = this.performance.socketNotifications || [];
      this.performance.socketNotifications.push({
        timestamp: new Date().toISOString(),
        notification,
        duration
      });

      // Begrenzt auf 30 Einträge
      if (this.performance.socketNotifications.length > 30) {
        this.performance.socketNotifications = this.performance.socketNotifications.slice(-15);
      }
    }
  },

  getDom() {
    const startTime = Date.now();
    const wrapper = document.createElement("div");
    wrapper.className = `mmm-smartthings ${this.config.theme} ${this.config.layout}`;

    // Debug mode indicator
    if (this.config.debug) {
      wrapper.classList.add('debug-mode');
    }

    // Performance Stats anzeigen (wenn aktiviert)
    if (this.config.showPerformanceStats && this.performance.lastRenderTime) {
      const perfDiv = document.createElement("div");
      perfDiv.className = "performance-stats";
      perfDiv.innerHTML = `
        <small>
          Render: ${this.performance.lastRenderTime}ms |
          Backend: ${this.performance.lastBackendDuration || 'N/A'}ms |
          Cache: ${this.performance.lastCacheHit ? 'HIT' : 'MISS'}
        </small>
      `;
      wrapper.appendChild(perfDiv);
    }

    // Fehlerbehandlung
    if (this.error) {
      wrapper.innerHTML += `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${this.error}</span>
          ${this.config.debug ? `<br><small>Check console for debug information</small>` : ''}
        </div>
      `;

      // Performance-Messung auch bei Fehlern
      this.trackRenderPerformance(startTime);
      return wrapper;
    }

    // Ladezustand
    if (!this.loaded) {
      wrapper.innerHTML += `
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Lade SmartThings Daten...</span>
        </div>
      `;

      this.trackRenderPerformance(startTime);
      return wrapper;
    }

    // Header
    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML = `
      <i class="fab fa-microsoft"></i>
      <span class="title">SmartThings</span>
      ${this.config.showLastUpdate && this.lastUpdate ?
        `<span class="last-update">Zuletzt: ${this.formatTime(this.lastUpdate)}</span>` : ''}
    `;
    wrapper.appendChild(header);

    // Chart (wenn aktiviert und Daten vorhanden) - IMPROVED STRUCTURE
    if (this.config.showChart && this.config.powerDeviceIds.length > 0) {
      const chartContainer = document.createElement("div");
      chartContainer.className = "chart-container";
      
      // Add debug attributes if debug mode is active
      if (this.config.debug) {
        chartContainer.setAttribute('data-chart-status', 
          this.powerHistory && Object.keys(this.powerHistory).length > 0 ? 'Data Available' : 'No Data'
        );
      }
      
      const chartTitle = document.createElement("h3");
      chartTitle.textContent = "Stromverbrauch";
      chartContainer.appendChild(chartTitle);
      
      // Create wrapper for better size control
      const chartWrapper = document.createElement("div");
      chartWrapper.className = "chart-wrapper";
      
      const canvas = document.createElement("canvas");
      canvas.id = `smartthings-chart-${this.identifier}`;
      
      // CRITICAL: Set initial canvas attributes
      canvas.width = 400;
      canvas.height = 250;
      canvas.style.width = '100%';
      canvas.style.height = '250px';
      canvas.style.maxHeight = '250px';
      
      chartWrapper.appendChild(canvas);
      chartContainer.appendChild(chartWrapper);
      wrapper.appendChild(chartContainer);

      this.debugLog("📊 Chart container added to DOM with size constraints", {
        canvasId: canvas.id,
        powerDeviceIds: this.config.powerDeviceIds,
        hasPowerHistory: !!this.powerHistory && Object.keys(this.powerHistory).length > 0,
        canvasSize: `${canvas.width} x ${canvas.height}`,
        canvasStyle: `${canvas.style.width} x ${canvas.style.height}`
      });
    }

    // Geräte-Container
    const devicesContainer = document.createElement("div");
    devicesContainer.className = `devices-container ${this.config.compactMode ? 'compact' : ''}`;

    this.devices.slice(0, this.config.maxDevices).forEach(device => {
      const deviceElement = this.createDeviceElement(device);
      devicesContainer.appendChild(deviceElement);
    });

    wrapper.appendChild(devicesContainer);

    // Chart nach DOM-Update erstellen (wenn Daten vorhanden)
    if (this.config.showChart && this.config.powerDeviceIds.length > 0) {
      setTimeout(() => {
        this.debugLog("⏰ Chart initialization triggered with delay", {
          powerHistoryAvailable: !!this.powerHistory && Object.keys(this.powerHistory).length > 0,
          chartExists: !!this.chart,
          canvasInDom: !!document.getElementById(`smartthings-chart-${this.identifier}`)
        });
        
        if (this.powerHistory && Object.keys(this.powerHistory).length > 0) {
          this.initChart();
        } else {
          this.debugLog("⚠️ No power history data available for chart initialization");
        }
      }, 200); // Slightly longer delay for DOM stability
    }

    // Performance-Messung
    this.trackRenderPerformance(startTime);

    return wrapper;
  },

  createDeviceElement(device) {
    const deviceDiv = document.createElement("div");
    deviceDiv.className = `device ${this.getDeviceTypeClass(device)}`;

    // Device Header
    const header = document.createElement("div");
    header.className = "device-header";

    // Icon (FontAwesome fallback wenn SVG nicht funktioniert)
    if (this.config.showIcons) {
      const iconElement = document.createElement("i");
      iconElement.className = `${this.getDeviceIcon(device)}`;
      iconElement.style.marginRight = "8px";
      iconElement.style.fontSize = "16px";
      iconElement.style.opacity = "0.8";
      header.appendChild(iconElement);
    }

    const name = document.createElement("span");
    name.className = "device-name";
    name.textContent = device.name;
    header.appendChild(name);

    const status = document.createElement("span");
    status.className = `device-status ${this.getDeviceStatus(device)}`;
    status.textContent = this.getStatusText(device);
    header.appendChild(status);

    deviceDiv.appendChild(header);

    // Device Details
    if (!this.config.compactMode) {
      const details = document.createElement("div");
      details.className = "device-details";

      Object.entries(this.getRelevantCapabilities(device)).forEach(([key, capability]) => {
        const detail = document.createElement("div");
        detail.className = "capability";
        detail.innerHTML = `
          <span class="capability-label">${this.getCapabilityLabel(key)}:</span>
          <span class="capability-value">${this.formatCapabilityValue(key, capability)}</span>
        `;
        details.appendChild(detail);
      });

      deviceDiv.appendChild(details);
    }

    return deviceDiv;
  },

  debugLog(message, data = {}) {
    if (this.config.debug) {
      console.log(`[${this.name} Frontend] ${message}`, data);
    }
  },

  getDeviceTypeClass(device) {
    const main = device.components?.main || {};

    if (main.switch) return "switch-device";
    if (main.powerMeter) return "power-device";
    if (main.temperatureMeasurement) return "temperature-device";
    if (main.contactSensor) return "contact-device";
    if (main.motionSensor) return "motion-device";
    if (main.battery) return "battery-device";

    return "generic-device";
  },

  getDeviceIcon(device) {
    const main = device.components?.main || {};

    // Spezifische Gerätetypen
    if (device.name.toLowerCase().includes("wasch")) return "fas fa-tshirt";
    if (device.name.toLowerCase().includes("trockner")) return "fas fa-wind";
    if (device.name.toLowerCase().includes("licht")) return "fas fa-lightbulb";
    if (device.name.toLowerCase().includes("tür")) return "fas fa-door-open";
    if (device.name.toLowerCase().includes("fenster")) return "fas fa-window-maximize";

    // Capability-basierte Icons
    if (main.switch) return "fas fa-power-off";
    if (main.powerMeter) return "fas fa-bolt";
    if (main.temperatureMeasurement) return "fas fa-thermometer-half";
    if (main.contactSensor) return "fas fa-door-closed";
    if (main.motionSensor) return "fas fa-running";
    if (main.battery) return "fas fa-battery-half";

    return "fas fa-microchip";
  },

  getDeviceStatus(device) {
    const main = device.components?.main || {};

    if (main.switch?.switch?.value === "on") return "on";
    if (main.switch?.switch?.value === "off") return "off";
    if (main.contactSensor?.contact?.value === "open") return "open";
    if (main.contactSensor?.contact?.value === "closed") return "closed";
    if (main.motionSensor?.motion?.value === "active") return "active";

    return "unknown";
  },

  getStatusText(device) {
    const main = device.components?.main || {};

    if (main.switch?.switch?.value === "on") return "Ein";
    if (main.switch?.switch?.value === "off") return "Aus";
    if (main.contactSensor?.contact?.value === "open") return "Offen";
    if (main.contactSensor?.contact?.value === "closed") return "Geschlossen";
    if (main.motionSensor?.motion?.value === "active") return "Bewegung";
    if (main.motionSensor?.motion?.value === "inactive") return "Inaktiv";

    return "Unbekannt";
  },

  getRelevantCapabilities(device) {
    const main = device.components?.main || {};
    const relevant = {};

    // Wichtige Capabilities filtern und anzeigen
    if (main.powerMeter?.power) {
      relevant.power = main.powerMeter.power;
    }
    if (main.energyMeter?.energy) {
      relevant.energy = main.energyMeter.energy;
    }
    if (main.temperatureMeasurement?.temperature) {
      relevant.temperature = main.temperatureMeasurement.temperature;
    }
    if (main.relativeHumidityMeasurement?.humidity) {
      relevant.humidity = main.relativeHumidityMeasurement.humidity;
    }
    if (main.battery?.battery) {
      relevant.battery = main.battery.battery;
    }
    if (main.illuminanceMeasurement?.illuminance) {
      relevant.illuminance = main.illuminanceMeasurement.illuminance;
    }

    return relevant;
  },

  getCapabilityLabel(key) {
    const labels = {
      power: "Leistung",
      energy: "Energie",
      temperature: "Temperatur",
      humidity: "Luftfeuchtigkeit",
      battery: "Batterie",
      illuminance: "Helligkeit"
    };
    return labels[key] || key;
  },

  formatCapabilityValue(key, capability) {
    const value = capability.value;
    const unit = capability.unit || "";

    switch (key) {
      case "power":
        return `${value} W`;
      case "energy":
        return `${value} kWh`;
      case "temperature":
        return `${value}°C`;
      case "humidity":
        return `${value}%`;
      case "battery":
        return `${value}%`;
      case "illuminance":
        return `${value} lux`;
      default:
        return `${value} ${unit}`.trim();
    }
  },

  initChart() {
    // Chart initialization method - fixed version with proper sizing
    const canvas = document.getElementById(`smartthings-chart-${this.identifier}`);
    if (!canvas) {
      this.debugLog("❌ Chart canvas not found", { 
        expectedId: `smartthings-chart-${this.identifier}`,
        canvasExists: !!canvas 
      });
      return;
    }

    if (!window.Chart) {
      this.debugLog("❌ Chart.js not loaded", { 
        windowChart: typeof window.Chart,
        suggestion: "Check if Chart.js CDN is accessible" 
      });
      return;
    }

    this.debugLog("🎨 Initializing chart with size constraints", {
      canvasId: canvas.id,
      powerHistoryKeys: Object.keys(this.powerHistory || {}),
      chartJsVersion: window.Chart.version || 'unknown'
    });

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
      this.debugLog("🗑️ Destroyed existing chart");
    }

    // CRITICAL: Set canvas size explicitly
    canvas.style.width = '100%';
    canvas.style.height = '250px';
    canvas.style.maxHeight = '250px';

    // Prepare chart data
    const datasets = Object.entries(this.powerHistory || {}).map(([deviceId, data], index) => {
      const device = this.devices.find(d => d.deviceId === deviceId);
      const deviceName = device?.name || deviceId.substring(0, 8) + '...';
      const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'];

      return {
        label: deviceName,
        data: data.values || [],
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        fill: false,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4
      };
    });

    // Use timestamps from first device
    const timestamps = Object.keys(this.powerHistory || {}).length > 0 
      ? this.powerHistory[Object.keys(this.powerHistory)[0]]?.timestamps || []
      : [];

    this.debugLog("📊 Chart data prepared", {
      datasets: datasets.length,
      timestamps: timestamps.length,
      canvasSize: `${canvas.style.width} x ${canvas.style.height}`,
      sampleData: datasets.map(d => ({
        label: d.label,
        dataPoints: d.data.length,
        maxValue: Math.max(...(d.data || [0]))
      }))
    });

    try {
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timestamps,
          datasets: datasets
        },
        options: {
          // CRITICAL: Size and responsiveness settings
          responsive: true,
          maintainAspectRatio: false, // IMPORTANT: Allows custom height
          aspectRatio: false, // IMPORTANT: Disables aspect ratio
          
          // Layout constraints
          layout: {
            padding: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10
            }
          },
          
          plugins: {
            title: {
              display: true,
              text: 'Stromverbrauch (24h)',
              color: '#ffffff',
              font: {
                size: 14
              }
            },
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#ffffff',
                fontSize: 12,
                usePointStyle: true,
                padding: 10
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Zeit',
                color: '#ffffff'
              },
              ticks: {
                color: '#ffffff',
                maxTicksLimit: 8,
                maxRotation: 45
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Watt',
                color: '#ffffff'
              },
              ticks: {
                color: '#ffffff',
                callback: function(value) {
                  return value + 'W';
                }
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          elements: {
            line: {
              borderWidth: 2
            },
            point: {
              radius: 2,
              hoverRadius: 4
            }
          },
          
          // Animation settings for performance
          animation: {
            duration: 1000
          },
          
          // Performance optimizations
          spanGaps: true,
          normalized: true,
          parsing: false
        }
      });

      // Force resize after creation
      setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
          this.debugLog("🔄 Chart resized after creation");
        }
      }, 100);

      this.debugLog("✅ Chart created successfully with size constraints", {
        chartType: this.chart.config.type,
        datasetCount: this.chart.data.datasets.length,
        labelCount: this.chart.data.labels.length,
        maintainAspectRatio: this.chart.options.maintainAspectRatio,
        canvasSize: `${canvas.style.width} x ${canvas.style.height}`
      });

    } catch (error) {
      this.debugLog("❌ Chart creation failed", {
        error: error.message,
        stack: error.stack
      });
      console.error("[MMM-SmartThings] Chart creation error:", error);
    }
  },

  updateChart() {
    // Chart update method - fixed version
    if (this.chart && this.powerHistory && Object.keys(this.powerHistory).length > 0) {
      this.debugLog("🔄 Updating existing chart with power history data", {
        historyDevices: Object.keys(this.powerHistory),
        dataAvailable: Object.values(this.powerHistory).map(d => d.values ? d.values.length : 0)
      });

      const datasets = Object.entries(this.powerHistory).map(([deviceId, data], index) => {
        const device = this.devices.find(d => d.deviceId === deviceId);
        const deviceName = device?.name || deviceId.substring(0, 8) + '...';
        const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'];

        return {
          label: deviceName,
          data: data.values || [],
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          fill: false,
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 4
        };
      });

      // Use timestamps from any device (they should all be the same)
      const timestamps = this.powerHistory[Object.keys(this.powerHistory)[0]]?.timestamps || [];

      this.chart.data.labels = timestamps;
      this.chart.data.datasets = datasets;
      this.chart.update('none'); // No animation for better performance
      
      this.debugLog("✅ Chart updated successfully", {
        labelsCount: timestamps.length,
        datasetsCount: datasets.length
      });
    } else {
      this.debugLog("⚠️ No chart or power history data available for update", {
        hasChart: !!this.chart,
        powerHistoryKeys: Object.keys(this.powerHistory || {})
      });
    }
  },

  showNotification(payload) {
    if (this.config.notifications.enabled) {
      this.sendNotification("SHOW_ALERT", {
        type: "notification",
        title: "SmartThings",
        message: payload.message,
        timer: 10000
      });
    }
  },

  formatTime(date) {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Debug & Performance Methoden
  enableDebugMode() {
    Log.info(`[${this.name}] Debug-Modus aktiviert`);
    this.sendSocketNotification("ENABLE_DEBUG", { enabled: true });

    // Debug-Informationen alle 30 Sekunden abrufen
    this.debugInterval = setInterval(() => {
      this.sendSocketNotification("GET_DEBUG_DATA");
    }, 30000);

    // Debug-Konsole Nachrichten
    window.MMM_SmartThings_Debug = {
      getPerformance: () => this.performance,
      getDebugData: () => this.debugData,
      clearCache: () => this.sendSocketNotification("CLEAR_CACHE"),
      togglePerformanceStats: () => {
        this.config.showPerformanceStats = !this.config.showPerformanceStats;
        this.updateDom();
      }
    };

    Log.info(`[${this.name}] Debug-Tools verfügbar unter: window.MMM_SmartThings_Debug`);
  },

  startPerformanceMonitoring() {
    Log.info(`[${this.name}] Performance-Monitoring aktiviert`);

    // Memory Usage Tracking
    this.memoryInterval = setInterval(() => {
      if (performance.memory) {
        this.performance.memoryUsage = this.performance.memoryUsage || [];
        this.performance.memoryUsage.push({
          timestamp: new Date().toISOString(),
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        });

        // Begrenzt auf 20 Einträge
        if (this.performance.memoryUsage.length > 20) {
          this.performance.memoryUsage = this.performance.memoryUsage.slice(-10);
        }
      }
    }, 60000); // Jede Minute
  },

  trackRenderPerformance(startTime) {
    if (!this.config.enablePerformanceMonitoring) return;

    const renderTime = Date.now() - startTime;
    this.performance.lastRenderTime = renderTime;
    this.performance.domUpdates++;

    this.performance.renderTimes.push({
      timestamp: new Date().toISOString(),
      duration: renderTime,
      updateCount: this.performance.domUpdates
    });

    // Begrenzt auf 30 Einträge
    if (this.performance.renderTimes.length > 30) {
      this.performance.renderTimes = this.performance.renderTimes.slice(-15);
    }

    // Warnung bei langsamen Renders
    if (renderTime > 100) {
      Log.warn(`[${this.name}] Slow render detected: ${renderTime}ms`);
    }
  },

  setupDebugKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+D für Debug-Daten
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        console.group('[MMM-SmartThings] Debug Information');
        console.log('Performance:', this.performance);
        console.log('Debug Data:', this.debugData);
        console.log('Current Config:', this.config);
        console.log('Devices:', this.devices);
        console.groupEnd();
      }

      // Ctrl+Shift+C für Cache leeren
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.sendSocketNotification("CLEAR_CACHE");
        Log.info(`[${this.name}] Cache cleared via keyboard shortcut`);
      }

      // Ctrl+Shift+P für Performance Stats togglen
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        this.config.showPerformanceStats = !this.config.showPerformanceStats;
        this.updateDom();
        Log.info(`[${this.name}] Performance stats ${this.config.showPerformanceStats ? 'enabled' : 'disabled'}`);
      }
    });
  },

  // Cleanup bei Stop
  stop() {
    Log.info(`[${this.name}] Modul wird gestoppt - Cleanup...`);

    // Alle Intervals clearen
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.chartInterval) clearInterval(this.chartInterval);
    if (this.debugInterval) clearInterval(this.debugInterval);
    if (this.memoryInterval) clearInterval(this.memoryInterval);

    // Chart cleanup
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Debug-Tools entfernen
    if (window.MMM_SmartThings_Debug) {
      delete window.MMM_SmartThings_Debug;
    }

    Log.info(`[${this.name}] Cleanup abgeschlossen`);
  },

  getScripts() {
    return [
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.js"
    ];
  },

  getStyles() {
    return [
      "MMM-SmartThings.css",
      "font-awesome.css"
    ];
  }
});
