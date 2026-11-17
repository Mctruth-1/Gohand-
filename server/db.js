// database abstraction using Node 24 native node:sqlite
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, 'peace.db');
const db = new DatabaseSync(DB_PATH);

// Helper for hashing passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'PEACE_SALT_2026').digest('hex');
}

function initDB() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      birthdate TEXT NOT NULL,
      gender TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      preferred_language TEXT DEFAULT 'English',
      bio TEXT,
      avatar_url TEXT,
      photos TEXT DEFAULT '[]',
      interests TEXT DEFAULT '[]',
      languages TEXT DEFAULT '[]',
      relationship_goals TEXT DEFAULT 'Long-term relationship',
      occupation TEXT,
      is_verified INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      phone_verified INTEGER DEFAULT 0,
      selfie_verified INTEGER DEFAULT 0,
      phone TEXT,
      role TEXT DEFAULT 'user',
      is_banned INTEGER DEFAULT 0,
      privacy_incognito INTEGER DEFAULT 0,
      privacy_show_online INTEGER DEFAULT 1,
      privacy_read_receipts INTEGER DEFAULT 1,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      is_superlike INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sender_id, receiver_id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS favourites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, target_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'text',
      media_url TEXT,
      duration INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      from_user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  seedData();
}

function calculateAge(birthdate) {
  const birth = new Date(birthdate);
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const defaultPassword = hashPassword('peace2026');

  // Insert Admin
  db.prepare(`
    INSERT INTO users (
      email, password_hash, full_name, birthdate, gender, country, city,
      preferred_language, bio, avatar_url, photos, interests, languages,
      relationship_goals, occupation, is_verified, email_verified, phone_verified,
      selfie_verified, role
    ) VALUES (
      'admin@peace.love', ?, 'PEACE Support & Admin', '1990-01-01', 'non-binary',
      'Switzerland', 'Geneva', 'English', 'Official PEACE platform trust, safety, and community moderation.',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      '["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"]',
      '["Community", "Safety", "Global Relations", "Tech"]',
      '["English", "French", "German"]',
      'Platform Admin', 'Trust & Safety Lead', 2, 1, 1, 1, 'admin'
    )
  `).run(defaultPassword);

  const demoUsers = [
    {
      email: 'elena@peace.love',
      full_name: 'Elena Ramos',
      birthdate: '1998-04-12', // 28
      gender: 'female',
      country: 'Spain',
      city: 'Madrid',
      preferred_language: 'Spanish',
      bio: 'Architect, salsa lover, and rooftop espresso enthusiast. Looking for someone genuine to explore art museums and Mediterranean sunsets with.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Architecture', 'Salsa', 'Wine Tasting', 'Travel', 'Photography']),
      languages: JSON.stringify(['Spanish (Native)', 'English (Fluent)', 'Italian (Conversational)']),
      relationship_goals: 'Long-term relationship',
      occupation: 'Architect & Interior Designer',
      is_verified: 2
    },
    {
      email: 'kenji@peace.love',
      full_name: 'Kenji Sato',
      birthdate: '1995-09-23', // 31
      gender: 'male',
      country: 'Japan',
      city: 'Tokyo',
      preferred_language: 'Japanese',
      bio: 'Creative technologist & analog street photographer. Always curious about other cultures, delicious noodles, and peaceful jazz bars.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Street Photography', 'Jazz', 'Coffee Brewing', 'Coding', 'Hiking']),
      languages: JSON.stringify(['Japanese (Native)', 'English (Fluent)']),
      relationship_goals: 'Long-term relationship',
      occupation: 'Software Engineer & Photographer',
      is_verified: 2
    },
    {
      email: 'amara@peace.love',
      full_name: 'Amara Okafor',
      birthdate: '1997-02-18', // 29
      gender: 'female',
      country: 'Kenya',
      city: 'Nairobi',
      preferred_language: 'English',
      bio: 'Wildlife biologist & eco-tourism storyteller. Passionate about safari preservation, afrobeats, culinary adventures, and authentic laughter.',
      avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Wildlife', 'Afrobeats', 'Hiking', 'Cooking', 'Podcasts']),
      languages: JSON.stringify(['English (Native)', 'Swahili (Native)', 'French (Basic)']),
      relationship_goals: 'Serious relationship & Marriage',
      occupation: 'Conservation Biologist',
      is_verified: 2
    },
    {
      email: 'liam@peace.love',
      full_name: 'Liam O\'Connor',
      birthdate: '1994-07-04', // 32
      gender: 'male',
      country: 'Ireland',
      city: 'Dublin',
      preferred_language: 'English',
      bio: 'Acoustic indie singer-songwriter and coastal hiker. Looking for someone with a kind soul, a warm smile, and an appetite for spontaneous road trips.',
      avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Live Music', 'Acoustic Guitar', 'Coastal Trails', 'Literature', 'Poetry']),
      languages: JSON.stringify(['English (Native)', 'Gaeilge (Irish)', 'German (Conversational)']),
      relationship_goals: 'Long-term relationship',
      occupation: 'Musician & Sound Producer',
      is_verified: 2
    },
    {
      email: 'chloe@peace.love',
      full_name: 'Chloé Laurent',
      birthdate: '1999-11-05', // 27
      gender: 'female',
      country: 'France',
      city: 'Paris',
      preferred_language: 'French',
      bio: 'Sommelier and contemporary pastry chef in Montmartre. I believe conversation is an art form best enjoyed over warm croissants and fine wine.',
      avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Pastry', 'Wine', 'Art History', 'Cycling', 'Fashion']),
      languages: JSON.stringify(['French (Native)', 'English (Fluent)', 'Spanish (Basic)']),
      relationship_goals: 'Romantic partnership',
      occupation: 'Pastry Chef & Sommelier',
      is_verified: 2
    },
    {
      email: 'mateo@peace.love',
      full_name: 'Mateo Silva',
      birthdate: '1996-03-30', // 30
      gender: 'male',
      country: 'Brazil',
      city: 'Rio de Janeiro',
      preferred_language: 'Portuguese',
      bio: 'Surfer, landscape architect and bossa nova fan. Big believer in positive energy, warm ocean breezes, and deep late-night conversations.',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Surfing', 'Bossa Nova', 'Landscape Design', 'Beach Volleyball', 'Yoga']),
      languages: JSON.stringify(['Portuguese (Native)', 'English (Fluent)', 'Spanish (Fluent)']),
      relationship_goals: 'Long-term relationship',
      occupation: 'Landscape Architect',
      is_verified: 2
    },
    {
      email: 'meiling@peace.love',
      full_name: 'Mei-Ling Chen',
      birthdate: '1997-08-14', // 29
      gender: 'female',
      country: 'Taiwan',
      city: 'Taipei',
      preferred_language: 'Mandarin',
      bio: 'Tea ceremony practitioner & UX researcher. I love night markets, ceramic pottery, mountain misty hikes, and heartfelt storytelling.',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Tea Ceremony', 'Pottery', 'Design', 'Night Markets', 'Bouldering']),
      languages: JSON.stringify(['Mandarin (Native)', 'English (Fluent)', 'Japanese (Conversational)']),
      relationship_goals: 'Marriage & Family',
      occupation: 'Design Researcher',
      is_verified: 2
    },
    {
      email: 'sofia@peace.love',
      full_name: 'Sofia Rossi',
      birthdate: '1998-12-01', // 27
      gender: 'female',
      country: 'Italy',
      city: 'Rome',
      preferred_language: 'Italian',
      bio: 'Film restorer and classical violinist. Let us walk through the Trastevere alleys and argue over the best cinema soundtracks in history.',
      avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Cinema', 'Violin', 'Italian Cuisine', 'Museums', 'Antiques']),
      languages: JSON.stringify(['Italian (Native)', 'English (Fluent)', 'German (Basic)']),
      relationship_goals: 'Long-term partnership',
      occupation: 'Film Archivist',
      is_verified: 2
    },
    {
      email: 'lucas@peace.love',
      full_name: 'Lucas Meyer',
      birthdate: '1993-06-21', // 33
      gender: 'male',
      country: 'Germany',
      city: 'Berlin',
      preferred_language: 'German',
      bio: 'Clean tech entrepreneur and weekend cyclist. Believes in honest communication, good books, and finding peace amidst city life.',
      avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Clean Tech', 'Gravel Biking', 'Philosophy', 'Specialty Coffee', 'Minimalism']),
      languages: JSON.stringify(['German (Native)', 'English (Fluent)', 'Dutch (Conversational)']),
      relationship_goals: 'Serious relationship',
      occupation: 'Environmental Engineer',
      is_verified: 2
    },
    {
      email: 'tariq@peace.love',
      full_name: 'Tariq Al-Mansoor',
      birthdate: '1994-05-10', // 32
      gender: 'male',
      country: 'United Arab Emirates',
      city: 'Dubai',
      preferred_language: 'Arabic',
      bio: 'Aviation engineer & desert stargazing enthusiast. Looking for someone with an adventurous spirit and a warm heart.',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80'
      ]),
      interests: JSON.stringify(['Aviation', 'Astronomy', 'Falconry', 'Scuba Diving', 'History']),
      languages: JSON.stringify(['Arabic (Native)', 'English (Fluent)', 'Turkish (Basic)']),
      relationship_goals: 'Marriage & Family',
      occupation: 'Aeronautical Engineer',
      is_verified: 2
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO users (
      email, password_hash, full_name, birthdate, gender, country, city,
      preferred_language, bio, avatar_url, photos, interests, languages,
      relationship_goals, occupation, is_verified, email_verified, phone_verified, selfie_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
  `);

  demoUsers.forEach(u => {
    stmt.run(
      u.email, defaultPassword, u.full_name, u.birthdate, u.gender, u.country, u.city,
      u.preferred_language, u.bio, u.avatar_url, u.photos, u.interests, u.languages,
      u.relationship_goals, u.occupation, u.is_verified
    );
  });

  // Pre-seed some mutual matches between user 2 (Elena) and user 3 (Kenji), and user 2 and user 5 (Liam)
  // Let's get user IDs
  const elena = db.prepare('SELECT id FROM users WHERE email = ?').get('elena@peace.love');
  const kenji = db.prepare('SELECT id FROM users WHERE email = ?').get('kenji@peace.love');
  const liam = db.prepare('SELECT id FROM users WHERE email = ?').get('liam@peace.love');
  const amara = db.prepare('SELECT id FROM users WHERE email = ?').get('amara@peace.love');

  if (elena && kenji) {
    db.prepare('INSERT INTO likes (sender_id, receiver_id) VALUES (?, ?)').run(elena.id, kenji.id);
    db.prepare('INSERT INTO likes (sender_id, receiver_id) VALUES (?, ?)').run(kenji.id, elena.id);
    db.prepare('INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)').run(
      Math.min(elena.id, kenji.id),
      Math.max(elena.id, kenji.id)
    );

    // Seed some messages between Elena and Kenji
    const msgStmt = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, type, is_read, created_at)
      VALUES (?, ?, ?, 'text', 1, datetime('now', '-2 hours'))
    `);
    msgStmt.run(kenji.id, elena.id, 'Konbanwa Elena! I saw your sketches of the Madrid rooftops, they look breathtaking.');
    msgStmt.run(elena.id, kenji.id, 'Muchas gracias Kenji! Your Tokyo night film photography is magical. Which camera do you shoot with?');
    msgStmt.run(kenji.id, elena.id, 'I use an old 1978 Olympus OM-2. Would love to show you some Tokyo spots over video call sometime!');
  }

  if (elena && liam) {
    db.prepare('INSERT INTO likes (sender_id, receiver_id) VALUES (?, ?)').run(elena.id, liam.id);
    db.prepare('INSERT INTO likes (sender_id, receiver_id) VALUES (?, ?)').run(liam.id, elena.id);
    db.prepare('INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)').run(
      Math.min(elena.id, liam.id),
      Math.max(elena.id, liam.id)
    );

    db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, type, is_read, created_at)
      VALUES (?, ?, 'Hey Elena! Greetings from Dublin 🍀 How is the sunny weather treating you?', 'text', 1, datetime('now', '-1 day'))
    `).run(liam.id, elena.id);
  }

  if (elena && amara) {
    db.prepare('INSERT INTO favourites (user_id, target_id) VALUES (?, ?)').run(elena.id, amara.id);
  }

  // Pre-seed some call logs
  if (elena && kenji) {
    db.prepare(`
      INSERT INTO calls (caller_id, receiver_id, type, status, duration, started_at, ended_at)
      VALUES (?, ?, 'video', 'completed', 432, datetime('now', '-1 day'), datetime('now', '-1 day', '+432 seconds'))
    `).run(kenji.id, elena.id);
    db.prepare(`
      INSERT INTO calls (caller_id, receiver_id, type, status, duration, started_at)
      VALUES (?, ?, 'audio', 'missed', 0, datetime('now', '-3 hours'))
    `).run(liam.id, elena.id);
  }

  // Pre-seed some notifications for Elena
  if (elena) {
    db.prepare(`
      INSERT INTO notifications (user_id, from_user_id, type, title, content)
      VALUES (?, ?, 'match', 'It''s a Match! 🎉', 'You and Kenji Sato liked each other! Start a conversation.')
    `).run(elena.id, kenji.id);
    db.prepare(`
      INSERT INTO notifications (user_id, from_user_id, type, title, content)
      VALUES (?, ?, 'like', 'New Admirer ❤️', 'Mateo Silva from Brazil liked your profile.')
    `).run(elena.id, 6);
    db.prepare(`
      INSERT INTO notifications (user_id, from_user_id, type, title, content)
      VALUES (?, ?, 'call', 'Missed Call 📞', 'You missed an audio call from Liam O''Connor.')
    `).run(elena.id, liam.id);
    db.prepare(`
      INSERT INTO notifications (user_id, from_user_id, type, title, content)
      VALUES (?, NULL, 'verification', 'Profile Verified 🛡️', 'Congratulations! Your PEACE Gold Verification checkmark is now active.')
    `).run(elena.id);
  }

  // Pre-seed platform settings
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('min_age', '18');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('platform_name', 'PEACE');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('auto_verify', 'false');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('maintenance_mode', 'false');
}

module.exports = {
  db,
  initDB,
  hashPassword,
  calculateAge
};
