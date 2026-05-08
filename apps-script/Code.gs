/**
 * Filtro Pictografías — Apps Script Backend
 *
 * Script Properties requeridas:
 *   FIREBASE_PROJECT_ID         (el projectId de Firebase)
 *   DRIVE_FOLDER_ID             (carpeta donde guardar originales)
 *   SHEET_ID                    (spreadsheet de registros)
 *   SHEET_NAME                  (default: "Registros")
 *
 * Opcionales:
 *   NOTIFY_EMAIL                (correo destino del email; si vacío, se mandan a TODOS los admins)
 *   FCM_SERVICE_ACCOUNT_JSON    (JSON completo de service account para push notifications)
 */

var ADMIN_EMAILS = [
  'guillermo@saiperfumes.cl',
  'guillermo@sairam.cl',
  'analytics.sairam@gmail.com',
  'fundacionpaqarina@gmail.com'
];

function isAdmin(email) {
  if (!email) return false;
  var e = String(email).toLowerCase();
  for (var i = 0; i < ADMIN_EMAILS.length; i++) {
    if (ADMIN_EMAILS[i].toLowerCase() === e) return true;
  }
  return false;
}

// ── Entry points ────────────────────────────────────────────────────────────

function doGet() {
  return jsonOut({ ok: true, service: 'Filtro Pictografías backend' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var projectId = props.getProperty('FIREBASE_PROJECT_ID');

    var verified = verifyFirebaseToken(body.idToken, projectId);
    if (!verified) return jsonOut({ ok: false, error: 'Token inválido' });

    var email = String(verified.email || body.userEmail || '').toLowerCase();
    var admin = isAdmin(email);

    // Action-based routing (admin endpoints)
    if (body.action) {
      if (body.action === 'whoami') {
        return jsonOut({ ok: true, email: email, isAdmin: admin });
      }
      if (body.action === 'registerPushToken') {
        if (!admin) return jsonOut({ ok: false, error: 'No autorizado' });
        return registerPushToken(props, email, body.token);
      }
      if (!admin) return jsonOut({ ok: false, error: 'No autorizado' });
      switch (body.action) {
        case 'list': return listRecords(props);
        case 'delete': return deleteRecords(props, body.fileIds || []);
        case 'feature': return setFeatured(props, body.fileIds || [], true);
        case 'unfeature': return setFeatured(props, body.fileIds || [], false);
        case 'users': return listUsers(props);
        default: return jsonOut({ ok: false, error: 'Acción desconocida' });
      }
    }

    // Default: upload
    return handleUpload(body, email, props);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) });
  }
}

// ── Upload ──────────────────────────────────────────────────────────────────

function handleUpload(body, email, props) {
  var DRIVE_FOLDER_ID = props.getProperty('DRIVE_FOLDER_ID');
  var SHEET_ID = props.getProperty('SHEET_ID');
  var SHEET_NAME = props.getProperty('SHEET_NAME') || 'Registros';

  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.fileBase64),
    body.mimeType || 'image/jpeg',
    body.fileName || 'image.jpg'
  );
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var driveLink = file.getUrl();
  var fileId = file.getId();

  var mapsLink = '';
  if (body.lat != null && body.lon != null) {
    mapsLink = 'https://www.google.com/maps?q=' + body.lat + ',' + body.lon;
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ensureRegistrosSheet(ss, SHEET_NAME);
  sh.appendRow([
    new Date(), email, driveLink,
    body.lat == null ? '' : body.lat,
    body.lon == null ? '' : body.lon,
    mapsLink,
    body.camera || '',
    body.captureDate || '',
    'NO', // Destacado
    fileId
  ]);

  notifyAdmins(props, email, body, driveLink, mapsLink, fileId);

  return jsonOut({ ok: true, driveLink: driveLink, mapsLink: mapsLink, fileId: fileId });
}

function ensureRegistrosSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Fecha registro', 'Usuario', 'Imagen', 'Latitud', 'Longitud', 'Mapa', 'Cámara', 'Fecha captura', 'Destacado', 'FileID']);
  }
  return sh;
}

// ── Admin actions ───────────────────────────────────────────────────────────

function listRecords(props) {
  var SHEET_ID = props.getProperty('SHEET_ID');
  var SHEET_NAME = props.getProperty('SHEET_NAME') || 'Registros';
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return jsonOut({ ok: true, records: [] });

  var values = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  var records = values.map(function (row) {
    return {
      registeredAt: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      userEmail: row[1],
      imageLink: row[2],
      lat: row[3] === '' ? null : Number(row[3]),
      lon: row[4] === '' ? null : Number(row[4]),
      mapsLink: row[5],
      camera: row[6],
      captureDate: row[7],
      featured: String(row[8] || '').toUpperCase() === 'SI' || row[8] === true,
      fileId: row[9]
    };
  }).filter(function (r) { return r.fileId; });
  return jsonOut({ ok: true, records: records });
}

function deleteRecords(props, fileIds) {
  if (!fileIds.length) return jsonOut({ ok: true, deleted: 0 });
  var SHEET_ID = props.getProperty('SHEET_ID');
  var SHEET_NAME = props.getProperty('SHEET_NAME') || 'Registros';
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);

  fileIds.forEach(function (fid) {
    try { DriveApp.getFileById(fid).setTrashed(true); } catch (e) { }
  });

  var lastRow = sh.getLastRow();
  if (lastRow < 2) return jsonOut({ ok: true, deleted: 0 });
  var values = sh.getRange(2, 10, lastRow - 1, 1).getValues();
  var toDelete = [];
  for (var i = 0; i < values.length; i++) {
    if (fileIds.indexOf(values[i][0]) >= 0) toDelete.push(i + 2);
  }
  toDelete.sort(function (a, b) { return b - a; });
  toDelete.forEach(function (rn) { sh.deleteRow(rn); });

  return jsonOut({ ok: true, deleted: toDelete.length });
}

function setFeatured(props, fileIds, value) {
  if (!fileIds.length) return jsonOut({ ok: true, updated: 0 });
  var SHEET_ID = props.getProperty('SHEET_ID');
  var SHEET_NAME = props.getProperty('SHEET_NAME') || 'Registros';
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return jsonOut({ ok: true, updated: 0 });

  var values = sh.getRange(2, 10, lastRow - 1, 1).getValues();
  var updated = 0;
  for (var i = 0; i < values.length; i++) {
    if (fileIds.indexOf(values[i][0]) >= 0) {
      sh.getRange(i + 2, 9).setValue(value ? 'SI' : 'NO');
      updated++;
    }
  }
  return jsonOut({ ok: true, updated: updated });
}

function listUsers(props) {
  var SHEET_ID = props.getProperty('SHEET_ID');
  var SHEET_NAME = props.getProperty('SHEET_NAME') || 'Registros';
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return jsonOut({ ok: true, users: [] });

  var values = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  var users = {};
  values.forEach(function (row) {
    var em = String(row[1] || '').toLowerCase();
    if (!em) return;
    var dateStr = row[0] instanceof Date ? row[0].toISOString() : String(row[0]);
    if (!users[em]) {
      users[em] = {
        email: em, uploads: 0,
        firstUpload: dateStr, lastUpload: dateStr,
        cameras: {}, withGps: 0
      };
    }
    var u = users[em];
    u.uploads++;
    if (dateStr > u.lastUpload) u.lastUpload = dateStr;
    if (dateStr < u.firstUpload) u.firstUpload = dateStr;
    var cam = String(row[6] || '').trim();
    if (cam) u.cameras[cam] = (u.cameras[cam] || 0) + 1;
    if (row[3] !== '' && row[4] !== '') u.withGps++;
  });

  var arr = Object.keys(users).map(function (k) {
    var u = users[k];
    var cs = Object.keys(u.cameras).map(function (c) { return c + ' (' + u.cameras[c] + ')'; });
    return {
      email: u.email, uploads: u.uploads,
      firstUpload: u.firstUpload, lastUpload: u.lastUpload,
      cameras: cs.join(', '),
      withGps: u.withGps,
      isAdmin: isAdmin(u.email)
    };
  });
  arr.sort(function (a, b) { return b.uploads - a.uploads; });
  return jsonOut({ ok: true, users: arr });
}

// ── Push notifications ──────────────────────────────────────────────────────

function registerPushToken(props, email, token) {
  if (!token) return jsonOut({ ok: false, error: 'Sin token' });
  var SHEET_ID = props.getProperty('SHEET_ID');
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('AdminTokens') || ss.insertSheet('AdminTokens');
  if (sh.getLastRow() === 0) sh.appendRow(['Email', 'Token', 'UpdatedAt']);

  var existing = sh.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (existing[i][1] === token) {
      sh.getRange(i + 1, 1).setValue(email);
      sh.getRange(i + 1, 3).setValue(new Date());
      return jsonOut({ ok: true });
    }
  }
  sh.appendRow([email, token, new Date()]);
  return jsonOut({ ok: true });
}

function notifyAdmins(props, fromEmail, body, driveLink, mapsLink, fileId) {
  // Email
  try {
    var notifyEmail = props.getProperty('NOTIFY_EMAIL');
    var to = notifyEmail || ADMIN_EMAILS.join(',');
    var subject = '[Filtro Pictografías] Nueva imagen subida por ' + fromEmail;
    var html =
      '<h2>Nueva imagen registrada</h2>' +
      '<p><b>Usuario:</b> ' + fromEmail + '</p>' +
      '<p><b>Cámara:</b> ' + (body.camera || '—') + '</p>' +
      '<p><b>Fecha captura:</b> ' + (body.captureDate || '—') + '</p>' +
      '<p><b>Coordenadas:</b> ' + (mapsLink ? '<a href="' + mapsLink + '">' + body.lat + ', ' + body.lon + '</a>' : 'Sin GPS') + '</p>' +
      '<p><b>Imagen:</b> <a href="' + driveLink + '">Ver en Drive</a></p>';
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: html });
  } catch (e) { }

  // FCM push
  try { sendFCMToAdmins(props, fromEmail, body, fileId); } catch (e) { }
}

function sendFCMToAdmins(props, fromEmail, body, fileId) {
  var saJson = props.getProperty('FCM_SERVICE_ACCOUNT_JSON');
  var projectId = props.getProperty('FIREBASE_PROJECT_ID');
  if (!saJson || !projectId) return;
  var sa;
  try { sa = JSON.parse(saJson); } catch (e) { return; }

  var oauth = getOAuthToken(sa);
  if (!oauth) return;

  var SHEET_ID = props.getProperty('SHEET_ID');
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('AdminTokens');
  if (!sh || sh.getLastRow() < 2) return;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();

  rows.forEach(function (row) {
    var em = String(row[0]).toLowerCase();
    var fcmToken = row[1];
    if (!isAdmin(em) || !fcmToken) return;
    var payload = {
      message: {
        token: fcmToken,
        notification: {
          title: 'Nueva imagen subida',
          body: fromEmail + (body.camera ? ' · ' + body.camera : '')
        },
        data: { fileId: fileId || '', from: fromEmail },
        webpush: { fcm_options: { link: '/' } }
      }
    };
    UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + oauth },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
  });
}

function getOAuthToken(sa) {
  var now = Math.floor(Date.now() / 1000);
  var header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  var unsigned = header + '.' + claim;
  var sig = Utilities.computeRsaSha256Signature(unsigned, sa.private_key);
  var jwt = unsigned + '.' + b64urlBytes(sig);

  var resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return null;
  return JSON.parse(resp.getContentText()).access_token;
}

function b64url(s) { return Utilities.base64EncodeWebSafe(s).replace(/=+$/, ''); }
function b64urlBytes(b) { return Utilities.base64EncodeWebSafe(b).replace(/=+$/, ''); }

// ── Helpers ─────────────────────────────────────────────────────────────────

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyFirebaseToken(idToken, projectId) {
  if (!idToken || !projectId) return null;
  try {
    var parts = idToken.split('.');
    if (parts.length !== 3) return null;
    var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
    if (payload.aud !== projectId) return null;
    if (payload.iss !== 'https://securetoken.google.com/' + projectId) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return { email: payload.email, uid: payload.user_id || payload.sub };
  } catch (e) { return null; }
}
