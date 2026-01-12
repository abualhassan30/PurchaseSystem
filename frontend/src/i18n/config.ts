import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import translationAR from './locales/ar.json'
import translationEN from './locales/en.json'

// Safe localStorage access - no top-level unsafe access
const getFallbackLang = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('lang') || localStorage.getItem('i18nextLng') || 'ar'
    }
  } catch (error) {
    console.warn('localStorage access failed in i18n config:', error)
  }
  return 'ar'
}

// Function to set document direction based on language
const setDocumentDirection = (lang: string) => {
  if (typeof document !== 'undefined') {
    const html = document.documentElement
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    html.setAttribute('dir', dir)
    html.setAttribute('lang', lang)
  }
}

const fallbackLng = getFallbackLang()
setDocumentDirection(fallbackLng)

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: translationAR },
      en: { translation: translationEN },
    },
    lng: fallbackLng,
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    // Set initial direction
    setDocumentDirection(fallbackLng)
    
    // Listen for language changes
    i18n.on('languageChanged', (lng) => {
      setDocumentDirection(lng)
    })
  })
  .catch((err) => {
    console.error('❌ i18n initialization error:', err)
    // Continue with default language even if initialization fails
    i18n.changeLanguage('ar').catch(() => {
      console.error('Failed to set fallback language')
    })
  })

export default i18n
