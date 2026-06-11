// Centralized translation helper.
//
// Uses the free MyMemory translation API. For "Hinglish" we translate to Hindi
// (Devanagari) and then transliterate the result to Roman script so the output
// reads like everyday Hinglish (e.g. "Main school jaa raha hoon") instead of
// देवनागरी.

const INDEPENDENT_VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ॠ": "ree", "ऌ": "li", "ए": "e", "ऐ": "ai", "ओ": "o",
  "औ": "au", "ऑ": "o", "ऒ": "o",
};

const MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "ॄ": "ree", "ॢ": "li", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ॉ": "o", "ॅ": "e",
};

const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l", "क्ष": "ksh",
  "त्र": "tr", "ज्ञ": "gy",
};

// Precomposed nukta consonants.
const NUKTA: Record<string, string> = {
  "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r",
  "ढ़": "rh", "फ़": "f", "य़": "y",
};

const VIRAMA = "\u094D";
const NUKTA_SIGN = "\u093C";
const ANUSVARA = "\u0902";
const CHANDRABINDU = "\u0901";
const VISARGA = "\u0903";

const DEV_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function isConsonant(ch: string): boolean {
  return CONSONANTS[ch] != null || NUKTA[ch] != null;
}

function consonantBase(ch: string): string | null {
  if (NUKTA[ch] != null) return NUKTA[ch];
  if (CONSONANTS[ch] != null) return CONSONANTS[ch];
  return null;
}

export function transliterateDevanagariToLatin(input: string): string {
  let out = "";
  const chars = Array.from(input);
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i];

    // Combine a base consonant with a following nukta sign into one unit.
    if (chars[i + 1] === NUKTA_SIGN) {
      const combined = ch + NUKTA_SIGN;
      if (NUKTA[combined]) {
        ch = combined;
        i++;
      } else {
        i++; // drop stray nukta
      }
    }

    if (DEV_DIGITS[ch]) { out += DEV_DIGITS[ch]; continue; }

    if (INDEPENDENT_VOWELS[ch]) { out += INDEPENDENT_VOWELS[ch]; continue; }

    if (isConsonant(ch)) {
      const base = consonantBase(ch)!;
      const next = chars[i + 1];
      if (next === VIRAMA) {
        out += base; // half consonant, no inherent vowel
        i++;
      } else if (next && MATRAS[next]) {
        out += base + MATRAS[next];
        i++;
      } else {
        out += base + "a"; // inherent vowel
      }
      continue;
    }

    if (ch === ANUSVARA || ch === CHANDRABINDU) { out += "n"; continue; }
    if (ch === VISARGA) { out += "h"; continue; }
    if (ch === VIRAMA || ch === NUKTA_SIGN) { continue; }
    if (ch === "ऽ") { continue; } // avagraha

    out += ch; // spaces, punctuation, latin, etc.
  }

  // Capitalize the start of each sentence for readability.
  out = out.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  return out;
}

async function fetchTranslation(content: string, code: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(content)}&langpair=en|${code}`
  );
  const data = await res.json();
  return data?.responseData?.translatedText || "";
}

export interface TranslateTarget {
  code: string;
  label: string;
  roman?: boolean; // when true, transliterate the (Hindi) result into Roman script
}

export async function translateText(content: string, target: TranslateTarget): Promise<string> {
  try {
    const raw = await fetchTranslation(content, target.code);
    if (!raw) return "Translation unavailable.";
    if (target.roman) {
      const romanized = transliterateDevanagariToLatin(raw).trim();
      return romanized || raw;
    }
    return raw;
  } catch {
    return "Translation unavailable offline.";
  }
}
