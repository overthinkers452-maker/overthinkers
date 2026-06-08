import type { AppLanguage } from "@/context/SettingsContext";
import type { PostingMode } from "@/context/AppContext";

type Dict = Record<string, string>;

const en: Dict = {
  // Posting modes
  "mode.Public": "Public",
  "mode.Pseudonymous": "Pseudonymous",
  "mode.Anonymous": "Anonymous",
  "mode.Public.desc": "Your name is shown",
  "mode.Pseudonymous.desc": "Shown as a partial alias",
  "mode.Anonymous.desc": "Identity fully hidden",
  "mode.label": "Posting mode",

  // Common
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.done": "Done",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.delete": "Delete",
  "common.copy": "Copy",
  "common.copied": "Copied to clipboard",
  "common.add": "Add",
  "common.remove": "Remove",
  "common.enable": "Enable",
  "common.disable": "Disable",
  "common.continue": "Continue",
  "common.none": "None",

  // Navigation / tabs
  "nav.home": "Home",
  "nav.explore": "Explore",
  "nav.latenight": "4 AM",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.search": "Search",

  // Settings sections
  "settings.title": "Settings",
  "settings.section.appearance": "Appearance",
  "settings.section.feedback": "Feedback & Sound",
  "settings.section.notifications": "Notifications",
  "settings.section.privacy": "Privacy",
  "settings.section.security": "Security",
  "settings.section.language": "Language & Content",
  "settings.section.account": "Account",
  "settings.section.about": "About",

  // Appearance
  "settings.theme": "Theme",
  "settings.theme.system": "System",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",

  // Feedback
  "settings.haptics": "Haptic feedback",
  "settings.sound": "Sound effects",
  "settings.feedbackHint": "Both are off by default. Likes and follows always show a subtle visual animation.",

  // Notifications
  "settings.notif.appreciations": "Appreciations",
  "settings.notif.comments": "Comments & replies",
  "settings.notif.follows": "New followers",
  "settings.notif.reposts": "Reposts",

  // Privacy
  "settings.private": "Private account",
  "settings.hideDisagrees": "Hide disagreement counts",
  "settings.blockedUsers": "Blocked users",
  "settings.contentFilters": "Content filters",

  // Security
  "settings.twoFactor": "Two-factor authentication",
  "settings.changePassword": "Change password",
  "settings.activeSessions": "Active sessions",
  "settings.loginHistory": "Login history",

  // Language & content
  "settings.appLanguage": "App language",
  "settings.translationLanguage": "Translation language",
  "settings.clearTranslation": "Clear saved translation language",

  // Account
  "settings.exportData": "Export my data",
  "settings.logoutOthers": "Log out of other devices",
  "settings.deleteAccount": "Delete account",

  // About
  "settings.privacyPolicy": "Privacy policy",
  "settings.terms": "Terms of service",
  "settings.sendFeedback": "Send feedback",
  "settings.version": "Version",

  // Content filters screen
  "filters.title": "Content filters",
  "filters.desc": "Hide thoughts containing these words or phrases from your feeds. Matching is case-insensitive.",
  "filters.placeholder": "Add a word or phrase",
  "filters.empty": "No filters yet. Add a word to start hiding matching thoughts.",
  "filters.count": "{n} active",

  // Blocked users screen
  "blocked.title": "Blocked users",
  "blocked.empty": "You haven't blocked anyone. Block someone from the ⋯ menu on their thought.",
  "blocked.unblock": "Unblock",

  // Sessions
  "sessions.title": "Active sessions",
  "sessions.thisDevice": "This device",
  "sessions.lastActive": "Last active",
  "sessions.logoutOthers": "Log out of all other devices",
  "sessions.onlyThis": "This is your only active session.",

  // Login history
  "history.title": "Login history",
  "history.success": "Successful login",
  "history.failed": "Failed attempt",

  // Change password
  "password.title": "Change password",
  "password.current": "Current password",
  "password.new": "New password",
  "password.confirm": "Confirm new password",
  "password.setFirst": "Set a password for your account.",
  "password.strength.weak": "Weak",
  "password.strength.fair": "Fair",
  "password.strength.strong": "Strong",
  "password.err.current": "Current password is incorrect.",
  "password.err.length": "Password must be at least 8 characters.",
  "password.err.match": "Passwords do not match.",
  "password.err.same": "New password must be different.",

  // 2FA
  "twofa.title": "Two-factor authentication",
  "twofa.intro": "Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password), or enter the setup key manually.",
  "twofa.key": "Setup key",
  "twofa.backupTitle": "Backup codes",
  "twofa.backupDesc": "Save these one-time codes somewhere safe. Each can be used once if you lose access to your authenticator.",
  "twofa.copyKey": "Copy setup key",
  "twofa.copyCodes": "Copy backup codes",
  "twofa.finish": "I've saved my codes — enable",
  "twofa.disable": "Disable two-factor authentication",
  "twofa.enabledNote": "Two-factor authentication is on.",

  // Export
  "export.title": "Export my data",
  "export.desc": "Download a copy of your profile, thoughts and settings.",
  "export.json": "Download as JSON",
  "export.csv": "Download as CSV",

  // Toasts
  "toast.saved": "Saved",
  "toast.translationCleared": "Translation language cleared",
  "toast.languageChanged": "Language updated",
  "toast.passwordChanged": "Password updated",
  "toast.passwordSet": "Password set",
  "toast.twofaEnabled": "Two-factor authentication enabled",
  "toast.twofaDisabled": "Two-factor authentication disabled",
  "toast.wordBlocked": "Filter added",
  "toast.wordRemoved": "Filter removed",
  "toast.userUnblocked": "User unblocked",
  "toast.userBlocked": "User blocked",
  "toast.sessionsTerminated": "{n} other session(s) signed out",
  "toast.noOtherSessions": "No other active sessions",
  "toast.exported": "Data exported",
  "toast.copied": "Copied to clipboard",

  // Legal
  "legal.terms.title": "Terms of Service",
  "legal.privacy.title": "Privacy Policy",
  "legal.lastUpdated": "Last updated",
};

const hi: Dict = {
  // Posting modes
  "mode.Public": "सार्वजनिक",
  "mode.Pseudonymous": "छद्मनाम",
  "mode.Anonymous": "गुमनाम",
  "mode.Public.desc": "आपका नाम दिखाया जाता है",
  "mode.Pseudonymous.desc": "आंशिक उपनाम के रूप में दिखाया गया",
  "mode.Anonymous.desc": "पहचान पूरी तरह छिपी हुई",
  "mode.label": "पोस्टिंग मोड",

  // Common
  "common.cancel": "रद्द करें",
  "common.save": "सहेजें",
  "common.done": "हो गया",
  "common.close": "बंद करें",
  "common.confirm": "पुष्टि करें",
  "common.delete": "हटाएं",
  "common.copy": "कॉपी करें",
  "common.copied": "क्लिपबोर्ड पर कॉपी किया गया",
  "common.add": "जोड़ें",
  "common.remove": "हटाएं",
  "common.enable": "चालू करें",
  "common.disable": "बंद करें",
  "common.continue": "जारी रखें",
  "common.none": "कोई नहीं",

  // Navigation / tabs
  "nav.home": "होम",
  "nav.explore": "एक्सप्लोर",
  "nav.latenight": "4 AM",
  "nav.profile": "प्रोफ़ाइल",
  "nav.settings": "सेटिंग्स",
  "nav.search": "खोजें",

  // Settings sections
  "settings.title": "सेटिंग्स",
  "settings.section.appearance": "दिखावट",
  "settings.section.feedback": "फ़ीडबैक और ध्वनि",
  "settings.section.notifications": "सूचनाएं",
  "settings.section.privacy": "गोपनीयता",
  "settings.section.security": "सुरक्षा",
  "settings.section.language": "भाषा और सामग्री",
  "settings.section.account": "खाता",
  "settings.section.about": "ऐप के बारे में",

  // Appearance
  "settings.theme": "थीम",
  "settings.theme.system": "सिस्टम",
  "settings.theme.light": "लाइट",
  "settings.theme.dark": "डार्क",

  // Feedback
  "settings.haptics": "हैप्टिक फ़ीडबैक",
  "settings.sound": "ध्वनि प्रभाव",
  "settings.feedbackHint": "दोनों डिफ़ॉल्ट रूप से बंद हैं। लाइक और फ़ॉलो हमेशा एक हल्का दृश्य एनिमेशन दिखाते हैं।",

  // Notifications
  "settings.notif.appreciations": "सराहनाएं",
  "settings.notif.comments": "टिप्पणियां और जवाब",
  "settings.notif.follows": "नए फ़ॉलोअर",
  "settings.notif.reposts": "रीपोस्ट",

  // Privacy
  "settings.private": "निजी खाता",
  "settings.hideDisagrees": "असहमति की संख्या छिपाएं",
  "settings.blockedUsers": "ब्लॉक किए गए उपयोगकर्ता",
  "settings.contentFilters": "सामग्री फ़िल्टर",

  // Security
  "settings.twoFactor": "दो-कारक प्रमाणीकरण",
  "settings.changePassword": "पासवर्ड बदलें",
  "settings.activeSessions": "सक्रिय सत्र",
  "settings.loginHistory": "लॉगिन इतिहास",

  // Language & content
  "settings.appLanguage": "ऐप की भाषा",
  "settings.translationLanguage": "अनुवाद भाषा",
  "settings.clearTranslation": "सहेजी गई अनुवाद भाषा हटाएं",

  // Account
  "settings.exportData": "मेरा डेटा निर्यात करें",
  "settings.logoutOthers": "अन्य डिवाइस से लॉग आउट करें",
  "settings.deleteAccount": "खाता हटाएं",

  // About
  "settings.privacyPolicy": "गोपनीयता नीति",
  "settings.terms": "सेवा की शर्तें",
  "settings.sendFeedback": "फ़ीडबैक भेजें",
  "settings.version": "संस्करण",

  // Content filters
  "filters.title": "सामग्री फ़िल्टर",
  "filters.desc": "इन शब्दों या वाक्यांशों वाली पोस्ट को अपनी फ़ीड से छिपाएं। मिलान केस-असंवेदनशील है।",
  "filters.placeholder": "कोई शब्द या वाक्यांश जोड़ें",
  "filters.empty": "अभी कोई फ़िल्टर नहीं। मिलती-जुलती पोस्ट छिपाने के लिए कोई शब्द जोड़ें।",
  "filters.count": "{n} सक्रिय",

  // Blocked users
  "blocked.title": "ब्लॉक किए गए उपयोगकर्ता",
  "blocked.empty": "आपने किसी को ब्लॉक नहीं किया है। किसी की पोस्ट के ⋯ मेन्यू से उसे ब्लॉक करें।",
  "blocked.unblock": "अनब्लॉक करें",

  // Sessions
  "sessions.title": "सक्रिय सत्र",
  "sessions.thisDevice": "यह डिवाइस",
  "sessions.lastActive": "अंतिम सक्रिय",
  "sessions.logoutOthers": "अन्य सभी डिवाइस से लॉग आउट करें",
  "sessions.onlyThis": "यह आपका एकमात्र सक्रिय सत्र है।",

  // Login history
  "history.title": "लॉगिन इतिहास",
  "history.success": "सफल लॉगिन",
  "history.failed": "असफल प्रयास",

  // Change password
  "password.title": "पासवर्ड बदलें",
  "password.current": "वर्तमान पासवर्ड",
  "password.new": "नया पासवर्ड",
  "password.confirm": "नए पासवर्ड की पुष्टि करें",
  "password.setFirst": "अपने खाते के लिए पासवर्ड सेट करें।",
  "password.strength.weak": "कमज़ोर",
  "password.strength.fair": "ठीक-ठाक",
  "password.strength.strong": "मज़बूत",
  "password.err.current": "वर्तमान पासवर्ड गलत है।",
  "password.err.length": "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।",
  "password.err.match": "पासवर्ड मेल नहीं खाते।",
  "password.err.same": "नया पासवर्ड अलग होना चाहिए।",

  // 2FA
  "twofa.title": "दो-कारक प्रमाणीकरण",
  "twofa.intro": "इस QR कोड को किसी ऑथेंटिकेटर ऐप (Google Authenticator, Authy, 1Password) से स्कैन करें, या सेटअप कुंजी मैन्युअल रूप से दर्ज करें।",
  "twofa.key": "सेटअप कुंजी",
  "twofa.backupTitle": "बैकअप कोड",
  "twofa.backupDesc": "इन एक-बार उपयोग वाले कोड को कहीं सुरक्षित रखें। ऑथेंटिकेटर तक पहुंच खोने पर हर कोड एक बार इस्तेमाल हो सकता है।",
  "twofa.copyKey": "सेटअप कुंजी कॉपी करें",
  "twofa.copyCodes": "बैकअप कोड कॉपी करें",
  "twofa.finish": "मैंने कोड सहेज लिए — चालू करें",
  "twofa.disable": "दो-कारक प्रमाणीकरण बंद करें",
  "twofa.enabledNote": "दो-कारक प्रमाणीकरण चालू है।",

  // Export
  "export.title": "मेरा डेटा निर्यात करें",
  "export.desc": "अपनी प्रोफ़ाइल, विचार और सेटिंग्स की एक प्रति डाउनलोड करें।",
  "export.json": "JSON के रूप में डाउनलोड करें",
  "export.csv": "CSV के रूप में डाउनलोड करें",

  // Toasts
  "toast.saved": "सहेजा गया",
  "toast.translationCleared": "अनुवाद भाषा हटा दी गई",
  "toast.languageChanged": "भाषा अपडेट की गई",
  "toast.passwordChanged": "पासवर्ड अपडेट किया गया",
  "toast.passwordSet": "पासवर्ड सेट किया गया",
  "toast.twofaEnabled": "दो-कारक प्रमाणीकरण चालू किया गया",
  "toast.twofaDisabled": "दो-कारक प्रमाणीकरण बंद किया गया",
  "toast.wordBlocked": "फ़िल्टर जोड़ा गया",
  "toast.wordRemoved": "फ़िल्टर हटाया गया",
  "toast.userUnblocked": "उपयोगकर्ता अनब्लॉक किया गया",
  "toast.userBlocked": "उपयोगकर्ता ब्लॉक किया गया",
  "toast.sessionsTerminated": "{n} अन्य सत्र साइन आउट किए गए",
  "toast.noOtherSessions": "कोई अन्य सक्रिय सत्र नहीं",
  "toast.exported": "डेटा निर्यात किया गया",
  "toast.copied": "क्लिपबोर्ड पर कॉपी किया गया",

  // Legal
  "legal.terms.title": "सेवा की शर्तें",
  "legal.privacy.title": "गोपनीयता नीति",
  "legal.lastUpdated": "अंतिम अद्यतन",
};

// Greek / Spanish / French keep their existing mode translations and fall back
// to English for everything else.
const el: Dict = {
  "mode.Public": "Δημόσιο",
  "mode.Pseudonymous": "Ψευδώνυμο",
  "mode.Anonymous": "Ανώνυμο",
  "mode.Public.desc": "Εμφανίζεται το όνομά σου",
  "mode.Pseudonymous.desc": "Εμφανίζεται ως μερικό ψευδώνυμο",
  "mode.Anonymous.desc": "Η ταυτότητα κρύβεται πλήρως",
  "mode.label": "Λειτουργία δημοσίευσης",
};

const es: Dict = {
  "mode.Public": "Público",
  "mode.Pseudonymous": "Seudónimo",
  "mode.Anonymous": "Anónimo",
  "mode.Public.desc": "Se muestra tu nombre",
  "mode.Pseudonymous.desc": "Se muestra como alias parcial",
  "mode.Anonymous.desc": "Identidad totalmente oculta",
  "mode.label": "Modo de publicación",
};

const fr: Dict = {
  "mode.Public": "Public",
  "mode.Pseudonymous": "Pseudonyme",
  "mode.Anonymous": "Anonyme",
  "mode.Public.desc": "Votre nom est affiché",
  "mode.Pseudonymous.desc": "Affiché sous un alias partiel",
  "mode.Anonymous.desc": "Identité entièrement masquée",
  "mode.label": "Mode de publication",
};

const STRINGS: Record<AppLanguage, Dict> = { en, el, es, fr, hi };

export function t(lang: AppLanguage, key: string, vars?: Record<string, string | number>): string {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

export function modeLabel(lang: AppLanguage, mode: PostingMode): string {
  return t(lang, `mode.${mode}`);
}

export function modeDesc(lang: AppLanguage, mode: PostingMode): string {
  return t(lang, `mode.${mode}.desc`);
}
