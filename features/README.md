# FlowMate - Feature Structure

This directory contains the modular features of FlowMate.

## Structure

```
features/
├── message-usage/       # Message Usage Data Export Feature
│   ├── index.ts         # Public API
│   ├── MessageUsageButton.ts
│   ├── DateRangeDialog.ts
│   └── csv-exporter.ts
│
├── settings/            # Settings & Configuration Feature
│   ├── index.ts         # Public API
│   ├── settings.ts      # Storage & management
│   └── validators.ts    # URL & name validation
│
└── shared/              # Shared Utilities
    ├── index.ts         # Public API
    ├── api-client.ts    # SAP CPI API client
    ├── i18n.ts          # Internationalization
    ├── icons.ts         # Lucide icon helpers
    └── navigation.ts    # SPA navigation detection

```

## Best Practices

1. **Feature Isolation**: Each feature is self-contained with its own logic
2. **Shared Utilities**: Common code lives in `shared/`
3. **Public APIs**: Each feature exports through `index.ts`
4. **Import Paths**: Use `@/features/` prefix for clean imports

## Adding a New Feature

1. Create directory: `features/your-feature/`
2. Add `index.ts` for public exports
3. Import using: `import { Something } from '@/features/your-feature'`
