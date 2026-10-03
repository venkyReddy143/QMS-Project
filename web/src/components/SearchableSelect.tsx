import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  subLabel?: string
  badge?: string
}

interface SearchableSelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  className?: string
  id?: string
  allowClear?: boolean
  size?: 'xs' | 'sm' | 'md'
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  allowClear = false,
  size = 'md',
}: SearchableSelectProps) {
  const generatedId = useId()
  const selectId = id || generatedId
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const lower = searchTerm.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(lower)) ||
        (opt.badge && opt.badge.toLowerCase().includes(lower)),
    )
  }, [options, searchTerm])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function handleSelect(optionValue: string) {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
  }

  return (
    <div className={`relative ${className} ${isOpen ? 'z-30' : ''}`} ref={containerRef}>
      {label ? (
        <label
          htmlFor={selectId}
          className={`${
            size === 'xs'
              ? 'mb-1 text-[10px] uppercase tracking-wider text-muted'
              : size === 'sm'
                ? 'mb-1 text-xs text-foreground'
                : 'mb-1.5 text-sm text-foreground'
          } block font-bold`}
        >
          {label} {required && <span className="text-danger">*</span>}
        </label>
      ) : null}

      <div
        id={selectId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev)
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            setIsOpen(true)
          } else if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={`flex ${
          size === 'xs'
            ? 'min-h-8 h-8 px-2.5 text-xs rounded-lg'
            : size === 'sm'
              ? 'min-h-9 h-9 px-2.5 text-xs rounded-lg'
              : 'min-h-12 px-3 text-base rounded-xl'
        } w-full cursor-pointer items-center justify-between border outline-none transition ${
          disabled
            ? 'cursor-not-allowed border-border/50 bg-surface-muted/50 opacity-60 text-muted'
            : error
              ? 'border-danger bg-red-50/20 text-foreground ring-1 ring-danger/30'
              : isOpen
                ? 'border-accent bg-surface ring-2 ring-accent/20 text-foreground'
                : 'border-border bg-surface-muted hover:border-accent/60 text-foreground'
        }`}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {selectedOption ? (
            <div className="truncate">
              <span className="font-medium">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="ml-2 text-xs text-muted">
                  ({selectedOption.subLabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 pl-2">
          {allowClear && selectedOption && selectedOption.value !== '' && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-0.5 text-muted hover:bg-surface hover:text-foreground"
              title="Clear selection"
            >
              <X className={size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </button>
          )}
          <ChevronDown
            className={`${size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-accent' : ''
            }`}
          />
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-xs font-semibold text-danger">{error}</p>
      ) : null}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xl backdrop-blur-md">
          {/* Search Box */}
          <div className="border-b border-border p-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                  } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault()
                    handleSelect(filteredOptions[0].value)
                  }
                }}
                placeholder="Search..."
                className={`w-full rounded-lg border border-border bg-surface-muted ${
                  size === 'xs' || size === 'sm' ? 'py-1 pl-8 pr-2.5 text-xs' : 'py-1.5 pl-8 pr-3 text-sm'
                } text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent`}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className={`max-h-56 overflow-y-auto p-1 ${size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value || '__all__'}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-lg ${
                      size === 'xs' || size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-left'
                    } transition ${
                      isSelected
                        ? 'bg-accent/10 font-bold text-accent'
                        : 'text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <span className="text-xs font-normal text-muted truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
