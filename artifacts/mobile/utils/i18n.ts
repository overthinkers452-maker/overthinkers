import type { AppLanguage } from "@/context/SettingsContext";
import type { PostingMode } from "@/context/AppContext";

type Dict = Record<string, string>;

const STRINGS: Record<AppLanguage, Dict> = {
  en: {
    "mode.Public": "Public",
    "mode.Pseudonymous": "Pseudonymous",
    "mode.Anonymous": "Anonymous",
    "mode.Public.desc": "Your name is shown",
    "mode.Pseudonymous.desc": "Shown as a partial alias",
    "mode.Anonymous.desc": "Identity fully hidden",
    "mode.label": "Posting mode",
  },
  el: {
    "mode.Public": "Δημόσιο",
    "mode.Pseudonymous": "Ψευδώνυμο",
    "mode.Anonymous": "Ανώνυμο",
    "mode.Public.desc": "Εμφανίζεται το όνομά σου",
    "mode.Pseudonymous.desc": "Εμφανίζεται ως μερικό ψευδώνυμο",
    "mode.Anonymous.desc": "Η ταυτότητα κρύβεται πλήρως",
    "mode.label": "Λειτουργία δημοσίευσης",
  },
  es: {
    "mode.Public": "Público",
    "mode.Pseudonymous": "Seudónimo",
    "mode.Anonymous": "Anónimo",
    "mode.Public.desc": "Se muestra tu nombre",
    "mode.Pseudonymous.desc": "Se muestra como alias parcial",
    "mode.Anonymous.desc": "Identidad totalmente oculta",
    "mode.label": "Modo de publicación",
  },
  fr: {
    "mode.Public": "Public",
    "mode.Pseudonymous": "Pseudonyme",
    "mode.Anonymous": "Anonyme",
    "mode.Public.desc": "Votre nom est affiché",
    "mode.Pseudonymous.desc": "Affiché sous un alias partiel",
    "mode.Anonymous.desc": "Identité entièrement masquée",
    "mode.label": "Mode de publication",
  },
  hi: {
    "mode.Public": "सार्वजनिक",
    "mode.Pseudonymous": "छद्मनाम",
    "mode.Anonymous": "गुमनाम",
    "mode.Public.desc": "आपका नाम दिखाया जाता है",
    "mode.Pseudonymous.desc": "आंशिक उपनाम के रूप में दिखाया गया",
    "mode.Anonymous.desc": "पहचान पूरी तरह छिपी हुई",
    "mode.label": "पोस्टिंग मोड",
  },
};

export function t(lang: AppLanguage, key: string): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

export function modeLabel(lang: AppLanguage, mode: PostingMode): string {
  return t(lang, `mode.${mode}`);
}

export function modeDesc(lang: AppLanguage, mode: PostingMode): string {
  return t(lang, `mode.${mode}.desc`);
}
