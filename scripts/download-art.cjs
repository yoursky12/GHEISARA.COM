// Run manually to refresh the local public-domain study images.
const { createHash } = require('node:crypto');
const { mkdir, writeFile, access } = require('node:fs/promises');
const sharp = require('sharp');
const artworks = {
  monet: 'Claude Monet - Water Lilies - 1933.1157 - Art Institute of Chicago.jpg',
  bedroom: 'Vincent van Gogh - The Bedroom - Google Art Project.jpg',
  paris: 'Gustave Caillebotte - Paris Street; Rainy Day - Google Art Project.jpg',
  wave: 'Tsunami by hokusai 19th century.jpg',
  sunday: 'Georges Seurat - A Sunday on La Grande Jatte -- 1884 - Google Art Project.jpg',
  bathers: 'Pierre-Auguste Renoir - Two Sisters (On the Terrace) - Google Art Project.jpg',
  garden: "The Poet's Garden 1888 Vincent van Gogh.jpg",
  moulin: 'Henri de Toulouse-Lautrec - At the Moulin Rouge - Google Art Project.jpg',
};
(async () => {
  await mkdir('public/art', { recursive: true });
  const sources = [];
  for (const [slug, title] of Object.entries(artworks)) {
    const file = title.replaceAll(' ', '_');
    const hash = createHash('md5').update(file).digest('hex');
    const base = `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(file)}`;
    const size = slug === 'garden' ? 500 : 960;
    const url = ['sunday', 'bathers', 'moulin', 'garden'].includes(slug) ? base.replace('/commons/', '/commons/thumb/') + `/${size}px-${encodeURIComponent(file)}` : base;
    sources.push({ slug, file: title, url, page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` });
    try { await access(`public/art/${slug}.jpg`); console.log(`${slug}: already downloaded`); continue; } catch {}
    await new Promise(resolve => setTimeout(resolve, 2500));
    const response = await fetch(url, { headers: { 'User-Agent': 'geisharaDevelopment/0.1 (public-domain study collection)' }, signal: AbortSignal.timeout(25000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`${slug}: ${response.status} ${url}`);
    const data = Buffer.from(await response.arrayBuffer());
    await sharp(data).resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(`public/art/${slug}.jpg`);
    console.log(`${slug}: ${data.length} bytes`);
  }
  await writeFile('public/art/sources.json', JSON.stringify(sources, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
