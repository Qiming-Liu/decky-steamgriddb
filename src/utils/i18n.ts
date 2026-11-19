import * as cs from '../i18n/cs.json';
import * as da from '../i18n/da.json';
import * as de from '../i18n/de.json';
import * as el from '../i18n/el.json';
import * as es from '../i18n/es.json';
import * as es419 from '../i18n/es-419.json';
import * as fr from '../i18n/fr.json';
import * as fi from '../i18n/fi.json';
import * as it from '../i18n/it.json';
import * as ja from '../i18n/ja.json';
import * as ko from '../i18n/ko.json';
import * as nl from '../i18n/nl.json';
import * as pl from '../i18n/pl.json';
import * as pt from '../i18n/pt.json';
import * as ptBr from '../i18n/pt-br.json';
import * as ro from '../i18n/ro.json';
import * as ru from '../i18n/ru.json';
import * as sv from '../i18n/sv.json';
import * as tr from '../i18n/tr.json';
import * as uk from '../i18n/uk.json';
import * as zhCn from '../i18n/zh-cn.json';
import * as zhTw from '../i18n/zh-tw.json';
import * as no from '../i18n/no.json';
import * as hu from '../i18n/hu.json';

// Steam locale -> catalog. "sc-sc" (Steam China) uses the Simplified Chinese one, as the client does.
export const LANGS: { [key: string]: { [key: string]: string } } = {
  cs,
  da,
  de,
  fi,
  el,
  es,
  'es-419': es419,
  fr,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  'pt-br': ptBr,
  ro,
  ru,
  sv,
  tr,
  uk,
  'zh-cn': zhCn,
  'sc-sc': zhCn,
  'zh-tw': zhTw,
  no,
  hu,
};

let cachedLang: string | undefined;
const getCurrentLanguage = (): string => {
  if (cachedLang) return cachedLang;

  const lang = window.LocalizationManager.m_rgLocalesToUse[0];
  cachedLang = lang;
  return lang;
};

/**
 * Very basic translation cause theres like 20 strings and i don't need anything more complex.
 *
 * @param {string} key Locale key
 * @param {string} originalString Original text
 * @param {boolean} steamToken If true, uses the key to query Steams token store.
 *    Good for actions like "Back" or "Cancel". Won't be dumped with the rest of the strings.
 *
 * @example
 * t('TITLE_FILTER_MODAL', 'Asset Filters')
 * @example
 * // if you need variables use .replace()
 * t('ACTION_REMOVE_GAME', 'Delete {gameName}').replaceAll('{gameName}', gameName)
 * @example
 * // Original Steam string
 * t('Button_Back', 'Back', true);
 */
const trans_string = (key: string, originalString: string, steamToken = false): string => {
  const lang = getCurrentLanguage();
  if (steamToken) {
    return window.LocalizationManager.m_mapTokens.get(key) ?? window.LocalizationManager.m_mapFallbackTokens.get(key) ?? originalString;
  }
  if (lang === 'en') return originalString;

  return LANGS[lang]?.[key] ?? originalString;
};

/**
 * Steam hands some names over as tokens ("#LibraryTab_AllGames"); this turns
 * one into the user's language. Plain text comes back as it is.
 */
export const localizeToken = (text: string): string => {
  if (!text.startsWith('#')) return text;
  const manager = window.LocalizationManager as unknown as { LocalizeString?: (token: string) => string };
  const key = text.slice(1);
  return manager.LocalizeString?.(text) ??
    window.LocalizationManager.m_mapTokens.get(key) ??
    window.LocalizationManager.m_mapFallbackTokens.get(key) ??
    key;
};

// using "trans_string" so it can be found by dump-strings
export default trans_string;
