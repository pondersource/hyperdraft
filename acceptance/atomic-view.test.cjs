const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {test} = require('node:test');

function node(tag) {
    return {
        tag, value: '', children: [], handlers: {},
        prepend(...children) { this.children.unshift(...children); },
        append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; },
        setAttribute() {},
        addEventListener(type, handler) { this.handlers[type] = handler; },
    };
}

function find(root, predicate) {
    if (predicate(root)) return root;
    for (const child of root.children) {
        const result = find(child, predicate);
        if (result) return result;
    }
}

test('follow a wiki link between saved Atomic notes', async () => {
    const source = readFileSync('atomic/hyperdraft-0.1.0.js', 'utf8');
    const {view} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    global.document = {createElement: tag => ({...node(tag), style: {}})};
    const core = 'https://atomicdata.dev/properties/';
    const entries = ['First note', 'Second note'].map((title, index) => {
        const props = {
            [core + 'name']: title,
            [core + 'parent']: 'notes',
            [core + 'isA']: ['note'],
            [core + 'description']: 'hyperdraft-note/v1:' + JSON.stringify({body: index ? 'The second page' : 'Go to [[Second note]]'})
        };
        return {subject: String(index), get: property => props[property]};
    });
    const store = {
        getData: async () => ({table: 'notes', rowClass: 'note'}),
        query: async () => entries.map(x => x.subject),
        getMany: async () => entries
    };
    const root = node('div');
    await view({root, store});
    const link = find(root, n => n.tag === 'button' && n.textContent === 'Second note');
    assert.ok(link);
    link.handlers.click();
    assert.ok(find(root, n => n.tag === 'h2' && n.textContent === 'Second note'));
    assert.equal(find(root, n => n.tag === 'h2' && n.textContent === 'First note'), undefined);
});
