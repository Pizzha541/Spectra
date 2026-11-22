import { useState } from "react";
import { MailPlus, ShieldCheck, UserMinus, Users } from "lucide-react";
import { useSpectraStore } from "../store/useSpectraStore";

export function Collaboration() {
  const [email, setEmail] = useState("");
  const collaborators = useSpectraStore((s) => s.collaborators);
  const invite = useSpectraStore((s) => s.inviteCollaborator);
  const revoke = useSpectraStore((s) => s.revokeCollaborator);
  return <section className="page"><header className="page-header"><div><span className="eyebrow">ESPACIO COMPARTIDO</span><h1>Colaboración</h1><p>Acceso completo para moderadores autorizados, con revocación inmediata.</p></div><div className="header-stat"><Users /><strong>{collaborators.filter((c) => c.status === "active").length}</strong><span>activos</span></div></header>
    <div className="collab-layout"><div className="panel"><h2>Invitación privada</h2><p className="muted">La invitación queda vinculada al correo. En producción, Supabase enviará y validará el enlace de acceso.</p><form className="invite-form" onSubmit={(e) => { e.preventDefault(); if (/^[^@]+@[^@]+\.[^@]+$/.test(email) && !collaborators.some((c) => c.email === email.toLowerCase())) { invite(email); setEmail(""); } }}><MailPlus /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="moderador@correo.com" required /><button type="submit">Invitar</button></form></div>
      <div className="panel security-card"><ShieldCheck /><div><h3>Modelo de permisos</h3><p>Los moderadores aceptados pueden preparar y publicar escenas. El aislamiento y la autorización se aplican por espacio mediante RLS, no ocultando botones.</p></div></div></div>
    <div className="panel member-panel"><div className="section-title"><h2>Miembros</h2><span>{collaborators.length} total</span></div><div className="member-list">{collaborators.map((member) => <div className="member-row" key={member.id}><div className={`avatar ${member.online ? "online" : ""}`}>{member.email[0].toUpperCase()}</div><div><strong>{member.email}</strong><span>{member.role === "owner" ? "Propietario" : "Moderador"} · {member.status}</span></div><span className={`member-state ${member.online ? "online" : ""}`}>{member.online ? "En línea" : "Desconectado"}</span>{member.role !== "owner" && member.status !== "revoked" && <button className="danger-outline" onClick={() => revoke(member.id)}><UserMinus /> Revocar</button>}</div>)}</div></div>
  </section>;
}
