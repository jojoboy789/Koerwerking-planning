
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  initFirebase,
  fetchRemoteDatabase,
  saveRemoteDatabase,
  isFirebaseConnected,
  firebaseConfig,
} from './server/firebaseService';

dotenv.config({ path: ['.env.local', '.env'] });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HASH_SALT = process.env.ACCESS_CODE_SALT || 'NEON_TOKYO_SALT_v1_99x#';
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Interface for storage
interface StoredUser {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  accessCodeHash: string;
  rawCode?: string;
  isActive: boolean;
  canViewOverview: boolean;
  canEditPlanning: boolean;
  canPlannerMode: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface StoredPlanning {
  id: string;
  userId: string;
  userName?: string;
  year: number;
  month: number;
  days: Record<number, string>;
  finalDays?: Record<number, string>;
  isFinal: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  plannings: StoredPlanning[];
  sessions: Record<string, { userId: string; createdAt: number }>;
}

// Utility: Normalize access code (remove spaces, upper case)
function normalizeAccessCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

// Utility: Hash access code
function hashAccessCode(code: string): string {
  const normalized = normalizeAccessCode(code);
  return crypto.createHash('sha256').update(`${HASH_SALT}:${normalized}`).digest('hex');
}

// Utility: Get all reasonable variations of entered code (with/without hyphens, spaces)
function getPossibleCodeVariants(code: string): string[] {
  if (!code) return [];
  const raw = code.trim().toUpperCase();
  const stripped = raw.replace(/[^A-Z0-9]/g, '');
  const variants = new Set<string>();
  
  variants.add(raw);
  variants.add(raw.replace(/\s+/g, ''));
  variants.add(stripped);
  
  // If stripped matches 3 chars + 4 digits + 2 chars, also try standard formatted XXX-XXXX-XX
  if (stripped.length === 9) {
    const formatted = `${stripped.substring(0, 3)}-${stripped.substring(3, 7)}-${stripped.substring(7, 9)}`;
    variants.add(formatted);
  }
  
  return Array.from(variants);
}

// Utility: Generate code format XXX-9999-XX
function generateFormattedCode(prefix = 'GBR'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  
  let p = prefix;
  if (!p || p.length < 3) {
    p = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } else {
    p = p.substring(0, 3).toUpperCase();
  }
  
  const numPart = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  const suffix = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  return `${p}-${numPart}-${suffix}`;
}

// Ensure database file exists
function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = seedInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.users || data.users.length === 0) {
      const initialDb = seedInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    
    // Backfill rawCode for seed accounts if missing
    const seedDb = seedInitialDatabase();
    for (const u of data.users) {
      if (!u.rawCode) {
        const seedUser = seedDb.users.find(su => su.id === u.id);
        if (seedUser) {
          u.rawCode = seedUser.rawCode;
          u.accessCodeHash = seedUser.accessCodeHash;
        }
      }
    }
    return data;
  } catch (err) {
    console.error('Error reading db.json:', err);
    return seedInitialDatabase();
  }
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    
    // Async Firebase Firestore sync
    saveRemoteDatabase(data).catch((err) => {
      console.warn('Background Firebase sync warning:', err);
    });
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

// Seed Initial Database with Admin and Example Team
function seedInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  
  const initialUsers: StoredUser[] = [
    {
      id: 'usr-admin-001',
      name: 'Beheerder (Admin)',
      role: 'SYSTEM ADMIN',
      avatar: 'AD',
      accessCodeHash: hashAccessCode('ADM-7701-NT'),
      rawCode: 'ADM-7701-NT',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: true,
      canPlannerMode: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-jan-002',
      name: 'Jan Janssens',
      role: 'Teamlid / Vroeg-Laat',
      avatar: 'JJ',
      accessCodeHash: hashAccessCode('GBR-4829-XK'),
      rawCode: 'GBR-4829-XK',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-mercer-003',
      name: 'A. Mercer',
      role: 'Lead Specialist',
      avatar: 'AM',
      accessCodeHash: hashAccessCode('MRC-3104-QL'),
      rawCode: 'MRC-3104-QL',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-chen-004',
      name: 'K. Chen',
      role: 'Dev Engineer',
      avatar: 'KC',
      accessCodeHash: hashAccessCode('CHN-9942-BR'),
      rawCode: 'CHN-9942-BR',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-silverhand-005',
      name: 'J. Silverhand',
      role: 'Security Guard',
      avatar: 'JS',
      accessCodeHash: hashAccessCode('SLV-2077-NX'),
      rawCode: 'SLV-2077-NX',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-sato-006',
      name: 'M. Sato',
      role: 'Operations Dispatcher',
      avatar: 'MS',
      accessCodeHash: hashAccessCode('SAT-5519-TK'),
      rawCode: 'SAT-5519-TK',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-sarah-007',
      name: 'Sarah De Smet',
      role: 'Ondersteuner (Alleen Planning)',
      avatar: 'SD',
      accessCodeHash: hashAccessCode('SRH-8821-ZP'),
      rawCode: 'SRH-8821-ZP',
      isActive: true,
      canViewOverview: false,
      canEditPlanning: true,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-peter-008',
      name: 'Peter Peeters',
      role: 'Auditor (Alleen Overzicht)',
      avatar: 'PP',
      accessCodeHash: hashAccessCode('PTR-4412-KV'),
      rawCode: 'PTR-4412-KV',
      isActive: true,
      canViewOverview: true,
      canEditPlanning: false,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-inactive-009',
      name: 'Kenji Nomura (Gedeactiveerd)',
      role: 'Inactief Lid',
      avatar: 'KN',
      accessCodeHash: hashAccessCode('KNJ-0000-XX'),
      rawCode: 'KNJ-0000-XX',
      isActive: false,
      canViewOverview: false,
      canEditPlanning: false,
      isAdmin: false,
      canPlannerMode: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Helper to generate a realistic schedule
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const samplePlannings: StoredPlanning[] = [];
  const shiftPool = ['V', 'D', 'L', 'X', 'R'];

  initialUsers.forEach((u, uIdx) => {
    if (!u.isActive) return;
    const days: Record<number, string> = {};
    for (let day = 1; day <= 31; day++) {
      const isWeekend = (day % 7 === 6 || day % 7 === 0);
      if (isWeekend && Math.random() > 0.35) {
        days[day] = 'X';
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
      updatedBy: 'Systeem Initialisatie',
      isFinal: false,
    });
  });

  return {
    users: initialUsers,
    plannings: samplePlannings,
    sessions: {},
  };
}

let db = loadDatabase();

// Rate limiting helper
function checkRateLimit(_ip: string): boolean {
  return true;
}

// Known default seed code mappings as backup
const SEED_CODE_MAP: Record<string, string> = {
  'ADM7701NT': 'usr-admin-001',
  'ADM-7701-NT': 'usr-admin-001',
  'GBR4829XK': 'usr-jan-002',
  'GBR-4829-XK': 'usr-jan-002',
  'MRC3104QL': 'usr-mercer-003',
  'MRC-3104-QL': 'usr-mercer-003',
  'CHN9942BR': 'usr-chen-004',
  'CHN-9942-BR': 'usr-chen-004',
  'SLV2077NX': 'usr-silverhand-005',
  'SLV-2077-NX': 'usr-silverhand-005',
  'SAT5519TK': 'usr-sato-006',
  'SAT-5519-TK': 'usr-sato-006',
  'SRH8821ZP': 'usr-sarah-007',
  'SRH-8821-ZP': 'usr-sarah-007',
  'PTR4412KV': 'usr-peter-008',
  'PTR-4412-KV': 'usr-peter-008',
};

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  sessionToken?: string;
}

function sanitizeUser(u: StoredUser) {
  const { accessCodeHash, ...safe } = u;
  return safe;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Geen geldige sessie gevonden. Log opnieuw in.' });
  }

  const token = authHeader.substring(7).trim();
  const session = db.sessions[token];
  if (!session) {
    return res.status(401).json({ error: 'Sessie is verlopen of ongeldig. Log opnieuw in.' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    delete db.sessions[token];
    saveDatabase(db);
    return res.status(401).json({ error: 'Gebruiker bestaat niet meer.' });
  }

  if (!user.isActive) {
    delete db.sessions[token];
    saveDatabase(db);
    return res.status(403).json({ error: 'Deze gebruiker is momenteel gedeactiveerd.' });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

function requireAdminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Je hebt geen beheerderstoegang tot deze actie.' });
  }
  next();
}

function requirePlannerOrAdminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Niet geauthenticeerd.' });
  }
  if (!req.user.isAdmin && !req.user.canPlannerMode) {
    return res.status(403).json({ error: 'Je hebt geen rechten om deze actie uit te voeren.' });
  }
  next();
}

async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram bot token or chat ID not configured in .env file. Skipping notification.');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send Telegram notification:', errorData);
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Firebase Cloud Firestore connection
  initFirebase();
  try {
    const remoteData = await fetchRemoteDatabase();
    if (remoteData && remoteData.users && remoteData.users.length > 0) {
      console.log('🔥 Loaded database state from Cloud Firestore successfully.');
      db = {
        users: remoteData.users,
        plannings: remoteData.plannings || [],
        sessions: db.sessions || {},
      };
      saveDatabase(db);
    } else {
      console.log('🔥 Seeding initial database to Cloud Firestore project:', firebaseConfig.projectId);
      await saveRemoteDatabase(db);
    }
  } catch (err) {
    console.warn('Firebase initial sync deferred/offline:', err);
  }

  // === AUTHENTICATION ENDPOINTS ===

  // Public: Check Initial Setup info / Demo accounts for easy onboarding
  app.get('/api/auth/setup-info', (req, res) => {
    const hasAdmin = db.users.some(u => u.isAdmin && u.isActive);
    
    // Dynamic list of active users to show on login helper if desired
    const dynamicPresets = db.users
      .filter(u => u.isActive && u.rawCode)
      .slice(0, 6)
      .map(u => ({
        name: u.name,
        code: u.rawCode!,
        rights: u.isAdmin
          ? 'Volledige beheerderstoegang'
          : u.canEditPlanning && u.canViewOverview
          ? 'Planning + Teamoverzicht'
          : u.canEditPlanning
          ? 'Alleen eigen planning'
          : 'Alleen teamoverzicht',
      }));

    res.json({
      hasAdmin,
      demoPresets: dynamicPresets.length > 0 ? dynamicPresets : [
        { name: 'Beheerder (Admin)', code: 'ADM-7701-NT', rights: 'Volledige beheerderstoegang' },
      ],
    });
  });

  // Login with single access code
  app.post('/api/auth/login', (req, res) => {
    const { accessCode } = req.body;
    if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length === 0) {
      return res.status(400).json({ error: 'Voer een geldige toegangscode in.' });
    }

    const cleanInput = accessCode.trim();
    const cleanUpper = cleanInput.toUpperCase();
    const strippedInput = cleanUpper.replace(/[^A-Z0-9]/g, '');

    // Allow friendly admin keywords
    if (['ADMIN', 'ADM', 'BEHEERDER', 'ADMINISTRATOR', 'ROOT'].includes(cleanUpper)) {
      const adminUser = db.users.find(u => u.isAdmin && u.isActive) || db.users.find(u => u.id === 'usr-admin-001');
      if (adminUser) {
        const token = crypto.randomBytes(32).toString('hex');
        db.sessions[token] = { userId: adminUser.id, createdAt: Date.now() };
        adminUser.lastLoginAt = new Date().toISOString();
        saveDatabase(db);
        return res.json({
          token,
          user: sanitizeUser(adminUser),
        });
      }
    }

    const variants = getPossibleCodeVariants(cleanInput);
    let user: StoredUser | undefined;

    // 1. Check direct seed codes first
    for (const variant of variants) {
      const stripped = variant.replace(/[^A-Z0-9]/g, '');
      const seedUserId = SEED_CODE_MAP[variant] || SEED_CODE_MAP[stripped];
      if (seedUserId) {
        user = db.users.find(u => u.id === seedUserId);
        if (user) break;
      }
    }

    // 2. Check direct rawCode match
    if (!user) {
      user = db.users.find(u => {
        if (!u.rawCode) return false;
        const uRawUpper = u.rawCode.toUpperCase();
        const uStripped = uRawUpper.replace(/[^A-Z0-9]/g, '');
        return variants.includes(u.rawCode) || variants.includes(uRawUpper) || uStripped === strippedInput;
      });
    }

    // 3. Check hashed codes
    if (!user) {
      for (const variant of variants) {
        const codeHash = hashAccessCode(variant);
        user = db.users.find(u => u.accessCodeHash === codeHash);
        if (user) break;
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'De ingevoerde toegangscode is ongeldig.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Je account is momenteel gedeactiveerd.' });
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = { userId: user.id, createdAt: Date.now() };
    user.lastLoginAt = new Date().toISOString();
    saveDatabase(db);

    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  // Validate active session
  app.get('/api/auth/session', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      token: req.sessionToken,
      user: sanitizeUser(req.user!),
    });
  });

  // Logout
  app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (req.sessionToken && db.sessions[req.sessionToken]) {
      delete db.sessions[req.sessionToken];
      saveDatabase(db);
    }
    res.json({ success: true, message: 'Succesvol uitgelogd.' });
  });

  // Change own access code
  app.put('/api/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { oldCode, newCode } = req.body;
    const userId = req.user!.id;

    if (!oldCode || !newCode || typeof newCode !== 'string' || newCode.trim().length < 6) {
      return res.status(400).json({ error: 'De nieuwe code moet minimaal 6 karakters lang zijn.' });
    }

    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden.' }); // Should not happen with authMiddleware
    }
    
    const user = db.users[userIndex];

    // Verify old code
    const variants = getPossibleCodeVariants(oldCode);
    let isOldCodeValid = false;
    
    // 1. Check direct rawCode match
    if (user.rawCode) {
        const uRawUpper = user.rawCode.toUpperCase();
        const uStripped = uRawUpper.replace(/[^A-Z0-9]/g, '');
        const oldStripped = oldCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (variants.includes(user.rawCode) || variants.includes(uRawUpper) || uStripped === oldStripped) {
            isOldCodeValid = true;
        }
    }

    // 2. Check hashed codes if not already valid
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
        return res.status(401).json({ error: 'De oude toegangscode is onjuist.' });
    }

    // New code is valid, update it
    const normalizedNewCode = normalizeAccessCode(newCode);
    const newCodeHash = hashAccessCode(normalizedNewCode);

    // Check if new code is already in use by another user
    if (db.users.some(u => u.accessCodeHash === newCodeHash && u.id !== userId)) {
      return res.status(400).json({ error: 'Deze nieuwe toegangscode is al in gebruik. Kies een andere.' });
    }

    db.users[userIndex].accessCodeHash = newCodeHash;
    db.users[userIndex].rawCode = normalizedNewCode;
    db.users[userIndex].updatedAt = new Date().toISOString();

    // Invalidate all sessions for this user
    for (const [token, session] of Object.entries(db.sessions)) {
      if (session.userId === userId) {
        delete db.sessions[token];
      }
    }

    saveDatabase(db);

    res.json({
      success: true,
      message: 'Je toegangscode is succesvol gewijzigd. Je wordt nu uitgelogd en kunt met de nieuwe code inloggen.',
    });
  });

  // === OC PLANNING API ===

const OC_PLANNING_BASE_URL = 'https://oc-gbr.meta-technics.be';

app.get(
  '/api/oc-planning',
  authMiddleware,
  async (_req: AuthenticatedRequest, res: Response) => {
    const apiToken = process.env.OC_PLANNING_API_TOKEN;

    if (!apiToken) {
      console.error('OC Planning API-token ontbreekt in de serveromgeving.');

      return res.status(503).json({
        error: 'OC Planning is momenteel niet geconfigureerd.',
      });
    }

    try {
      const headers = {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      };

      // 1. Haal de actieve slides op.
      const manifestResponse = await fetch(
        `${OC_PLANNING_BASE_URL}/kiosk/manifest.json`,
        {
          headers,
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!manifestResponse.ok) {
        console.error(
          'OC Planning manifest mislukt:',
          manifestResponse.status
        );

        return res.status(502).json({
          error:
            manifestResponse.status === 401
              ? 'De toegang tot de OC Planning API is geweigerd.'
              : 'De OC Planning kan momenteel niet worden opgehaald.',
        });
      }

      const manifest = await manifestResponse.json() as {
        generated_at?: string;
        poll_seconds?: number;
        staleness?: {
          amber_minutes?: number;
          red_minutes?: number;
        };
        slides?: Array<{
          id: string;
          title: string;
          seconds: number;
          urgent: boolean;
          dated: boolean;
          version: string;
          updated_at: string;
          expires: string | null;
        }>;
      };

      if (!Array.isArray(manifest.slides)) {
        return res.status(502).json({
          error: 'De OC Planning API stuurde een ongeldig antwoord.',
        });
      }

      // 2. Haal de HTML-inhoud van alle actieve slides op.
      const slides = await Promise.all(
        manifest.slides.map(async (slide) => {
          // Bescherm de URL tegen ongeldige slide-ID's.
          if (!/^[a-zA-Z0-9_-]+$/.test(slide.id)) {
            throw new Error('Ongeldige slide-ID ontvangen.');
          }

          const response = await fetch(
            `${OC_PLANNING_BASE_URL}/kiosk/slides/${encodeURIComponent(slide.id)}.html`,
            {
              headers: {
                Authorization: `Bearer ${apiToken}`,
                Accept: 'text/html',
              },
              signal: AbortSignal.timeout(15000),
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
            html,
          };
        })
      );

      // 3. Stuur de gegevens terug naar de ingelogde gebruiker.
      res.setHeader('Cache-Control', 'private, no-store');

      return res.json({
        generated_at: manifest.generated_at,
        poll_seconds: manifest.poll_seconds || 60,
        staleness: manifest.staleness,
        slides,
      });
    } catch (error) {
      console.error('Fout bij ophalen OC Planning:', error);

      return res.status(502).json({
        error:
          'De verbinding met OC Planning is mislukt. Probeer het later opnieuw.',
      });
    }
  }
);

  // === PLANNING ENDPOINTS (CURRENT USER) ===

  // Get own planning for a specific year and month
  app.get('/api/planning/:year/:month', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const userId = req.user!.id;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Ongeldig jaar of maand opgegeven.' });
    }

    const planning = db.plannings.find(p => p.userId === userId && p.year === year && p.month === month);
    res.json({
      year,
      month,
      planning: planning || {
        id: `pln-${userId}-${year}-${month}`,
        userId,
        userName: req.user!.name,
        year,
        month,
        days: {},
        updatedAt: new Date().toISOString(),
        updatedBy: req.user!.name,
      },
    });
  });

  // Save own planning
  app.post('/api/planning/:year/:month', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user!.canEditPlanning && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Je hebt geen rechten om een planning in te vullen.' });
    }

    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const userId = req.user!.id;
    const { days } = req.body;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || typeof days !== 'object' || days === null) {
      return res.status(400).json({ error: 'Ongeldige planningsgegevens ontvangen.' });
    }

    // Prevent editing after the 7th of the PREVIOUS month for non-planners
    const now = new Date();
    const isPlanner = req.user!.canPlannerMode || req.user!.isAdmin;
    if (!isPlanner) {
        const deadline = new Date(year, month - 2, 8); // Deadline is 8th of the month BEFORE the one being edited
        if (now >= deadline) {
            const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
            const targetMonthName = monthNames[month - 1];
            return res.status(403).json({ error: `De deadline voor het aanpassen van de planning voor ${targetMonthName} is verstreken (7e van de vorige maand).` });
        }
    }

    // Validate days map
    const cleanDays: Record<number, string> = {};
    const validCodes = ['V', 'D', 'L', 'R', 'X', ''];
    for (const [key, value] of Object.entries(days)) {
      const dayNum = parseInt(key, 10);
      if (dayNum >= 1 && dayNum <= 31 && typeof value === 'string' && validCodes.includes(value)) {
        if (value !== '') {
          cleanDays[dayNum] = value;
        }
      }
    }

    const updatedAt = new Date().toISOString();
    const existingIndex = db.plannings.findIndex(p => p.userId === userId && p.year === year && p.month === month);

    if (existingIndex >= 0) {
      db.plannings[existingIndex].days = cleanDays;
      db.plannings[existingIndex].updatedAt = updatedAt;
      db.plannings[existingIndex].updatedBy = req.user!.name;
    } else {
      db.plannings.push({
        id: `pln-${userId}-${year}-${month}`,
        userId,
        userName: req.user!.name,
        year,
        month,
        days: cleanDays,
        updatedAt,
        updatedBy: req.user!.name,
        isFinal: false,
      });
    }

    saveDatabase(db);
    res.json({
      success: true,
      message: 'Planning succesvol opgeslagen.',
      planning: existingIndex >= 0 ? db.plannings[existingIndex] : db.plannings[db.plannings.length - 1],
    });
  });

  // === TEAM OVERVIEW MATRIX ENDPOINT ===

  app.get('/api/overview/:year/:month', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user!.canViewOverview && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Je hebt geen rechten om het teamoverzicht te bekijken.' });
    }

    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Ongeldig jaar of maand opgegeven.' });
    }

    // Only active users in general overview, excluding planner/planning roles
    const activeUsers = db.users.filter(u => {
      if (!u.isActive) return false;
      const r = (u.role || '').trim().toLowerCase();
      if (r === 'planning' || r === 'planner') return false;
      return true;
    });

    const teamData = activeUsers.map(u => {
      const pln = db.plannings.find(p => p.userId === u.id && p.year === year && p.month === month);
      return {
        user: sanitizeUser(u),
        planning: pln || null,
      };
    });

    res.json({
      year,
      month,
      teamData,
    });
  });
  
  // === GENERAL CHAT ENDPOINT ===
  app.post('/api/chat/send-message', authMiddleware, requirePlannerOrAdminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Bericht mag niet leeg zijn.' });
    }

    const senderName = req.user!.name;
    const fullMessage = `<b>Bericht van ${senderName}:</b>\n\n${message.trim()}`;

    await sendTelegramNotification(fullMessage);

    res.json({ success: true, message: 'Bericht succesvol verzonden naar het kanaal.' });
  });

  // === ADMIN PORTAL ENDPOINTS ===

  // Admin Dashboard Statistics
  app.get('/api/admin/stats', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const totalUsers = db.users.length;
    const activeUsers = db.users.filter(u => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    const canEditPlanningCount = db.users.filter(u => u.canEditPlanning).length;
    const canViewOverviewCount = db.users.filter(u => u.canViewOverview).length;
    const adminCount = db.users.filter(u => u.isAdmin).length;
    const totalPlanningsThisMonth = db.plannings.filter(p => p.year === currentYear && p.month === currentMonth).length;

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      canEditPlanningCount,
      canViewOverviewCount,
      adminCount,
      totalPlanningsThisMonth,
    });
  });

  // Get all users (Admin)
  app.get('/api/admin/users', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const users = db.users.map(u => sanitizeUser(u));
    res.json({ users });
  });

  // Helper to generate code
  app.post('/api/admin/generate-code', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const prefix = typeof req.body.prefix === 'string' ? req.body.prefix : 'GBR';
    let code = generateFormattedCode(prefix);
    let attempts = 0;
    while (db.users.some(u => u.accessCodeHash === hashAccessCode(code)) && attempts < 20) {
      code = generateFormattedCode(prefix);
      attempts++;
    }
    res.json({ code });
  });

  // Create new user (Admin)
  app.post('/api/admin/users', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { name, role, accessCode, canViewOverview, canEditPlanning, canPlannerMode, isAdmin, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Naam is verplicht.' });
    }

    if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length < 4) {
      return res.status(400).json({ error: 'Voer een geldige toegangscode in van minimaal 4 tekens.' });
    }

    const normalizedCode = normalizeAccessCode(accessCode);
    const codeHash = hashAccessCode(normalizedCode);

    if (db.users.some(u => u.accessCodeHash === codeHash)) {
      return res.status(400).json({ error: 'Deze toegangscode is al in gebruik. Kies of genereer een andere code.' });
    }

    const now = new Date().toISOString();
    const initials = name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      role: role && typeof role === 'string' ? role.trim() : 'Teamlid',
      avatar: initials,
      accessCodeHash: codeHash,
      rawCode: normalizedCode,
      isActive: isActive !== false,
      canViewOverview: Boolean(canViewOverview),
      canEditPlanning: Boolean(canEditPlanning),
      canPlannerMode: Boolean(canPlannerMode),
      isAdmin: Boolean(isAdmin),
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: 'Gebruiker succesvol aangemaakt.',
      user: sanitizeUser(newUser),
      generatedCode: normalizedCode,
    });
  });

  // Update existing user (Admin)
  app.put('/api/admin/users/:id', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
    }

    const { name, role, canViewOverview, canEditPlanning, canPlannerMode, isAdmin, isActive } = req.body;

    if (name && typeof name === 'string') {
      db.users[userIndex].name = name.trim();
    }
    if (role !== undefined) {
      db.users[userIndex].role = String(role).trim();
    }
    if (canViewOverview !== undefined) {
      db.users[userIndex].canViewOverview = Boolean(canViewOverview);
    }
    if (canEditPlanning !== undefined) {
      db.users[userIndex].canEditPlanning = Boolean(canEditPlanning);
    }
    if (canPlannerMode !== undefined) {
      db.users[userIndex].canPlannerMode = Boolean(canPlannerMode);
    }
    if (isAdmin !== undefined) {
      // Prevent removing admin right from the very last admin
      if (!isAdmin && db.users[userIndex].isAdmin) {
        const remainingAdmins = db.users.filter(u => u.isAdmin && u.id !== id && u.isActive);
        if (remainingAdmins.length === 0) {
          return res.status(400).json({ error: 'Je kunt het beheerder-recht niet weghalen van de enige actieve beheerder.' });
        }
      }
      db.users[userIndex].isAdmin = Boolean(isAdmin);
    }
    if (isActive !== undefined) {
      if (!isActive && db.users[userIndex].isAdmin) {
        const remainingAdmins = db.users.filter(u => u.isAdmin && u.id !== id && u.isActive);
        if (remainingAdmins.length === 0) {
          return res.status(400).json({ error: 'Je kunt de enige actieve beheerder niet deactiveren.' });
        }
      }
      db.users[userIndex].isActive = Boolean(isActive);
    }

    db.users[userIndex].updatedAt = new Date().toISOString();
    saveDatabase(db);

    res.json({
      success: true,
      message: 'Gebruiker succesvol bijgewerkt.',
      user: sanitizeUser(db.users[userIndex]),
    });
  });

  // Change user access code (Admin)
  app.put('/api/admin/users/:id/code', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
    }

    const { newAccessCode } = req.body;
    if (!newAccessCode || typeof newAccessCode !== 'string' || newAccessCode.trim().length < 4) {
      return res.status(400).json({ error: 'Voer een geldige toegangscode in van minimaal 4 tekens.' });
    }

    const normalizedCode = normalizeAccessCode(newAccessCode);
    const codeHash = hashAccessCode(normalizedCode);

    if (db.users.some(u => u.accessCodeHash === codeHash && u.id !== id)) {
      return res.status(400).json({ error: 'Deze toegangscode is al toegewezen aan een andere gebruiker.' });
    }

    db.users[userIndex].accessCodeHash = codeHash;
    db.users[userIndex].rawCode = normalizedCode;
    db.users[userIndex].updatedAt = new Date().toISOString();

    // Revoke any existing active session of this user so they must re-login with the new code
    for (const [token, session] of Object.entries(db.sessions)) {
      if (session.userId === id) {
        delete db.sessions[token];
      }
    }

    saveDatabase(db);

    res.json({
      success: true,
      message: 'Toegangscode succesvol gewijzigd. Vorige code is direct ongeldig gemaakt.',
      newCode: normalizedCode,
    });
  });

  // Delete user (Admin)
  app.delete('/api/admin/users/:id', authMiddleware, requireAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const user = db.users.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
    }

    if (user.isAdmin) {
      const otherAdmins = db.users.filter(u => u.isAdmin && u.id !== id && u.isActive);
      if (otherAdmins.length === 0) {
        return res.status(400).json({ error: 'Kan de enige actieve beheerder niet verwijderen.' });
      }
    }

    // Delete user plannings and sessions
    db.users = db.users.filter(u => u.id !== id);
    db.plannings = db.plannings.filter(p => p.userId !== id);
    for (const [token, session] of Object.entries(db.sessions)) {
      if (session.userId === id) {
        delete db.sessions[token];
      }
    }

    saveDatabase(db);

    res.json({
      success: true,
      message: `Gebruiker ${user.name} is definitief verwijderd.`,
    });
  });

  // Get team members for planner roster overview (Planners & Admins)
  app.get('/api/planner/members', authMiddleware, requirePlannerOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    // Return all active members who are not planners themselves (or all active members)
    const members = db.users
      .filter(u => {
        if (!u.isActive) return false;
        const r = (u.role || '').trim().toLowerCase();
        return r !== 'planning' && r !== 'planner';
      })
      .map(u => sanitizeUser(u));
    res.json({ members });
  });

  // Get specific user's planning (Planner / Admin)
  app.get('/api/admin/users/:id/planning/:year/:month', authMiddleware, requirePlannerOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { id, year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
    }

    const planning = db.plannings.find(p => p.userId === id && p.year === y && p.month === m);
    res.json({
      user: sanitizeUser(targetUser),
      planning: planning || {
        id: `pln-${id}-${y}-${m}`,
        userId: id,
        userName: targetUser.name,
        year: y,
        month: m,
        days: {},
        updatedAt: new Date().toISOString(),
        updatedBy: 'Nog niet ingevuld',
      },
    });
  });

  // Save specific user's planning as Planner / Admin
  app.post('/api/admin/users/:id/planning/:year/:month', authMiddleware, requirePlannerOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { id, year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const { days } = req.body;

    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
    }

    const cleanDays: Record<number, string> = {};
    const validCodes = ['V', 'D', 'L', 'R', 'X', ''];
    for (const [key, value] of Object.entries(days || {})) {
      const dayNum = parseInt(key, 10);
      if (dayNum >= 1 && dayNum <= 31 && typeof value === 'string' && validCodes.includes(value)) {
        if (value !== '') {
          cleanDays[dayNum] = value;
        }
      }
    }

    const now = new Date().toISOString();
    const existingIndex = db.plannings.findIndex(p => p.userId === id && p.year === y && p.month === m);

    if (existingIndex >= 0) {
      db.plannings[existingIndex].days = cleanDays;
      db.plannings[existingIndex].updatedAt = now;
      db.plannings[existingIndex].updatedBy = `${req.user!.name} (Planner Wijziging)`;
    } else {
      db.plannings.push({
        id: `pln-${id}-${y}-${m}`,
        userId: id,
        userName: targetUser.name,
        year: y,
        month: m,
        days: cleanDays,
        updatedAt: now,
        updatedBy: `${req.user!.name} (Planner Ingevuld)`,
        isFinal: false,
      });
    }

    saveDatabase(db);
    res.json({
      success: true,
      message: `Planning voor ${targetUser.name} succesvol opgeslagen.`,
      planning: existingIndex >= 0 ? db.plannings[existingIndex] : db.plannings[db.plannings.length - 1],
    });
  });

  // Finalize all team planning (Planner / Admin)
  app.post('/api/admin/planning/:year/:month/finalize', authMiddleware, requirePlannerOrAdminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { year, month } = req.params;
    const { week } = req.body;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    db.plannings.forEach(p => {
        if(p.year === y && p.month === m) {
            console.log('Finalizing planning for:', p.userId, y, m);
            p.isFinal = true;
            p.finalDays = { ...p.days };
            p.updatedAt = new Date().toISOString();
            p.updatedBy = `${req.user!.name} (Planner Afgesloten)`;
        }
    });

    saveDatabase(db);

    // Send Telegram notification
    const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
    const monthName = monthNames[m - 1];
    let message = ''
    if(week){
      message = `De planning voor ${monthName} ${y}, week ${week} is zojuist afgerond door ${req.user!.name}.`;
    }
    else{
      message = `De planning voor ${monthName} ${y} is zojuist afgerond door ${req.user!.name}.`;
    }
    sendTelegramNotification(message);

    res.json({ success: true, message: 'Planning voor iedereen succesvol afgesloten als definitief.' });
  });

  // Firebase status endpoint
  app.get('/api/firebase/status', (_req, res) => {
    res.json({
      connected: isFirebaseConnected(),
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket,
      lastSyncAt: new Date().toISOString(),
    });
  });

  // Manual Firebase force-sync endpoint (for Admin)
  app.post('/api/firebase/sync', authMiddleware, requireAdminMiddleware, async (_req, res) => {
    try {
      const success = await saveRemoteDatabase(db);
      res.json({
        success,
        message: success ? 'Live database succesvol gesynchroniseerd met Cloud Firestore.' : 'Firebase synchronisatie is gestart of in wachtrij.',
        projectId: firebaseConfig.projectId,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Fout bij synchroniseren naar Firebase: ' + (err?.message || 'Onbekende fout') });
    }
  });

  // === VITE MIDDLEWARE / STATIC ASSETS ===

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Neon Tokyo Planner server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();