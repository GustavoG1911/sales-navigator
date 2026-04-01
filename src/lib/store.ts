import { Deal, MonthlyPresentations, AppSettings } from "./types";

const DEALS_KEY = "comissao_deals";
const PRESENTATIONS_KEY = "comissao_presentations";
const SETTINGS_KEY = "comissao_settings";

const defaultSettings: AppSettings = { fixedSalary: 3500 };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getDeals(): Deal[] {
  return load<Deal[]>(DEALS_KEY, []);
}

export function saveDeal(deal: Deal) {
  const deals = getDeals();
  const idx = deals.findIndex((d) => d.id === deal.id);
  if (idx >= 0) deals[idx] = deal;
  else deals.push(deal);
  save(DEALS_KEY, deals);
}

export function deleteDeal(id: string) {
  save(DEALS_KEY, getDeals().filter((d) => d.id !== id));
}

export function getPresentations(): MonthlyPresentations {
  return load<MonthlyPresentations>(PRESENTATIONS_KEY, {});
}

export function savePresentations(data: MonthlyPresentations) {
  save(PRESENTATIONS_KEY, data);
}

export function getSettings(): AppSettings {
  return load<AppSettings>(SETTINGS_KEY, defaultSettings);
}

export function saveSettings(settings: AppSettings) {
  save(SETTINGS_KEY, settings);
}
