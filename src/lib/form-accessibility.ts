export function focusFirstInvalidField(form: HTMLFormElement) {
  window.requestAnimationFrame(() => {
    const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!invalid) return;

    const target = invalid.matches('[role="radiogroup"]')
      ? invalid.querySelector<HTMLElement>('input:not(:disabled)') ?? invalid
      : invalid;

    target.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  });
}

export function formFieldId(prefix: string, field: string, suffix?: string) {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '-');
  return [safePrefix, field, suffix].filter(Boolean).join('-');
}

export function ariaDescribedBy(...ids: Array<string | false | null | undefined>) {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}
