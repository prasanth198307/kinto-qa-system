import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, {
    method: m,
    headers: { "Content-Type": "application/json" },
    body: b ? JSON.stringify(b) : undefined,
    credentials: "include",
  }).then((r) => r.json());

const LANGUAGES = [
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", rtl: false },
  { code: "fr", name: "French", nativeName: "Français", rtl: false },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false },
  { code: "zh", name: "Chinese", nativeName: "中文", rtl: false },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", rtl: false },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true },
];

interface MenuItem {
  id: number;
  name_en: string;
  description_en: string;
  category: string;
}

interface Translation {
  name: string;
  description: string;
}

type TranslationMap = Record<string, Record<string, Translation>>;

export default function RestaurantMenuTranslationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [localTranslations, setLocalTranslations] = useState<TranslationMap>({});

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu-items-list"],
    queryFn: () => api("GET", "/api/restaurant/menu-items?limit=200"),
  });

  const { data: translations = {} } = useQuery<TranslationMap>({
    queryKey: ["menu-translations"],
    queryFn: () => api("GET", "/api/restaurant/menu-translations"),
    onSuccess: (d: TranslationMap) => { if (d && typeof d === "object") setLocalTranslations(d); },
  } as any);

  const saveAll = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/menu-translations/bulk", localTranslations),
    onSuccess: () => {
      toast({ title: "All translations saved" });
      qc.invalidateQueries({ queryKey: ["menu-translations"] });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const bulkTranslate = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/menu-translations/auto-translate", {}),
    onSuccess: (d: TranslationMap) => {
      if (d && typeof d === "object") {
        setLocalTranslations((prev) => ({ ...prev, ...d }));
        toast({ title: "Auto-translation complete" });
      } else {
        toast({ title: "Auto-translate unavailable — no translation service configured", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Auto-translate failed — service may not be configured", variant: "destructive" }),
  });

  const items = Array.isArray(menuItems) ? menuItems : [];
  const filtered = search
    ? items.filter((item: MenuItem) => item.name_en.toLowerCase().includes(search.toLowerCase()))
    : items;

  const getTranslation = (itemId: number, langCode: string): Translation => {
    return localTranslations[itemId]?.[langCode] ?? { name: "", description: "" };
  };

  const setTranslation = (itemId: number, langCode: string, field: "name" | "description", value: string) => {
    setLocalTranslations((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? {}),
        [langCode]: {
          ...getTranslation(itemId, langCode),
          [field]: value,
        },
      },
    }));
  };

  const isTranslated = (itemId: number, langCode: string): boolean => {
    const t = localTranslations[itemId]?.[langCode];
    return !!(t?.name);
  };

  const getProgress = (langCode: string): number => {
    if (items.length === 0) return 0;
    const done = items.filter((item: MenuItem) => isTranslated(item.id, langCode)).length;
    return Math.round((done / items.length) * 100);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Menu Translations</h1>
            <p className="text-muted-foreground">Translate menu items into multiple languages</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => bulkTranslate.mutate()} disabled={bulkTranslate.isPending}>
              {bulkTranslate.isPending ? "Translating..." : "Auto-Translate Missing"}
            </Button>
            <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>
              {saveAll.isPending ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>

        {/* Language progress summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Translation Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LANGUAGES.map((lang) => {
                const pct = getProgress(lang.code);
                return (
                  <div key={lang.code} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-orange-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{lang.nativeName}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Menu item list */}
          <div className="space-y-3">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No items found</p>
              ) : (
                filtered.map((item: MenuItem) => {
                  const translatedCount = LANGUAGES.filter((l) => isTranslated(item.id, l.code)).length;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedItem?.id === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium truncate">{item.name_en}</div>
                      <div className="text-xs opacity-70">{item.category} · {translatedCount}/{LANGUAGES.length} languages</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Translation panel */}
          <div className="md:col-span-3">
            {selectedItem ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedItem.name_en}</h2>
                  {selectedItem.description_en && (
                    <p className="text-sm text-muted-foreground">{selectedItem.description_en}</p>
                  )}
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {LANGUAGES.map((lang) => {
                    const t = getTranslation(selectedItem.id, lang.code);
                    const translated = isTranslated(selectedItem.id, lang.code);
                    return (
                      <Card key={lang.code}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{lang.name}</span>
                              <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                              {lang.rtl && <Badge variant="outline" className="text-xs">RTL</Badge>}
                            </div>
                            <Badge className={translated ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                              {translated ? "Translated" : "Not translated"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              dir={lang.rtl ? "rtl" : "ltr"}
                              value={t.name}
                              onChange={(e) => setTranslation(selectedItem.id, lang.code, "name", e.target.value)}
                              placeholder={`${lang.name} name`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              dir={lang.rtl ? "rtl" : "ltr"}
                              value={t.description}
                              onChange={(e) => setTranslation(selectedItem.id, lang.code, "description", e.target.value)}
                              placeholder={`${lang.name} description`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                  Select a menu item from the list to add translations
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
