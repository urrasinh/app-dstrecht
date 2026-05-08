# Setup — Backend & Auth

Pasos para que la app quede operativa. Necesitas una cuenta de Google.

## 1. Firebase project (auth)

1. Ve a https://console.firebase.google.com → **Add project**.
2. Asígnale un nombre (ej. `dstretch-field-pro`). Sin Analytics es suficiente.
3. En el panel del proyecto: **Build → Authentication → Get started**.
4. Habilita **Email/Password** y **Google** como providers.
5. **Project Settings (⚙) → General → Your apps → Add app → Web** (icono `</>`).
   - Registra la app (nickname libre, no marques Hosting).
   - Copia el objeto `firebaseConfig` que te muestra.
6. Crea `.env` en la raíz del proyecto (basado en `.env.example`) y rellena con esos valores:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
7. **Authentication → Settings → Authorized domains** → añade el dominio donde harás deploy (Netlify/Vercel/etc) y `localhost` ya viene por defecto.

## 2. Drive (carpeta para imágenes)

1. En tu Google Drive, crea una carpeta nueva: **DStretch-Originals**.
2. Abre la carpeta — copia el ID de la URL: `drive.google.com/drive/folders/<ESTE_ID>`.

## 3. Sheets (registro de uploads)

1. Crea un Spreadsheet nuevo: **DStretch-Registros**.
2. Copia el ID de la URL: `docs.google.com/spreadsheets/d/<ESTE_ID>/edit`.

## 4. Apps Script (backend)

1. https://script.google.com → **New project**.
2. Pega el contenido de `apps-script/Code.gs` en `Code.gs`.
3. **Project Settings (⚙) → Script Properties → Add property** (4 propiedades):
   - `FIREBASE_PROJECT_ID` = el `projectId` del paso 1
   - `DRIVE_FOLDER_ID` = ID del paso 2
   - `SHEET_ID` = ID del paso 3
   - `SHEET_NAME` = `Registros` (o el nombre que prefieras)
4. **Deploy → New deployment**:
   - Type: **Web app**
   - Description: `dstretch-backend-v1`
   - Execute as: **Me** (tu cuenta admin — así escribirá en TU Drive y TU Sheet)
   - Who has access: **Anyone** (necesario para que la PWA pueda llamar; la seguridad la da el ID token)
   - Click **Deploy** → autoriza permisos cuando lo pida.
5. Copia la **Web app URL** que te da (termina en `/exec`).
6. Pégala en `.env`:
   ```
   VITE_BACKEND_URL=https://script.google.com/macros/s/.../exec
   ```

## 5. Probar

```bash
npm run dev
```

- La app debe pedir login.
- Tras loguear y subir una imagen, en consola del navegador no debes ver errores.
- Mira tu Drive: el archivo original debe aparecer.
- Mira tu Sheet: la fila debe haberse añadido con email, link, GPS, cámara, fecha.

## Notas

- **Offline**: las subidas se guardan en IndexedDB y se reintentan automáticamente cuando vuelve la conexión.
- **Tamaño máx**: ~50 MB por imagen (límite de Apps Script). Para RAW grandes, considera bajar a Drive directo desde el cliente con OAuth.
- **Re-deploy del Apps Script**: cada cambio en `Code.gs` requiere `Deploy → Manage deployments → Edit (lápiz) → New version`. La URL se mantiene.
