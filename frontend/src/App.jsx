import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Package, Users, ClipboardList, RotateCcw, Receipt, Search, Plus, RefreshCw, ScanBarcode, Boxes, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
async function api(path, options={}) {
  const res = await fetch(`${API}${path}`, { headers: {'Content-Type':'application/json', ...(options.headers||{})}, ...options });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data) || 'Request failed');
  return data;
}
const money = v => `₹${Number(v || 0).toFixed(2)}`;
const nav = [
  ['Dashboard',LayoutDashboard],['Equipment',Package],['Students',Users],['Checkouts',ClipboardList],['Returns',RotateCcw],['Fines',Receipt]
];

export default function App() {
  const [page,setPage] = useState('Dashboard');
  const [data,setData] = useState({dashboard:{},equipment:[],students:[],checkouts:[],categories:[],fines:[]});
  const [search,setSearch] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [showForm,setShowForm] = useState(false);
  const [busy,setBusy] = useState(false);
  const [form,setForm] = useState({});
  const [barcode,setBarcode] = useState('');

  async function load() {
    setBusy(true); setError('');
    try {
      const [dashboard,equipment,students,checkouts,categories,fines] = await Promise.all([
        api('/dashboard/'),api('/equipment/'),api('/students/'),api('/checkouts/'),api('/categories/'),api('/fines/')
      ]);
      setData({dashboard,equipment:equipment.results||equipment,students:students.results||students,checkouts:checkouts.results||checkouts,categories:categories.results||categories,fines:fines.results||fines});
    } catch(e) { setError(`${e.message}. Check that Django is running and the database is configured.`); }
    finally { setBusy(false); }
  }
  useEffect(()=>{load()},[]);
  const active = data.checkouts.filter(x=>x.status==='active');
  const filteredEquipment = data.equipment.filter(x => `${x.name} ${x.barcode} ${x.category_name||''}`.toLowerCase().includes(search.toLowerCase()));
  const filteredStudents = data.students.filter(x => `${x.full_name} ${x.student_id}`.toLowerCase().includes(search.toLowerCase()));
  const filteredCheckouts = data.checkouts.filter(x => `${x.equipment_name} ${x.student_name} ${x.barcode}`.toLowerCase().includes(search.toLowerCase()));
  function notify(text,err=false){setMessage(err?'':text);setError(err?text:'');setTimeout(()=>{setMessage('');setError('')},5000)}
  async function submit(e){
    e.preventDefault();
    try {
      if(page==='Equipment') await api('/equipment/',{method:'POST',body:JSON.stringify({...form})});
      if(page==='Students') await api('/students/',{method:'POST',body:JSON.stringify({...form})});
      if(page==='Checkouts') await api('/checkouts/',{method:'POST',body:JSON.stringify({...form})});
      setShowForm(false);setForm({});notify('Saved successfully.');load();
    } catch(e){notify(e.message,true)}
  }
  async function returnItem(id){
    const condition=window.prompt('Return condition: good, damaged, or missing_parts','good');
    if(!condition) return;
    const notes=window.prompt('Inspection notes (optional)','')||'';
    try{const result=await api(`/checkouts/${id}/return_item/`,{method:'POST',body:JSON.stringify({condition,notes})});notify(`${result.detail} Fine: ${money(result.fine_amount)}`);load()}
    catch(e){notify(e.message,true)}
  }
  async function findBarcode(e){
    e.preventDefault();
    try {const found=await api(`/equipment/?barcode=${encodeURIComponent(barcode)}`);const rows=found.results||found; if(!rows.length) notify('No equipment found for this barcode.',true); else {setSearch(rows[0].name);setPage('Equipment');}}
    catch(e){notify(e.message,true)}
  }
  const stats=data.dashboard;
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Boxes size={23}/></div><div><b>LabTrack</b><small>Equipment checkout</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?'selected':''}`} onClick={()=>{setPage(label);setSearch('');setShowForm(false)}}><Icon size={18}/>{label}</button>)}
      <div className="side-foot"><span className="online-dot"/> Local development</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">COLLEGE LABORATORY</div><h1>{page}</h1></div><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={18}/></button></header>
      {message&&<div className="notice success">{message}</div>}{error&&<div className="notice error"><AlertCircle size={17}/>{error}</div>}
      {page==='Dashboard'&&<Dashboard stats={stats} active={active} fines={data.fines} setPage={setPage}/>}
      {page!=='Dashboard'&&<section className="panel">
        <div className="toolbar">
          <div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${page.toLowerCase()}...`}/></div>
          <div className="toolbar-actions">
            {page==='Equipment'&&<form className="barcode-search" onSubmit={findBarcode}><ScanBarcode size={17}/><input value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="Scan barcode"/><button>Find</button></form>}
            {['Equipment','Students','Checkouts'].includes(page)&&<button className="primary" onClick={()=>{setForm({});setShowForm(true)}}><Plus size={17}/> Add {page==='Checkouts'?'checkout':page==='Students'?'student':'equipment'}</button>}
          </div>
        </div>
        {showForm&&<form className="entry-form" onSubmit={submit}>
          {page==='Equipment'&&<><Field label="Equipment name" name="name" form={form} set={setForm} required/><Field label="Barcode" name="barcode" form={form} set={setForm} required/><label>Category<select required value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Select category</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Field label="Location" name="location" form={form} set={setForm}/><Field label="Description" name="description" form={form} set={setForm}/></>}
          {page==='Students'&&<><Field label="Student ID" name="student_id" form={form} set={setForm} required/><Field label="Full name" name="full_name" form={form} set={setForm} required/><Field label="Email" name="email" form={form} set={setForm}/><Field label="Department" name="department" form={form} set={setForm}/><Field label="Year of study" name="year_of_study" type="number" form={form} set={setForm}/><Field label="Phone" name="phone" form={form} set={setForm}/></>}
          {page==='Checkouts'&&<><label>Equipment<select required value={form.equipment||''} onChange={e=>setForm({...form,equipment:e.target.value})}><option value="">Select available equipment</option>{data.equipment.filter(x=>x.status==='available'&&!x.is_checked_out).map(x=><option key={x.id} value={x.id}>{x.name} — {x.barcode}</option>)}</select></label><label>Student<select required value={form.student||''} onChange={e=>setForm({...form,student:e.target.value})}><option value="">Select student</option>{data.students.map(x=><option key={x.id} value={x.id}>{x.full_name} ({x.student_id})</option>)}</select></label><Field label="Due date" name="due_date" type="date" form={form} set={setForm} required/><Field label="Notes" name="notes" form={form} set={setForm}/></>}
          <div className="form-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary">Save record</button></div>
        </form>}
        {page==='Equipment'&&<table><thead><tr><th>Equipment</th><th>Barcode</th><th>Category</th><th>Location</th><th>Status</th></tr></thead><tbody>{filteredEquipment.map(x=><tr key={x.id}><td><b>{x.name}</b><small>{x.description}</small></td><td><code>{x.barcode}</code></td><td>{x.category_name}</td><td>{x.location||'—'}</td><td><span className={`pill ${x.is_checked_out?'warn':x.status==='available'?'good':'muted'}`}>{x.is_checked_out?'Checked out':x.status}</span></td></tr>)}</tbody></table>}
        {page==='Students'&&<table><thead><tr><th>Student</th><th>Student ID</th><th>Department</th><th>Year</th><th>Email</th></tr></thead><tbody>{filteredStudents.map(x=><tr key={x.id}><td><b>{x.full_name}</b></td><td>{x.student_id}</td><td>{x.department||'—'}</td><td>{x.year_of_study}</td><td>{x.email||'—'}</td></tr>)}</tbody></table>}
        {(page==='Checkouts'||page==='Returns')&&<table><thead><tr><th>Equipment</th><th>Student</th><th>Checkout date</th><th>Due date</th><th>Status</th>{page==='Returns'&&<th>Action</th>}</tr></thead><tbody>{filteredCheckouts.filter(x=>page==='Returns'?x.status==='active':true).map(x=><tr key={x.id}><td><b>{x.equipment_name}</b><small>{x.barcode}</small></td><td>{x.student_name}<small>{x.student_code}</small></td><td>{new Date(x.checked_out_at).toLocaleDateString()}</td><td>{x.due_date}</td><td><span className={`pill ${x.status==='active'?'warn':'good'}`}>{x.status}</span></td>{page==='Returns'&&<td><button className="small-btn" onClick={()=>returnItem(x.id)}>Record return</button></td>}</tr>)}</tbody></table>}
        {page==='Fines'&&<table><thead><tr><th>Student</th><th>Equipment</th><th>Overdue days</th><th>Fine</th><th>Payment</th></tr></thead><tbody>{data.fines.map(x=><tr key={x.id}><td>{x.student_name}</td><td>{x.equipment_name}</td><td>{x.overdue_days}</td><td><b>{money(x.amount)}</b></td><td><span className={`pill ${x.paid?'good':'warn'}`}>{x.paid?'Paid':'Unpaid'}</span></td></tr>)}</tbody></table>}
        {((page==='Equipment'&&!filteredEquipment.length)||(page==='Students'&&!filteredStudents.length)||(page==='Checkouts'&&!filteredCheckouts.length)||(page==='Fines'&&!data.fines.length))&&<div className="empty">No records found. Add your first record or change the search.</div>}
      </section>}
      <footer>College Lab Equipment Checkout <span>React · Django REST · Supabase PostgreSQL</span></footer>
    </main>
  </div>
}
function Field({label,name,form,set,type='text',required=false}){return <label>{label}<input type={type} required={required} value={form[name]??''} onChange={e=>set({...form,[name]:type==='number'?Number(e.target.value):e.target.value})}/></label>}
function Dashboard({stats,active,fines,setPage}){
  const cards=[['Total equipment',stats.equipment_total??'—',Package],['Available items',stats.available??'—',Boxes],['Active checkouts',stats.active_checkouts??'—',ClipboardList],['Overdue returns',stats.overdue??'—',AlertCircle]];
  return <><div className="welcome"><div><div className="eyebrow light">INVENTORY OVERVIEW</div><h2>Good morning, lab team.</h2><p>Monitor equipment, student checkouts and returns from one place.</p></div><div className="welcome-art"><Boxes size={62}/></div></div>
    <div className="stats">{cards.map(([label,value,Icon])=><div className="stat" key={label}><div className="stat-icon"><Icon size={19}/></div><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="dash-grid"><section className="panel"><div className="panel-head"><div><h3>Recent checkouts</h3><p>Latest equipment activity</p></div><button className="text-btn" onClick={()=>setPage('Checkouts')}>View all</button></div>{active.slice(0,5).map(x=><div className="activity" key={x.id}><div className="activity-icon"><Package size={17}/></div><div><b>{x.equipment_name}</b><small>{x.student_name} · Due {x.due_date}</small></div><span className="pill warn">Active</span></div>)}{!active.length&&<div className="empty">No active checkouts yet.</div>}</section>
    <section className="panel fine-panel"><div className="panel-head"><div><h3>Fine summary</h3><p>Outstanding overdue amount</p></div><Receipt size={20}/></div><strong className="fine-total">{money(stats.unpaid_fines)}</strong><p className="muted-text">{fines.filter(x=>!x.paid).length} unpaid fine records</p><button className="primary full" onClick={()=>setPage('Fines')}>Review fines</button><div className="mini-note">Fine rate is configured by the administrator.</div></section></div>
  </>
}
