export const profileCopy = {
  tabsLabel: "Bagian profil",
  tabs: {
    karya: "Karya",
    kolaborasi: "Kolaborasi",
    koleksi: "Koleksi tersimpan",
    draf: "Draf",
  },
  privateDrafts: "draf pribadi",
  draft: {
    title: "Judul karya belum diisi",
    style: "Gaya seni belum dipilih",
    medium: "Medium belum dipilih",
    thumbnail: "Pratinjau karya belum tersedia",
    canvas: "Kanvas belum berisi gambar",
    approval: "Menunggu persetujuan kolaborator",
    ready: "Detail karya sudah lengkap",
  },
} as const;

export type ProfileTab = keyof typeof profileCopy.tabs;
