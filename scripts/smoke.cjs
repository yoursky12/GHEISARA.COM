const assert = require('node:assert/strict');
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3100';
(async () => {
  for (const route of ['/art/for-you', '/art/following', '/art/popular', '/art/collaborations', '/artworks/water-lilies', '/creators/claude-monet', '/collab', '/studio', '/notifications', '/auth/login']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(await response.text(), /<html lang="id"/);
  }
  const filtered = await (await fetch(base + '/api/artworks?style=Impresionisme&style=Ukiyo-e&medium=Cetak+kayu')).json();
  assert.ok(filtered.total >= 1);
  assert.ok(filtered.items.some(a => a.id === 'the-great-wave'));
  const first = await (await fetch(base + '/api/artworks?limit=3')).json();
  const second = await (await fetch(base + '/api/artworks?limit=3&cursor=' + first.nextCursor)).json();
  assert.equal(first.items.length, 3);
  assert.equal(second.items.length, 3);
  assert.ok(first.total >= 8);
  assert.equal(new Set([...first.items, ...second.items].map(a => a.id)).size, 6);
  assert.equal((await fetch(base + '/api/artworks?cursor=oops')).status, 400);
  assert.equal((await fetch(base + '/artworks/missing')).status, 404);
  assert.equal((await fetch(base + '/creators/missing')).status, 404);
  assert.equal((await fetch(base + '/art/missing')).status, 404);
  const legacyStudio = await fetch(base + '/learn', { redirect: 'manual' });
  assert.equal(legacyStudio.status, 307);
  assert.equal(legacyStudio.headers.get('location'), '/studio');
  const redirect = await fetch(base + '/studio/artworks/new', { redirect: 'manual' });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), '/auth/login');
  const search = await (await fetch(base + '/art/for-you?q=not-present')).text();
  assert.match(search, /Belum ada karya yang cocok/);
  const sources = require('../public/art/sources.json');
  for (const source of sources) {
    const image = await fetch(base + `/art/${source.slug}.jpg`);
    assert.equal(image.status, 200, source.slug);
    assert.match(image.headers.get('content-type'), /^image\//);
  }
  const collabs = await (await fetch(base + '/api/artworks?feed=collaborations')).json();
  assert.ok(collabs.items.every(a => a.projectId));
  const suggestions = await (await fetch(base + '/api/search?q=monet')).json();
  assert.ok(suggestions.artworks.some(a => a.id === 'water-lilies'));
  assert.ok(suggestions.creators.every(c => !('email' in c)));
  assert.equal((await fetch(base + '/api/media/private-missing')).status,404);
  for (const route of ['/studio','/studio/profile','/studio/collections','/studio/drafts/missing','/notifications','/collab/projects/missing']) {
    assert.equal((await fetch(base+route,{redirect:'manual'})).status,307,route);
  }
  const blocked = await fetch(base+'/api/studio/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',{method:'PUT',headers:{origin:base,'Content-Type':'application/json'},body:'{}'});
  assert.equal(blocked.status,401);
  console.log('HTTP smoke passed: public routes, API filtering/pagination, 404, upload redirect, empty search, local images.');
})().catch(error => { console.error(error); process.exitCode = 1; });
