import type { Invitation } from "@/lib/collab-store";

export function CollabRequest({ invitation: i, partner, incoming, action }: {
  invitation: Invitation & { friends: boolean };
  partner: string;
  incoming: boolean;
  action: (form: FormData) => Promise<void>;
}) {
  const statuses = { pending: "Menunggu", accepted: "Diterima", rejected: "Ditolak", cancelled: "Dibatalkan" };
  const labels = { accepted: "Terima", rejected: "Tolak", cancelled: "Batalkan" };
  const operations = incoming ? ["accepted", "rejected"] as const : ["cancelled"] as const;

  return <article className="collab-item collab-invitation" id={`ajakan-${i.id}`}>
    <h3>{i.type} · {partner}</h3>
    {i.idea && <p className="collab-text">{i.idea}</p>}
    <p>{i.deadline && `${i.deadline} · `}{i.license} · {statuses[i.status]}</p>
    {incoming && i.status === "pending" && !i.friends && <p>Kalian perlu saling mengikuti untuk menerima ajakan ini.</p>}
    {i.status === "pending" && <div className="collab-toolbar">
      {operations.map(operation => <form action={action} key={operation}>
        <input type="hidden" name="operation" value={operation}/>
        <input type="hidden" name="id" value={i.id}/>
        <button className="button" disabled={operation === "accepted" && !i.friends}>{labels[operation]}</button>
      </form>)}
    </div>}
  </article>;
}
