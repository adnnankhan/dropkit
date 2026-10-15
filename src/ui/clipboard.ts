// Copying inside Figma's plugin window. Figma's iframe usually blocks
// navigator.clipboard, so the old select-and-copy way goes first: it works there
// as long as it runs straight from the click. The modern API is the fallback.

export async function copyText(text: string): Promise<boolean> {
  if (copyBySelecting(text)) return true;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function copyBySelecting(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '-9999px';
  area.style.opacity = '0';
  const focused = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  focused?.focus();
  return copied;
}
