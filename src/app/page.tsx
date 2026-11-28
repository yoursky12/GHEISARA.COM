import Link from "next/link";
import type { Metadata } from "next";
import { BiLinkExternal as ArrowUpRight } from "react-icons/bi";
import { ArtDashboard } from "@/components/art-dashboard";
import { ArtImage } from "@/components/art-image";
import { ArtworkCard } from "@/components/artwork-card";
import { LandingGallery } from "@/components/landing-gallery";
import { currentUser } from "@/lib/auth";
import { galleryWorks } from "@/lib/catalog";
import { publicArtworks, usernameOf } from "@/lib/community";
import { store } from "@/lib/collab-store";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "geishara — Ruang untuk rasa dan karya",
  description:
    "Temukan karya kurasi dunia, kenali kreator inspiratif, temukan Art DNA visualmu, dan mulailah berkolaborasi bersama geishara.",
};

export default async function Home() {
  const user = await currentUser();
  const allArtworks = publicArtworks();
  const featured = allArtworks.slice(0, 4);

  const creators = store((d) => {
    const historical = [
      { name: "Claude Monet", username: "claude-monet", role: "Pelopor Impresionisme", count: 1, open: false },
      { name: "Vincent van Gogh", username: "vincent-van-gogh", role: "Master Postimpresionisme", count: 2, open: false },
      { name: "Katsushika Hokusai", username: "katsushika-hokusai", role: "Maestro Ukiyo-e", count: 1, open: false },
    ];
    const members = d.users.slice(0, 3).map((u) => ({
      name: u.name,
      username: usernameOf(u),
      role: u.bio || "Kreator geishara",
      count: d.artworks.filter((a) => a.owner === u.id && a.status === "published").length,
    }));
    return [...members, ...historical].slice(0, 4);
  });

  return (
    <ArtDashboard user={user} catalogCount={allArtworks.length}>
      <section className="dashboard-section" aria-labelledby="showcase-title">
        <div className="dashboard-section-heading">
          <h2 id="showcase-title">Karya pilihan</h2>
          <Link href="/art/for-you" className="dashboard-all-link"><span>Lihat galeri</span><ArrowUpRight size={14}/></Link>
        </div>
        <div className="art-grid">
          {featured.map((artwork, index) => (
            <ArtworkCard key={artwork.id} artwork={artwork} index={index} />
          ))}
        </div>
      </section>

      <LandingGallery works={galleryWorks}/>

      <section className="dashboard-section" aria-labelledby="styles-title">
        <div className="dashboard-section-heading"><h2 id="styles-title">Jelajahi berdasarkan gaya</h2></div>
        <div className="style-grid">
          {[
            { style: "Impresionisme", image: "monet", note: "Menangkap cahaya, merayakan momen." },
            { style: "Postimpresionisme", image: "garden", note: "Warna dan emosi, melampaui kenyataan." },
            { style: "Ukiyo-e", image: "wave", note: "Kisah dunia dalam setiap garis." },
          ].map((s) => (
            <Link
              key={s.style}
              href={`/art/for-you?style=${encodeURIComponent(s.style)}`}
              className="style-card"
            >
              <ArtImage
                src={`/art/${s.image}.jpg`}
                alt=""
                loading="lazy"
                width="600"
                height="260"
              />
              <div>
                <h3>{s.style}</h3>
                <p>{s.note}</p>
              </div>
              <span>
                <ArrowUpRight size={21} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-section dashboard-creators" aria-labelledby="creators-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="creators-title">Kenali para kreator</h2>
          </div>
          <Link className="dashboard-all-link" href="/creators">
            <span>Lihat semua kreator</span><ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="creator-marquee">
          <div className="creator-marquee-track">
            {Array.from({ length: 7 }, (_, row) => (
              <div className="creator-marquee-row" key={row} aria-hidden={row > 0 || undefined}>
                {creators.map((c) => (
                  <Link
                    className="creator-tile"
                    key={c.username}
                    href={`/creators/${c.username}`}
                    tabIndex={row > 0 ? -1 : undefined}
                    prefetch={row > 0 ? false : undefined}
                  >
                    <span className="profile-initials" aria-hidden="true">{c.name.slice(0, 1)}</span>
                    <div className="creator-marquee-details">
                      <h3>{c.name}</h3>
                      <p>@{c.username}</p>
                      <p>{c.role}</p>
                      <span>{c.count} karya dalam katalog</span>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </ArtDashboard>
  );
}
