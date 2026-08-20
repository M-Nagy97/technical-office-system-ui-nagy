export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:8500',
  defaultLang: 'ar',
  supportedLangs: ['ar', 'en'] as const,
};

export type Environment = typeof environment;
