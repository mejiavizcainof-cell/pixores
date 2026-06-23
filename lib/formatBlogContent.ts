const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function formatInline(value: string) {
  const token = /\[LINK:\s*([^|\]]+)\|([^\]]+)\]/g;
  let result = "";
  let cursor = 0;

  for (const match of value.matchAll(token)) {
    const index = match.index ?? 0;
    result += escapeHtml(value.slice(cursor, index));
    result += `<a href="${escapeHtml(match[2].trim())}">${escapeHtml(match[1].trim())}</a>`;
    cursor = index + match[0].length;
  }

  return result + escapeHtml(value.slice(cursor));
}

export function formatBlogContent(content: string, title?: string) {
  const output: string[] = [];
  let listItems: string[] = [];
  let followsBlankLine = true;
  const lines = content.split("\n");

  const flushList = () => {
    if (!listItems.length) return;
    output.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      flushList();
      followsBlankLine = true;
      continue;
    }

    if (!output.length && title && line === title) continue;

    const image = line.match(/^\[IMAGE:\s*(.*?)\]$/);
    const heading2 = line.match(/^\[H2:\s*(.*?)\]$/);
    const heading3 = line.match(/^\[H3:\s*(.*?)\]$/);
    const nextContentLine = lines
      .slice(index + 1)
      .map((item) => item.trim())
      .find(Boolean);
    const resemblesLegacyHeading =
      followsBlankLine &&
      line.length >= 4 &&
      line.length <= 72 &&
      !/[.!?:]$/.test(line) &&
      !line.startsWith("[LINK:") &&
      (line.split(/\s+/).length >= 3 ||
        Boolean(nextContentLine && nextContentLine.length >= 80));

    if (image) {
      flushList();
      const fileName = image[1].trim();
      output.push(
        `<img src="/blog/${escapeHtml(fileName)}" alt="" loading="lazy" style="width:100%;max-width:800px;display:block;margin:24px auto;border-radius:12px;" />`,
      );
    } else if (heading2) {
      flushList();
      output.push(`<h2>${formatInline(heading2[1])}</h2>`);
    } else if (heading3) {
      flushList();
      output.push(`<h3>${formatInline(heading3[1])}</h3>`);
    } else if (resemblesLegacyHeading) {
      flushList();
      output.push(`<h2>${formatInline(line)}</h2>`);
    } else if (line.startsWith("- ")) {
      listItems.push(formatInline(line.slice(2)));
    } else {
      flushList();
      output.push(`<p>${formatInline(line)}</p>`);
    }

    followsBlankLine = false;
  }

  flushList();
  return output.join("");
}

export function formatStoredBlogContent(content: string) {
  return content.replace(
    /\[LINK:\s*([^|\]]+)\|([^\]]+)\]/g,
    (_match, label: string, href: string) =>
      `<a href="${escapeHtml(href.trim())}">${escapeHtml(label.trim())}</a>`,
  );
}
