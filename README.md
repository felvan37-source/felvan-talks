# Felvan Talks

Latihan ngobrol Inggris (CEFR) dengan koreksi grammar & pelafalan.
Hosting: Vercel (via GitHub). AI: Gemini dan/atau OpenAI. Data siswa: Google Sheets (GAS).

## Environment Variables (Vercel > Settings > Environment Variables)
| Nama | Wajib? | Isi |
|---|---|---|
| GEMINI_API_KEY | salah satu | key dari aistudio.google.com/apikey |
| OPENAI_API_KEY | salah satu | key dari platform.openai.com/api-keys |
| AI_PROVIDER | opsional | `gemini` (default) atau `openai` = AI yang dicoba pertama |
| GAS_URL | wajib | URL web app Apps Script |
| GAS_SECRET | wajib | sama persis dengan SECRET di gas/Code.gs |
| GEMINI_MODEL / GEMINI_FALLBACK_MODEL / OPENAI_MODEL | opsional | ganti nama model tanpa edit kode |

Kalau dua key diisi, AI kedua otomatis jadi cadangan saat yang pertama sibuk/error.

## Struktur
public/index.html  -> tampilan
api/chat.js        -> panggil AI
api/save.js        -> kirim data ke GAS
gas/Code.gs        -> tempel di Apps Script
Jangan taruh key di file yang di-push ke GitHub.
