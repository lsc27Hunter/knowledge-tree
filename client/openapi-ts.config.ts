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
      // Don't infer a base URL from the local openapi.json path.
      baseUrl: false,
      runtimeConfigPath: './src/apiClientConfig',
    },
  ]
});
