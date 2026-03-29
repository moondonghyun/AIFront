export interface UIComponent {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: UIComponent[];
}

export interface UIScreen {
  id: string;
  name: string;
  route: string;
  type: string;
  description: string;
  layout: "full-width" | "sidebar-left" | "sidebar-right" | "centered";
  components: UIComponent[];
}

export interface UIPreviewData {
  service_name: string;
  theme: {
    primary_color: string;
    style: string;
  };
  screens: UIScreen[];
}
