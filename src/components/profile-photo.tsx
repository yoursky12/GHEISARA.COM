import Image from "next/image";

export function ProfilePhoto({ name, photo }: { name: string; photo?: string }) {
  return photo
    ? <Image className="profile-initials object-cover" src={`/api/profile-photo/${photo}`} alt=""
        width={100} height={100} unoptimized/>
    : <span className="profile-initials" aria-hidden="true">{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span>;
}
