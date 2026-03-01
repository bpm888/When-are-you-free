import { useState, useEffect } from "react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const SLOTS = ["Morning","Afternoon","Evening"];
const SLOT_SUB = { Morning:"before 12", Afternoon:"12 – 5", Evening:"after 5" };
const FIRE_THRESHOLD = 3;
const LS_KEY = "waf-username";
const LS_SLOTS_KEY = "waf-myslots";

const AVATARCOLS = ["#39FF14","#00E5FF","#FF3CAC","#FFD600","#FF6B35","#7B2FBE","#00C853","#FF1744"];
function avatarColor(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATARCOLS.length;
  return AVATARCOLS[Math.abs(h)];
}

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [mySlots, setMySlots] = useState({});
  const [all, setAll] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function init() {
      let responses = {};
      try {
        const r = await window.storage.get("waf-v1", true);
        if (r) responses = JSON.parse(r.value);
      } catch(e) {}

      let savedName = null;
      try { savedName = localStorage.getItem(LS_KEY); } catch(e) {}

      if (savedName && savedName.trim()) {
        const n = savedName.trim();
        setName(n);
        const sharedSlots = responses[n];
        let slots = (sharedSlots && Object.keys(sharedSlots).length > 0) ? sharedSlots : {};
        if (!Object.keys(slots).length) {
          try { const local = localStorage.getItem(LS_SLOTS_KEY); if (local) slots = JSON.parse(local); } catch(e) {}
        }
        const updated = { ...responses, [n]: slots };
        setAll(updated);
        if (Object.keys(slots).length > 0 && !sharedSlots) {
          try { await window.storage.set("waf-v1", JSON.stringify(updated), true); } catch(e) {}
        }
        setMySlots(slots);
        setScreen("results");
      } else {
        setAll(responses);
        setScreen("name");
      }
    }
    init();
  }, []);

  async function persist(data) {
    setSaving(true);
    try { await window.storage.set("waf-v1", JSON.stringify(data), true); } catch(e) {}
    setSaving(false);
  }

  function toast2(m) { setToast(m); setTimeout(() => setToast(""), 2000); }

  function go() {
    const n = draft.trim(); if (!n) return;
    try { localStorage.setItem(LS_KEY, n); } catch(e) {}
    setName(n); setMySlots(all[n] || {}); setScreen("grid");
  }

  function switchUser() {
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_SLOTS_KEY); } catch(e) {}
    setName(""); setDraft(""); setMySlots({}); setScreen("name");
  }

  function toggle(day, slot) {
    const k = `${day}|${slot}`;
    setMySlots(p => { const n={...p}; n[k]?delete n[k]:n[k]=true; return n; });
  }

  async function save() {
    const u = {...all, [name]: mySlots};
    setAll(u); await persist(u);
    try { localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(mySlots)); } catch(e) {}
    toast2("Saved."); setScreen("results");
  }

  async function clear() {
    const u = {...all}; delete u[name];
    setAll(u); await persist(u);
    try { localStorage.removeItem(LS_SLOTS_KEY); } catch(e) {}
    setMySlots({}); toast2("Cleared."); setScreen("results");
  }

  function count(k) { return Object.values(all).filter(s=>s[k]).length; }
  function hot(k) { return count(k) >= FIRE_THRESHOLD; }

  function hotSlots() {
    const c={};
    for (const s of Object.values(all)) for (const k of Object.keys(s)) c[k]=(c[k]||0)+1;
    return Object.entries(c).filter(([,v])=>v>=FIRE_THRESHOLD).map(([k])=>k);
  }

  const people = Object.keys(all);
  const hots = hotSlots();

  if (screen === "loading") return (
    <div style={S.page}><style>{css}</style><div style={S.splash}>loading...</div></div>
  );

  return (
    <div style={S.page}>
      <style>{css}</style>
      {toast && <div style={S.toast} className="toast">{toast}</div>}

      {/* ── NAME SCREEN ── */}
      {screen === "name" && (
        <div style={S.wrap} className="up">
          <div style={S.logo}>WHEN ARE YOU FREE</div>

          <div style={S.nameHero}>
            <h1 style={S.h1}>Sort.<br />It.<br />Out.</h1>
            <p style={S.sub}>Every week someone asks. Nobody replies. Stop being useless. Takes 20 seconds.</p>
          </div>

          <div style={S.nameRow}>
            <input
              style={S.input}
              placeholder="Your name"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && go()}
              autoFocus
            />
            <button style={{...S.btnAccent, opacity: draft.trim() ? 1 : 0.3}} onClick={go} disabled={!draft.trim()}>
              IN
            </button>
          </div>

          {people.length > 0 && (
            <div style={S.whoBox}>
              <div style={S.dimLabel}>{people.length} RESPONDED</div>
              <div style={S.avatarRow}>
                {people.map(n => (
                  <div key={n} style={{...S.av, background: avatarColor(n)}} title={n}>
                    {n[0].toUpperCase()}
                  </div>
                ))}
              </div>
              {hots.length > 0 && (
                <div style={S.hotBadge}>{hots.length} SLOT{hots.length > 1 ? "S" : ""} WITH 3+ FREE</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GRID SCREEN ── */}
      {screen === "grid" && (
        <div style={S.wrap} className="up">
          <div style={S.topBar}>
            <div>
              <div style={S.screenName}>{name.toUpperCase()}</div>
              <div style={S.screenSub}>Tap when you're free. Don't lie.</div>
            </div>
            <div style={S.topBtns}>
              <button style={S.btnGhost} onClick={() => setScreen("results")}>Results</button>
              <button style={S.btnGhost} onClick={switchUser}>Switch</button>
            </div>
          </div>

          <div style={S.dayList}>
            {DAYS.map((day, di) => (
              <div key={day} style={S.dayBlock}>
                <div style={{...S.dayHead, ...(di >= 5 ? S.dayHeadWknd : {})}}>
                  {DAY_SHORT[di]}
                </div>
                <div style={S.slotRow}>
                  {SLOTS.map(slot => {
                    const k = `${day}|${slot}`;
                    const active = !!mySlots[k];
                    const isHot = hot(k);
                    const others = people.filter(n => n !== name && all[n]?.[k]).length;
                    return (
                      <button
                        key={k}
                        style={{
                          ...S.slotBtn,
                          ...(active ? S.slotActive : {}),
                          ...(isHot && !active ? S.slotHot : {}),
                        }}
                        onClick={() => toggle(day, slot)}
                      >
                        <span style={{...S.slotTop, color: active ? "#000" : isHot ? C.green : C.dim}}>
                          {slot.toUpperCase()}
                        </span>
                        <span style={{...S.slotTime, color: active ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.3)"}}>
                          {SLOT_SUB[slot]}
                        </span>
                        {others > 0 && (
                          <span style={{...S.slotOthers, color: active ? "rgba(0,0,0,0.5)" : C.green}}>
                            +{others}
                          </span>
                        )}
                        {isHot && !active && <span style={S.hotPip} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={S.actionBar}>
            <button style={S.btnGhost} onClick={clear}>Clear</button>
            <button style={S.btnAccent} onClick={save} disabled={saving}>
              {saving ? "..." : "SAVE"}
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTS SCREEN ── */}
      {screen === "results" && (
        <div style={S.wrap} className="up">
          <div style={S.topBar}>
            <div>
              <div style={S.dimLabel}>{people.length} RESPONDED</div>
              <h2 style={S.resultsH2}>The Damage.</h2>
            </div>
            <div style={S.topBtns}>
              <button style={S.btnGhost} onClick={() => { setMySlots(all[name] || {}); setScreen("grid"); }}>Edit</button>
              <button style={S.btnGhost} onClick={switchUser}>Switch</button>
            </div>
          </div>

          {/* WHO'S IN */}
          <div style={S.section}>
            <div style={S.sectionLabel}>WHO'S IN</div>
            <div style={S.avatarRowNamed}>
              {people.length === 0
                ? <span style={S.empty}>Nobody. Embarrassing.</span>
                : people.map(n => (
                    <div key={n} style={S.namedChip}>
                      <div style={{...S.av, background: avatarColor(n), width:28, height:28, fontSize:11}}>
                        {n[0].toUpperCase()}
                      </div>
                      <span style={S.chipName}>{n}</span>
                    </div>
                  ))
              }
            </div>
          </div>

          {people.length > 0 && (<>

            {/* HOT SLOTS */}
            {hots.length > 0 && (
              <div style={{...S.section, ...S.sectionGreen}}>
                <div style={{...S.sectionLabel, color: C.green}}>3+ FREE — DO THIS</div>
                <div style={S.hotGrid}>
                  {hots.map(k => {
                    const [day, slot] = k.split("|");
                    const n = count(k);
                    return (
                      <div key={k} style={S.hotTile}>
                        <div style={S.hotTileDay}>{day}</div>
                        <div style={S.hotTileSlot}>{slot}</div>
                        <div style={S.hotTileCount}>{n}/{people.length}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STATS */}
            <div style={S.statRow}>
              {[
                { n: people.length, l: "RESPONDED" },
                { n: hots.length, l: "HOT SLOTS" },
                { n: Math.round(Object.values(all).reduce((a,s)=>a+Object.keys(s).length,0)/people.length), l: "AVG FREE" },
              ].map(({n, l}) => (
                <div key={l} style={S.statBox}>
                  <div style={S.statNum}>{n}</div>
                  <div style={S.statLabel}>{l}</div>
                </div>
              ))}
            </div>

            {/* HEATMAP */}
            <div style={S.section}>
              <div style={S.sectionLabel}>AVAILABILITY MAP</div>
              <div style={S.hmWrap}>
                <div style={S.hmGrid}>
                  <div />
                  {SLOTS.map(s => (
                    <div key={s} style={S.hmHead}>
                      {s.slice(0,3).toUpperCase()}
                      <span style={S.hmHeadSub}>{SLOT_SUB[s]}</span>
                    </div>
                  ))}
                  {DAYS.map((day, di) => (<>
                    <div key={`d${day}`} style={{...S.hmDay, ...(di>=5?{color:"rgba(255,255,255,0.35)"}:{})}}>
                      {DAY_SHORT[di]}
                    </div>
                    {SLOTS.map(slot => {
                      const k = `${day}|${slot}`;
                      const n = count(k);
                      const pct = people.length > 0 ? n / people.length : 0;
                      const isHt = n >= FIRE_THRESHOLD;
                      return (
                        <div key={k} style={{
                          ...S.hmCell,
                          background: n === 0
                            ? "rgba(255,255,255,0.04)"
                            : isHt
                              ? `rgba(57,255,20,${0.15 + pct * 0.7})`
                              : `rgba(255,255,255,${0.06 + pct * 0.25})`,
                          border: isHt ? `1px solid rgba(57,255,20,0.4)` : "1px solid transparent",
                        }}>
                          {n > 0 && (
                            <span style={{fontSize:11, fontWeight:700, color: isHt ? C.green : "rgba(255,255,255,0.6)"}}>
                              {isHt ? "HOT" : n}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>))}
                </div>
              </div>
            </div>

            {/* INDIVIDUAL */}
            <div style={S.section}>
              <div style={S.sectionLabel}>INDIVIDUAL</div>
              <div style={S.indivList}>
                {people.map(n => {
                  const keys = Object.keys(all[n] || {});
                  return (
                    <div key={n} style={S.indivRow}>
                      <div style={{...S.av, background: avatarColor(n), width:28, height:28, fontSize:11, flexShrink:0}}>
                        {n[0].toUpperCase()}
                      </div>
                      <div style={S.indivRight}>
                        <div style={S.indivName}>{n}</div>
                        {keys.length === 0
                          ? <div style={S.indivNone}>Nothing. Useless.</div>
                          : <div style={S.tagWrap}>
                              {keys.map(k => {
                                const [day, slot] = k.split("|");
                                const isHt = hot(k);
                                return (
                                  <span key={k} style={{...S.tag, ...(isHt ? S.tagHot : {})}}>
                                    {DAY_SHORT[DAYS.indexOf(day)]} {slot.slice(0,3).toUpperCase()}{isHt ? " HOT" : ""}
                                  </span>
                                );
                              })}
                            </div>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </>)}
        </div>
      )}
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0a0a0a; font-family: 'Barlow', sans-serif; }
  .up { animation: up 0.3s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .toast { animation: tin 0.2s ease both; }
  @keyframes tin { from { opacity:0; transform:translateX(-50%) translateY(-4px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  button { font-family:'Barlow Condensed',sans-serif; cursor:pointer; transition:all 0.12s; }
  button:hover { opacity:0.8; }
  button:active { transform:scale(0.97); }
  input { font-family:'Barlow',sans-serif; }
  input::placeholder { color:rgba(255,255,255,0.2); }
  input:focus { outline:none; }
  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:#111; }
  ::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
`;

const C = {
  bg:     "#0a0a0a",
  card:   "#111111",
  border: "rgba(255,255,255,0.07)",
  green:  "#39FF14",
  white:  "#ffffff",
  dim:    "rgba(255,255,255,0.4)",
  faint:  "rgba(255,255,255,0.06)",
};

const S = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Barlow', sans-serif",
    color: C.white,
  },
  splash: {
    height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, letterSpacing: "0.15em", color: C.dim,
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  toast: {
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
    background: C.green, color: "#000", borderRadius: 3,
    padding: "8px 20px", fontSize: 12, fontWeight: 700,
    letterSpacing: "0.12em", zIndex: 999,
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  wrap: {
    maxWidth: 520, margin: "0 auto", padding: "32px 20px 80px",
  },
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3em",
    color: C.green, marginBottom: 60,
  },

  // NAME
  nameHero: { marginBottom: 48 },
  h1: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: "clamp(72px, 18vw, 110px)",
    fontWeight: 900, lineHeight: 0.92,
    letterSpacing: "-0.02em", color: C.white,
    marginBottom: 24,
  },
  sub: {
    fontSize: 15, color: C.dim, lineHeight: 1.6,
    fontWeight: 300, maxWidth: 340,
  },
  nameRow: { display: "flex", gap: 10, marginBottom: 48 },
  input: {
    flex: 1, background: C.faint,
    border: `1px solid ${C.border}`,
    borderRadius: 4, padding: "14px 16px",
    fontSize: 16, color: C.white, fontWeight: 400,
    transition: "border 0.2s",
  },
  btnAccent: {
    background: C.green, color: "#000",
    border: "none", borderRadius: 4,
    padding: "14px 28px", fontSize: 14,
    fontWeight: 800, letterSpacing: "0.1em",
  },
  btnGhost: {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 4, padding: "8px 16px",
    fontSize: 12, fontWeight: 600,
    color: C.dim, letterSpacing: "0.08em",
  },
  whoBox: { },
  dimLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
    color: C.dim, marginBottom: 12,
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  avatarRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  av: {
    width: 34, height: 34, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 800, color: "#000",
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  hotBadge: {
    display: "inline-block",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    color: C.green, border: `1px solid rgba(57,255,20,0.3)`,
    borderRadius: 3, padding: "4px 10px",
    fontFamily: "'Barlow Condensed', sans-serif",
  },

  // GRID
  topBar: {
    display: "flex", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 32,
  },
  screenName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 38, fontWeight: 900, letterSpacing: "-0.01em",
    color: C.white, lineHeight: 1,
  },
  screenSub: { fontSize: 13, color: C.dim, fontWeight: 300, marginTop: 4 },
  topBtns: { display: "flex", gap: 8, paddingTop: 4 },
  dayList: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 32 },
  dayBlock: { display: "flex", alignItems: "stretch", gap: 0 },
  dayHead: {
    width: 52, flexShrink: 0, display: "flex", alignItems: "center",
    fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.5)",
    fontFamily: "'Barlow Condensed', sans-serif",
    borderBottom: `1px solid ${C.border}`, paddingTop: 2, paddingBottom: 2,
  },
  dayHeadWknd: { color: C.green },
  slotRow: { flex: 1, display: "flex", gap: 2 },
  slotBtn: {
    flex: 1, padding: "10px 6px 8px",
    background: C.faint,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    display: "flex", flexDirection: "column", alignItems: "center",
    position: "relative",
    transition: "all 0.1s",
  },
  slotActive: {
    background: C.green,
    border: `1px solid ${C.green}`,
    boxShadow: `0 0 16px rgba(57,255,20,0.25)`,
  },
  slotHot: {
    border: `1px solid rgba(57,255,20,0.3)`,
    background: "rgba(57,255,20,0.05)",
  },
  slotTop: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", lineHeight: 1,
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  slotTime: { fontSize: 9, fontWeight: 300, marginTop: 2 },
  slotOthers: {
    fontSize: 9, fontWeight: 700, marginTop: 3,
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: "0.05em",
  },
  hotPip: {
    position: "absolute", top: 5, right: 5,
    width: 4, height: 4, borderRadius: "50%",
    background: C.green,
    boxShadow: `0 0 6px ${C.green}`,
  },
  actionBar: {
    display: "flex", gap: 10, justifyContent: "flex-end",
  },

  // RESULTS
  resultsH2: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: "clamp(42px, 10vw, 64px)",
    fontWeight: 900, color: C.white,
    letterSpacing: "-0.02em", lineHeight: 1,
  },
  section: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 6, padding: "18px 16px",
    marginBottom: 10,
  },
  sectionGreen: {
    border: `1px solid rgba(57,255,20,0.2)`,
    background: "rgba(57,255,20,0.04)",
  },
  sectionLabel: {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
    color: C.dim, marginBottom: 14,
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  avatarRowNamed: { display: "flex", flexWrap: "wrap", gap: 10 },
  namedChip: { display: "flex", alignItems: "center", gap: 7 },
  chipName: { fontSize: 14, fontWeight: 500, color: C.white },
  empty: { fontSize: 13, color: C.dim, fontStyle: "italic" },

  hotGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  hotTile: {
    background: "rgba(57,255,20,0.06)",
    border: `1px solid rgba(57,255,20,0.2)`,
    borderRadius: 5, padding: "12px 14px", minWidth: 110,
  },
  hotTileDay: { fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 2 },
  hotTileSlot: { fontSize: 12, color: C.dim, marginBottom: 8 },
  hotTileCount: {
    fontSize: 11, fontWeight: 800, color: C.green,
    letterSpacing: "0.06em",
    fontFamily: "'Barlow Condensed', sans-serif",
  },

  statRow: { display: "flex", gap: 8, marginBottom: 10 },
  statBox: {
    flex: 1, background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 6, padding: "16px 12px", textAlign: "center",
  },
  statNum: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 40, fontWeight: 900, color: C.white,
    lineHeight: 1, marginBottom: 4,
  },
  statLabel: {
    fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
    color: C.dim,
    fontFamily: "'Barlow Condensed', sans-serif",
  },

  hmWrap: { overflowX: "auto" },
  hmGrid: {
    display: "grid", gridTemplateColumns: "48px repeat(3,1fr)",
    gap: 3, minWidth: 260,
  },
  hmHead: {
    display: "flex", flexDirection: "column", alignItems: "center",
    fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
    color: C.dim, paddingBottom: 6,
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  hmHeadSub: { fontSize: 8, fontWeight: 300, letterSpacing: 0, color: "rgba(255,255,255,0.2)", marginTop: 2 },
  hmDay: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center",
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  hmCell: {
    height: 36, borderRadius: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.2s",
  },

  indivList: { display: "flex", flexDirection: "column", gap: 14 },
  indivRow: { display: "flex", alignItems: "flex-start", gap: 10 },
  indivRight: { flex: 1 },
  indivName: { fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 5 },
  indivNone: { fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 5 },
  tag: {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
    background: "rgba(255,255,255,0.06)", color: C.dim,
    borderRadius: 2, padding: "3px 7px",
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  tagHot: {
    background: "rgba(57,255,20,0.1)", color: C.green,
    border: `1px solid rgba(57,255,20,0.2)`,
  },
};
