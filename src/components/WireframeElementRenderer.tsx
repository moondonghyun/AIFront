import type { WireframeElement } from "@/lib/wireframe-types";
import {
  Menu,
  Image,
  Search,
  User,
  BarChart3,
  Star,
  ArrowRight,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

const heightMap: Record<string, string> = {
  sm: "h-10",
  md: "h-20",
  lg: "h-32",
  xl: "h-48",
};

const widthMap: Record<string, string> = {
  full: "w-full",
  half: "w-1/2",
  third: "w-1/3",
  quarter: "w-1/4",
  auto: "w-auto flex-1",
};

const iconMap: Record<string, LucideIcon> = {
  navbar: Menu,
  image: Image,
  search: Search,
  avatar: User,
  chart: BarChart3,
  stats: Star,
};

interface WireframeElementRendererProps {
  element: WireframeElement;
}

const WireframeElementRenderer = ({ element }: WireframeElementRendererProps) => {
  const w = widthMap[element.width || "full"] || "w-full";
  const h = heightMap[element.height || "md"] || "h-20";
  const Icon = iconMap[element.type];

  const renderChildren = () => {
    if (!element.children?.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {element.children.map((child) => (
          <WireframeElementRenderer key={child.id} element={child} />
        ))}
      </div>
    );
  };

  switch (element.type) {
    case "navbar":
      return (
        <div className={`${w} bg-muted/60 border border-border rounded-md px-3 py-2 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-foreground/20" />
            <span className="text-[10px] font-medium text-muted-foreground">{element.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {(typeof element.props?.items === "string" ? element.props.items.split(",") : Array.isArray(element.props?.items) ? element.props.items : []).map((item: string, i: number) => (
              <span key={i} className="text-[9px] text-muted-foreground/60">{String(item).trim()}</span>
            ))}
            <Menu className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
        </div>
      );

    case "hero":
      return (
        <div className={`${w} ${h} bg-gradient-to-br from-muted/80 to-muted/40 border border-border rounded-lg flex flex-col items-center justify-center gap-2 p-4`}>
          <div className="w-3/4 h-3 bg-foreground/15 rounded" />
          <div className="w-1/2 h-2 bg-foreground/10 rounded" />
          <div className="flex gap-2 mt-2">
            <div className="px-3 py-1 bg-foreground/20 rounded text-[9px] text-muted-foreground">{element.label}</div>
            <div className="px-3 py-1 bg-muted border border-border rounded text-[9px] text-muted-foreground/60">더 알아보기</div>
          </div>
          {renderChildren()}
        </div>
      );

    case "card":
      return (
        <div className={`${w} bg-background border border-border rounded-lg p-3 flex flex-col gap-1.5`}>
          <div className="w-full h-12 bg-muted/60 rounded" />
          <div className="w-3/4 h-2 bg-foreground/10 rounded" />
          <div className="w-1/2 h-2 bg-foreground/8 rounded" />
          <span className="text-[9px] text-muted-foreground mt-1">{element.label}</span>
          {renderChildren()}
        </div>
      );

    case "form":
      return (
        <div className={`${w} bg-background border border-border rounded-lg p-3 flex flex-col gap-2`}>
          <span className="text-[10px] font-medium text-muted-foreground">{element.label}</span>
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full h-7 bg-muted/40 border border-border rounded-md" />
          ))}
          <div className="w-24 h-7 bg-foreground/20 rounded-md mt-1 flex items-center justify-center">
            <span className="text-[9px] text-muted-foreground">제출</span>
          </div>
          {renderChildren()}
        </div>
      );

    case "input":
      return (
        <div className={`${w} h-8 bg-muted/30 border border-border rounded-md flex items-center px-2`}>
          <span className="text-[9px] text-muted-foreground/50">{element.label}</span>
        </div>
      );

    case "button":
      return (
        <div className={`px-3 py-1.5 bg-foreground/15 rounded-md flex items-center gap-1 cursor-default`}>
          <span className="text-[9px] text-muted-foreground">{element.label}</span>
          <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/50" />
        </div>
      );

    case "text":
      return (
        <div className={`${w} flex flex-col gap-1`}>
          <div className="w-full h-2 bg-foreground/8 rounded" />
          <div className="w-3/4 h-2 bg-foreground/6 rounded" />
          <span className="text-[9px] text-muted-foreground/60 mt-0.5">{element.label}</span>
        </div>
      );

    case "image":
      return (
        <div className={`${w} ${h} bg-muted/50 border border-dashed border-border rounded-lg flex items-center justify-center`}>
          <Image className="w-5 h-5 text-muted-foreground/30" />
        </div>
      );

    case "list":
      return (
        <div className={`${w} flex flex-col gap-1.5`}>
          <span className="text-[10px] font-medium text-muted-foreground">{element.label}</span>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 border border-border rounded-md">
              <div className="w-3 h-3 rounded-full bg-foreground/10" />
              <div className="flex-1 h-2 bg-foreground/8 rounded" />
            </div>
          ))}
          {renderChildren()}
        </div>
      );

    case "table":
      return (
        <div className={`${w} border border-border rounded-lg overflow-hidden`}>
          <div className="bg-muted/60 px-2 py-1.5 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-2 bg-foreground/10 rounded" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-2 py-1.5 flex gap-2 border-t border-border">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex-1 h-2 bg-foreground/6 rounded" />
              ))}
            </div>
          ))}
        </div>
      );

    case "sidebar":
      return (
        <div className={`w-36 bg-muted/30 border border-border rounded-lg p-2 flex flex-col gap-1.5 self-stretch`}>
          <span className="text-[9px] font-medium text-muted-foreground mb-1">{element.label}</span>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-5 rounded px-2 flex items-center ${i === 1 ? "bg-foreground/10" : ""}`}>
              <div className="w-full h-1.5 bg-foreground/8 rounded" />
            </div>
          ))}
          {renderChildren()}
        </div>
      );

    case "footer":
      return (
        <div className={`${w} bg-muted/40 border border-border rounded-md px-3 py-2 flex items-center justify-between`}>
          <span className="text-[9px] text-muted-foreground/50">{element.label}</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-foreground/10" />
            ))}
          </div>
        </div>
      );

    case "tabs":
      return (
        <div className={`${w} flex flex-col gap-2`}>
          <div className="flex gap-1 border-b border-border pb-1">
            {(typeof (element.props?.items || element.label) === "string" ? (element.props?.items || element.label).split(",") : Array.isArray(element.props?.items) ? element.props.items : [String(element.label)]).map((tab: string, i: number) => (
              <span key={i} className={`text-[9px] px-2 py-0.5 rounded-t ${i === 0 ? "bg-muted text-foreground/80" : "text-muted-foreground/50"}`}>
                {tab.trim()}
              </span>
            ))}
          </div>
          <div className="h-16 bg-muted/20 border border-dashed border-border rounded" />
          {renderChildren()}
        </div>
      );

    case "modal":
      return (
        <div className={`${w} bg-background border-2 border-border rounded-xl p-4 shadow-lg flex flex-col gap-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-foreground/80">{element.label}</span>
            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px] text-muted-foreground">✕</div>
          </div>
          <div className="h-12 bg-muted/30 rounded border border-dashed border-border" />
          {renderChildren()}
        </div>
      );

    case "stats":
      return (
        <div className={`${w} bg-background border border-border rounded-lg p-3 flex flex-col items-center gap-1`}>
          <BarChart3 className="w-4 h-4 text-muted-foreground/40" />
          <div className="text-sm font-bold text-foreground/60">--</div>
          <span className="text-[9px] text-muted-foreground/50">{element.label}</span>
        </div>
      );

    case "chart":
      return (
        <div className={`${w} ${h} bg-muted/20 border border-border rounded-lg p-3 flex flex-col`}>
          <span className="text-[9px] text-muted-foreground mb-2">{element.label}</span>
          <div className="flex-1 flex items-end gap-1">
            {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-foreground/10 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      );

    case "avatar":
      return (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
          <span className="text-[9px] text-muted-foreground">{element.label}</span>
        </div>
      );

    case "badge":
      return (
        <span className="px-2 py-0.5 rounded-full bg-muted text-[9px] text-muted-foreground border border-border">
          {element.label}
        </span>
      );

    case "search":
      return (
        <div className={`${w} h-8 bg-muted/30 border border-border rounded-full flex items-center px-3 gap-2`}>
          <Search className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40">{element.label}</span>
        </div>
      );

    case "divider":
      return <div className={`${w} h-px bg-border my-1`} />;

    case "grid":
      return (
        <div className={`${w} grid grid-cols-2 gap-2`}>
          {element.children?.map((child) => (
            <WireframeElementRenderer key={child.id} element={child} />
          )) || (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted/30 border border-dashed border-border rounded-lg flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground/40">항목 {i}</span>
                </div>
              ))}
            </>
          )}
        </div>
      );

    default:
      return (
        <div className={`${w} ${h} bg-muted/20 border border-dashed border-border rounded-lg flex items-center justify-center`}>
          <span className="text-[9px] text-muted-foreground/40">{element.type}: {element.label}</span>
        </div>
      );
  }
};

export default WireframeElementRenderer;
