'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Sync external value → internal search text when value changes from outside
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedOption) {
      setSearch(selectedOption.name);
    } else {
      setSearch('');
    }
  }, [value, selectedOption]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedOption) {
          setSearch(selectedOption.name);
        } else {
          setSearch('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const isTyping = isOpen && (!selectedOption || search !== selectedOption.name);
  const query = isTyping ? search.toLowerCase().trim() : '';

  const filteredOptions = options.filter((opt) => {
    if (!query) return true;
    return opt.name.toLowerCase().startsWith(query);
  });

  const handleSelect = (opt: Option) => {
    if (opt.disabled) return;
    onChange(opt.id);
    setSearch(opt.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-4 pr-10 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        />
        <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-[var(--color-text-secondary)]">
          {search && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-1 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-[var(--color-text-secondary)] text-center">
              No matching items in stock
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  disabled={opt.disabled}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex flex-col ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                      : opt.disabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 text-[var(--color-text-secondary)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
