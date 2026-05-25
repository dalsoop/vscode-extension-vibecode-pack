// Special-case editor for the YAML frontmatter section. Renders structured
// fields (name / description / categories / extra) instead of a raw textarea
// so users can't easily corrupt the YAML.

namespace FrontmatterForm {
  interface FmFields {
    name?: string;
    description?: string;
    categories?: string[];
  }

  function parseFmYaml(body: string): FmFields {
    const out: any = {};
    for (const line of body.split('\n')) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!m) continue;
      let v: any = m[2].trim().replace(/^["']|["']$/g, '');
      if (typeof v === 'string' && v.startsWith('[') && v.endsWith(']')) {
        v = v
          .slice(1, -1)
          .split(',')
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
      out[m[1]] = v;
    }
    return out;
  }

  function buildFmYaml(fields: {
    name: string;
    description: string;
    categories: string[];
    extra: string;
  }): string {
    const lines = ['---'];
    if (fields.name) lines.push(`name: ${fields.name}`);
    if (fields.description) lines.push(`description: ${fields.description}`);
    if (fields.categories.length) lines.push(`categories: [${fields.categories.join(', ')}]`);
    if (fields.extra.trim()) lines.push(fields.extra.trim());
    lines.push('---');
    return lines.join('\n');
  }

  export function render(s: P.Section): string {
    const body = s.raw.replace(/^---\n/, '').replace(/\n---$/, '');
    const fm = parseFmYaml(body);
    const knownKeys = new Set(['name', 'description', 'categories']);
    const extra = body
      .split('\n')
      .filter(l => {
        const k = l.match(/^([A-Za-z_][\w-]*)\s*:/);
        return !k || !knownKeys.has(k[1]);
      })
      .join('\n');
    const descLen = (fm.description || '').length;
    const descClass = descLen > 200 ? 'over' : descLen > 150 ? 'near' : '';
    return `
      <div class="fm-form" data-id="${P.esc(s.id)}">
        <label class="fm-row">
          <span class="fm-label">${P.esc(P.t('preview.fm.name'))}</span>
          <input class="fm-input" data-field="name" value="${P.esc(fm.name || '')}" placeholder="${P.esc(P.t('preview.fm.namePlaceholder'))}">
        </label>
        <label class="fm-row">
          <span class="fm-label">${P.esc(P.t('preview.fm.description'))} <span class="fm-counter ${descClass}">${P.esc(P.t('preview.fm.descCounter', descLen))}</span></span>
          <textarea class="fm-textarea" data-field="description" rows="3" placeholder="${P.esc(P.t('preview.fm.descPlaceholder'))}">${P.esc(fm.description || '')}</textarea>
        </label>
        <label class="fm-row">
          <span class="fm-label">${P.esc(P.t('preview.fm.categories'))} <span class="fm-hint">${P.esc(P.t('preview.fm.categoriesHint'))}</span></span>
          <input class="fm-input" data-field="categories" value="${P.esc((fm.categories || []).join(', '))}" placeholder="${P.esc(P.t('preview.fm.categoriesPlaceholder'))}">
        </label>
        ${extra ? `<label class="fm-row"><span class="fm-label">${P.esc(P.t('preview.fm.otherYaml'))}</span><textarea class="fm-textarea" data-field="extra" rows="3">${P.esc(extra)}</textarea></label>` : ''}
        <div class="edit-row">
          <button class="tbtn" data-sect-act="cancel" data-id="${P.esc(s.id)}">${P.esc(P.t('preview.section.editor.cancel'))}</button>
          <button class="tbtn primary" data-sect-act="save-fm" data-id="${P.esc(s.id)}">${P.ico('save')} ${P.esc(P.t('preview.section.editor.save'))}</button>
        </div>
      </div>`;
  }

  // Read the fm-form fields from the DOM and assemble the YAML to save.
  // Returns null if the form for the given id can't be found (defensive).
  export function collectYaml(id: string): string | null {
    const form = document.querySelector<HTMLElement>(`.fm-form[data-id="${CSS.escape(id)}"]`);
    if (!form) return null;
    const name = (form.querySelector<HTMLInputElement>('[data-field="name"]')?.value || '').trim();
    const description = (form.querySelector<HTMLTextAreaElement>('[data-field="description"]')?.value || '').trim();
    const cats = (form.querySelector<HTMLInputElement>('[data-field="categories"]')?.value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const extra = form.querySelector<HTMLTextAreaElement>('[data-field="extra"]')?.value || '';
    return buildFmYaml({ name, description, categories: cats, extra });
  }

  // Live char-count for the description textarea. Bound after every render
  // because the textarea is recreated each time.
  export function bindCounters(): void {
    P.$('main')
      .querySelectorAll<HTMLTextAreaElement>('.fm-textarea[data-field="description"]')
      .forEach(ta => {
        ta.oninput = () => {
          const counter = ta.parentElement?.querySelector<HTMLElement>('.fm-counter');
          if (!counter) return;
          const len = ta.value.length;
          counter.textContent = P.t('preview.fm.descCounter', len);
          counter.classList.remove('over', 'near');
          if (len > 200) counter.classList.add('over');
          else if (len > 150) counter.classList.add('near');
        };
      });
  }
}
