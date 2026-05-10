import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { LessonDetail, LessonSummary } from "../../../shared/lesson-types.js";
import { appRegistry } from "../../../shared/app-registry.js";
import { config } from "../config.js";

export const LESSONS_ROOT = path.resolve(config.rootDir, "../shared/lessons");
export const GLOBAL_FOLDER = "_global";
export const GLOBAL_APP_ID = "all";

const FILENAME_RE = /^(?:(\d+)-)?(.+)\.md$/i;

type LessonInternal = LessonDetail & {
  filePath: string;
  mtimeMs: number;
};

let cache: LessonInternal[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30 * 1000;

const validAppIds = new Set(appRegistry.map((entry) => entry.id));
const appNameById = new Map(appRegistry.map((entry) => [entry.id, entry.name]));

function folderToAppId(folder: string): string {
  return folder === GLOBAL_FOLDER ? GLOBAL_APP_ID : folder;
}

function isAcceptableAppId(appId: string): boolean {
  return appId === GLOBAL_APP_ID || validAppIds.has(appId);
}

function appNameForId(appId: string): string | undefined {
  if (appId === GLOBAL_APP_ID) return "Globalne";
  return appNameById.get(appId);
}

async function readAppFolder(folder: string): Promise<LessonInternal[]> {
  const appId = folderToAppId(folder);
  if (!isAcceptableAppId(appId)) {
    console.warn(`[lessons-store] folder "${folder}" nie odpowiada żadnemu appId — pominięto`);
    return [];
  }

  const folderPath = path.join(LESSONS_ROOT, folder);
  const entries = await readdir(folderPath, { withFileTypes: true });
  const lessons: LessonInternal[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(FILENAME_RE);
    if (!match) continue;

    const [, prefixOrder, slugRaw] = match;
    const slug = slugRaw.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const filePath = path.join(folderPath, entry.name);

    let raw: string;
    let stats;
    try {
      raw = await readFile(filePath, "utf8");
      stats = await stat(filePath);
    } catch (error) {
      console.warn(`[lessons-store] nie udało się odczytać ${filePath}:`, error);
      continue;
    }

    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : null;
    if (!title) {
      console.warn(`[lessons-store] brak title w frontmatter: ${filePath} — pominięto`);
      continue;
    }

    const summary = typeof data.summary === "string" ? data.summary.trim() : undefined;
    const order = typeof data.order === "number"
      ? data.order
      : prefixOrder
        ? Number.parseInt(prefixOrder, 10)
        : 999;

    lessons.push({
      id: `${appId}/${slug}`,
      appId,
      appName: appNameForId(appId),
      title,
      summary,
      order,
      contentMarkdown: parsed.content.trimStart(),
      filePath,
      mtimeMs: stats.mtimeMs,
    });
  }

  return lessons;
}

async function loadAll(): Promise<LessonInternal[]> {
  let folders: string[] = [];
  try {
    const entries = await readdir(LESSONS_ROOT, { withFileTypes: true });
    folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    console.warn(`[lessons-store] folder ${LESSONS_ROOT} nie istnieje — brak lekcji`);
    return [];
  }

  const collected: LessonInternal[] = [];
  for (const folder of folders) {
    if (folder === "images") continue;
    const lessons = await readAppFolder(folder);
    collected.push(...lessons);
  }

  collected.sort((a, b) => {
    if (a.appId === b.appId) return a.order - b.order || a.title.localeCompare(b.title, "pl");
    if (a.appId === GLOBAL_APP_ID) return -1;
    if (b.appId === GLOBAL_APP_ID) return 1;
    return a.appId.localeCompare(b.appId, "pl");
  });

  return collected;
}

async function ensureCache(): Promise<LessonInternal[]> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;
  cache = await loadAll();
  cacheLoadedAt = now;
  return cache;
}

function toSummary(lesson: LessonInternal): LessonSummary {
  return {
    id: lesson.id,
    appId: lesson.appId,
    appName: lesson.appName,
    title: lesson.title,
    summary: lesson.summary,
    order: lesson.order,
  };
}

function toDetail(lesson: LessonInternal): LessonDetail {
  return {
    ...toSummary(lesson),
    contentMarkdown: lesson.contentMarkdown,
  };
}

export async function listLessons(): Promise<LessonSummary[]> {
  const all = await ensureCache();
  return all.map(toSummary);
}

export async function getLesson(appId: string, slug: string): Promise<LessonDetail | null> {
  const all = await ensureCache();
  const lesson = all.find((l) => l.appId === appId && l.id === `${appId}/${slug}`);
  return lesson ? toDetail(lesson) : null;
}

export async function countLessonsByAppId(appId: string): Promise<number> {
  const all = await ensureCache();
  return all.filter((lesson) => lesson.appId === appId).length;
}

export function invalidateCache(): void {
  cache = null;
  cacheLoadedAt = 0;
}
