const core = 'https://atomicdata.dev/properties/';
const prefix = 'hyperdraft-note/v1:';
const fields = [['name', 'Title'], ['body', 'Note, with [[links]] to other notes', true]];

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

async function notebook(store) {
  const {table, rowClass} = await store.getData();
  if (!table || !rowClass) throw new Error('Hyperdraft needs a note table.');

  function note(row) {
    if (row.error) throw new Error('Atomic could not read a note.');
    const data = row.get(core + 'description');
    if (row.get(core + 'parent') !== table || !row.get(core + 'isA')?.includes(rowClass) ||
        typeof data !== 'string' || !data.startsWith(prefix)) return;
    return {...JSON.parse(data.slice(prefix.length)), name: row.get(core + 'name'), subject: row.subject};
  }

  return {
    async list() {
      const all = await store.query({property: core + 'parent', value: table});
      if (all.length >= 500) throw new Error('This version supports fewer than 500 rows.');
      const result = [];
      for (let offset = 0; offset < all.length; offset += 100) {
        const rows = await store.getMany(all.slice(offset, offset + 100));
        result.push(...rows.map(note).filter(Boolean));
      }
      return result.sort((first, second) => first.name.localeCompare(second.name));
    },
    async save({subject, name, ...record}) {
      const props = {[core + 'name']: name, [core + 'description']: prefix + JSON.stringify(record)};
      if (!subject) {
        await store.newResource({parent: table, isA: [rowClass], propVals: props});
        return;
      }
      const row = await store.getResource(subject);
      if (!note(row)) throw new Error('That note is outside this notebook.');
      for (const [property, value] of Object.entries(props)) row.set(property, value);
      await row.save();
    },
    async remove(subject) {
      const row = await store.getResource(subject);
      if (!note(row)) throw new Error('That note is outside this notebook.');
      await row.destroy();
    }
  };
}

export async function view({root, store}) {
  const notes = await notebook(store);
  const style = el('style', `
    main { max-width: 60rem; margin: auto; padding: 1.25rem; font: 1rem system-ui; }
    fieldset { display: grid; gap: .6rem; }
    fieldset label, fieldset input, textarea { display: block; width: 100%; box-sizing: border-box; }
    textarea { min-height: 4rem; }
    input, textarea, button { font: inherit; padding: .35rem; }
    button { margin: .2rem .4rem .2rem 0; }
    article { border-top: 1px solid #8886; margin-block: 1rem; padding-block: .5rem; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; }
  `);
  const main = el('main');
  const editor = el('fieldset');
  editor.append(el('legend', 'Note details'));
  const input = {};
  for (const [key, label, multiline] of fields) {
    input[key] = el(multiline ? 'textarea' : 'input');
    const wrapper = el('label', label);
    wrapper.append(input[key]);
    editor.append(wrapper);
  }
  const actions = el('div');
  const save = el('button', 'Add note');
  const cancel = el('button', 'Cancel edit');
  actions.append(save, cancel);
  editor.append(actions);
  const status = el('p');
  status.setAttribute('role', 'status');
  const filterLabel = el('label', 'Find notes');
  const filter = el('input');
  filter.type = 'search';
  filterLabel.append(filter);
  const results = el('section');
  main.append(el('h1', 'Hyperdraft'), editor, status, filterLabel, results);
  root.replaceChildren(style, main);

  let all = [];
  let selected;
  let focused;
  let busy = false;

  function edit(record) {
    selected = record;
    for (const [key] of fields) {
      input[key].value = record?.[key] || '';
    }
    save.textContent = record ? 'Save note' : 'Add note';
    cancel.hidden = !record;
  }

  function render() {
    results.replaceChildren();
    const query = filter.value.trim().toLocaleLowerCase();
    const selectedNotes = all.filter(note => focused
      ? note.subject === focused
      : [note.name, note.body].join(' ').toLocaleLowerCase().includes(query));
    const byTitle = new Map(all.map(note => [note.name.toLocaleLowerCase(), note]));
    for (const note of selectedNotes) {
      const card = el('article');
      const body = el('p');
      body.style.whiteSpace = 'pre-wrap';
      for (const part of note.body.split(/(\[\[[^\]\n]+\]\])/g)) {
        const target = part.startsWith('[[') && part.endsWith(']]')
          ? byTitle.get(part.slice(2, -2).trim().toLocaleLowerCase())
          : undefined;
        if (!target) {
          body.append(el('span', part));
          continue;
        }
        const link = el('button', target.name);
        link.addEventListener('click', () => {
          focused = target.subject;
          filter.value = target.name;
          render();
        });
        body.append(link);
      }
      const change = el('button', 'Edit note');
      change.addEventListener('click', () => { if (!busy) edit(note); });
      const remove = el('button', 'Delete note');
      remove.addEventListener('click', () => {
        if (busy || !window.confirm('Delete ' + note.name + '?')) return;
        run(async () => {
          await notes.remove(note.subject);
          if (selected?.subject === note.subject) edit();
        }, 'Note deleted.');
      });
      card.append(el('h2', note.name), body, change, remove);
      results.append(card);
    }
    if (!results.children.length) results.append(el('p', 'No matching notes.'));
  }

  async function run(operation, message) {
    if (busy) return;
    busy = editor.disabled = true;
    status.textContent = '';
    try {
      await operation();
      all = await notes.list();
      render();
      status.textContent = message;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = editor.disabled = false;
    }
  }

  filter.addEventListener('input', () => { focused = undefined; render(); });
  cancel.addEventListener('click', () => edit());
  save.addEventListener('click', () => run(async () => {
    const name = input.name.value.trim();
    if (!name) throw new Error('Enter a title.');
    if (all.some(note => note.subject !== selected?.subject &&
        note.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw new Error('Choose a different title so links stay unambiguous.');
    }
    await notes.save({
      subject: selected?.subject,
      name,
      body: input.body.value
    });
    edit();
  }, 'Note saved.'));
  edit();
  await run(async () => {}, '');
}
