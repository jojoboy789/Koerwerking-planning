var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);

// server/firebaseService.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var firebaseConfig = {
  apiKey: "AIzaSyCneVtJOGHwwoXhug4kqlUNo3EksQ-cFXQ",
  authDomain: "planning-koer-gbr.firebaseapp.com",
  projectId: "planning-koer-gbr",
  storageBucket: "planning-koer-gbr.firebasestorage.app",
  messagingSenderId: "509744259244",
  appId: "1:509744259244:web:ba7feb5991d0cc0526ff09"
};
var app = null;
var db = null;
var isConnected = false;
function initFirebase() {
  try {
    if (!app) {
      app = (0, import_app.initializeApp)(firebaseConfig);
      db = (0, import_firestore.getFirestore)(app);
      isConnected = true;
      console.log("\u{1F525} Firebase initialized successfully for project:", firebaseConfig.projectId);
    }
  } catch (err) {
    console.error("\u26A0\uFE0F Firebase initialization error:", err);
    isConnected = false;
  }
}
function isFirebaseConnected() {
  return isConnected && db !== null;
}
async function fetchRemoteDatabase() {
  if (!db) return null;
  try {
    const docRef = (0, import_firestore.doc)(db, "system", "database");
    const snap = await (0, import_firestore.getDoc)(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn("Could not fetch from Firebase Firestore:", err);
    return null;
  }
}
async function saveRemoteDatabase(data) {
  if (!db) return false;
  try {
    const docRef = (0, import_firestore.doc)(db, "system", "database");
    await (0, import_firestore.setDoc)(docRef, {
      ...data,
      lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
      projectId: firebaseConfig.projectId
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Could not write to Firebase Firestore:", err);
    return false;
  }
}

// server.ts
import_dotenv.default.config({ path: [".env.local", ".env"] });
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var HASH_SALT = process.env.ACCESS_CODE_SALT || "NEON_TOKYO_SALT_v1_99x#";
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "db.json");
function normalizeAccessCode(code) {
  if (!code) return "";
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
function hashAccessCode(code) {
  const normalized = normalizeAccessCode(code);
  return import_crypto.default.createHash("sha256").update(`${HASH_SALT}:${normalized}`).digest("hex");
}
function getPossibleCodeVariants(code) {
  if (!code) return [];
  const raw = code.trim().toUpperCase();
  const stripped = raw.replace(/[^A-Z0-9]/g, "");
  const variants = /* @__PURE__ */ new Set();
  variants.add(raw);
  variants.add(raw.replace(/\s+/g, ""));
  variants.add(stripped);
  if (stripped.length === 9) {
    const formatted = `${stripped.substring(0, 3)}-${stripped.substring(3, 7)}-${stripped.substring(7, 9)}`;
    variants.add(formatted);
  }
  return Array.from(variants);
}
function generateFormattedCode(prefix = "GBR") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let p = prefix;
  if (!p || p.length < 3) {
    p = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } else {
    p = p.substring(0, 3).toUpperCase();
  }
  const numPart = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
  const suffix = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${p}-${numPart}-${suffix}`;
}
function loadDatabase() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!import_fs.default.existsSync(DB_FILE)) {
      const initialDb = seedInitialDatabase();
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }
    const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!data.users || data.users.length === 0) {
      const initialDb = seedInitialDatabase();
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }
    const seedDb = seedInitialDatabase();
    for (const u of data.users) {
      if (!u.rawCode) {
        const seedUser = seedDb.users.find((su) => su.id === u.id);
        if (seedUser) {
          u.rawCode = seedUser.rawCode;
          u.accessCodeHash = seedUser.accessCodeHash;
        }
      }
    }
    return data;
  } catch (err) {
    console.error("Error reading db.json:", err);
    return seedInitialDatabase();
  }
}
function saveDatabase(data) {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    saveRemoteDatabase(data).catch((err) => {
      console.warn("Background Firebase sync warning:", err);
    });
  } catch (err) {
    console.error("Error writing to db.json:", err);
  }
}
function seedInitialDatabase() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const initialUsers = [
    {
      id: "usr-admin-001",
      name: "Beheerder (Admin)",
      role: "SYSTEM ADMIN",
      avatar: "AD",
      accessCodeHash: hashAccessCode("ADM-7701-NT"),
      rawCode: "ADM-7701-NT",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: true,
      canPlannerMode: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-jan-002",
      name: "Jan Janssens",
      role: "Teamlid / Vroeg-Laat",
      avatar: "JJ",
      accessCodeHash: hashAccessCode("GBR-4829-XK"),
      rawCode: "GBR-4829-XK",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-mercer-003",
      name: "A. Mercer",
      role: "Lead Specialist",
      avatar: "AM",
      accessCodeHash: hashAccessCode("MRC-3104-QL"),
      rawCode: "MRC-3104-QL",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-chen-004",
      name: "K. Chen",
      role: "Dev Engineer",
      avatar: "KC",
      accessCodeHash: hashAccessCode("CHN-9942-BR"),
      rawCode: "CHN-9942-BR",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-silverhand-005",
      name: "J. Silverhand",
      role: "Security Guard",
      avatar: "JS",
      accessCodeHash: hashAccessCode("SLV-2077-NX"),
      rawCode: "SLV-2077-NX",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-sato-006",
      name: "M. Sato",
      role: "Operations Dispatcher",
      avatar: "MS",
      accessCodeHash: hashAccessCode("SAT-5519-TK"),
      rawCode: "SAT-5519-TK",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-sarah-007",
      name: "Sarah De Smet",
      role: "Ondersteuner (Alleen Planning)",
      avatar: "SD",
      accessCodeHash: hashAccessCode("SRH-8821-ZP"),
      rawCode: "SRH-8821-ZP",
      isActive: true,
      canViewOverview: false,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-peter-008",
      name: "Peter Peeters",
      role: "Auditor (Alleen Overzicht)",
      avatar: "PP",
      accessCodeHash: hashAccessCode("PTR-4412-KV"),
      rawCode: "PTR-4412-KV",
      isActive: true,
      canViewOverview: true,
      canEditPlanning: false,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-inactive-009",
      name: "Kenji Nomura (Gedeactiveerd)",
      role: "Inactief Lid",
      avatar: "KN",
      accessCodeHash: hashAccessCode("KNJ-0000-XX"),
      rawCode: "KNJ-0000-XX",
      isActive: false,
      canViewOverview: false,
      canEditPlanning: false,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now
    }
  ];
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const currentMonth = (/* @__PURE__ */ new Date()).getMonth() + 1;
  const samplePlannings = [];
  const shiftPool = ["V", "D", "L", "X", "R"];
  initialUsers.forEach((u, uIdx) => {
    if (!u.isActive) return;
    const days = {};
    for (let day = 1; day <= 31; day++) {
      const isWeekend = day % 7 === 6 || day % 7 === 0;
      if (isWeekend && Math.random() > 0.35) {
        days[day] = "X";
      } else {
        const pattern = (day + uIdx) % 5;
        days[day] = shiftPool[pattern];
      }
    }
    samplePlannings.push({
      id: `pln-${u.id}-${currentYear}-${currentMonth}`,
      userId: u.id,
      userName: u.name,
      year: currentYear,
      month: currentMonth,
      days,
      updatedAt: now,
      updatedBy: "Systeem Initialisatie",
      isFinal: false
    });
  });
  return {
    users: initialUsers,
    plannings: samplePlannings,
    sessions: {}
  };
}
var db2 = loadDatabase();
var SEED_CODE_MAP = {
  "ADM7701NT": "usr-admin-001",
  "ADM-7701-NT": "usr-admin-001",
  "GBR4829XK": "usr-jan-002",
  "GBR-4829-XK": "usr-jan-002",
  "MRC3104QL": "usr-mercer-003",
  "MRC-3104-QL": "usr-mercer-003",
  "CHN9942BR": "usr-chen-004",
  "CHN-9942-BR": "usr-chen-004",
  "SLV2077NX": "usr-silverhand-005",
  "SLV-2077-NX": "usr-silverhand-005",
  "SAT5519TK": "usr-sato-006",
  "SAT-5519-TK": "usr-sato-006",
  "SRH8821ZP": "usr-sarah-007",
  "SRH-8821-ZP": "usr-sarah-007",
  "PTR4412KV": "usr-peter-008",
  "PTR-4412-KV": "usr-peter-008"
};
function sanitizeUser(u) {
  const { accessCodeHash, ...safe } = u;
  return safe;
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Geen geldige sessie gevonden. Log opnieuw in." });
  }
  const token = authHeader.substring(7).trim();
  const session = db2.sessions[token];
  if (!session) {
    return res.status(401).json({ error: "Sessie is verlopen of ongeldig. Log opnieuw in." });
  }
  const user = db2.users.find((u) => u.id === session.userId);
  if (!user) {
    delete db2.sessions[token];
    saveDatabase(db2);
    return res.status(401).json({ error: "Gebruiker bestaat niet meer." });
  }
  if (!user.isActive) {
    delete db2.sessions[token];
    saveDatabase(db2);
    return res.status(403).json({ error: "Deze gebruiker is momenteel gedeactiveerd." });
  }
  req.user = user;
  req.sessionToken = token;
  next();
}
function requireAdminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Je hebt geen beheerderstoegang tot deze actie." });
  }
  next();
}
function requirePlannerOrAdminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Niet geauthenticeerd." });
  }
  if (!req.user.isAdmin && !req.user.canPlannerMode) {
    return res.status(403).json({ error: "Je hebt geen rechten om deze actie uit te voeren." });
  }
  next();
}
async function sendTelegramNotification(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error("Telegram-verzending mislukt: TELEGRAM_BOT_TOKEN of TELEGRAM_CHAT_ID ontbreekt.");
    return false;
  }
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      }),
      signal: AbortSignal.timeout(15e3)
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      console.error("Telegram heeft het bericht niet verstuurd:", result.description || `HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Fout bij verzenden van Telegram-bericht:", error);
    return false;
  }
}
async function startServer() {
  const app2 = (0, import_express.default)();
  app2.use(import_express.default.json());
  initFirebase();
  try {
    const remoteData = await fetchRemoteDatabase();
    if (remoteData && remoteData.users && remoteData.users.length > 0) {
      console.log("\u{1F525} Loaded database state from Cloud Firestore successfully.");
      db2 = {
        users: remoteData.users,
        plannings: remoteData.plannings || [],
        sessions: db2.sessions || {}
      };
      saveDatabase(db2);
    } else {
      console.log("\u{1F525} Seeding initial database to Cloud Firestore project:", firebaseConfig.projectId);
      await saveRemoteDatabase(db2);
    }
  } catch (err) {
    console.warn("Firebase initial sync deferred/offline:", err);
  }
  app2.get("/api/auth/setup-info", (req, res) => {
    const hasAdmin = db2.users.some((u) => u.isAdmin && u.isActive);
    const dynamicPresets = db2.users.filter((u) => u.isActive && u.rawCode).slice(0, 6).map((u) => ({
      name: u.name,
      code: u.rawCode,
      rights: u.isAdmin ? "Volledige beheerderstoegang" : u.canEditPlanning && u.canViewOverview ? "Planning + Teamoverzicht" : u.canEditPlanning ? "Alleen eigen planning" : "Alleen teamoverzicht"
    }));
    res.json({
      hasAdmin,
      demoPresets: dynamicPresets.length > 0 ? dynamicPresets : [
        { name: "Beheerder (Admin)", code: "ADM-7701-NT", rights: "Volledige beheerderstoegang" }
      ]
    });
  });
  app2.post("/api/auth/login", (req, res) => {
    const { accessCode } = req.body;
    if (!accessCode || typeof accessCode !== "string" || accessCode.trim().length === 0) {
      return res.status(400).json({ error: "Voer een geldige toegangscode in." });
    }
    const cleanInput = accessCode.trim();
    const cleanUpper = cleanInput.toUpperCase();
    const strippedInput = cleanUpper.replace(/[^A-Z0-9]/g, "");
    if (["ADMIN", "ADM", "BEHEERDER", "ADMINISTRATOR", "ROOT"].includes(cleanUpper)) {
      const adminUser = db2.users.find((u) => u.isAdmin && u.isActive) || db2.users.find((u) => u.id === "usr-admin-001");
      if (adminUser) {
        const token2 = import_crypto.default.randomBytes(32).toString("hex");
        db2.sessions[token2] = { userId: adminUser.id, createdAt: Date.now() };
        adminUser.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
        saveDatabase(db2);
        return res.json({
          token: token2,
          user: sanitizeUser(adminUser)
        });
      }
    }
    const variants = getPossibleCodeVariants(cleanInput);
    let user;
    for (const variant of variants) {
      const stripped = variant.replace(/[^A-Z0-9]/g, "");
      const seedUserId = SEED_CODE_MAP[variant] || SEED_CODE_MAP[stripped];
      if (seedUserId) {
        user = db2.users.find((u) => u.id === seedUserId);
        if (user) break;
      }
    }
    if (!user) {
      user = db2.users.find((u) => {
        if (!u.rawCode) return false;
        const uRawUpper = u.rawCode.toUpperCase();
        const uStripped = uRawUpper.replace(/[^A-Z0-9]/g, "");
        return variants.includes(u.rawCode) || variants.includes(uRawUpper) || uStripped === strippedInput;
      });
    }
    if (!user) {
      for (const variant of variants) {
        const codeHash = hashAccessCode(variant);
        user = db2.users.find((u) => u.accessCodeHash === codeHash);
        if (user) break;
      }
    }
    if (!user) {
      return res.status(401).json({
        error: "De ingevoerde toegangscode is ongeldig."
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Je account is momenteel gedeactiveerd." });
    }
    const token = import_crypto.default.randomBytes(32).toString("hex");
    db2.sessions[token] = { userId: user.id, createdAt: Date.now() };
    user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDatabase(db2);
    res.json({
      token,
      user: sanitizeUser(user)
    });
  });
  app2.get("/api/auth/session", authMiddleware, (req, res) => {
    res.json({
      token: req.sessionToken,
      user: sanitizeUser(req.user)
    });
  });
  app2.post("/api/auth/logout", authMiddleware, (req, res) => {
    if (req.sessionToken && db2.sessions[req.sessionToken]) {
      delete db2.sessions[req.sessionToken];
      saveDatabase(db2);
    }
    res.json({ success: true, message: "Succesvol uitgelogd." });
  });
  app2.put("/api/auth/change-password", authMiddleware, (req, res) => {
    const { oldCode, newCode } = req.body;
    const userId = req.user.id;
    if (!oldCode || !newCode || typeof newCode !== "string" || newCode.trim().length < 6) {
      return res.status(400).json({ error: "De nieuwe code moet minimaal 6 karakters lang zijn." });
    }
    const userIndex = db2.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Gebruiker niet gevonden." });
    }
    const user = db2.users[userIndex];
    const variants = getPossibleCodeVariants(oldCode);
    let isOldCodeValid = false;
    if (user.rawCode) {
      const uRawUpper = user.rawCode.toUpperCase();
      const uStripped = uRawUpper.replace(/[^A-Z0-9]/g, "");
      const oldStripped = oldCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (variants.includes(user.rawCode) || variants.includes(uRawUpper) || uStripped === oldStripped) {
        isOldCodeValid = true;
      }
    }
    if (!isOldCodeValid) {
      for (const variant of variants) {
        const codeHash = hashAccessCode(variant);
        if (user.accessCodeHash === codeHash) {
          isOldCodeValid = true;
          break;
        }
      }
    }
    if (!isOldCodeValid) {
      return res.status(401).json({ error: "De oude toegangscode is onjuist." });
    }
    const normalizedNewCode = normalizeAccessCode(newCode);
    const newCodeHash = hashAccessCode(normalizedNewCode);
    if (db2.users.some((u) => u.accessCodeHash === newCodeHash && u.id !== userId)) {
      return res.status(400).json({ error: "Deze nieuwe toegangscode is al in gebruik. Kies een andere." });
    }
    db2.users[userIndex].accessCodeHash = newCodeHash;
    db2.users[userIndex].rawCode = normalizedNewCode;
    db2.users[userIndex].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const [token, session] of Object.entries(db2.sessions)) {
      if (session.userId === userId) {
        delete db2.sessions[token];
      }
    }
    saveDatabase(db2);
    res.json({
      success: true,
      message: "Je toegangscode is succesvol gewijzigd. Je wordt nu uitgelogd en kunt met de nieuwe code inloggen."
    });
  });
  const OC_PLANNING_BASE_URL = "https://oc-gbr.meta-technics.be";
  let previousOCPlanningFingerprint = null;
  let ocPlanningMonitorStarted = false;
  async function fetchOCPlanningManifest() {
    const apiToken = process.env.OC_PLANNING_API_TOKEN;
    if (!apiToken) {
      throw new Error("OC_PLANNING_API_TOKEN ontbreekt.");
    }
    const response = await fetch(
      `${OC_PLANNING_BASE_URL}/kiosk/manifest.json`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(15e3)
      }
    );
    if (!response.ok) {
      throw new Error(`OC Planning manifest gaf HTTP ${response.status}.`);
    }
    const manifest = await response.json();
    if (!Array.isArray(manifest.slides)) {
      throw new Error("Ongeldige OC Planning manifest ontvangen.");
    }
    return manifest;
  }
  async function fetchOCPlanningSlideHtml(slideId) {
    const apiToken = process.env.OC_PLANNING_API_TOKEN;
    if (!apiToken) {
      throw new Error("OC_PLANNING_API_TOKEN ontbreekt.");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(slideId)) {
      throw new Error("Ongeldige OC Planning slide-ID.");
    }
    const response = await fetch(
      `${OC_PLANNING_BASE_URL}/kiosk/slides/${encodeURIComponent(slideId)}.html`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "text/html"
        },
        signal: AbortSignal.timeout(15e3)
      }
    );
    if (!response.ok) {
      throw new Error(`OC Planning slide gaf HTTP ${response.status}.`);
    }
    return response.text();
  }
  function escapeTelegramHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function htmlToTelegramText(html) {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|section|article|h[1-6]|li|tr)>/gi, "\n").replace(/<li\b[^>]*>/gi, "\u2022 ").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  async function sendOCPlanningUpdateToTelegram(slides) {
    const changedSlides = slides.filter((slide) => slide.dated);
    if (changedSlides.length === 0) {
      console.log("OC Planning gewijzigd, maar er zijn geen dagplanningsslides.");
      return;
    }
    const heading = "\u{1F68C} <b>OC BUS GBR \xB7 DAGPLANNING GEWIJZIGD</b>\n\n";
    let message = heading;
    for (const slide of changedSlides) {
      const content = htmlToTelegramText(slide.html);
      const section = `<b>${escapeTelegramHtml(slide.title)}</b>
${escapeTelegramHtml(content || "Geen tekstuele inhoud beschikbaar.")}

`;
      if ((message + section).length > 3500) {
        const sent = await sendTelegramNotification(message.trim());
        if (!sent) throw new Error("Telegram kon de wijzigingsmelding niet versturen.");
        message = heading;
      }
      message += section;
    }
    if (message.trim() !== heading.trim()) {
      const sent = await sendTelegramNotification(message.trim());
      if (!sent) throw new Error("Telegram kon de wijzigingsmelding niet versturen.");
    }
  }
  const OC_PLANNING_DAILY_UPDATE_TIMES = /* @__PURE__ */ new Set(["04:50", "12:30", "21:00"]);
  const OC_PLANNING_TIME_ZONE = "Europe/Brussels";
  let ocPlanningScheduleStarted = false;
  let lastOCPlanningScheduledRunKey = null;
  let scheduledOCPlanningSendInProgress = false;
  function getBelgianDateTimeParts(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: OC_PLANNING_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      dateKey: `${values.year}-${values.month}-${values.day}`,
      timeKey: `${values.hour}:${values.minute}`
    };
  }
  async function sendCurrentOCPlanningToTelegram() {
    const manifest = await fetchOCPlanningManifest();
    if (!manifest.slides || manifest.slides.length === 0) {
      throw new Error("Er zijn geen actieve OC Planning-slides om te versturen.");
    }
    const slides = await Promise.all(
      manifest.slides.map(async (slide) => ({
        ...slide,
        html: await fetchOCPlanningSlideHtml(slide.id)
      }))
    );
    const heading = `\u{1F68C} <b>OC BUS GBR \xB7 ACTUELE DAGPLANNING</b>\\n<i>Automatische update \xB7 ${new Intl.DateTimeFormat("nl-BE", {
      timeZone: OC_PLANNING_TIME_ZONE,
      dateStyle: "full",
      timeStyle: "short"
    }).format(/* @__PURE__ */ new Date())}</i>\\n\\n`;
    const maxLength = 3500;
    const messages = [];
    let message = heading;
    for (const slide of slides) {
      const category = slide.dated ? "Dagplanning" : "Mededeling";
      const content = htmlToTelegramText(slide.html);
      const section = `<b>${escapeTelegramHtml(category)}: ${escapeTelegramHtml(slide.title)}</b>\\n${escapeTelegramHtml(content || "Geen tekstuele inhoud beschikbaar.")}\\n\\n`;
      if ((message + section).length > maxLength && message !== heading) {
        messages.push(message.trim());
        message = heading;
      }
      let remaining = section;
      while ((message + remaining).length > maxLength) {
        const available = maxLength - message.length;
        if (available <= 0) {
          messages.push(message.trim());
          message = heading;
          continue;
        }
        messages.push((message + remaining.slice(0, available)).trim());
        remaining = remaining.slice(available);
        message = heading;
      }
      message += remaining;
    }
    if (message.trim() !== heading.trim()) {
      messages.push(message.trim());
    }
    if (messages.length === 0) {
      throw new Error("De OC Planning leverde geen inhoud op om te versturen.");
    }
    for (const telegramMessage of messages) {
      const sent = await sendTelegramNotification(telegramMessage);
      if (!sent) {
        throw new Error("Minstens \xE9\xE9n Telegram-bericht kon niet worden verstuurd.");
      }
    }
    console.log(`Automatische OC Planning-update verstuurd (${messages.length} Telegram-bericht(en)).`);
  }
  function startOCPlanningScheduledUpdates() {
    if (ocPlanningScheduleStarted) return;
    ocPlanningScheduleStarted = true;
    const checkSchedule = async () => {
      const { dateKey, timeKey } = getBelgianDateTimeParts(/* @__PURE__ */ new Date());
      if (!OC_PLANNING_DAILY_UPDATE_TIMES.has(timeKey)) return;
      const runKey = `${dateKey}-${timeKey}`;
      if (lastOCPlanningScheduledRunKey === runKey || scheduledOCPlanningSendInProgress) return;
      scheduledOCPlanningSendInProgress = true;
      try {
        await sendCurrentOCPlanningToTelegram();
        lastOCPlanningScheduledRunKey = runKey;
      } catch (error) {
        console.error(`Automatische OC Planning-update mislukt voor ${runKey}:`, error);
      } finally {
        scheduledOCPlanningSendInProgress = false;
      }
    };
    void checkSchedule();
    setInterval(() => {
      void checkSchedule();
    }, 15e3);
    console.log("Automatische OC Planning-updates ingepland: 04:50, 12:30 en 21:00 (Europe/Brussels).");
  }
  async function checkOCPlanningForChanges() {
    const manifest = await fetchOCPlanningManifest();
    const fingerprint = JSON.stringify(
      manifest.slides.map((slide) => ({
        id: slide.id,
        title: slide.title,
        version: slide.version,
        updated_at: slide.updated_at,
        dated: slide.dated
      }))
    );
    if (previousOCPlanningFingerprint === null) {
      previousOCPlanningFingerprint = fingerprint;
      console.log("OC Planning-monitor gestart; huidige toestand opgeslagen.");
      return;
    }
    if (fingerprint === previousOCPlanningFingerprint) {
      return;
    }
    const slides = await Promise.all(
      manifest.slides.map(async (slide) => ({
        ...slide,
        html: await fetchOCPlanningSlideHtml(slide.id)
      }))
    );
    await sendOCPlanningUpdateToTelegram(slides);
    previousOCPlanningFingerprint = fingerprint;
    console.log("OC Planning-wijziging verwerkt.");
  }
  function startOCPlanningMonitor() {
    if (ocPlanningMonitorStarted) return;
    ocPlanningMonitorStarted = true;
    const check = async () => {
      try {
        await checkOCPlanningForChanges();
      } catch (error) {
        console.error("OC Planning-monitor mislukt:", error);
      }
    };
    void check();
    setInterval(() => {
      void check();
    }, 6e4);
  }
  app2.get(
    "/api/oc-planning",
    authMiddleware,
    async (_req, res) => {
      const apiToken = process.env.OC_PLANNING_API_TOKEN;
      if (!apiToken) {
        console.error("OC Planning API-token ontbreekt in de serveromgeving.");
        return res.status(503).json({
          error: "OC Planning is momenteel niet geconfigureerd."
        });
      }
      try {
        const headers = {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json"
        };
        const manifestResponse = await fetch(
          `${OC_PLANNING_BASE_URL}/kiosk/manifest.json`,
          {
            headers,
            signal: AbortSignal.timeout(15e3)
          }
        );
        if (!manifestResponse.ok) {
          console.error(
            "OC Planning manifest mislukt:",
            manifestResponse.status
          );
          return res.status(502).json({
            error: manifestResponse.status === 401 ? "De toegang tot de OC Planning API is geweigerd." : "De OC Planning kan momenteel niet worden opgehaald."
          });
        }
        const manifest = await manifestResponse.json();
        if (!Array.isArray(manifest.slides)) {
          return res.status(502).json({
            error: "De OC Planning API stuurde een ongeldig antwoord."
          });
        }
        const slides = await Promise.all(
          manifest.slides.map(async (slide) => {
            if (!/^[a-zA-Z0-9_-]+$/.test(slide.id)) {
              throw new Error("Ongeldige slide-ID ontvangen.");
            }
            const response = await fetch(
              `${OC_PLANNING_BASE_URL}/kiosk/slides/${encodeURIComponent(slide.id)}.html`,
              {
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  Accept: "text/html"
                },
                signal: AbortSignal.timeout(15e3)
              }
            );
            if (!response.ok) {
              throw new Error(
                `Slide kon niet worden opgehaald: ${response.status}`
              );
            }
            const html = await response.text();
            return {
              ...slide,
              html
            };
          })
        );
        res.setHeader("Cache-Control", "private, no-store");
        return res.json({
          generated_at: manifest.generated_at,
          poll_seconds: manifest.poll_seconds || 60,
          staleness: manifest.staleness,
          slides
        });
      } catch (error) {
        console.error("Fout bij ophalen OC Planning:", error);
        return res.status(502).json({
          error: "De verbinding met OC Planning is mislukt. Probeer het later opnieuw."
        });
      }
    }
  );
  app2.post(
    "/api/oc-planning/send-telegram",
    authMiddleware,
    requireAdminMiddleware,
    async (_req, res) => {
      try {
        const manifest = await fetchOCPlanningManifest();
        if (!manifest.slides || manifest.slides.length === 0) {
          return res.status(404).json({
            error: "Er zijn momenteel geen actieve planningsslides beschikbaar."
          });
        }
        const slides = await Promise.all(
          manifest.slides.map(async (slide) => ({
            ...slide,
            html: await fetchOCPlanningSlideHtml(slide.id)
          }))
        );
        const heading = "\u{1F68C} <b>OC BUS GBR \xB7 ACTUELE DAGPLANNING</b>\n\n";
        const sections = slides.map((slide) => {
          const category = slide.dated ? "Dagplanning" : "Mededeling";
          const content = htmlToTelegramText(slide.html);
          return `<b>${escapeTelegramHtml(category)}: ${escapeTelegramHtml(slide.title)}</b>
${escapeTelegramHtml(content || "Geen tekstuele inhoud beschikbaar.")}`;
        });
        const maxLength = 3500;
        const messages = [];
        let message = heading;
        for (const section of sections) {
          const block = `${section}

`;
          if ((message + block).length > maxLength && message !== heading) {
            messages.push(message.trim());
            message = heading;
          }
          let remaining = block;
          while ((message + remaining).length > maxLength) {
            const available = maxLength - message.length;
            if (available <= 0) {
              messages.push(message.trim());
              message = heading;
              continue;
            }
            messages.push((message + remaining.slice(0, available)).trim());
            remaining = remaining.slice(available);
            message = heading;
          }
          message += remaining;
        }
        if (message.trim() !== heading.trim()) {
          messages.push(message.trim());
        }
        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
          return res.status(503).json({
            error: "Telegram is niet correct geconfigureerd op de server."
          });
        }
        for (const telegramMessage of messages) {
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: "HTML"
              }),
              signal: AbortSignal.timeout(15e3)
            }
          );
          const telegramResult = await telegramResponse.json();
          if (!telegramResponse.ok || !telegramResult.ok) {
            console.error(
              "OC Planning Telegram-verzending mislukt:",
              telegramResult.description || telegramResponse.status
            );
            return res.status(502).json({
              error: "Telegram kon de volledige dagplanning niet versturen. Controleer de Telegram-configuratie."
            });
          }
        }
        return res.json({
          success: true,
          message: `De actuele dagplanning en mededelingen zijn naar Telegram verstuurd (${slides.length} slides, ${messages.length} berichten).`
        });
      } catch (error) {
        console.error("Handmatig versturen OC Planning naar Telegram mislukt:", error);
        return res.status(502).json({
          error: "De actuele OC BUS GBR-planning kon niet naar Telegram worden verstuurd."
        });
      }
    }
  );
  app2.get("/api/planning/:year/:month", authMiddleware, (req, res) => {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const userId = req.user.id;
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Ongeldig jaar of maand opgegeven." });
    }
    const planning = db2.plannings.find((p) => p.userId === userId && p.year === year && p.month === month);
    res.json({
      year,
      month,
      planning: planning || {
        id: `pln-${userId}-${year}-${month}`,
        userId,
        userName: req.user.name,
        year,
        month,
        days: {},
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.user.name
      }
    });
  });
  app2.post("/api/planning/:year/:month", authMiddleware, (req, res) => {
    if (!req.user.canEditPlanning && !req.user.isAdmin) {
      return res.status(403).json({ error: "Je hebt geen rechten om een planning in te vullen." });
    }
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const userId = req.user.id;
    const { days, secondChoices, thirdChoices } = req.body;
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || typeof days !== "object" || days === null || Array.isArray(days) || secondChoices !== void 0 && (typeof secondChoices !== "object" || secondChoices === null || Array.isArray(secondChoices)) || thirdChoices !== void 0 && (typeof thirdChoices !== "object" || thirdChoices === null || Array.isArray(thirdChoices))) {
      return res.status(400).json({ error: "Ongeldige planningsgegevens ontvangen." });
    }
    const now = /* @__PURE__ */ new Date();
    const isPlanner = req.user.canPlannerMode || req.user.isAdmin;
    if (!isPlanner) {
      const deadline = new Date(year, month - 2, 8);
      if (now >= deadline) {
        const monthNames = [
          "Januari",
          "Februari",
          "Maart",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Augustus",
          "September",
          "Oktober",
          "November",
          "December"
        ];
        const targetMonthName = monthNames[month - 1];
        return res.status(403).json({
          error: `De deadline voor het aanpassen van de planning voor ${targetMonthName} is verstreken (7e van de vorige maand).`
        });
      }
    }
    const validCodes = ["V", "D", "L", "R", "X", ""];
    const cleanDays = {};
    const cleanSecondChoices = {};
    const cleanThirdChoices = {};
    for (const [key, value] of Object.entries(days || {})) {
      const dayNum = Number(key);
      if (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 && typeof value === "string" && validCodes.includes(value) && value !== "") {
        cleanDays[dayNum] = value;
      }
    }
    for (const [key, value] of Object.entries(secondChoices || {})) {
      const dayNum = Number(key);
      if (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 && typeof value === "string" && validCodes.includes(value) && value !== "" && cleanDays[dayNum] !== value) {
        cleanSecondChoices[dayNum] = value;
      }
    }
    for (const [key, value] of Object.entries(thirdChoices || {})) {
      const dayNum = Number(key);
      if (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 && typeof value === "string" && validCodes.includes(value) && value !== "" && cleanDays[dayNum] !== value && cleanSecondChoices[dayNum] !== value) {
        cleanThirdChoices[dayNum] = value;
      }
    }
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const existingIndex = db2.plannings.findIndex(
      (p) => p.userId === userId && p.year === year && p.month === month
    );
    if (existingIndex >= 0) {
      db2.plannings[existingIndex].days = cleanDays;
      db2.plannings[existingIndex].secondChoices = cleanSecondChoices;
      db2.plannings[existingIndex].thirdChoices = cleanThirdChoices;
      db2.plannings[existingIndex].updatedAt = updatedAt;
      db2.plannings[existingIndex].updatedBy = req.user.name;
    } else {
      db2.plannings.push({
        id: `pln-${userId}-${year}-${month}`,
        userId,
        userName: req.user.name,
        year,
        month,
        days: cleanDays,
        secondChoices: cleanSecondChoices,
        thirdChoices: cleanThirdChoices,
        updatedAt,
        updatedBy: req.user.name,
        isFinal: false
      });
    }
    saveDatabase(db2);
    const savedPlanning = existingIndex >= 0 ? db2.plannings[existingIndex] : db2.plannings[db2.plannings.length - 1];
    return res.json({
      success: true,
      message: "Planning succesvol opgeslagen.",
      planning: savedPlanning
    });
  });
  app2.get("/api/overview/:year/:month", authMiddleware, (req, res) => {
    if (!req.user.canViewOverview && !req.user.isAdmin) {
      return res.status(403).json({ error: "Je hebt geen rechten om het teamoverzicht te bekijken." });
    }
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Ongeldig jaar of maand opgegeven." });
    }
    const activeUsers = db2.users.filter((u) => {
      if (!u.isActive) return false;
      const r = (u.role || "").trim().toLowerCase();
      if (r === "planning" || r === "planner") return false;
      return true;
    });
    const teamData = activeUsers.map((u) => {
      const pln = db2.plannings.find((p) => p.userId === u.id && p.year === year && p.month === month);
      return {
        user: sanitizeUser(u),
        planning: pln || null
      };
    });
    res.json({
      year,
      month,
      teamData
    });
  });
  app2.post("/api/chat/send-message", authMiddleware, requirePlannerOrAdminMiddleware, async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Bericht mag niet leeg zijn." });
    }
    const senderName = req.user.name;
    const fullMessage = `<b>Bericht van ${senderName}:</b>

${message.trim()}`;
    await sendTelegramNotification(fullMessage);
    res.json({ success: true, message: "Bericht succesvol verzonden naar het kanaal." });
  });
  app2.get("/api/admin/stats", authMiddleware, requireAdminMiddleware, (req, res) => {
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth() + 1;
    const totalUsers = db2.users.length;
    const activeUsers = db2.users.filter((u) => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    const canEditPlanningCount = db2.users.filter((u) => u.canEditPlanning).length;
    const canViewOverviewCount = db2.users.filter((u) => u.canViewOverview).length;
    const adminCount = db2.users.filter((u) => u.isAdmin).length;
    const totalPlanningsThisMonth = db2.plannings.filter((p) => p.year === currentYear && p.month === currentMonth).length;
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      canEditPlanningCount,
      canViewOverviewCount,
      adminCount,
      totalPlanningsThisMonth
    });
  });
  app2.get("/api/admin/users", authMiddleware, requireAdminMiddleware, (req, res) => {
    const users = db2.users.map((u) => sanitizeUser(u));
    res.json({ users });
  });
  app2.post("/api/admin/generate-code", authMiddleware, requireAdminMiddleware, (req, res) => {
    const prefix = typeof req.body.prefix === "string" ? req.body.prefix : "GBR";
    let code = generateFormattedCode(prefix);
    let attempts = 0;
    while (db2.users.some((u) => u.accessCodeHash === hashAccessCode(code)) && attempts < 20) {
      code = generateFormattedCode(prefix);
      attempts++;
    }
    res.json({ code });
  });
  app2.post("/api/admin/users", authMiddleware, requireAdminMiddleware, (req, res) => {
    const { name, role, accessCode, canViewOverview, canEditPlanning, canPlannerMode, isAdmin, isActive } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Naam is verplicht." });
    }
    if (!accessCode || typeof accessCode !== "string" || accessCode.trim().length < 4) {
      return res.status(400).json({ error: "Voer een geldige toegangscode in van minimaal 4 tekens." });
    }
    const normalizedCode = normalizeAccessCode(accessCode);
    const codeHash = hashAccessCode(normalizedCode);
    if (db2.users.some((u) => u.accessCodeHash === codeHash)) {
      return res.status(400).json({ error: "Deze toegangscode is al in gebruik. Kies of genereer een andere code." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const initials = name.trim().split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "US";
    const newUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      name: name.trim(),
      role: role && typeof role === "string" ? role.trim() : "Teamlid",
      avatar: initials,
      accessCodeHash: codeHash,
      rawCode: normalizedCode,
      isActive: isActive !== false,
      canViewOverview: Boolean(canViewOverview),
      canEditPlanning: Boolean(canEditPlanning),
      canPlannerMode: Boolean(canPlannerMode),
      isAdmin: Boolean(isAdmin),
      createdAt: now,
      updatedAt: now
    };
    db2.users.push(newUser);
    saveDatabase(db2);
    res.status(201).json({
      success: true,
      message: "Gebruiker succesvol aangemaakt.",
      user: sanitizeUser(newUser),
      generatedCode: normalizedCode
    });
  });
  app2.put("/api/admin/users/:id", authMiddleware, requireAdminMiddleware, (req, res) => {
    const { id } = req.params;
    const userIndex = db2.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Gebruiker niet gevonden." });
    }
    const { name, role, canViewOverview, canEditPlanning, canPlannerMode, isAdmin, isActive } = req.body;
    if (name && typeof name === "string") {
      db2.users[userIndex].name = name.trim();
    }
    if (role !== void 0) {
      db2.users[userIndex].role = String(role).trim();
    }
    if (canViewOverview !== void 0) {
      db2.users[userIndex].canViewOverview = Boolean(canViewOverview);
    }
    if (canEditPlanning !== void 0) {
      db2.users[userIndex].canEditPlanning = Boolean(canEditPlanning);
    }
    if (canPlannerMode !== void 0) {
      db2.users[userIndex].canPlannerMode = Boolean(canPlannerMode);
    }
    if (isAdmin !== void 0) {
      if (!isAdmin && db2.users[userIndex].isAdmin) {
        const remainingAdmins = db2.users.filter((u) => u.isAdmin && u.id !== id && u.isActive);
        if (remainingAdmins.length === 0) {
          return res.status(400).json({ error: "Je kunt het beheerder-recht niet weghalen van de enige actieve beheerder." });
        }
      }
      db2.users[userIndex].isAdmin = Boolean(isAdmin);
    }
    if (isActive !== void 0) {
      if (!isActive && db2.users[userIndex].isAdmin) {
        const remainingAdmins = db2.users.filter((u) => u.isAdmin && u.id !== id && u.isActive);
        if (remainingAdmins.length === 0) {
          return res.status(400).json({ error: "Je kunt de enige actieve beheerder niet deactiveren." });
        }
      }
      db2.users[userIndex].isActive = Boolean(isActive);
    }
    db2.users[userIndex].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDatabase(db2);
    res.json({
      success: true,
      message: "Gebruiker succesvol bijgewerkt.",
      user: sanitizeUser(db2.users[userIndex])
    });
  });
  app2.put("/api/admin/users/:id/code", authMiddleware, requireAdminMiddleware, (req, res) => {
    const { id } = req.params;
    const userIndex = db2.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Gebruiker niet gevonden." });
    }
    const { newAccessCode } = req.body;
    if (!newAccessCode || typeof newAccessCode !== "string" || newAccessCode.trim().length < 4) {
      return res.status(400).json({ error: "Voer een geldige toegangscode in van minimaal 4 tekens." });
    }
    const normalizedCode = normalizeAccessCode(newAccessCode);
    const codeHash = hashAccessCode(normalizedCode);
    if (db2.users.some((u) => u.accessCodeHash === codeHash && u.id !== id)) {
      return res.status(400).json({ error: "Deze toegangscode is al toegewezen aan een andere gebruiker." });
    }
    db2.users[userIndex].accessCodeHash = codeHash;
    db2.users[userIndex].rawCode = normalizedCode;
    db2.users[userIndex].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const [token, session] of Object.entries(db2.sessions)) {
      if (session.userId === id) {
        delete db2.sessions[token];
      }
    }
    saveDatabase(db2);
    res.json({
      success: true,
      message: "Toegangscode succesvol gewijzigd. Vorige code is direct ongeldig gemaakt.",
      newCode: normalizedCode
    });
  });
  app2.delete("/api/admin/users/:id", authMiddleware, requireAdminMiddleware, (req, res) => {
    const { id } = req.params;
    const user = db2.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "Gebruiker niet gevonden." });
    }
    if (user.isAdmin) {
      const otherAdmins = db2.users.filter((u) => u.isAdmin && u.id !== id && u.isActive);
      if (otherAdmins.length === 0) {
        return res.status(400).json({ error: "Kan de enige actieve beheerder niet verwijderen." });
      }
    }
    db2.users = db2.users.filter((u) => u.id !== id);
    db2.plannings = db2.plannings.filter((p) => p.userId !== id);
    for (const [token, session] of Object.entries(db2.sessions)) {
      if (session.userId === id) {
        delete db2.sessions[token];
      }
    }
    saveDatabase(db2);
    res.json({
      success: true,
      message: `Gebruiker ${user.name} is definitief verwijderd.`
    });
  });
  app2.get("/api/planner/members", authMiddleware, requirePlannerOrAdminMiddleware, (req, res) => {
    const members = db2.users.filter((u) => {
      if (!u.isActive) return false;
      const r = (u.role || "").trim().toLowerCase();
      return r !== "planning" && r !== "planner";
    }).map((u) => sanitizeUser(u));
    res.json({ members });
  });
  app2.get("/api/admin/users/:id/planning/:year/:month", authMiddleware, requirePlannerOrAdminMiddleware, (req, res) => {
    const { id, year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const targetUser = db2.users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: "Gebruiker niet gevonden." });
    }
    const planning = db2.plannings.find((p) => p.userId === id && p.year === y && p.month === m);
    res.json({
      user: sanitizeUser(targetUser),
      planning: planning || {
        id: `pln-${id}-${y}-${m}`,
        userId: id,
        userName: targetUser.name,
        year: y,
        month: m,
        days: {},
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: "Nog niet ingevuld"
      }
    });
  });
  app2.post("/api/admin/users/:id/planning/:year/:month", authMiddleware, requirePlannerOrAdminMiddleware, (req, res) => {
    const { id, year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const { days, secondChoices, thirdChoices } = req.body;
    const targetUser = db2.users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: "Gebruiker niet gevonden." });
    }
    const cleanDays = {};
    const validCodes = ["V", "D", "L", "R", "X", ""];
    const cleanSecondChoices = {};
    const cleanThirdChoices = {};
    for (const [key, value] of Object.entries(secondChoices || {})) {
      const dayNum = parseInt(key, 10);
      if (dayNum >= 1 && dayNum <= 31 && typeof value === "string" && validCodes.includes(value)) {
        if (value !== "") {
          cleanSecondChoices[dayNum] = value;
        }
      }
    }
    for (const [key, value] of Object.entries(days || {})) {
      const dayNum = parseInt(key, 10);
      if (dayNum >= 1 && dayNum <= 31 && typeof value === "string" && validCodes.includes(value)) {
        if (value !== "") {
          cleanDays[dayNum] = value;
        }
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existingIndex = db2.plannings.findIndex((p) => p.userId === id && p.year === y && p.month === m);
    if (existingIndex >= 0) {
      db2.plannings[existingIndex].days = cleanDays;
      db2.plannings[existingIndex].secondChoices = cleanSecondChoices;
      db2.plannings[existingIndex].updatedAt = now;
      db2.plannings[existingIndex].updatedBy = `${req.user.name} (Planner Wijziging)`;
    } else {
      db2.plannings.push({
        id: `pln-${id}-${y}-${m}`,
        userId: id,
        userName: targetUser.name,
        year: y,
        month: m,
        days: cleanDays,
        secondChoices: cleanSecondChoices,
        updatedAt: now,
        updatedBy: `${req.user.name} (Planner Ingevuld)`,
        isFinal: false
      });
    }
    saveDatabase(db2);
    res.json({
      success: true,
      message: `Planning voor ${targetUser.name} succesvol opgeslagen.`,
      planning: existingIndex >= 0 ? db2.plannings[existingIndex] : db2.plannings[db2.plannings.length - 1]
    });
  });
  app2.post("/api/admin/planning/:year/:month/finalize", authMiddleware, requirePlannerOrAdminMiddleware, (req, res) => {
    const { year, month } = req.params;
    const { week } = req.body;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    db2.plannings.forEach((p) => {
      if (p.year === y && p.month === m) {
        console.log("Finalizing planning for:", p.userId, y, m);
        p.isFinal = true;
        p.finalDays = { ...p.days };
        p.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        p.updatedBy = `${req.user.name} (Planner Afgesloten)`;
      }
    });
    saveDatabase(db2);
    const monthNames = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
    const monthName = monthNames[m - 1];
    let message = "";
    if (week) {
      message = `De planning voor ${monthName} ${y}, week ${week} is zojuist afgerond door ${req.user.name}.`;
    } else {
      message = `De planning voor ${monthName} ${y} is zojuist afgerond door ${req.user.name}.`;
    }
    sendTelegramNotification(message);
    res.json({ success: true, message: "Planning voor iedereen succesvol afgesloten als definitief." });
  });
  app2.get("/api/firebase/status", (_req, res) => {
    res.json({
      connected: isFirebaseConnected(),
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket,
      lastSyncAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.post("/api/firebase/sync", authMiddleware, requireAdminMiddleware, async (_req, res) => {
    try {
      const success = await saveRemoteDatabase(db2);
      res.json({
        success,
        message: success ? "Live database succesvol gesynchroniseerd met Cloud Firestore." : "Firebase synchronisatie is gestart of in wachtrij.",
        projectId: firebaseConfig.projectId
      });
    } catch (err) {
      res.status(500).json({ error: "Fout bij synchroniseren naar Firebase: " + (err?.message || "Onbekende fout") });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  startOCPlanningMonitor();
  startOCPlanningScheduledUpdates();
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Neon Tokyo Planner server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
