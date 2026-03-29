export interface WireframeElement {
  id: string;
  type: "navbar" | "hero" | "card" | "form" | "input" | "button" | "text" | "image" | "list" | "table" | "sidebar" | "footer" | "tabs" | "modal" | "stats" | "chart" | "avatar" | "badge" | "search" | "divider" | "grid";
  label: string;
  width?: "full" | "half" | "third" | "quarter" | "auto";
  height?: "sm" | "md" | "lg" | "xl";
  children?: WireframeElement[];
  props?: Record<string, string>;
}

export interface WireframeSection {
  id: string;
  name: string;
  layout: "row" | "column" | "grid-2" | "grid-3" | "grid-4";
  elements: WireframeElement[];
}

export interface WireframeScreen {
  id: string;
  name: string;
  type: string;
  route: string;
  description: string;
  sections: WireframeSection[];
}

export interface WireframeData {
  screens: WireframeScreen[];
  flows: WireframeFlow[];
}

export interface WireframeFlow {
  name: string;
  steps: { screen_id: string; action: string }[];
}
