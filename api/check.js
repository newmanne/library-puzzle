// api/check.js (CommonJS export)
module.exports = async function (req, res) {
  try {
    const method = (req.method || "GET").toUpperCase();
    if (method !== "POST") {
      res.setHeader("allow", "POST");
      return res.status(405).json({ ok: false, error: "Use POST" });
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8") || "{}";
    let data = {};
    try { data = JSON.parse(raw); } catch {}
    const guess = String((data.guess ?? "")).toUpperCase().replace(/[^A-Z]/g, "");
    const acceptable = new Set(["ALEPH","THEALEPH"]);
    const ok = acceptable.has(guess);
    res.setHeader("cache-control", "no-store");
    return res.status(200).json({ ok });
  } catch (e) {
    return res.status(500).json({ ok:false, error:"server_error" });
  }
}
