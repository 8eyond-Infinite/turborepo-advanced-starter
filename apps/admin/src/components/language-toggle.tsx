import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
    const { i18n } = useTranslation();

    const currentLanguage = i18n.language || 'vi';

    const toggleLanguage = () => {
        const nextLang = currentLanguage.startsWith('vi') ? 'en' : 'vi';
        i18n.changeLanguage(nextLang);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative cursor-pointer group"
            title={currentLanguage.startsWith('vi') ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
            <Languages className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-foreground scale-90 border border-background">
                {currentLanguage.startsWith('vi') ? 'VI' : 'EN'}
            </span>
        </Button>
    );
}
