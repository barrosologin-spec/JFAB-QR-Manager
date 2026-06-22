/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

export interface ColorPreset {
  name: string;
  hex: string;
  bg: string;
  bgHover: string;
  text: string;
  textLight: string;
  bgLight: string;
  bgLightHover: string;
  border: string;
  ring: string;
  borderActive: string;
  accentText: string;
}

export const COLOR_PRESETS: Record<string, ColorPreset> = {
  blue: {
    name: "Azul Corporativo",
    hex: "#2563eb",
    bg: "bg-blue-600",
    bgHover: "hover:bg-blue-700",
    text: "text-blue-750 font-bold",
    textLight: "text-blue-600",
    bgLight: "bg-blue-50/70",
    bgLightHover: "hover:bg-blue-100",
    border: "border-blue-200",
    ring: "focus:ring-blue-500/20 focus-within:ring-blue-500/20 ring-blue-500/20",
    borderActive: "border-blue-500",
    accentText: "text-blue-500"
  },
  emerald: {
    name: "Verde Esmeralda",
    hex: "#10b981",
    bg: "bg-emerald-600",
    bgHover: "hover:bg-emerald-700",
    text: "text-emerald-750 font-bold",
    textLight: "text-emerald-600",
    bgLight: "bg-emerald-50/70",
    bgLightHover: "hover:bg-emerald-100",
    border: "border-emerald-200",
    ring: "focus:ring-emerald-500/20 focus-within:ring-emerald-500/20 ring-emerald-500/20",
    borderActive: "border-emerald-500",
    accentText: "text-emerald-500"
  },
  orange: {
    name: "Laranja Alerta",
    hex: "#ea580c",
    bg: "bg-orange-600",
    bgHover: "hover:bg-orange-700",
    text: "text-orange-750 font-bold",
    textLight: "text-orange-600",
    bgLight: "bg-orange-50/70",
    bgLightHover: "hover:bg-orange-100",
    border: "border-orange-200",
    ring: "focus:ring-orange-500/20 focus-within:ring-orange-500/20 ring-orange-500/20",
    borderActive: "border-orange-500",
    accentText: "text-orange-500"
  },
  purple: {
    name: "Roxo Moderno",
    hex: "#8b5cf6",
    bg: "bg-purple-600",
    bgHover: "hover:bg-purple-700",
    text: "text-purple-750 font-bold",
    textLight: "text-purple-600",
    bgLight: "bg-purple-50/70",
    bgLightHover: "hover:bg-purple-100",
    border: "border-purple-200",
    ring: "focus:ring-purple-500/20 focus-within:ring-purple-500/20 ring-purple-500/20",
    borderActive: "border-purple-500",
    accentText: "text-purple-500"
  },
  rose: {
    name: "Rosa Rubi",
    hex: "#f43f5e",
    bg: "bg-rose-600",
    bgHover: "hover:bg-rose-700",
    text: "text-rose-750 font-bold",
    textLight: "text-rose-600",
    bgLight: "bg-rose-50/70",
    bgLightHover: "hover:bg-rose-100",
    border: "border-rose-200",
    ring: "focus:ring-rose-500/20 focus-within:ring-rose-500/20 ring-rose-500/20",
    borderActive: "border-rose-500",
    accentText: "text-rose-500"
  },
  cyan: {
    name: "Ciano Elétrico",
    hex: "#06b6d4",
    bg: "bg-cyan-600",
    bgHover: "hover:bg-cyan-700",
    text: "text-cyan-755 font-bold",
    textLight: "text-cyan-600",
    bgLight: "bg-cyan-50/70",
    bgLightHover: "hover:bg-cyan-100",
    border: "border-cyan-200",
    ring: "focus:ring-cyan-500/20 focus-within:ring-cyan-500/20 ring-cyan-500/20",
    borderActive: "border-cyan-500",
    accentText: "text-cyan-500"
  },
  amber: {
    name: "Âmbar Amarelo",
    hex: "#d97706",
    bg: "bg-amber-600",
    bgHover: "hover:bg-amber-700",
    text: "text-amber-750 font-bold",
    textLight: "text-amber-600",
    bgLight: "bg-amber-50/70",
    bgLightHover: "hover:bg-amber-100",
    border: "border-amber-200",
    ring: "focus:ring-amber-500/20 focus-within:ring-amber-500/20 ring-amber-500/20",
    borderActive: "border-amber-500",
    accentText: "text-amber-500"
  },
  indigo: {
    name: "Índigo Real",
    hex: "#4f46e5",
    bg: "bg-indigo-600",
    bgHover: "hover:bg-indigo-700",
    text: "text-indigo-750 font-bold",
    textLight: "text-indigo-600",
    bgLight: "bg-indigo-50/70",
    bgLightHover: "hover:bg-indigo-100",
    border: "border-indigo-200",
    ring: "focus:ring-indigo-500/20 focus-within:ring-indigo-500/20 ring-indigo-500/20",
    borderActive: "border-indigo-500",
    accentText: "text-indigo-500"
  }
};

/**
 * Returns the color preset ID deterministically from the category name or configured value.
 */
export const getCategoryColorId = (categoryName: string, storageData: any): string => {
  if (!categoryName) return 'blue';
  
  // 1. If explicit color is configured, return it
  const explicitColor = storageData[categoryName]?._color;
  if (explicitColor && COLOR_PRESETS[explicitColor]) {
    return explicitColor;
  }
  
  // 2. Otherwise deterministically hash the name
  const keys = Object.keys(COLOR_PRESETS);
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % keys.length;
  return keys[index];
};

/**
 * Helper to retrieve a complete preset payload
 */
export const getCategoryPreset = (categoryName: string, storageData: any): ColorPreset => {
  const colorId = getCategoryColorId(categoryName, storageData);
  return COLOR_PRESETS[colorId];
};
