/* ============================================================================
 *  rules.js — בסיס הידע לתקנות הים  (COLREG 1972 + ייחוס לתקנות ישראליות)
 *  ----------------------------------------------------------------------------
 *  זהו "מקור האמת" היחיד של היישום. כל השאלות, הציורים והתשובות נגזרים מכאן.
 *  אם משרד התחבורה מעדכן תקנה — מספיק לעדכן את הקובץ הזה, והשאלות יתעדכנו לבד.
 *
 *  כל הנתונים אומתו מול הטקסט הרשמי של COLREG (USCG NavCen) ומול IALA R1001.
 *
 *  ============================  מדריך עריכה  ================================
 *
 *  המבנה: window.SEA_RULES = { meta, lightColors, shapeKinds, vessels[],
 *                              giveWay, sounds[], marks[], scenarios[] }
 *
 *  --- כלי שיט (vessels) ---
 *  לכל כלי שיט אובייקט עם השדות:
 *    id          : מזהה ייחודי באנגלית (לא להציג למשתמש)
 *    name        : שם מלא בעברית
 *    shortName   : שם קצר (לכפתורי תשובה)
 *    ref         : { colreg:"Rule 23", israeli:"" }  ← מלאו את הייחוס הישראלי
 *    giveWayClass: סיווג לצורך זכות קדימה (ראו giveWay.hierarchy)
 *    underway    : true אם בהפלגה, false אם בעוגן/שרטון
 *    lights[]    : רשimת האורות שהכלי מראה בלילה (ראו "place" למטה)
 *    shapes[]    : רשימת הצורות שהכלי מראה ביום
 *    summary     : משפט הסבר קצר
 *    examTip     : טיפ לבחינה
 *
 *  ערכי "place" של אור (היכן הוא ממוקם על כלי השיט):
 *    "masthead"      — פנס תורן קדמי (לבן, 225°)
 *    "masthead-aft"  — פנס תורן שני, גבוה יותר ואחורי (כלי שיט ≥ 50 מ׳ / גורר)
 *    "sidelight-stbd"— פנס צד ימני (ירוק, 112.5°)
 *    "sidelight-port"— פנס צד שמאלי (אדום, 112.5°)
 *    "stern"         — פנס ירכתיים (לבן, 135°)
 *    "towing"        — פנס גרירה (צהוב) מעל פנס הירכתיים
 *    "allround"      — פנס מעגלי (360°) בערימה האנכית בראש התורן — אלו
 *                      האורות ה"מזהים" (אדום-אדום, אדום-לבן-אדום וכו׳).
 *                      הסדר במערך = מלמעלה למטה.
 *    "anchor"        — פנס עוגן מעגלי לבן
 *
 *  ערכי "shape" של צורה:
 *    "ball"      — כדור שחור
 *    "cone-up"   — חרוט שקודקודו כלפי מעלה ▲
 *    "cone-down" — חרוט שקודקודו כלפי מטה ▼
 *    "diamond"   — מעוין שחור ◆
 *    "cylinder"  — גליל (צילינדר) שחור
 *  ערכי "place" של צורה:  "stack" (ערימה אנכית בתורן) או "fwd" (בודדת בחרטום)
 *
 *  כדי להוסיף כלי שיט חדש — העתיקו אובייקט קיים, שנו id ואת השדות.
 *  כדי להוסיף אות קול / מצוף — ראו את המבנים sounds[] ו-marks[] למטה.
 * ========================================================================== */

window.SEA_RULES = {

  meta: {
    title: "ימאות",
    subtitle: "תרגול כללי מניעת התנגשויות בים (COLREG) לבחינת משיט 30",
    source: "International Regulations for Preventing Collisions at Sea, 1972 (COLREG) + IALA Maritime Buoyage System, Region A",
    version: "2.0",
    updated: "2026-07"
  },

  /* ----- צבעי אורות (להצגה ולציור) ----- */
  lightColors: {
    red:    { hex: "#ff3b30", glow: "#ff6a5e", name: "אדום" },
    green:  { hex: "#22d07a", glow: "#5cf0a6", name: "ירוק" },
    white:  { hex: "#fff4d6", glow: "#fffbe9", name: "לבן" },
    yellow: { hex: "#ffd23b", glow: "#ffe27a", name: "צהוב" }
  },

  /* ----- סוגי צורות יום ----- */
  shapeKinds: {
    "ball":      { name: "כדור" },
    "cone-up":   { name: "חרוט שקודקודו למעלה" },
    "cone-down": { name: "חרוט שקודקודו למטה" },
    "diamond":   { name: "מעוין" },
    "cylinder":  { name: "גליל" }
  },

  /* ========================== כלי שיט ========================== */
  vessels: [

    {
      id: "power_under_50",
      name: "כלי שיט ממונע בהפלגה, באורך פחות מ‑50 מטר",
      shortName: "ממונע < 50 מ׳",
      ref: { colreg: "Rule 23(a)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      lights: [
        { place: "masthead",       color: "white", arc: 225, label: "פנס תורן", desc: "אור לבן הנראה מהחרטום לכל צד עד 22.5° אחורה מהזרוע (קשת 225°)." },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני", desc: "אור ירוק בצד ימין (starboard), קשת 112.5°." },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי", desc: "אור אדום בצד שמאל (port), קשת 112.5°." },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים", desc: "אור לבן בירכתיים, קשת 135° מאחור." }
      ],
      shapes: [],
      summary: "כלי שיט ממונע רגיל: פנס תורן, שני פנסי צד (ירוק‑ימין, אדום‑שמאל) ופנס ירכתיים. אין צורות יום.",
      examTip: "‘אדום משמאל, ירוק מימין, לבן בקדמה ובירכתיים’ — זהו כלי שיט ממונע רגיל."
    },

    {
      id: "power_over_50",
      name: "כלי שיט ממונע בהפלגה, באורך 50 מטר ומעלה",
      shortName: "ממונע ≥ 50 מ׳",
      ref: { colreg: "Rule 23(a)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      mastheadLayout: "aft",
      lights: [
        { place: "masthead",       color: "white", arc: 225, label: "פנס תורן קדמי", desc: "פנס תורן קדמי נמוך יותר." },
        { place: "masthead-aft",   color: "white", arc: 225, label: "פנס תורן אחורי", desc: "פנס תורן שני, אחורי וגבוה יותר — חובה בכלי שיט באורך 50 מ׳ ומעלה." },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" }
      ],
      shapes: [],
      summary: "כמו כלי שיט ממונע, אך עם שני פנסי תורן — האחורי גבוה מהקדמי. סימן לאורך 50 מ׳ ומעלה.",
      examTip: "שני פנסי תורן לבנים = כלי שיט ממונע ‘גדול’ (≥ 50 מ׳)."
    },

    {
      id: "sailing",
      name: "מפרשית בהפלגה (במפרש בלבד)",
      shortName: "מפרשית",
      ref: { colreg: "Rule 25(a)(c)", israeli: "" },
      giveWayClass: "sail",
      underway: true,
      sail: true,
      lights: [
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" },
        { place: "allround", color: "red",   arc: 360, optional: true, label: "פנס מעגלי אדום (רשות)", desc: "רשות: שני פנסים מעגליים בראש התורן, אדום מעל ירוק — בנוסף לפנסי הצד והירכתיים (לא יחד עם פנס תלת‑גוני)." },
        { place: "allround", color: "green", arc: 360, optional: true, label: "פנס מעגלי ירוק (רשות)", desc: "החלק התחתון של זוג הפנסים המעגליים שברשות (אדום מעל ירוק)." }
      ],
      shapes: [],
      summary: "מפרשית מראה פנסי צד ופנס ירכתיים בלבד — אין פנס תורן! רשות: אדום מעל ירוק בראש התורן (לא יחד עם פנס תלת‑גוני). מתחת ל‑20 מ׳ מותר פנס תלת‑גוני אחד בראש התורן.",
      examTip: "אין פנס תורן לבן = מפרשית. זכרו את כיוון הרוח: צד מעלה הרוח (windward) הוא הצד ההפוך לזה שבו נישא המפרש הראשי."
    },

    {
      id: "motorsailing",
      name: "כלי שיט המונע במפרש וגם במנוע",
      shortName: "מפרש + מנוע",
      ref: { colreg: "Rule 25(e)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      sail: true,
      lights: [
        { place: "masthead",       color: "white", arc: 225, label: "פנס תורן" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "cone-down", place: "fwd", color: "black", label: "חרוט שקודקודו כלפי מטה", desc: "ביום: חרוט שחור אחד שקודקודו כלפי מטה, בחרטום — מציין שהכלי מונע גם במנוע." }
      ],
      summary: "מפרשית שמפעילה גם מנוע נחשבת כלי שיט ממונע! בלילה מראה אורות של כלי שיט ממונע, וביום חרוט שחור שקודקודו כלפי מטה.",
      examTip: "חרוט שחור שקודקודו למטה ביום = ‘מפליגה במפרש אבל גם מניעה במנוע’ → דין כלי שיט ממונע לעניין זכות קדימה."
    },

    {
      id: "anchor",
      name: "כלי שיט בעוגן (באורך פחות מ‑50 מטר)",
      shortName: "בעוגן",
      ref: { colreg: "Rule 30(a)(b)", israeli: "" },
      giveWayClass: "anchor",
      underway: false,
      lights: [
        { place: "anchor", color: "white", arc: 360, label: "פנס עוגן", desc: "פנס מעגלי לבן בחלק הקדמי, נראה מכל הכיוונים. כלי שיט <50 מ׳ רשאי להסתפק בפנס אחד במקום הנראה ביותר. כלי שיט ≥50 מ׳ מראה שניים — קדמי גבוה ואחורי נמוך." }
      ],
      shapes: [
        { shape: "ball", place: "fwd", color: "black", label: "כדור שחור", desc: "ביום: כדור שחור אחד בחלק הקדמי." }
      ],
      note: "כלי שיט ≥100 מ׳ בעוגן חייב להאיר את סיפוניו בתאורת עבודה. כלי שיט <7 מ׳ בעוגן מחוץ לנתיב/מעגן — פטור מפנס וכדור עוגן. עוסק בדיג בעוגן מציג אורות דיג, לא אורות עוגן.",
      summary: "בעוגן: פנס מעגלי לבן (אחד מתחת ל‑50 מ׳, שניים מעל; ≥100 מ׳ גם תאורת סיפון). ביום — כדור שחור אחד בחרטום.",
      examTip: "כדור שחור בודד בחרטום = כלי שיט בעוגן."
    },

    {
      id: "aground",
      name: "כלי שיט שעלה על שרטון",
      shortName: "על שרטון",
      ref: { colreg: "Rule 30(d)", israeli: "" },
      giveWayClass: "aground",
      underway: false,
      lights: [
        { place: "anchor",   color: "white", arc: 360, label: "פנס עוגן", desc: "אורות העוגן הרגילים." },
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום עליון", desc: "שני פנסים מעגליים אדומים זה מעל זה, בנוסף לפנסי העוגן." },
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום תחתון", desc: "הפנס האדום השני בזוג." }
      ],
      shapes: [
        { shape: "ball", place: "stack", color: "black", label: "כדור עליון" },
        { shape: "ball", place: "stack", color: "black", label: "כדור אמצעי" },
        { shape: "ball", place: "stack", color: "black", label: "כדור תחתון" }
      ],
      summary: "על שרטון: אורות עוגן + שני פנסים מעגליים אדומים זה מעל זה. ביום — שלושה כדורים שחורים במאונך.",
      examTip: "שלושה כדורים שחורים במאונך = עלה על שרטון. בלילה: עוגן + אדום‑אדום."
    },

    {
      id: "nuc",
      name: "כלי שיט שאינו שולט בתנועתו (NUC)",
      shortName: "אינו שולט בתנועתו",
      ref: { colreg: "Rule 27(a)", israeli: "" },
      giveWayClass: "nuc",
      underway: true,
      lights: [
        { place: "allround", color: "red", arc: 360, label: "פנס אדום עליון", desc: "שני פנסים מעגליים אדומים זה מעל זה — ‘אינני שולט בתנועתי’ (תקלה וכד׳)." },
        { place: "allround", color: "red", arc: 360, label: "פנס אדום תחתון" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני", desc: "פנסי הצד והירכתיים נראים רק כאשר הכלי מתקדם במים." },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "ball", place: "stack", color: "black", label: "כדור עליון" },
        { shape: "ball", place: "stack", color: "black", label: "כדור תחתון" }
      ],
      summary: "אינו שולט בתנועתו: שני פנסים מעגליים אדומים זה מעל זה (אין פנס תורן!). אם מתקדם — מוסיף פנסי צד וירכתיים. ביום — שני כדורים שחורים.",
      examTip: "שני אדומים מעגליים במאונך = NUC. אין פנס תורן. שאר כלי השיט (כולל ממונע ומפרשית) נותנים לו זכות קדימה."
    },

    {
      id: "ram",
      name: "כלי שיט מוגבל ביכולת התמרון (RAM)",
      shortName: "מוגבל בתמרון",
      ref: { colreg: "Rule 27(b)", israeli: "" },
      giveWayClass: "ram",
      underway: true,
      lights: [
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום עליון", desc: "שלושה פנסים מעגליים במאונך: אדום‑לבן‑אדום." },
        { place: "allround", color: "white", arc: 360, label: "פנס לבן אמצעי" },
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום תחתון" },
        { place: "masthead",       color: "white", arc: 225, label: "פנס תורן", desc: "כשמתקדם במים — מראה גם פנס תורן, פנסי צד וירכתיים." },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "ball",    place: "stack", color: "black", label: "כדור עליון" },
        { shape: "diamond", place: "stack", color: "black", label: "מעוין אמצעי" },
        { shape: "ball",    place: "stack", color: "black", label: "כדור תחתון" }
      ],
      summary: "מוגבל ביכולת התמרון: שלושה פנסים מעגליים אדום‑לבן‑אדום במאונך. ביום — כדור‑מעוין‑כדור.",
      examTip: "אדום‑לבן‑אדום (לילה) או כדור‑מעוין‑כדור (יום) = מוגבל ביכולת התמרון. עבודות, הנחת כבל, שאיבת מוקשים וכד׳."
    },

    {
      id: "cbd",
      name: "כלי שיט מוגבל בשוקעו (Constrained by draught)",
      shortName: "מוגבל בשוקעו",
      ref: { colreg: "Rule 28", israeli: "" },
      giveWayClass: "cbd",
      underway: true,
      lights: [
        { place: "masthead",       color: "white", arc: 225, label: "פנס תורן" },
        { place: "allround", color: "red", arc: 360, label: "פנס אדום עליון", desc: "שלושה פנסים מעגליים אדומים במאונך, בנוסף לאורות כלי שיט ממונע." },
        { place: "allround", color: "red", arc: 360, label: "פנס אדום אמצעי" },
        { place: "allround", color: "red", arc: 360, label: "פנס אדום תחתון" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "cylinder", place: "stack", color: "black", label: "גליל (צילינדר) שחור", desc: "ביום: גליל שחור אחד." }
      ],
      summary: "מוגבל בשוקעו (בגלל עומק/רוחב הנתיב): רשאי להציג שלושה פנסים מעגליים אדומים במאונך, בנוסף לאורות ממונע. ביום — גליל שחור. (תקנה 28 — רשות, לא חובה!)",
      examTip: "שלושה אדומים מעגליים במאונך = מוגבל בשוקעו. ביום — גליל. שימו לב: זו רשות (‘may’), לא חובה — שאלת מלכוד נפוצה."
    },

    {
      id: "towing",
      name: "כלי שיט גורר (כשאורך הגרירה עד 200 מטר)",
      shortName: "גורר",
      ref: { colreg: "Rule 24(a)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      mastheadLayout: "stack",
      lights: [
        { place: "masthead",     color: "white", arc: 225, label: "פנס תורן תחתון", desc: "שני פנסי תורן זה מעל זה בקו אנכי, על אותו תורן (שלושה אם אורך הגרירה עולה על 200 מ׳)." },
        { place: "masthead-aft", color: "white", arc: 225, label: "פנס תורן עליון", desc: "הפנס העליון בזוג האנכי. גורר באורך 50 מ׳ ומעלה מוסיף בנפרד גם פנס תורן אחורי רגיל (תקנה 24(ד))." },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern", color: "white", arc: 135, label: "פנס ירכתיים" },
        { place: "towing", color: "yellow", arc: 135, label: "פנס גרירה", desc: "פנס צהוב מעל פנס הירכתיים — מציין גרירה." }
      ],
      shapes: [],
      summary: "גורר: שני פנסי תורן בקו אנכי (זה מעל זה) + פנס צהוב (פנס גרירה) מעל פנס הירכתיים. אם אורך הגרירה עולה על 200 מ׳ — שלושה פנסי תורן במאונך ומעוין שחור ביום (גם בנגרר).",
      examTip: "פנס צהוב מעל פנס לבן בירכתיים = כלי שיט גורר. אם הגרירה ארוכה מ‑200 מ׳ → מעוין שחור ביום."
    },

    {
      id: "trawling",
      name: "כלי שיט העוסק בדיג במכמורת (Trawling)",
      shortName: "דיג במכמורת",
      ref: { colreg: "Rule 26(b)", israeli: "" },
      giveWayClass: "fishing",
      underway: true,
      lights: [
        { place: "allround", color: "green", arc: 360, label: "פנס ירוק עליון", desc: "שני פנסים מעגליים זה מעל זה: ירוק מעל לבן — דיג במכמורת." },
        { place: "allround", color: "white", arc: 360, label: "פנס לבן תחתון" },
        { place: "masthead", color: "white", arc: 225, optional: true, label: "פנס תורן (≥50 מ׳ — חובה)", desc: "פנס תורן אחורי וגבוה מהפנס הירוק המעגלי. חובה במכמורתן באורך 50 מ׳ ומעלה; רשות בקטן יותר (תקנה 26(ב)). זהו ההבדל מדייג שאינו מכמורתן — שלו אסור פנס תורן!" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני", desc: "פנסי צד וירכתיים נראים רק כשהכלי מתקדם במים." },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern", color: "white", arc: 135, label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "cone-down", place: "stack", color: "black", label: "חרוט עליון (קודקוד למטה)", desc: "שני חרוטים שקודקודיהם נפגשים — ‘עוסק בדיג’." },
        { shape: "cone-up",   place: "stack", color: "black", label: "חרוט תחתון (קודקוד למעלה)" }
      ],
      note: "כלי שיט עוסק בדיג — בהפלגה או בעוגן — מציג רק את אורות וסימני הדיג (לא אורות עוגן!) — תקנה 26(א). מכמורתן ≥50 מ׳ חייב גם פנס תורן אחורי-גבוה; קטן מ‑50 מ׳ — רשות.",
      summary: "דיג במכמורת: ירוק מעל לבן (פנסים מעגליים) + פנס תורן אחורי בכלי ≥50 מ׳. ביום — שני חרוטים שקודקודיהם נפגשים.",
      examTip: "ירוק מעל לבן = דיג במכמורת (Trawling). מכמורתן גדול מוסיף פנס תורן; דייג אחר — לעולם לא. ‘Green for Go trawling’."
    },

    {
      id: "fishing_other",
      name: "כלי שיט העוסק בדיג שאינו מכמורת",
      shortName: "דיג (לא מכמורת)",
      ref: { colreg: "Rule 26(c)", israeli: "" },
      giveWayClass: "fishing",
      underway: true,
      lights: [
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום עליון", desc: "שני פנסים מעגליים זה מעל זה: אדום מעל לבן — דיג שאינו מכמורת." },
        { place: "allround", color: "white", arc: 360, label: "פנס לבן תחתון" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern", color: "white", arc: 135, label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "cone-down", place: "stack", color: "black", label: "חרוט עליון (קודקוד למטה)" },
        { shape: "cone-up",   place: "stack", color: "black", label: "חרוט תחתון (קודקוד למעלה)" }
      ],
      note: "עוסק בדיג — גם בעוגן — מציג רק את אורות וסימני הדיג (תקנה 26(א)). לדייג שאינו מכמורתן אין ולעולם לא יהיה פנס תורן.",
      summary: "דיג שאינו מכמורת: אדום מעל לבן (פנסים מעגליים). ביום — שני חרוטים שקודקודיהם נפגשים. אם הציוד משתרע מעל 150 מ׳ — חרוט שקודקודו כלפי מעלה בכיוון הציוד (בלילה: פנס מעגלי לבן בכיוון הציוד).",
      examTip: "אדום מעל לבן = דיג שאינו מכמורת. ‘Red over white — fishing tonight’."
    },

    {
      id: "pilot",
      name: "כלי שיט נתב בתפקיד (Pilot)",
      shortName: "נתב",
      ref: { colreg: "Rule 29(a)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      lights: [
        { place: "allround", color: "white", arc: 360, label: "פנס לבן עליון", desc: "שני פנסים מעגליים בראש התורן: לבן מעל אדום — כלי שיט נתב בתפקיד." },
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום תחתון" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני", desc: "בהפלגה — מוסיף פנסי צד וירכתיים. בעוגן — מוסיף אורות עוגן." },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern", color: "white", arc: 135, label: "פנס ירכתיים" }
      ],
      shapes: [],
      note: "אין צורת יום לפי COLREG לכלי שיט נתב. דגל G = ‘דרוש לי נתב’ (מניפה הספינה המבקשת); דגל H = ‘יש נתב על סיפוני’ (מניף כל כלי שיט שנתב על סיפונו). ביום מזוהה הנתב גם בכיתוב ‘PILOT’ (נוהג, אינו תקנה).",
      summary: "כלי שיט נתב: לבן מעל אדום (פנסים מעגליים בראש התורן) + פנסי צד וירכתיים בהפלגה.",
      examTip: "‘White over red — pilot ahead’. לבן מעל אדום = נתב."
    },

    {
      id: "diving",
      name: "כלי שיט העוסק בפעולות צלילה (קטן)",
      shortName: "צלילה",
      ref: { colreg: "Rule 27(e)", israeli: "" },
      giveWayClass: "ram",
      underway: true,
      lights: [
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום עליון", desc: "שלושה פנסים מעגליים במאונך: אדום‑לבן‑אדום (כמו ‘מוגבל ביכולת התמרון’)." },
        { place: "allround", color: "white", arc: 360, label: "פנס לבן אמצעי" },
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום תחתון" }
      ],
      shapes: [],
      dayFlag: "A",
      note: "כלי שיט קטן העוסק בצלילה, שאינו יכול להציג את צורות ‘מוגבל ביכולת התמרון’, מציג ביום העתק נוקשה של דגל A (Alpha) בגובה של לפחות 1 מטר, נראה מכל הכיוונים. כלי שיט גדול יותר יציג כדור‑מעוין‑כדור.",
      summary: "פעולות צלילה: שלושה פנסים מעגליים אדום‑לבן‑אדום, וביום — דגל A (Alpha) נוקשה (‘יש צוללן במים — התרחק ועבור לאט’).",
      examTip: "דגל A נוקשה = יש צוללן במים. דין כלי השיט כמוגבל ביכולת התמרון (אחרים מפנים לו דרך)."
    },

    {
      id: "dredging",
      name: "כלי שיט העוסק בחפירה או בעבודות תת‑מימיות (מוגבל בתמרון)",
      shortName: "חפירה/עבודות",
      ref: { colreg: "Rule 27(d)", israeli: "" },
      giveWayClass: "ram",
      underway: true,
      lights: [
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום עליון", desc: "שלושה פנסים מעגליים אדום‑לבן‑אדום — מוגבל ביכולת התמרון." },
        { place: "allround", color: "white", arc: 360, label: "פנס לבן אמצעי" },
        { place: "allround", color: "red",   arc: 360, label: "פנס אדום תחתון" },
        { place: "masthead",       color: "white", arc: 225, label: "פנס תורן" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern", color: "white", arc: 135, label: "פנס ירכתיים" }
      ],
      sideLights: { port: ["red","red"], stbd: ["green","green"] },
      shapes: [
        { shape: "ball",    place: "stack", color: "black", label: "כדור עליון" },
        { shape: "diamond", place: "stack", color: "black", label: "מעוין אמצעי" },
        { shape: "ball",    place: "stack", color: "black", label: "כדור תחתון" }
      ],
      sideShapes: { port: ["ball","ball"], stbd: ["diamond","diamond"] },
      note: "בנוסף לסימני ‘מוגבל ביכולת התמרון’: בצד שבו קיים המכשול — שני פנסים אדומים מעגליים / שני כדורים; ובצד שבו מותר לעבור — שני פנסים ירוקים מעגליים / שני מעוינים.",
      summary: "חפירה/עבודות תת‑מים (מוגבל בתמרון): אדום‑לבן‑אדום + שני אדומים בצד המכשול ושני ירוקים בצד המעבר. ביום: כדור‑מעוין‑כדור + שני כדורים (מכשול) ושני מעוינים (מעבר).",
      examTip: "שני כדורים = הצד עם המכשול (אל תעבור שם); שני מעוינים = הצד הבטוח למעבר."
    },

    {
      id: "mineclear",
      name: "כלי שיט העוסק בפינוי מוקשים",
      shortName: "פינוי מוקשים",
      ref: { colreg: "Rule 27(f)", israeli: "" },
      giveWayClass: "ram",
      underway: true,
      lights: [
        { place: "masthead", color: "white", arc: 225, label: "פנס תורן" },
        { place: "allround", color: "green", arc: 360, label: "פנס ירוק 1", desc: "שלושה פנסים מעגליים ירוקים — אחד בראש התורן הקדמי ואחד בכל קצה של הזרוע הקדמית." },
        { place: "allround", color: "green", arc: 360, label: "פנס ירוק 2" },
        { place: "allround", color: "green", arc: 360, label: "פנס ירוק 3" },
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני" },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern", color: "white", arc: 135, label: "פנס ירכתיים" }
      ],
      shapes: [
        { shape: "ball", place: "stack", color: "black", label: "כדור 1" },
        { shape: "ball", place: "stack", color: "black", label: "כדור 2" },
        { shape: "ball", place: "stack", color: "black", label: "כדור 3" }
      ],
      note: "במציאות שלושת הפנסים הירוקים / שלושת הכדורים מוצבים במשולש: אחד בראש התורן הקדמי ואחד בכל קצה של הזרוע הקדמית (לא במאונך). המשמעות: סכנה חמורה — התרחק לפחות 1000 מטר.",
      summary: "פינוי מוקשים: אורות כלי שיט ממונע + שלושה פנסים מעגליים ירוקים (ביום — שלושה כדורים שחורים). יש לשמור מרחק של 1000 מ׳ לפחות.",
      examTip: "שלושה ירוקים מעגליים / שלושה כדורים = פינוי מוקשים. התרחק 1000 מ׳."
    },

    {
      id: "towed",
      name: "כלי שיט נגרר",
      shortName: "נגרר",
      ref: { colreg: "Rule 24(e)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      noScenario: true,
      idAmbiguous: true,
      lights: [
        { place: "sidelight-stbd", color: "green", arc: 112.5, label: "פנס צד ימני", desc: "הנגרר מציג פנסי צד ופנס ירכתיים בלבד — ללא פנס תורן." },
        { place: "sidelight-port", color: "red",   arc: 112.5, label: "פנס צד שמאלי" },
        { place: "stern",          color: "white", arc: 135,   label: "פנס ירכתיים" }
      ],
      shapes: [],
      note: "כשאורך הגרירה (מירכתי הגורר עד קצה הנגרר) עולה על 200 מ׳ — הנגרר מציג ביום מעוין שחור (וכך גם הגורר). שימו לב: אורות הנגרר בלילה זהים למפרשית — ההקשר (פנס הגרירה הצהוב של הגורר לפניו) הוא שמסגיר את המצב.",
      summary: "נגרר: פנסי צד ופנס ירכתיים בלבד (כמו מפרשית!). גרירה ארוכה מ‑200 מ׳ — מעוין שחור ביום.",
      examTip: "רואים ‘מפרשית’ צמוד מאחורי כלי עם פנס צהוב מעל הירכתיים? זה נגרר, לא מפרשית."
    },

    {
      id: "power_small",
      name: "כלי שיט ממונע קטן (פחות מ‑7 מ׳, מהירות עד 7 קשר)",
      shortName: "ממונע < 7 מ׳",
      ref: { colreg: "Rule 23(d)", israeli: "" },
      giveWayClass: "power",
      underway: true,
      idAmbiguous: true,
      lights: [
        { place: "allround", color: "white", arc: 360, label: "פנס מעגלי לבן", desc: "כלי שיט ממונע <7 מ׳ שמהירותו המרבית אינה עולה על 7 קשר רשאי להציג פנס מעגלי לבן אחד בלבד (ופנסי צד — אם מעשי)." }
      ],
      shapes: [],
      note: "כלי שיט ממונע <12 מ׳ רשאי להציג פנס מעגלי לבן אחד (במקום פנס תורן ופנס ירכתיים) + פנסי צד. בזהירות: פנס לבן בודד בלילה יכול להיות גם כלי שיט בעוגן — ההבחנה נעשית לפי תנועה והקשר.",
      summary: "ממונע קטן: <12 מ׳ — פנס מעגלי לבן + פנסי צד; <7 מ׳ ועד 7 קשר — פנס מעגלי לבן בלבד (פנסי צד אם מעשי).",
      examTip: "פנס לבן בודד נע = כנראה סירת מנוע קטנה; פנס לבן בודד נייח = עוגן. שאלות ההבחנה חוזרות בבחינה."
    },

    {
      id: "sail_small",
      name: "מפרשית קטנה (פחות מ‑7 מ׳) / סירת משוטים",
      shortName: "מפרשית קטנה/משוטים",
      ref: { colreg: "Rule 25(d)", israeli: "" },
      giveWayClass: "sail",
      underway: true,
      noScenario: true,
      idAmbiguous: true,
      nightDesc: "אם אינה יכולה להציג פנסי צד וירכתיים — פנס יד או לפיד לבן, מוכן להצגה בעוד מועד למניעת התנגשות",
      lights: [],
      shapes: [],
      summary: "מפרשית <7 מ׳ וסירת משוטים: אם אין אפשרות להציג את הפנסים הרגילים — מחזיקים פנס/לפיד לבן זמין ומציגים אותו בזמן כדי למנוע התנגשות.",
      examTip: "בסירת משוטים אין חובת פנסים קבועים — אבל חובה שיהיה פנס לבן זמין להצגה."
    }

  ],

  /* ========================== זכות קדימה ========================== */
  giveWay: {
    /* היררכיה לפי תקנה 18. דרגה גבוהה יותר = ‘זכאי’ (האחרים מתרחקים ממנו).
       מי שדרגתו נמוכה יותר — נותן זכות קדימה (give‑way). */
    /* הערה: לפי תקנה 18(ד), כל כלי שיט פרט ל‑NUC/RAM חייב להימנע מהפרעה למעברו של
       כלי שיט מוגבל בשוקעו (CBD). לכן CBD ממוקם מעל מפרשית/דיג/ממונע בסדר ה‘פינוי’,
       ומתחת ל‑NUC/RAM. (זוהי פשטה לימודית של ‘הימנעות מהפרעה’.) */
    hierarchy: [
      { class: "nuc",      rank: 6, name: "אינו שולט בתנועתו" },
      { class: "ram",      rank: 6, name: "מוגבל ביכולת התמרון" },
      { class: "cbd",      rank: 5, name: "מוגבל בשוקעו" },
      { class: "fishing",  rank: 4, name: "עוסק בדיג" },
      { class: "sail",     rank: 3, name: "מפרשית" },
      { class: "power",    rank: 2, name: "ממונע" },
      { class: "seaplane", rank: 1, name: "מטוס ים" }
    ],
    ref18: { colreg: "Rule 18", israeli: "" },

    /* מפגשים גיאומטריים בין שני כלי שיט ממונעים (אותה דרגה) */
    encounters: {
      headon: {
        name: "חזית מול חזית",
        ref: { colreg: "Rule 14", israeli: "" },
        rule: "שני כלי שיט ממונעים המתקרבים בקווים הפוכים או כמעט הפוכים — כל אחד יסטה ימינה (starboard), כך שיחלפו צד‑שמאל אל צד‑שמאל.",
        answer: "both"
      },
      crossing: {
        name: "חיתוך נתיבים (Crossing)",
        ref: { colreg: "Rule 15", israeli: "" },
        rule: "בחיתוך נתיבים בין שני כלי שיט ממונעים — הכלי שרואה את האחר בצדו הימני נותן זכות קדימה, ויימנע מלחצות לפניו.",
        answer: "starboard-vessel-gives-way"
      },
      overtaking: {
        name: "עקיפה (Overtaking)",
        ref: { colreg: "Rule 13", israeli: "" },
        rule: "כל כלי שיט העוקף כלי שיט אחר (מתקרב מזווית גדולה מ‑22.5° מאחורי הזרוע) חייב להתרחק מהנעקף — בלי קשר לסוג כלי השיט.",
        answer: "overtaker-gives-way"
      }
    },

    /* מפגש בין שתי מפרשיות — תקנה 12 */
    sailTacks: {
      name: "שתי מפרשיות",
      ref: { colreg: "Rule 12", israeli: "" },
      rules: [
        "כאשר לכל מפרשית הרוח בצד אחר — זו שהרוח בצדה השמאלי (port tack) נותנת זכות קדימה.",
        "כאשר לשתיהן הרוח באותו צד — הכלי שלרוח (windward) נותן זכות קדימה לכלי שמתחת לרוח (leeward).",
        "צד מעלה הרוח (windward) הוא הצד הנוגד לצד שבו נישא המפרש הראשי (תקנה 12(ב))."
      ]
    }
  },

  /* ========================== אותות קול ========================== */
  /* pattern: • = צפירה קצרה (~1 שנ׳),  ▬ = צפירה ממושכת (4–6 שנ׳)
     audio:   רצף ל‑Web Audio: "S"=קצרה, "L"=ממושכת */
  sounds: [
    { id: "s_stbd",  pattern: "•",      meaning: "אני משנה את הילוכי לימין (starboard)", when: "בראייה הדדית", ref: { colreg: "Rule 34(a)", israeli: "" }, audio: ["S"] },
    { id: "s_port",  pattern: "• •",    meaning: "אני משנה את הילוכי לשמאל (port)",       when: "בראייה הדדית", ref: { colreg: "Rule 34(a)", israeli: "" }, audio: ["S","S"] },
    { id: "s_astern",pattern: "• • •",  meaning: "אני מפעיל הנעה לאחור",                  when: "בראייה הדדית", ref: { colreg: "Rule 34(a)", israeli: "" }, audio: ["S","S","S"] },
    { id: "s_doubt", pattern: "• • • • •", meaning: "אות ספק / אזהרה (איני מבין את כוונתך או מטיל ספק בפעולתך) — לפחות חמש צפירות קצרות ומהירות", when: "בראייה הדדית", ref: { colreg: "Rule 34(d)", israeli: "" }, audio: ["S","S","S","S","S"] },
    { id: "s_bend",  pattern: "▬",      meaning: "התקרבות לעיקול / יציאה מנמל כשהראות חסומה — צפירה ממושכת אחת", when: "התראה", ref: { colreg: "Rule 34(e)", israeli: "" }, audio: ["L"] },
    { id: "s_ot_stbd", pattern: "▬ ▬ •",  meaning: "בכוונתי לעקוף אותך מצדך הימני (בנתיב צר)", when: "עקיפה בנתיב צר", ref: { colreg: "Rule 34(c)", israeli: "" }, audio: ["L","L","S"] },
    { id: "s_ot_port", pattern: "▬ ▬ • •", meaning: "בכוונתי לעקוף אותך מצדך השמאלי (בנתיב צר)", when: "עקיפה בנתיב צר", ref: { colreg: "Rule 34(c)", israeli: "" }, audio: ["L","L","S","S"] },
    { id: "s_agree",   pattern: "▬ • ▬ •", meaning: "הסכמה לעקיפה (מהכלי הנעקף)", when: "עקיפה בנתיב צר", ref: { colreg: "Rule 34(c)", israeli: "" }, audio: ["L","S","L","S"] },
    { id: "s_rv_making", pattern: "▬", meaning: "בראות מוגבלת: כלי שיט ממונע המתקדם במים — צפירה ממושכת אחת כל פרק זמן שאינו עולה על 2 דקות", when: "ראות מוגבלת", ref: { colreg: "Rule 35(a)", israeli: "" }, audio: ["L"] },
    { id: "s_rv_stopped", pattern: "▬ ▬", meaning: "בראות מוגבלת: כלי שיט ממונע בהפלגה אך עומד במקום (אינו מתקדם) — שתי צפירות ממושכות כל ≤2 דקות", when: "ראות מוגבלת", ref: { colreg: "Rule 35(b)", israeli: "" }, audio: ["L","L"] },
    { id: "s_rv_special", pattern: "▬ • •", meaning: "בראות מוגבלת: כלי שיט שאינו שולט בתנועתו / מוגבל בתמרון / מוגבל בשוקעו / מפרשית / עוסק בדיג / גורר — ממושכת ואחריה שתי קצרות, כל ≤2 דקות. (גם דייג בעוגן וכלי מוגבל‑בתמרון העובד בעוגן!)", when: "ראות מוגבלת", ref: { colreg: "Rule 35(c),(d)", israeli: "" }, audio: ["L","S","S"] },
    { id: "s_rv_towed", pattern: "▬ • • •", meaning: "בראות מוגבלת: כלי שיט נגרר (האחרון בשיירה, אם מאויש) — צפירה ממושכת ושלוש קצרות, מיד אחרי אות הגורר אם אפשר, כל ≤2 דקות", when: "ראות מוגבלת", ref: { colreg: "Rule 35(e)", israeli: "" }, audio: ["L","S","S","S"] },
    { id: "s_rv_pilot", pattern: "• • • •", meaning: "ספינת נתב בתפקיד רשאית להוסיף אות זיהוי: ארבע צפירות קצרות", when: "ראות מוגבלת", ref: { colreg: "Rule 35(k)", israeli: "" }, audio: ["S","S","S","S"] },
    { id: "s_rv_anchor", pattern: "🔔", meaning: "בראות מוגבלת: כלי שיט בעוגן — צלצול פעמון מהיר כ‑5 שניות, כל דקה לכל היותר. בכלי ≥100 מ׳: פעמון בחרטום ומיד אחריו גונג בירכתיים", when: "ראות מוגבלת — בעוגן/שרטון", ref: { colreg: "Rule 35(g)", israeli: "" }, audio: ["B"] },
    { id: "s_rv_anchor_warn", pattern: "• ▬ •", meaning: "בעוגן (רשות): קצרה‑ממושכת‑קצרה — אזהרה לכלי שיט מתקרב על מיקומי ועל אפשרות התנגשות", when: "ראות מוגבלת — בעוגן/שרטון", ref: { colreg: "Rule 35(g)", israeli: "" }, audio: ["S","L","S"] },
    { id: "s_rv_aground", pattern: "••• 🔔 •••", meaning: "בראות מוגבלת: כלי שיט על שרטון — שלוש נקישות פעמון נפרדות וברורות, צלצול מהיר, ושוב שלוש נקישות (בכלי ≥100 מ׳ — בתוספת גונג)", when: "ראות מוגבלת — בעוגן/שרטון", ref: { colreg: "Rule 35(h)", israeli: "" }, audio: ["K","K","K","B","K","K","K"] },
    { id: "s_rv_bell_exempt", pattern: "♪", meaning: "כלי שיט באורך 12–20 מ׳ פטור מאותות הפעמון של עוגן/שרטון — ובלבד שישמיע אות קול יעיל אחר, כל 2 דקות לכל היותר", when: "ראות מוגבלת — בעוגן/שרטון", ref: { colreg: "Rule 35(i)", israeli: "" }, audio: ["S"] },
    { id: "s_rv_small", pattern: "♪", meaning: "כלי שיט קטן מ‑12 מ׳ אינו חייב באותות הראות המוגבלת הרגילים — אך חייב להשמיע אות קול יעיל אחר, כל 2 דקות לכל היותר", when: "ראות מוגבלת", ref: { colreg: "Rule 35(j)", israeli: "" }, audio: ["S"] }
  ],

  /* ========================== מצופים (IALA אזור A) ========================== */
  /* day: { color, shape, topmark }  •  light: { color, rhythm, frames }
     frames: רצף הבהוב למנוע התצוגה — [{ms, color}] כאשר color=null => כבוי */
  marks: [
    {
      id: "lateral_port",
      name: "מצוף צד שמאל (Port hand)",
      shortName: "צד שמאל",
      region: "A",
      day: { color: "red", shape: "can", topmark: null },
      light: { color: "red", rhythm: "מהבהב אדום (כל מקצב)", frames: [ {ms:400,color:"red"},{ms:1200,color:null} ] },
      meaning: "סמן צד בכניסה לנמל: השאר אותו בצדך השמאלי בכניסה מהים. צבע אדום, צורת גליל (can).",
      ref: { colreg: "IALA R1001 §2.1.3", israeli: "" }
    },
    {
      id: "lateral_stbd",
      name: "מצוף צד ימין (Starboard hand)",
      shortName: "צד ימין",
      region: "A",
      day: { color: "green", shape: "cone", topmark: null },
      light: { color: "green", rhythm: "מהבהב ירוק (כל מקצב)", frames: [ {ms:400,color:"green"},{ms:1200,color:null} ] },
      meaning: "סמן צד בכניסה לנמל: השאר אותו בצדך הימני בכניסה מהים. צבע ירוק, צורת חרוט (cone).",
      ref: { colreg: "IALA R1001 §2.1.3", israeli: "" }
    },
    {
      id: "preferred_stbd",
      name: "ערוץ מועדף לימין (Preferred channel to starboard)",
      shortName: "ערוץ מועדף לימין",
      region: "A",
      day: { color: "red-green-red", shape: "can", topmark: "can-red" },
      light: { color: "red", rhythm: "אדום Fl(2+1) — שני הבהובים + אחד (מקצב השמור רק למצופי ערוץ מועדף)", frames: [ {ms:400,color:"red"},{ms:400,color:null},{ms:400,color:"red"},{ms:1100,color:null},{ms:400,color:"red"},{ms:2900,color:null} ] },
      meaning: "בהתפצלות נתיב: הערוץ הראשי (המועדף) עובר מימין למצוף — לכן נוהגים בו כמו מצוף צד שמאל ומשאירים אותו בצד שמאל (בכניסה מהים). גוף אדום (גליל) עם פס ירוק אופקי רחב.",
      ref: { colreg: "IALA R1001 §2.1 (Preferred channel)", israeli: "" }
    },
    {
      id: "preferred_port",
      name: "ערוץ מועדף לשמאל (Preferred channel to port)",
      shortName: "ערוץ מועדף לשמאל",
      region: "A",
      day: { color: "green-red-green", shape: "cone", topmark: "cone-up-green" },
      light: { color: "green", rhythm: "ירוק Fl(2+1) — שני הבהובים + אחד", frames: [ {ms:400,color:"green"},{ms:400,color:null},{ms:400,color:"green"},{ms:1100,color:null},{ms:400,color:"green"},{ms:2900,color:null} ] },
      meaning: "בהתפצלות נתיב: הערוץ הראשי (המועדף) עובר משמאל למצוף — לכן נוהגים בו כמו מצוף צד ימין ומשאירים אותו בצד ימין (בכניסה מהים). גוף ירוק (חרוט) עם פס אדום אופקי רחב.",
      ref: { colreg: "IALA R1001 §2.1 (Preferred channel)", israeli: "" }
    },
    {
      id: "card_north",
      name: "מצוף ציון צפוני (North cardinal)",
      shortName: "צפוני",
      region: "A",
      day: { color: "black-over-yellow", shape: "pillar", topmark: "cones-up" },
      light: { color: "white", rhythm: "לבן VQ או Q רצוף (הבהוב מהיר ללא הפסקה)", frames: [ {ms:250,color:"white"},{ms:250,color:null} ] },
      meaning: "עבור מצפון למצוף — שם המים בטוחים. שחור מעל צהוב, שני חרוטים שקודקודיהם כלפי מעלה.",
      ref: { colreg: "IALA R1001 (Cardinal N)", israeli: "" }
    },
    {
      id: "card_east",
      name: "מצוף ציון מזרחי (East cardinal)",
      shortName: "מזרחי",
      region: "A",
      day: { color: "black-yellow-black", shape: "pillar", topmark: "cones-base" },
      light: { color: "white", rhythm: "לבן Q(3) כל 10 שנ׳ — שלושה הבהובים ואז הפסקה", frames: [ {ms:300,color:"white"},{ms:350,color:null},{ms:300,color:"white"},{ms:350,color:null},{ms:300,color:"white"},{ms:2700,color:null} ] },
      meaning: "עבור ממזרח למצוף. שחור‑צהוב‑שחור, שני חרוטים בסיס אל בסיס (קודקודים מופנים החוצה).",
      ref: { colreg: "IALA R1001 (Cardinal E)", israeli: "" }
    },
    {
      id: "card_south",
      name: "מצוף ציון דרומי (South cardinal)",
      shortName: "דרומי",
      region: "A",
      day: { color: "yellow-over-black", shape: "pillar", topmark: "cones-down" },
      light: { color: "white", rhythm: "לבן Q(6)+הבהוב ארוך כל 15 שנ׳", frames: [ {ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:1200,color:"white"},{ms:1500,color:null} ] },
      meaning: "עבור מדרום למצוף. צהוב מעל שחור, שני חרוטים שקודקודיהם כלפי מטה.",
      ref: { colreg: "IALA R1001 (Cardinal S)", israeli: "" }
    },
    {
      id: "card_west",
      name: "מצוף ציון מערבי (West cardinal)",
      shortName: "מערבי",
      region: "A",
      day: { color: "yellow-black-yellow", shape: "pillar", topmark: "cones-point" },
      light: { color: "white", rhythm: "לבן Q(9) כל 15 שנ׳ — תשעה הבהובים ואז הפסקה", frames: [ {ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:300,color:null},{ms:250,color:"white"},{ms:2500,color:null} ] },
      meaning: "עבור ממערב למצוף. צהוב‑שחור‑צהוב, שני חרוטים קודקוד אל קודקוד (מופנים פנימה).",
      ref: { colreg: "IALA R1001 (Cardinal W)", israeli: "" }
    },
    {
      id: "isolated_danger",
      name: "מצוף סכנה מבודדת (Isolated danger)",
      shortName: "סכנה מבודדת",
      region: "A",
      day: { color: "black-red-black", shape: "pillar", topmark: "two-balls" },
      light: { color: "white", rhythm: "לבן Fl(2) — שני הבהובים בקבוצה", frames: [ {ms:300,color:"white"},{ms:300,color:null},{ms:300,color:"white"},{ms:2000,color:null} ] },
      meaning: "מסמן סכנה מבודדת שאפשר לעבור סביבה. שחור עם פס/פסים אדומים רחבים, שני כדורים שחורים בראש.",
      ref: { colreg: "IALA R1001 §2.3", israeli: "" }
    },
    {
      id: "safe_water",
      name: "מצוף מים בטוחים (Safe water)",
      shortName: "מים בטוחים",
      region: "A",
      day: { color: "red-white-vert", shape: "sphere", topmark: "one-ball-red" },
      light: { color: "white", rhythm: "לבן — הבהוב ארוך אחד כל 10 שנ׳ (או איזופאז/מורס A)", frames: [ {ms:1500,color:"white"},{ms:3500,color:null} ] },
      meaning: "מסמן מים בטוחים מסביב (למשל אמצע נתיב). פסים אנכיים אדום‑לבן, כדור אדום אחד בראש.",
      ref: { colreg: "IALA R1001 §2.4", israeli: "" }
    },
    {
      id: "special",
      name: "מצוף מיוחד (Special mark)",
      shortName: "מיוחד",
      region: "A",
      day: { color: "yellow", shape: "pillar", topmark: "x-yellow" },
      light: { color: "yellow", rhythm: "צהוב (כל מקצב שאינו שמור לסימנים אחרים)", frames: [ {ms:400,color:"yellow"},{ms:1400,color:null} ] },
      meaning: "מסמן אזור מיוחד (אזור רחצה, צינור, שטח אש וכד׳) — אינו ניווטי. צהוב, סימן ראש בצורת X צהוב.",
      ref: { colreg: "IALA R1001 §2.5", israeli: "" }
    },
    {
      id: "wreck",
      name: "מצוף סימון מכשול חדש (Emergency wreck)",
      shortName: "מכשול חדש",
      region: "A",
      day: { color: "blue-yellow-vert", shape: "pillar", topmark: "cross-yellow" },
      light: { color: "blue-yellow", rhythm: "כחול וצהוב לסירוגין כל ~3 שנ׳", frames: [ {ms:1000,color:"blue"},{ms:500,color:null},{ms:1000,color:"yellow"},{ms:500,color:null} ] },
      meaning: "מסמן מכשול/טביעה חדשים שטרם סומנו במפות. פסים אנכיים כחול‑צהוב, צלב צהוב זקוף בראש.",
      ref: { colreg: "IALA R1001 §2.6.2", israeli: "" }
    }
  ],

  /* ========================== דגלי קוד בינלאומי (ICS) ==========================
     דגלי אות בודדים נפוצים. 'design' מתאר את הציור (המנוע מצייר לפיו):
       {type:"vert",  colors:[...]}     פסים אנכיים שווים (מהתורן אל הקצה)
       {type:"horiz", colors:[...]}     פסים אופקיים שווים (מלמעלה למטה)
       {type:"horiz3",colors:[a,b,c]}   שלושה פסים אופקיים, האמצעי צר
       {type:"solid", color}            צבע מלא
       {type:"square",field,sq}         ריבוע במרכז
       {type:"circle",field,dot}        עיגול מלא במרכז
       {type:"saltire",field,cross}     צלב אלכסוני (X)
       {type:"diag",a,b}                חלוקה אלכסונית (a עליון‑תורן, b תחתון‑קצה)
       {type:"concentric",colors:[חוץ,אמצע,פנים]}
       swallow:true  → דגל מפוצל‑זנב (A ו‑B בלבד)  */
  flagColors: { white:"#f4f6f8", blue:"#1457b5", red:"#d4322a", yellow:"#ffd21a", black:"#15181c" },
  flags: [
    { letter:"A", phonetic:"אלפא (Alfa)",   meaning:"יש לי צוללן במים — התרחק ממני ועבור במהירות נמוכה.", design:{type:"vert",colors:["white","blue"]}, swallow:true, ref:{colreg:"ICS A", israeli:""} },
    { letter:"B", phonetic:"בראבו (Bravo)", meaning:"אני טוען, פורק או נושא מטען מסוכן.", design:{type:"solid",color:"red"}, swallow:true, ref:{colreg:"ICS B", israeli:""} },
    { letter:"D", phonetic:"דלתא (Delta)",  meaning:"התרחק ממני — אני מתמרן בקושי.", design:{type:"horiz3",colors:["yellow","blue","yellow"]}, ref:{colreg:"ICS D", israeli:""} },
    { letter:"E", phonetic:"אקו (Echo)",    meaning:"אני משנה את הילוכי לימין (starboard).", design:{type:"horiz",colors:["blue","red"]}, ref:{colreg:"ICS E", israeli:""} },
    { letter:"G", phonetic:"גולף (Golf)",   meaning:"אני זקוק לנתב. (כלי דיג: ‘אני מעלה רשתות’)", design:{type:"vert",colors:["yellow","blue","yellow","blue","yellow","blue"]}, ref:{colreg:"ICS G", israeli:""} },
    { letter:"H", phonetic:"הוטל (Hotel)",  meaning:"יש נתב על סיפוני.", design:{type:"vert",colors:["white","red"]}, ref:{colreg:"ICS H", israeli:""} },
    { letter:"I", phonetic:"אינדיה (India)",meaning:"אני משנה את הילוכי לשמאל (port).", design:{type:"circle",field:"yellow",dot:"black"}, ref:{colreg:"ICS I", israeli:""} },
    { letter:"J", phonetic:"ג׳ולייט (Juliett)", meaning:"אני בוער ונושא מטען מסוכן — התרחק ממני.", design:{type:"horiz",colors:["blue","white","blue"]}, ref:{colreg:"ICS J", israeli:""} },
    { letter:"O", phonetic:"אוסקר (Oscar)", meaning:"אדם נפל למים (Man overboard).", design:{type:"diag",a:"red",b:"yellow"}, ref:{colreg:"ICS O", israeli:""} },
    { letter:"P", phonetic:"פאפא (Papa)",   meaning:"כל אנשי הצוות יתייצבו — הכלי עומד להפליג (‘הדגל הכחול’).", design:{type:"square",field:"blue",sq:"white"}, ref:{colreg:"ICS P", israeli:""} },
    { letter:"Q", phonetic:"קובק (Quebec)", meaning:"כלי השיט שלי תקין — אני מבקש אישור כניסה חופשי (free pratique).", design:{type:"solid",color:"yellow"}, ref:{colreg:"ICS Q", israeli:""} },
    { letter:"S", phonetic:"סיירה (Sierra)",meaning:"אני מפעיל הנעה לאחור.", design:{type:"square",field:"white",sq:"blue"}, ref:{colreg:"ICS S", israeli:""} },
    { letter:"V", phonetic:"ויקטור (Victor)",meaning:"אני זקוק לסיוע.", design:{type:"saltire",field:"white",cross:"red"}, ref:{colreg:"ICS V", israeli:""} },
    { letter:"W", phonetic:"ויסקי (Whiskey)",meaning:"אני זקוק לסיוע רפואי.", design:{type:"concentric",colors:["blue","white","red"]}, ref:{colreg:"ICS W", israeli:""} },
    { letter:"C", phonetic:"צ׳רלי (Charlie)", meaning:"כן (חיוב); אישור.", design:{type:"horiz",colors:["blue","white","red","white","blue"]}, ref:{colreg:"ICS C", israeli:""} },
    { letter:"F", phonetic:"פוקסטרוט (Foxtrot)", meaning:"אני מושבת (תקול); צור עמי קשר.", design:{type:"diamond",field:"white",diamond:"red"}, ref:{colreg:"ICS F", israeli:""} },
    { letter:"K", phonetic:"קילו (Kilo)", meaning:"ברצוני ליצור עמך קשר.", design:{type:"vert",colors:["yellow","blue"]}, ref:{colreg:"ICS K", israeli:""} },
    { letter:"L", phonetic:"לימה (Lima)", meaning:"עצור את כלי השיט שלך מיד.", design:{type:"quarters",a:"yellow",b:"black"}, ref:{colreg:"ICS L", israeli:""} },
    { letter:"M", phonetic:"מייק (Mike)", meaning:"כלי השיט שלי עומד ואינו מתקדם במים.", design:{type:"saltire",field:"blue",cross:"white"}, ref:{colreg:"ICS M", israeli:""} },
    { letter:"N", phonetic:"נובמבר (November)", meaning:"לא (שלילה). דגלים N מעל C יחד = אות מצוקה.", design:{type:"checker",a:"blue",b:"white"}, ref:{colreg:"ICS N", israeli:""} },
    { letter:"T", phonetic:"טנגו (Tango)", meaning:"התרחק ממני; אני עוסק בדיג מכמורת בצמדים.", design:{type:"vert",colors:["red","white","blue"]}, ref:{colreg:"ICS T", israeli:""} },
    { letter:"U", phonetic:"יוניפורם (Uniform)", meaning:"אתה מתקדם לעבר סכנה.", design:{type:"quarters",a:"red",b:"white"}, ref:{colreg:"ICS U", israeli:""} },
    { letter:"X", phonetic:"אקס־ריי (X-ray)", meaning:"עצור בביצוע כוונותיך ושים לב לאותותיי.", design:{type:"cross",field:"white",cross:"blue"}, ref:{colreg:"ICS X", israeli:""} },
    { letter:"Y", phonetic:"יאנקי (Yankee)", meaning:"אני גורר את עוגני (העוגן נגרר).", design:{type:"diagstripes",a:"yellow",b:"red"}, ref:{colreg:"ICS Y", israeli:""} },
    { letter:"Z", phonetic:"זולו (Zulu)", meaning:"דרושה לי גוררת. (מכלי דיג בשטחי דיג: אני פורש רשתות.)", design:{type:"zquad",top:"yellow",side1:"blue",bottom:"red",side2:"black"}, ref:{colreg:"ICS Z", israeli:""} }
  ],

  /* ========================== תרחישי זכות קדימה (לסימולטור) ========================== */
  /* כל תרחיש: שני כלי שיט עם מיקום וכיוון בלוח 360×360 (0,0 שמאל‑עליון).
     heading: וקטור כיוון יחידה {x,y} (y חיובי = כלפי מטה במסך).
     spd:     מקדם מהירות יחסי (ברירת מחדל 1) — לעוקף נותנים יותר.
     giveWay: מי נותן זכות קדימה: "A" / "B" / "both".
     solution: נתיבי התיקון הנכונים (להדגמת ‘הצג פתרון’).
     expected: התמרון הנדרש מכל כלי שיט — לפיו נבדק השרטוט של המשתמש:
       role:    "give-way" (חייב לתמרן) / "stand-on" (חייב לשמור נתיב)
       turn:    "starboard" / "port" / "either"  (כיוון הפנייה הנדרש; ל‑give-way בלבד)
       minTurnDeg: גודל הפנייה המינימלי שנחשב ‘פעולה ברורה’ (תקנה 16)
       passAstern: "A"/"B" — חובה לחלוף מאחורי כלי השיט הזה (לא לחצות מלפניו)
       keepClear:  "A"/"B" — חובה להתרחק (ללא דרישת כיוון; למשל בעקיפה) */
  scenarios: [
    {
      id: "sc_headon",
      title: "חזית מול חזית — שני כלי שיט ממונעים",
      ref: { colreg: "Rule 14", israeli: "" },
      A: { class: "power", x: 180, y: 300, heading: { x: 0, y: -1 }, label: "כלי שיט א׳" },
      B: { class: "power", x: 180, y: 60,  heading: { x: 0, y: 1 },  label: "כלי שיט ב׳" },
      giveWay: "both",
      explain: "מצב חזית מול חזית: כל אחד יסטה ימינה ויחלפו צד‑שמאל אל צד‑שמאל.",
      solution: { A: { x: 250, y: 80 }, B: { x: 110, y: 280 } },
      expected: {
        A: { role: "give-way", turn: "starboard", minTurnDeg: 15 },
        B: { role: "give-way", turn: "starboard", minTurnDeg: 15 }
      }
    },
    {
      id: "sc_crossing",
      title: "חיתוך נתיבים — כלי השיט האחר בצד ימין",
      ref: { colreg: "Rule 15", israeli: "" },
      A: { class: "power", x: 180, y: 300, heading: { x: 0, y: -1 }, label: "כלי שיט א׳ (אתה)" },
      B: { class: "power", x: 320, y: 170, heading: { x: -1, y: 0 }, label: "כלי שיט ב׳" },
      giveWay: "A",
      explain: "כלי שיט ב׳ נמצא בצד ימין של א׳ → א׳ נותן זכות קדימה, פונה ימינה וחולף מאחורי ב׳ (אסור לחצות לפניו).",
      solution: { A: { x: 300, y: 235 }, B: { x: 40, y: 170 } },
      expected: {
        A: { role: "give-way", turn: "starboard", minTurnDeg: 15, passAstern: "B" },
        B: { role: "stand-on" }
      }
    },
    {
      id: "sc_overtaking",
      title: "עקיפה — מתקרב מאחור",
      ref: { colreg: "Rule 13", israeli: "" },
      A: { class: "power", x: 180, y: 320, heading: { x: 0, y: -1 }, spd: 1.7, label: "כלי שיט א׳ (העוקף, מהיר יותר)" },
      B: { class: "power", x: 180, y: 170, heading: { x: 0, y: -1 }, label: "כלי שיט ב׳ (הנעקף)" },
      giveWay: "A",
      explain: "א׳ מהיר יותר ועוקף את ב׳ מאחור → א׳ חייב להתרחק ולחלוף בבטחה מצד ב׳. ב׳ שומר נתיב ומהירות. (אם א׳ ימשיך ישר במהירותו — יפגע בב׳.)",
      solution: { A: { x: 275, y: 60 }, B: { x: 180, y: 40 } },
      expected: {
        A: { role: "give-way", turn: "either", minTurnDeg: 15, keepClear: "B" },
        B: { role: "stand-on" }
      }
    },
    {
      id: "sc_power_vs_sail",
      title: "ממונע מול מפרשית",
      ref: { colreg: "Rule 18", israeli: "" },
      A: { class: "power", x: 180, y: 300, heading: { x: 0, y: -1 }, label: "כלי שיט ממונע (א׳)" },
      B: { class: "sail",  x: 320, y: 170, heading: { x: -1, y: 0 }, windSide: "stbd", label: "מפרשית (ב׳)" },
      giveWay: "A",
      explain: "כלי שיט ממונע נותן זכות קדימה למפרשית (תקנה 18). הממונע מתמרן (פונה ימינה וחולף מאחורי המפרשית) והמפרשית שומרת נתיב.",
      solution: { A: { x: 300, y: 235 }, B: { x: 40, y: 170 } },
      expected: {
        A: { role: "give-way", turn: "either", minTurnDeg: 15, passAstern: "B" },
        B: { role: "stand-on" }
      }
    },
    {
      id: "sc_sail_diff_tack",
      title: "שתי מפרשיות — הרוח בצדדים שונים",
      ref: { colreg: "Rule 12", israeli: "" },
      A: { class: "sail", x: 180, y: 300, heading: { x: 0, y: -1 }, windSide: "port", label: "מפרשית א׳ (רוח משמאל)" },
      B: { class: "sail", x: 320, y: 170, heading: { x: -1, y: 0 }, windSide: "stbd", label: "מפרשית ב׳ (רוח מימין)" },
      giveWay: "A",
      explain: "לא׳ הרוח בצד שמאל (port tack) ולב׳ הרוח בצד ימין (starboard tack) → א׳ נותנת זכות קדימה, פונה ימינה וחולפת מאחורי ב׳.",
      solution: { A: { x: 300, y: 235 }, B: { x: 40, y: 170 } },
      expected: {
        A: { role: "give-way", turn: "either", minTurnDeg: 15, passAstern: "B" },
        B: { role: "stand-on" }
      }
    },
    {
      id: "sc_sail_same_tack",
      title: "שתי מפרשיות — הרוח באותו צד",
      ref: { colreg: "Rule 12", israeli: "" },
      A: { class: "sail", x: 180, y: 300, heading: { x: 0, y: -1 }, windSide: "stbd", label: "מפרשית א׳ (לרוח/windward)" },
      B: { class: "sail", x: 320, y: 170, heading: { x: -1, y: 0 }, windSide: "stbd", label: "מפרשית ב׳ (מתחת לרוח/leeward)" },
      giveWay: "A",
      explain: "לשתיהן הרוח באותו צד → הכלי שלרוח (windward, א׳) נותן זכות קדימה לכלי שמתחת לרוח (leeward, ב׳).",
      solution: { A: { x: 300, y: 235 }, B: { x: 40, y: 170 } },
      expected: {
        A: { role: "give-way", turn: "either", minTurnDeg: 15, passAstern: "B" },
        B: { role: "stand-on" }
      }
    },
    {
      id: "sc_power_vs_fishing",
      title: "ממונע מול כלי שיט עוסק בדיג",
      ref: { colreg: "Rule 18", israeli: "" },
      A: { class: "power",   x: 180, y: 300, heading: { x: 0, y: -1 }, label: "כלי שיט ממונע (א׳)" },
      B: { class: "fishing", x: 320, y: 170, heading: { x: -1, y: 0 }, label: "עוסק בדיג (ב׳)" },
      giveWay: "A",
      explain: "כלי שיט ממונע נותן זכות קדימה לכלי שיט עוסק בדיג (תקנה 18). הממונע פונה וחולף מאחורי כלי הדיג.",
      solution: { A: { x: 300, y: 235 }, B: { x: 40, y: 170 } },
      expected: {
        A: { role: "give-way", turn: "either", minTurnDeg: 15, passAstern: "B" },
        B: { role: "stand-on" }
      }
    }
  ]

};
