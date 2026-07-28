# FlowMate SAP Cloud Integration Toolkit

Your SAP CPI Productivity Toolkit — a browser extension for SAP Cloud Platform Integration (CPI).

## Features

- 📊 **Export Message Usage Data** - Download message consumption statistics as CSV
- 🏢 **Multi-Tenant Support** - Manage multiple customers with different CPI instances
- 📅 **Flexible Date Ranges** - Select custom date ranges or use quick presets
- ⚡ **Batch Export** - Export data from multiple tenants simultaneously
- 🔍 **Inline Trace** - Advanced debugging capabilities with Inline Trace
- 🛠️ **Design Time Tools** - Additional productivity enhancements directly in the CPI flow designer
- 🔐 **Secure** - Uses existing browser sessions, no credentials stored

## Installation

### Development Mode

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server with hot reload:
   ```bash
   npm run dev
   ```

3. Load extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `.output/chrome-mv3-dev` folder

### Production Build

```bash
npm run build
```

Load the `.output/chrome-mv3` folder as unpacked extension.

## Usage

### 1. Configure Tenants

1. Click the extension icon → "Open Settings"
2. Add customers and their CPI tenant URLs
   - Customer name (e.g., "Acme Corp")
   - Tenant URLs (e.g., `https://xxx-dev-acme-integration.integrationsuite.cfapps.eu10-003.hana.ondemand.com`)

### 2. Export Data

1. Navigate to CPI **Message Usage** page: `/shell/monitoring/MessageUsage`
2. Click **"Export Data"** button
3. Select date range (presets or custom)
4. Choose: Current Tenant or All Tenants
5. Click **"Start Export"**

## Technical Stack

- **Framework**: [WXT](https://wxt.dev/)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & DaisyUI
- **Target**: Chrome MV3

## Development

Hot reload enabled - changes apply automatically without manual reload!

**Debugging:**
- Content: DevTools on CPI page
- Background: `chrome://extensions/` → "Service worker"

## Credits & Acknowledgements

Feature ideas were inspired by [CPI-Helper-Chrome-Extension](https://github.com/dbeck121/CPI-Helper-Chrome-Extension)
by dbeck121. FlowMate is an independent implementation with its own codebase.

## License

This project is licensed under the **GNU General Public License v3.0** (GPLv3).

