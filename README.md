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

## Performance & Debug Options

| Option | Description |
|--------|-------------|
| `debug` | Enable debug mode with detailed console logging and debug tools.<br>**Type:** Boolean<br>**Default:** `false` |
| `enablePerformanceMonitoring` | Track render times, API calls, and memory usage.<br>**Type:** Boolean<br>**Default:** `true` |
| `cacheEnabled` | Enable intelligent data caching to reduce API calls.<br>**Type:** Boolean<br>**Default:** `true` |
| `showPerformanceStats` | Display performance statistics in the module header.<br>**Type:** Boolean<br>**Default:** `false` |

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
    },
    
    // Performance & Debug
    debug: false,
    enablePerformanceMonitoring: true,
    showPerformanceStats: false
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

### Debug and Performance Monitoring
```javascript
{
  module: "MMM-SmartThings",
  position: "bottom_right",
  config: {
    token: "your-token",
    deviceIds: ["device-1", "device-2"],
    debug: true,
    enablePerformanceMonitoring: true,
    showPerformanceStats: true,
    layout: "vertical"
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

## Debug Mode and Performance Monitoring

### Enabling Debug Mode

Set `debug: true` in your configuration to enable comprehensive debugging:

```javascript
config: {
  debug: true,
  enablePerformanceMonitoring: true,
  showPerformanceStats: true
}
```

### Debug Console Tools

When debug mode is enabled, access these tools in your browser console:

```javascript
// Get current performance metrics
window.MMM_SmartThings_Debug.getPerformance()

// View debug data from backend
window.MMM_SmartThings_Debug.getDebugData()

// Clear data cache manually
window.MMM_SmartThings_Debug.clearCache()

// Toggle performance stats display
window.MMM_SmartThings_Debug.togglePerformanceStats()
```

### Keyboard Shortcuts

When debug mode is active, use these keyboard shortcuts:

- **Ctrl+Shift+D** - Log debug information to console
- **Ctrl+Shift+C** - Clear data cache
- **Ctrl+Shift+P** - Toggle performance statistics display

### Performance Statistics

Enable `showPerformanceStats: true` to display real-time performance metrics:

- **Render Time** - DOM update duration in milliseconds
- **Backend Duration** - API call processing time
- **Cache Status** - HIT or MISS for data requests

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

/* Hide performance stats */
.mmm-smartthings .performance-stats {
  display: none;
}
```

## Performance Features

### Intelligent Caching
- **30-second TTL cache** reduces API calls significantly
- **Smart cache invalidation** ensures data freshness
- **Memory-efficient** caching with automatic cleanup

### API Optimization
- **Exponential backoff** retry logic (1s, 2s, 4s, max 10s)
- **Request rate limiting** prevents API throttling
- **Timeout protection** (10-second request timeout)
- **Concurrent request management** with proper delays

### Memory Management
- **Automatic cleanup** every 10 minutes
- **Bounded collections** prevent memory leaks
- **Garbage collection** triggers when available
- **Memory usage tracking** for monitoring

### Error Recovery
- **Graceful degradation** when services are unavailable
- **Detailed error logging** for troubleshooting
- **Automatic retry** with intelligent backoff
- **User-friendly error messages** with actionable information

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

## Troubleshooting

### Common Issues

**"Token fehlt" Error**
- Verify your token is correctly set in the configuration
- Ensure the token has the required permissions
- Check token expiration in SmartThings Developer Console

**Devices Not Appearing**
- Check device IDs in browser developer console
- Test device IDs directly with the SmartThings API
- Verify devices are online in the SmartThings app
- Enable debug mode for detailed logging

**Charts Not Displaying**
- Ensure Chart.js is loading properly (check browser console)
- Verify `powerDeviceIds` are configured correctly
- Check that devices actually report power consumption
- Confirm devices support the `powerMeter` capability

**Poor Performance**
- Check `showPerformanceStats` for bottleneck identification
- Reduce `updateInterval` if updates are too frequent
- Enable caching with `cacheEnabled: true`
- Consider using `compactMode` for many devices

### Debug Mode Steps

1. **Enable Debug Mode**
   ```javascript
   config: {
     debug: true,
     enablePerformanceMonitoring: true
   }
   ```

2. **Check Browser Console**
   - Look for detailed logs prefixed with `[MMM-SmartThings DEBUG]`
   - Monitor API call success/failure rates
   - Check for memory usage warnings

3. **Use Debug Tools**
   ```javascript
   // In browser console
   window.MMM_SmartThings_Debug.getPerformance()
   window.MMM_SmartThings_Debug.getDebugData()
   ```

4. **Performance Analysis**
   - Enable `showPerformanceStats: true`
   - Monitor render times (should be < 100ms)
   - Check cache hit rates (should be > 80%)
   - Watch for memory leaks in long running sessions

### Advanced Debugging

**API Call Monitoring**
```javascript
// Check recent API calls
window.MMM_SmartThings_Debug.getDebugData().apiCalls
```

**Memory Usage Tracking**
```javascript
// Monitor memory consumption
window.MMM_SmartThings_Debug.getPerformance().memoryUsage
```

**Cache Analysis**
```javascript
// Cache performance metrics
window.MMM_SmartThings_Debug.getDebugData().cache
```

### Performance Benchmarks

For optimal performance, aim for these targets:

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Render Time | < 100ms | Enable compact mode, reduce devices |
| API Duration | < 2000ms | Check network, enable caching |
| Memory Usage | < 50MB | Restart module, check for leaks |
| Cache Hit Rate | > 80% | Increase cache TTL, optimize intervals |

### Log Output

Check MagicMirror logs for detailed error information:
```bash
pm2 logs mm
```

## For Module Developers

This module broadcasts notifications when device data is updated and provides a comprehensive API for other modules.

### Broadcast Notifications

**Device Data Updates**
```javascript
// Listen for device updates
this.socketNotificationReceived = function(notification, payload) {
  if (notification === "SMARTTHINGS_UPDATE") {
    // payload.devices contains all device data
    // payload.performance contains timing information
  }
}
```

**Performance Data**
```javascript
// Access performance metrics
this.socketNotificationReceived = function(notification, payload) {
  if (notification === "SMARTTHINGS_PERFORMANCE") {
    // payload.renderTime, payload.apiDuration, etc.
  }
}
```

### Debug Integration

Other modules can integrate with the debug system:

```javascript
// Check if SmartThings debug mode is active
if (window.MMM_SmartThings_Debug) {
  // Access shared performance data
  const perfData = window.MMM_SmartThings_Debug.getPerformance();
}
```

### API Extensions

The module provides these extension points:

- **Custom Device Processing** - Hook into device data processing
- **Notification Filtering** - Custom notification logic
- **Performance Monitoring** - Shared performance metrics
- **Cache Integration** - Leverage existing cache system

## Credits

Developed for the MagicMirror² platform. Uses the Samsung SmartThings API, Chart.js for visualizations, and Font Awesome for icons.

## Changelog

### Version 1.1.0 (Current)
- ✨ Completely redesigned user interface with modern card-based design
- 📊 Interactive power consumption charts with Chart.js integration
- 🔔 Intelligent notifications system with smart appliance detection
- 🎨 Multiple themes (Default, Dark, Colorful) and layout options (Vertical, Horizontal, Grid)
- 📱 Responsive design optimized for all screen sizes including Raspberry Pi
- 🛠️ Enhanced error handling with exponential backoff and graceful degradation
- ⚡ Performance optimizations including intelligent caching and memory management
- 🎯 Advanced device recognition and categorization with SVG icon system
- 🔧 Comprehensive configuration options with 25+ customizable parameters
- 📈 Historical data visualization with configurable time ranges
- 🚨 Real-time alerts and proactive monitoring
- 🐛 **Debug mode** with detailed logging and browser console tools
- 📊 **Performance monitoring** with render time tracking and API call analysis
- 💾 **Intelligent caching** system with 30-second TTL and smart invalidation
- 🔄 **Automatic retry logic** with exponential backoff for reliable operation
- 🧹 **Memory management** with automatic cleanup and garbage collection
- ⌨️ **Keyboard shortcuts** for debug operations (Ctrl+Shift+D/C/P)
- 📈 **Real-time performance stats** display option
- 🎛️ **Debug console tools** for advanced troubleshooting
- 🔍 **API call monitoring** with success/failure rate tracking

### Version 1.0.0
- Initial release with basic SmartThings integration