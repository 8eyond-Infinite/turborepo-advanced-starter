import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';

interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
}

export const SearchInput = ({
    value,
    onChange,
    placeholder = 'Tìm kiếm...',
    onClear,
    className = '',
    ...props
}: SearchInputProps) => {
    return (
        <div className={`relative flex items-center max-w-sm w-full ${className}`}>
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none stroke-[1.8]" />
            <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-9 pr-8 h-9 bg-card border-input focus-visible:ring-ring/25"
                {...props}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        if (onClear) onClear();
                    }}
                    className="absolute right-2.5 p-0.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
};
