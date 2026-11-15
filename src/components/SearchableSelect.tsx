import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SelectOptionGroup {
  label: string;
  options: { value: string; label: string }[];
}

interface SearchableSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  groups: SelectOptionGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  value,
  onChange,
  groups,
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Ketik untuk mencari...',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  // Filter option groups by searchQuery
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((group) => ({
        label: group.label,
        options: group.options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, searchQuery]);

  // Find current selected option display label
  const selectedDisplayLabel = useMemo(() => {
    for (const group of groups) {
      const found = group.options.find((o) => o.value === value);
      if (found) return found.label;
    }
    return value || placeholder;
  }, [groups, value, placeholder]);

  const handleSelectOption = (newVal: string) => {
    onChange(newVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      if (filteredGroups.length > 0 && filteredGroups[0].options.length > 0) {
        handleSelectOption(filteredGroups[0].options[0].value);
      } else if (searchQuery.trim()) {
        handleSelectOption(searchQuery.trim());
      }
    }
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-200 mb-2"
      >
        {label}
      </label>

      {/* Dropdown Trigger Button */}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left py-2.5 pr-10 rounded-xl bg-[#091326] border text-white text-base flex items-center justify-between transition-colors cursor-pointer ${
          icon ? 'pl-10' : 'pl-4'
        } ${
          isOpen
            ? 'border-sky-400 ring-1 ring-sky-400/40'
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </span>
        )}
        <span className="truncate block">{selectedDisplayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform duration-150 pointer-events-none ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {/* Searchable Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-40 left-0 right-0 mt-2 rounded-xl bg-[#0B172E] border border-sky-500/40 shadow-2xl overflow-hidden"
        >
          {/* Search Input Bar */}
          <div className="p-2.5 border-b border-slate-800 bg-[#081124] flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-2">
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <div className="px-2.5 py-1 text-[11px] font-bold tracking-wider text-sky-400/90">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.options.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectOption(opt.value)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 text-sky-300 font-semibold'
                            : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Fallback Custom Value Option when search query doesn't match */}
            {filteredGroups.length === 0 && searchQuery.trim() !== '' && (
              <button
                type="button"
                onClick={() => handleSelectOption(searchQuery.trim())}
                className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-sky-300 hover:bg-slate-800/80 flex items-center justify-between gap-2 cursor-pointer"
              >
                <span>Gunakan: “{searchQuery.trim()}”</span>
                <Check className="w-4 h-4 text-sky-400 shrink-0" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
