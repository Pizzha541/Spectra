# SPECTRA

SPECTRA es una aplicación Windows de control de streams para streamers y moderadores. Incluye un editor visual Staging/Live, overlays locales para OBS, Media Share, integración OBS WebSocket, colaboración preparada para Supabase y almacenamiento seguro de credenciales.

## Desarrollo

Requisitos: Node.js 24+, Rust estable, Microsoft C++ Build Tools, WebView2 y OBS Studio 28+.

```powershell
npm install
npm run test
npm run tauri dev
```

El modo navegador (`npm run dev`) permite trabajar en la UI. El servidor de overlays y Credential Manager sólo están activos dentro de Tauri.

## Supabase

1. Crea un proyecto gratuito en Supabase.
2. Ejecuta `supabase/migrations/202611220001_initial.sql` en el SQL Editor.
3. Copia `.env.example` a `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. En Authentication, configura la URL del sitio y habilita Email/Password.

La clave `anon` es pública y se protege con RLS. No uses `service_role` dentro de la aplicación. La migración separa espacios, permite control completo a moderadores vigentes, registra eventos y activa Realtime sólo en las tablas colaborativas.

## OBS

1. En OBS abre **Herramientas → Configuración del servidor WebSocket** y activa el servidor (puerto predeterminado 4455).
2. En SPECTRA abre **Configuración**, introduce `ws://127.0.0.1:4455` y la contraseña.
3. Añade una **Fuente de navegador** de 1920×1080 con:
   - Escena Live: `http://127.0.0.1:17777/overlay`
   - Media Share: `http://127.0.0.1:17777/media`

El servidor sólo escucha en el equipo local. Staging nunca cambia el overlay hasta pulsar **Publicar**. YouTube y Twitch se abren mediante reproductores embebidos; TikTok, Kick y algunos enlaces pueden negar embedding por políticas de la plataforma.

## Twitch y Kick

Para OAuth real necesitas registrar una aplicación en los portales oficiales y añadir Client ID/redirect URI. No se incluyen secretos. La UI permite guardar el canal y está preparada para ampliar los conectores sin convertir servicios de pago en requisito.

## Compilar instalador

```powershell
npm run tauri build
```

El instalador NSIS queda en `src-tauri/target/release/bundle/nsis/`. Para firmar un build local, configura `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` en el entorno de la compilación. El modo de desarrollo funciona sin la clave.

## Actualizaciones de Windows

Instala la versión 0.2.0 una vez si usas 0.1.0. SPECTRA consulta las [releases públicas](https://github.com/Pizzha541/Spectra/releases) al iniciar y cada cuatro horas. Configuración permite comprobar manualmente y activar preliminares. «Actualizar ahora» descarga y verifica la firma. «Instalar y reiniciar» inicia NSIS cuando termines de trabajar. «Más tarde» aplaza el aviso de esa versión durante la sesión.

Para publicar, actualiza la versión de Tauri, Cargo y npm y sus lockfiles. Añade las notas en `releases/vVERSION.md` o deja que GitHub las genere. Sube el commit y una etiqueta `vVERSION` al repositorio oficial. Actions prueba y compila para Windows x64 y publica el instalador, su firma y el manifiesto `latest.json` juntos. Una etiqueta como `v0.3.0-beta.1` crea una prerelease. Los dos secretos de Actions usan los mismos nombres que las variables de firma. Conserva una copia segura de la clave y su contraseña para mantener la continuidad de las actualizaciones.

## Seguridad y límites

- Las contraseñas de OBS se guardan con Windows Credential Manager.
- No se aceptan URLs que no sean HTTP(S).
- Los widgets HTML se ejecutan en iframes sandboxed.
- RLS valida todas las lecturas y escrituras remotas por espacio.
- La cola local y el canvas se conservan tras reiniciar.
- No se promete reproducción universal: cada plataforma conserva sus políticas de embedding, autoplay y autenticación.
