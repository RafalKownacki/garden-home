import type { AppRegistryEntry } from "./app-types";

export const appRegistry: AppRegistryEntry[] = [
  {
    id: "employee",
    name: "Employee",
    description: "Zarządzanie pracownikami i sprawami kadrowymi.",
    url: "https://employee.grdn.pl",
    environment: "prod",
    category: "operations",
    sourcePath: "/home/ubuntu/Projects/employee/app",
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
