export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8400',
  defaultLang: 'ar',
  supportedLangs: ['ar', 'en'] as const,
};

export type Environment = typeof environment;
