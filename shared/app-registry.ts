import type { AppRegistryEntry } from "./app-types";

export const appRegistry: AppRegistryEntry[] = [
  {
    id: "employee",
    name: "Employee",
    description: "Zarządzanie pracownikami i sprawami kadrowymi.",
    url: "https://employee.grdn.pl",
    environment: "prod",
    category: "operations",
    sourcePath: "/home/ubuntu/Projects/hr-platform/apps/employee-web",
    enabled: true,
    visibleInHome: true,
    access: [
      {
        source: "realm",
        anyRoles: [
          "employee.superadmin",
          "employee.admin",
          "employee.manager",
          "employee.accounting",
          "employee.viewer",
          "employee.developer"
        ]
      }
    ]
  },
  {
    id: "personnel-notes",
    name: "Notatki Personelu",
    description: "Notatki operacyjne i kontekst pracy personelu.",
    url: "https://personnel-notes.grdn.pl",
    environment: "prod",
    category: "operations",
    sourcePath: "/home/ubuntu/Projects/personnel-notes-app",
    enabled: true,
    visibleInHome: true,
    access: [
      {
        source: "realm",
        anyRoles: ["personnel-owner", "personnel-hr", "personnel-manager"]
      }
    ]
  },
  {
    id: "system-rezerwacji",
    name: "System Rezerwacji",
    description: "Obsługa rezerwacji, planner i działania operacyjne wydarzeń.",
    url: "https://system-rezerwacji.grdn.pl",
    environment: "prod",
    category: "operations",
    sourcePath: "/home/ubuntu/Projects/system-rezerwacji/app",
    enabled: true,
    visibleInHome: true,
    access: [
      {
        source: "client",
        clientId: "system-rezerwacji-app",
        anyRoles: ["admin", "manager", "reception", "catering", "restaurant", "viewer"]
      }
    ]
  },
  {
    id: "rozliczenie-dnia",
    name: "Rozliczenie Dnia",
    description: "Dzienne rozliczenia operacyjne dla managera i kelnera.",
    url: "https://rozliczenie-dnia.grdn.pl",
    environment: "prod",
    category: "operations",
    sourcePath: "/home/ubuntu/Projects/rozliczenie-dnia/app",
    enabled: true,
    visibleInHome: true,
    access: [
      {
        source: "realm",
        anyRoles: ["admin", "kelner"]
      }
    ]
  },
  {
    id: "grello",
    name: "Grello",
    description: "Zadania i organizacja pracy operacyjnej.",
    url: "https://grello.grdn.pl",
    environment: "prod",
    category: "operations",
    sourcePath: "/home/ubuntu/Projects/grello-app",
    enabled: true,
    visibleInHome: false,
    access: []
  }
];
