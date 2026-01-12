import i18n from '@/i18n/config'

/**
 * Convert Arabic-Indic numerals (٠-٩) to English numerals (0-9)
 * @param str - String that may contain Arabic-Indic numerals
 * @returns String with English numerals
 */
const convertToEnglishNumerals = (str: string): string => {
  const arabicIndicMap: { [key: string]: string } = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  }
  
  return str.replace(/[٠-٩]/g, (char) => arabicIndicMap[char] || char)
}

/**
 * Format a number according to the current locale
 * Always uses English numerals (0-9) even when Arabic is selected
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (value: number | string | null | undefined, decimals: number = 2): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0
  
  // Always use English numerals (latn numbering system) even for Arabic
  // Use 'en-US' locale for number formatting to ensure English numerals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Format a date according to the current locale
 * Always uses English numerals (0-9) even when Arabic is selected
 * @param dateString - The date string to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const isArabic = i18n.language === 'ar'
    
    // Use Arabic locale for date format but ensure English numerals
    const locale = isArabic ? 'ar-SA' : 'en-US'
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
    
    const formatOptions = { ...defaultOptions, ...options }
    const formatted = date.toLocaleDateString(locale, formatOptions)
    
    // Always convert Arabic-Indic numerals to English numerals
    return convertToEnglishNumerals(formatted)
  } catch {
    return String(dateString)
  }
}

/**
 * Format currency according to the current locale
 * Always uses English numerals (0-9) even when Arabic is selected
 * @param value - The number to format as currency
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string | null | undefined, currency: string = 'USD'): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0
  
  // Always use English numerals for currency formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
