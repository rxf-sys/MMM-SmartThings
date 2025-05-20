# MMM-SmartThings

MMM-SmartThings is a comprehensive smart home module for MagicMirror².

It displays real-time device status, power consumption charts, and intelligent notifications using data from the Samsung SmartThings API.

## Screenshot

![MMM-SmartThings Screenshot](screenshot.png)

## Installation

1. Navigate into your MagicMirror modules folder and execute `git clone https://github.com/example/MMM-SmartThings.git`
2. Enter the new MMM-SmartThings directory and execute `npm install`

## Configuration

At a minimum you need to supply the following required configuration parameters:

- `token`
- `deviceIds`

The `token` needs to be specified as a String, while `deviceIds` should be an Array of device IDs.

You need to create a Personal Access Token with SmartThings: https://smartthings.developer.samsung.com/workspace/

Example configuration:

```javascript
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    token: "your-smartthings-token-here",
    deviceIds: [
      "device-id-1", 
      "device-id-2",
      "device-id-3"
    ]
  }
}
```

To find your device IDs, use:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.smartthings.com/v1/devices
```

## Configuration Options

| Option | Description |
|--------|-------------|
| `token` | **Required.** Your SmartThings Personal Access Token.<br>**Type:** String |
| `deviceIds` | **Required.** Array of SmartThings device IDs to display.<br>**Type:** Array<br>**Default:** `[]` |
| `updateInterval` | How frequently, in milliseconds, to poll for device data.<br>**Type:** Number<br>**Default:** `60000` (1 minute) |
| `chartUpdateInterval` | How frequently, in milliseconds, to update power consumption charts.<br>**Type:** Number<br>**Default:** `300000` (5 minutes) |
| `showIcons` | Whether to show device type icons.<br>**Type:** Boolean<br>**Default:** `true` |
| `showChart` | Whether to show power consumption charts.<br>**Type:** Boolean<br>**Default:** `true` |
| `showLastUpdate` | Whether to show the last update timestamp.<br>**Type:** Boolean<br>**Default:** `true` |
| `maxDevices` | Maximum number of devices to display.<br>**Type:** Number<br>**Default:** `10` |
| `compactMode` | Whether to use compact display mode with less detail.<br>**Type:** Boolean<br>**Default:** `false` |
| `layout` | Display layout for devices. One of: `"vertical"`, `"horizontal"`, or `"grid"`.<br>**Type:** String<br>**Default:** `"vertical"` |
| `theme` | Visual theme. One of: `"default"`, `"dark"`, or `"colorful"`.<br>**Type:** String<br>**Default:** `"default"` |
| `chartHistoryHours` | Number of hours of historical data to show in charts.<br>**Type:** Number<br>**Default:** `24` |
| `powerDeviceIds` | Array of device IDs that support power monitoring for charts.<br>**Type:** Array<br>**Default:** `[]` |

## Notification Options

Configure which types of notifications to receive:

| Option | Description |
|--------|-------------|
| `notifications.enabled` | Whether to enable notifications.<br>**Type:** Boolean<br>**Default:** `true` |
| `notifications.washingMachine` | Notify when washing machine cycle completes.<br>**Type:** Boolean<br>**Default:** `true` |
| `notifications.dryer` | Notify when dryer cycle completes.<br>**Type:** Boolean<br>**Default:** `true` |
| `notifications.lowBattery` | Notify when device battery is low (< 20%).<br>**Type:** Boolean<br>**Default:** `true` |
| `notifications.doorOpen` | Notify when doors/windows are opened.<br>**Type:** Boolean<br>**Default:** `true` |

## Supported Device Types

- **Switches and Outlets** - Smart plugs, wall switches
- **Power Meters** - Energy monitoring devices  
- **Temperature & Humidity Sensors** - Environmental monitoring
- **Contact Sensors** - Door and window sensors
- **Motion Sensors** - Movement detection
- **Battery Devices** - Battery-powered sensors
- **Appliances** - Washing machines, dryers
- **Lighting** - Smart bulbs and dimmers

## Themes

### Default Theme
Clean, minimal design with subtle colors and transparency effects.

### Dark Theme  
High-contrast dark theme with enhanced readability for dark environments.

### Colorful Theme
Color-coded devices by type with gradient backgrounds and visual emphasis.

## Layout Options

### Vertical Layout
Devices are stacked vertically in a single column. Best for side positions like `top_left` or `top_right`.

### Horizontal Layout
Devices are arranged horizontally in rows. Good for `top_center` or `bottom_center` positions.

### Grid Layout
Devices are arranged in an automatic grid pattern. Ideal for `middle_center` when displaying many devices.

## Sample Configuration

```javascript
{
  module: "MMM-SmartThings",
  position: "top_right",
  header: "Smart Home",
  config: {
    token: "your-smartthings-token-here",
    deviceIds: [
      "switch-living-room",
      "sensor-front-door", 
      "washing-machine",
      "power-meter-kitchen"
    ],
    
    updateInterval: 30000,
    chartUpdateInterval: 300000,
    
    showIcons: true,
    showChart: true,
    showLastUpdate: true,
    maxDevices: 8,
    compactMode: false,
    
    layout: "vertical",
    theme: "colorful",
    
    chartHistoryHours: 48,
    powerDeviceIds: [
      "power-meter-kitchen",
      "washing-machine"
    ],
    
    notifications: {
      enabled: true,
      washingMachine: true,
      dryer: true,
      lowBattery: true,
      doorOpen: false
    }
  }
}
```

## Advanced Configuration Examples

### Minimal Configuration
```javascript
{
  module: "MMM-SmartThings",
  position: "bottom_left",
  config: {
    token: "your-token",
    deviceIds: ["device-1", "device-2"],
    compactMode: true,
    showChart: false,
    layout: "horizontal"
  }
}
```

### Power Monitoring Focus
```javascript
{
  module: "MMM-SmartThings", 
  position: "middle_center",
  config: {
    token: "your-token",
    deviceIds: ["power-device-1"],
    powerDeviceIds: ["power-device-1"],
    showChart: true,
    chartHistoryHours: 72,
    layout: "vertical",
    theme: "dark"
  }
}
```

### Grid Layout for Many Devices
```javascript
{
  module: "MMM-SmartThings",
  position: "top_center", 
  config: {
    token: "your-token",
    deviceIds: ["dev-1", "dev-2", "dev-3", "dev-4", "dev-5", "dev-6"],
    layout: "grid",
    maxDevices: 20,
    compactMode: true,
    theme: "colorful"
  }
}
```

## Getting Your SmartThings Token

1. Go to the [SmartThings Developer Console](https://smartthings.developer.samsung.com/workspace/)
2. Click on "Personal Access Tokens"
3. Create a new token with these permissions:
   - `r:devices:*` (Read devices)
   - `r:deviceprofiles:*` (Read device profiles)  
   - `r:events:*` (Read events)
4. Copy the generated token to your configuration

## Finding Device IDs

Use the SmartThings API to list all your devices:

```bash
# List all devices
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices

# Get detailed info for a specific device
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices/DEVICE_ID

# Check device status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices/DEVICE_ID/status
```

You can also use tools like `jq` to format the output:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.smartthings.com/v1/devices | \
     jq '.items[] | {deviceId, label, deviceTypeName}'
```

## Styling

This module is responsive and adapts to different screen sizes automatically. You can customize the appearance by adding CSS to your `custom.css` file:

```css
/* Adjust module width */
.mmm-smartthings {
  max-width: 400px;
}

/* Customize device cards */
.mmm-smartthings .device {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

/* Custom theme */
.mmm-smartthings.my-custom-theme .device {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
}
```

## Troubleshooting

### Common Issues

**"Token fehlt" Error**
- Verify your token is correctly set in the configuration
- Ensure the token has the required permissions

**Devices Not Appearing**
- Check device IDs in browser developer console
- Test device IDs directly with the SmartThings API
- Verify devices are online in the SmartThings app

**Charts Not Displaying**
- Ensure Chart.js is loading properly
- Verify `powerDeviceIds` are configured correctly
- Check that devices actually report power consumption

### Debug Mode

Enable debug output by adding this to your browser console:
```javascript
localStorage.setItem('mmm-smartthings-debug', 'true');
```

### Log Output

Check MagicMirror logs for detailed error information:
```bash
pm2 logs mm
```

## For Module Developers

This module broadcasts notifications when device data is updated. The notification is `SMARTTHINGS_UPDATE` and the payload contains the device data array from the SmartThings API.

## Credits

Developed for the MagicMirror² platform. Uses the Samsung SmartThings API, Chart.js for visualizations, and Font Awesome for icons.

## Changelog

### Version 1.0.0
- Initial release with basic SmartThings integration