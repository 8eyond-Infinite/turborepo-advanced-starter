import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
    name?: string;
    className?: string;
}

export const DynamicIcon = ({ name, className }: DynamicIconProps) => {
    if (!name) return null;
    const IconComponent = (LucideIcons as any)[name];
    if (!IconComponent) {
        return <LucideIcons.HelpCircle className={className} />;
    }
    return <IconComponent className={className} />;
};
export type { DynamicIconProps };
