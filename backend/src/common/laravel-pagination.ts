import type { Request } from 'express';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Formats a Date like Laravel's 'Y-m-d H:i:s' resource format.
 */
export function formatDateTime(value: Date | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return (
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    ` ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
  );
}

/**
 * Builds the Laravel paginator envelope (`data`, `links`, `meta`) keeping all
 * query-string parameters (minus `page`) in the generated page URLs.
 */
export function buildPaginationEnvelope(
  req: Request,
  options: { data: unknown[]; total: number; perPage: number; page: number },
) {
  const { data, total, perPage, page } = options;

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const hasItems = data.length > 0;
  const from = hasItems ? (page - 1) * perPage + 1 : null;
  const to = hasItems ? Number(from) + data.length - 1 : null;

  const originalUrl = req.originalUrl ?? '';
  const query = originalUrl.includes('?') ? originalUrl.slice(originalUrl.indexOf('?') + 1) : '';
  const path = originalUrl.split('?')[0];
  const base = `${req.protocol}://${req.get('host') ?? ''}${path}`;

  const queryParams = new URLSearchParams(query);
  queryParams.delete('page');
  const prefix = queryParams.toString() === '' ? '' : `${queryParams.toString()}&`;

  const pageUrl = (target: number) => `${base}?${prefix}page=${target}`;

  const first = pageUrl(1);
  const last = pageUrl(lastPage);
  const prev = page > 1 ? pageUrl(page - 1) : null;
  const next = page < lastPage ? pageUrl(page + 1) : null;

  const links = pageWindow(page, lastPage).map((element) =>
    element === '...'
      ? { url: null, label: '...', active: false }
      : {
          url: pageUrl(element as number),
          label: String(element),
          active: element === page,
        },
  );

  links.unshift({ url: prev, label: '&laquo; Previous', active: false });
  links.push({ url: next, label: 'Next &raquo;', active: false });

  return {
    data,
    links: { first, last, prev, next },
    meta: {
      current_page: page,
      from,
      last_page: lastPage,
      links,
      path: base,
      per_page: perPage,
      to,
      total,
    },
  };
}

function pageWindow(current: number, last: number, onEachSide = 3): Array<number | string> {
  if (last <= 1 + onEachSide * 2 + 6) {
    const pages: Array<number | string> = [];

    for (let i = 1; i <= last; i++) {
      pages.push(i);
    }

    return pages;
  }

  const elements: Array<number | string> = [1];

  if (current - onEachSide > 2) {
    elements.push('...');
  }

  for (let i = Math.max(2, current - onEachSide); i <= Math.min(last - 1, current + onEachSide); i++) {
    elements.push(i);
  }

  if (current + onEachSide < last - 1) {
    elements.push('...');
  }

  elements.push(last);

  return elements;
}