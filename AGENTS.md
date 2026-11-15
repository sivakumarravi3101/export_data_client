# Project Context

## What this app does

This is a client-side Vue 3 and Vite application for exploring Indian export
statistics by destination country. Users select a destination on the home page
and then browse export products and related market insights for that country.

## Main user flow

1. `/` (`src/views/HomeView.vue`) loads available countries from the API and
   displays them through `DestinationSelect` alongside a Three.js globe.
2. Selecting a country navigates to `/country/:countryId`, passing its display
   name in the `name` query parameter.
3. `/country/:countryId` (`src/views/CountryView.vue`) loads that country's
   products. Users can filter by category, paginate, and select a product by
   its HS code.
4. Selecting a product stores its HS code in the `hs` query parameter and
   loads country-specific export-demand/market data and history.

## Architecture

- `src/views/`: route-level pages.
- `src/components/`: reusable page sections, selectors, product lists, and
  charts.
- `src/composables/`: reactive data loading and UI state, including products,
  demand, currency, and country imagery.
- `src/services/`: API and external-data access.
- `src/http/client.ts`: shared Axios client, configured with the API base URL
  and response-error toast handling.
- `src/models/`: TypeScript data contracts for API and view data.
- `src/lib/`: formatting, transformation, and chart helpers.
- `src/data/`: country coordinates and landmark mappings.
- `src/three/`: Three.js globe and animation code.
- `src/router/index.ts`: routes for the home page and country details.

The backend API base URL is supplied through `VITE_API_BASE_URL`. The main API
operations are country/category listing, paginated products by country, and
export-demand details by HS code and country. Currency rates are fetched from
Frankfurter, and country landmark images are fetched from Wikipedia.

## Development

- Use the existing Vue 3 Composition API with `<script setup lang="ts">` for
  Vue components.
- Prefer the `@/` alias for imports from `src/`.
- Keep API access in services and UI-specific asynchronous state in composables.
- Preserve the existing loading, error, retry, and stale-response handling
  patterns when changing data flows.
- Keep country and selected-product state reflected in the existing route
  parameters/query parameters.
- Use the existing CSS variables and component styles; avoid introducing a new
  styling system without a project requirement.

Useful commands:

- `npm run dev` — start the Vite development server.
- `npm run type-check` — type-check the Vue/TypeScript application.
- `npm run build` — type-check and create a production build.

Vitest-style test files exist at the repository root. Check the available
scripts and installed dependencies before assuming a test command is configured.
