import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import viExceptions from './vi/exceptions.json';
import viErrors from './vi/errors.json';
import enExceptions from './en/exceptions.json';
import enErrors from './en/errors.json';

const resources = {
    vi: {
        translation: {
            exceptions: viExceptions,
            errors: viErrors,
        },
    },
    en: {
        translation: {
            exceptions: enExceptions,
            errors: enErrors,
        },
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'vi',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
