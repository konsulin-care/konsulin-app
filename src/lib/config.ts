interface ServerConfig {
  APP_NAME: string;
  API_URL: string;
  API_BASE_PATH: string;
  APP_URL: string;
  APP_AUTH_PATH: string;
  WEBHOOK_AUTH: string;
  TERMINOLOGY_SERVER: string;
}

export const serverConfig: ServerConfig = {
  APP_NAME: process.env.APP_NAME ?? 'Konsulin',
  API_URL: process.env.API_URL ?? '',
  API_BASE_PATH: process.env.API_BASE_PATH ?? '/api/v1/auth',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  APP_AUTH_PATH: process.env.APP_AUTH_PATH ?? '/auth',
  TERMINOLOGY_SERVER: process.env.TERMINOLOGY_SERVER ?? ''
};
