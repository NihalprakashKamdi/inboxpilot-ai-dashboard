import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Archive, ArrowDownUp, ArrowLeft, ArrowRight, Bell, Bot, BriefcaseBusiness,
  Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy, FileText,
  Filter, Inbox, LayoutDashboard, LifeBuoy, Mail, MailCheck, MailOpen, Menu, MessageCircle,
  MoreHorizontal, PanelLeftClose, Plus, RefreshCw, Reply, Search, Send, Settings, ShieldCheck,
  Sparkles, Star, Tag, Users, WandSparkles, X, Zap
} from 'lucide-react';
import { api } from './api';

const STATUS = {
  assistant:{label:'Assistant to reply',short:'Assistant reply',icon:Sparkles,className:'violet'},
  client:{label:'Client to reply',short:'Client reply',icon:Clock3,className:'amber'},
  none:{label:'No reply needed',short:'No reply',icon:Check,className:'green'}
};
const avatarColors={violet:'av-violet',blue:'av-blue',amber:'av-amber',pink:'av-pink',green:'av-green',teal:'av-teal',purple:'av-purple',orange:'av-orange'};
const initials=(name='')=>name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
const niceTime=t=>t||'—';

function Avatar({name, initials:given, color='violet', size='md'}) { return <div className={`avatar ${avatarColors[color]||'av-violet'} ${size}`}>{given||initials(name)}</div>; }
function StatusBadge({status}) { const s=STATUS[status]||STATUS.assistant; const Icon=s.icon; return <span className={`status-badge ${s.className}`}><Icon size={12}/>{s.label}</span>; }
function Button({children,kind='primary',size='',...props}) { return <button className={`button ${kind} ${size}`} {...props}>{children}</button>; }

export default function App(){
  const [emails,setEmails]=useState([]); const [clients,setClients]=useState([]); const [stats,setStats]=useState({total:248,assistant:0,client:0,none:0,unread:0});
  const [selectedId,setSelectedId]=useState(null); const [view,setView]=useState('inbox'); const [status,setStatus]=useState('all');
  const [query,setQuery]=useState(''); const [sort,setSort]=useState('new'); const [loading,setLoading]=useState(true);
  const [health,setHealth]=useState({database:'Demo data',ai:'demo fallback'}); const [draft,setDraft]=useState(''); const [draftBusy,setDraftBusy]=useState(false); const [chatText,setChatText]=useState('');
  const [chat,setChat]=useState([{role:'assistant',text:'Hi Nihal. I’ve reviewed the sample inbox. Ask me what needs a reply, request a summary, or draft a response.'}]);
  const [chatBusy,setChatBusy]=useState(false); const [toast,setToast]=useState(''); const [mobileNav,setMobileNav]=useState(false); const [selectedClient,setSelectedClient]=useState(null);
  const selected=emails.find(e=>(e._id||e.id)===selectedId)||emails[0]||null;

  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const [mail,clientList,dash,h]=await Promise.all([api.emails({status:'all',sort}),api.clients(),api.dashboard(),api.health()]);
      setEmails(mail.items||[]); setClients(clientList||[]); setStats(dash); setHealth(h);
      setSelectedId(prev=>prev&&mail.items.some(e=>(e._id||e.id)===prev)?prev:(mail.items[0]?._id||mail.items[0]?.id||null));
    }catch(e){notify(e.message);}finally{setLoading(false);}
  },[sort]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{if(!selected)return;setDraft(selected.draft||'');api.summary(selected._id||selected.id).then(result=>{if(result.summary)setEmails(prev=>prev.map(e=>(e._id||e.id)===(selected._id||selected.id)?{...e,summary:result.summary}:e));}).catch(()=>{});},[selectedId]);
  const notify=msg=>{setToast(msg);window.clearTimeout(notify.timer);notify.timer=window.setTimeout(()=>setToast(''),2600);};

  const filtered=useMemo(()=>{
    let list=[...emails]; if(status!=='all')list=list.filter(e=>e.status===status);
    if(query.trim()){const q=query.toLowerCase();list=list.filter(e=>[e.sender,e.company,e.subject,e.snippet,e.email,...(e.labels||[])].join(' ').toLowerCase().includes(q));}
    if(sort==='old')list.reverse(); return list;
  },[emails,status,query,sort]);
  const counts=useMemo(()=>({assistant:emails.filter(e=>e.status==='assistant').length,client:emails.filter(e=>e.status==='client').length,none:emails.filter(e=>e.status==='none').length}),[emails]);
  const title=({inbox:'Inbox overview',assistant:'Assistant to reply',client:'Client to reply',none:'No reply needed',clients:'Client directory',chat:'AI chat assistant',all:'All emails'})[view]||'Inbox overview';

  const openView=v=>{setView(v);setMobileNav(false);setStatus(v==='assistant'||v==='client'||v==='none'?v:'all');setSelectedClient(null);};
  const selectEmail=e=>{setSelectedId(e._id||e.id);setDraft(e.draft||'');if(e.unread)api.updateEmail(e._id||e.id,{unread:false}).then(updated=>setEmails(prev=>prev.map(x=>(x._id||x.id)===(e._id||e.id)?updated:x))).catch(()=>{});};
  const updateStatus=async value=>{if(!selected)return;try{const updated=await api.updateEmail(selected._id||selected.id,{status:value});setEmails(prev=>prev.map(e=>(e._id||e.id)===(selected._id||selected.id)?updated:e));notify('Email status updated');}catch(e){notify(e.message);}};
  const generateDraft=async()=>{if(!selected)return;setDraftBusy(true);try{const result=await api.draft(selected._id||selected.id,'Write a polished, concise and friendly reply. Stay accurate and avoid invented commitments.');setDraft(result.draft);notify(result.mode==='live AI'?'AI draft generated':'Demo draft refreshed');}catch(e){notify(e.message);}finally{setDraftBusy(false);}};
  const saveReply=async()=>{if(!selected||!draft.trim())return;try{const result=await api.reply(selected._id||selected.id,draft);const updated=await api.emails({status:'all',sort});setEmails(updated.items);notify(result.message); }catch(e){notify(e.message);}};
  const copyDraft=async()=>{try{await navigator.clipboard.writeText(draft);notify('Draft copied to clipboard');}catch{notify('Clipboard access is unavailable in this browser');}};
  const sendChat=async()=>{const message=chatText.trim();if(!message||chatBusy)return;setChat(prev=>[...prev,{role:'user',text:message}]);setChatText('');setChatBusy(true);try{const result=await api.chat(message);setChat(prev=>[...prev,{role:'assistant',text:result.answer}]);}catch(e){setChat(prev=>[...prev,{role:'assistant',text:`I hit a connection issue: ${e.message}`}]);}finally{setChatBusy(false);}};
  const showClient=c=>{setSelectedClient(c);setView('clients');};

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
      <div className="brand"><div className="brand-mark"><Mail size={19}/><Sparkles size={10} className="brand-spark"/></div><span>inboxpilot</span><span className="brand-beta">AI</span><button className="icon-btn sidebar-close" onClick={()=>setMobileNav(false)}><X size={17}/></button></div>
      <div className="workspace-switch"><div className="workspace-logo">A</div><div className="workspace-copy"><strong>Acme Studio</strong><span>Workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav">
        <NavItem icon={LayoutDashboard} label="Overview" active={view==='inbox'} onClick={()=>openView('inbox')}/>
        <NavItem icon={Inbox} label="All inbox" active={view==='all'} count={emails.length} onClick={()=>openView('all')}/>
        <NavItem icon={Sparkles} label="Assistant to reply" active={view==='assistant'} count={counts.assistant} onClick={()=>openView('assistant')}/>
        <NavItem icon={Clock3} label="Client to reply" active={view==='client'} count={counts.client} onClick={()=>openView('client')}/>
        <NavItem icon={CheckCircleIcon} label="No reply needed" active={view==='none'} count={counts.none} onClick={()=>openView('none')}/>
      </nav>
      <div className="nav-label nav-label-spaced">MANAGE</div>
      <nav className="main-nav">
        <NavItem icon={Users} label="Clients" active={view==='clients'} onClick={()=>openView('clients')}/>
        <NavItem icon={Bot} label="AI assistant" active={view==='chat'} onClick={()=>openView('chat')}/>
      </nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-icon"><Zap size={15}/></div><strong>Work smarter with AI</strong><p>Turn long email threads into clear next steps.</p><button onClick={()=>openView('chat')}>Explore assistant <ArrowRight size={13}/></button></div>
        <NavItem icon={CircleHelp} label="Help & support" onClick={()=>notify('Help centre is not connected in this demo')}/>
        <NavItem icon={Settings} label="Settings" onClick={()=>notify('Settings are not part of this prototype')}/>
        <div className="profile-row"><Avatar name="Nihal" color="blue"/><div><strong>Nihal</strong><span>Workspace owner</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13}/><strong>{selectedClient?selectedClient.company:title}</strong></div></div><div className="top-actions"><div className="demo-indicator"><span className="pulse-dot"/>Demo workspace</div><button className="icon-btn notification-btn" onClick={()=>notify('You’re all caught up on notifications')}><Bell size={17}/><i/></button><div className="top-avatar">N</div></div></header>
      <div className="page-wrap">
        <div className="page-heading"><div><div className="eyebrow">SUNDAY, NOVEMBER 15, 2026 <span className="eyebrow-dot"/> YOUR WORKSPACE</div><h1>{view==='inbox'?'Good afternoon, Nihal':title}</h1><p>{view==='inbox'?'Here’s the latest activity across your inbox.':view==='clients'?'Keep every client conversation and relationship in one place.':view==='chat'?'Your AI email copilot, ready to help with the busywork.':`Review and manage messages in ${title.toLowerCase()}.`}</p></div><Button onClick={refresh} kind="outline"><RefreshCw size={15}/> Refresh inbox</Button></div>
        {view==='clients' ? <ClientsPage clients={clients} selectedClient={selectedClient} onSelect={showClient} onBack={()=>setSelectedClient(null)} emails={emails} onEmail={e=>{setSelectedClient(null);openView('inbox');selectEmail(e);}}/> : view==='chat' ? <ChatPage chat={chat} text={chatText} setText={setChatText} send={sendChat} busy={chatBusy}/> : <>
          <section className="stats-grid">
            <StatCard icon={Mail} label="Total emails" value={stats.total??emails.length} note="Messages in sample workspace" tone="blue" trend="+12.8%"/>
            <StatCard icon={Sparkles} label="Assistant to reply" value={counts.assistant} note="Drafts ready for review" tone="violet" trend="Needs review"/>
            <StatCard icon={Clock3} label="Client to reply" value={counts.client} note="Waiting for next response" tone="amber" trend="Follow up"/>
            <StatCard icon={CheckCheck} label="No reply needed" value={counts.none} note="Automatically categorised" tone="green" trend="All clear"/>
          </section>
          <div className="content-grid">
            <section className="panel inbox-panel">
              <div className="panel-header"><div><div className="section-title"><h2>{view==='inbox'?'Inbox activity':title}</h2><span className="live-chip"><span/> LIVE VIEW</span></div><p>{view==='inbox'?'Your latest conversations, organised by AI.':`${filtered.length} messages in this category`}</p></div><button className="more-btn" onClick={()=>notify('Inbox menu opened in demo mode')}><MoreHorizontal size={19}/></button></div>
              <div className="inbox-toolbar"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search emails, clients, keywords…"/><kbd>⌘ K</kbd></div><div className="toolbar-actions"><div className="filter-wrap"><Filter size={14}/><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="assistant">Assistant reply</option><option value="client">Client reply</option><option value="none">No reply needed</option></select><ChevronDown size={13}/></div><button className="sort-btn" onClick={()=>setSort(s=>s==='new'?'old':'new')}><ArrowDownUp size={14}/><span>{sort==='new'?'Newest':'Oldest'}</span></button></div></div>
              <div className="email-list-head"><span>CONVERSATION</span><span>STATUS</span><span>RECEIVED</span></div>
              <div className="email-list">{loading?<div className="loading-state"><span className="spinner"/>Loading inbox…</div>:filtered.length===0?<div className="empty-state"><div className="empty-icon"><Search size={21}/></div><strong>No emails found</strong><p>Try a different search or status filter.</p><button onClick={()=>{setQuery('');setStatus('all');}}>Clear filters</button></div>:filtered.map((email)=><EmailRow key={email._id||email.id} email={email} selected={(email._id||email.id)===selectedId} onClick={()=>selectEmail(email)} onClient={()=>{const client=clients.find(c=>c.id===email.clientId);if(client)showClient(client);}}/> )}</div>
              <div className="list-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{emails.length}</strong> demo messages</span><span className="footer-pager">Sample inbox <ChevronRight size={13}/></span></div>
            </section>
            <aside className="right-rail">
              <section className="panel ai-panel">
                <div className="panel-header compact"><div className="ai-heading"><div className="ai-icon"><Sparkles size={16}/></div><div><h2>AI email insight</h2><p>Context, priorities and suggested action</p></div></div><span className="ai-tag">AI</span></div>
                {selected?<div className="ai-content"><div className="selected-mail-meta"><span className="mail-meta-icon"><FileText size={13}/></span><span>ANALYSIS FOR SELECTED EMAIL</span></div><h3>{selected.subject}</h3><div className="ai-summary-label"><Sparkles size={13}/> EXECUTIVE SUMMARY</div><p className="summary-copy">{selected.summary}</p><div className="priority-line"><span className={`priority-bullet ${selected.priority==='high'?'high':''}`}/><span>{selected.priority==='high'?'High priority · Needs attention':'Normal priority · No urgent action'}</span></div><div className="ai-divider"/><div className="draft-heading"><div><h3>Suggested reply</h3><p>Review and edit before saving.</p></div><button className="regenerate-btn" onClick={generateDraft} disabled={draftBusy}><WandSparkles size={14}/>{draftBusy?'Working…':'Regenerate'}</button></div><textarea className="draft-editor" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Your suggested reply will appear here…"/><div className="draft-actions"><Button kind="outline" size="small" onClick={copyDraft}><Copy size={14}/> Copy</Button><Button size="small" onClick={saveReply}><Check size={14}/> Save reply</Button></div><div className="reply-disclaimer"><ShieldCheck size={13}/> Saved locally in this demo. No email is sent.</div></div>:<div className="empty-detail">Select an email to see its AI summary and reply draft.</div>}
              </section>
              <section className="panel client-panel"><div className="panel-header compact"><div><h2>Client overview</h2><p>Recent conversations</p></div><button className="text-link" onClick={()=>openView('clients')}>View all <ArrowRight size={13}/></button></div><div className="client-mini-list">{clients.slice(0,4).map(c=><button className="client-mini" key={c.id} onClick={()=>showClient(c)}><Avatar name={c.name} initials={c.initials} color={c.color}/><span className="client-mini-copy"><strong>{c.name}</strong><small>{c.company}</small></span><span className="client-mini-count">{c.emailCount??c.emails} <ChevronRight size={13}/></span></button>)}</div></section>
              <section className="assistant-banner"><div className="assistant-banner-icon"><Bot size={18}/></div><div><strong>Need a hand with your inbox?</strong><p>Ask your AI assistant to find, summarise or draft.</p><button onClick={()=>openView('chat')}>Chat with InboxPilot <ArrowRight size={13}/></button></div><div className="banner-glow"/></section>
            </aside>
          </div>
        </>}
        <footer className="page-footer"><span>© 2026 InboxPilot</span><span><span className="footer-status-dot"/> {health.database||'Demo mode'} <span className="footer-divider">·</span> {health.ai||'Demo AI'}</span></footer>
      </div>
    </main>
    {toast&&<div className="toast"><CheckCircleIcon size={15}/>{toast}</div>}
  </div>;
}

function NavItem({icon:Icon,label,active,count,onClick}){return <button className={`nav-item ${active?'active':''}`} onClick={onClick}><Icon size={17}/><span>{label}</span>{count!==undefined&&<b>{count}</b>}</button>;}
function CheckCircleIcon({size=16}){return <CheckCheck size={size}/>;}
function StatCard({icon:Icon,label,value,note,tone,trend}){return <div className="stat-card"><div className="stat-top"><div className={`stat-icon ${tone}`}><Icon size={17}/></div><span className={`stat-trend ${tone}`}>{tone==='blue'?<Activity size={12}/>:tone==='green'?<Check size={12}/>:tone==='amber'?<Clock3 size={12}/>:<Sparkles size={12}/>} {trend}</span></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-note">{note}</div></div>;}
function EmailRow({email,selected,onClick,onClient}){return <button className={`email-row ${selected?'selected':''} ${email.unread?'unread':''}`} onClick={onClick}><div className="email-person"><Avatar name={email.sender} initials={email.initials} color={email.color}/><div className="email-person-copy"><div className="email-sender">{email.sender}{email.unread&&<i className="unread-dot"/>}</div><div className="email-company" onClick={e=>{e.stopPropagation();onClient();}}>{email.company}</div></div></div><div className="email-subject-cell"><strong>{email.subject}</strong><span>{email.snippet}</span><div className="mobile-status"><StatusBadge status={email.status}/></div></div><div className="email-status-cell"><StatusBadge status={email.status}/></div><div className="email-time-cell">{email.time}</div></button>;}
function ClientsPage({clients,selectedClient,onSelect,onBack,emails,onEmail}){const [q,setQ]=useState('');const list=clients.filter(c=>[c.name,c.company,c.email,c.role].join(' ').toLowerCase().includes(q.toLowerCase()));if(selectedClient){const related=emails.filter(e=>e.clientId===selectedClient.id);return <div className="client-detail-view"><button className="back-link" onClick={onBack}><ArrowLeft size={15}/> All clients</button><div className="client-profile panel"><Avatar name={selectedClient.name} initials={selectedClient.initials} color={selectedClient.color} size="xl"/><div className="client-profile-info"><h2>{selectedClient.name}</h2><p>{selectedClient.role} · {selectedClient.company}</p><a href={`mailto:${selectedClient.email}`}>{selectedClient.email}</a></div><span className="client-active-pill"><span/> Sample contact</span></div><div className="client-info-grid"><div className="panel client-info-card"><span>COMPANY</span><strong>{selectedClient.company}</strong></div><div className="panel client-info-card"><span>EMAIL THREADS</span><strong>{related.length}</strong></div><div className="panel client-info-card"><span>LAST ACTIVITY</span><strong>{selectedClient.lastActivity||'Recently'}</strong></div></div><section className="panel client-threads"><div className="panel-header"><div><h2>Conversation history</h2><p>Emails associated with this client</p></div></div>{related.length?related.map(e=><button className="client-thread-row" key={e._id||e.id} onClick={()=>onEmail(e)}><span className="thread-icon"><Mail size={15}/></span><span><strong>{e.subject}</strong><small>{e.snippet}</small></span><StatusBadge status={e.status}/><ChevronRight size={15}/></button>):<div className="empty-state">No sample emails are linked to this client.</div>}</section><section className="panel notes-panel"><div className="panel-header"><h2>Client notes</h2><span className="demo-note">DEMO DATA</span></div><p>{selectedClient.notes||'No notes yet.'}</p></section></div>;}
return <div className="clients-directory"><div className="directory-toolbar"><div><strong>{clients.length} clients</strong><span> · contacts in your workspace</span></div><div className="search-field small-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search clients…"/></div></div><div className="client-card-grid">{list.map(c=><button className="client-card panel" key={c.id} onClick={()=>onSelect(c)}><div className="client-card-top"><Avatar name={c.name} initials={c.initials} color={c.color} size="lg"/><span className="client-card-menu"><MoreHorizontal size={17}/></span></div><h3>{c.name}</h3><p>{c.role}</p><div className="client-card-company"><BriefcaseBusiness size={13}/>{c.company}</div><div className="client-card-footer"><span><Mail size={13}/>{c.email}</span><span>{c.emailCount??c.emails} threads <ChevronRight size={13}/></span></div></button>)}</div>{list.length===0&&<div className="empty-state">No clients match your search.</div>}</div>;}
function ChatPage({chat,text,setText,send,busy}){return <div className="chat-page panel"><div className="chat-page-head"><div className="ai-icon large"><Bot size={22}/></div><div><h2>InboxPilot assistant</h2><p>Ask questions about your email workflow.</p></div><span className="connected-pill"><span/> Ready</span></div><div className="chat-page-messages">{chat.map((m,i)=><div className={`chat-message ${m.role}`} key={i}><div className="chat-message-avatar">{m.role==='assistant'?<Sparkles size={15}/>:<span>N</span>}</div><div className="chat-message-body"><small>{m.role==='assistant'?'INBOXPILOT':'YOU'}</small><p>{m.text}</p></div></div>)}{busy&&<div className="chat-message assistant"><div className="chat-message-avatar"><Sparkles size={15}/></div><div className="typing-dots"><i/><i/><i/></div></div>}</div><div className="chat-suggestions"><span>Try asking</span>{['What replies are pending?','Summarise the latest emails','Which clients need attention?'].map(s=><button key={s} onClick={()=>setText(s)}>{s}</button>)}</div><form className="chat-page-input" onSubmit={e=>{e.preventDefault();send();}}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Ask anything about your inbox…"/><button type="submit" disabled={!text.trim()||busy}><Send size={16}/></button></form><div className="chat-safe-note"><ShieldCheck size={13}/> Demo data only. This assistant does not access or send real email.</div></div>;}
