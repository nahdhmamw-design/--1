// HAMAMO v2 Smart Pro - client-side logic
const BATCH = 50;
let DATA = [];
let filtered = [];
let offset = 0;
let loading = false;
let favorites = new Set();
let currentForm = null;
let currentSort = 'alpha';

async function loadData() {
  const res = await fetch('data.json');
  DATA = await res.json();
  buildForms();
  initUI();
  applyFilters(true);
}

function buildForms() {
  const forms = Array.from(new Set(DATA.map(d => d.form_ar)));
  const container = document.getElementById('formsList');
  container.innerHTML = '';
  const all = document.createElement('div');
  all.className = 'cat-item';
  all.innerHTML = '<img src="assets/form_1.svg" alt="الكل" /><div>الكل</div>';
  all.addEventListener('click', ()=>{ currentForm = null; resetAndApply(); });
  container.appendChild(all);
  forms.forEach((f,i)=>{
    const el = document.createElement('div');
    el.className = 'cat-item';
    const idx = (i % 10) + 1;
    el.innerHTML = '<img src="assets/form_'+idx+'.svg" alt="'+f+'" /><div>'+f+'</div>';
    el.addEventListener('click', ()=>{ currentForm = f; resetAndApply(); });
    container.appendChild(el);
  });
}

function initUI() {
  const searchInput = document.getElementById('searchInput');
  const suggestionsBox = document.getElementById('suggestionsBox');
  document.getElementById('sortSelect').addEventListener('change', (e)=>{ currentSort = e.target.value; resetAndApply(); });
  document.getElementById('clearBtn').addEventListener('click', ()=>{ searchInput.value=''; resetAndApply(); });
  searchInput.addEventListener('input', onSearchInput);
  window.addEventListener('scroll', onWindowScroll);
}

function onSearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  showSuggestions(q);
  resetAndApply();
}

function showSuggestions(q) {
  const box = document.getElementById('suggestionsBox');
  box.style.display = 'none';
  box.innerHTML = '';
  if (!q) return;
  const suggestions = [];
  for (let i=0;i<DATA.length && suggestions.length<8;i++) {
    const d = DATA[i];
    if (d.name_ar.toLowerCase().includes(q) || d.activeIngredient.toLowerCase().includes(q) || d.form_ar.toLowerCase().includes(q)) suggestions.push(d);
  }
  suggestions.forEach(s=>{
    const el = document.createElement('div');
    el.className = 'suggest-item';
    el.innerHTML = '<strong>'+ highlight(s.name_ar,q) + '</strong><div style="font-size:12px;color:#6b7280">'+ s.activeIngredient + ' • ' + s.form_ar + '</div>';
    el.addEventListener('click', ()=>{ document.getElementById('searchInput').value = s.name_ar; box.innerHTML=''; box.style.display='none'; resetAndApply(); });
    box.appendChild(el);
  });
  if (suggestions.length>0) box.style.display = 'block';
}

function highlight(text,q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return text.slice(0,idx) + '<span class="mark">' + text.slice(idx, idx+q.length) + '</span>' + text.slice(idx+q.length);
}

function applyFilters(reset=false) {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  filtered = DATA.filter(d=>{
    if (currentForm && d.form_ar !== currentForm) return false;
    if (!q) return true;
    return d.name_ar.toLowerCase().includes(q) || d.activeIngredient.toLowerCase().includes(q) || d.form_ar.toLowerCase().includes(q) || d.name_en.toLowerCase().includes(q);
  });
  sortFiltered();
  if (reset) { offset = 0; document.getElementById('resultsGrid').innerHTML=''; }
  loadMore();
}

function resetAndApply() { offset = 0; document.getElementById('resultsGrid').innerHTML=''; applyFilters(true); }

function sortFiltered() {
  if (currentSort === 'alpha') filtered.sort((a,b)=> a.name_ar.localeCompare(b.name_ar,'ar'));
  else if (currentSort === 'alpha_rev') filtered.sort((a,b)=> b.name_ar.localeCompare(a.name_ar,'ar'));
  else if (currentSort === 'form') filtered.sort((a,b)=> a.form_ar.localeCompare(b.form_ar,'ar'));
}

function loadMore() {
  if (loading) return;
  loading = true;
  const grid = document.getElementById('resultsGrid');
  const start = offset;
  const end = Math.min(offset + BATCH, filtered.length);
  const slice = filtered.slice(start, end);
  slice.forEach(d=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = '\n      <img src="'+d.imageUrl+'" alt="'+d.name_en+'" />\n      <div class="card-body">\n        <div class="card-title">'+d.name_ar+' — '+d.name_en+'</div>\n        <div class="card-sub">'+d.activeIngredient+' • '+d.form_ar+'</div>\n      </div>\n      <div class="card-actions">\n        <button class="view-btn" data-id="'+d.id+'">عرض التفاصيل</button>\n        <button class="fav-btn" data-id="'+d.id+'">'+(favorites.has(d.id)?'★':'☆')+'</button>\n      </div>';
    grid.appendChild(card);
  });
  offset = end;
  loading = false;
  document.getElementById('resultsCount').textContent = 'عرض ' + filtered.length + ' نتيجة';
  if (offset >= filtered.length) { showEndMarker(); }
}

function showEndMarker() {
  const grid = document.getElementById('resultsGrid');
  if (!document.getElementById('endMarker')){
    const m = document.createElement('div'); m.id='endMarker'; m.className='loading'; m.textContent = 'لا مزيد من النتائج'; grid.appendChild(m);
  }
}

function onWindowScroll() {
  if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 1200)) {
    if (offset < filtered.length) loadMore();
  }
}

function showDetail(id) {
  const d = DATA.find(x=>x.id===id);
  if (!d) return;
  const container = document.getElementById('detailContent');
  container.innerHTML = '\n    <img src="'+d.imageUrl+'" alt="'+d.name_en+'" style="width:100%;border-radius:10px;margin-bottom:10px" />\n    <h2 style="margin:6px 0">'+d.name_ar+' — '+d.name_en+'</h2>\n    <div style="color:#6b7280;margin-bottom:8px">'+d.brand+' • '+d.form_ar+'</div>\n    <p>'+d.description+'</p>\n    <h4>المادة الفعّالة</h4><p><strong>'+d.activeIngredient+'</strong></p>\n    <h4>الجرعات التوضيحية حسب الفئة العمرية</h4>\n    <canvas id="doseChart" width="400" height="200"></canvas>\n    <div style="background:#fff3cd;padding:10px;border-radius:8px;color:#8a6d3b;border:1px solid #ffeeba;margin-top:8px">\n      تحذير: الرسم البياني توضيحي فقط ولا يعكس جرعات طبية حقيقية. استشر مختص الرعاية الصحية للجرعات الدقيقة.\n    </div>\n    <h4 style="margin-top:10px">مصادر</h4>\n    <ul> '+ d.sources.map(s=> '<li><a href="'+s+'" target="_blank">'+s+'</a></li>').join('') +' </ul>\n    <div style="margin-top:12px"><a href="drugs/'+d.id+'.html">فتح صفحة الدواء الكاملة</a></div>\n  ';
  // render chart using Chart.js (loaded on page)
  setTimeout(()=>{ renderDoseChart(d.dosingProfile); }, 50);
  document.getElementById('detailPane').scrollIntoView({behavior:'smooth'});
}

function renderDoseChart(profile) {
  const canvas = document.getElementById('doseChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (window._doseChart) window._doseChart.destroy();
  window._doseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['رضع','أطفال','مراهقين','بالغين','كبار السن'],
      datasets: [{ label: 'قيمة توضيحية (وحدة نموذجيّة)', data: [profile.infants, profile.children, profile.adolescents, profile.adults, profile.elderly] }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// init
loadData();
