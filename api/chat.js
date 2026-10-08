const LEVELS = ["A1","A2","B1","B2","C1","C2"];

function systemPrompt(level){
  return `You are Felvan, a friendly English conversation partner for Indonesian learners.
Learner CEFR level: ${level}. Keep your replies at this level (vocabulary and grammar), 1-3 short sentences, and end with a question to keep the conversation going.
Check the learner's LAST message for grammar, word choice and spelling. If a "speech_words" list is given, it contains words recognised from speech with confidence 0-1; treat words with confidence below 0.8 as possible pronunciation problems.
Write explanations in simple Indonesian. Be encouraging, never harsh.
Return ONLY JSON with this shape:
{"reply":"your English reply",
 "corrections":[{"original":"...","corrected":"...","explanation":"Indonesian explanation"}],
 "pronunciation":[{"word":"...","ipa":"/.../","tip":"Indonesian tip on how to say it"}],
 "score":0-100 (overall accuracy of the learner's message),
 "praise":"one short Indonesian sentence about what they did well"}
Use empty arrays when there is nothing to fix. Only include pronunciation items if speech_words was provided.`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TRANSIENT = [429, 500, 503, 504];

async function callGemini(model, system, contents) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
    })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error?.message || "Gemini error"), { status: r.status });
  return d.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "{}";
}

async function callOpenAI(model, system, contents) {
  const messages = [{ role: "system", content: system }].concat(
    contents.map(c => ({ role: c.role === "model" ? "assistant" : "user", content: c.parts[0].text }))
  );
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model, messages, response_format: { type: "json_object" } })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error?.message || "OpenAI error"), { status: r.status });
  return d.choices?.[0]?.message?.content || "{}";
}

// Urutan percobaan: provider pilihan dulu (AI_PROVIDER), lalu yang lain bila key-nya ada
function buildAttempts() {
  const g = process.env.GEMINI_API_KEY ? [
    { name: "gemini", model: process.env.GEMINI_MODEL || "gemini-3.8-flash", fn: callGemini },
    { name: "gemini", model: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.7-flash", fn: callGemini }
  ] : [];
  const o = process.env.OPENAI_API_KEY ? [
    { name: "openai", model: process.env.OPENAI_MODEL || "gpt-5.4-mini", fn: callOpenAI }
  ] : [];
  return (process.env.AI_PROVIDER || "gemini") === "openai" ? [...o, ...g] : [...g, ...o];
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { level, contents } = req.body || {};
    if (!LEVELS.includes(level) || !Array.isArray(contents) || !contents.length || contents.length > 24)
      return res.status(400).json({ error: "Permintaan tidak valid." });
    const clean = contents.map(c => ({
      role: c.role === "model" ? "model" : "user",
      parts: [{ text: String(c.parts?.[0]?.text || "").slice(0, 1500) }]
    }));

    const attempts = buildAttempts();
    if (!attempts.length) return res.status(500).json({ error: "Belum ada API key di server (GEMINI_API_KEY atau OPENAI_API_KEY)." });

    const system = systemPrompt(level);
    let lastErr = null;
    for (const a of attempts) {
      for (let i = 0; i < 2; i++) {
        try {
          const raw = await a.fn(a.model, system, clean);
          return res.status(200).json(JSON.parse(raw.replace(/```json|```/g, "").trim()));
        } catch (e) {
          lastErr = e;
          console.error(`[${a.name}/${a.model}]`, e.status || "", e.message);
          if (!TRANSIENT.includes(e.status)) break;      // error permanen: langsung coba model lain
          await sleep(500 * (i + 1));
        }
      }
    }
    const busy = TRANSIENT.includes(lastErr?.status);
    res.status(busy ? 503 : 502).json({
      error: busy ? "Server AI sedang ramai. Coba kirim lagi beberapa detik lagi." : "AI error: " + (lastErr?.message || "tidak diketahui")
    });
  } catch (e) {
    res.status(500).json({ error: "Server error: " + e.message });
  }
};
