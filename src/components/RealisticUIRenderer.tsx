import type { UIComponent } from "@/lib/ui-preview-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Zap, Shield, Users, Star, Heart, Check, Clock, Mail, Settings, Search,
  Home, Bell, BarChart3, Lock, Globe, Phone, Camera, FileText, Folder,
  Edit, Trash2, Plus, Minus, ArrowRight, ArrowLeft, TrendingUp, TrendingDown,
  Download, Upload, Share2, Bookmark, Tag, Filter, Layers, Grid, List,
  Map, Calendar, Package, Truck, CreditCard, Database, Server, Code, Terminal,
  Monitor, Smartphone, Menu, X, ChevronRight, ChevronDown, Send, MessageSquare,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap, shield: Shield, users: Users, star: Star, heart: Heart,
  check: Check, clock: Clock, mail: Mail, settings: Settings, search: Search,
  home: Home, bell: Bell, chart: BarChart3, lock: Lock, globe: Globe,
  phone: Phone, camera: Camera, file: FileText, folder: Folder, edit: Edit,
  trash: Trash2, plus: Plus, minus: Minus, "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft, "trending-up": TrendingUp, "trending-down": TrendingDown,
  download: Download, upload: Upload, share: Share2, bookmark: Bookmark,
  tag: Tag, filter: Filter, layers: Layers, grid: Grid, list: List,
  map: Map, calendar: Calendar, package: Package, truck: Truck,
  "credit-card": CreditCard, database: Database, server: Server,
  code: Code, terminal: Terminal, monitor: Monitor, smartphone: Smartphone,
};

const getIcon = (name?: string, className = "w-4 h-4") => {
  if (!name) return null;
  const Icon = iconMap[name.toLowerCase()];
  return Icon ? <Icon className={className} /> : null;
};

const safe = (val: unknown, fallback = ""): string => (typeof val === "string" ? val : String(val ?? fallback));
const safeArr = (val: unknown): unknown[] => (Array.isArray(val) ? val : []);

interface Props {
  component: UIComponent;
}

const RealisticUIRenderer = ({ component }: Props) => {
  const p = component.props || {};

  switch (component.type) {
    case "navbar":
      return (
        <nav className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-6">
            <span className="font-bold text-foreground text-sm">{safe(p.logo, "Logo")}</span>
            <div className="hidden sm:flex items-center gap-4">
              {safeArr(p.items).map((item, i) => (
                <span key={i} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{safe(item)}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {p.cta_text && <Button size="sm" className="text-xs h-7 rounded-full px-4">{safe(p.cta_text)}</Button>}
            <button className="sm:hidden text-muted-foreground"><Menu className="w-4 h-4" /></button>
          </div>
        </nav>
      );

    case "hero":
      return (
        <section className="px-6 py-16 sm:py-24 flex flex-col items-center text-center bg-gradient-to-b from-muted/30 to-background">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 max-w-lg leading-tight">{safe(p.title, "제목")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">{safe(p.subtitle)}</p>
          <div className="flex gap-3">
            {p.primary_button && <Button size="sm" className="rounded-full px-5">{safe(p.primary_button)}</Button>}
            {p.secondary_button && <Button size="sm" variant="outline" className="rounded-full px-5">{safe(p.secondary_button)}</Button>}
          </div>
          {p.image_description && (
            <div className="mt-8 w-full max-w-lg h-48 bg-muted/50 border border-dashed border-border rounded-xl flex items-center justify-center">
              <span className="text-xs text-muted-foreground/60">{safe(p.image_description)}</span>
            </div>
          )}
        </section>
      );

    case "feature-grid": {
      const cols = Number(p.columns) || 3;
      return (
        <section className="px-6 py-12">
          {p.title && <h2 className="text-lg font-bold text-foreground text-center mb-2">{safe(p.title)}</h2>}
          {p.subtitle && <p className="text-xs text-muted-foreground text-center mb-8">{safe(p.subtitle)}</p>}
          <div className={`grid gap-4 ${cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
            {safeArr(p.items).map((item: any, i) => (
              <Card key={i} className="border border-border">
                <CardContent className="pt-5 pb-4 px-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary">
                    {getIcon(item.icon, "w-4 h-4")}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{safe(item.title)}</h3>
                  <p className="text-xs text-muted-foreground">{safe(item.description)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    }

    case "stats":
      return (
        <section className="px-6 py-10 bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {safeArr(p.items).map((item: any, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-foreground">{safe(item.value)}</div>
                <div className="text-xs text-muted-foreground mt-1">{safe(item.label)}</div>
              </div>
            ))}
          </div>
        </section>
      );

    case "card-grid": {
      const cols = Number(p.columns) || 3;
      return (
        <section className="px-6 py-10">
          {p.title && <h2 className="text-lg font-bold text-foreground mb-6">{safe(p.title)}</h2>}
          <div className={`grid gap-4 ${cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
            {safeArr(p.items).map((item: any, i) => (
              <Card key={i}>
                {item.image_description && (
                  <div className="h-32 bg-muted/40 rounded-t-lg flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/50">{safe(item.image_description)}</span>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{safe(item.title)}</CardTitle>
                    {item.badge && <Badge variant="secondary" className="text-[10px]">{safe(item.badge)}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">{safe(item.description)}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    }

    case "form":
      return (
        <section className="px-6 py-10 flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">{safe(p.title)}</CardTitle>
              {p.description && <CardDescription className="text-xs">{safe(p.description)}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              {safeArr(p.fields).map((field: any, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-xs font-medium text-foreground">{safe(field.label)}</label>
                  {field.type === "textarea" ? (
                    <textarea className="w-full h-20 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none" placeholder={safe(field.placeholder)} />
                  ) : field.type === "select" ? (
                    <select className="w-full h-9 text-xs bg-background border border-input rounded-md px-3">
                      <option>{safe(field.placeholder, "선택하세요")}</option>
                      {safeArr(field.options).map((opt, j) => (
                        <option key={j}>{safe(opt)}</option>
                      ))}
                    </select>
                  ) : (
                    <Input type={safe(field.type, "text")} placeholder={safe(field.placeholder)} className="h-9 text-xs" />
                  )}
                </div>
              ))}
              <Button className="w-full text-xs mt-2">{safe(p.submit_text, "제출")}</Button>
            </CardContent>
          </Card>
        </section>
      );

    case "table":
      return (
        <section className="px-6 py-6">
          {p.title && <h3 className="text-sm font-semibold text-foreground mb-3">{safe(p.title)}</h3>}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  {safeArr(p.headers).map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{safe(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {safeArr(p.rows).map((row: any, i) => (
                  <tr key={i} className="border-t border-border">
                    {safeArr(row).map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-foreground">{safe(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "sidebar-nav":
      return (
        <div className="w-48 bg-card border-r border-border p-3 flex flex-col gap-0.5 self-stretch">
          {p.title && <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-2">{safe(p.title)}</div>}
          {safeArr(p.items).map((item: any, i) => (
            <button key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${item.active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
              {getIcon(item.icon, "w-3.5 h-3.5")}
              {safe(item.label)}
            </button>
          ))}
        </div>
      );

    case "content-section":
      return (
        <section className={`px-6 py-10 ${p.alignment === "center" ? "text-center" : ""}`}>
          <h2 className="text-lg font-bold text-foreground mb-3">{safe(p.title)}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{safe(p.content)}</p>
        </section>
      );

    case "pricing":
      return (
        <section className="px-6 py-12">
          {p.title && <h2 className="text-lg font-bold text-foreground text-center mb-8">{safe(p.title)}</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {safeArr(p.plans).map((plan: any, i) => (
              <Card key={i} className={`relative ${plan.highlighted ? "border-primary shadow-md ring-1 ring-primary/20" : ""}`}>
                {plan.highlighted && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2"><Badge className="text-[10px]">추천</Badge></div>}
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{safe(plan.name)}</CardTitle>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-foreground">{safe(plan.price)}</span>
                    {plan.period && <span className="text-xs text-muted-foreground ml-1">/{safe(plan.period)}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {safeArr(plan.features).map((feat, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-primary shrink-0" />
                        {safe(feat)}
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant={plan.highlighted ? "default" : "outline"} className="w-full text-xs mt-3">
                    {safe(plan.cta, "선택")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );

    case "testimonials":
      return (
        <section className="px-6 py-12 bg-muted/20">
          {p.title && <h2 className="text-lg font-bold text-foreground text-center mb-8">{safe(p.title)}</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {safeArr(p.items).map((item: any, i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-4 px-4">
                  <p className="text-xs text-muted-foreground italic mb-4">"{safe(item.quote)}"</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{safe(item.avatar_initial, "U")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-medium text-foreground">{safe(item.author)}</div>
                      <div className="text-[10px] text-muted-foreground">{safe(item.role)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );

    case "cta-banner":
      return (
        <section className="px-6 py-12">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">{safe(p.title)}</h2>
            <p className="text-xs text-muted-foreground mb-5">{safe(p.description)}</p>
            <Button className="rounded-full px-6">{safe(p.button_text, "시작하기")}</Button>
          </div>
        </section>
      );

    case "footer":
      return (
        <footer className="px-6 py-8 bg-card border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
            <div>
              <span className="font-bold text-sm text-foreground">{safe(p.logo, "Logo")}</span>
            </div>
            {safeArr(p.columns).map((col: any, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-foreground mb-2">{safe(col.title)}</div>
                <div className="space-y-1.5">
                  {safeArr(col.links).map((link, j) => (
                    <div key={j} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">{safe(link)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="mt-4 text-[10px] text-muted-foreground">{safe(p.copyright, "© 2024 All rights reserved.")}</div>
        </footer>
      );

    case "tabs-panel":
      return (
        <section className="px-6 py-8">
          <div className="flex gap-1 border-b border-border mb-4">
            {safeArr(p.tabs).map((tab: any, i) => (
              <button key={i} className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${i === 0 ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                {safe(tab.label)}
              </button>
            ))}
          </div>
          {(p.tabs as any)?.[0] && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{safe((p.tabs as any)[0].content_title)}</h3>
              <p className="text-xs text-muted-foreground">{safe((p.tabs as any)[0].content_description)}</p>
            </div>
          )}
        </section>
      );

    case "list":
      return (
        <section className="px-6 py-6">
          {p.title && <h3 className="text-sm font-semibold text-foreground mb-3">{safe(p.title)}</h3>}
          <div className="space-y-2">
            {safeArr(p.items).map((item: any, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                {item.avatar_initial && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{safe(item.avatar_initial)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">{safe(item.title)}</div>
                  {item.description && <div className="text-[10px] text-muted-foreground">{safe(item.description)}</div>}
                </div>
                {item.badge && <Badge variant="secondary" className="text-[10px] shrink-0">{safe(item.badge)}</Badge>}
              </div>
            ))}
          </div>
        </section>
      );

    case "metric-cards":
      return (
        <section className="px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {safeArr(p.items).map((item: any, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="text-[10px] text-muted-foreground mb-1">{safe(item.label)}</div>
                  <div className="text-xl font-bold text-foreground">{safe(item.value)}</div>
                  {item.change && (
                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${item.trend === "down" ? "text-destructive" : "text-green-600"}`}>
                      {item.trend === "down" ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {safe(item.change)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );

    case "chart-placeholder":
      return (
        <section className="px-6 py-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{safe(p.title)}</CardTitle>
              {p.description && <CardDescription className="text-xs">{safe(p.description)}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="h-40 bg-muted/20 rounded-lg flex items-end justify-center gap-2 px-4 pb-4">
                {p.type === "pie" ? (
                  <div className="w-28 h-28 rounded-full border-8 border-primary/30 border-t-primary border-r-primary/60" />
                ) : (
                  [40, 65, 45, 80, 55, 70, 90, 60].map((h, i) => (
                    <div key={i} className={`flex-1 rounded-t ${p.type === "line" ? "bg-primary/20 border-t-2 border-primary" : "bg-primary/30"}`} style={{ height: `${h}%` }} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      );

    case "search-bar":
      return (
        <div className="px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={safe(p.placeholder, "검색...")} className="pl-9 h-9 text-xs rounded-full" />
          </div>
        </div>
      );

    case "breadcrumb":
      return (
        <div className="px-6 py-2 flex items-center gap-1 text-[10px]">
          {safeArr(p.items).map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <span className={i === safeArr(p.items).length - 1 ? "text-foreground" : "text-muted-foreground"}>{safe(item)}</span>
            </span>
          ))}
        </div>
      );

    case "empty-state":
      return (
        <section className="px-6 py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            {getIcon(safe(p.icon), "w-5 h-5 text-muted-foreground")}
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{safe(p.title)}</h3>
          <p className="text-xs text-muted-foreground mb-4">{safe(p.description)}</p>
          {p.button_text && <Button size="sm" variant="outline" className="text-xs rounded-full">{safe(p.button_text)}</Button>}
        </section>
      );

    case "modal-preview":
      return (
        <section className="px-6 py-6 flex justify-center">
          <Card className="w-full max-w-sm shadow-xl border-2 border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{safe(p.title)}</CardTitle>
                <button className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              {p.description && <CardDescription className="text-xs">{safe(p.description)}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              {safeArr(p.fields).map((field: any, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-xs font-medium text-foreground">{safe(field.label)}</label>
                  <Input type={safe(field.type, "text")} placeholder={safe(field.placeholder)} className="h-8 text-xs" />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                {p.secondary_button && <Button size="sm" variant="outline" className="text-xs h-7">{safe(p.secondary_button)}</Button>}
                <Button size="sm" className="text-xs h-7">{safe(p.primary_button, "확인")}</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      );

    case "profile-header":
      return (
        <section className="px-6 py-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{safe(p.avatar_initial, "U")}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">{safe(p.name)}</h2>
              <p className="text-xs text-muted-foreground">{safe(p.email)}</p>
              {p.role && <Badge variant="secondary" className="text-[10px] mt-1">{safe(p.role)}</Badge>}
            </div>
          </div>
          {p.stats && (
            <div className="flex gap-6 mt-4">
              {safeArr(p.stats).map((s: any, i) => (
                <div key={i}>
                  <div className="text-lg font-bold text-foreground">{safe(s.value)}</div>
                  <div className="text-[10px] text-muted-foreground">{safe(s.label)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );

    case "settings-form":
      return (
        <section className="px-6 py-6">
          {p.title && <h2 className="text-base font-bold text-foreground mb-4">{safe(p.title)}</h2>}
          <div className="space-y-6">
            {safeArr(p.sections).map((section: any, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{safe(section.title)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {safeArr(section.fields).map((field: any, j) => (
                    <div key={j} className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground">{safe(field.label)}</label>
                        {field.description && <p className="text-[10px] text-muted-foreground">{safe(field.description)}</p>}
                      </div>
                      {field.type === "toggle" ? (
                        <div className="w-9 h-5 rounded-full bg-primary/20 relative cursor-pointer">
                          <div className="w-4 h-4 rounded-full bg-primary absolute right-0.5 top-0.5" />
                        </div>
                      ) : (
                        <Input defaultValue={safe(field.value)} className="w-48 h-8 text-xs" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );

    case "data-list":
      return (
        <section className="px-6 py-6">
          {p.title && <h3 className="text-sm font-semibold text-foreground mb-3">{safe(p.title)}</h3>}
          <div className="border border-border rounded-lg overflow-hidden">
            {p.headers && (
              <div className="flex gap-3 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground">
                {safeArr(p.headers).map((h, i) => (
                  <div key={i} className="flex-1">{safe(h)}</div>
                ))}
              </div>
            )}
            {safeArr(p.items).map((item: any, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-t border-border">
                {safeArr(item.cells).map((cell, j) => (
                  <div key={j} className="flex-1 text-xs text-foreground">{safe(cell)}</div>
                ))}
                {item.status && (
                  <Badge variant="secondary" className="text-[10px]">{safe(item.status)}</Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      );

    case "stepper":
      return (
        <section className="px-6 py-6">
          <div className="flex items-center gap-2">
            {safeArr(p.steps).map((step: any, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${step.completed ? "bg-primary text-primary-foreground" : step.active ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"}`}>
                  {step.completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div className="hidden sm:block min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{safe(step.label)}</div>
                  {step.description && <div className="text-[10px] text-muted-foreground truncate">{safe(step.description)}</div>}
                </div>
                {i < safeArr(p.steps).length - 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>
        </section>
      );

    case "chat-preview":
      return (
        <section className="px-6 py-6">
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              {safeArr(p.messages).map((msg: any, i) => (
                <div key={i} className={`flex ${msg.is_user ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-xl px-3 py-2 ${msg.is_user ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!msg.is_user && <div className="text-[10px] font-medium mb-0.5">{safe(msg.sender)}</div>}
                    <p className="text-xs">{safe(msg.text)}</p>
                    <div className={`text-[9px] mt-1 ${msg.is_user ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{safe(msg.time)}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Input placeholder="메시지 입력..." className="h-8 text-xs flex-1" />
                <Button size="sm" className="h-8 w-8 p-0"><Send className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        </section>
      );

    case "notification-list":
      return (
        <section className="px-6 py-6">
          {p.title && <h3 className="text-sm font-semibold text-foreground mb-3">{safe(p.title)}</h3>}
          <div className="space-y-1">
            {safeArr(p.items).map((item: any, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.read === false ? "bg-primary/5" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.read === false ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">{safe(item.title)}</div>
                  <div className="text-[10px] text-muted-foreground">{safe(item.description)}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{safe(item.time)}</span>
              </div>
            ))}
          </div>
        </section>
      );

    case "avatar-group":
      return (
        <section className="px-6 py-4">
          {p.title && <h3 className="text-sm font-semibold text-foreground mb-3">{safe(p.title)}</h3>}
          <div className="flex items-center gap-3">
            {safeArr(p.users).map((user: any, i) => (
              <div key={i} className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{safe(user.name).charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-medium text-foreground">{safe(user.name)}</div>
                  <div className="text-[10px] text-muted-foreground">{safe(user.role)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    default:
      return (
        <section className="px-6 py-4">
          <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
            <span className="text-xs text-muted-foreground">{component.type}: {safe(p.title || p.label)}</span>
          </div>
        </section>
      );
  }
};

export default RealisticUIRenderer;
