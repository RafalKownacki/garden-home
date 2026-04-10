import type { AppRegistryEntry } from "./app-types";

export const appRegistry: AppRegistryEntry[] = [
  // ── Operations ─────────────────────────────────────────────
  {
    id: "employee",
    name: "Employee",
    description: "Zarządzanie pracownikami i sprawami kadrowymi.",
    url: "https://employee.grdn.pl",
    environment: "prod",
    category: "kadry",
    sourcePath: "/home/ubuntu/Projects/hr-platform/apps/employee-web",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "employee.superadmin", "employee.admin", "employee.manager", "employee.accounting", "employee.viewer", "employee.developer"] }
    ]
  },
  {
    id: "lista-plac",
    name: "Lista Płac",
    description: "Przegląd i zarządzanie listami płac pracowników.",
    url: "https://lista-plac.grdn.pl",
    environment: "prod",
    category: "kadry",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "lista-plac-access", "employee.accounting"] }
    ]
  },
  {
    id: "personnel-notes",
    name: "Notatki Personelu",
    description: "Notatki operacyjne i kontekst pracy personelu.",
    url: "https://personnel-notes.grdn.pl",
    environment: "prod",
    category: "kadry",
    sourcePath: "/home/ubuntu/Projects/personnel-notes-app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "personnel-owner", "personnel-hr", "personnel-manager"] }
    ]
  },
  {
    id: "rekrutacja",
    name: "Rekrutacja",
    description: "Proces rekrutacji nowych pracowników.",
    url: "https://rekrutacja.grdn.pl",
    environment: "prod",
    category: "kadry",
    sourcePath: "/home/ubuntu/Projects/rekrutacja",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "personnel-owner", "personnel-hr"] }
    ]
  },

  // ── Rezerwacje & Eventy ────────────────────────────────────
  {
    id: "system-rezerwacji",
    name: "BEO / System Rezerwacji",
    description: "Obsługa rezerwacji, planner i eventy bankietowe.",
    url: "https://system-rezerwacji.grdn.pl",
    environment: "prod",
    category: "rezerwacje",
    sourcePath: "/home/ubuntu/Projects/beo/app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin"] },
      { source: "client", clientId: "system-rezerwacji-app", anyRoles: ["admin", "manager", "reception", "catering", "restaurant", "viewer"] }
    ]
  },
  {
    id: "rezerwacje-oaza",
    name: "Rezerwacje Oaza",
    description: "System rezerwacji dla Restauracji Oaza.",
    url: "https://rezerwacje-oaza.grdn.pl",
    environment: "prod",
    category: "rezerwacje",
    sourcePath: "/home/ubuntu/Projects/rezerwacje-oaza",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager", "kelner"] }
    ]
  },
  {
    id: "rezerwacje-restauracja",
    name: "Rezerwacje Restauracja",
    description: "Rezerwacje stolików w restauracji.",
    url: "https://rezerwacje-restauracja.grdn.pl",
    environment: "prod",
    category: "rezerwacje",
    sourcePath: "/home/ubuntu/Projects/rezerwacje-restauracja",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager", "kelner"] }
    ]
  },
  {
    id: "pos-hotelapp",
    name: "POS Hotel",
    description: "Aplikacja POS dla recepcji hotelowej.",
    url: "https://pos-hotelapp.grdn.pl",
    environment: "prod",
    category: "rezerwacje",
    sourcePath: "/home/ubuntu/Projects/pos-hotelapp",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] }
    ]
  },

  // ── Restauracja & Kuchnia ──────────────────────────────────
  {
    id: "rozliczenie-dnia",
    name: "Rozliczenie Dnia",
    description: "Dzienne rozliczenia operacyjne dla managera i kelnera.",
    url: "https://rozliczenie-dnia.grdn.pl",
    environment: "prod",
    category: "restauracja",
    sourcePath: "/home/ubuntu/Projects/rozliczenie-dnia/app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "kelner"] }
    ]
  },
  {
    id: "rozliczenie-dnia-oaza",
    name: "Rozliczenie Dnia — Oaza",
    description: "Rozliczenia dzienne dla Restauracji Oaza.",
    url: "https://rozliczenie-dnia-oaza.grdn.pl",
    environment: "prod",
    category: "restauracja",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "kelner"] }
    ]
  },
  {
    id: "strefa-kelnera",
    name: "Strefa Kelnera",
    description: "Panel operacyjny dla kelnerów — zadania, przepisy, checklist.",
    url: "https://strefa-kelnera.grdn.pl",
    environment: "prod",
    category: "restauracja",
    sourcePath: "/home/ubuntu/Projects/strefa-kelnera-app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager", "kelner"] },
      { source: "client", clientId: "strefa-kelnera-app", anyRoles: ["superadmin", "admin", "manager", "kelner"] }
    ]
  },
  {
    id: "recipebook",
    name: "Recipebook",
    description: "Receptury, kalkulacje food cost i karty dań.",
    url: "https://recipebook.grdn.pl",
    environment: "prod",
    category: "restauracja",
    sourcePath: "/home/ubuntu/Projects/recipebook/app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] }
    ]
  },
  {
    id: "magazyn",
    name: "Magazyn",
    description: "Zarządzanie magazynem — przyjęcia, wydania, remanent.",
    url: "https://magazyn.grdn.pl",
    environment: "prod",
    category: "restauracja",
    sourcePath: "/home/ubuntu/Projects/magazyn/app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] },
      { source: "client", clientId: "magazyn-app", anyRoles: ["admin", "kierownik", "magazyn", "pracownik"] }
    ]
  },
  {
    id: "zakupy",
    name: "Zakupy",
    description: "Zarządzanie zamówieniami i zakupami dla kuchni.",
    url: "https://zakupy.grdn.pl",
    environment: "prod",
    category: "restauracja",
    sourcePath: "/home/ubuntu/Projects/zakupy",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] }
    ]
  },
  {
    id: "haccp-panel",
    name: "HACCP",
    description: "Dokumentacja HACCP, kontrole temperatury i audyty.",
    url: "https://haccp-panel.grdn.pl",
    environment: "prod",
    category: "restauracja",
    sourcePath: "/home/ubuntu/Projects/haccp-panel/app",
    enabled: false,
    visibleInHome: false,
    access: [
      { source: "realm", anyRoles: ["admin", "haccp-editor", "haccp-reviewer"] }
    ]
  },

  // ── Finanse ────────────────────────────────────────────────
  {
    id: "fincost",
    name: "FinCost",
    description: "Budżetowanie, koszty i analiza finansowa.",
    url: "https://fin.grdn.pl",
    environment: "prod",
    category: "finanse",
    sourcePath: "/home/ubuntu/Projects/FinCostApp/frontend",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "fincost-admin"] }
    ]
  },
  {
    id: "przelewy",
    name: "Przelewy",
    description: "Zarządzanie przelewami bankowymi i integracja ING.",
    url: "https://przelewy.grdn.pl",
    environment: "prod",
    category: "finanse",
    sourcePath: "/home/ubuntu/Projects/przelewy-app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin"] },
      { source: "client", clientId: "przelewy-app", anyRoles: ["admin", "manager", "viewer"] }
    ]
  },
  {
    id: "ksef",
    name: "KSeF Explorer",
    description: "Przeglądanie i analiza faktur z Krajowego Systemu e-Faktur.",
    url: "https://ksef.grdn.pl",
    environment: "prod",
    category: "finanse",
    sourcePath: "/home/ubuntu/Projects/ksef-explorer",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "fincost-admin"] }
    ]
  },

  // ── Narzędzia & Organizacja ────────────────────────────────
  {
    id: "grello",
    name: "Grello",
    description: "Tablica zadań w stylu Kanban — organizacja pracy.",
    url: "https://grello.grdn.pl",
    environment: "prod",
    category: "narzędzia",
    sourcePath: "/home/ubuntu/Projects/grello-app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] }
    ]
  },
  {
    id: "marketingowiec",
    name: "Marketingowiec",
    description: "Kampanie marketingowe, kreacje i publikacja treści.",
    url: "https://marketingowiec.grdn.pl",
    environment: "prod",
    category: "narzędzia",
    sourcePath: "/home/ubuntu/Projects/marketingowiec/app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "authenticated" }
    ]
  },
  {
    id: "vault",
    name: "Vault",
    description: "Centralne repozytorium zdjęć i plików dla GRDN.",
    url: "https://vault.grdn.pl",
    environment: "prod",
    category: "narzędzia",
    sourcePath: "/home/ubuntu/Projects/vault/app",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager", "kelner"] }
    ]
  },
  {
    id: "chat",
    name: "Chat",
    description: "Wewnętrzny komunikator dla zespołu.",
    url: "https://chat.grdn.pl",
    environment: "prod",
    category: "narzędzia",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin"] }
    ]
  },

  // ── Infrastruktura & Monitoring ────────────────────────────
  {
    id: "metersapp",
    name: "Liczniki",
    description: "Odczyty liczników mediów — woda, prąd, gaz.",
    url: "https://metersapp.grdn.pl",
    environment: "prod",
    category: "infrastruktura",
    sourcePath: "/home/ubuntu/Projects/metersapp",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] }
    ]
  },
  {
    id: "tereny-zielone",
    name: "Tereny Zielone",
    description: "Zarządzanie terenami zielonymi i pielęgnacją ogrodu.",
    url: "https://tereny-zielone.grdn.pl",
    environment: "prod",
    category: "infrastruktura",
    sourcePath: "/home/ubuntu/Projects/tereny-zielone",
    enabled: true,
    visibleInHome: true,
    access: [
      { source: "realm", anyRoles: ["admin", "manager"] }
    ]
  },
];
