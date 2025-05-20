Module.register("MMM-SmartThings", {
  defaults: {
    // Erforderliche Einstellungen
    token: "",
    deviceIds: [],
    
    // Update-Intervalle
    updateInterval: 60 * 1000, // 1 Minute
    
    // Anzeige-Optionen
    showIcons: true,
    showLastUpdate: true,
    maxDevices: 10,
    
    // Energie-Anzeige
    showEnergyStats: true,
    energyDeviceIds: [], // Geräte für Energieverbrauch
    
    // Layout & Design
    layout: "vertical", // "vertical", "horizontal"
    theme: "default", // "default", "dark", "modern"
    compactMode: false,
    
    // Debug
    debug: false
  },

  requiresVersion: "2.1.0",

  start() {
    Log.info(`[${this.name}] Modul wird gestartet...`);

    // Initialisierung
    this.devices = [];
    this.energyStats = {};
    this.lastUpdate = null;
    this.error = null;
    this.loaded = false;

    // Validierung
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
    this.updateInterval = setInterval(() => {
      this.getData();
    }, this.config.updateInterval);

    // Energie-Updates (falls aktiviert)
    if (this.config.showEnergyStats && this.config.energyDeviceIds.length > 0) {
      setTimeout(() => {
        this.getEnergyStats();
      }, 5000);

      setInterval(() => {
        this.getEnergyStats();
      }, 5 * 60 * 1000); // alle 5 Minuten
    }
  },

  getData() {
    this.sendSocketNotification("GET_DEVICE_DATA", {
      token: this.config.token,
      deviceIds: this.config.deviceIds,
      debug: this.config.debug
    });
  },

  getEnergyStats() {
    this.sendSocketNotification("GET_ENERGY_STATS", {
      token: this.config.token,
      deviceIds: this.config.energyDeviceIds
    });
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "DEVICE_DATA":
        this.devices = payload.devices || [];
        this.lastUpdate = new Date();
        this.error = null;
        this.loaded = true;
        this.updateDom(300);
        break;

      case "ENERGY_STATS":
        this.energyStats = payload || {};
        this.updateDom(300);
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

    if (this.config.compactMode) {
      wrapper.classList.add('compact');
    }

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
      <div class="title-section">
        <i class="fab fa-microsoft"></i>
        <span class="title">Smart Home</span>
      </div>
      ${this.config.showLastUpdate && this.lastUpdate ? 
        `<div class="last-update">Zuletzt: ${this.formatTime(this.lastUpdate)}</div>` : ''}
    `;
    wrapper.appendChild(header);

    // Energie-Statistiken (falls aktiviert)
    if (this.config.showEnergyStats && Object.keys(this.energyStats).length > 0) {
      const energyContainer = this.createEnergyContainer();
      wrapper.appendChild(energyContainer);
    }

    // Geräte-Container
    const devicesContainer = document.createElement("div");
    devicesContainer.className = "devices-container";

    this.devices.slice(0, this.config.maxDevices).forEach(device => {
      const deviceElement = this.createDeviceElement(device);
      devicesContainer.appendChild(deviceElement);
    });

    wrapper.appendChild(devicesContainer);

    return wrapper;
  },

  createEnergyContainer() {
    const container = document.createElement("div");
    container.className = "energy-stats";

    container.innerHTML = `
      <div class="energy-header">
        <i class="fas fa-bolt"></i>
        <span>Energieverbrauch</span>
      </div>
    `;

    // Energie-Statistiken für jedes Gerät
    Object.entries(this.energyStats).forEach(([deviceId, stats]) => {
      const device = this.devices.find(d => d.deviceId === deviceId);
      const deviceName = device?.name || `Gerät ${deviceId.substring(0, 8)}...`;

      const energyDiv = document.createElement("div");
      energyDiv.className = "energy-device";

      energyDiv.innerHTML = `
        <div class="energy-device-name">
          <i class="${this.getDeviceIcon(device)}"></i>
          ${deviceName}
        </div>
        <div class="energy-values">
          ${stats.currentPower !== undefined ? 
            `<div class="energy-stat">
              <span class="label">Aktuell:</span>
              <span class="value power">${stats.currentPower} W</span>
            </div>` : ''}
          ${stats.todayEnergy !== undefined ? 
            `<div class="energy-stat">
              <span class="label">Heute:</span>
              <span class="value">${stats.todayEnergy.toFixed(2)} kWh</span>
            </div>` : ''}
          ${stats.thisMonthEnergy !== undefined ? 
            `<div class="energy-stat">
              <span class="label">Diesen Monat:</span>
              <span class="value">${stats.thisMonthEnergy.toFixed(2)} kWh</span>
            </div>` : ''}
          ${stats.lastMonthEnergy !== undefined ? 
            `<div class="energy-stat">
              <span class="label">Letzten Monat:</span>
              <span class="value">${stats.lastMonthEnergy.toFixed(2)} kWh</span>
            </div>` : ''}
        </div>
      `;

      container.appendChild(energyDiv);
    });

    return container;
  },

  createDeviceElement(device) {
    const deviceDiv = document.createElement("div");
    deviceDiv.className = `device ${this.getDeviceTypeClass(device)}`;

    const header = document.createElement("div");
    header.className = "device-header";

    // Icon
    if (this.config.showIcons) {
      const iconElement = document.createElement("i");
      iconElement.className = `device-icon ${this.getDeviceIcon(device)}`;
      header.appendChild(iconElement);
    }

    // Name
    const name = document.createElement("span");
    name.className = "device-name";
    name.textContent = device.name;
    header.appendChild(name);

    // Status
    const status = document.createElement("span");
    status.className = `device-status ${this.getDeviceStatus(device)}`;
    status.textContent = this.getStatusText(device);
    header.appendChild(status);

    deviceDiv.appendChild(header);

    // Details (falls nicht kompakt)
    if (!this.config.compactMode) {
      const details = this.createDeviceDetails(device);
      if (details) {
        deviceDiv.appendChild(details);
      }
    }

    return deviceDiv;
  },

  createDeviceDetails(device) {
    const main = device.components?.main || {};
    const details = document.createElement("div");
    details.className = "device-details";

    let hasDetails = false;

    // Aktuelle Leistung
    if (main.powerMeter?.power) {
      const powerDiv = document.createElement("div");
      powerDiv.className = "detail-item";
      powerDiv.innerHTML = `
        <span class="detail-label">Leistung:</span>
        <span class="detail-value">${main.powerMeter.power.value} W</span>
      `;
      details.appendChild(powerDiv);
      hasDetails = true;
    }

    // Temperatur
    if (main.temperatureMeasurement?.temperature) {
      const tempDiv = document.createElement("div");
      tempDiv.className = "detail-item";
      tempDiv.innerHTML = `
        <span class="detail-label">Temperatur:</span>
        <span class="detail-value">${main.temperatureMeasurement.temperature.value}°C</span>
      `;
      details.appendChild(tempDiv);
      hasDetails = true;
    }

    // Batterie
    if (main.battery?.battery) {
      const batteryDiv = document.createElement("div");
      batteryDiv.className = "detail-item";
      batteryDiv.innerHTML = `
        <span class="detail-label">Batterie:</span>
        <span class="detail-value">${main.battery.battery.value}%</span>
      `;
      details.appendChild(batteryDiv);
      hasDetails = true;
    }

    return hasDetails ? details : null;
  },

  // Hilfsfunktionen
  getDeviceTypeClass(device) {
    const main = device.components?.main || {};
    
    if (main.washerOperatingState || main.dryerOperatingState) return "appliance-device";
    if (main.switch) return "switch-device";
    if (main.powerMeter) return "power-device";
    if (main.temperatureMeasurement) return "sensor-device";
    if (main.contactSensor) return "contact-device";
    if (main.motionSensor) return "motion-device";
    
    return "generic-device";
  },

  getDeviceIcon(device) {
    const main = device.components?.main || {};
    const name = device.name?.toLowerCase() || '';

    // Spezifische Geräte nach Name
    if (name.includes("wasch")) return "fas fa-tshirt";
    if (name.includes("trockner")) return "fas fa-wind";
    if (name.includes("tv") || name.includes("fernseh")) return "fas fa-tv";
    if (name.includes("licht") || name.includes("light")) return "fas fa-lightbulb";
    if (name.includes("tür") || name.includes("door")) return "fas fa-door-open";
    if (name.includes("fenster") || name.includes("window")) return "fas fa-window-maximize";

    // Nach Capabilities
    if (main.washerOperatingState) return "fas fa-tshirt";
    if (main.dryerOperatingState) return "fas fa-wind";
    if (main.tvChannel || main.audioVolume) return "fas fa-tv";
    if (main.switch) return "fas fa-power-off";
    if (main.powerMeter) return "fas fa-bolt";
    if (main.temperatureMeasurement) return "fas fa-thermometer-half";
    if (main.contactSensor) return "fas fa-door-closed";
    if (main.motionSensor) return "fas fa-running";

    return "fas fa-microchip";
  },

  getDeviceStatus(device) {
    const main = device.components?.main || {};

    // Waschmaschine/Trockner
    if (main.washerOperatingState?.machineState?.value) {
      const state = main.washerOperatingState.machineState.value;
      return state === 'run' ? 'running' : (state === 'stop' ? 'stopped' : 'unknown');
    }
    
    if (main.dryerOperatingState?.machineState?.value) {
      const state = main.dryerOperatingState.machineState.value;
      return state === 'run' ? 'running' : (state === 'stop' ? 'stopped' : 'unknown');
    }

    // Standard Switch
    if (main.switch?.switch?.value === "on") return "on";
    if (main.switch?.switch?.value === "off") return "off";
    
    // Kontakt-Sensoren
    if (main.contactSensor?.contact?.value === "open") return "open";
    if (main.contactSensor?.contact?.value === "closed") return "closed";
    
    // Bewegungs-Sensoren
    if (main.motionSensor?.motion?.value === "active") return "active";
    if (main.motionSensor?.motion?.value === "inactive") return "inactive";

    return "unknown";
  },

  getStatusText(device) {
    const main = device.components?.main || {};

    // Deutsche Übersetzungen
    const status = this.getDeviceStatus(device);
    
    const translations = {
      'on': 'Ein',
      'off': 'Aus',
      'running': 'Läuft',
      'stopped': 'Stopp',
      'open': 'Offen',
      'closed': 'Geschlossen',
      'active': 'Bewegung',
      'inactive': 'Inaktiv',
      'unknown': 'Unbekannt'
    };

    return translations[status] || status;
  },

  formatTime(date) {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Cleanup
  stop() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.energyInterval) clearInterval(this.energyInterval);
  },

  getStyles() {
    return ["MMM-SmartThings.css"];
  }
});
