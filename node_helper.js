const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-SmartThings] Node Helper gestartet");
    this.powerHistory = {};
    this.deviceStates = {};
  },

  socketNotificationReceived(notification, payload) {
    switch (notification) {
      case "GET_DEVICE_DATA":
        this.getSmartThingsData(payload);
        break;
      case "GET_POWER_HISTORY":
        this.getPowerHistory(payload);
        break;
    }
  },

  async getSmartThingsData(config) {
    try {
      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      // Alle konfigurierten Geräte abrufen
      const deviceDetails = await Promise.all(
        config.deviceIds.map(async deviceId => {
          try {
            // Geräte-Info abrufen
            const deviceResponse = await axios.get(
              `https://api.smartthings.com/v1/devices/${deviceId}`, 
              { headers }
            );
            
            // Status abrufen
            const statusResponse = await axios.get(
              `https://api.smartthings.com/v1/devices/${deviceId}/status`, 
              { headers }
            );

            const device = {
              deviceId: deviceId,
              name: deviceResponse.data.label || deviceResponse.data.name,
              type: deviceResponse.data.deviceTypeName,
              components: statusResponse.data.components
            };

            // Benachrichtigungen prüfen
            this.checkNotifications(device, config.notifications);

            return device;
          } catch (error) {
            console.error(`[MMM-SmartThings] Fehler bei Gerät ${deviceId}:`, error.message);
            return null;
          }
        })
      );

      // Null-Werte herausfiltern
      const validDevices = deviceDetails.filter(device => device !== null);

      this.sendSocketNotification("DEVICE_DATA", {
        devices: validDevices
      });

    } catch (error) {
      console.error("[MMM-SmartThings] Fehler beim Abrufen der Gerätedaten:", error.message);
      this.sendSocketNotification("ERROR", {
        message: `Fehler beim Abrufen der Daten: ${error.message}`
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

  // Hilfsfunktion für API-Aufrufe mit Retry-Logik
  async apiCall(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, { headers });
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Exponentieller Backoff
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Datenbereinigung für alte Einträge
  cleanupOldData() {
    const cutoffTime = new Date(Date.now() - (48 * 60 * 60 * 1000)); // 48h
    
    Object.keys(this.deviceStates).forEach(deviceId => {
      const state = this.deviceStates[deviceId];
      if (state.lastCheck && state.lastCheck < cutoffTime) {
        delete this.deviceStates[deviceId];
      }
    });
  }
});