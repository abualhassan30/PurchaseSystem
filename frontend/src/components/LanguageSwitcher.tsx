import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    try {
      const newLang = i18n.language === 'ar' ? 'en' : 'ar'
      
      // Set document direction immediately
      const html = document.documentElement
      const dir = newLang === 'ar' ? 'rtl' : 'ltr'
      html.setAttribute('dir', dir)
      html.setAttribute('lang', newLang)
      
      i18n.changeLanguage(newLang).catch((err) => {
        console.error('Failed to change language:', err)
      })
      
      // Safe localStorage access
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('i18nextLng', newLang)
          window.localStorage.setItem('lang', newLang)
        }
      } catch (error) {
        console.warn('Failed to save language preference:', error)
      }
    } catch (error) {
      console.error('Language toggle error:', error)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="ms-2"
    >
      {i18n.language === 'ar' ? 'English' : 'العربية'}
    </Button>
  )
}
