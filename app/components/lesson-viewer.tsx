"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { appConfig } from "@/src/lib/config";
import type { LessonDetail } from "@/src/types/api";

type Props = {
  lesson: LessonDetail;
};

function resolveImageSrc(appId: string, src: string): string {
  if (/^(https?:|data:)/i.test(src)) return src;
  const cleaned = src.replace(/^\.?\/+/, "");
  const withoutImagesPrefix = cleaned.replace(/^images\//, "");
  const folder = appId === "all" ? "_global" : appId;
  return `${appConfig.apiBaseUrl}/v1/lessons/static/${folder}/images/${withoutImagesPrefix}`;
}

function buildComponents(appId: string): Components {
  return {
    h1: ({ children }) => (
      <h1 className="mt-6 mb-3 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-foreground sm:text-3xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-6 mb-2 font-[family-name:var(--font-fraunces)] text-xl font-semibold text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-5 mb-2 text-base font-semibold text-foreground">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-3 text-sm leading-relaxed text-foreground sm:text-base">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 ml-5 list-disc space-y-1 text-sm text-foreground sm:text-base">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 ml-5 list-decimal space-y-1 text-sm text-foreground sm:text-base">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-accent underline-offset-2 hover:underline"
      >
        {children}
      </a>
    ),
    code: ({ children, className }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className={`${className ?? ""} block`}>{children}</code>
        );
      }
      return (
        <code className="rounded bg-surface-strong px-1.5 py-0.5 text-[0.85em] text-foreground">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-4 overflow-x-auto rounded-xl border border-border bg-surface-strong p-4 text-xs leading-relaxed text-foreground">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-accent/40 bg-surface-strong/40 px-4 py-2 text-sm italic text-muted">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-6 border-border" />,
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-surface-strong px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-3 py-2 text-sm text-foreground">{children}</td>
    ),
    img: ({ src, alt }) => {
      if (typeof src !== "string") return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageSrc(appId, src)}
          alt={alt ?? ""}
          loading="lazy"
          className="my-4 max-w-full rounded-xl border border-border"
        />
      );
    },
  };
}

export function LessonViewer({ lesson }: Props) {
  return (
    <article className="rounded-2xl border border-border bg-surface px-6 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 border-b border-border pb-4">
        {lesson.appName && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            {lesson.appName}
          </p>
        )}
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-foreground sm:text-3xl">
          {lesson.title}
        </h1>
        {lesson.summary && <p className="mt-2 text-sm text-muted">{lesson.summary}</p>}
      </header>

      <div className="text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents(lesson.appId)}>
          {lesson.contentMarkdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}
