import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'openapi.json',
  output: {
    path: 'src/api',
    clean: false,
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      baseUrl: false, // Stop HeyAPI from putting 'openapi.json' in the API route.
    },
  ]
});