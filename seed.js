import 'dotenv/config';
import mongoose from 'mongoose';
import { Email, Client } from './models.js';
import { demoEmails, clients } from './data.js';
if (!process.env.MONGO_URI) { console.error('Set MONGO_URI in .env first.'); process.exit(1); }
await mongoose.connect(process.env.MONGO_URI);
await Promise.all([Email.deleteMany({}), Client.deleteMany({})]);
await Email.insertMany(demoEmails.map(({_id,...e})=>e));
await Client.insertMany(clients);
console.log(`Seeded ${demoEmails.length} emails and ${clients.length} clients.`);
await mongoose.disconnect();
