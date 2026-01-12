import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, X, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SearchableSelectOption {
  value: number | string
  label: string
  searchText?: string // Additional text to search in (e.g., Arabic name when showing English)
  code?: string // Item code for search
  subtitle?: string // Additional info to display (e.g., item code)
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: number | string
  onChange: (value: number | string) => void
  placeholder?: string
  required?: boolean
  dir?: 'ltr' | 'rtl'
  className?: string
  disabled?: boolean
  onSelect?: () => void // Callback when item is selected (for auto-focus next field)
  showLoading?: boolean
}

// Highlight matching text in search results
const HighlightText = ({ text, searchTerm, dir }: { text: string; searchTerm: string; dir: 'ltr' | 'rtl' }) => {
  if (!searchTerm) return <span>{text}</span>
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return (
    <span style={{ direction: dir }}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-secondary-200 text-secondary-900 font-medium px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}

export const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  ({ options, value, onChange, placeholder = 'Select...', dir = 'ltr', className, disabled = false, onSelect, showLoading = false }) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState('')
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const listRef = React.useRef<HTMLUListElement>(null)
    const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number; width: number } | null>(null)

    // Treat empty string, null, or undefined as empty value (but allow 0 as valid value)
    const isEmpty = value === '' || value === null || value === undefined
    const selectedOption = isEmpty ? null : options.find(opt => opt.value === value)

    // Enhanced filtering with fuzzy search, multi-language, and code support
    // Filter out only null/undefined/empty string options (allow 0 as valid value)
    const filteredOptions = React.useMemo(() => {
      const validOptions = options.filter(opt => opt.value !== '' && opt.value !== null && opt.value !== undefined)
      if (!searchTerm.trim()) return validOptions
      
      const term = searchTerm.toLowerCase().trim()
      const searchWords = term.split(/\s+/).filter(w => w.length > 0)
      
      return validOptions
        .map(opt => {
          const labelLower = opt.label.toLowerCase()
          const searchTextLower = opt.searchText?.toLowerCase() || ''
          const codeLower = opt.code?.toLowerCase() || ''
          const combinedText = `${labelLower} ${searchTextLower} ${codeLower}`.trim()
          
          // Calculate match score
          let score = 0
          let matches = false
          
          // Code exact match gets highest score
          if (codeLower === term) {
            score = 100
            matches = true
          }
          // Code starts with search term
          else if (codeLower.startsWith(term)) {
            score = 95
            matches = true
          }
          // Name exact match
          else if (labelLower === term || searchTextLower === term) {
            score = 90
            matches = true
          }
          // Name starts with search term
          else if (labelLower.startsWith(term) || searchTextLower.startsWith(term)) {
            score = 80
            matches = true
          }
          // Code contains search term
          else if (codeLower.includes(term)) {
            score = 70
            matches = true
          }
          // Contains all words
          else if (searchWords.every(word => combinedText.includes(word))) {
            score = 60
            matches = true
          }
          // Contains search term
          else if (labelLower.includes(term) || searchTextLower.includes(term)) {
            score = 40
            matches = true
          }
          // Fuzzy match (characters in order)
          else {
            let labelIndex = 0
            let searchIndex = 0
            while (labelIndex < labelLower.length && searchIndex < term.length) {
              if (labelLower[labelIndex] === term[searchIndex]) {
                searchIndex++
              }
              labelIndex++
            }
            if (searchIndex === term.length) {
              score = 20
              matches = true
            }
          }
          
          return { option: opt, score, matches }
        })
        .filter(item => item.matches)
        .sort((a, b) => b.score - a.score)
        .map(item => item.option)
    }, [options, searchTerm])

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        // Check if click is inside container or dropdown list (portal)
        const isInsideContainer = containerRef.current?.contains(target)
        const isInsideDropdown = listRef.current?.contains(target)
        
        // Don't close if clicking inside the dropdown or container
        if (!isInsideContainer && !isInsideDropdown) {
          setIsOpen(false)
          setSearchTerm('')
          setHighlightedIndex(-1)
        }
      }

      if (isOpen) {
        // Use capture phase to catch events before they bubble
        document.addEventListener('mousedown', handleClickOutside, true)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside, true)
        }
      }
    }, [isOpen])

    // Focus input when dropdown opens
    React.useEffect(() => {
      if (isOpen && inputRef.current) {
        // Small delay to ensure smooth animation
        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 50)
      }
    }, [isOpen])

    // Calculate dropdown position when opening
    React.useEffect(() => {
      if (isOpen && containerRef.current) {
        const updatePosition = () => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setDropdownPosition({
              top: rect.bottom + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width
            })
          }
        }
        updatePosition()
        window.addEventListener('scroll', updatePosition, true)
        window.addEventListener('resize', updatePosition)
        return () => {
          window.removeEventListener('scroll', updatePosition, true)
          window.removeEventListener('resize', updatePosition)
        }
      } else {
        setDropdownPosition(null)
      }
    }, [isOpen, dir])

    // Scroll highlighted item into view
    React.useEffect(() => {
      if (highlightedIndex >= 0 && listRef.current) {
        const items = listRef.current.querySelectorAll('li')
        if (items[highlightedIndex]) {
          items[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      }
    }, [highlightedIndex])

    // Reset highlighted index when filtered options change
    React.useEffect(() => {
      if (filteredOptions.length > 0 && highlightedIndex >= filteredOptions.length) {
        setHighlightedIndex(0)
      } else if (filteredOptions.length === 0) {
        setHighlightedIndex(-1)
      }
    }, [filteredOptions.length, highlightedIndex])

    const handleSelect = (optionValue: number | string) => {
      // Prevent any event bubbling that might interfere
      // Ensure the value is set immediately
      try {
        onChange(optionValue)
        // Close dropdown and reset state
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
        // Call onSelect callback for auto-focus next field
        if (onSelect) {
          setTimeout(() => onSelect(), 100)
        }
      } catch (error) {
        console.error('Error in handleSelect:', error)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex].value)
          } else if (filteredOptions.length === 1) {
            handleSelect(filteredOptions[0].value)
          } else if (filteredOptions.length > 0 && highlightedIndex === -1) {
            setHighlightedIndex(0)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => {
            if (prev < filteredOptions.length - 1) {
              return prev + 1
            }
            return prev >= 0 ? prev : 0
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => {
            if (prev > 0) {
              return prev - 1
            }
            return -1
          })
          break
        case 'Escape':
          setIsOpen(false)
          setSearchTerm('')
          setHighlightedIndex(-1)
          break
        case 'Tab':
          e.preventDefault()
          e.stopPropagation()
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex].value)
          } else if (filteredOptions.length === 1) {
            handleSelect(filteredOptions[0].value)
          } else if (filteredOptions.length > 0 && highlightedIndex === -1) {
            setHighlightedIndex(0)
          } else {
            setIsOpen(false)
            setSearchTerm('')
            setHighlightedIndex(-1)
          }
          break
        case 'Home':
          e.preventDefault()
          setHighlightedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setHighlightedIndex(filteredOptions.length - 1)
          break
      }
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(0)
      setSearchTerm('')
      if (isOpen) {
        inputRef.current?.focus()
      }
    }

    return (
      <div 
        ref={containerRef}
        className={cn('relative w-full searchable-select-container', className)}
        dir={dir}
        data-open={isOpen}
        style={{ zIndex: isOpen ? 9999 : 1 }}
      >
        <div
          className={cn(
            'w-full rounded-md border bg-white text-xs flex items-center transition-all duration-200',
            'border-gray-300',
            isOpen && 'border-secondary-600 ring-2 ring-secondary-600 ring-opacity-20 shadow-sm',
            !isOpen && !disabled && 'hover:border-secondary-500 hover:shadow-sm cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            'focus-within:border-secondary-600',
            className?.includes('h-12') ? 'h-12' : 'h-8'
          )}
          style={className?.includes('h-12') ? { minHeight: '48px' } : undefined}
          onClick={(e) => {
            // Only toggle if clicking on the container itself, not on input or buttons
            if (!disabled && !isOpen && e.target === e.currentTarget) {
              setIsOpen(true)
            } else if (!disabled && !isOpen) {
              // If clicking on child elements when closed, open it
              const target = e.target as HTMLElement
              if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                setIsOpen(true)
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!disabled && !isOpen) {
                setIsOpen(true)
              }
            }
          }}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div 
            className="flex-1 px-2 py-1.5 overflow-hidden flex items-center gap-1.5"
            onClick={(e) => {
              // Prevent closing when clicking inside the input area
              if (isOpen) {
                e.stopPropagation()
              }
            }}
          >
            {isOpen && (
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 pointer-events-none" />
            )}
            {isOpen ? (
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setHighlightedIndex(-1)
                }}
                onKeyDown={(e) => {
                  handleKeyDown(e)
                  e.stopPropagation()
                }}
                onFocus={(e) => {
                  e.stopPropagation()
                }}
                onBlur={(e) => {
                  // Don't close on blur - let click outside handler manage it
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onMouseDown={(e) => {
                  // Prevent the click from bubbling up
                  e.stopPropagation()
                }}
                className="w-full outline-none bg-transparent text-xs placeholder:text-gray-400"
                placeholder={placeholder}
                style={{
                  textAlign: dir === 'rtl' ? 'right' : 'left',
                  direction: dir
                }}
              />
            ) : (
              <span 
                className={cn(
                  'block truncate text-xs transition-colors',
                  !selectedOption && 'text-gray-500',
                  selectedOption && 'text-gray-900'
                )}
                style={{
                  textAlign: dir === 'rtl' ? 'right' : 'left',
                  direction: dir
                }}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            )}
          </div>
          <div 
            className="flex items-center px-1 gap-0.5"
            onClick={(e) => {
              // Prevent closing when clicking on buttons
              if (isOpen) {
                e.stopPropagation()
              }
            }}
          >
            {!isEmpty && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear(e)
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                className="p-0.5 hover:bg-secondary-100 rounded transition-colors duration-150 group"
                tabIndex={-1}
                onMouseEnter={(e) => e.currentTarget.classList.add('bg-secondary-100')}
                onMouseLeave={(e) => e.currentTarget.classList.remove('bg-secondary-100')}
              >
                <X className="w-3 h-3 text-gray-400 group-hover:text-secondary-600 transition-colors" />
              </button>
            )}
            <ChevronDown 
              className={cn(
                'w-4 h-4 text-gray-400 transition-all duration-200 flex-shrink-0 pointer-events-none',
                isOpen && 'transform rotate-180 text-secondary-600',
                !disabled && !isOpen && 'group-hover:text-secondary-500'
              )}
            />
          </div>
        </div>

        {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
          <ul
            ref={listRef}
            className="fixed mt-1 max-h-60 overflow-auto rounded-md border border-gray-300 bg-white shadow-xl text-xs searchable-select-dropdown"
            style={{
              zIndex: 99999,
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              animation: 'fadeIn 0.2s ease-out',
              transformOrigin: 'top center'
            }}
            role="listbox"
          >
            {showLoading ? (
              <li className="px-3 py-3 text-gray-500 text-center" style={{ direction: dir }}>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-secondary-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-gray-500 text-center" style={{ direction: dir }}>
                <div className="flex flex-col items-center gap-1">
                  <span>No results found</span>
                  {searchTerm && (
                    <span className="text-xs text-gray-400">Try a different search term</span>
                  )}
                </div>
              </li>
            ) : (
              <>
                {searchTerm && (
                  <li className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100 bg-gray-50" style={{ direction: dir }}>
                    {filteredOptions.length} {filteredOptions.length === 1 ? 'result' : 'results'} found
                  </li>
                )}
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    className={cn(
                      'px-3 py-2.5 cursor-pointer transition-all duration-150',
                      'first:rounded-t-md last:rounded-b-md',
                      option.value === value && 'bg-secondary-600 text-white font-medium',
                      option.value !== value && [
                        'hover:bg-secondary-50',
                        'hover:text-secondary-900',
                        'hover:font-medium',
                        'active:bg-secondary-100'
                      ],
                      highlightedIndex === index && option.value !== value && 'bg-secondary-100 text-secondary-900 font-medium',
                      highlightedIndex === index && option.value === value && 'ring-2 ring-white ring-opacity-50'
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevent blur on input
                      e.stopPropagation()
                      // Select immediately on mousedown
                      handleSelect(option.value)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Backup selection on click (in case mousedown didn't fire)
                      if (value !== option.value) {
                        handleSelect(option.value)
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={option.value === value}
                    style={{ direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          <HighlightText 
                            text={option.label} 
                            searchTerm={searchTerm} 
                            dir={dir}
                          />
                        </div>
                        {option.code && (
                          <div className="text-xs mt-0.5 opacity-80 flex items-center gap-1">
                            <span className="font-mono text-gray-600">{t('common.code')}:</span>
                            <span className="font-mono font-semibold">
                              <HighlightText 
                                text={option.code} 
                                searchTerm={searchTerm} 
                                dir="ltr"
                              />
                            </span>
                          </div>
                        )}
                        {option.searchText && searchTerm && (
                          <div className="text-xs opacity-70 mt-0.5">
                            <HighlightText 
                              text={option.searchText} 
                              searchTerm={searchTerm} 
                              dir={dir}
                            />
                          </div>
                        )}
                        {option.subtitle && (
                          <div className="text-xs opacity-70 mt-0.5">
                            {option.subtitle}
                          </div>
                        )}
                      </div>
                      {option.value === value && (
                        <div className="flex-shrink-0 text-white">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </>
            )}
          </ul>,
          document.body
        )}
      </div>
    )
  }
)

SearchableSelect.displayName = 'SearchableSelect'
