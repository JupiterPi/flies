import { tags as t } from "@lezer/highlight";
import { createTheme, type CreateThemeOptions } from "@uiw/codemirror-themes";

const themeColors = {
  primary: "oklch(from var(--color-primary) calc(l * 1.4) calc(c * 1.4) h)",
  secondary: "var(--color-secondary)",
};

const reusableStyles = {
  heading: {
    color: themeColors.primary,
    fontWeight: "500",
  },
};

export const defaultSettingsAura: CreateThemeOptions["settings"] = {
  background: "transparent",
  //foreground: "#edecee",
  caret: themeColors.primary,
  selection:
    "oklch(from var(--color-primary) calc(l * 1.2) calc(c * 1.5) h / 0.5)",
  selectionMatch:
    "oklch(from var(--color-primary) calc(l * 1.2) calc(c * 1.5) h / 0.3)",
  //gutterBackground: "#0a0a0a",
  //gutterForeground: "#edecee",
  gutterBorder: "transparent",
  lineHighlight: "transparent",
  fontFamily: "var(--font-serif)",
};

export const auraDarkStyle: CreateThemeOptions["styles"] = [
  {
    tag: t.heading1,
    ...reusableStyles.heading,
    fontSize: "150%",
  },
  {
    tag: t.heading2,
    ...reusableStyles.heading,
    fontSize: "125%",
  },
  {
    tag: t.heading3,
    ...reusableStyles.heading,
    fontSize: "110%",
  },
  {
    tag: t.heading4,
    ...reusableStyles.heading,
    fontSize: "90%",
  },
  {
    tag: t.heading5,
    ...reusableStyles.heading,
    fontSize: "80%",
  },
  {
    tag: t.heading6,
    ...reusableStyles.heading,
    fontSize: "70%",
  },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.monospace, fontFamily: "var(--font-mono)" },

  { tag: t.keyword, color: themeColors.primary },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: "#edecee" },
  { tag: [t.propertyName], color: "#ffca85" },
  {
    tag: [t.processingInstruction, t.string, t.inserted, t.special(t.string)],
    color: /* "#61ffca", */ themeColors.primary,
    fontFamily: "var(--font-mono)",
    opacity: 0.5,
  },
  { tag: [t.function(t.variableName), t.labelName], color: "#ffca85" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#61ffca" },
  { tag: [t.definition(t.name), t.separator], color: "#edecee" },
  { tag: [t.className], color: "#82e2ff" },
  {
    tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
    color: /* "#61ffca", */ themeColors.primary,
  },
  { tag: [t.typeName], color: "#82e2ff" },
  { tag: [t.operator, t.operatorKeyword], color: themeColors.primary },
  {
    tag: [t.url, t.escape, t.regexp, t.link],
    color: /* "#61ffca", */ themeColors.primary,
  },
  { tag: [t.meta, t.comment], color: "#6d6d6d" },
  { tag: t.link, textDecoration: "underline" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#edecee" },
  { tag: t.invalid, color: "#ff6767" },
  { tag: t.strikethrough, textDecoration: "line-through" },
];

export const auraInit = (options?: Partial<CreateThemeOptions>) => {
  const { theme = "dark", settings = {}, styles = [] } = options || {};
  return createTheme({
    theme: theme,
    settings: {
      ...defaultSettingsAura,
      ...settings,
    },
    styles: [...auraDarkStyle, ...styles],
  });
};

export const aura = auraInit();
