/**
 * 基于白名单的轻量 HTML 消毒器，用于渲染 Pixiv 作品简介等不可信 HTML。
 * 仅在浏览器/DOM 环境运行；服务端渲染场景需另行处理。
 */

const ALLOWED_TAGS = new Set(["a", "br", "b", "strong", "i", "em", "span", "p", "div"]);

const FORBIDDEN_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "button",
  "select",
  "option",
  "noscript",
  "template",
  "link",
  "meta",
  "base",
]);

const SAFE_HREF_PROTOCOLS = ["http://", "https://", "pixiv://"];

function isSafeHref(href: string | null): boolean {
  if (!href) {
    return false;
  }
  return SAFE_HREF_PROTOCOLS.some((protocol) => href.toLowerCase().startsWith(protocol));
}

function sanitizeAttributes(node: Element, tag: string): void {
  const attrs = Array.from(node.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();

    // 移除所有事件处理器属性
    if (name.startsWith("on")) {
      node.removeAttribute(attr.name);
      continue;
    }

    if (tag === "a") {
      if (name === "href") {
        if (!isSafeHref(attr.value)) {
          node.removeAttribute(attr.name);
        }
      } else if (name !== "target" && name !== "rel") {
        node.removeAttribute(attr.name);
      }
    } else {
      // 其他允许的标签不保留任何属性
      node.removeAttribute(attr.name);
    }
  }
}

function walkAndSanitize(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(false);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    // 注释、CDATA 等直接丢弃
    return null;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  if (FORBIDDEN_TAGS.has(tag)) {
    return null;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    // 未在白名单中的标签：剥离标签本身，但保留子内容
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(element.childNodes)) {
      const sanitized = walkAndSanitize(child);
      if (sanitized) {
        fragment.appendChild(sanitized);
      }
    }
    return fragment;
  }

  const cloned = document.createElement(tag);
  // 复制原始属性后消毒，保留 a 标签的安全属性
  for (const attr of Array.from(element.attributes)) {
    cloned.setAttribute(attr.name, attr.value);
  }
  sanitizeAttributes(cloned, tag);

  for (const child of Array.from(element.childNodes)) {
    const sanitized = walkAndSanitize(child);
    if (sanitized) {
      cloned.appendChild(sanitized);
    }
  }

  return cloned;
}

/**
 * 对不可信 HTML 字符串进行消毒，返回安全的 HTML 字符串。
 * 必须在浏览器环境（存在 DOMParser/document）中调用。
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const fragment = document.createDocumentFragment();
  for (const child of Array.from(doc.body.childNodes)) {
    const sanitized = walkAndSanitize(child);
    if (sanitized) {
      fragment.appendChild(sanitized);
    }
  }

  const container = document.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML;
}
