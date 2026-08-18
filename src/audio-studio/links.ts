export function parseAudioLinks(value: string) {
  const separated = value.replace(/https?:\/\//gi, (protocol) => `\n${protocol}`);
  return [...new Set(
    separated
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\/\S+$/i.test(item)),
  )];
}

export function mergeAudioLinks(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming])];
}
