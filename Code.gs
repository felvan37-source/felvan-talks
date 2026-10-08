// Tempel di Google Sheet: Extensions > Apps Script
const SECRET = "GANTI_DENGAN_TOKEN_RAHASIA"; // harus sama dengan GAS_SECRET di Vercel
const SHEET  = "Log";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.token !== SECRET) return out({ ok: false, error: "unauthorized" });

    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName(SHEET);
    if (!sh) {
      sh = ss.insertSheet(SHEET);
      sh.appendRow(["Waktu", "Nama", "Level", "Kalimat siswa", "Balasan AI", "Skor", "Koreksi grammar", "Kata sulit (pelafalan)"]);
      sh.setFrozenRows(1);
    }
    sh.appendRow([
      new Date(), d.user, d.level, d.text, d.reply, d.score,
      (d.corrections || []).map(c => c.original + " -> " + c.corrected).join(" | "),
      (d.pronunciation || []).map(p => p.word).join(", ")
    ]);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
