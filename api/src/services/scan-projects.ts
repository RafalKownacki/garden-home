import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { AppRegistryEntry, ScanConfidence, ScannedAppCandidate } from "../../../shared/app-types.js";
import { loadRegistry } from "./registry-store.js";

const SKIP_DIRS = new Set([".git", ".next", "coverage", "dist", "build", "node_modules"]);
const TEXT_EXTENSIONS = new Set([".cjs", ".cts", ".env", ".js", ".json", ".jsx", ".md", ".mjs", ".mts", ".ts", ".tsx", ".txt", ".yaml", ".yml"]);
const MAX_FILE_SIZE_BYTES = 256 * 1024;
const MAX_SCAN_FILES = 80;
const MAX_SCAN_DEPTH = 3;
const URL_REGEX = /https:\/\/[a-z0-9.-]+\.grdn\.pl/gi;
const CLIENT_ID_REGEXES = [
  /(?:NEXT_PUBLIC_KEYCLOAK_CLIENT_ID|KEYCLOAK_CLIENT_ID)\s*[:=]\s*["'`]?([A-Za-z0-9._-]+)/g,
  /clientId\s*[:=]\s*["'`]([A-Za-z0-9._-]+)["'`]/g
];
const ROLE_LINE_REGEX = /role/i;
const QUOTED_TOKEN_REGEX = /["'`]([A-Za-z0-9._-]{3,})["'`]/g;
const UNQUOTED_ROLE_REGEX = /(?:KEYCLOAK_REQUIRED_ROLE|requiredRole)\s*[:=]\s*([A-Za-z0-9._-]+)/g;
const ROLE_STOPWORDS = new Set([
  "admin",
  "actorrole",
  "aud",
  "auth",
  "authorization",
  "bearer",
  "blockedbyrole",
  "button",
  "business_role",
  "businessrole",
  "client",
  "developer",
  "garden",
  "home",
  "login",
  "logout",
  "manager",
  "missing_business_role",
  "member",
  "realm",
  "resolverole",
  "role",
  "role-chip",
  "role-switcher",
  "roles",
  "selectedrole",
  "token",
  "true",
  "user",
  "userrole",
  "viewer",
  "vite_role_switcher_enabled",
  "x-dev-auth-roles"
]);

type ScanFile = {
  path: string;
  content: string;
};

function prettyName(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePrettyName(value: string): string {
  return prettyName(value).trim();
}

function inferIdFromPath(candidatePath: string): string {
  const base = path.basename(candidatePath);
  if (base === "app") {
    return path.basename(path.dirname(candidatePath)).replace(/-app$/, "");
  }

  return base.replace(/-app$/, "");
}

function inferName(candidatePath: string, packageName?: string): string {
  const fallback = normalizePrettyName(inferIdFromPath(candidatePath));
  if (!packageName) return fallback;

  const normalized = packageName
    .replace(/^@[^/]+\//, "")
    .replace(/app$/, "")
    .replace(/-app$/, "")
    .trim();

  if (!normalized || normalized === "app") {
    return fallback;
  }

  return normalizePrettyName(normalized);
}

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (TEXT_EXTENSIONS.has(ext)) return true;
  return path.basename(filePath).startsWith(".env");
}

async function collectCandidateDirs(projectsRoot: string): Promise<string[]> {
  const entries = await readdir(projectsRoot, { withFileTypes: true });
  const candidatePaths = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const directPath = path.join(projectsRoot, entry.name);
    if (entry.name.endsWith("-app")) {
      candidatePaths.add(directPath);
    }

    const nestedAppPath = path.join(directPath, "app");
    try {
      const nestedStats = await stat(path.join(nestedAppPath, "package.json"));
      if (nestedStats.isFile()) {
        candidatePaths.add(nestedAppPath);
      }
    } catch {
      // missing nested app is expected for most repos
    }
  }

  return Array.from(candidatePaths).sort((left, right) => left.localeCompare(right));
}

async function collectScanFiles(rootPath: string): Promise<ScanFile[]> {
  const queue: Array<{ dirPath: string; depth: number }> = [{ dirPath: rootPath, depth: 0 }];
  const results: ScanFile[] = [];

  while (queue.length > 0 && results.length < MAX_SCAN_FILES) {
    const current = queue.shift();
    if (!current) break;

    const entries = await readdir(current.dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current.dirPath, entry.name);

      if (entry.isDirectory()) {
        if (current.depth >= MAX_SCAN_DEPTH) continue;
        if (SKIP_DIRS.has(entry.name)) continue;
        queue.push({ dirPath: entryPath, depth: current.depth + 1 });
        continue;
      }

      if (!entry.isFile() || !isTextFile(entryPath)) continue;

      try {
        const entryStats = await stat(entryPath);
        if (entryStats.size > MAX_FILE_SIZE_BYTES) continue;
        const content = await readFile(entryPath, "utf8");
        results.push({ path: entryPath, content });
      } catch {
        // unreadable files are skipped
      }

      if (results.length >= MAX_SCAN_FILES) break;
    }
  }

  return results;
}

function extractUrls(files: ScanFile[]): string[] {
  const urls = new Set<string>();

  for (const file of files) {
    const matches = file.content.match(URL_REGEX) ?? [];
    for (const match of matches) {
      urls.add(match);
    }
  }

  return Array.from(urls).sort((left, right) => left.localeCompare(right));
}

function extractClientIds(files: ScanFile[]): string[] {
  const clientIds = new Set<string>();

  for (const file of files) {
    for (const regex of CLIENT_ID_REGEXES) {
      const matcher = new RegExp(regex.source, regex.flags);
      let match = matcher.exec(file.content);
      while (match) {
        clientIds.add(match[1].replace(/^[-\s]+/, ""));
        match = matcher.exec(file.content);
      }
    }
  }

  return Array.from(clientIds).sort((left, right) => left.localeCompare(right));
}

function extractRoles(files: ScanFile[], inferredId: string): string[] {
  const roles = new Set<string>();
  const idNeedle = inferredId.toLowerCase();
  const fallbackNeedle = idNeedle.split("-")[0];

  for (const file of files) {
    for (const line of file.content.split("\n")) {
      if (!ROLE_LINE_REGEX.test(line)) continue;

      let tokenMatch = QUOTED_TOKEN_REGEX.exec(line);
      while (tokenMatch) {
        const token = tokenMatch[1];
        const lower = token.toLowerCase();
        if (
          token === lower &&
          !ROLE_STOPWORDS.has(lower) &&
          !lower.startsWith("http") &&
          !lower.startsWith("vite_") &&
          (lower.includes(idNeedle) || lower.includes(fallbackNeedle))
        ) {
          roles.add(token);
        }
        tokenMatch = QUOTED_TOKEN_REGEX.exec(line);
      }

      QUOTED_TOKEN_REGEX.lastIndex = 0;

      let rawRoleMatch = UNQUOTED_ROLE_REGEX.exec(line);
      while (rawRoleMatch) {
        roles.add(rawRoleMatch[1]);
        rawRoleMatch = UNQUOTED_ROLE_REGEX.exec(line);
      }

      UNQUOTED_ROLE_REGEX.lastIndex = 0;
    }
  }

  return Array.from(roles).sort((left, right) => left.localeCompare(right));
}

function choosePrimaryUrl(urls: string[], inferredId: string): string | undefined {
  if (urls.length === 0) return undefined;
  const fallbackNeedle = inferredId.split("-")[0];

  const exactMatch = urls.find((url) => url === `https://${inferredId}.grdn.pl`);
  if (exactMatch) return exactMatch;

  const nonApi = urls.filter((url) => !url.includes("-api.") && !url.includes("auth.grdn.pl"));
  const idMatch = nonApi.find(
    (url) => url.includes(`https://${inferredId}.`) || url.includes(`https://${fallbackNeedle}.`)
  );

  return idMatch;
}

function inferConfidence(params: {
  matchedRegistryId?: string;
  inferredUrl?: string;
  clientIds: string[];
  roles: string[];
}): ScanConfidence {
  const score =
    (params.matchedRegistryId ? 1 : 0) +
    (params.inferredUrl ? 1 : 0) +
    (params.clientIds.length > 0 ? 1 : 0) +
    (params.roles.length > 0 ? 1 : 0);

  if (score >= 3) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function buildNotes(params: {
  packageName?: string;
  urls: string[];
  roles: string[];
  matchedRegistryId?: string;
  candidatePath: string;
}): string[] {
  const notes: string[] = [];

  if (params.packageName) {
    notes.push(`package.name=${params.packageName}`);
  }

  if (params.urls.length === 0) {
    notes.push("Nie znaleziono jawnego hosta grdn.pl w skanowanych plikach.");
  }

  if (params.roles.length === 0) {
    notes.push("Nie znaleziono wiarygodnych wskazówek ról w skanowanych plikach.");
  }

  if (params.matchedRegistryId) {
    notes.push(`Już istnieje w registry jako ${params.matchedRegistryId}.`);
  } else {
    notes.push("Brak wpisu w registry.");
  }

  if (path.basename(params.candidatePath) === "app") {
    notes.push("Kandydat wykryty jako zagnieżdżony frontend w monorepo.");
  }

  return notes;
}

export async function scanProjects(projectsRoot: string): Promise<ScannedAppCandidate[]> {
  const appRegistry = await loadRegistry();
  const candidateDirs = await collectCandidateDirs(projectsRoot);
  const currentRepoRoot = path.resolve(projectsRoot, "garden-home");
  const candidates: ScannedAppCandidate[] = [];

  for (const candidatePath of candidateDirs) {
    if (candidatePath.startsWith(currentRepoRoot)) continue;

    const files = await collectScanFiles(candidatePath);
    const packageJsonFile = files.find((file) => path.basename(file.path) === "package.json");
    const packageName = packageJsonFile ? safelyReadPackageName(packageJsonFile.content) : undefined;
    const inferredId = inferIdFromPath(candidatePath);
    const inferredName = inferName(candidatePath, packageName);
    const urls = extractUrls(files);
    const clientIds = extractClientIds(files);
    const roles = extractRoles(files, inferredId);
    const inferredUrl = choosePrimaryUrl(urls, inferredId) ?? `https://${inferredId}.grdn.pl`;
    const registryEntry = appRegistry.find(
      (entry: AppRegistryEntry) =>
        entry.sourcePath === candidatePath ||
        entry.id === inferredId ||
        entry.url === inferredUrl
    );

    candidates.push({
      sourcePath: candidatePath,
      inferredId,
      inferredName,
      inferredUrl,
      inferredClientIds: clientIds,
      inferredRoles: roles,
      matchedRegistryId: registryEntry?.id,
      isPublished: Boolean(registryEntry?.visibleInHome && registryEntry?.enabled),
      confidence: inferConfidence({
        matchedRegistryId: registryEntry?.id,
        inferredUrl,
        clientIds,
        roles
      }),
      notes: buildNotes({
        packageName,
        urls,
        roles,
        matchedRegistryId: registryEntry?.id,
        candidatePath
      })
    });
  }

  return candidates.sort((left, right) => left.inferredId.localeCompare(right.inferredId));
}

function safelyReadPackageName(rawPackageJson: string): string | undefined {
  try {
    const parsed = JSON.parse(rawPackageJson) as { name?: string };
    return parsed.name?.trim() || undefined;
  } catch {
    return undefined;
  }
}
