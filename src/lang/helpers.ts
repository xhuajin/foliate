// Solution copied from obsidian-excalidraw-plugin: https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/src/lang/helpers.ts
import { getLanguage } from 'obsidian';
import en from './locale/en';
import zhCN from './locale/zh-cn';

let locale: Partial<typeof en> | null = null;

function loadLocale(lang: string): Partial<typeof en> {
    if (lang === 'zh') return zhCN;
    return en;
}

export function t(str: keyof typeof en, ...args: any[]): string {
    if (!locale) {
        // const LOCALE = localStorage.getItem('language')?.toLowerCase() || 'en';
        const LOCALE = getLanguage()?.toLowerCase() || 'en';
        locale = loadLocale(LOCALE);
    }
    let text = (locale && locale[str]) || en[str];

    // Simple parameter substitution for {0}, {1}, etc.
    if (args.length > 0) {
        args.forEach((arg, index) => {
            text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
        });
    }

    return text;
}

/*
import ar from "./locale/ar";
import cz from "./locale/cz";
import da from "./locale/da";
import de from "./locale/de";
import en from "./locale/en";
import enGB from "./locale/en-gb";
import es from "./locale/es";
import fr from "./locale/fr";
import hi from "./locale/hi";
import id from "./locale/id";
import it from "./locale/it";
import ja from "./locale/ja";
import ko from "./locale/ko";
import nl from "./locale/nl";
import no from "./locale/no";
import pl from "./locale/pl";
import pt from "./locale/pt";
import ptBR from "./locale/pt-br";
import ro from "./locale/ro";
import ru from "./locale/ru";
import tr from "./locale/tr";
import zhCN from "./locale/zh-cn";
import zhTW from "./locale/zh-tw";
import { LOCALE } from "src/constants/constants";

const localeMap: { [k: string]: Partial<typeof en> } = {
  ar,
  cs: cz,
  da,
  de,
  en,
  "en-gb": enGB,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  nn: no,
  pl,
  pt,
  "pt-br": ptBR,
  ro,
  ru,
  tr,
  "zh-cn": zhCN,
  "zh-tw": zhTW,
};*/
