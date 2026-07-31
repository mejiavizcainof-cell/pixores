export const PIXORES_FONT_GROUPS = [
  {
    label: "Popular",
    fonts: ["Inter", "Montserrat", "Poppins", "Roboto", "Open Sans", "Lato", "Oswald", "Bebas Neue"],
  },
  {
    label: "Bold & Display",
    fonts: [
      "Anton", "Archivo Black", "Alfa Slab One", "Black Ops One", "Bowlby One SC", "Bungee",
      "Fjalla One", "League Spartan", "Luckiest Guy", "Passion One", "Permanent Marker", "Russo One",
      "Staatliches", "Teko", "Titan One", "Ultra",
    ],
  },
  {
    label: "Modern Sans Serif",
    fonts: [
      "Archivo", "Barlow", "Cabin", "DM Sans", "Exo 2", "Figtree", "Josefin Sans", "Kanit",
      "Manrope", "Mulish", "Nunito Sans", "Outfit", "Plus Jakarta Sans", "Quicksand", "Raleway",
      "Roboto Condensed", "Rubik", "Space Grotesk", "Ubuntu", "Work Sans",
    ],
  },
  {
    label: "Serif & Editorial",
    fonts: [
      "Abril Fatface", "Bitter", "Bodoni Moda", "Cinzel", "Cormorant Garamond", "DM Serif Display",
      "Libre Baskerville", "Lora", "Merriweather", "Noto Serif", "Playfair Display", "Roboto Slab",
      "Source Serif 4", "Spectral",
    ],
  },
  {
    label: "Script & Handwritten",
    fonts: [
      "Caveat", "Courgette", "Dancing Script", "Great Vibes", "Kaushan Script", "Lobster",
      "Pacifico", "Patrick Hand", "Sacramento", "Satisfy", "Shadows Into Light", "Yellowtail",
    ],
  },
  {
    label: "System Fonts",
    fonts: [
      "Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia", "Impact", "Tahoma",
      "Times New Roman", "Trebuchet MS", "Verdana",
    ],
  },
] as const;

export const PIXORES_SYSTEM_FONT_NAMES = new Set<string>(
  PIXORES_FONT_GROUPS.find((group) => group.label === "System Fonts")?.fonts || [],
);

export const PIXORES_PRELOADED_GOOGLE_FONTS = new Set<string>([
  "Anton",
  "Bebas Neue",
  "Inter",
  "Montserrat",
  "Poppins",
]);

export const PIXORES_FONT_COUNT = PIXORES_FONT_GROUPS.reduce((total, group) => total + group.fonts.length, 0);
