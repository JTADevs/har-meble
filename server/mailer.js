// Powiadomienia e-mail o zapytaniach z formularza wyceny (nodemailer, SMTP ze zmiennych środowiskowych).
// Bez SMTP_HOST e-maile nie wychodzą – zapytanie i tak jest zapisane i widoczne w panelu firmy.
import path from 'node:path';
import nodemailer from 'nodemailer';
import { COMPANY } from '../shared/site.js';
import { FILE_TYPES, INQUIRY_TYPES, fileExtension, formatBytes, inquiryRows, inquirySubject } from '../shared/inquiry.js';

const env = process.env;
const MB = 1024 * 1024;
const truthy = (v) => /^(1|true|tak|yes|on)$/i.test(String(v ?? '').trim());

export const mailConfigured = () => Boolean(env.SMTP_HOST && (env.MAIL_FROM || env.SMTP_USER));

// Adresat: meble → COMPANY.email, B2B → COMPANY.emailB2B (zmienne MAIL_TO / MAIL_TO_B2B nadpisują).
export const recipientFor = (type) => (type === 'b2b' ? env.MAIL_TO_B2B || COMPANY.emailB2B : env.MAIL_TO || COMPANY.email);

let transporter = null;
function transport() {
  if (transporter) return transporter;
  // SMTP_SECURE=true – połączenie szyfrowane od razu (zwykle port 465); bez niego STARTTLS na 587
  const secure = env.SMTP_SECURE ? truthy(env.SMTP_SECURE) : Number(env.SMTP_PORT) === 465;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || (secure ? 465 : 587),
    secure,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' } : undefined,
    // limity, żeby zawieszony serwer SMTP nie trzymał wysyłki w nieskończoność
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
  return transporter;
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Gmail przyjmuje wiadomości do 25 MB PO zakodowaniu (base64 to ok. +33%) – większe załączniki zostają w panelu.
function splitAttachments(files) {
  const limit = (Number(env.MAIL_ATTACHMENTS_MAX_MB) || 18) * MB;
  let used = 0;
  const attached = [];
  const skipped = [];
  for (const f of files) {
    if (used + f.size <= limit) {
      attached.push(f);
      used += f.size;
    } else skipped.push(f);
  }
  return { attached, skipped };
}

function render(inq, skipped) {
  const { contact, details } = inquiryRows(inq);
  const type = INQUIRY_TYPES[inq.type];
  const date = new Date(inq.createdAt).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'long', timeStyle: 'short' });
  const fileNote = (f) => (skipped.includes(f) ? ' – za duży do e-maila, pobierz w panelu' : '');

  const textRows = (rows) => rows.map(([k, v]) => (String(v).includes('\n') ? `${k}:\n${v}` : `${k}: ${v}`)).join('\n');
  const text = [
    `Nowe zapytanie z formularza wyceny – ${type}`,
    `Data: ${date} · numer: ${inq.id}`,
    '',
    'KONTAKT',
    textRows(contact),
    ...(details.length ? ['', 'SZCZEGÓŁY', textRows(details)] : []),
    '',
    inq.type === 'b2b' ? 'OPIS ZLECENIA' : 'OPIS PROJEKTU',
    inq.message,
    '',
    `ZAŁĄCZNIKI (${inq.files.length})`,
    ...(inq.files.length ? inq.files.map((f) => `– ${f.name} (${formatBytes(f.size)})${fileNote(f)}`) : ['brak']),
    '',
    `Aby odpowiedzieć klientowi, użyj „Odpowiedz” – wiadomość trafi na ${inq.contact.email}.`,
  ].join('\n');

  const cell = 'padding:7px 0;border-top:1px solid #e7dfd4;vertical-align:top';
  const htmlRows = (rows) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="${cell};width:36%;padding-right:16px;color:#6b6157">${escapeHtml(k)}</td>` +
          `<td style="${cell};white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
      )
      .join('');
  const table = (rows) => `<table role="presentation" style="border-collapse:collapse;width:100%;font-size:15px">${htmlRows(rows)}</table>`;
  const h2 = (t) => `<h2 style="margin:28px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6157">${t}</h2>`;
  const filesHtml = inq.files.length
    ? `<ul style="margin:0;padding-left:20px">${inq.files
        .map((f) => `<li>${escapeHtml(f.name)} <span style="color:#6b6157">(${formatBytes(f.size)})${escapeHtml(fileNote(f))}</span></li>`)
        .join('')}</ul>`
    : '<p style="margin:0;color:#6b6157">brak</p>';

  const html = `<!doctype html><html lang="pl"><body style="margin:0;padding:24px;background:#f4f1ec">
<div style="max-width:680px;margin:0 auto;padding:28px;background:#ffffff;border-radius:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1d1814">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b6157">${escapeHtml(COMPANY.brand)} · formularz wyceny · ${escapeHtml(type)}</p>
<h1 style="margin:0 0 6px;font-size:22px;line-height:1.25">${escapeHtml(inquirySubject(inq))}</h1>
<p style="margin:0;color:#6b6157;font-size:13px">${escapeHtml(date)} · numer ${escapeHtml(inq.id)}</p>
${h2('Kontakt')}${table(contact)}
${details.length ? h2('Szczegóły') + table(details) : ''}
${h2(inq.type === 'b2b' ? 'Opis zlecenia' : 'Opis projektu')}
<div style="white-space:pre-wrap;background:#f4f1ec;border-radius:10px;padding:14px 16px">${escapeHtml(inq.message)}</div>
${h2(`Załączniki (${inq.files.length})`)}${filesHtml}
<p style="margin:28px 0 0;font-size:13px;color:#6b6157">Aby odpowiedzieć klientowi, użyj „Odpowiedz” – wiadomość trafi na
<a href="mailto:${escapeHtml(inq.contact.email)}" style="color:#8e4f22">${escapeHtml(inq.contact.email)}</a>.</p>
</div></body></html>`;

  return { text, html };
}

// Wysyła powiadomienie o zapytaniu; dir – katalog z plikami tego zapytania. Rzuca błąd, gdy SMTP odrzuci wiadomość.
export async function sendInquiryMail(inq, dir) {
  const { attached, skipped } = splitAttachments(inq.files);
  const { text, html } = render(inq, skipped);
  return transport().sendMail({
    from: env.MAIL_FROM || { name: `Formularz ${COMPANY.brand}`, address: env.SMTP_USER },
    to: recipientFor(inq.type),
    replyTo: { name: inq.contact.name, address: inq.contact.email },
    subject: inquirySubject(inq),
    text,
    html,
    attachments: attached.map((f) => ({
      filename: f.name,
      path: path.join(dir, f.stored),
      contentType: FILE_TYPES[fileExtension(f.stored)] || 'application/octet-stream',
    })),
  });
}
