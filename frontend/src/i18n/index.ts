import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEs from "./locales/es/common.json";
import homeEs from "./locales/es/home.json";
import eventsEs from "./locales/es/events.json";
import mintEs from "./locales/es/mint.json";
import createEventEs from "./locales/es/createEvent.json";
import profileEs from "./locales/es/profile.json";
import pricingEs from "./locales/es/pricing.json";
import communitiesEs from "./locales/es/communities.json";
import spotsEs from "./locales/es/spots.json";

import commonEn from "./locales/en/common.json";
import homeEn from "./locales/en/home.json";
import eventsEn from "./locales/en/events.json";
import mintEn from "./locales/en/mint.json";
import createEventEn from "./locales/en/createEvent.json";
import profileEn from "./locales/en/profile.json";
import pricingEn from "./locales/en/pricing.json";
import communitiesEn from "./locales/en/communities.json";
import spotsEn from "./locales/en/spots.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: commonEs,
        home: homeEs,
        events: eventsEs,
        mint: mintEs,
        createEvent: createEventEs,
        profile: profileEs,
        pricing: pricingEs,
        communities: communitiesEs,
        spots: spotsEs,
      },
      en: {
        common: commonEn,
        home: homeEn,
        events: eventsEn,
        mint: mintEn,
        createEvent: createEventEn,
        profile: profileEn,
        pricing: pricingEn,
        communities: communitiesEn,
        spots: spotsEn,
      },
    },
    fallbackLng: "es",
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "spot-lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

// Set initial lang attribute
document.documentElement.lang = i18n.language;

export default i18n;
