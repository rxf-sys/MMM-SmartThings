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
    theme: "default" // "default", "dark", "colorful"
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
    
    // Erste Datenabfrage
    this.getData();
    
    // Regelmäßige Updates
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);
    
    // Chart-Updates (wenn aktiviert)
    if (this.config.showChart && this.config.powerDeviceIds.length > 0) {
      setInterval(() => {
        this.updatePowerHistory();
      }, this.config.chartUpdateInterval);
    }
  },

  getData() {
    this.sendSocketNotification("GET_DEVICE_DATA", {
      token: this.config.token,
      deviceIds: this.config.deviceIds,
      powerDeviceIds: this.config.powerDeviceIds,
      notifications: this.config.notifications
    });
  },
  
  updatePowerHistory() {
    this.sendSocketNotification("GET_POWER_HISTORY", {
      token: this.config.token,
      deviceIds: this.config.powerDeviceIds,
      hours: this.config.chartHistoryHours
    });
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "DEVICE_DATA":
        this.devices = payload.devices;
        this.lastUpdate = new Date();
        this.error = null;
        this.loaded = true;
        this.updateDom(300);
        break;
        
      case "POWER_HISTORY":
        this.powerHistory = payload;
        this.updateChart();
        break;
        
      case "NOTIFICATION":
        this.showNotification(payload);
        break;
        
      case "ERROR":
        this.error = payload.message;
        this.loaded = true;
        this.updateDom(300);
        Log.error(`[${this.name}] ${payload.message}`);
        break;
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = `mmm-smartthings ${this.config.theme} ${this.config.layout}`;
    
    // Fehlerbehandlung
    if (this.error) {
      wrapper.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${this.error}</span>
        </div>
      `;
      return wrapper;
    }
    
    // Ladezustand
    if (!this.loaded) {
      wrapper.innerHTML = `
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Lade SmartThings Daten...</span>
        </div>
      `;
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
    
    // Chart (wenn aktiviert)
    if (this.config.showChart && this.config.powerDeviceIds.length > 0) {
      const chartContainer = document.createElement("div");
      chartContainer.className = "chart-container";
      chartContainer.innerHTML = `
        <h3>Stromverbrauch</h3>
        <canvas id="smartthings-chart-${this.identifier}"></canvas>
      `;
      wrapper.appendChild(chartContainer);
    }
    
    // Geräte-Container
    const devicesContainer = document.createElement("div");
    devicesContainer.className = `devices-container ${this.config.compactMode ? 'compact' : ''}`;
    
    this.devices.slice(0, this.config.maxDevices).forEach(device => {
      const deviceElement = this.createDeviceElement(device);
      devicesContainer.appendChild(deviceElement);
    });
    
    wrapper.appendChild(devicesContainer);
    
    // Chart nach DOM-Update erstellen
    if (this.config.showChart && this.config.powerDeviceIds.length > 0) {
      setTimeout(() => this.initChart(), 100);
    }
    
    return wrapper;
  },
  
  createDeviceElement(device) {
    const deviceDiv = document.createElement("div");
    deviceDiv.className = `device ${this.getDeviceTypeClass(device)}`;
    
    // Device Header
    const header = document.createElement("div");
    header.className = "device-header";
    
    if (this.config.showIcons) {
      const icon = document.createElement("div");
      icon.className = `device-icon ${this.getDeviceIconClass(device)}`;
      header.appendChild(icon);
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
  
  getDeviceIconClass(device) {
    const main = device.components?.main || {};
    const deviceName = device.name.toLowerCase();
    
    // Spezifische Gerätetypen nach Name
    if (deviceName.includes("wasch")) return "waschmaschine";
    if (deviceName.includes("trockner")) return "trockner";
    if (deviceName.includes("licht") || deviceName.includes("light")) return "licht";
    if (deviceName.includes("tür") || deviceName.includes("door")) return "tuer";
    if (deviceName.includes("fenster") || deviceName.includes("window")) return "fenster";
    
    // Capability-basierte Icons
    if (main.switch) return "switch-device";
    if (main.powerMeter) return "power-device";
    if (main.temperatureMeasurement) return "temperature-device";
    if (main.contactSensor) return "contact-device";
    if (main.motionSensor) return "motion-device";
    if (main.battery) return "battery-device";
    
    return "generic";
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
    const canvas = document.getElementById(`smartthings-chart-${this.identifier}`);
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    
    // Alte Chart-Instanz zerstören
    if (this.chart) {
      this.chart.destroy();
    }
    
    const datasets = Object.entries(this.powerHistory).map(([ deviceId, data], index) => {
      const device = this.devices.find(d => d.deviceId === deviceId);
      const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'];
      
      return {
        label: device?.name || deviceId,
        data: data.values,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        fill: false,
        tension: 0.1
      };
    });
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.powerHistory[Object.keys(this.powerHistory)[0]]?.timestamps || [],
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Watt'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Zeit'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  },
  
  updateChart() {
    if (this.chart && this.powerHistory) {
      const datasets = Object.entries(this.powerHistory).map(([deviceId, data], index) => {
        const device = this.devices.find(d => d.deviceId === deviceId);
        const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'];
        
        return {
          label: device?.name || deviceId,
          data: data.values,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          fill: false,
          tension: 0.1
        };
      });
      
      this.chart.data.labels = this.powerHistory[Object.keys(this.powerHistory)[0]]?.timestamps || [];
      this.chart.data.datasets = datasets;
      this.chart.update();
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

  getScripts() {
    return [
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.min.js"
    ];
  },

  getStyles() {
    return [
      "MMM-SmartThings.css",
      "font-awesome.css"
    ];
  }
});