export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8400',
  defaultLang: 'ar',
  supportedLangs: ['ar', 'en'] as const,
};

export type Environment = typeof environment;
