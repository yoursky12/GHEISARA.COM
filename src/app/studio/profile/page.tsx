import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { usernameOf } from "@/lib/community";
import { communityAction } from "@/app/community-actions";
import { ProfilePhoto } from "@/components/profile-photo";
import { SubmitButton } from "@/components/submit-button";

export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const { error } = await searchParams;

  return <div className="page-wrap studio-page">
    <Link className="back-link" href={`/creators/${encodeURIComponent(usernameOf(user))}`}>Kembali ke profil</Link>
    <h1>Edit profil</h1>
    {error && <p className="inline-notice" role="alert">{error}</p>}
    <form action={communityAction} className="collab-panel editor-fields profile-form">
      <input type="hidden" name="operation" value="profile"/>
      <label>
        Foto profil
        <ProfilePhoto name={user.name} photo={user.photo}/>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" aria-describedby="profile-photo-formats"/>
        <small id="profile-photo-formats">JPG, PNG, atau WebP. Maksimal 5 MB.</small>
      </label>
      <label>Nama<input name="name" minLength={2} maxLength={80} defaultValue={user.name} required/></label>
      <label>Username<input name="username" pattern="[a-z0-9_]{3,30}" minLength={3} maxLength={30} defaultValue={usernameOf(user)} required/>
        <small>3–30 huruf kecil, angka, atau underscore.</small>
      </label>
      <label>Bio<textarea name="bio" maxLength={1000} rows={4} defaultValue={user.bio}/></label>
      <div className="field-pair">
        <label>Lokasi<input name="location" maxLength={100} defaultValue={user.location}/></label>
        <label>Website<input type="url" name="website" defaultValue={user.website} placeholder="https://"/></label>
      </div>
      <label className="checkbox-label"><input type="checkbox" name="open" value="yes" defaultChecked={user.open}/>Terbuka untuk pengajuan kolaborasi</label>
      <div><SubmitButton>Simpan profil</SubmitButton></div>
    </form>
  </div>;
}
