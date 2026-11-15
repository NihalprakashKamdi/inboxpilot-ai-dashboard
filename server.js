import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Email, Client } from './models.js';
import { demoEmails, clients } from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const app = express();
const PORT = Number(process.env.PORT || 4000);
const hasMongo = Boolean(process.env.MONGO_URI);
let dbReady = false;
let memoryEmails = structuredClone(demoEmails);
let memoryClients = structuredClone(clients);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

const normalize = (doc) => {
  const x = doc?.toObject ? doc.toObject() : doc;
  return { ...x, id: String(x.id ?? x._id), _id: String(x._id ?? x.id) };
};
async function allEmails() { return dbReady ? (await Email.find().sort({ createdAt:-1 })).map(normalize) : memoryEmails; }
async function findEmail(id) { if (!dbReady) return memoryEmails.find(x=>x._id===id || x.id===id); const doc=await Email.findById(id); return doc ? normalize(doc) : null; }
async function updateEmail(id, update) {
  if (dbReady) { const doc=await Email.findByIdAndUpdate(id, update, {new:true}); return doc ? normalize(doc) : null; }
  const i = memoryEmails.findIndex(x=>x._id===id || x.id===id); if (i<0) return null;
  memoryEmails[i] = {...memoryEmails[i], ...update, updatedAt:new Date().toISOString()}; return memoryEmails[i];
}
async function getClients() { return dbReady ? (await Client.find().sort({company:1})).map(normalize) : memoryClients; }

async function askModel(messages, fallback) {
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-4o-mini',temperature:0.4,messages})
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const json = await response.json(); return json.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (err) { console.error('AI request failed:',err.message); return fallback; }
}

app.get('/api/health', (_req,res)=>res.json({ok:true,app:'InboxPilot',database:dbReady?'MongoDB connected':'demo memory mode',ai:process.env.OPENAI_API_KEY?'live model enabled':'demo fallback'}));
app.get('/api/dashboard', async (_req,res)=>{
  const items = await allEmails();
  res.json({total:items.length, assistant:items.filter(e=>e.status==='assistant').length, client:items.filter(e=>e.status==='client').length, none:items.filter(e=>e.status==='none').length, unread:items.filter(e=>e.unread).length, recent:items.length, database:dbReady?'MongoDB':'Demo data'});
});
app.get('/api/emails', async (req,res)=>{
  const {status='all',q='',sort='new'} = req.query;
  let items = await allEmails(); const needle=String(q).toLowerCase();
  if (status!=='all') items=items.filter(e=>e.status===status);
  if (needle) items=items.filter(e=>[e.sender,e.company,e.subject,e.snippet,e.body,...(e.labels||[])].join(' ').toLowerCase().includes(needle));
  items.sort((a,b)=> sort==='old' ? new Date(a.createdAt)-new Date(b.createdAt) : new Date(b.createdAt)-new Date(a.createdAt));
  res.json({items,total:items.length});
});
app.get('/api/emails/:id', async (req,res)=>{const item=await findEmail(req.params.id); if(!item)return res.status(404).json({error:'Email not found'});res.json(item);});
app.patch('/api/emails/:id', async (req,res)=>{
  const allowed={}; if(['assistant','client','none'].includes(req.body.status)) allowed.status=req.body.status;
  if(typeof req.body.unread==='boolean') allowed.unread=req.body.unread;
  const item=await updateEmail(req.params.id,allowed); if(!item)return res.status(404).json({error:'Email not found'}); res.json(item);
});
app.get('/api/clients', async (_req,res)=>{
  const [list,emails]=await Promise.all([getClients(),allEmails()]);
  res.json(list.map(c=>({...c, emailCount:emails.filter(e=>e.clientId===c.id).length, latest:emails.find(e=>e.clientId===c.id)?.time || c.lastActivity})));
});
app.get('/api/clients/:id', async (req,res)=>{
  const [list,emails]=await Promise.all([getClients(),allEmails()]); const client=list.find(c=>c.id===req.params.id || c._id===req.params.id);
  if(!client)return res.status(404).json({error:'Client not found'});
  res.json({...client,emails:emails.filter(e=>e.clientId===client.id)});
});
app.post('/api/ai/summary', async (req,res)=>{
  const email=await findEmail(req.body.emailId); if(!email)return res.status(404).json({error:'Email not found'});
  const summary=await askModel([
    {role:'system',content:'Summarise the email in 2-3 concise sentences. Identify the sender intent, requested action and any deadline. Never invent facts.'},
    {role:'user',content:`From: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body}`}
  ],email.summary);
  res.json({summary,mode:process.env.OPENAI_API_KEY?'live AI':'demo fallback'});
});
app.post('/api/ai/draft', async (req,res)=>{
  const email=await findEmail(req.body.emailId); if(!email)return res.status(404).json({error:'Email not found'});
  const instruction=String(req.body.instruction||'Write a concise, professional and friendly reply. Do not invent commitments.').slice(0,1000);
  const draft=await askModel([
    {role:'system',content:'You write professional email replies. Use only facts in the source email. Do not invent dates, approvals, attachments, prices, or promises. Return only the email body.'},
    {role:'user',content:`Source email:\n${email.body}\n\nSender: ${email.sender}\nSubject: ${email.subject}\nInstruction: ${instruction}`}
  ],email.draft || `Hi ${email.sender.split(' ')[0]},\n\nThanks for your email. I’ll review this and follow up with the relevant details shortly.\n\nBest,\nNihal`);
  res.json({draft,mode:process.env.OPENAI_API_KEY?'live AI':'demo fallback'});
});
app.post('/api/ai/chat', async (req,res)=>{
  const prompt=String(req.body.message||'').trim().slice(0,1500); if(!prompt)return res.status(400).json({error:'Message is required'});
  const items=await allEmails();
  const stats={assistant:items.filter(e=>e.status==='assistant').length,client:items.filter(e=>e.status==='client').length,none:items.filter(e=>e.status==='none').length};
  const fallback=(()=>{
    const q=prompt.toLowerCase();
    if(q.includes('pending')||q.includes('reply')) return `There are ${stats.assistant+stats.client} emails in reply workflows: ${stats.assistant} marked Assistant to reply and ${stats.client} marked Client to reply. Start with the high-priority threads from ${items.filter(e=>e.priority==='high').map(e=>e.sender).join(' and ')}.`;
    if(q.includes('summar')) return `Selected inbox snapshot: ${items.slice(0,3).map(e=>`${e.sender}: ${e.summary}`).join(' ')}`;
    if(q.includes('client')) return `Your demo workspace has ${memoryClients.length} client contacts. The most active companies include Northstar Labs, Brightside Co. and Aster Finance.`;
    return `I checked the sample inbox. There are ${stats.assistant} assistant tasks, ${stats.client} client follow-ups and ${stats.none} messages that need no reply. Try asking “What replies are pending?” or “Summarize the latest email.”`;
  })();
  const answer=await askModel([
    {role:'system',content:'You are InboxPilot, a precise email operations assistant. Answer using the supplied sample inbox context. Do not claim to send messages or access external mailboxes.'},
    {role:'user',content:`Inbox context:\n${items.slice(0,12).map(e=>`${e.sender} | ${e.company} | ${e.subject} | ${e.status} | ${e.summary}`).join('\n')}\n\nQuestion: ${prompt}`}
  ],fallback);
  res.json({answer,mode:process.env.OPENAI_API_KEY?'live AI':'demo fallback'});
});
app.post('/api/emails/:id/reply', async (req,res)=>{
  const email=await findEmail(req.params.id); if(!email)return res.status(404).json({error:'Email not found'});
  const text=String(req.body.text||'').trim(); if(!text)return res.status(400).json({error:'Reply text is required'});
  // Demo safety: this records a local reply in the app. It does not send email externally.
  if(dbReady) await Email.findByIdAndUpdate(req.params.id,{$push:{sentReplies:{text,createdAt:new Date()}},$set:{status:'none',unread:false}});
  else await updateEmail(req.params.id,{status:'none',unread:false,sentReplies:[...(email.sentReplies||[]),{text,createdAt:new Date().toISOString()}]});
  res.json({ok:true,message:'Reply saved in this demo workspace. No external email was sent.'});
});

const dist = path.join(ROOT,'dist');
app.use(express.static(dist));
app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html'),err=>{if(err)res.status(404).send('InboxPilot frontend not built. Run npm run build.');}));

if (hasMongo) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    dbReady=true; console.log('MongoDB connected.');
    if (await Email.countDocuments()===0) await Email.insertMany(demoEmails.map(({_id,...email})=>email));
    if (await Client.countDocuments()===0) await Client.insertMany(clients);
  } catch (err) { console.error('MongoDB connection failed; using in-memory sample data:',err.message); }
} else console.log('MONGO_URI not set; using in-memory sample data.');
app.listen(PORT,'0.0.0.0',()=>console.log(`InboxPilot API listening on ${PORT}`));
