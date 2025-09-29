// Solution copied from obsidian-excalidraw-plugin: https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/src/lang/helpers.ts
import { getLanguage } from 'obsidian';
import en from './locale/en';
import zhCN from './locale/zh-cn';

declare const PLUGIN_LANGUAGES: Record<string, string>;
declare var LZString: any;

let locale: Partial<typeof en> | null = null;

function loadLocale(lang: string): Partial<typeof en> {
    // if (lang === 'zh') lang = 'zh-cn';
    // if (PLUGIN_LANGUAGES && Object.keys(PLUGIN_LANGUAGES).includes(lang)) {
    //     const decompressed = LZString.decompressFromBase64(
    //         PLUGIN_LANGUAGES[lang]
    //     );
    //     let x = {};
    //     eval(decompressed);
    //     return x;
    // } else {
    //     // Local fallback without PLUGIN_LANGUAGES bundle
    //     if (lang === 'zh-cn') return zhCN;
    //     return en;
    // }
    if (getLanguage() === 'zh') return zhCN;
    return en;
}

export function t(str: keyof typeof en): string {
    if (!locale) {
        // const LOCALE = localStorage.getItem('language')?.toLowerCase() || 'en';
        const LOCALE = getLanguage() || 'en';
        locale = loadLocale(LOCALE);
    }
    return (locale && locale[str]) || en[str];
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
