import i18n from '@/i18n/config'

/**
 * Get the localized name from an object with nameAr and nameEn properties
 * Falls back to name property if multilingual fields don't exist
 * @param item - Object with nameAr, nameEn, or name property
 * @returns The name in the current language
 */
export const getLocalizedName = (item: {
  nameAr?: string
  nameEn?: string
  name?: string
}): string => {
  const isArabic = i18n.language === 'ar'
  
  if (item.nameAr && item.nameEn) {
    return isArabic ? item.nameAr : item.nameEn
  }
  
  // Fallback to single name field for backward compatibility
  return item.name || item.nameAr || item.nameEn || ''
}

/**
 * Get localized category name
 */
export const getLocalizedCategoryName = (category: {
  categoryNameAr?: string
  categoryNameEn?: string
  category?: string
}): string => {
  const isArabic = i18n.language === 'ar'
  
  if (category.categoryNameAr && category.categoryNameEn) {
    return isArabic ? category.categoryNameAr : category.categoryNameEn
  }
  
  return category.category || ''
}
