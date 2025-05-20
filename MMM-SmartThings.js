// ===== MMM-SmartThings Enhanced - ESLint Fixed =====

Module.register("MMM-SmartThings", {
  defaults: {
    // Erforderliche Einstellungen
    token: "",
    deviceIds: [],
    
    // Update-Intervalle
    updateInterval: 60 * 1000, // 1 Minute
    energyUpdateInterval: 5 * 60 * 1000, // 5 Minuten
    
    // Anzeige-Optionen
    showIcons: true,
    showLastUpdate: true,
    maxDevices: 10,
    
    // Energie-Anzeige
    showEnergyStats: true,
    energyDeviceIds: [],
    showRealTimeEnergy: true, // NEU: Echte Energie-Daten
    
    // Layout & Design
    layout: "vertical",
    theme: "default",
    compactMode: false,
    
    // NEU: Erweiterte Features
    showAnimations: true,
    enableNotifications: true,
    showEnergyTrends: true,
    samsungEnhanced: true, // Samsung-spezifische Features
    
    // Debug
    debug: false
  },

  requiresVersion: "2.1.0",

  start() {
    Log.info(`[${this.name}] Enhanced Modul wird gestartet...`);

    // Initialisierung
    this.devices = [];
    this.energyStats = {};
    this.previousEnergyData = {}; // Für Trend-Berechnung
    this.deviceStates = {}; // Für Status-Änderungen
    this.lastUpdate = null;
    this.error = null;
    this.loaded = false;

    // NEU: Notification System
    this.notifications = {
      pending: [],
      history: []
    };

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

      this.energyInterval = setInterval(() => {
        this.getEnergyStats();
      }, this.config.energyUpdateInterval);
    }
  },

  getData() {
    this.sendSocketNotification("GET_DEVICE_DATA_ENHANCED", {
      token: this.config.token,
      deviceIds: this.config.deviceIds,
      samsungEnhanced: this.config.samsungEnhanced,
      enableNotifications: this.config.enableNotifications,
      debug: this.config.debug
    });
  },

  getEnergyStats() {
    this.sendSocketNotification("GET_ENERGY_STATS_REAL", {
      token: this.config.token,
      deviceIds: this.config.energyDeviceIds,
      showRealTimeEnergy: this.config.showRealTimeEnergy,
      showTrends: this.config.showEnergyTrends
    });
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "DEVICE_DATA_ENHANCED":
        this.processEnhancedDeviceData(payload);
        break;

      case "ENERGY_STATS_REAL":
        this.processEnergyStatistics(payload);
        break;

      case "DEVICE_NOTIFICATION":
        this.handleDeviceNotification(payload);
        break;

      case "ERROR":
        this.error = payload.message;
        this.loaded = true;
        this.updateDom(300);
        Log.error(`[${this.name}] ${payload.message}`);
        break;

      default:
        // Handle unknown notifications
        break;
    }
  },

  processEnhancedDeviceData(payload) {
    const newDevices = payload.devices || [];
    
    // Status-Änderungen erkennen
    newDevices.forEach(device => {
      const previousState = this.deviceStates[device.deviceId];
      const currentState = this.getEnhancedDeviceStatus(device);
      
      if (previousState && previousState !== currentState) {
        this.handleStatusChange(device, previousState, currentState);
      }
      
      this.deviceStates[device.deviceId] = currentState;
    });

    this.devices = newDevices;
    this.lastUpdate = new Date();
    this.error = null;
    this.loaded = true;
    this.updateDom(300);
  },

  processEnergyStatistics(payload) {
    if (this.config.showEnergyTrends) {
      // Trends berechnen
      Object.keys(payload).forEach(deviceId => {
        const current = payload[deviceId];
        const previous = this.previousEnergyData[deviceId];
        
        if (previous && current.thisMonthEnergy !== undefined && previous.thisMonthEnergy !== undefined) {
          current.trend = this.calculateEnergyTrend(current.thisMonthEnergy, previous.thisMonthEnergy);
        }
      });
      
      this.previousEnergyData = JSON.parse(JSON.stringify(payload));
    }
    
    this.energyStats = payload;
    this.updateDom(300);
  },

  handleStatusChange(device, previousState, currentState) {
    if (!this.config.enableNotifications) return;

    // Samsung-spezifische Benachrichtigungen
    if (this.config.samsungEnhanced) {
      if (device.type === 'samsung_washing_machine' && previousState === 'run' && currentState === 'end') {
        this.addNotification({
          type: 'appliance_finished',
          device: device.name,
          message: `${device.name} ist fertig! 🧺`,
          timestamp: new Date()
        });
      }
      
      if (device.type === 'samsung_dryer' && previousState === 'run' && currentState === 'end') {
        this.addNotification({
          type: 'appliance_finished',
          device: device.name,
          message: `${device.name} ist fertig! 🔥`,
          timestamp: new Date()
        });
      }
    }
  },

  handleDeviceNotification(payload) {
    // Handle incoming device notifications
    this.addNotification(payload);
  },

  addNotification(notification) {
    this.notifications.pending.push(notification);
    this.notifications.history.push(notification);
    
    // Begrenzt auf 10 Benachrichtigungen
    if (this.notifications.history.length > 10) {
      this.notifications.history.shift();
    }
    
    // Browser-Benachrichtigung senden
    this.sendNotification("SHOW_ALERT", {
      type: "notification",
      title: "SmartThings",
      message: notification.message,
      timer: 8000
    });
  },

  calculateEnergyTrend(current, previous) {
    if (!previous || previous === 0) return 'stable';
    
    const change = ((current - previous) / previous) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  },

  // Erweiterte Status-Erkennung
  getEnhancedDeviceStatus(device) {
    const main = device.components?.main || {};
    const deviceType = this.getDeviceType(device);

    // Samsung Waschmaschine erweiterte Status
    if (deviceType === 'samsung_washing_machine') {
      const machineState = main.washerOperatingState?.machineState?.value || 
                          main['samsungce.washerOperatingState']?.machineState?.value;
      const switchState = main.switch?.switch?.value;
      
      switch (machineState) {
        case 'run': 
        case 'rinse': 
        case 'spin': 
          return 'running';
        case 'pause': 
          return 'paused';
        case 'stop': 
          return switchState === 'on' ? 'standby' : 'off';
        case 'end': 
          return 'finished';
        default: 
          return switchState === 'on' ? 'standby' : 'off';
      }
    }

    // Samsung Trockner erweiterte Status
    if (deviceType === 'samsung_dryer') {
      const machineState = main.dryerOperatingState?.machineState?.value ||
                          main['samsungce.dryerOperatingState']?.machineState?.value;
      const switchState = main.switch?.switch?.value;
      
      switch (machineState) {
        case 'run': 
        case 'drying': 
          return 'running';
        case 'cooldown': 
          return 'finishing';
        case 'pause': 
          return 'paused';
        case 'stop': 
          return switchState === 'on' ? 'standby' : 'off';
        case 'end': 
          return 'finished';
        default: 
          return switchState === 'on' ? 'standby' : 'off';
      }
    }

    // Samsung TV erweiterte Status
    if (deviceType === 'samsung_tv') {
      const switchState = main.switch?.switch?.value;
      const playbackState = main.mediaPlayback?.playbackStatus?.value;
      
      if (switchState === 'on') {
        switch (playbackState) {
          case 'playing': 
            return 'running';
          case 'paused': 
            return 'paused';
          case 'stopped': 
            return 'standby';
          default: 
            return 'on';
        }
      }
      return 'off';
    }

    // Standard Status für andere Geräte
    if (main.switch?.switch?.value === "on") return "on";
    if (main.switch?.switch?.value === "off") return "off";
    if (main.contactSensor?.contact?.value === "open") return "open";
    if (main.contactSensor?.contact?.value === "closed") return "closed";
    if (main.motionSensor?.motion?.value === "active") return "active";
    if (main.motionSensor?.motion?.value === "inactive") return "inactive";

    return "unknown";
  },

  getDeviceType(device) {
    const main = device.components?.main || {};
    const name = device.name?.toLowerCase() || '';

    // Samsung-spezifische Erkennung
    if (main.washerOperatingState || main['samsungce.washerOperatingState'] || name.includes('wasch')) {
      return 'samsung_washing_machine';
    }
    if (main.dryerOperatingState || main['samsungce.dryerOperatingState'] || name.includes('trockner')) {
      return 'samsung_dryer';
    }
    if (main.tvChannel || main.audioVolume || main['samsungvd.mediaInputSource'] || name.includes('tv')) {
      return 'samsung_tv';
    }

    // Standard-Typen
    if (main.switch) return 'switch';
    if (main.powerMeter) return 'power_meter';
    if (main.temperatureMeasurement) return 'sensor';
    if (main.contactSensor) return 'contact';
    if (main.motionSensor) return 'motion';

    return 'generic';
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
    const header = this.createHeader();
    wrapper.appendChild(header);

    // Energie-Statistiken (falls aktiviert)
    if (this.config.showEnergyStats && Object.keys(this.energyStats).length > 0) {
      const energyContainer = this.createEnhancedEnergyContainer();
      wrapper.appendChild(energyContainer);
    }

    // Geräte-Container
    const devicesContainer = this.createDevicesContainer();
    wrapper.appendChild(devicesContainer);

    return wrapper;
  },

  createHeader() {
    const header = document.createElement("div");
    header.className = "header";
    
    const titleSection = document.createElement("div");
    titleSection.className = "title-section";
    titleSection.innerHTML = `
      <i class="fab fa-microsoft"></i>
      <span class="title">Smart Home</span>
    `;
    header.appendChild(titleSection);

    if (this.config.showLastUpdate && this.lastUpdate) {
      const lastUpdate = document.createElement("div");
      lastUpdate.className = "last-update";
      lastUpdate.textContent = `Zuletzt: ${this.formatTime(this.lastUpdate)}`;
      header.appendChild(lastUpdate);
    }

    return header;
  },

  createEnhancedEnergyContainer() {
    const container = document.createElement("div");
    container.className = "energy-stats";

    const header = document.createElement("div");
    header.className = "energy-header";
    header.innerHTML = `
      <i class="fas fa-bolt"></i>
      <span>Energieverbrauch</span>
    `;
    container.appendChild(header);

    // Energie-Statistiken für jedes Gerät
    Object.entries(this.energyStats).forEach(([deviceId, stats]) => {
      const device = this.devices.find(d => d.deviceId === deviceId);
      const deviceName = device?.name || `Gerät ${deviceId.substring(0, 8)}...`;

      const energyDiv = document.createElement("div");
      energyDiv.className = "energy-device";

      // Device Name mit verbessertem Icon
      const nameDiv = document.createElement("div");
      nameDiv.className = "energy-device-name";
      nameDiv.innerHTML = `
        <i class="${this.getDeviceIcon(device)}"></i>
        ${deviceName}
      `;
      energyDiv.appendChild(nameDiv);

      // Energie-Werte mit Trends
      const valuesDiv = document.createElement("div");
      valuesDiv.className = "energy-values";

      // Aktuelle Leistung mit Klassen für Animation
      if (stats.currentPower !== undefined) {
        const powerClass = this.getPowerClass(stats.currentPower);
        const currentPowerDiv = document.createElement("div");
        currentPowerDiv.className = "energy-stat";
        currentPowerDiv.innerHTML = `
          <span class="label">Aktuell:</span>
          <span class="value power ${powerClass}">${stats.currentPower} W</span>
        `;
        valuesDiv.appendChild(currentPowerDiv);
      }

      // Energie heute
      if (stats.todayEnergy !== undefined) {
        const todayDiv = document.createElement("div");
        todayDiv.className = "energy-stat";
        todayDiv.innerHTML = `
          <span class="label">Heute:</span>
          <span class="value">${stats.todayEnergy.toFixed(2)} kWh</span>
        `;
        valuesDiv.appendChild(todayDiv);
      }

      // Energie diesen Monat mit Trend
      if (stats.thisMonthEnergy !== undefined) {
        const trendClass = this.config.showEnergyTrends && stats.trend ? `trend-${stats.trend}` : '';
        const thisMonthDiv = document.createElement("div");
        thisMonthDiv.className = "energy-stat";
        thisMonthDiv.innerHTML = `
          <span class="label">Diesen Monat:</span>
          <span class="value ${trendClass}">${stats.thisMonthEnergy.toFixed(2)} kWh</span>
        `;
        valuesDiv.appendChild(thisMonthDiv);
      }

      // Energie letzten Monat
      if (stats.lastMonthEnergy !== undefined) {
        const lastMonthDiv = document.createElement("div");
        lastMonthDiv.className = "energy-stat";
        lastMonthDiv.innerHTML = `
          <span class="label">Letzten Monat:</span>
          <span class="value">${stats.lastMonthEnergy.toFixed(2)} kWh</span>
        `;
        valuesDiv.appendChild(lastMonthDiv);
      }

      energyDiv.appendChild(valuesDiv);
      container.appendChild(energyDiv);
    });

    return container;
  },

  createDevicesContainer() {
    const container = document.createElement("div");
    container.className = "devices-container";

    this.devices.slice(0, this.config.maxDevices).forEach(device => {
      const deviceElement = this.createEnhancedDeviceElement(device);
      container.appendChild(deviceElement);
    });

    return container;
  },

  createEnhancedDeviceElement(device) {
    const deviceDiv = document.createElement("div");
    const status = this.getEnhancedDeviceStatus(device);
    const typeClass = this.getDeviceTypeClass(device);
    
    deviceDiv.className = `device ${typeClass}`;
    
    // Samsung-spezifische Daten-Attribute für CSS-Animationen
    if (this.config.samsungEnhanced) {
      const deviceType = this.getDeviceType(device);
      deviceDiv.setAttribute('data-device-type', deviceType);
      deviceDiv.setAttribute('data-status', status);
    }

    // Notification-Pending Klasse
    if (this.hasNotificationPending(device.deviceId)) {
      deviceDiv.classList.add('notification-pending');
    }

    // Header
    const header = document.createElement("div");
    header.className = "device-header";

    // Icon mit Animationen
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

    // Status mit erweiterten Zuständen
    const statusElement = document.createElement("span");
    statusElement.className = `device-status ${status}`;
    statusElement.textContent = this.getStatusText(status);
    header.appendChild(statusElement);

    deviceDiv.appendChild(header);

    // Details (falls nicht kompakt)
    if (!this.config.compactMode) {
      const details = this.createEnhancedDeviceDetails(device);
      if (details) {
        deviceDiv.appendChild(details);
      }
    }

    return deviceDiv;
  },

  createEnhancedDeviceDetails(device) {
    const main = device.components?.main || {};
    const details = document.createElement("div");
    details.className = "device-details";

    let hasDetails = false;

    // Aktuelle Leistung
    if (main.powerMeter?.power || main.powerConsumptionReport?.powerConsumption) {
      const power = main.powerMeter?.power?.value || 
                   main.powerConsumptionReport?.powerConsumption?.value?.power || 0;
      const powerClass = this.getPowerClass(power);
      
      const powerDiv = document.createElement("div");
      powerDiv.className = "detail-item";
      powerDiv.innerHTML = `
        <span class="detail-label">Leistung:</span>
        <span class="detail-value power ${powerClass}">${power} W</span>
      `;
      details.appendChild(powerDiv);
      hasDetails = true;
    }

    // Samsung-spezifische Details
    if (this.config.samsungEnhanced) {
      const deviceType = this.getDeviceType(device);
      
      if (deviceType === 'samsung_washing_machine' || deviceType === 'samsung_dryer') {
        // Verbleibende Zeit
        const operatingState = deviceType === 'samsung_washing_machine' ? 
          main.washerOperatingState : main.dryerOperatingState;
        
        if (operatingState?.completionTime?.value) {
          const timeDiv = document.createElement("div");
          timeDiv.className = "detail-item";
          timeDiv.innerHTML = `
            <span class="detail-label">Verbleibend:</span>
            <span class="detail-value">${this.formatDuration(operatingState.completionTime.value)}</span>
          `;
          details.appendChild(timeDiv);
          hasDetails = true;
        }
      }
    }

    // Standard-Details
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
  getPowerClass(power) {
    if (power === 0) return 'zero';
    if (power < 50) return 'low';
    if (power < 500) return 'medium';
    return 'high';
  },

  hasNotificationPending(deviceId) {
    return this.notifications.pending.some(n => n.deviceId === deviceId);
  },

  getDeviceTypeClass(device) {
    const deviceType = this.getDeviceType(device);
    
    const typeMap = {
      'samsung_washing_machine': 'appliance-device',
      'samsung_dryer': 'appliance-device',
      'samsung_tv': 'appliance-device',
      'switch': 'switch-device',
      'power_meter': 'power-device',
      'sensor': 'sensor-device',
      'contact': 'contact-device',
      'motion': 'motion-device'
    };

    return typeMap[deviceType] || 'generic-device';
  },

  getDeviceIcon(device) {
    const deviceType = this.getDeviceType(device);
    const main = device.components?.main || {};
    const name = device.name?.toLowerCase() || '';

    // Samsung-spezifische Icons
    if (deviceType === 'samsung_washing_machine') return "fas fa-tshirt";
    if (deviceType === 'samsung_dryer') return "fas fa-wind";
    if (deviceType === 'samsung_tv') return "fas fa-tv";

    // Name-basierte Icons
    if (name.includes("licht") || name.includes("light")) return "fas fa-lightbulb";
    if (name.includes("tür") || name.includes("door")) return "fas fa-door-open";
    if (name.includes("fenster") || name.includes("window")) return "fas fa-window-maximize";

    // Capability-basierte Icons
    if (main.switch) return "fas fa-power-off";
    if (main.powerMeter) return "fas fa-bolt";
    if (main.temperatureMeasurement) return "fas fa-thermometer-half";
    if (main.contactSensor) return "fas fa-door-closed";
    if (main.motionSensor) return "fas fa-running";
    if (main.battery) return "fas fa-battery-half";

    return "fas fa-microchip";
  },

  getStatusText(status) {
    const translations = {
      'on': 'Ein',
      'off': 'Aus',
      'running': 'Läuft',
      'paused': 'Pause',
      'finished': 'Fertig',
      'standby': 'Bereit',
      'error': 'Fehler',
      'stopped': 'Stopp',
      'finishing': 'Fertig',
      'open': 'Offen',
      'closed': 'Geschlossen',
      'active': 'Bewegung',
      'inactive': 'Inaktiv',
      'unknown': 'Unbekannt'
    };

    return translations[status] || status;
  },

  formatTime(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },

  // Cleanup
  stop() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.energyInterval) clearInterval(this.energyInterval);
    Log.info(`[${this.name}] Enhanced Modul gestoppt`);
  },

  getStyles() {
    return ["MMM-SmartThings.css"];
  }
});
