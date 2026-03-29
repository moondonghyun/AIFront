export interface RenderedHomeStyleOption {
  id: string;
  name: string;
  concept_summary: string;
  style_reason: string;
  html: string;
}

export interface RenderedHomeStyleSet {
  focus_note: string;
  options: RenderedHomeStyleOption[];
}

// Legacy types kept for older functions
export type HomeStyleSlot = "left" | "center" | "right";
export type HomeLayoutMode = "mobile-feed" | "immersive-showcase" | "split-showcase";
export type HomeTone = "light" | "dark";

export interface HomeStyleCard {
  title: string;
  description: string;
}

export interface HomeStyleOption {
  id: string;
  slot: HomeStyleSlot;
  name: string;
  style_summary: string;
  structure_summary: string;
  hero_title: string;
  hero_subtitle: string;
  primary_cta: string;
  nav_items: string[];
  feature_cards: HomeStyleCard[];
  style_keywords: string[];
  layout_notes: string[];
}

export interface GeneratedHomeStyleSet {
  focus_note: string;
  options: HomeStyleOption[];
}

// These are kept only so older code that still references them doesn't break
export type SectionType = string;
export interface HomeSection { type: SectionType; [key: string]: unknown; }
export interface HomeTheme {
  tone: "light" | "dark"; primary: string; accent: string;
  bg: string; surface: string; text: string; text_muted: string;
  border: string; radius: "sharp" | "rounded" | "soft"; font: "sans" | "serif" | "mono";
}
