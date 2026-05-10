import type { Express } from "express";
import { getLesson, listLessons } from "../services/lessons-store.js";

export function registerLessonsRoutes(app: Express) {
  app.get("/v1/lessons", async (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    const lessons = await listLessons();
    res.json({ count: lessons.length, lessons });
  });

  app.get("/v1/lessons/:appId/:slug", async (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    const { appId, slug } = req.params;
    const lesson = await getLesson(appId, slug);
    if (!lesson) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json(lesson);
  });
}
