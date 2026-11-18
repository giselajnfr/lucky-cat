"use client";
import { useEffect } from "react";
import { useI18n } from "./I18nProvider";
import { translatePhrase } from "@/lib/i18n/phrases";

const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE"]);

function fixNode(n: Node) {
  if (n.nodeType === Node.TEXT_NODE) {
    const v = n.nodeValue ?? "", t = translatePhrase(v);
    if (t !== v) n.nodeValue = t;
    return;
  }
  if (n.nodeType !== Node.ELEMENT_NODE) return;
  const el = n as Element;
  if (SKIP.has(el.tagName) || el.closest("[data-no-translate]")) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const t = translatePhrase(v); if (t !== v) el.setAttribute(a, t); } }
  el.childNodes.forEach(fixNode);
}

/**
 * English mode only. Translates remaining Indonesian UI text (see lib/i18n/phrases.ts) in place and keeps doing so as React updates the page.
 * Also translates window.confirm / prompt / alert messages. Switching language reloads the page, so nothing needs to be "un-translated".
 */
export function AutoTranslate() {
  const { lang } = useI18n();
  useEffect(() => {
    if (lang !== "en") return;
    const root = document.documentElement;
    const run = () => { fixNode(document.body); root.removeAttribute("data-i18n"); };
    const first = setTimeout(run, 0);   // after hydration has finished
    const mo = new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === "characterData") fixNode(r.target);
        else if (r.type === "attributes") fixNode(r.target);
        else r.addedNodes.forEach(fixNode);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    const { confirm, prompt, alert } = window;
    window.confirm = (m?: string) => confirm.call(window, translatePhrase(m ?? ""));
    window.alert = (m?: unknown) => alert.call(window, translatePhrase(String(m ?? "")));
    window.prompt = (m?: string, d?: string) => prompt.call(window, translatePhrase(m ?? ""), d);
    return () => { clearTimeout(first); mo.disconnect(); window.confirm = confirm; window.alert = alert; window.prompt = prompt; };
  }, [lang]);
  return null;
}
