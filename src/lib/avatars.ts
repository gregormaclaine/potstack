export interface AvatarDef {
  id: string;
  name: string;
  hand: string;
  svg: string;
}

export const DEFAULT_AVATAR_SVG = `<rect width="76" height="76" rx="38" fill="#18181b"/><circle cx="38" cy="30" r="12" fill="#3f3f46"/><path d="M11 72 Q12 50 38 44 Q64 50 65 72Z" fill="#3f3f46"/>`;

export const AVATARS: AvatarDef[] = [
  {
    id: "joker",
    name: "The Joker",
    hand: "Wildcard",
    svg: `<rect width="76" height="76" rx="38" fill="#1a0a00"/><path d="M24 28 Q18 15 30 13 Q34 21 38 25 Q42 21 46 13 Q58 15 52 28" fill="#dc2626" stroke="#991b1b" stroke-width="1"/><circle cx="24" cy="28" r="4" fill="#fbbf24" stroke="#d97706" stroke-width="1"/><circle cx="52" cy="28" r="4" fill="#fbbf24" stroke="#d97706" stroke-width="1"/><circle cx="38" cy="48" r="16" fill="#fde8c8"/><path d="M26 50 Q38 62 50 50" stroke="#1a0a00" stroke-width="2" fill="#ef4444" opacity="0.9"/><circle cx="31" cy="44" r="4" fill="#fff"/><circle cx="31" cy="44" r="2.5" fill="#dc2626"/><circle cx="30" cy="43" r="1" fill="#fff"/><circle cx="45" cy="44" r="4" fill="#fff"/><circle cx="45" cy="45" r="2.5" fill="#1a0a00"/><circle cx="44" cy="43" r="1" fill="#fff"/><ellipse cx="26" cy="50" rx="4" ry="2.5" fill="#f87171" opacity="0.3"/><ellipse cx="50" cy="50" rx="4" ry="2.5" fill="#f87171" opacity="0.3"/>`,
  },
  {
    id: "cowboy",
    name: "Cowboys",
    hand: "K K",
    svg: `<rect width="76" height="76" rx="38" fill="#1c0d00"/><circle cx="38" cy="46" r="18" fill="#e8a870"/><path d="M22 62 Q38 56 54 62 Q47 68 38 68 Q29 68 22 62Z" fill="#c0392b"/><circle cx="38" cy="62" r="2.8" fill="#922b21"/><ellipse cx="31" cy="46" rx="3" ry="2.2" fill="#1c0d00"/><ellipse cx="45" cy="46" rx="3" ry="2.2" fill="#1c0d00"/><circle cx="30" cy="45" r="0.9" fill="#fff" opacity="0.5"/><circle cx="44" cy="45" r="0.9" fill="#fff" opacity="0.5"/><path d="M26 54 Q29 50 33 52 Q38 54 38 54 Q38 54 43 52 Q47 50 50 54" stroke="#2d1200" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M26 54 Q24 58 28 56" stroke="#2d1200" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M50 54 Q52 58 48 56" stroke="#2d1200" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M22 34 Q21 12 38 10 Q55 12 54 34 Q46 30 38 30 Q30 30 22 34Z" fill="#7c2d12"/><path d="M29 13 Q34 20 38 16 Q42 20 47 13" stroke="#5a1a00" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M22 34 Q38 39 54 34 Q38 37 22 34Z" fill="#3d1000"/><rect x="35" y="33" width="6" height="3" rx="1" fill="#d97706"/><path d="M2 39 Q16 33 22 34 Q38 39 54 34 Q60 33 74 39 Q66 47 56 42 Q38 46 20 42 Q10 47 2 39Z" fill="#8b2c00"/><path d="M5 40 Q18 37 38 40 Q58 37 71 40 Q60 44 38 43 Q16 44 5 40Z" fill="#5a1a00" opacity="0.5"/><rect x="0" y="0" width="76" height="38" fill="#1c0d00"/><path d="M22 34 Q21 12 38 10 Q55 12 54 34 Q46 30 38 30 Q30 30 22 34Z" fill="#7c2d12"/><path d="M29 13 Q34 20 38 16 Q42 20 47 13" stroke="#5a1a00" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M22 34 Q38 39 54 34 Q38 37 22 34Z" fill="#3d1000"/><rect x="35" y="33" width="6" height="3" rx="1" fill="#d97706"/><path d="M2 39 Q16 33 22 34 Q38 39 54 34 Q60 33 74 39 Q66 47 56 42 Q38 46 20 42 Q10 47 2 39Z" fill="#8b2c00"/><path d="M5 40 Q18 37 38 40 Q58 37 71 40 Q60 44 38 43 Q16 44 5 40Z" fill="#5a1a00" opacity="0.5"/>`,
  },
  {
    id: "shark",
    name: "The Shark",
    hand: "Highly Skilled",
    svg: `<rect width="76" height="76" rx="38" fill="#0f2744"/><path d="M38 14 L52 42 L24 42Z" fill="#38bdf8"/><ellipse cx="38" cy="52" rx="22" ry="13" fill="#38bdf8" opacity="0.85"/><ellipse cx="38" cy="54" rx="15" ry="8" fill="#e0f2fe" opacity="0.35"/><circle cx="47" cy="46" r="3.5" fill="#0f2744"/><circle cx="48" cy="45" r="1.2" fill="#fff" opacity="0.6"/><path d="M24 55 Q38 62 52 55" stroke="#0f2744" stroke-width="1.5" fill="none" opacity="0.5"/><line x1="30" y1="57" x2="30" y2="60" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="35" y1="58" x2="35" y2="61" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="40" y1="58" x2="40" y2="61" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="45" y1="57" x2="45" y2="60" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>`,
  },
  {
    id: "highroller",
    name: "High Roller",
    hand: "High Stakes",
    svg: `<rect width="76" height="76" rx="38" fill="#0f0a00"/><circle cx="32" cy="50" r="16" fill="#f5deb3"/><path d="M16 38 Q16 18 32 16 Q48 18 48 38 Q42 34 32 34 Q22 34 16 38Z" fill="#111"/><path d="M16 38 Q32 43 48 38 Q32 41 16 38Z" fill="#d97706" opacity="0.8"/><ellipse cx="32" cy="39" rx="19" ry="4" fill="#1a1a1a"/><circle cx="39" cy="50" r="7" fill="none" stroke="#d97706" stroke-width="2"/><path d="M46 46 Q50 43 52 40" stroke="#d97706" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="25" cy="48" rx="2.5" ry="2" fill="#1a0a00"/><ellipse cx="39" cy="50" rx="2" ry="1.8" fill="#1a0a00"/><path d="M22 44 Q26 41 30 43" stroke="#8a6a30" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M24 57 Q28 53 32 56 Q36 53 40 57" stroke="#2a1a00" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M24 57 Q22 61 25 59" stroke="#2a1a00" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M40 57 Q42 61 39 59" stroke="#2a1a00" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="60" cy="58" r="7" fill="#d97706" stroke="#f59e0b" stroke-width="1.2"/><circle cx="60" cy="51" r="7" fill="#c8860a" stroke="#f59e0b" stroke-width="1.2"/><circle cx="60" cy="44" r="7" fill="#d97706" stroke="#f59e0b" stroke-width="1.2"/><circle cx="60" cy="44" r="4" fill="#92400e" opacity="0.5"/><rect x="9" y="61" width="30" height="6" rx="3" fill="#000" opacity="0.2" transform="rotate(-10,24,64)"/><rect x="8" y="59" width="30" height="6" rx="3" fill="#b8761a" transform="rotate(-10,23,62)"/><rect x="8" y="59" width="30" height="2" rx="1" fill="#d4a040" opacity="0.7" transform="rotate(-10,23,62)"/><rect x="28" y="59" width="5" height="6" rx="1" fill="#8b1a00" transform="rotate(-10,30,62)"/><rect x="28" y="59" width="5" height="2" rx="1" fill="#fbbf24" opacity="0.6" transform="rotate(-10,30,62)"/><rect x="8" y="59" width="8" height="6" rx="3" fill="#9ca3af" transform="rotate(-10,12,62)"/><rect x="8" y="59" width="4" height="6" rx="3" fill="#6b7280" transform="rotate(-10,10,62)"/><circle cx="11" cy="63" r="3.5" fill="#f97316" opacity="0.8"/><circle cx="11" cy="63" r="2" fill="#fbbf24" opacity="0.9"/><path d="M9 58 Q6 51 9 44 Q12 38 9 32" stroke="#e5e7eb" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.75"/><path d="M13 57 Q10 50 13 43 Q16 37 13 32" stroke="#e5e7eb" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/><path d="M17 56 Q14 50 17 44" stroke="#e5e7eb" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.35"/>`,
  },
  {
    id: "grinder",
    name: "The Grinder",
    hand: "Tight and steady",
    svg: `<rect width="76" height="76" rx="38" fill="#0a0a14"/><path d="M8 76 Q10 56 38 50 Q66 56 68 76Z" fill="#222"/><line x1="34" y1="52" x2="32" y2="62" stroke="#444" stroke-width="1.5" stroke-linecap="round"/><line x1="42" y1="52" x2="44" y2="62" stroke="#444" stroke-width="1.5" stroke-linecap="round"/><circle cx="38" cy="44" r="18" fill="#c8956a"/><path d="M20 36 Q20 18 38 16 Q56 18 56 36 Q50 28 38 28 Q26 28 20 36Z" fill="#5c3010"/><path d="M20 36 Q38 40 56 36 Q50 34 38 34 Q26 34 20 36Z" fill="#4a2008"/><ellipse cx="38" cy="56" rx="14" ry="6" fill="#a06840" opacity="0.35"/><path d="M22 38 Q28 33 34 37" stroke="#2d1000" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M42 37 Q48 33 54 38" stroke="#2d1000" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="43" rx="5" ry="4" fill="#fff"/><circle cx="30" cy="43" r="2.8" fill="#3d1a00"/><circle cx="29" cy="42" r="1" fill="#fff" opacity="0.6"/><ellipse cx="46" cy="43" rx="5" ry="4" fill="#fff"/><circle cx="46" cy="43" r="2.8" fill="#3d1a00"/><circle cx="45" cy="42" r="1" fill="#fff" opacity="0.6"/><line x1="32" y1="52" x2="44" y2="52" stroke="#8a5030" stroke-width="2" stroke-linecap="round"/><path d="M20 38 Q20 22 38 20 Q56 22 56 38" stroke="#222" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="20" cy="40" r="7" fill="#333"/><circle cx="56" cy="40" r="7" fill="#333"/><circle cx="20" cy="40" r="4" fill="#444"/><circle cx="56" cy="40" r="4" fill="#444"/><rect x="52" y="54" width="12" height="14" rx="3" fill="#e8d5b0" stroke="#c8a870" stroke-width="1"/><rect x="52" y="54" width="12" height="5" rx="2" fill="#8b4513" opacity="0.9"/><path d="M64 58 Q68 58 68 62 Q68 66 64 66" stroke="#c8a870" stroke-width="1.5" fill="none"/><path d="M56 53 Q53 47 56 42 Q59 37 56 32" stroke="#e5e7eb" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M60 53 Q57 46 60 40 Q63 35 60 30" stroke="#e5e7eb" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M64 54 Q61 48 64 43 Q67 38 64 34" stroke="#e5e7eb" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>`,
  },
  {
    id: "tilted",
    name: "On Tilt",
    hand: "After a bad beat",
    svg: `<rect width="76" height="76" rx="38" fill="#1a0000"/><path d="M20 40 Q20 20 38 18 Q56 20 56 40 Q48 32 38 32 Q28 32 20 40Z" fill="#2d1a00"/><path d="M20 40 Q38 44 56 40 Q48 38 38 38 Q28 38 20 40Z" fill="#1e1000"/><circle cx="38" cy="52" r="18" fill="#d95040"/><path d="M34 43 Q36 40 38 43 Q40 40 42 43" stroke="#a02020" stroke-width="1.5" fill="none" opacity="0.7"/><path d="M20 45 Q25 36 34 42" stroke="#1a0000" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M42 42 Q51 36 56 45" stroke="#1a0000" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M20 46 Q25 38 34 43" stroke="#0a0000" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/><path d="M42 43 Q51 38 56 46" stroke="#0a0000" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/><circle cx="29" cy="49" r="6" fill="#fff"/><circle cx="29" cy="49" r="3.5" fill="#1a0000"/><circle cx="28" cy="48" r="1.2" fill="#fff" opacity="0.5"/><circle cx="47" cy="49" r="6" fill="#fff"/><circle cx="47" cy="49" r="3.5" fill="#1a0000"/><circle cx="46" cy="48" r="1.2" fill="#fff" opacity="0.5"/><path d="M26 61 Q38 56 50 61" stroke="#7a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="21" cy="55" rx="5" ry="3.5" fill="#ef4444" opacity="0.3"/><ellipse cx="55" cy="55" rx="5" ry="3.5" fill="#ef4444" opacity="0.3"/><circle cx="10" cy="38" r="5" fill="#e5e7eb" opacity="0.5"/><circle cx="14" cy="32" r="4" fill="#e5e7eb" opacity="0.4"/><circle cx="10" cy="26" r="3.5" fill="#e5e7eb" opacity="0.3"/><circle cx="66" cy="38" r="5" fill="#e5e7eb" opacity="0.5"/><circle cx="62" cy="32" r="4" fill="#e5e7eb" opacity="0.4"/><circle cx="66" cy="26" r="3.5" fill="#e5e7eb" opacity="0.3"/>`,
  },
  {
    id: "slowroller",
    name: "Slow Roller",
    hand: "Pure evil",
    svg: `<rect width="76" height="76" rx="38" fill="#0a0014"/><path d="M20 36 Q20 18 38 16 Q56 18 56 36 Q48 28 38 28 Q28 28 20 36Z" fill="#1a1a1a"/><path d="M20 36 Q38 40 56 36 Q48 34 38 34 Q28 34 20 36Z" fill="#111"/><circle cx="38" cy="50" r="19" fill="#e8be88"/><path d="M22 42 Q29 35 35 40" stroke="#1a0a00" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M41 40 Q47 38 54 41" stroke="#1a0a00" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="29" cy="46" rx="5" ry="2" fill="#1a0a00"/><ellipse cx="29" cy="46" rx="3" ry="1" fill="#3d1a00"/><circle cx="47" cy="46" r="5.5" fill="#fff" stroke="#c8a060" stroke-width="0.5"/><circle cx="47" cy="46" r="3.5" fill="#1a0a00"/><circle cx="45.5" cy="44.5" r="1.2" fill="#fff" opacity="0.7"/><path d="M35 53 Q38 57 41 53" stroke="#b07840" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M26 60 Q33 58 38 60 Q45 63 50 59 Q52 56 51 54" stroke="#8a5020" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="10" y="50" width="16" height="21" rx="2" fill="#fff" stroke="#ddd" stroke-width="1" transform="rotate(-5,18,60)"/><text x="13" y="63" font-family="Georgia,serif" font-size="11" fill="#e00" font-weight="bold" transform="rotate(-5,18,60)">A&#9829;</text>`,
  },
  {
    id: "bluffer",
    name: "The Bluffer",
    hand: "Anything",
    svg: `<rect width="76" height="76" rx="38" fill="#071a0e"/><circle cx="44" cy="46" r="17" fill="#d4a574"/><path d="M33 39 Q38 36 42 38" stroke="#7a5030" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M46 38 Q50 36 55 39" stroke="#7a5030" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="27" y="41" width="14" height="9" rx="4" fill="#0a0a0a"/><rect x="45" y="41" width="14" height="9" rx="4" fill="#0a0a0a"/><line x1="41" y1="45" x2="45" y2="45" stroke="#0a0a0a" stroke-width="2.5"/><line x1="27" y1="45" x2="22" y2="43" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round"/><line x1="59" y1="45" x2="64" y2="43" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round"/><path d="M38 55 Q44 59 51 55" stroke="#a07048" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="4" y="30" width="15" height="21" rx="3" fill="#fff" stroke="#ccc" stroke-width="0.8" transform="rotate(-22,11,40)"/><text x="7" y="42" font-family="Georgia,serif" font-size="9" fill="#111" font-weight="bold" transform="rotate(-22,11,40)">K&#9824;</text><rect x="14" y="26" width="15" height="21" rx="3" fill="#fff" stroke="#ccc" stroke-width="0.8" transform="rotate(-6,21,36)"/><text x="16" y="38" font-family="Georgia,serif" font-size="9" fill="#e00" font-weight="bold" transform="rotate(-6,21,36)">2&#9829;</text>`,
  },
  {
    id: "queen",
    name: "The Ladies",
    hand: "Q Q",
    svg: `<rect width="76" height="76" rx="38" fill="#1a0a2e"/><circle cx="38" cy="50" r="18" fill="#fce7f3"/><path d="M20 42 Q20 20 38 18 Q56 20 56 42 Q50 30 38 30 Q26 30 20 42Z" fill="#5c2e00"/><path d="M20 42 Q16 52 18 62" stroke="#5c2e00" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M56 42 Q60 52 58 62" stroke="#5c2e00" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M21 38 Q38 31 55 38 Q38 34 21 38Z" fill="#7c3aed"/><path d="M21 38 Q24 26 28 20 L33 30 Q36 22 38 14 Q40 22 43 30 L48 20 Q52 26 55 38 Q38 34 21 38Z" fill="#a855f7"/><circle cx="38" cy="15" r="4" fill="#f0abfc"/><circle cx="27" cy="22" r="3" fill="#e879f9"/><circle cx="49" cy="22" r="3" fill="#e879f9"/><line x1="38" y1="11" x2="38" y2="9" stroke="#f0abfc" stroke-width="1.5" stroke-linecap="round"/><line x1="35" y1="12" x2="34" y2="10" stroke="#f0abfc" stroke-width="1.5" stroke-linecap="round"/><line x1="41" y1="12" x2="42" y2="10" stroke="#f0abfc" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="30" cy="48" rx="5" ry="4" fill="#fff"/><circle cx="30" cy="48" r="2.8" fill="#5c2e00"/><circle cx="29" cy="47" r="1" fill="#fff" opacity="0.7"/><ellipse cx="46" cy="48" rx="5" ry="4" fill="#fff"/><circle cx="46" cy="48" r="2.8" fill="#5c2e00"/><circle cx="45" cy="47" r="1" fill="#fff" opacity="0.7"/><line x1="26" y1="44" x2="24" y2="41" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="28" y1="43" x2="27" y2="40" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="30" y1="43" x2="30" y2="40" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="32" y1="43" x2="33" y2="40" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="42" y1="43" x2="41" y2="40" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="44" y1="43" x2="44" y2="40" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="46" y1="43" x2="47" y2="40" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="48" y1="44" x2="50" y2="41" stroke="#1a0a2e" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="22" cy="54" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/><ellipse cx="54" cy="54" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/><path d="M31 57 Q38 62 45 57" stroke="#c07858" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "dealer",
    name: "The Dealer",
    hand: "House always wins",
    svg: `<rect width="76" height="76" rx="38" fill="#0a1a0a"/><path d="M10 76 Q10 56 38 50 Q66 56 66 76Z" fill="#111"/><path d="M28 52 L38 62 L48 52 L44 56 L38 58 L32 56 Z" fill="#fff"/><path d="M32 55 Q35 52 38 55 Q35 58 32 55Z" fill="#111"/><path d="M38 55 Q41 52 44 55 Q41 58 38 55Z" fill="#111"/><circle cx="38" cy="55" r="2" fill="#222"/><circle cx="38" cy="36" r="17" fill="#e8c080"/><path d="M21 30 Q21 18 38 16 Q55 18 55 30 Q48 24 38 24 Q28 24 21 30Z" fill="#2d1a00"/><path d="M21 30 Q38 34 55 30 Q48 28 38 28 Q28 28 21 30Z" fill="#1e1000"/><circle cx="31" cy="35" r="5" fill="#fff"/><circle cx="31" cy="35" r="3" fill="#1e3a5f"/><circle cx="30" cy="34" r="1.2" fill="#fff" opacity="0.8"/><circle cx="45" cy="35" r="5" fill="#fff"/><circle cx="45" cy="35" r="3" fill="#1e3a5f"/><circle cx="44" cy="34" r="1.2" fill="#fff" opacity="0.8"/><path d="M32 42 Q38 46 44 42" stroke="#b09060" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M24 34 Q24 20 38 19 Q52 20 52 34" stroke="#111" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="24" cy="35" r="5" fill="#111"/><circle cx="52" cy="35" r="5" fill="#111"/><path d="M24 40 Q22 46 26 49" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="26" cy="50" r="3" fill="#111"/><ellipse cx="38" cy="68" rx="24" ry="7" fill="#111"/>`,
  },
  {
    id: "bot",
    name: "The Bot",
    hand: "GTO optimal",
    svg: `<rect width="76" height="76" rx="38" fill="#0f172a"/><line x1="38" y1="10" x2="38" y2="20" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/><circle cx="38" cy="8" r="4" fill="#3b82f6"/><circle cx="38" cy="8" r="2" fill="#93c5fd"/><rect x="16" y="20" width="44" height="36" rx="9" fill="#1e293b" stroke="#334155" stroke-width="1.5"/><rect x="21" y="28" width="13" height="10" rx="3" fill="#0f172a"/><rect x="42" y="28" width="13" height="10" rx="3" fill="#0f172a"/><rect x="22" y="29" width="11" height="8" rx="2" fill="#3b82f6" opacity="0.9"/><rect x="43" y="29" width="11" height="8" rx="2" fill="#3b82f6" opacity="0.9"/><circle cx="27" cy="33" r="2.5" fill="#93c5fd"/><circle cx="48" cy="33" r="2.5" fill="#93c5fd"/><rect x="21" y="43" width="34" height="7" rx="3" fill="#0f172a"/><rect x="22" y="44" width="22" height="5" rx="2" fill="#22c55e" opacity="0.9"/><rect x="30" y="56" width="16" height="9" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>`,
  },
  {
    id: "nit",
    name: "The Nit",
    hand: "Ultra Conservative",
    svg: `<rect width="76" height="76" rx="38" fill="#05080f"/><circle cx="38" cy="50" r="18" fill="#d4c8b0"/><path d="M20 40 Q20 22 38 20 Q56 22 56 40 Q48 33 38 33 Q28 33 20 40Z" fill="#374151"/><path d="M20 40 Q38 44 56 40 Q38 43 20 40Z" fill="#1f2937"/><path d="M20 40 Q13 39 11 44 Q15 45 20 41Z" fill="#374151"/><path d="M24 43 Q30 38 35 42" stroke="#2d1a00" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M41 42 Q46 38 52 43" stroke="#2d1a00" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="48" rx="5.5" ry="4" fill="#fff"/><circle cx="33" cy="48" r="2.8" fill="#2d1a00"/><circle cx="32" cy="47" r="1.1" fill="#fff" opacity="0.7"/><ellipse cx="46" cy="48" rx="5.5" ry="4" fill="#fff"/><circle cx="49" cy="48" r="2.8" fill="#2d1a00"/><circle cx="48" cy="47" r="1.1" fill="#fff" opacity="0.7"/><path d="M31 57 Q38 55 45 57" stroke="#8a7050" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M52 38 Q54 33 56 38 Q56 43 54 44 Q52 43 52 38Z" fill="#93c5fd" opacity="0.9"/><rect x="6" y="56" width="13" height="16" rx="2" fill="#1e40af" stroke="#3b82f6" stroke-width="1" transform="rotate(-20,12,64)"/><rect x="8" y="58" width="9" height="12" rx="1" fill="#1d4ed8" stroke="#60a5fa" stroke-width="0.5" transform="rotate(-20,12,64)"/><rect x="14" y="54" width="13" height="16" rx="2" fill="#1e40af" stroke="#3b82f6" stroke-width="1" transform="rotate(-8,20,62)"/><rect x="16" y="56" width="9" height="12" rx="1" fill="#1d4ed8" stroke="#60a5fa" stroke-width="0.5" transform="rotate(-8,20,62)"/><path d="M8 70 Q16 66 24 68" stroke="#c8956a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M10 72 Q18 68 26 70" stroke="#c8956a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "callingstation",
    name: "Calling Station",
    hand: "Never folds",
    svg: `<rect width="76" height="76" rx="38" fill="#0a1a0a"/><circle cx="38" cy="48" r="18" fill="#f5d5a0"/><path d="M20 38 Q20 22 38 20 Q56 22 56 38 Q48 32 38 32 Q28 32 20 38Z" fill="#5c3d1e"/><path d="M20 38 Q38 42 56 38 Q38 40 20 38Z" fill="#4a2f14"/><circle cx="30" cy="46" r="5.5" fill="#fff"/><circle cx="30" cy="46" r="3.5" fill="#1e3a5f"/><circle cx="29" cy="45" r="1.2" fill="#fff" opacity="0.8"/><circle cx="46" cy="46" r="5.5" fill="#fff"/><circle cx="46" cy="46" r="3.5" fill="#1e3a5f"/><circle cx="45" cy="45" r="1.2" fill="#fff" opacity="0.8"/><path d="M28 56 Q38 64 48 56" stroke="#c08050" stroke-width="2" fill="#e8a070" stroke-linecap="round"/><rect x="52" y="38" width="10" height="18" rx="4" fill="#1a1a1a"/><rect x="53" y="40" width="8" height="5" rx="2" fill="#374151"/><rect x="53" y="50" width="8" height="4" rx="2" fill="#374151"/><circle cx="57" cy="47" r="1.5" fill="#4b5563"/>`,
  },
  {
    id: "rookie",
    name: "The Rookie",
    hand: "Still learning",
    svg: `<rect width="76" height="76" rx="38" fill="#0c1a2e"/><circle cx="40" cy="48" r="17" fill="#fcd5a8"/><path d="M23 36 Q23 18 40 16 Q57 18 57 36 Q48 31 40 31 Q32 31 23 36Z" fill="#1d4ed8"/><path d="M23 36 Q40 41 57 36 Q40 40 23 36Z" fill="#1e40af"/><path d="M57 36 Q66 33 65 40 Q61 41 57 37Z" fill="#1d4ed8"/><circle cx="31" cy="47" r="6.5" fill="#fff"/><circle cx="31" cy="47" r="4" fill="#1e3a5f"/><circle cx="30" cy="46" r="1.5" fill="#fff" opacity="0.8"/><circle cx="49" cy="47" r="6.5" fill="#fff"/><circle cx="49" cy="47" r="4" fill="#1e3a5f"/><circle cx="48" cy="46" r="1.5" fill="#fff" opacity="0.8"/><ellipse cx="40" cy="57" rx="4" ry="3.5" fill="#c2856a"/><path d="M59 28 Q61 24 63 28 Q63 33 61 34 Q59 33 59 28Z" fill="#93c5fd" opacity="0.8"/><rect x="4" y="30" width="14" height="20" rx="3" fill="#fff" stroke="#ccc" stroke-width="0.8" transform="rotate(-22,11,40)"/><text x="7" y="42" font-family="Georgia,serif" font-size="9" fill="#111" font-weight="bold" transform="rotate(-22,11,40)">2&#9827;</text><rect x="14" y="26" width="14" height="20" rx="3" fill="#fff" stroke="#ccc" stroke-width="0.8" transform="rotate(-6,21,36)"/><text x="16" y="38" font-family="Georgia,serif" font-size="9" fill="#e00" font-weight="bold" transform="rotate(-6,21,36)">7&#9829;</text>`,
  },
  {
    id: "whale",
    name: "The Whale",
    hand: "Rich & Reckless",
    svg: `<rect width="76" height="76" rx="38" fill="#001a3a"/><path d="M0 60 Q10 56 20 60 Q30 64 40 60 Q50 56 60 60 Q70 64 76 60 L76 76 L0 76Z" fill="#0369a1" opacity="0.4"/><path d="M12 48 Q10 36 24 30 Q38 24 50 32 Q58 38 56 48 Q52 56 40 58 Q26 60 18 53 Q12 50 12 48Z" fill="#2563eb"/><ellipse cx="36" cy="50" rx="16" ry="9" fill="#60a5fa" opacity="0.35"/><path d="M54 44 Q64 34 66 42 Q64 48 58 46Z" fill="#1d4ed8"/><path d="M54 50 Q66 52 66 58 Q62 56 58 52Z" fill="#1d4ed8"/><circle cx="22" cy="40" r="5.5" fill="#fff"/><circle cx="22" cy="40" r="3.5" fill="#1e3a8a"/><circle cx="20.5" cy="38.5" r="1.4" fill="#fff" opacity="0.8"/><path d="M14 48 Q20 54 28 51" stroke="#1e3a8a" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="26" rx="3" ry="2" fill="#1e3a8a"/><circle cx="30" cy="20" r="4" fill="#f59e0b" stroke="#d97706" stroke-width="1"/><circle cx="30" cy="20" r="2.5" fill="#fbbf24" opacity="0.8"/><circle cx="34" cy="14" r="3.5" fill="#f59e0b" stroke="#d97706" stroke-width="1"/><circle cx="34" cy="14" r="2" fill="#fbbf24" opacity="0.8"/><circle cx="28" cy="10" r="3" fill="#f59e0b" stroke="#d97706" stroke-width="1"/><circle cx="28" cy="10" r="1.8" fill="#fbbf24" opacity="0.8"/><circle cx="36" cy="7" r="2.5" fill="#f59e0b" stroke="#d97706" stroke-width="1"/><circle cx="36" cy="7" r="1.4" fill="#fbbf24" opacity="0.8"/>`,
  },
  {
    id: "rocket",
    name: "Rockets",
    hand: "A A",
    svg: `<rect width="76" height="76" rx="38" fill="#0d0d1a"/><path d="M38 8 Q31 22 29 46 L47 46 Q45 22 38 8Z" fill="#e2e8f0"/><path d="M38 8 Q44 16 47 28 L29 28 Q32 16 38 8Z" fill="#3b82f6"/><circle cx="38" cy="36" r="5.5" fill="#bfdbfe" stroke="#93c5fd" stroke-width="1.5"/><path d="M29 46 L20 58 L29 54Z" fill="#94a3b8"/><path d="M47 46 L56 58 L47 54Z" fill="#94a3b8"/><path d="M31 54 Q38 72 45 54" fill="#f97316" opacity="0.85"/><path d="M33 54 Q38 66 43 54" fill="#fcd34d" opacity="0.9"/>`,
  },
  {
    id: "bigslick",
    name: "Big Slick",
    hand: "A K suited",
    svg: `<rect width="76" height="76" rx="38" fill="#0a0a14"/><rect x="12" y="16" width="34" height="48" rx="6" fill="#0f172a" stroke="#1e3a5f" stroke-width="1.5" transform="rotate(-9,29,40)"/><text x="17" y="34" font-family="Georgia,serif" font-size="20" fill="#f8fafc" font-weight="bold" transform="rotate(-9,29,40)">A</text><text x="20" y="50" font-family="Georgia,serif" font-size="15" fill="#3b82f6" transform="rotate(-9,29,40)">&#9824;</text><rect x="30" y="14" width="34" height="48" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5" transform="rotate(7,47,38)"/><text x="35" y="32" font-family="Georgia,serif" font-size="20" fill="#f8fafc" font-weight="bold" transform="rotate(7,47,38)">K</text><text x="38" y="48" font-family="Georgia,serif" font-size="15" fill="#3b82f6" transform="rotate(7,47,38)">&#9824;</text>`,
  },
  {
    id: "ghost",
    name: "Dead Man's Hand",
    hand: "A 8 A 8",
    svg: `<rect width="76" height="76" rx="38" fill="#111"/><path d="M16 58 Q16 28 38 26 Q60 28 60 58 L60 68 Q55 63 50 68 Q46 63 38 68 Q30 63 26 68 Q21 63 16 68Z" fill="#d1d5db" opacity="0.92"/><ellipse cx="30" cy="46" rx="5" ry="5.5" fill="#111"/><ellipse cx="46" cy="46" rx="5" ry="5.5" fill="#111"/><line x1="32" y1="57" x2="44" y2="57" stroke="#111" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: "fishhook",
    name: "Fish Hooks",
    hand: "J J",
    svg: `<rect width="76" height="76" rx="38" fill="#001a2e"/><path d="M38 12 Q38 48 45 56 Q54 67 44 70 Q34 73 32 64" stroke="#94a3b8" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="38" cy="12" r="5.5" fill="none" stroke="#94a3b8" stroke-width="3"/><ellipse cx="30" cy="64" rx="8" ry="5.5" fill="#22d3ee" opacity="0.85"/><path d="M38 64 L44 59 L44 69Z" fill="#0891b2"/><circle cx="27" cy="62" r="1.5" fill="#fff" opacity="0.7"/>`,
  },
  {
    id: "snowman",
    name: "Snowmen",
    hand: "8 8",
    svg: `<rect width="76" height="76" rx="38" fill="#0c1a2e"/><circle cx="38" cy="56" r="14" fill="#e2e8f0"/><circle cx="38" cy="34" r="12" fill="#f1f5f9"/><path d="M26 24 Q26 13 38 12 Q50 13 50 24 Q44 22 38 22 Q32 22 26 24Z" fill="#1e293b"/><ellipse cx="38" cy="24" rx="15" ry="3.5" fill="#334155"/><rect x="35" y="22" width="6" height="3" rx="1" fill="#ef4444"/><circle cx="33" cy="32" r="2" fill="#1e293b"/><circle cx="43" cy="32" r="2" fill="#1e293b"/><circle cx="33" cy="38" r="1.2" fill="#1e293b"/><circle cx="38" cy="40" r="1.2" fill="#1e293b"/><circle cx="43" cy="38" r="1.2" fill="#1e293b"/><rect x="26" y="43" width="24" height="4" rx="2" fill="#ef4444"/><circle cx="38" cy="50" r="1.8" fill="#1e293b"/><circle cx="38" cy="57" r="1.8" fill="#1e293b"/><circle cx="38" cy="64" r="1.8" fill="#1e293b"/>`,
  },
  {
    id: "sailboats",
    name: "Sailboats",
    hand: "4 4",
    svg: `<rect width="76" height="76" rx="38" fill="#061a2e"/><ellipse cx="38" cy="62" rx="28" ry="8" fill="#0369a1" opacity="0.5"/><path d="M10 62 Q24 58 38 62 Q52 58 66 62" stroke="#38bdf8" stroke-width="1.5" fill="none" opacity="0.6"/><path d="M14 58 Q22 62 30 58 L28 54 L16 54Z" fill="#b45309"/><path d="M22 54 L22 24 L30 54Z" fill="#f1f5f9"/><line x1="22" y1="54" x2="22" y2="20" stroke="#92400e" stroke-width="1.5"/><path d="M46 58 Q54 62 62 58 L60 54 L48 54Z" fill="#b45309"/><path d="M54 54 L54 24 L62 54Z" fill="#f1f5f9"/><line x1="54" y1="54" x2="54" y2="20" stroke="#92400e" stroke-width="1.5"/><circle cx="38" cy="14" r="5" fill="#fbbf24" opacity="0.8"/>`,
  },
  {
    id: "tnt",
    name: "TNT",
    hand: "T T",
    svg: `<rect width="76" height="76" rx="38" fill="#0d0500"/><rect x="18" y="30" width="13" height="30" rx="6.5" fill="#c83010"/><ellipse cx="24" cy="30" rx="6.5" ry="3.5" fill="#e84020"/><ellipse cx="24" cy="30" rx="4" ry="2.2" fill="#f09040"/><ellipse cx="24" cy="60" rx="6.5" ry="3.5" fill="#9a2810"/><rect x="20" y="33" width="3" height="24" rx="1.5" fill="#ef5535" opacity="0.3"/><rect x="45" y="30" width="13" height="30" rx="6.5" fill="#c83010"/><ellipse cx="52" cy="30" rx="6.5" ry="3.5" fill="#e84020"/><ellipse cx="52" cy="30" rx="4" ry="2.2" fill="#f09040"/><ellipse cx="52" cy="60" rx="6.5" ry="3.5" fill="#9a2810"/><rect x="47" y="33" width="3" height="24" rx="1.5" fill="#ef5535" opacity="0.3"/><rect x="31" y="33" width="14" height="30" rx="7" fill="#dc3c1e"/><ellipse cx="38" cy="33" rx="7" ry="4" fill="#f04c2c"/><ellipse cx="38" cy="33" rx="4.5" ry="2.5" fill="#f4a050"/><ellipse cx="38" cy="63" rx="7" ry="4" fill="#b03018"/><rect x="33" y="36" width="3" height="24" rx="1.5" fill="#ef5535" opacity="0.3"/><rect x="16" y="40" width="44" height="6" rx="3" fill="#3d3d54"/><rect x="16" y="41" width="44" height="2.5" rx="1.5" fill="#686884" opacity="0.8"/><rect x="16" y="52" width="44" height="6" rx="3" fill="#3d3d54"/><rect x="16" y="53" width="44" height="2.5" rx="1.5" fill="#686884" opacity="0.8"/><path d="M38 31 Q35 25 38 21 Q41 17 39 13" stroke="#8b6510" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="39" cy="13" r="5" fill="#f97316" opacity="0.25"/><circle cx="39" cy="13" r="3.5" fill="#fbbf24"/><circle cx="39" cy="13" r="1.8" fill="#fff"/>`,
  },
  {
    id: "duck",
    name: "Ducks",
    hand: "2 2",
    svg: `<rect width="76" height="76" rx="38" fill="#083d2a"/><ellipse cx="38" cy="54" rx="20" ry="13" fill="#fbbf24"/><path d="M54 50 Q64 44 62 55 Q58 59 54 54Z" fill="#f59e0b"/><ellipse cx="38" cy="36" rx="11" ry="14" fill="#22c55e"/><ellipse cx="52" cy="34" rx="8" ry="4.5" fill="#f59e0b"/><circle cx="44" cy="30" r="3.5" fill="#fff"/><circle cx="45" cy="30" r="2" fill="#083d2a"/><circle cx="44.5" cy="29.5" r="0.7" fill="#fff" opacity="0.8"/><path d="M24 50 Q38 44 52 50" stroke="#d97706" stroke-width="1.5" fill="none" opacity="0.4"/>`,
  },
  {
    id: "hammer",
    name: "The Hammer",
    hand: "7 2 offsuit",
    svg: `<rect width="76" height="76" rx="38" fill="#1a0500"/><rect x="34" y="38" width="10" height="30" rx="4" fill="#92400e"/><rect x="16" y="20" width="44" height="22" rx="6" fill="#374151"/><rect x="16" y="20" width="44" height="6" rx="4" fill="#4b5563"/><circle cx="12" cy="46" r="3.5" fill="#fbbf24" opacity="0.7"/><circle cx="64" cy="46" r="3.5" fill="#fbbf24" opacity="0.7"/>`,
  },
  {
    id: "nuts",
    name: "The Nuts",
    hand: "Best possible",
    svg: `<rect width="76" height="76" rx="38" fill="#1a1000"/><ellipse cx="38" cy="28" rx="20" ry="10" fill="#8b5e2a"/><rect x="18" y="24" width="40" height="10" rx="2" fill="#7a4e1a"/><ellipse cx="24" cy="27" rx="3" ry="2" fill="#6a3e10" opacity="0.5"/><ellipse cx="30" cy="25" rx="3" ry="2" fill="#6a3e10" opacity="0.5"/><ellipse cx="36" cy="26" rx="3" ry="2" fill="#6a3e10" opacity="0.5"/><ellipse cx="42" cy="25" rx="3" ry="2" fill="#6a3e10" opacity="0.5"/><ellipse cx="48" cy="27" rx="3" ry="2" fill="#6a3e10" opacity="0.5"/><rect x="18" y="32" width="40" height="4" rx="2" fill="#9a6e3a"/><rect x="36" y="14" width="4" height="12" rx="2" fill="#5a3810"/><path d="M20 36 Q18 56 38 62 Q58 56 56 36 Z" fill="#d4952a"/><path d="M24 38 Q22 52 38 58" stroke="#e8b84a" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/><path d="M22 42 Q38 38 54 42" stroke="#a06818" stroke-width="1.3" fill="none" opacity="0.6"/><path d="M21 48 Q38 44 55 48" stroke="#a06818" stroke-width="1.3" fill="none" opacity="0.6"/><path d="M22 54 Q38 50 54 54" stroke="#a06818" stroke-width="1.3" fill="none" opacity="0.5"/><path d="M20 36 Q18 56 38 62 Q58 56 56 36 Z" fill="none" stroke="#6b3800" stroke-width="2.5"/>`,
  },
];

export function getAvatar(id: string | null | undefined): AvatarDef | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}

export const AVATAR_IDS = new Set(AVATARS.map((a) => a.id));
