const seedData = {
  version: 1,
  expenses: [
    { id: "e1", name: "Sawa", amount: 138 },
    { id: "e2", name: "iCloud", amount: 14 },
    { id: "e3", name: "Expenses", amount: 205.35 },
    { id: "e4", name: "Tappy", amount: 232.65 }
  ],
  rewardBase: 990,
  creditors: [
    { id: "c1", name: "Sister", amount: 300 },
    { id: "c2", name: "Dehmy", amount: 288.5 },
    { id: "c3", name: "Abod", amount: 243 }
  ],
  fuel: [
    { id: "f1", date: "2026-07-02", amount: 95 },
    { id: "f2", date: "2026-07-07", amount: 52 }
  ],
  months: {
    "February": { rate: 31.48, sent: 1921.35, shifts: [
      [14,"05:00",125],[18,"08:53",279.577028],[19,"06:00",188.88],[20,"06:00",188.88],[22,"06:00",246],[23,"06:00",188.88],[24,"07:40",241.4516],[25,"06:00",188.88],[26,"08:00",251.84],[27,"08:58",282.227644]
    ]},
    "March": { rate: 31.48, sent: 5421.32, shifts: [
      [1,"09:00",283.32],[2,"09:00",283.32],[3,"08:00",251.84],[4,"09:00",283.32],[5,"08:00",251.84],[6,"09:00",283.32],[8,"08:00",251.84],[9,"09:00",283.32],[10,"08:00",251.84],[11,"08:00",251.84],[12,"09:00",283.32],[14,"03:00",94.44],[15,"09:00",283.32],[16,"09:00",283.32],[17,"09:00",283.32],[18,"09:00",283.32],[21,"08:00",328],[22,"07:58",326.6333333],[24,"06:15",156.25],[25,"06:32",163.3333333]
    ]},
    "May": { rate: 25, sent: 2629.33, shifts: [
      [1,"05:00",125],[5,"05:00",125],[6,"05:00",125],[8,"05:00",125],[11,"05:00",125],[15,"05:20",133.3333333],[16,"05:00",125],[19,"05:15",131.25],[21,"05:00",125],[22,"05:00",125],[23,"05:00",125],[24,"06:30",162.5],[25,"07:45",193.75],[26,"07:00",287],[29,"05:00",205],[30,"06:30",266.5],[31,"05:00",125]
    ]},
    "June": { rate: 25, sent: 0, shifts: [
      [3,"07:00",150],[5,"05:00",125],[6,"06:00",150],[7,"06:00",150],[8,"05:00",125],[10,"05:00",125],[12,"05:00",125],[13,"04:00",100],[16,"07:30",187.5],[17,"07:30",187.5],[18,"06:30",162.5],[20,"07:00",175],[21,"07:00",175],[22,"06:30",162.5],[24,"07:00",175],[25,"08:00",200],[27,"09:00",225],[28,"08:00",200],[29,"08:00",200],[30,"09:00",225]
    ]},
    "July": { rate: 25, sent: 0, shifts: [
      [1,"07:00",175],[2,"05:00",125],[4,"05:30",137.5],[5,"05:00",125],[6,"05:40",141.6666667],[8,"08:00",200]
    ]}
  },
  rewards: [
    [1,"2026-03-26",990,true],[2,"2026-04-27",990,true],[3,"2026-05-24",990,true],[4,"2026-06-28",990,true],[5,"2026-07-27",990,false],[6,"2026-08-27",990,false],[7,"2026-09-27",990,false],[8,"2026-10-27",990,false],[9,"2026-11-26",990,false],[10,"2026-12-27",990,false],[11,"2027-01-27",990,false],[12,"2027-02-28",990,false],[13,"2027-03-28",990,false],[14,"2027-04-27",990,false],[15,"2027-05-27",990,false],[16,"2027-06-27",990,false],[17,"2027-07-27",990,false]
  ].map(([n,date,amount,received]) => ({ id:`r${n}`, n, date, amount, received }))
};


let firebaseConfig = { apiKey:'', authDomain:'', projectId:'', storageBucket:'', messagingSenderId:'', appId:'' };

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE_KEY = 'my-finance-data-v1';
let state = migrateState(loadLocal());
let activeMonth = Object.keys(state.months)[0];
let firebase = null;
let currentUser = null;

const monthNamesAr = {February:'فبراير',March:'مارس',May:'مايو',June:'يونيو',July:'يوليو'};
const fmtMoney = n => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number(n||0));
const fmtDate = s => new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium'}).format(new Date(`${s}T12:00:00`));
const uid = p => `${p}${Date.now()}${Math.random().toString(16).slice(2)}`;

function cloneSeed(){ return JSON.parse(JSON.stringify(seedData)); }
function loadLocal(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || cloneSeed(); } catch { return cloneSeed(); } }
function saveLocal(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('Local storage unavailable',e); } setSync('local'); }
function deepTotal(arr, key='amount'){ return arr.reduce((s,x)=>s+Number(x[key]||0),0); }
function durationHours(t){
  if (typeof t === 'number') return Number(t) || 0;
  if(!t) return 0;
  if (String(t).includes(':')) { const [h,m]=String(t).split(':').map(Number); return (h||0) + (m||0)/60; }
  return Number(t)||0;
}
function monthNumber(name){ return ({February:'02',March:'03',May:'05',June:'06',July:'07'})[name] || '01'; }
function shiftDateFromLegacy(monthName, day){ return `2026-${monthNumber(monthName)}-${String(day).padStart(2,'0')}`; }
function normalizeShift(shift, monthName){
  if (Array.isArray(shift)) {
    const hours = durationHours(shift[1]);
    const total = Number(shift[2]||0);
    return { date: shiftDateFromLegacy(monthName, shift[0]), hours, rate: hours ? total / hours : 0 };
  }
  return {
    date: shift.date || shiftDateFromLegacy(monthName, shift.day || 1),
    hours: Number(shift.hours||0),
    rate: Number(shift.rate||shift.hourlyRate||0)
  };
}
function migrateState(data){
  const next = data || cloneSeed();
  if (next.months) {
    Object.entries(next.months).forEach(([monthName,m])=>{
      m.shifts = (m.shifts||[]).map(x=>normalizeShift(x,monthName));
    });
  }
  return next;
}
function shiftTotal(shift){ return Number(shift.hours||0) * Number(shift.rate||0); }

function marnTotals(){
  return Object.entries(state.months).map(([name,m])=>({
    name,
    total:(m.shifts||[]).reduce((sum,x)=>sum+shiftTotal(x),0),
    hours:(m.shifts||[]).reduce((sum,x)=>sum+Number(x.hours||0),0),
    sent:Number(m.sent||0)
  }));
}
function metrics(){
  const marn = marnTotals();
  const marnTotal = marn.reduce((s,m)=>s+m.total,0);
  const rewardRemaining = state.rewards.filter(r=>!r.received).reduce((s,r)=>s+Number(r.amount),0);
  const creditors = deepTotal(state.creditors);
  const expenses = deepTotal(state.expenses);
  const fuel = deepTotal(state.fuel);
  return {marnTotal,rewardRemaining,creditors,expenses,fuel,net:marnTotal+rewardRemaining+creditors-expenses-fuel};
}

function render(){ renderDashboard(); renderSalary(); renderMarn(); renderRewards(); }
function renderDashboard(){
  const m=metrics();
  $('#netPosition').textContent=`${fmtMoney(m.net)} ر.س`;
  $('#marnTotalKpi').textContent=fmtMoney(m.marnTotal);
  $('#rewardRemainingKpi').textContent=fmtMoney(m.rewardRemaining);
  $('#creditorsKpi').textContent=fmtMoney(m.creditors);
  $('#expensesKpi').textContent=fmtMoney(m.expenses);
  const totals=marnTotals(), max=Math.max(...totals.map(x=>x.total),1);
  $('#incomeBars').innerHTML=totals.map(x=>`<div class="bar-wrap"><span class="bar-label">${monthNamesAr[x.name]||x.name}</span><div class="bar" style="height:${Math.max(4,x.total/max*180)}px"></div><span class="bar-value">${fmtMoney(x.total)}</span></div>`).join('');
  const today=new Date(); today.setHours(0,0,0,0);
  const next=state.rewards.filter(r=>!r.received && new Date(`${r.date}T00:00:00`)>=today).sort((a,b)=>a.date.localeCompare(b.date))[0] || state.rewards.find(r=>!r.received);
  if(next){ const d=Math.max(0,Math.ceil((new Date(`${next.date}T00:00:00`)-today)/86400000)); $('#nextRewardCard').innerHTML=`<div><span class="countdown">${d}</span> <span class="countdown-label">يوم</span></div><div class="reward-date">${fmtDate(next.date)} · ${fmtMoney(next.amount)} ر.س</div>`; }
  else $('#nextRewardCard').innerHTML='<p>تم استلام جميع المكافآت المسجلة 🎉</p>';
}

function table(headers, rows){ return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`; }
function actions(type,id){ return `<div class="row-actions"><button class="mini-btn" data-edit="${type}" data-id="${id}">تعديل</button><button class="mini-btn" data-delete="${type}" data-id="${id}">حذف</button></div>`; }

function renderSalary(){
  let running=Number(state.rewardBase||0);
  const exRows=state.expenses.map(x=>{ running-=Number(x.amount); return `<tr><td>${escapeHtml(x.name)}</td><td class="amount negative">${fmtMoney(x.amount)}</td><td class="amount">${fmtMoney(running)}</td><td>${actions('expense',x.id)}</td></tr>`; });
  $('#expensesTable').innerHTML=table(['البند','المبلغ','المتبقي',''],exRows);
  let cr=0; const crRows=state.creditors.map(x=>{cr+=Number(x.amount);return `<tr><td>${escapeHtml(x.name)}</td><td class="amount positive">${fmtMoney(x.amount)}</td><td>${fmtMoney(cr)}</td><td>${actions('creditor',x.id)}</td></tr>`});
  $('#creditorsTable').innerHTML=table(['الاسم','المبلغ','التراكمي',''],crRows);
  let fb=0; const fuelRows=state.fuel.map(x=>{fb+=Number(x.amount);return `<tr><td>${fmtDate(x.date)}</td><td class="amount negative">${fmtMoney(x.amount)}</td><td>${fmtMoney(fb)}</td><td>${actions('fuel',x.id)}</td></tr>`});
  $('#fuelTable').innerHTML=table(['التاريخ','المبلغ','الإجمالي',''],fuelRows);
  $('#incomeSummaryTable').innerHTML=table(['الشهر','المحسوب','المرسل','الفرق'],marnTotals().map(x=>`<tr><td>${monthNamesAr[x.name]||x.name}</td><td>${fmtMoney(x.total)}</td><td>${fmtMoney(x.sent)}</td><td class="${x.total-x.sent>=0?'positive':'negative'}">${fmtMoney(x.total-x.sent)}</td></tr>`));
}

function renderMarn(){
  $('#monthTabs').innerHTML=Object.keys(state.months).map(name=>`<button class="month-tab ${name===activeMonth?'active':''}" data-month="${name}">${monthNamesAr[name]||name}</button>`).join('');
  const m=state.months[activeMonth]; $('#activeMonthTitle').textContent=`شفتات ${monthNamesAr[activeMonth]||activeMonth}`;
  const hours=(m.shifts||[]).reduce((sum,x)=>sum+Number(x.hours||0),0);
  const total=(m.shifts||[]).reduce((sum,x)=>sum+shiftTotal(x),0);
  $('#monthSummary').innerHTML=`<span>${m.shifts.length} شفت</span><span>${hours.toFixed(2)} ساعة</span><span>${fmtMoney(total)} ر.س</span>`;
  const rows=m.shifts.map((x,i)=>`<tr><td>${fmtDate(x.date)}</td><td>${Number(x.hours).toFixed(2)}</td><td>${Math.max(0,Number(x.hours)-5).toFixed(2)}</td><td>${fmtMoney(x.rate)} ر.س/ساعة</td><td class="amount positive">${fmtMoney(shiftTotal(x))}</td><td>${actions('shift',i)}</td></tr>`);
  $('#shiftsTable').innerHTML=table(['التاريخ','عدد الساعات','الإضافي بعد 5 ساعات','سعر الساعة','مبلغ الشفت',''],rows);
}
function renderRewards(){
  const today=new Date(); today.setHours(0,0,0,0);
  const rows=state.rewards.map(r=>{const days=Math.max(0,Math.ceil((new Date(`${r.date}T00:00:00`)-today)/86400000));return `<tr><td>${r.n}</td><td>${fmtDate(r.date)}</td><td>${new Intl.DateTimeFormat('ar-SA',{weekday:'long'}).format(new Date(`${r.date}T12:00:00`))}</td><td class="amount">${fmtMoney(r.amount)}</td><td><button class="mini-btn" data-toggle-reward="${r.id}">${r.received?'✅ مستلمة':'⏳ منتظرة'}</button></td><td>${r.received?'—':days}</td><td>${actions('reward',r.id)}</td></tr>`});
  $('#rewardsTable').innerHTML=table(['#','التاريخ','اليوم','المبلغ','الحالة','الأيام المتبقية',''],rows);
}

function showView(name){
  $$('.view').forEach(v=>v.classList.remove('active')); $(`#${name}View`).classList.add('active');
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={dashboard:'لوحة التحكم',salary:'الراتب والالتزامات',marn:'دخل مرن',rewards:'مكافآت الجامعة',settings:'الإعدادات'}; $('#pageTitle').textContent=titles[name]; $('#sidebar').classList.remove('open');
}
function openModal(html){ $('#modalContent').innerHTML=html; $('#modalBackdrop').hidden=false; }
function closeModal(){ $('#modalBackdrop').hidden=true; $('#modalContent').innerHTML=''; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function itemForm(type,item={}){
  const defs={
    expense:{title:'مصروف',fields:[['name','اسم البند','text'],['amount','المبلغ','number']]},
    creditor:{title:'دائن',fields:[['name','الاسم','text'],['amount','المبلغ','number']]},
    fuel:{title:'بنزين',fields:[['date','التاريخ','date'],['amount','المبلغ','number']]},
    reward:{title:'مكافأة',fields:[['date','التاريخ','date'],['amount','المبلغ','number']]},
    shift:{title:'شفت',fields:[['date','التاريخ','date'],['hours','عدد الساعات','number'],['rate','سعر الساعة (ر.س)','number']]}
  }[type];
  openModal(`<form class="form" id="itemForm"><h2>${item.__edit?'تعديل':'إضافة'} ${defs.title}</h2><p>${type==='shift'?'اختر التاريخ من التقويم، وأدخل عدد الساعات وسعر الساعة. سيُحسب مبلغ الشفت تلقائيًا.':'أدخل البيانات ثم احفظ.'}</p>${defs.fields.map(([k,l,t])=>`<label class="field"><span>${l}</span><input name="${k}" type="${t}" step="0.01" required value="${escapeHtml(item[k]??'')}"></label>`).join('')}<div class="form-actions"><button class="primary-btn" type="submit">حفظ</button><button class="secondary-btn" type="button" id="cancelModal">إلغاء</button></div></form>`);
  $('#cancelModal').onclick=closeModal;
  $('#itemForm').onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));saveItem(type,item,fd);};
}

async function saveItem(type,item,fd){
  if(type==='shift'){
    const arr=state.months[activeMonth].shifts; const val={date:fd.date,hours:Number(fd.hours),rate:Number(fd.rate)}; item.__edit?arr[item.index]=val:arr.push(val); arr.sort((a,b)=>a.date.localeCompare(b.date));
  } else {
    const key={expense:'expenses',creditor:'creditors',fuel:'fuel',reward:'rewards'}[type], arr=state[key];
    const data={...fd,amount:Number(fd.amount)};
    if(type==='reward'){ data.received=item.received??false; data.n=item.n??Math.max(0,...arr.map(x=>x.n))+1; }
    if(item.__edit){ const idx=arr.findIndex(x=>x.id===item.id); arr[idx]={...arr[idx],...data}; } else arr.push({id:uid(type[0]),...data});
  }
  await persist(); closeModal(); render(); toast('تم الحفظ');
}

async function removeItem(type,id){
  if(!confirm('متأكد من الحذف؟')) return;
  if(type==='shift') state.months[activeMonth].shifts.splice(Number(id),1);
  else { const key={expense:'expenses',creditor:'creditors',fuel:'fuel',reward:'rewards'}[type]; state[key]=state[key].filter(x=>x.id!==id); }
  await persist(); render(); toast('تم الحذف');
}

function editItem(type,id){
  if(type==='shift'){ const x=state.months[activeMonth].shifts[Number(id)]; itemForm(type,{__edit:true,index:Number(id),date:x.date,hours:x.hours,rate:x.rate}); return; }
  const key={expense:'expenses',creditor:'creditors',fuel:'fuel',reward:'rewards'}[type]; const x=state[key].find(x=>x.id===id); itemForm(type,{...x,__edit:true});
}

async function persist(){ saveLocal(); if(firebase && currentUser){ try{ await firebase.setDoc(firebase.doc(firebase.db,'users',currentUser.uid),{data:state,updatedAt:firebase.serverTimestamp()},{merge:true}); setSync('cloud'); }catch(e){ console.error(e); toast('حُفظ محليًا وتعذرت المزامنة'); } } }
function setSync(mode){ const el=$('#syncStatus'); el.classList.toggle('cloud',mode==='cloud'); el.querySelector('span:last-child').textContent=mode==='cloud'?'متزامن مع Firebase':'محفوظ محليًا'; }

async function initFirebase(){
  try {
    try {
      const cfg = await import('./firebase-config.js');
      if (cfg?.firebaseConfig) firebaseConfig = cfg.firebaseConfig;
    } catch (e) {
      console.warn('firebase-config.js غير موجود أو غير صالح. سيعمل الموقع محليًا.', e);
    }
    if(!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      setSync('local');
      return;
    }
    const appMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const authMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const fsMod=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const app=appMod.initializeApp(firebaseConfig), auth=authMod.getAuth(app), db=fsMod.getFirestore(app);
    firebase={auth,db,...authMod,...fsMod};
    authMod.onAuthStateChanged(auth, async user=>{currentUser=user; $('#logoutBtn').hidden=!user; $('#openAuthBtn').textContent=user?'الحساب متصل':'ربط ومزامنة'; if(user){await loadCloud();} else setSync('local');});
  }catch(e){console.error('Firebase init failed',e);toast('تعذر تشغيل Firebase، الموقع يعمل محليًا');}
}

async function loadCloud(){
  try{ const ref=firebase.doc(firebase.db,'users',currentUser.uid), snap=await firebase.getDoc(ref); if(snap.exists() && snap.data().data){state=snap.data().data; saveLocal();} else await firebase.setDoc(ref,{data:state,updatedAt:firebase.serverTimestamp()}); setSync('cloud'); render(); }
  catch(e){ console.error(e); toast('تعذر تحميل البيانات السحابية'); }
}

function authModal(){
  if(!firebase){ openModal(`<div class="form"><h2>Firebase غير مفعّل</h2><p>افتح ملف <code>firebase-config.js</code> والصق إعدادات تطبيق الويب من Firebase ثم فعّل Email/Password في Authentication.</p><button class="primary-btn" id="okBtn">حسنًا</button></div>`); $('#okBtn').onclick=closeModal; return; }
  if(currentUser){ openModal(`<div class="form"><h2>الحساب متصل</h2><p>${escapeHtml(currentUser.email||'')}</p><button class="danger-btn" id="modalLogout">تسجيل الخروج</button></div>`); $('#modalLogout').onclick=async()=>{await firebase.signOut(firebase.auth);closeModal();};return; }
  openModal(`<form class="form" id="authForm"><h2>تسجيل الدخول</h2><p>استخدم البريد وكلمة المرور لمزامنة بياناتك.</p><label class="field"><span>البريد الإلكتروني</span><input type="email" name="email" required></label><label class="field"><span>كلمة المرور</span><input type="password" name="password" minlength="6" required></label><div class="form-actions"><button class="primary-btn" type="submit">دخول</button><button class="secondary-btn" type="button" id="signupBtn">إنشاء حساب</button></div></form>`);
  $('#authForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await firebase.signInWithEmailAndPassword(firebase.auth,f.get('email'),f.get('password'));closeModal();toast('تم تسجيل الدخول');}catch(err){toast(firebaseError(err));}};
  $('#signupBtn').onclick=async()=>{const form=$('#authForm'),email=form.email.value,password=form.password.value;if(!form.reportValidity())return;try{await firebase.createUserWithEmailAndPassword(firebase.auth,email,password);closeModal();toast('تم إنشاء الحساب');}catch(err){toast(firebaseError(err));}};
}
function firebaseError(e){ const c=e?.code||''; if(c.includes('invalid-credential'))return'بيانات الدخول غير صحيحة'; if(c.includes('email-already-in-use'))return'البريد مستخدم مسبقًا'; if(c.includes('weak-password'))return'كلمة المرور ضعيفة'; return 'حدث خطأ في المصادقة'; }

// Events
$$('.nav-item').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
$('#themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';localStorage.setItem('finance-theme',dark?'light':'dark');};
$$('[data-add]').forEach(b=>b.onclick=()=>itemForm(b.dataset.add));
document.addEventListener('click',e=>{const del=e.target.closest('[data-delete]'),edit=e.target.closest('[data-edit]'),month=e.target.closest('[data-month]'),toggle=e.target.closest('[data-toggle-reward]');if(del)removeItem(del.dataset.delete,del.dataset.id);if(edit)editItem(edit.dataset.edit,edit.dataset.id);if(month){activeMonth=month.dataset.month;renderMarn();}if(toggle){const r=state.rewards.find(x=>x.id===toggle.dataset.toggleReward);r.received=!r.received;persist().then(render);}});
$('#modalClose').onclick=closeModal; $('#modalBackdrop').onclick=e=>{if(e.target===e.currentTarget)closeModal();};
$('#openAuthBtn').onclick=authModal; $('#settingsAuthBtn').onclick=authModal; $('#logoutBtn').onclick=()=>firebase?.signOut(firebase.auth);
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`my-finance-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);};
$('#importInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{state=migrateState(JSON.parse(await file.text()));await persist();render();toast('تم الاستيراد');}catch{toast('ملف JSON غير صالح');}e.target.value='';};
$('#resetBtn').onclick=async()=>{if(confirm('سيتم استبدال البيانات الحالية بالبيانات الأولية. متابعة؟')){state=migrateState(cloneSeed());activeMonth=Object.keys(state.months)[0];await persist();render();toast('تمت إعادة الضبط');}};

document.documentElement.dataset.theme=localStorage.getItem('finance-theme')||'light';
$('#todayText').textContent=new Intl.DateTimeFormat('ar-SA',{dateStyle:'full'}).format(new Date());
render(); initFirebase();
