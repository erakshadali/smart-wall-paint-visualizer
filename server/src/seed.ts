import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { Color } from './models/Color.js';
import { Pattern } from './models/Pattern.js';
import { PATTERN_SEEDS } from './pattern-png.js';
import { storeImage } from './middleware/upload.js';
import fs from 'node:fs';
import path from 'node:path';

const palette: [string, string, string[]][] = [
  ['Ocean Breeze Blue', '#4F86C6', ['Living Room', 'Bedroom']], ['Sky Whisper', '#A9CCE3', ['Bedroom']],
  ['Midnight Navy', '#1F2A44', ['Accent']], ['Teal Lagoon', '#2A9D8F', ['Accent', 'Living Room']],
  ['Mint Fresh', '#B7E4C7', ['Kitchen', 'Bedroom']], ['Sage Leaf', '#8FA98A', ['Living Room']],
  ['Forest Green', '#2D5A3D', ['Accent']], ['Olive Grove', '#6B7A3A', ['Accent']],
  ['Lemon Zest', '#F7E26B', ['Kitchen']], ['Sunshine Yellow', '#F4C430', ['Kitchen', 'Accent']],
  ['Mustard Gold', '#D9A21B', ['Accent']], ['Warm Apricot', '#F6B983', ['Living Room']],
  ['Burnt Orange', '#CC5500', ['Accent']], ['Terracotta Clay', '#C8694A', ['Living Room', 'Accent']],
  ['Coral Reef', '#F08A7E', ['Bedroom']], ['Blush Pink', '#F4C2C2', ['Bedroom']],
  ['Dusty Rose', '#C9908F', ['Bedroom', 'Living Room']], ['Rosewood', '#8E4A49', ['Accent']],
  ['Crimson Red', '#B3202F', ['Accent']], ['Brick Red', '#9C3D32', ['Accent']],
  ['Lavender Mist', '#C9B8E6', ['Bedroom']], ['Soft Lilac', '#B39DDB', ['Bedroom']],
  ['Plum Velvet', '#6D3B6E', ['Accent']], ['Pure White', '#FFFFFF', ['Living Room', 'Kitchen']],
  ['Warm Ivory', '#F5F0E1', ['Living Room', 'Bedroom']], ['Cream Silk', '#F3E9D2', ['Living Room']],
  ['Sand Dune', '#DCC9A6', ['Living Room']], ['Beige Linen', '#D8C8B0', ['Living Room', 'Bedroom']],
  ['Mocha Brown', '#7B5B45', ['Accent']], ['Chocolate', '#4B3027', ['Accent']],
  ['Light Grey', '#D3D3D3', ['Living Room', 'Kitchen']], ['Dove Grey', '#B0B3B8', ['Living Room']],
  ['Slate Grey', '#6B7480', ['Accent', 'Living Room']], ['Charcoal', '#36393F', ['Accent']],
  ['Powder Blue', '#C6DDE8', ['Bedroom']], ['Aqua Splash', '#6EC6CA', ['Kitchen', 'Bathroom']],
  ['Spa Green', '#A5D6C9', ['Bathroom']], ['Peach Cream', '#FBDCC4', ['Bedroom', 'Kitchen']],
  ['Honey Beige', '#E3C58C', ['Kitchen']], ['Pistachio', '#B5D99C', ['Kitchen']],
];

await mongoose.connect(process.env.MONGODB_URI!);
// Upsert by name so re-seeding keeps colour ids stable (saved designs reference them).
await Color.bulkWrite(
  palette.map(([name, hex, tags]) => ({
    updateOne: {
      filter: { name, brand: 'Seed Palette' },
      update: { $set: { hex, tags, finishes: ['matte', 'satin', 'glossy'] } },
      upsert: true,
    },
  }))
);

for (const seed of PATTERN_SEEDS) {
  if (await Pattern.findOne({ name: seed.name })) continue;
  const imageUrl = await storeImage(seed.build(), `seed-${seed.name.toLowerCase().replace(/\s+/g, '-')}.png`);
  await Pattern.create({ name: seed.name, style: seed.style, description: seed.description, imageUrl, scale: seed.scale ?? 1 });
}

// One-time import of images saved on local disk by earlier versions.
const legacyDir = path.resolve('uploads');
if (fs.existsSync(legacyDir)) {
  for (const f of fs.readdirSync(legacyDir)) await storeImage(fs.readFileSync(path.join(legacyDir, f)), f);
}

const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
if (!(await User.findOne({ email }))) {
  await User.create({
    name: 'Admin',
    email,
    role: 'admin',
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'ChangeMe@123', 10),
  });
}
console.log(`Seeded ${palette.length} colours and admin ${email}`);
await mongoose.disconnect();
