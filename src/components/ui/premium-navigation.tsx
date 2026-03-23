"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type SortOption = 'risk' | 'yield' | 'duration' | 'newest';

interface ChipNavigationProps {
    items: string[];
    activeItem: string;
    onSelect: (item: string) => void;
}

export function ChipNavigation({ items, activeItem, onSelect }: ChipNavigationProps) {
    return (
        <div className="chip-nav">
            {items.map((item) => (
                <button
                    key={item}
                    className={cn("chip-nav-item", activeItem === item && "active")}
                    onClick={() => onSelect(item)}
                >
                    {item}
                </button>
            ))}
        </div>
    );
}

interface TabSwitcherProps {
    items: string[];
    activeItem: string;
    onSelect: (item: string) => void;
}

export function TabSwitcher({ items, activeItem, onSelect }: TabSwitcherProps) {
    return (
        <div className="tab-switcher">
            {items.map((item) => (
                <button
                    key={item}
                    className={cn("tab-switcher-item", activeItem === item && "active")}
                    onClick={() => onSelect(item)}
                >
                    {item}
                </button>
            ))}
        </div>
    );
}

interface SortDropdownProps {
    options: { value: SortOption; label: string }[];
    activeOption: SortOption;
    onSelect: (option: SortOption) => void;
}

export function SortDropdown({ options, activeOption, onSelect }: SortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeLabel = options.find(o => o.value === activeOption)?.label || 'Sort by';

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            ref={dropdownRef}
            className={cn("sort-dropdown", isOpen && "open")}
        >
            <button
                className="sort-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{activeLabel}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </button>

            <div className="sort-dropdown-panel">
                {options.map((option) => (
                    <button
                        key={option.value}
                        className={cn("sort-dropdown-item", activeOption === option.value && "active")}
                        onClick={() => {
                            onSelect(option.value);
                            setIsOpen(false);
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}