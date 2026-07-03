import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";

export interface NovelSearchMatch {
  paragraphIndex: number;
  start: number;
  end: number;
}

export interface NovelSearchOptions {
  caseSensitive?: boolean;
  maxMatches?: number;
  debounceMs?: number;
}

const DEFAULT_MAX_MATCHES = 1000;
const DEFAULT_DEBOUNCE_MS = 150;

/**
 * 在段落数组中查找关键字匹配位置。
 * 默认大小写不敏感；逐段转换大小写，避免复制整篇文本。
 */
export function findMatches(
  paragraphs: string[],
  query: string,
  caseSensitive = false,
  maxMatches = DEFAULT_MAX_MATCHES,
): NovelSearchMatch[] {
  if (!query) return [];

  const q = caseSensitive ? query : query.toLowerCase();
  const matches: NovelSearchMatch[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (!paragraph) continue;

    const text = caseSensitive ? paragraph : paragraph.toLowerCase();
    let start = 0;

    while ((start = text.indexOf(q, start)) !== -1) {
      const end = start + q.length;
      matches.push({ paragraphIndex: i, start, end });
      if (matches.length >= maxMatches) return matches;
      start = end;
    }
  }

  return matches;
}

/**
 * 清除容器内已有的搜索高亮标记，并合并相邻文本节点。
 */
export function clearHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll("mark.novel-search-match");
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    parent.insertBefore(document.createTextNode(mark.textContent ?? ""), mark);
    parent.removeChild(mark);
  }
  container.normalize();
}

/**
 * 在容器段落中应用高亮标记。
 * 仅修改包含匹配的段落，不重新渲染整篇小说；不使用 innerHTML。
 */
export function applyHighlights(
  container: HTMLElement,
  paragraphs: string[],
  matches: NovelSearchMatch[],
  activeIndex: number,
): void {
  clearHighlights(container);

  if (!matches.length) return;

  const paragraphElements = Array.from(container.querySelectorAll(":scope > p"));
  const matchesByParagraph = new Map<number, NovelSearchMatch[]>();

  for (const match of matches) {
    const list = matchesByParagraph.get(match.paragraphIndex);
    if (list) {
      list.push(match);
    } else {
      matchesByParagraph.set(match.paragraphIndex, [match]);
    }
  }

  let globalIndex = 0;
  for (const [paragraphIndex, paragraphMatches] of matchesByParagraph) {
    const p = paragraphElements[paragraphIndex];
    if (!p) continue;

    const text = paragraphs[paragraphIndex] ?? "";
    p.textContent = "";
    let lastEnd = 0;

    for (const match of paragraphMatches) {
      if (match.start > lastEnd) {
        p.appendChild(document.createTextNode(text.slice(lastEnd, match.start)));
      }

      const mark = document.createElement("mark");
      mark.className = "novel-search-match";
      mark.textContent = text.slice(match.start, match.end);
      mark.dataset.matchIndex = String(globalIndex);

      if (globalIndex === activeIndex) {
        mark.classList.add("novel-search-match-active");
      }

      p.appendChild(mark);
      lastEnd = match.end;
      globalIndex++;
    }

    if (lastEnd < text.length) {
      p.appendChild(document.createTextNode(text.slice(lastEnd)));
    }
  }
}

function scrollToActive(container: HTMLElement, activeIndex: number): void {
  if (activeIndex < 0) return;
  const activeMark = container.querySelector<HTMLElement>(
    `mark.novel-search-match[data-match-index="${activeIndex}"]`,
  );
  if (activeMark) {
    activeMark.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * 小说正文搜索 primitive。
 * 提供查询、匹配列表、当前匹配、导航等状态，并负责在 DOM 上安全高亮。
 */
export function createNovelSearch(
  text: Accessor<string | null>,
  container: Accessor<HTMLElement | undefined>,
  options: NovelSearchOptions = {},
) {
  const {
    caseSensitive = false,
    maxMatches = DEFAULT_MAX_MATCHES,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  const [query, setQuery] = createSignal("");
  const [searchTerm, setSearchTerm] = createSignal("");
  const [matches, setMatches] = createSignal<NovelSearchMatch[]>([]);
  const [activeIndex, setActiveIndex] = createSignal(-1);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressDebounce = false;

  createEffect(() => {
    const value = query();
    if (debounceTimer) clearTimeout(debounceTimer);

    if (suppressDebounce) {
      suppressDebounce = false;
      return;
    }

    debounceTimer = setTimeout(() => setSearchTerm(value), debounceMs);

    onCleanup(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
    });
  });

  createEffect(() => {
    const term = searchTerm();
    const currentText = text();
    const paragraphs = currentText ? currentText.split("\n\n") : [];
    const newMatches = findMatches(paragraphs, term, caseSensitive, maxMatches);
    setMatches(newMatches);
    setActiveIndex(newMatches.length > 0 ? 0 : -1);
  });

  let rafId: ReturnType<typeof requestAnimationFrame> | undefined;

  createEffect(() => {
    const currentMatches = matches();
    const currentActive = activeIndex();
    const currentContainer = container();
    const currentText = text();
    const paragraphs = currentText ? currentText.split("\n\n") : [];

    if (rafId) cancelAnimationFrame(rafId);
    if (!currentContainer) return;

    rafId = requestAnimationFrame(() => {
      applyHighlights(currentContainer, paragraphs, currentMatches, currentActive);
      scrollToActive(currentContainer, currentActive);
    });

    onCleanup(() => {
      if (rafId) cancelAnimationFrame(rafId);
    });
  });

  function nextMatch() {
    const count = matches().length;
    if (count === 0) return;
    setActiveIndex((prev) => (prev + 1) % count);
  }

  function prevMatch() {
    const count = matches().length;
    if (count === 0) return;
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }

  function clearSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    suppressDebounce = true;
    setQuery("");
    setSearchTerm("");
    setMatches([]);
    setActiveIndex(-1);
  }

  return {
    query,
    setQuery,
    searchTerm,
    matches,
    matchCount: () => matches().length,
    activeIndex,
    setActiveIndex,
    nextMatch,
    prevMatch,
    clearSearch,
  };
}
