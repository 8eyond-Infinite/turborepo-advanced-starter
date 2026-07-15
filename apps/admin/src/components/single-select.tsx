
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SingleSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    label?: string;
    className?: string;
}

export const SingleSelect = ({
    value,
    onChange,
    options,
    placeholder = 'Chọn một mục...',
    label,
    className = 'w-full',
}: SingleSelectProps) => {
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={`flex items-center justify-between font-normal bg-transparent border-input text-left ${className}`}
                >
                    <span className={selectedOption ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {label && (
                    <>
                        <DropdownMenuLabel>{label}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                    {options.map((opt) => (
                        <DropdownMenuRadioItem key={opt.value} value={opt.value} className="cursor-pointer text-xs">
                            {opt.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
