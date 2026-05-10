/**
 * Targeting lekcji: konkretny appId z appRegistry albo "all" — lekcja
 * globalna o portalu (źródło: katalog `_global/` w shared/lessons/).
 */
export type LessonAppTarget = string;

export type LessonSummary = {
  id: string;
  appId: LessonAppTarget;
  appName?: string;
  title: string;
  summary?: string;
  order: number;
};

export type LessonDetail = LessonSummary & {
  contentMarkdown: string;
};

export type LessonsListResponse = {
  count: number;
  lessons: LessonSummary[];
};
