export type Artwork = {
  id: string; title: string; artist: string; username: string; year: string;
  medium: string; style: string; era: string; image: string; colors: string[];
  description: string; source: string;
  license?: string; styles?: string[]; publishedAt?: string; member?: boolean;
  projectId?: string; creators?: { name: string; username: string }[];
  appreciations?: number;
};

// Public-domain study collection. These historical artists are not member accounts.
export const artworks: Artwork[] = [
  { id: "water-lilies", title: "Water Lilies", artist: "Claude Monet", username: "claude-monet", year: "1906", medium: "Cat minyak", style: "Impresionisme", era: "Modern", image: "monet", colors: ["#777c68", "#a7aa84", "#5d7478", "#b5b4a2", "#d7d4bd"], description: "Permukaan air menjadi pertemuan cahaya, warna, dan pantulan. Sebuah undangan untuk berhenti sejenak dan melihat alam lebih dekat.", source: "Wikimedia Commons" },
  { id: "the-bedroom", title: "The Bedroom", artist: "Vincent van Gogh", username: "vincent-van-gogh", year: "1889", medium: "Cat minyak", style: "Postimpresionisme", era: "Modern", image: "bedroom", colors: ["#729aaf", "#d6ad52", "#a56f35", "#c6ccb1", "#83553e"], description: "Ruang yang sederhana, warna yang berbicara. Garis dan perspektif yang khas mengubah kamar pribadi menjadi potret tentang ketenangan dan rasa memiliki.", source: "Wikimedia Commons" },
  { id: "paris-street", title: "Paris Street; Rainy Day", artist: "Gustave Caillebotte", username: "gustave-caillebotte", year: "1877", medium: "Cat minyak", style: "Impresionisme", era: "Modern", image: "paris", colors: ["#929b96", "#b1ad96", "#535f60", "#d7d2bc", "#393d3b"], description: "Jalanan Paris setelah hujan. Payung, arsitektur, dan cahaya lembut merekam ritme kehidupan kota dari sudut pandang yang intim.", source: "Wikimedia Commons" },
  { id: "the-great-wave", title: "The Great Wave", artist: "Katsushika Hokusai", username: "katsushika-hokusai", year: "1830â€“1833", medium: "Cetak kayu", style: "Ukiyo-e", era: "Klasik", image: "wave", colors: ["#183d64", "#658c9a", "#e3d7b8", "#b0c4bd", "#f1e7cf"], description: "Gelombang menjulang, perahu-perahu kecil, dan Gunung Fuji di kejauhan. Komposisi ikonis yang mempertemukan kekuatan alam dan ketekunan manusia.", source: "Wikimedia Commons" },
  { id: "a-sunday", title: "A Sunday on La Grande Jatte", artist: "Georges Seurat", username: "georges-seurat", year: "1884â€“1886", medium: "Cat minyak", style: "Postimpresionisme", era: "Modern", image: "sunday", colors: ["#6b8056", "#c6bc7c", "#405e5b", "#a5ae78", "#e4d4a4"], description: "Sore di tepi sungai dibangun dari titik-titik warna. Dari dekat sebuah eksperimen; dari jauh sebuah dunia yang terasa utuh.", source: "Wikimedia Commons" },
  { id: "two-sisters", title: "Two Sisters (On the Terrace)", artist: "Pierre-Auguste Renoir", username: "pierre-auguste-renoir", year: "1881", medium: "Cat minyak", style: "Impresionisme", era: "Modern", image: "bathers", colors: ["#7a9575", "#be5c4b", "#d8c4b5", "#6c8d9b", "#d5bc81"], description: "Dua sosok di sebuah teras, dikelilingi warna dan cahaya musim semi. Sebuah studi tentang kehangatan, kedekatan, dan keseharian.", source: "Wikimedia Commons" },
  { id: "wheat-field", title: "The Poetâ€™s Garden", artist: "Vincent van Gogh", username: "vincent-van-gogh", year: "1888", medium: "Cat minyak", style: "Postimpresionisme", era: "Modern", image: "garden", colors: ["#a9af4f", "#617347", "#c7c17a", "#497a82", "#e0cb81"], description: "Sebuah taman hadir melalui sapuan yang hidup. Hijau, kuning, dan biru membawa energi alam ke dalam bahasa warna yang personal.", source: "Wikimedia Commons" },
  { id: "at-the-moulin", title: "At the Moulin Rouge", artist: "Henri de Toulouse-Lautrec", username: "toulouse-lautrec", year: "1892â€“1895", medium: "Cat minyak", style: "Postimpresionisme", era: "Modern", image: "moulin", colors: ["#6e795b", "#b5a176", "#3c4640", "#c3bd93", "#8e613f"], description: "Pertemuan manusia dalam cahaya malam Paris. Potongan komposisi dan warna yang tidak biasa mengabadikan suasana yang penuh cerita.", source: "Wikimedia Commons" },
];
export type Query = Record<string, string | string[] | undefined>;
export const values = (q: Query, key: string) => (Array.isArray(q[key]) ? q[key] : q[key] ? [q[key]] : []) as string[];
export const first = (q: Query, key: string) => values(q, key)[0] ?? "";
export const taxonomies = { era: ["Modern", "Klasik", "Kontemporer"], medium: ["Digital", "Cat minyak", "Cat air", "Akrilik", "Pensil", "Fotografi", "Cetak kayu", "Mixed media"], style: ["Impresionisme", "Postimpresionisme", "Ukiyo-e", "Realisme", "Abstrak", "Surealisme", "Ilustrasi", "Modern Art"], license: ["All rights reserved", "CC BY 4.0", "CC BY-NC 4.0", "CC0"] };
export function filterArtworks(query: Query, input: Artwork[] = artworks) {
  const term = first(query, "q").trim().toLocaleLowerCase("id");
  const result = input.filter(a => {
    const usernames = a.creators?.map(c => c.username).join(" ") ?? a.username;
    if (term && !`${a.title} ${a.artist} ${a.style} ${usernames}`.toLocaleLowerCase("id").includes(term)) return false;
    return (Object.keys(taxonomies) as (keyof typeof taxonomies)[]).every(key => {
      const selected = values(query, key).filter(v => taxonomies[key].includes(v));
      return !selected.length || (key === "style" ? (a.styles ?? [a.style]).some(s => selected.includes(s)) : selected.includes(a[key] ?? "CC0"));
    });
  });
  if (first(query, "sort") === "title") result.sort((a, b) => a.title.localeCompare(b.title));
  return result;
}
export function queryString(query: Query, patch: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...patch })) {
    if (Array.isArray(value)) value.forEach(v => params.append(key, v));
    else if (value) params.set(key, value);
  }
  return params.size ? `?${params.toString()}` : "";
}

