module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const b = req.body || {};
    const payload = {
      token: process.env.GAS_SECRET,
      user: String(b.user || "Guest").slice(0, 40),
      level: String(b.level || "").slice(0, 3),
      text: String(b.text || "").slice(0, 1500),
      reply: String(b.reply || "").slice(0, 1500),
      score: Number(b.score) || 0,
      corrections: b.corrections || [],
      pronunciation: b.pronunciation || []
    };
    const r = await fetch(process.env.GAS_URL, { method: "POST", body: JSON.stringify(payload) });
    const out = await r.json().catch(() => ({ ok: false }));
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
