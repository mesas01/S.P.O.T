import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("en") ? "en" : "es";

  const toggle = () => {
    const next = currentLang === "es" ? "en" : "es";
    void i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 border border-stellar-black/15 text-stellar-black/60 hover:text-stellar-black hover:border-stellar-black/25 rounded-full px-3 py-1.5 font-body text-xs font-semibold transition-all"
      aria-label="Change language"
    >
      <Globe size={13} />
      {currentLang === "es" ? "EN" : "ES"}
    </button>
  );
};

export default LanguageSwitcher;
