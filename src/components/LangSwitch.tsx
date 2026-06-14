"use client";

import { useT } from "@/lib/LanguageContext";

export default function LangSwitch() {
  const { lang, toggleLang, t } = useT();

  return (
    <button
      onClick={toggleLang}
      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 hover:shadow transition-all"
      title={t("lang_label")}
    >
      {t("lang_switch")}
    </button>
  );
}
