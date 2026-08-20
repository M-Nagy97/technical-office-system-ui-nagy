export const environment = {
  production: true,
  apiBaseUrl: 'https://localhost:8500',
  defaultLang: 'ar',
  supportedLangs: ['ar', 'en'] as const,
};

export type Environment = typeof environment;
