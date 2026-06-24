'use client';

import { useMemo, useState } from 'react';

type Role = 'Lead' | 'Co-Lead' | 'Membre';
type Member = { id: number; name: string; role: Role; quota: number; active: boolean };
type Sale = { id: number; memberId: number; qty: number; revenue: number; status: 'Validée' | 'Vente nulle'; date: string };
type Request = { id: number; memberId: number; qty: number; buyPrice: number; status: 'En attente' | 'Validée' | 'Refusée' };

type Settings = { gangName: string; quota: number; globalTarget: number; basePay: number; bonusStep: number; bonusAmount: number; defaultBuyPrice: number; defaultSellPrice: number };

const initialMembers: Member[] = [
  { id: 1, name: 'Snoop', role: 'Lead', quota: 600, active: true },
  { id: 2, name: 'Tups', role: 'Co-Lead', quota: 600, active: true },
  { id: 3, name: 'Biggy', role: 'Membre', quota: 600, active: true },
  { id: 4, name: 'Zahir', role: 'Membre', quota: 600, active: true },
  { id: 5, name: 'Junior', role: 'Membre', quota: 600, active: true },
  { id: 6, name: 'Juice', role: 'Membre', quota: 600, active: true },
  { id: 7, name: 'Ice', role: 'Membre', quota: 600, active: true }
];

const initialSettings: Settings = {
  gangName: 'Blue Blocc',
  quota: 600,
  globalTarget: 3000,
  basePay: 30000,
  bonusStep: 200,
  bonusAmount: 2000,
  defaultBuyPrice: 270,
  defaultSellPrice: 450
};

const accounts = [
  { pseudo: 'snoop', pass: 'lead', memberId: 1 },
  { pseudo: 'tups', pass: 'lead', memberId: 2 },
  { pseudo: 'biggy', pass: 'membre', memberId: 3 },
  { pseudo: 'zahir', pass: 'membre', memberId: 4 },
  { pseudo: 'junior', pass: 'membre', memberId: 5 },
  { pseudo: 'juice', pass: 'membre', memberId: 6 },
  { pseudo: 'ice', pass: 'membre', memberId: 7 }
];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' $';
const kg = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' kg';

export default function Page() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [stock, setStock] = useState(2700);
  const [dirtyCash, setDirtyCash] = useState(1200000);
  const [sales, setSales] = useState<Sale[]>([
    { id: 1, memberId: 1, qty: 200, revenue: 90000, status: 'Validée', date: new Date().toLocaleDateString('fr-FR') },
    { id: 2, memberId: 3, qty: 50, revenue: 22500, status: 'Validée', date: new Date().toLocaleDateString('fr-FR') }
  ]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [view, setView] = useState('dashboard');
  const [login, setLogin] = useState({ pseudo: '', pass: '' });
  const [message, setMessage] = useState('');

  const current = members.find(m => m.id === currentMemberId) || null;
  const isAdmin = current?.role === 'Lead' || current?.role === 'Co-Lead';

  const visibleMembers = isAdmin ? members : members.filter(m => m.id === currentMemberId);
  const visibleSales = isAdmin ? sales : sales.filter(s => s.memberId === currentMemberId);

  const stats = useMemo(() => {
    const totalKg = sales.filter(s => s.status === 'Validée').reduce((a, s) => a + s.qty, 0);
    const totalRevenue = sales.filter(s => s.status === 'Validée').reduce((a, s) => a + s.revenue, 0);
    const lostKg = sales.filter(s => s.status === 'Vente nulle').reduce((a, s) => a + s.qty, 0);
    const cost = sales.reduce((a, s) => a + (s.qty * settings.defaultBuyPrice), 0);
    return { totalKg, totalRevenue, lostKg, profit: totalRevenue - cost };
  }, [sales, settings.defaultBuyPrice]);

  const memberStats = (id: number) => {
    const ms = sales.filter(s => s.memberId === id && s.status === 'Validée');
    const qty = ms.reduce((a, s) => a + s.qty, 0);
    const revenue = ms.reduce((a, s) => a + s.revenue, 0);
    const extra = Math.max(0, qty - settings.quota);
    const bonus = Math.floor(extra / settings.bonusStep) * settings.bonusAmount;
    const pay = qty >= settings.quota ? settings.basePay + bonus : 0;
    return { qty, revenue, progress: Math.min(100, Math.round((qty / settings.quota) * 100)), bonus, pay };
  };

  function doLogin() {
    const acc = accounts.find(a => a.pseudo.toLowerCase() === login.pseudo.toLowerCase() && a.pass === login.pass);
    if (!acc) return setMessage('Identifiants incorrects. Essaie snoop/lead ou biggy/membre.');
    setCurrentMemberId(acc.memberId);
    setView('dashboard');
    setMessage('');
  }

  function addSale(form: FormData) {
    const memberId = Number(form.get('memberId'));
    const qty = Number(form.get('qty'));
    const revenueRaw = form.get('revenue')?.toString() || '';
    const status = form.get('status')?.toString() === 'Vente nulle' ? 'Vente nulle' : 'Validée';
    const revenue = status === 'Vente nulle' ? 0 : Number(revenueRaw || qty * settings.defaultSellPrice);
    if (!memberId || !qty) return;
    setSales([{ id: Date.now(), memberId, qty, revenue, status, date: new Date().toLocaleDateString('fr-FR') }, ...sales]);
  }

  function addRequest(form: FormData) {
    const memberId = Number(form.get('memberId'));
    const qty = Number(form.get('qty'));
    const buyPrice = Number(form.get('buyPrice') || settings.defaultBuyPrice);
    if (!memberId || !qty) return;
    setRequests([{ id: Date.now(), memberId, qty, buyPrice, status: 'En attente' }, ...requests]);
  }

  function validateRequest(id: number, accept: boolean) {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    setRequests(requests.map(r => r.id === id ? { ...r, status: accept ? 'Validée' : 'Refusée' } : r));
    if (accept) {
      setStock(Math.max(0, stock - req.qty));
      setDirtyCash(Math.max(0, dirtyCash - req.qty * req.buyPrice));
    }
  }

  function addMember(form: FormData) {
    const name = String(form.get('name') || '').trim();
    const role = String(form.get('role') || 'Membre') as Role;
    if (!name) return;
    setMembers([...members, { id: Date.now(), name, role, quota: settings.quota, active: true }]);
  }

  if (!current) {
    return <main className="login app"><section className="login-card">
      <div className="brand"><div className="logo">BB</div><div><h1>Blue Blocc</h1><div className="muted">Gang manager · accès privé</div></div></div>
      <div className="field"><label>Pseudo</label><input value={login.pseudo} onChange={e=>setLogin({...login,pseudo:e.target.value})} placeholder="snoop" /></div>
      <div className="field"><label>Mot de passe</label><input type="password" value={login.pass} onChange={e=>setLogin({...login,pass:e.target.value})} placeholder="lead" /></div>
      <button className="btn full" onClick={doLogin}>Se connecter</button>
      {message && <div className="hint">{message}</div>}
      <div className="hint small">Comptes de test : <b>snoop / lead</b>, <b>tups / lead</b>, <b>biggy / membre</b>.</div>
    </section></main>;
  }

  const nav = [
    ['dashboard','Dashboard'], ['sales','Ventes'], ['requests','Demandes'],
    ...(isAdmin ? [['stock','Stock'], ['members','Membres'], ['payroll','Salaires'], ['settings','Paramètres']] : [] as string[][])
  ];

  return <main className="app layout">
    <aside className="sidebar">
      <div className="top-brand"><div className="logo">BB</div><div><h2>{settings.gangName}</h2><span className="role-pill">{current.name} · {current.role}</span></div></div>
      <nav className="nav">{nav.map(([id,label]) => <button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}</nav>
      <div style={{marginTop:20}}><button className="btn secondary full" onClick={()=>setCurrentMemberId(null)}>Déconnexion</button></div>
    </aside>
    <section className="main">
      <div className="header"><div><h1>{nav.find(n=>n[0]===view)?.[1]}</h1><p className="muted">Interface séparée : les membres ne voient pas les menus admin.</p></div><span className="tag">Objectif gang : {kg(settings.globalTarget)}</span></div>

      {view === 'dashboard' && <div className="grid">
        <div className="grid cols4">
          <Metric title="Stock entrepôt" value={kg(stock)} />
          <Metric title="Objectif semaine" value={`${kg(stats.totalKg)} / ${kg(settings.globalTarget)}`} pct={Math.min(100, Math.round(stats.totalKg/settings.globalTarget*100))} />
          <Metric title="Recette ventes" value={fmt(stats.totalRevenue)} />
          <Metric title="Bénéfice estimé" value={fmt(stats.profit)} />
        </div>
        <div className="card"><h3>Membres & quotas</h3><table className="table"><thead><tr><th>Membre</th><th>Rôle</th><th>Vendu</th><th>Progression</th><th>Paye</th></tr></thead><tbody>{visibleMembers.map(m=>{const s=memberStats(m.id);return <tr key={m.id}><td>{m.name}</td><td>{m.role}</td><td>{kg(s.qty)}</td><td><div className="progress"><span style={{width:s.progress+'%'}} /></div><small>{s.progress}%</small></td><td>{fmt(s.pay)}</td></tr>})}</tbody></table></div>
      </div>}

      {view === 'sales' && <div className="grid cols2"><div className="card"><h3>Ajouter une vente</h3><form action={addSale} className="grid">
        <div className="field"><label>Membre</label><select name="memberId" defaultValue={current.id} disabled={!isAdmin}>{visibleMembers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>{!isAdmin && <input type="hidden" name="memberId" value={current.id}/>}</div>
        <div className="field"><label>Quantité vendue (kg/items)</label><input name="qty" type="number" placeholder="50" /></div>
        <div className="field"><label>Recette de vente ($) optionnelle</label><input name="revenue" type="number" placeholder="prévision auto : quantité × 450" /></div>
        <div className="field"><label>Statut</label><select name="status"><option>Validée</option><option>Vente nulle</option></select></div>
        <button className="btn">Enregistrer</button>
      </form></div><div className="card"><h3>Historique ventes</h3><table className="table"><thead><tr><th>Date</th><th>Membre</th><th>Qté</th><th>Recette</th><th>Profit</th><th>Statut</th></tr></thead><tbody>{visibleSales.map(s=><tr key={s.id}><td>{s.date}</td><td>{members.find(m=>m.id===s.memberId)?.name}</td><td>{kg(s.qty)}</td><td>{fmt(s.revenue)}</td><td>{fmt(s.revenue - s.qty*settings.defaultBuyPrice)}</td><td>{s.status}</td></tr>)}</tbody></table></div></div>}

      {view === 'requests' && <div className="grid cols2"><div className="card"><h3>Demande de recharge</h3><form action={addRequest} className="grid"><input type="hidden" name="memberId" value={current.id}/><div className="field"><label>Quantité demandée</label><input name="qty" type="number" placeholder="200" /></div><div className="field"><label>Prix achat par weed</label><input name="buyPrice" type="number" defaultValue={settings.defaultBuyPrice}/></div><button className="btn">Envoyer la demande</button></form></div><div className="card"><h3>Demandes</h3><table className="table"><thead><tr><th>Membre</th><th>Qté</th><th>Prix</th><th>Total</th><th>Statut</th>{isAdmin && <th>Action</th>}</tr></thead><tbody>{requests.filter(r=>isAdmin||r.memberId===current.id).map(r=><tr key={r.id}><td>{members.find(m=>m.id===r.memberId)?.name}</td><td>{kg(r.qty)}</td><td>{fmt(r.buyPrice)}</td><td>{fmt(r.qty*r.buyPrice)}</td><td>{r.status}</td>{isAdmin && <td className="actions"><button className="btn" onClick={()=>validateRequest(r.id,true)}>Valider</button><button className="btn danger" onClick={()=>validateRequest(r.id,false)}>Refuser</button></td>}</tr>)}</tbody></table></div></div>}

      {view === 'stock' && isAdmin && <div className="grid cols2"><div className="card admin-only"><h3>Stock entrepôt</h3><div className="metric">{kg(stock)}</div><div className="field"><label>Modifier stock</label><input type="number" value={stock} onChange={e=>setStock(Number(e.target.value))}/></div></div><div className="card"><h3>Argent sale disponible</h3><div className="metric">{fmt(dirtyCash)}</div><div className="field"><label>Modifier argent sale</label><input type="number" value={dirtyCash} onChange={e=>setDirtyCash(Number(e.target.value))}/></div></div></div>}

      {view === 'members' && isAdmin && <div className="grid cols2"><div className="card admin-only"><h3>Ajouter un membre</h3><form action={addMember} className="grid"><div className="field"><label>Nom</label><input name="name" placeholder="Nouveau membre"/></div><div className="field"><label>Rôle</label><select name="role"><option>Membre</option><option>Co-Lead</option><option>Lead</option></select></div><button className="btn">Ajouter</button></form></div><div className="card"><h3>Liste membres</h3><table className="table"><thead><tr><th>Nom</th><th>Rôle</th><th>Quota</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.name}</td><td>{m.role}</td><td>{kg(m.quota)}</td></tr>)}</tbody></table></div></div>}

      {view === 'payroll' && isAdmin && <div className="card"><h3>Salaires automatiques</h3><table className="table"><thead><tr><th>Membre</th><th>Vendu</th><th>Base</th><th>Bonus</th><th>Total à payer</th></tr></thead><tbody>{members.map(m=>{const s=memberStats(m.id);return <tr key={m.id}><td>{m.name}</td><td>{kg(s.qty)}</td><td>{s.qty>=settings.quota?fmt(settings.basePay):'Quota non atteint'}</td><td>{fmt(s.bonus)}</td><td><b>{fmt(s.pay)}</b></td></tr>})}</tbody></table></div>}

      {view === 'settings' && isAdmin && <div className="card admin-only"><h3>Paramètres Lead</h3><div className="grid cols2">{Object.entries(settings).map(([key,val])=><div className="field" key={key}><label>{key}</label><input value={String(val)} onChange={e=>setSettings({...settings,[key]: typeof val === 'number' ? Number(e.target.value) : e.target.value})}/></div>)}</div></div>}
    </section>
  </main>;
}

function Metric({title,value,pct}:{title:string;value:string;pct?:number}){return <div className="card"><div className="muted small">{title}</div><div className="metric">{value}</div>{pct!==undefined&&<div className="progress"><span style={{width:pct+'%'}} /></div>}</div>}
