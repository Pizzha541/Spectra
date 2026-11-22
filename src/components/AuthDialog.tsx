import { useState } from "react";
import { LoaderCircle, LockKeyhole, Mail, RadioTower } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../services/supabase";

interface Props { onContinue: () => void }

export function AuthDialog({ onContinue }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [register, setRegister] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) { onContinue(); return; }
    setLoading(true); setMessage("");
    const { error } = register
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage(error.message);
    else if (register) setMessage("Cuenta creada. Revisa tu correo si la confirmación está activada.");
    else onContinue();
  };
  return <div className="auth-screen"><div className="auth-glow" /><div className="auth-card"><div className="brand-mark large-mark"><RadioTower /></div><span className="eyebrow">STREAM CONTROL SYSTEM</span><h1>SPECTRA</h1><p>{isSupabaseConfigured ? (register ? "Crea tu espacio de producción." : "Accede a tu espacio de producción.") : "El entorno cloud todavía no está configurado. Puedes trabajar en modo local."}</p><form onSubmit={submit}><label>Correo<div className="input-icon"><Mail /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="streamer@correo.com" required={isSupabaseConfigured} /></div></label><label>Contraseña<div className="input-icon"><LockKeyhole /><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required={isSupabaseConfigured} /></div></label>{message && <div className="form-error">{message}</div>}<button className="primary auth-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : null}{isSupabaseConfigured ? (register ? "Crear cuenta" : "Iniciar sesión") : "Entrar en modo local"}</button>{isSupabaseConfigured && <button className="auth-switch" type="button" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "Ya tengo cuenta" : "Crear una cuenta"}</button>}</form><small>La sesión se gestiona con Supabase Auth. Las credenciales de OBS usan el almacén seguro de Windows.</small></div></div>;
}
