import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Dynamically import messages (better for edge runtime)
  let messages = {};
  try {
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // Fallback to default locale if current locale fails
    if (locale !== defaultLocale) {
      try {
        messages = (await import(`./messages/${defaultLocale}.json`)).default;
      } catch (fallbackError) {
        console.error(`Failed to load fallback messages:`, fallbackError);
      }
    }
  }

  return {
    locale,
    messages,
  };
});
