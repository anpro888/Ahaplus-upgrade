// ── SAFE DOM HELPER (분리 파일용: 제거된 요소 참조 시 에러 방지) ──
(function() {
  var _orig = document.getElementById.bind(document);
  var _dummy = document.createElement("div");
  _dummy.style.display = "none";
  _dummy.dataset = {};
  _dummy.childNodes = [];
  _dummy.children = [];
  _dummy.innerHTML = "";
  _dummy.querySelector = function() { return _dummy; };
  _dummy.querySelectorAll = function() { return []; };
  _dummy.appendChild = function() {};
  _dummy.closest = function() { return null; };
  _dummy.addEventListener = function() {};
  _dummy.classList = { add:function(){}, remove:function(){}, toggle:function(){}, contains:function(){return false;} };
  _dummy._isDummy = true;
  document.getElementById = function(id) { return _orig(id) || _dummy; };
})();

// ── STATE ──
var currentLang = "ko";

// ── 금액 입력 공통 유틸 (숫자만 허용, 3자리 콤마) ──
function formatMoney(v) {
  if (v === '' || v === null || v === undefined) return '';
  var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  if (isNaN(n)) return '';
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function parseMoney(v) {
  if (!v) return 0;
  var n = parseInt(String(v).replace(/,/g, ''), 10);
  return isNaN(n) ? 0 : n;
}
function moneyInputFormat(inp) {
  var raw = inp.value.replace(/,/g, '').replace(/[^0-9]/g, '');
  raw = raw.replace(/^0+(?=\d)/, '');
  if (raw === '') { inp.value = ''; return; }
  inp.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function moneyInputKeydown(e) {
  if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Delete' ||
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End' ||
      e.ctrlKey || e.metaKey) return;
  if (e.key >= '0' && e.key <= '9') return;
  e.preventDefault();
}
function bindMoneyInput(id) {
  var inp = document.getElementById(id);
  if (!inp || inp._isDummy) return;
  inp.addEventListener('input', function() { moneyInputFormat(this); });
  inp.addEventListener('keydown', moneyInputKeydown);
}

// ── 패키지 / 제품 / 정액권 / 티켓 공유 데이터 ──
var pkgProductData = [
  { code: '100001', name: '영양제', price: 0, cat: '판매' }
];
var ppCardData = [
  { name: '20만원권(현금)', price: 200000 },
  { name: '30만원권', price: 300000 },
  { name: '20만원권', price: 200000 },
  { name: '30만원권(현금)', price: 300000 }
];
var pkgTicketData = {};
var pkgData = [
  { name: '패키지 1', items: [
    { type: 'service', name: '젤네일 기본', price: 0 },
    { type: 'service', name: '젤네일 그라데이션', price: 0 },
    { type: 'service', name: '젤네일 프렌치', price: 0 }
  ], total: 0, unused: false }
];
var pkgCurrentItems = [];
var pkgEditIdx = -1;
var pkgNewItemIndex = -1;
var pkgCurrentTab = 'service';
var pkgCurrentSvcCat = null;
var pkgCurrentTktCat = null;

// ── STUB 함수 (제거된 화면용, HTML onclick 참조) ──
function openSalesModal() { /* 영업 화면 제거됨 */ }
function closeSalesModal() { /* 영업 화면 제거됨 */ }
function closeSalesPopup() { /* 영업 화면 제거됨 */ }
function closeSaleReg() { /* 판매 등록 제거됨 */ }
function showAllSaleTabs() { /* 영업 화면 제거됨 */ }
function openSaleDetail() { /* 판매 상세 제거됨 */ }
function openCustDetailFromSH() { /* 고객 상세 - custInfoPopup에서 처리 */ }
function closeCustInfoPopup() { document.getElementById("custInfoPopup").classList.remove("show"); }
function closeAvailTime() { /* 예약 현황 제거됨 */ }
function cMdl() { /* 예약 모달 제거됨 */ }

// ── 유지 함수 ──
function tStatus(s) {
  if (currentLang !== 'en') return s;
  var map = {'예약완료':'Completed','고객입장':'Arrived','계산완료':'Checked Out','노쇼':'No-show'};
  return map[s] || s;
}

function tMenu(s) {
  if (currentLang !== 'en') return s;
  var map = {
    '판매 등록':'Add Sale','판매 상세':'Sales Detail','예약 등록':'Add Booking','예약 수정':'Edit Booking',
    '예약 이동':'Move Booking','예약 취소':'Cancel Booking','고객 정보':'Client Info',
    '고객 입장':'Check In','고객 입장 취소':'Undo Check In','노쇼':'No-show','노쇼 취소':'Undo No-show'
  };
  return map[s] || s;
}

function switchRvDateType(tabIdx, type) {
  ['daily','monthly','range'].forEach(function(t) {
    var el = document.querySelector('[data-rv-dg="' + tabIdx + '-' + t + '"]');
    if (el) el.classList.toggle('hide', t !== type);
  });
}

function switchShDateType(type) {
  document.getElementById('shDateDaily').classList.toggle('hide', type !== 'daily');
  document.getElementById('shDateMonthly').classList.toggle('hide', type !== 'monthly');
  document.getElementById('shDateRange').classList.toggle('hide', type !== 'range');
  document.getElementById('shFilterError').classList.remove('show');
}

function shGetDateType() {
  var r = document.querySelector('input[name="shDateType"]:checked');
  return r ? r.value : 'daily';
}

function shNavDate(dir) {
  var inp = document.getElementById('shDailyInput');
  var d = new Date(inp.value);
  d.setDate(d.getDate() + dir);
  inp.value = d.toISOString().slice(0, 10);
  shSearch();
}

function shNavMonth(dir) {
  var inp = document.getElementById('shMonthlyInput');
  var parts = inp.value.split('-');
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1 + dir, 1);
  inp.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  shSearch();
}

function shSearch() {
  var errEl = document.getElementById('shFilterError');
  errEl.classList.remove('show');

  var dateType = shGetDateType();
  var dateFrom, dateTo;

  if (dateType === 'daily') {
    dateFrom = dateTo = document.getElementById('shDailyInput').value;
  } else if (dateType === 'monthly') {
    var mv = document.getElementById('shMonthlyInput').value;
    dateFrom = mv + '-01';
    var mp = mv.split('-');
    var lastDay = new Date(parseInt(mp[0]), parseInt(mp[1]), 0).getDate();
    dateTo = mv + '-' + String(lastDay).padStart(2, '0');
  } else {
    dateFrom = document.getElementById('shRangeFrom').value;
    dateTo = document.getElementById('shRangeTo').value;
  }

  // 기간 1년 초과 체크
  if (dateFrom && dateTo) {
    var dFrom = new Date(dateFrom);
    var dTo = new Date(dateTo);
    var oneYear = new Date(dFrom);
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    if (dTo > oneYear) {
      var msg = currentLang === 'en' ? 'The date range cannot exceed 1 year.' : '기간은 최대 1년을 초과할 수 없습니다.';
      errEl.textContent = msg;
      errEl.classList.add('show');
      return;
    }
  }

  // 필터값 읽기
  var selItems = document.getElementById('shFilterItems');
  var selPay = document.getElementById('shFilterPay');
  var selStaff = document.getElementById('shFilterStaff');
  var filterCat = selItems.options[selItems.selectedIndex].getAttribute('data-ko') || selItems.value;
  var filterPay = selPay.options[selPay.selectedIndex].getAttribute('data-ko') || selPay.value;
  var filterStaff = selStaff.value;

  var tbody = document.getElementById('shTbody');
  if (!tbody) return;
  var rows = Array.from(tbody.querySelectorAll('tr'));

  rows.forEach(function(row) {
    var rowDate = row.getAttribute('data-date') || '';
    var rowCat = row.getAttribute('data-cat') || '';
    var rowPay = row.getAttribute('data-pay') || '';
    var rowStaff = row.getAttribute('data-staff') || '';

    var match = true;

    // 날짜 필터
    if (dateFrom && dateTo && rowDate) {
      if (rowDate < dateFrom || rowDate > dateTo) match = false;
    }

    // 항목 필터 (하나라도 포함되면 OK)
    if (match && filterCat !== '전체' && filterCat !== 'All') {
      var cats = rowCat.split(',');
      if (cats.indexOf(filterCat) === -1) match = false;
    }

    // 결제 방법 필터 (하나라도 포함되면 OK)
    if (match && filterPay !== '전체' && filterPay !== 'All') {
      var pays = rowPay.split(',');
      if (pays.indexOf(filterPay) === -1) match = false;
    }

    // 담당자 필터 (하나라도 포함되면 OK)
    if (match && filterStaff !== '전체' && filterStaff !== 'All') {
      var staffs = rowStaff.split(',');
      if (staffs.indexOf(filterStaff) === -1) match = false;
    }

    if (match) {
      row.classList.remove('sh-filtered');
    } else {
      row.classList.add('sh-filtered');
    }
  });

  // 건수 업데이트 + 페이징 리셋
  shUpdateCount();
  shGoPage(1);
}

function shUpdateCount() {
  var tbody = document.getElementById('shTbody');
  if (!tbody) return;
  var showDeleted = document.querySelector('#salesHistoryView .sh-summary-right input[type="checkbox"]');
  var isDelVisible = showDeleted ? showDeleted.checked : false;
  var rows = Array.from(tbody.querySelectorAll('tr'));
  var count = rows.filter(function(r) {
    if (r.classList.contains('sh-filtered')) return false;
    if (!isDelVisible && r.classList.contains('sh-deleted-row')) return false;
    return true;
  }).length;

  var left = document.querySelector('.sh-summary-left');
  if (left) {
    var prefix = left.querySelector('[data-i18n="sh.summary_prefix"]');
    var suffix = left.querySelector('[data-i18n="sh.summary_suffix"]');
    left.innerHTML = '';
    if (prefix) left.appendChild(prefix);
    left.insertAdjacentHTML('beforeend', ' <b>' + count + '</b> ');
    if (suffix) left.appendChild(suffix);
  }
  if (currentLang === 'en') applyLang();
}

function openPrintPreview() {
  ppCurrentPage = 1;
  ppShowPage(1);
  document.getElementById('printPreviewModal').classList.add('show');
  if (currentLang === 'en') applyLang();
}

function closePrintPreview() {
  document.getElementById('printPreviewModal').classList.remove('show');
}

function ppShowPage(n) {
  document.querySelectorAll('#printPreviewModal .pp-page').forEach(function(p) {
    p.style.display = p.dataset.ppPage == n ? '' : 'none';
  });
  document.getElementById('ppCurPage').textContent = n;
  var body = document.querySelector('#printPreviewModal .pp-body');
  if (body) body.scrollTop = 0;
}

function ppGoPage(dir) {
  var next = ppCurrentPage + dir;
  if (next < 1 || next > ppTotalPages) return;
  ppCurrentPage = next;
  ppShowPage(next);
}

function openCustDetailFromSH(td) {
  var name = td.textContent.trim();
  var sv = document.getElementById('salesView');
  sv.classList.add('show', 'popup-mode', 'cust-info-mode');
  document.getElementById('smCustName').innerHTML = name;
  document.getElementById('smCustPhone').innerHTML = '';
  document.getElementById('smCustMeta').innerHTML = '';
  document.getElementById('smCustMemo').textContent = '';
  document.getElementById('smEmptyState').style.display = 'none';
  document.getElementById('smCustCard').style.display = '';
  document.getElementById('smCustTabs').style.display = '';
}

function openSaleDetail(hasUnpaid) {
  document.getElementById('saleDetailPopup').classList.add('show');
  const unpaidBtn = document.getElementById('sdUnpaidBtn');
  if (unpaidBtn) unpaidBtn.style.display = hasUnpaid ? '' : 'none';
  if (currentLang === 'en') applyLang();
}

function switchDepositTab(idx) {
  document.querySelectorAll('#depositModal .dp-tab').forEach(function(t, i) { t.classList.toggle('active', i === idx); });
  document.querySelectorAll('#depositModal .dp-panel').forEach(function(p) { p.classList.toggle('active', p.dataset.dp == idx); });
}

function openDashboardModal() { /* 영업현황 제거됨 */ }
function closeDashboardModal() { /* 영업현황 제거됨 */ }

function showHomeView() { /* 홈 화면 제거됨 */ }

function freezeGnb() {
  var gnb = document.getElementById('gnb');
  gnb.classList.add('gnb-frozen');
  // 이미 열린 메가메뉴 강제 닫기
  gnb.querySelectorAll('.mega-menu').forEach(function(m) { m.style.display = 'none'; });
  setTimeout(function() {
    gnb.classList.remove('gnb-frozen');
    gnb.querySelectorAll('.mega-menu').forEach(function(m) { m.style.display = ''; });
  }, 600);
}

function showReservationView() {
  /* 예약 캘린더 제거됨 — 각 뷰에서 복귀 시 기본 화면으로 */
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('appBody').style.display = '';
  document.getElementById('homeView').style.display = '';
}

function openMemHistory(cardName) {
  document.getElementById('mhCardName').textContent = cardName || '';
  document.getElementById('memHistoryPopup').classList.add('show');
}

function closeMemHistory() {
  document.getElementById('memHistoryPopup').classList.remove('show');
}

function switchRevTab(idx) {
  // 현재 활성 탭에서 선택된 날짜 타입 + 값 읽기
  var activeTab = document.querySelector('#revSummaryView .rv-tab.active');
  var prevIdx = activeTab ? Array.from(document.querySelectorAll('#revSummaryView .rv-tab')).indexOf(activeTab) : 0;
  var radioNames = ['rvDateType','rvDateType2','rvDateType3'];
  var checkedRadio = document.querySelector('input[name="'+radioNames[prevIdx]+'"]:checked');
  var curType = checkedRadio ? checkedRadio.value : 'daily';

  // 이전 탭 날짜 값 읽기
  var prevDaily = document.querySelector('[data-rv-dg="'+prevIdx+'-daily"] input[type="date"]');
  var prevMonth = document.querySelector('[data-rv-dg="'+prevIdx+'-monthly"] input[type="month"]');
  var prevRange = document.querySelectorAll('[data-rv-dg="'+prevIdx+'-range"] input[type="date"]');

  // 탭 전환
  document.querySelectorAll('#revSummaryView .rv-tab').forEach((t,i) => t.classList.toggle('active', i===idx));
  document.querySelectorAll('#revSummaryView .rv-tab-panel').forEach(p => {
    p.style.display = p.getAttribute('data-rv-tab') == idx ? '' : 'none';
  });

  // 새 탭에 같은 날짜 타입 적용
  document.querySelectorAll('input[name="'+radioNames[idx]+'"]').forEach(function(r) {
    r.checked = (r.value === curType);
  });
  switchRvDateType(idx, curType);

  // 새 탭에 같은 날짜 값 적용
  var newDaily = document.querySelector('[data-rv-dg="'+idx+'-daily"] input[type="date"]');
  var newMonth = document.querySelector('[data-rv-dg="'+idx+'-monthly"] input[type="month"]');
  var newRange = document.querySelectorAll('[data-rv-dg="'+idx+'-range"] input[type="date"]');
  if (prevDaily && newDaily) newDaily.value = prevDaily.value;
  if (prevMonth && newMonth) newMonth.value = prevMonth.value;
  if (prevRange[0] && newRange[0]) newRange[0].value = prevRange[0].value;
  if (prevRange[1] && newRange[1]) newRange[1].value = prevRange[1].value;
}

function openRevSummary() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('noticeListView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('revSummaryView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // 탭 0 (전체 매출)으로 초기화
  switchRevTab(0);

  // 모든 탭 날짜 타입 → 일별 기본값으로 초기화
  resetRvDateDefaults();

  // 스크롤 초기화
  var body = document.querySelector('#revSummaryView .rv-body');
  if (body) body.scrollTop = 0;
  if (currentLang === 'en') applyLang();
}

function closeRevSummary() {
  document.getElementById('revSummaryView').classList.remove('show');
  showReservationView();
}

function openPointHistory() {
  document.getElementById('pointHistoryModal').classList.add('show');
}

function closePointHistory() {
  document.getElementById('pointHistoryModal').classList.remove('show');
}

function openUnpaidDetail() {
  document.getElementById('unpaidDetailModal').classList.add('show');
}

function closeUnpaidDetail() {
  document.getElementById('unpaidDetailModal').classList.remove('show');
}

function openPointEdit() {
  document.getElementById('pointEditModal').classList.add('show');
}

function closePointEdit() {
  document.getElementById('pointEditModal').classList.remove('show');
}

function openUnpaidEdit() {
  document.getElementById('unpaidEditModal').classList.add('show');
}

function closeUnpaidEdit() {
  document.getElementById('unpaidEditModal').classList.remove('show');
}

function openTktEdit(count, expiry, perUse) {
  document.getElementById('tkeCurrentCount').value = count || '';
  document.getElementById('tkeCurrentExpiry').value = expiry || '';
  document.getElementById('tkeCurrentPerUse').value = perUse || '';
  // 첫 번째 패널(잔여 횟수) 활성화
  document.querySelector('input[name="tkeType"][value="count"]').checked = true;
  switchTkePanel(0);
  document.getElementById('tktEditModal').classList.add('show');
}

function closeTktEdit() {
  document.getElementById('tktEditModal').classList.remove('show');
}

function switchTkePanel(idx) {
  document.querySelectorAll('[data-tke-panel]').forEach(function(p) {
    p.classList.toggle('show', p.dataset.tkePanel == idx);
  });
}

function toggleExpiredRows(tabIdx, show) {
  document.querySelectorAll('[data-sm-tab="' + tabIdx + '"] .sm-table tr.expired').forEach(function(tr) {
    tr.classList.toggle('show', show);
  });
}

function openMemEdit() {
  document.getElementById('memEditModal').classList.add('show');
  switchMemEditPanel(0);
  document.querySelector('input[name="meType"][value="balance"]').checked = true;
}

function closeMemEdit() {
  document.getElementById('memEditModal').classList.remove('show');
}

function switchMemEditPanel(idx) {
  document.querySelectorAll('#memEditModal .me-panel').forEach(p => {
    p.classList.toggle('show', p.getAttribute('data-me-panel') == idx);
  });
}

function openMemTransfer() {
  document.getElementById('memTransferModal').classList.add('show');
}

function closeMemTransfer() {
  document.getElementById('memTransferModal').classList.remove('show');
}

function openSalesHistory() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('noticeListView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  // 스크롤 초기화
  var body = document.querySelector('#salesHistoryView .sh-body');
  if (body) body.scrollTop = 0;
  if (currentLang === 'en') applyLang();
}

function closeSalesHistory() {
  document.getElementById('salesHistoryView').classList.remove('show');
  showReservationView();
}

function toggleDeletedRows(show) {
  shUpdateCount();
  shGoPage(1);
}

function openCustomerList() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('customerListView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  // 정렬 초기화
  document.querySelectorAll('#customerListView .cl-sortable').forEach(function(th) { th.classList.remove('asc','desc'); });
  // 페이징 1페이지로
  clGoPage(1);
  // 스크롤 초기화
  var body = document.querySelector('#customerListView .cl-body');
  if (body) body.scrollTop = 0;
  if (currentLang === 'en') applyLang();
}

function closeCustomerList() {
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  showReservationView();
}

// ── 중복 고객 관리 페이지 ──
function openDupClientList() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('dupClientListView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  // 초기화
  document.getElementById('dcTotalCount').textContent = '0';
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('dcTbody').innerHTML = '<tr><td colspan="7" style="color:#9E9E9E;padding:20px;text-align:center;">' + (isEn ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
  document.getElementById('dcPaging').style.display = 'none';
  if (currentLang === 'en') applyLang();
}

var _dcAllData = [
  { date:'2026-03-19', no:45, name:'김하늘', phone:'010-9876-5432', sales:'0', lastVisit:'2026-03-19' },
  { date:'2025-02-20', no:24, name:'김하늘', phone:'010-8888-7777', sales:'120,000', lastVisit:'2025-02-20' },
  { date:'2025-12-15', no:43, name:'이수진', phone:'010-3456-7890', sales:'850,000', lastVisit:'2025-12-15' },
  { date:'2025-01-15', no:23, name:'이수진', phone:'010-3456-7890', sales:'450,000', lastVisit:'2025-01-15' },
  { date:'2025-11-15', no:40, name:'정민지', phone:'010-1111-9999', sales:'1,200,000', lastVisit:'2025-11-15' },
  { date:'2024-12-05', no:22, name:'정민지', phone:'010-1111-9999', sales:'300,000', lastVisit:'2024-12-05' },
  { date:'2025-10-09', no:38, name:'한소희', phone:'010-4444-5555', sales:'320,000', lastVisit:'2025-10-09' },
  { date:'2024-11-20', no:21, name:'한소희', phone:'010-4444-5555', sales:'560,000', lastVisit:'2024-11-20' },
  { date:'2025-09-18', no:37, name:'오서준', phone:'010-6666-7777', sales:'980,000', lastVisit:'2025-09-18' },
  { date:'2024-10-08', no:20, name:'오서준', phone:'010-6666-7777', sales:'0', lastVisit:'' },
  { date:'2026-02-06', no:44, name:'박서연', phone:'010-5555-1234', sales:'0', lastVisit:'2026-02-06' },
  { date:'2024-09-12', no:19, name:'박서연', phone:'010-5555-1234', sales:'180,000', lastVisit:'2024-09-12' },
  { date:'2025-10-22', no:39, name:'김세나', phone:'019-8000-9000', sales:'1,680,000', lastVisit:'2025-10-22' },
  { date:'2024-08-25', no:18, name:'김세나', phone:'019-8000-9000', sales:'95,000', lastVisit:'2024-08-25' },
  { date:'2025-11-28', no:41, name:'이지은', phone:'010-8765-4321', sales:'3,850,000', lastVisit:'2025-11-28' },
  { date:'2024-07-30', no:17, name:'이지은', phone:'010-8765-4321', sales:'720,000', lastVisit:'2024-07-30' },
  { date:'2025-08-30', no:36, name:'윤채원', phone:'010-2233-4455', sales:'3,950,000', lastVisit:'2025-08-30' },
  { date:'2024-06-18', no:16, name:'윤채원', phone:'010-2233-4455', sales:'2,100,000', lastVisit:'2024-06-18' },
  { date:'2025-12-10', no:42, name:'최윤서', phone:'010-2222-3333', sales:'2,450,000', lastVisit:'2025-12-10' },
  { date:'2024-05-10', no:15, name:'최윤서', phone:'010-2222-3333', sales:'380,000', lastVisit:'2024-05-10' }
];

var dcPage = 1, dcPerPage = 10, dcTotalPages = 1;
var _dcFiltered = [];

function dcSearch() {
  var criteria = document.getElementById('dcCriteria').value;
  var groups = {};
  _dcAllData.forEach(function(c) {
    var key;
    if (criteria === 'name_phone') key = c.name + '|' + c.phone;
    else if (criteria === 'name') key = c.name;
    else key = c.phone;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  _dcFiltered = [];
  Object.keys(groups).forEach(function(k) {
    if (groups[k].length > 1) {
      groups[k].forEach(function(c) { _dcFiltered.push(c); });
    }
  });
  document.getElementById('dcTotalCount').textContent = _dcFiltered.length;
  document.getElementById('dcPaging').style.display = _dcFiltered.length > dcPerPage ? 'flex' : 'none';
  dcGoPage(1);
}

function dcGoPage(p) {
  dcTotalPages = Math.max(1, Math.ceil(_dcFiltered.length / dcPerPage));
  if (p < 1) p = 1;
  if (p > dcTotalPages) p = dcTotalPages;
  dcPage = p;
  var start = (p - 1) * dcPerPage;
  var end = Math.min(start + dcPerPage, _dcFiltered.length);
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var tbody = document.getElementById('dcTbody');

  if (_dcFiltered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#9E9E9E;padding:20px;text-align:center;">' + (isEn ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
    return;
  }

  var html = '';
  for (var i = start; i < end; i++) {
    var c = _dcFiltered[i];
    html += '<tr>' +
      '<td><label class="dc-chk-label"><input type="checkbox" class="dc-row-check" onchange="dcUpdateBulkBtns()"><span class="dc-checkmark">✓</span></label></td>' +
      '<td>' + c.date + '</td>' +
      '<td>' + c.no + '</td>' +
      '<td>' + c.name + '</td>' +
      '<td>' + c.phone + '</td>' +
      '<td class="amount">' + c.sales + '</td>' +
      '<td>' + (c.lastVisit || '') + '</td></tr>';
  }
  tbody.innerHTML = html;

  var info = document.getElementById('dcPageInfo');
  if (info) {
    info.innerHTML = '<span>' + (isEn ? 'Page' : '페이지') + '</span> <b>' + p + '</b> <span>' + (isEn ? 'of' : '의') + '</span> <b>' + dcTotalPages + '</b>';
  }
  var chkAll = document.getElementById('dcCheckAll');
  if (chkAll) chkAll.checked = false;
  dcUpdateBulkBtns();
}

function dcToggleAll(chk) {
  document.querySelectorAll('.dc-row-check').forEach(function(c) { c.checked = chk.checked; });
  dcUpdateBulkBtns();
}

function dcUpdateBulkBtns() {
  var hasChecked = document.querySelectorAll('.dc-row-check:checked').length > 0;
  document.querySelectorAll('#dupClientListView .dc-bulk-btn').forEach(function(btn) {
    if (hasChecked) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function dcDeleteSelected() {
  var checked = document.querySelectorAll('.dc-row-check:checked');
  if (checked.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    alert(isEn ? 'Please select clients to delete.' : '삭제할 고객을 선택해 주세요.');
    return;
  }
  document.getElementById('dcDeleteModal').style.display = 'flex';
}
function closeDcDeleteModal() {
  document.getElementById('dcDeleteModal').style.display = 'none';
}
function confirmDcDelete() {
  closeDcDeleteModal();
  dcSearch();
}

// ── 삭제 고객 관리 페이지 ──
var _dlcAllData = [
  { delDate:'2025-12-20', no:8, name:'박준혁', phone:'010-2345-6789', sales:'45,000', lastVisit:'2025-11-10' },
  { delDate:'2025-11-15', no:12, name:'김영수', phone:'010-3456-1234', sales:'320,000', lastVisit:'2025-10-25' },
  { delDate:'2025-10-30', no:5, name:'이미영', phone:'010-4567-8901', sales:'0', lastVisit:'2025-08-12' },
  { delDate:'2025-10-18', no:14, name:'정현우', phone:'010-5678-2345', sales:'180,000', lastVisit:'2025-09-30' },
  { delDate:'2025-09-25', no:9, name:'최다은', phone:'010-6789-3456', sales:'750,000', lastVisit:'2025-09-01' },
  { delDate:'2025-09-10', no:3, name:'송희진', phone:'010-6431-9779', sales:'19,000', lastVisit:'2022-07-19' },
  { delDate:'2025-08-22', no:11, name:'한지훈', phone:'010-7890-4567', sales:'1,200,000', lastVisit:'2025-07-15' },
  { delDate:'2025-08-05', no:7, name:'오수빈', phone:'010-8901-5678', sales:'95,000', lastVisit:'2025-06-20' },
  { delDate:'2025-07-12', no:13, name:'윤태영', phone:'010-9012-6789', sales:'2,300,000', lastVisit:'2025-07-01' },
  { delDate:'2025-06-28', no:6, name:'강서현', phone:'010-1234-7890', sales:'560,000', lastVisit:'2025-05-18' },
  { delDate:'2025-06-10', no:10, name:'임도윤', phone:'010-2345-8901', sales:'0', lastVisit:'2025-04-22' },
  { delDate:'2025-05-15', no:4, name:'장민서', phone:'010-3456-9012', sales:'420,000', lastVisit:'2025-03-30' }
];

var dlcPage = 1, dlcPerPage = 10, dlcTotalPages = 1;
var _dlcFiltered = [];

function openDeletedClientList() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('deletedClientView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  // 초기화: 전체 표시
  document.getElementById('dlcSearchInput').value = '';
  _dlcFiltered = _dlcAllData.slice();
  document.getElementById('dlcTotalCount').textContent = _dlcFiltered.length;
  document.getElementById('dlcPaging').style.display = _dlcFiltered.length > dlcPerPage ? 'flex' : 'none';
  dlcGoPage(1);
  var body = document.querySelector('#deletedClientView .dlc-body');
  if (body) body.scrollTop = 0;
  if (currentLang === 'en') applyLang();
}

function dlcSearch() {
  var keyword = document.getElementById('dlcSearchInput').value.trim().toLowerCase();
  if (!keyword) {
    _dlcFiltered = _dlcAllData.slice();
  } else {
    _dlcFiltered = _dlcAllData.filter(function(c) {
      return c.name.toLowerCase().indexOf(keyword) >= 0 || c.phone.replace(/-/g,'').indexOf(keyword.replace(/-/g,'')) >= 0;
    });
  }
  document.getElementById('dlcTotalCount').textContent = _dlcFiltered.length;
  document.getElementById('dlcPaging').style.display = _dlcFiltered.length > dlcPerPage ? 'flex' : 'none';
  dlcGoPage(1);
}

function dlcGoPage(p) {
  dlcTotalPages = Math.max(1, Math.ceil(_dlcFiltered.length / dlcPerPage));
  if (p < 1) p = 1;
  if (p > dlcTotalPages) p = dlcTotalPages;
  dlcPage = p;
  var start = (p - 1) * dlcPerPage;
  var end = Math.min(start + dlcPerPage, _dlcFiltered.length);
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var tbody = document.getElementById('dlcTbody');

  if (_dlcFiltered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#9E9E9E;padding:20px;text-align:center;">' + (isEn ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
    document.getElementById('dlcPageInfo').textContent = '';
    return;
  }

  var html = '';
  for (var i = start; i < end; i++) {
    var c = _dlcFiltered[i];
    html += '<tr>';
    html += '<td><label class="dlc-chk-label"><input type="checkbox" class="dlc-chk" value="' + c.no + '" onchange="dlcUpdateBulkBtns()"><span class="dlc-checkmark">✓</span></label></td>';
    html += '<td>' + c.delDate + '</td>';
    html += '<td>' + c.no + '</td>';
    html += '<td>' + c.name + '</td>';
    html += '<td>' + c.phone + '</td>';
    html += '<td class="amount">' + c.sales + '</td>';
    html += '<td>' + (c.lastVisit || '-') + '</td>';
    html += '</tr>';
  }
  tbody.innerHTML = html;

  var pageInfo = document.getElementById('dlcPageInfo');
  if (pageInfo) {
    pageInfo.innerHTML = '<b>' + dlcPage + '</b> / ' + dlcTotalPages;
  }
}

function dlcToggleAll(master) {
  var cbs = document.querySelectorAll('#dlcTbody .dlc-chk');
  cbs.forEach(function(cb) { cb.checked = master.checked; });
  dlcUpdateBulkBtns();
}

function dlcUpdateBulkBtns() {
  var hasChecked = document.querySelectorAll('#dlcTbody .dlc-chk:checked').length > 0;
  document.querySelectorAll('#deletedClientView .dlc-bulk-btn').forEach(function(btn) {
    if (hasChecked) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function _dlcGetSelectedNos() {
  var checked = document.querySelectorAll('#dlcTbody .dlc-chk:checked');
  var nos = [];
  checked.forEach(function(cb) { nos.push(parseInt(cb.value)); });
  return nos;
}

function dlcRestoreSelected() {
  var nos = _dlcGetSelectedNos();
  if (nos.length === 0) {
    document.getElementById('dlcAlertModal').style.display = 'flex';
    return;
  }
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // 삭제 목록에서 제거
  _dlcAllData = _dlcAllData.filter(function(c) { return nos.indexOf(c.no) < 0; });
  // 검색 새로고침
  dlcSearch();
  // 체크올 해제
  var chkAll = document.getElementById('dlcCheckAll');
  if (chkAll) chkAll.checked = false;
  dlcUpdateBulkBtns();
}

function dlcPermDeleteSelected() {
  var nos = _dlcGetSelectedNos();
  if (nos.length === 0) {
    document.getElementById('dlcAlertModal').style.display = 'flex';
    return;
  }
  // 확인 모달 열기
  document.getElementById('dlcDeleteConfirmModal').style.display = 'flex';
}

function confirmDlcPermDelete() {
  var nos = _dlcGetSelectedNos();
  _dlcAllData = _dlcAllData.filter(function(c) { return nos.indexOf(c.no) < 0; });
  closeDlcDeleteConfirmModal();
  dlcSearch();
  var chkAll = document.getElementById('dlcCheckAll');
  if (chkAll) chkAll.checked = false;
  dlcUpdateBulkBtns();
}

function closeDlcAlertModal() {
  document.getElementById('dlcAlertModal').style.display = 'none';
}

function closeDlcDeleteConfirmModal() {
  document.getElementById('dlcDeleteConfirmModal').style.display = 'none';
}

// ── 가족 목록 페이지 ──
function openFamilyList() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('familyListView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  flGoPage(1);
  var body = document.querySelector('#familyListView .fl-body');
  if (body) body.scrollTop = 0;
  if (currentLang === 'en') applyLang();
}

var flPage = 1;
var flPerPage = 10;
var flTotalPages = 1;

function flGoPage(p) {
  var rows = document.querySelectorAll('#flTbody tr');
  var total = rows.length;
  flTotalPages = Math.max(1, Math.ceil(total / flPerPage));
  if (p < 1) p = 1;
  if (p > flTotalPages) p = flTotalPages;
  flPage = p;
  var start = (p - 1) * flPerPage;
  var end = start + flPerPage;
  rows.forEach(function(row, i) {
    row.style.display = (i >= start && i < end) ? '' : 'none';
  });
  var info = document.getElementById('flPageInfo');
  if (info) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    info.innerHTML = '<span>' + (isEn ? 'Page' : '페이지') + '</span> <b>' + p + '</b> <span>' + (isEn ? 'of' : '의') + '</span> <b>' + flTotalPages + '</b>';
  }
}

function toggleFlPageDd(e) {
  if (e) e.stopPropagation();
  var sel = document.getElementById('flGoSelect');
  sel.style.display = sel.style.display === 'none' ? '' : 'none';
}
function hideFlPageDd() {
  document.getElementById('flGoSelect').style.display = 'none';
}

function sortFlTable(th, colIdx) {
  var tbody = document.getElementById('flTbody');
  var rows = Array.from(tbody.querySelectorAll('tr'));
  var isAsc = th.classList.contains('asc');
  document.querySelectorAll('#familyListView .fl-sortable').forEach(function(h){ h.classList.remove('asc','desc'); });
  th.classList.add(isAsc ? 'desc' : 'asc');
  var dir = isAsc ? -1 : 1;
  rows.sort(function(a, b) {
    var aText = a.querySelectorAll('td')[colIdx].textContent.trim().replace(/,/g,'');
    var bText = b.querySelectorAll('td')[colIdx].textContent.trim().replace(/,/g,'');
    var aNum = parseFloat(aText);
    var bNum = parseFloat(bText);
    if (!isNaN(aNum) && !isNaN(bNum)) return (aNum - bNum) * dir;
    return aText.localeCompare(bText) * dir;
  });
  rows.forEach(function(row){ tbody.appendChild(row); });
  flGoPage(1);
}

// ── 가족 구성원 상세 모달 ──
var _flCurrentFamily = null;

// 가족별 샘플 구성원 데이터
var _flFamilyData = {
  '김하늘, 박서연': [
    { no:45, name:'김하늘', mobile:'010-9876-5432', tel:'', relation:'본인' },
    { no:44, name:'박서연', mobile:'010-5555-1234', tel:'', relation:'sister' }
  ],
  '이수진, 최윤서, 이지은': [
    { no:43, name:'이수진', mobile:'010-3456-7890', tel:'', relation:'본인' },
    { no:42, name:'최윤서', mobile:'010-2222-3333', tel:'02-555-1234', relation:'mother' },
    { no:41, name:'이지은', mobile:'010-8765-4321', tel:'', relation:'sister' }
  ],
  '정민지, 김세나': [
    { no:40, name:'정민지', mobile:'010-1111-9999', tel:'', relation:'본인' },
    { no:39, name:'김세나', mobile:'019-8000-9000', tel:'', relation:'friend' }
  ],
  '한소희, 오서준': [
    { no:38, name:'한소희', mobile:'010-4444-5555', tel:'', relation:'본인' },
    { no:37, name:'오서준', mobile:'010-6666-7777', tel:'', relation:'spouse' }
  ],
  '윤채원, 정민지, 한소희': [
    { no:36, name:'윤채원', mobile:'010-2233-4455', tel:'', relation:'본인' },
    { no:40, name:'정민지', mobile:'010-1111-9999', tel:'', relation:'cousin' },
    { no:38, name:'한소희', mobile:'010-4444-5555', tel:'', relation:'friend' }
  ],
  '김하늘, 이지은, 오서준': [
    { no:45, name:'김하늘', mobile:'010-9876-5432', tel:'', relation:'본인' },
    { no:41, name:'이지은', mobile:'010-8765-4321', tel:'', relation:'sister' },
    { no:37, name:'오서준', mobile:'010-6666-7777', tel:'', relation:'brother' }
  ],
  '박서연, 최윤서': [
    { no:44, name:'박서연', mobile:'010-5555-1234', tel:'', relation:'본인' },
    { no:42, name:'최윤서', mobile:'010-2222-3333', tel:'', relation:'mother' }
  ],
  '이수진, 김세나, 윤채원': [
    { no:43, name:'이수진', mobile:'010-3456-7890', tel:'', relation:'본인' },
    { no:39, name:'김세나', mobile:'019-8000-9000', tel:'', relation:'friend' },
    { no:36, name:'윤채원', mobile:'010-2233-4455', tel:'', relation:'cousin' }
  ],
  '정민지, 오서준': [
    { no:40, name:'정민지', mobile:'010-1111-9999', tel:'', relation:'본인' },
    { no:37, name:'오서준', mobile:'010-6666-7777', tel:'', relation:'friend' }
  ],
  '한소희, 김하늘': [
    { no:38, name:'한소희', mobile:'010-4444-5555', tel:'', relation:'본인' },
    { no:45, name:'김하늘', mobile:'010-9876-5432', tel:'', relation:'friend' }
  ],
  '이지은, 박서연, 최윤서, 김세나': [
    { no:41, name:'이지은', mobile:'010-8765-4321', tel:'', relation:'본인' },
    { no:44, name:'박서연', mobile:'010-5555-1234', tel:'', relation:'sister' },
    { no:42, name:'최윤서', mobile:'010-2222-3333', tel:'', relation:'mother' },
    { no:39, name:'김세나', mobile:'019-8000-9000', tel:'', relation:'friend' }
  ],
  '윤채원, 이수진': [
    { no:36, name:'윤채원', mobile:'010-2233-4455', tel:'', relation:'본인' },
    { no:43, name:'이수진', mobile:'010-3456-7890', tel:'', relation:'sister' }
  ],
  '김하늘, 최윤서, 정민지': [
    { no:24, name:'김하늘', mobile:'010-8888-7777', tel:'', relation:'본인' },
    { no:15, name:'최윤서', mobile:'010-2222-3333', tel:'', relation:'cousin' },
    { no:22, name:'정민지', mobile:'010-1111-9999', tel:'', relation:'friend' }
  ],
  '이수진, 한소희, 오서준': [
    { no:23, name:'이수진', mobile:'010-3456-7890', tel:'', relation:'본인' },
    { no:21, name:'한소희', mobile:'010-4444-5555', tel:'', relation:'friend' },
    { no:20, name:'오서준', mobile:'010-6666-7777', tel:'', relation:'spouse' }
  ]
};

function openFamilyDetail(btn) {
  var tr = btn.closest('tr');
  var cells = tr.querySelectorAll('td');
  var regDate = cells[0].textContent.trim();
  var members = cells[1].textContent.trim();
  var balance = cells[2].textContent.trim();
  var point = cells[3].textContent.trim();

  _flCurrentFamily = { regDate:regDate, members:members, balance:balance, point:point };

  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('flDetailSummary').innerHTML =
    '<span>' + (isEn ? 'Family Balance' : '가족 정액권 잔액') + ': <b>' + balance + '</b></span>' +
    '<span>' + (isEn ? 'Family Points' : '가족 포인트') + ': <b>' + point + '</b></span>' +
    '<span>' + (isEn ? 'Registered Date' : '등록일') + ': <b>' + regDate + '</b></span>';

  renderFamilyDetailTable(members);
  document.getElementById('familyDetailModal').style.display = 'flex';
}

function renderFamilyDetailTable(members) {
  var data = _flFamilyData[members] || [];
  var tbody = document.getElementById('flDetailBody');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#9E9E9E;padding:20px;">' + (isEn ? 'No members' : '구성원이 없습니다') + '</td></tr>';
    return;
  }
  var html = '';
  data.forEach(function(m) {
    html += '<tr>' +
      '<td>' + m.no + '</td>' +
      '<td>' + m.name + '</td>' +
      '<td>' + m.mobile + '</td>' +
      '<td>' + (m.tel || '') + '</td>' +
      '<td>' + m.relation + '</td>' +
      '<td><div class="fl-manage-btns">' +
        '<button class="fl-manage-btn fl-edit" onclick="openFamilyEditMember(\'' + m.name + '\',\'' + m.relation + '\')" data-i18n="fl.btn_edit" data-ko="수정" data-en="Edit">' + (isEn ? 'Edit' : '수정') + '</button>' +
        '<button class="fl-manage-btn fl-del" onclick="openFamilyDeleteMember(\'' + m.name + '\')" data-i18n="common.delete" data-ko="삭제" data-en="Delete">' + (isEn ? 'Delete' : '삭제') + '</button>' +
      '</div></td></tr>';
  });
  tbody.innerHTML = html;
}

function closeFamilyDetail() {
  document.getElementById('familyDetailModal').style.display = 'none';
  _flCurrentFamily = null;
}

// ── 구성원 수정 ──
var _flEditTarget = null;
function openFamilyEditMember(name, relation) {
  _flEditTarget = name;
  document.getElementById('flEditName').textContent = name;
  document.getElementById('flEditRelation').value = relation;
  document.getElementById('familyEditMemberModal').style.display = 'flex';
}
function closeFamilyEditMember() {
  document.getElementById('familyEditMemberModal').style.display = 'none';
}
function saveFamilyEditMember() {
  closeFamilyEditMember();
}

// ── 구성원 삭제 ──
var _flDeleteTarget = null;
function openFamilyDeleteMember(name) {
  _flDeleteTarget = name;
  document.getElementById('flDeleteName').textContent = name;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var point = _flCurrentFamily ? _flCurrentFamily.point : '0';
  document.getElementById('flDeletePointHeader').innerHTML = (isEn ? 'Take family points' : '가족 포인트 분배') + '<br><span style="font-size:11px;font-weight:400;color:#9E9E9E;">(Max ' + point + ')</span>';
  document.getElementById('flDeletePoint').value = '';
  document.getElementById('familyDeleteMemberModal').style.display = 'flex';
}
function closeFamilyDeleteMember() {
  document.getElementById('familyDeleteMemberModal').style.display = 'none';
}
function confirmFamilyDeleteMember() {
  closeFamilyDeleteMember();
}

// ── 구성원 추가 ──
var _flAddAllClients = [
  { name:'김하늘', tel:'', mobile:'010-9876-5432' },
  { name:'박서연', tel:'', mobile:'010-5555-1234' },
  { name:'이수진', tel:'02-333-4567', mobile:'010-3456-7890' },
  { name:'최윤서', tel:'02-555-1234', mobile:'010-2222-3333' },
  { name:'이지은', tel:'', mobile:'010-8765-4321' },
  { name:'정민지', tel:'', mobile:'010-1111-9999' },
  { name:'김세나', tel:'', mobile:'019-8000-9000' },
  { name:'한소희', tel:'', mobile:'010-4444-5555' },
  { name:'오서준', tel:'', mobile:'010-6666-7777' },
  { name:'윤채원', tel:'', mobile:'010-2233-4455' }
];

function openFamilyAddMember() {
  document.getElementById('flAddSearchName').value = '';
  document.getElementById('flAddSearchPhone').value = '';
  document.getElementById('flAddResultCount').textContent = '0';
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('flAddResultBody').innerHTML = '<tr><td colspan="4" style="color:#9E9E9E;padding:20px;">' + (isEn ? 'Enter a keyword and search' : '검색어를 입력 후 검색해 주세요') + '</td></tr>';
  document.getElementById('familyAddMemberModal').style.display = 'flex';
}
function closeFamilyAddMember() {
  document.getElementById('familyAddMemberModal').style.display = 'none';
}

function searchFamilyAddMember() {
  var nameQ = document.getElementById('flAddSearchName').value.trim();
  var phoneQ = document.getElementById('flAddSearchPhone').value.trim();
  var currentMembers = _flCurrentFamily ? _flCurrentFamily.members.split(', ') : [];
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  var results = _flAddAllClients.filter(function(c) {
    if (nameQ && c.name.indexOf(nameQ) === -1) return false;
    if (phoneQ) {
      var pq = phoneQ.replace(/-/g,'');
      if (c.mobile.replace(/-/g,'').indexOf(pq) === -1 && c.tel.replace(/-/g,'').indexOf(pq) === -1) return false;
    }
    return true;
  });

  document.getElementById('flAddResultCount').textContent = results.length;
  var tbody = document.getElementById('flAddResultBody');
  if (results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#9E9E9E;padding:20px;">' + (isEn ? 'No results found' : '검색 결과가 없습니다') + '</td></tr>';
    return;
  }
  var html = '';
  results.forEach(function(c) {
    var isMember = currentMembers.indexOf(c.name) !== -1;
    html += '<tr><td>' + c.name + '</td><td>' + (c.tel || '') + '</td><td>' + c.mobile + '</td>';
    if (isMember) {
      html += '<td><span class="fl-already">' + (isEn ? 'My Family' : '가족 구성원') + '</span></td>';
    } else {
      html += '<td><button class="fl-add-select-btn" onclick="openFamilyAddRelation(\'' + c.name + '\')" data-i18n="fl.btn_select" data-ko="선택" data-en="Select">' + (isEn ? 'Select' : '선택') + '</button></td>';
    }
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

// ── 구성원 추가 - 관계 입력 ──
var _flAddRelTarget = null;
function openFamilyAddRelation(name) {
  _flAddRelTarget = name;
  document.getElementById('flAddRelName').textContent = name;
  document.getElementById('flAddRelInput').value = '';
  document.getElementById('familyAddRelationModal').style.display = 'flex';
}
function closeFamilyAddRelation() {
  document.getElementById('familyAddRelationModal').style.display = 'none';
}
function saveFamilyAddRelation() {
  closeFamilyAddRelation();
  closeFamilyAddMember();
}

// ── 서비스 설정 페이지 ──
function openServiceSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  var body = document.querySelector('#serviceSetupView .sv-body');
  if (body) body.scrollTop = 0;
  if (currentLang === 'en') applyLang();
}

function openPrepaidSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  if (currentLang === 'en') applyLang();
}

function closeServiceSetup() {
  document.getElementById('serviceSetupView').classList.remove('show');
  showReservationView();
}

// 분류 사용 상태 맵
var svCatUsedData = { '네일': true, '패디': true, '추가': true };

// 네일샵 서비스 데이터 맵
var svServiceData = {
  '네일': [
    { name: '네일 케어',         dur: '30 분', used: true },
    { name: '(회원) 네일 케어',  dur: '30 분', used: true },
    { name: '젤네일 기본',       dur: '1 시간', used: true },
    { name: '(회원) 젤네일 기본',dur: '1 시간', used: true },
    { name: '젤네일 프렌치',     dur: '30 분', used: true },
    { name: '젤네일 그라데이션', dur: '30 분', used: true },
    { name: '아트',              dur: '1 시간', used: true }
  ],
  '패디': [
    { name: '패디 케어',         dur: '1 시간', used: true },
    { name: '(회원) 패디 케어',  dur: '1 시간', used: true },
    { name: '젤패디 기본',       dur: '1 시간', used: true },
    { name: '(회원) 젤패디 기본',dur: '1 시간', used: true },
    { name: '각질제거',          dur: '1 시간', used: true }
  ],
  '추가': [
    { name: '칼라추가',  dur: '00 분', used: true },
    { name: '쏙오프',    dur: '00 분', used: true },
    { name: '파츠',      dur: '00 분', used: true },
    { name: '스톤',      dur: '00 분', used: true },
    { name: '랩핑',      dur: '00 분', used: true },
    { name: '팁',        dur: '00 분', used: true },
    { name: '익스텐션',  dur: '00 분', used: true },
    { name: '보수',      dur: '00 분', used: true }
  ]
};

function svSelectCat(trEl, catName) {
  // 왼쪽 테이블 active 처리
  var tbody = document.getElementById('svCatTbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(function(r) {
      r.classList.remove('active');
      var td = r.querySelector('.sv-td-name');
      if (td) td.classList.remove('active');
      var vBtn = r.querySelector('.sv-view-btn');
      if (vBtn) vBtn.classList.remove('active');
    });
  }
  trEl.classList.add('active');
  var nameTd = trEl.querySelector('.sv-td-name');
  if (nameTd) nameTd.classList.add('active');
  var viewBtn = trEl.querySelector('.sv-view-btn');
  if (viewBtn) viewBtn.classList.add('active');
  // 선택된 분류명 업데이트
  var badge = document.getElementById('svSelectedCatName');
  if (badge) badge.textContent = catName;
  // 오른쪽 서비스 목록 동적 렌더링
  var svcTbody = document.getElementById('svSvcTbody');
  if (svcTbody && svServiceData[catName]) {
    var showUnused = document.getElementById('svShowUnusedRight') && document.getElementById('svShowUnusedRight').checked;
    svcTbody.innerHTML = svServiceData[catName].map(function(s) {
      var isUnused = s.used === false;
      var hideStyle = (isUnused && !showUnused) ? ' style="display:none;"' : '';
      var unusedClass = isUnused ? ' sv-row-unused' : '';
      var unusedAttr = isUnused ? ' data-unused="true"' : '';
      return '<tr draggable="true" class="' + unusedClass.trim() + '"' + unusedAttr + hideStyle + '>'
        + '<td class="sv-drag-col"><span class="sv-drag-handle"></span></td>'
        + '<td class="sv-td-name" style="padding-left:14px;">' + s.name + '</td>'
        + '<td>0</td>'
        + '<td>' + s.dur + '</td>'
        + '<td><button class="sv-edit-btn" onclick="svOpenSvcEdit(\'' + s.name + '\')">수정</button></td>'
        + '<td><button class="sv-add-btn" onclick="svOpenTicket(\'' + s.name + '\')">추가</button></td>'
        + '</tr>';
    }).join('');
    svInitDragDrop(svcTbody);
  }
}

function svToggleUnused(checked) {
  var tbody = document.getElementById('svCatTbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(function(row) {
    var catName = row.querySelector('.sv-td-name');
    if (!catName) return;
    var name = catName.textContent.trim();
    if (svCatUsedData[name] === false) {
      row.style.display = checked ? '' : 'none';
    }
  });
}
function svToggleUnusedRight(checked) {
  // 현재 분류의 서비스 목록 다시 렌더링 (미사용 표시/숨김 반영)
  var badge = document.getElementById('svSelectedCatName');
  if (badge) {
    var activeTr = document.querySelector('#svCatTbody tr.active');
    if (activeTr) svSelectCat(activeTr, badge.textContent);
  }
}
function svOpenCatReg() {
  document.getElementById('svCatModalTitle').textContent = currentLang === 'en' ? 'Add Category' : '분류 등록';
  document.getElementById('svCatNameInput').value = '';
  document.getElementById('svCatModal').dataset.mode = 'add';
  document.getElementById('svCatModal').dataset.editName = '';
  // 등록: 상태 행·삭제 버튼 숨김
  document.getElementById('svCatStatusRow').style.display = 'none';
  document.getElementById('svCatDeleteBtn').style.display = 'none';
  document.getElementById('svCatModal').classList.add('show');
  setTimeout(function(){ document.getElementById('svCatNameInput').focus(); }, 50);
}
function svOpenCatEdit(name) {
  document.getElementById('svCatModalTitle').textContent = currentLang === 'en' ? 'Edit Category' : '분류 수정';
  document.getElementById('svCatNameInput').value = name;
  document.getElementById('svCatModal').dataset.mode = 'edit';
  document.getElementById('svCatModal').dataset.editName = name;
  // 수정: 상태 행·삭제 버튼 표시
  document.getElementById('svCatStatusRow').style.display = 'flex';
  document.getElementById('svCatDeleteBtn').style.display = 'inline-block';
  var isUsed = svCatUsedData[name] !== false;
  document.getElementById('svCatStatusToggle').checked = isUsed;
  document.getElementById('svCatStatusLabel').textContent = isUsed ? (currentLang==='en'?'Active':'사용') : (currentLang==='en'?'Inactive':'미사용');
  document.getElementById('svCatModal').classList.add('show');
  setTimeout(function(){ document.getElementById('svCatNameInput').focus(); }, 50);
}
function svCloseCatModal() {
  document.getElementById('svCatModal').classList.remove('show');
  document.getElementById('svCatNameInput').value = '';
}
function svDeleteCat() {
  var name = document.getElementById('svCatModal').dataset.editName;
  if (!name) return;
  if (!confirm('[' + name + '] 분류를 삭제하시겠습니까?\n해당 분류의 서비스도 함께 삭제됩니다.')) return;
  // 테이블 행 제거
  var tbody = document.getElementById('svCatTbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(function(r) {
      var td = r.querySelector('.sv-td-name');
      if (td && td.textContent.trim() === name) tbody.removeChild(r);
    });
  }
  // 데이터 맵 삭제
  delete svServiceData[name];
  delete svCatUsedData[name];
  // 선택 배지가 삭제된 분류면 첫 번째 분류로 전환
  var badge = document.getElementById('svSelectedCatName');
  if (badge && badge.textContent === name) {
    var firstRow = tbody && tbody.querySelector('tr');
    if (firstRow) {
      var firstName = firstRow.querySelector('.sv-td-name');
      if (firstName) svSelectCat(firstRow, firstName.textContent.trim());
    } else {
      badge.textContent = '';
      var tb = document.getElementById('svSvcTbody');
      if (tb) tb.innerHTML = '';
    }
  }
  svCloseCatModal();
}
function svSaveCat() {
  var input = document.getElementById('svCatNameInput');
  var name = input.value.trim();
  if (!name) { input.focus(); input.classList.add('sv-input-error'); return; }
  input.classList.remove('sv-input-error');
  var modal = document.getElementById('svCatModal');
  var mode = modal.dataset.mode;
  var tbody = document.getElementById('svCatTbody');
  if (mode === 'add') {
    var tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = function(){ svSelectCat(tr, name); };
    var tdDrag = document.createElement('td');
    tdDrag.className = 'sv-drag-col';
    tdDrag.innerHTML = '<span class="sv-drag-handle"></span>';
    var tdName = document.createElement('td');
    tdName.className = 'sv-td-name';
    tdName.style.paddingLeft = '14px';
    tdName.textContent = name;
    var tdEdit = document.createElement('td');
    var btnEdit = document.createElement('button');
    btnEdit.className = 'sv-edit-btn';
    btnEdit.textContent = '수정';
    btnEdit.onclick = function(e){ e.stopPropagation(); svOpenCatEdit(name); };
    tdEdit.appendChild(btnEdit);
    var tdView = document.createElement('td');
    var btnView = document.createElement('button');
    btnView.className = 'sv-view-btn';
    btnView.textContent = '→';
    btnView.onclick = function(e){ e.stopPropagation(); svSelectCat(tr, name); };
    tdView.appendChild(btnView);
    tr.setAttribute('draggable', 'true');
    tr.appendChild(tdDrag);
    tr.appendChild(tdName);
    tr.appendChild(tdEdit);
    tr.appendChild(tdView);
    tbody.appendChild(tr);
    if (!svServiceData[name]) svServiceData[name] = [];
    svCatUsedData[name] = true;
  } else {
    var oldName = modal.dataset.editName;
    var isUsed = document.getElementById('svCatStatusToggle').checked;
    // 상태 데이터 업데이트
    if (oldName !== name) {
      svCatUsedData[name] = isUsed;
      delete svCatUsedData[oldName];
    } else {
      svCatUsedData[name] = isUsed;
    }
    var showUnused = document.getElementById('svShowUnused') && document.getElementById('svShowUnused').checked;
    tbody.querySelectorAll('tr').forEach(function(r) {
      var td = r.querySelector('.sv-td-name');
      if (td && td.textContent.trim() === oldName) {
        td.textContent = name;
        // 미사용 처리
        if (!isUsed) {
          r.classList.add('sv-row-unused');
          r.dataset.unused = 'true';
          if (!showUnused) r.style.display = 'none';
        } else {
          r.classList.remove('sv-row-unused');
          r.dataset.unused = '';
          r.style.display = '';
        }
        var capturedName = name;
        r.onclick = function(){ svSelectCat(r, capturedName); };
        var editBtn = r.querySelector('.sv-edit-btn');
        if (editBtn) editBtn.onclick = function(e){ e.stopPropagation(); svOpenCatEdit(capturedName); };
        var viewBtn = r.querySelector('.sv-view-btn');
        if (viewBtn) viewBtn.onclick = function(e){ e.stopPropagation(); svSelectCat(r, capturedName); };
      }
    });
    if (oldName !== name && svServiceData[oldName]) {
      svServiceData[name] = svServiceData[oldName];
      delete svServiceData[oldName];
    }
    var badge = document.getElementById('svSelectedCatName');
    if (badge && badge.textContent === oldName) badge.textContent = name;
  }
  svCloseCatModal();
  svInitDragDrop(document.getElementById('svCatTbody'));
}
function svOpenSvcReg() {
  // 분류 select를 현재 svServiceData 키 기반으로 동적 구성
  var curCat = (document.getElementById('svSelectedCatName') || {}).textContent || '네일';
  var sel = document.getElementById('svSvcCatSelect');
  if (sel) {
    sel.innerHTML = '';
    Object.keys(svServiceData).forEach(function(cat) {
      if (svCatUsedData[cat] === false) return;
      var op = document.createElement('option'); op.value = cat; op.textContent = cat;
      sel.appendChild(op);
    });
    for (var i=0;i<sel.options.length;i++) { if (sel.options[i].value===curCat) { sel.selectedIndex=i; break; } }
  }
  document.getElementById('svSvcModalTitle').textContent = currentLang === 'en' ? 'Add Service' : '서비스 등록';
  document.getElementById('svSvcNameInput').value = '';
  document.getElementById('svSvcPriceInput').value = '';
  document.getElementById('svSvcTimeH').value = '0';
  document.getElementById('svSvcTimeM').value = '00';
  document.getElementById('svSvcStatusToggle').checked = true;
  document.getElementById('svSvcStatusLabel').textContent = currentLang==='en'?'Active':'사용';
  document.getElementById('svSvcAllStaffToggle').checked = true;
  document.getElementById('svSvcAllStaffLabel').textContent = currentLang==='en'?'Yes':'예';
  document.getElementById('svSvcStaffGrid').style.display = 'none';
  svSwitchSvcTab(0);
  document.getElementById('svSvcModal').dataset.mode = 'add';
  document.getElementById('svSvcModal').classList.add('show');
  setTimeout(function(){ document.getElementById('svSvcNameInput').focus(); }, 50);
}
function svOpenSvcEdit(name) {
  document.getElementById('svSvcModalTitle').textContent = currentLang === 'en' ? 'Edit Service' : '서비스 수정';
  document.getElementById('svSvcNameInput').value = name;
  document.getElementById('svSvcPriceInput').value = '0';
  document.getElementById('svSvcTimeH').value = '0';
  document.getElementById('svSvcTimeM').value = '00';
  // 데이터에서 used 상태 로드
  var curCat = (document.getElementById('svSelectedCatName')||{}).textContent||'';
  var svcData = (svServiceData[curCat]||[]).find(function(s){ return s.name === name; });
  var isUsed = svcData ? svcData.used !== false : true;
  document.getElementById('svSvcStatusToggle').checked = isUsed;
  document.getElementById('svSvcStatusLabel').textContent = isUsed ? (currentLang==='en'?'Active':'사용') : (currentLang==='en'?'Inactive':'미사용');
  document.getElementById('svSvcAllStaffToggle').checked = true;
  document.getElementById('svSvcAllStaffLabel').textContent = currentLang==='en'?'Yes':'예';
  document.getElementById('svSvcStaffGrid').style.display = 'none';
  svSwitchSvcTab(0);
  document.getElementById('svSvcModal').dataset.mode = 'edit';
  document.getElementById('svSvcModal').dataset.editName = name;
  document.getElementById('svSvcModal').classList.add('show');
}
function svCloseSvcModal() {
  document.getElementById('svSvcModal').classList.remove('show');
}
function svSwitchSvcTab(idx) {
  [0,1].forEach(function(i) {
    document.getElementById('svSvcTab'+i).classList.toggle('active', i===idx);
    document.getElementById('svSvcPanel'+i).classList.toggle('active', i===idx);
  });
}
function svToggleAllStaff(checked) {
  document.getElementById('svSvcAllStaffLabel').textContent = checked ? (currentLang==='en'?'Yes':'예') : (currentLang==='en'?'No':'아니오');
  document.getElementById('svSvcStaffGrid').style.display = checked ? 'none' : 'grid';
}
function svSaveSvc() {
  var name  = document.getElementById('svSvcNameInput').value.trim();
  var priceRaw = document.getElementById('svSvcPriceInput').value.trim();
  var price = parseMoney(priceRaw);
  var catSel= document.getElementById('svSvcCatSelect');
  var cat   = catSel ? catSel.value : '';
  var h     = document.getElementById('svSvcTimeH').value || '0';
  var m     = document.getElementById('svSvcTimeM').value || '00';
  // 필수 유효성
  var nameEl  = document.getElementById('svSvcNameInput');
  var priceEl = document.getElementById('svSvcPriceInput');
  var valid = true;
  if (!name)  { nameEl.classList.add('sv-input-error');  valid=false; } else { nameEl.classList.remove('sv-input-error'); }
  if (priceRaw==='') { priceEl.classList.add('sv-input-error'); valid=false; } else { priceEl.classList.remove('sv-input-error'); }
  if (!valid) { svSwitchSvcTab(0); nameEl.focus(); return; }
  // 소요시간 표시
  var durParts = [];
  if (parseInt(h)>0) durParts.push(h+' 시간');
  durParts.push(m+' 분');
  var durText = durParts.join(' ');
  var mode = document.getElementById('svSvcModal').dataset.mode;
  var tbody = document.getElementById('svSvcTbody');
  if (mode === 'add') {
    // 서비스 데이터에 추가
    if (!svServiceData[cat]) svServiceData[cat] = [];
    var isUsed = document.getElementById('svSvcStatusToggle').checked;
    svServiceData[cat].push({ name:name, dur:durText, used:isUsed });
    // 현재 보고 있는 분류면 즉시 행 추가
    var curCat = (document.getElementById('svSelectedCatName')||{}).textContent||'';
    if (curCat === cat && tbody) {
      var tr = document.createElement('tr');
      tr.setAttribute('draggable', 'true');
      var tdDr = document.createElement('td'); tdDr.className='sv-drag-col'; tdDr.innerHTML='<span class="sv-drag-handle"></span>';
      var tdN = document.createElement('td'); tdN.className='sv-td-name'; tdN.style.paddingLeft='14px'; tdN.textContent=name;
      var tdP = document.createElement('td'); tdP.textContent=price||'0';
      var tdD = document.createElement('td'); tdD.textContent=durText;
      var tdE = document.createElement('td');
      var bE  = document.createElement('button'); bE.className='sv-edit-btn'; bE.textContent='수정';
      (function(n){ bE.onclick = function(){ svOpenSvcEdit(n); }; })(name);
      tdE.appendChild(bE);
      var tdA = document.createElement('td');
      var bA  = document.createElement('button'); bA.className='sv-add-btn'; bA.textContent='추가';
      (function(n){ bA.onclick = function(){ svOpenTicket(n); }; })(name);
      tdA.appendChild(bA);
      tr.appendChild(tdDr); tr.appendChild(tdN); tr.appendChild(tdP); tr.appendChild(tdD); tr.appendChild(tdE); tr.appendChild(tdA);
      tbody.appendChild(tr);
    }
  } else {
    // 수정: 해당 행 업데이트
    var oldName = document.getElementById('svSvcModal').dataset.editName || '';
    var isUsed = document.getElementById('svSvcStatusToggle').checked;
    // 데이터 업데이트
    var curCatEdit = (document.getElementById('svSelectedCatName')||{}).textContent||'';
    if (svServiceData[curCatEdit]) {
      svServiceData[curCatEdit].forEach(function(s) {
        if (s.name === oldName) { s.name = name; s.dur = durText; s.used = isUsed; }
      });
    }
    // 현재 분류의 서비스 목록 다시 렌더링
    var badge = document.getElementById('svSelectedCatName');
    if (badge) {
      var activeTr = document.querySelector('#svCatTbody tr.active');
      if (activeTr) svSelectCat(activeTr, badge.textContent);
    }
  }
  svCloseSvcModal();
  svInitDragDrop(document.getElementById('svSvcTbody'));
}
/* ── 티켓 등록 팝업 ── */
function svOpenTicket(name) {
  var curCat = (document.getElementById('svSelectedCatName') || {}).textContent || '';
  // 분류 select 동적 구성
  var catSel = document.getElementById('svTktCatSelect');
  if (catSel) {
    catSel.innerHTML = '';
    Object.keys(svServiceData).forEach(function(cat) {
      if (svCatUsedData[cat] === false) return;
      var op = document.createElement('option'); op.value = cat; op.textContent = cat;
      catSel.appendChild(op);
    });
    for (var i = 0; i < catSel.options.length; i++) {
      if (catSel.options[i].value === curCat) { catSel.selectedIndex = i; break; }
    }
  }
  document.getElementById('svTktSvcInput').value = name;
  document.getElementById('svTktCountInput').value = '';
  document.getElementById('svTktCountInput').disabled = false;
  document.getElementById('svTktCountUnlimited').checked = false;
  document.getElementById('svTktNameInput').value = name + ' 0 회';
  document.getElementById('svTktPriceInput').value = '';
  document.getElementById('svTktRevenueInput').value = '';
  document.getElementById('svTktExpiryInput').value = '12';
  document.getElementById('svTktExpiryInput').disabled = false;
  document.getElementById('svTktExpiryUnlimited').checked = false;
  document.querySelector('#svTktModal input[name="svTktExpiryUnit"][value="month"]').checked = true;
  document.getElementById('svTktModal').classList.add('show');
}
function svCloseTktModal() {
  document.getElementById('svTktModal').classList.remove('show');
}
function svCalcTktRevenue() {
  var cnt = parseInt(document.getElementById('svTktCountInput').value) || 0;
  var price = parseMoney(document.getElementById('svTktPriceInput').value);
  var svcName = document.getElementById('svTktSvcInput').value || '';
  // 티켓명 자동 업데이트
  var nameInput = document.getElementById('svTktNameInput');
  if (nameInput) nameInput.value = svcName + ' ' + (cnt || 0) + ' 회';
  // 횟수와 판매가 둘 다 있을 때만 1회당 매출 자동 계산
  var revInput = document.getElementById('svTktRevenueInput');
  if (cnt > 0 && price > 0) {
    var rev = Math.round(price / cnt);
    revInput.value = formatMoney(rev);
  }
}
function svToggleTktCountUnlimited(checked) {
  var inp = document.getElementById('svTktCountInput');
  inp.disabled = checked;
  if (checked) inp.value = '';
  svCalcTktRevenue();
}
function svToggleTktExpiryUnlimited(checked) {
  var inp = document.getElementById('svTktExpiryInput');
  inp.disabled = checked;
  if (checked) inp.value = '';
  document.querySelectorAll('#svTktModal input[name="svTktExpiryUnit"]').forEach(function(r) { r.disabled = checked; });
}
function svSaveTkt() {
  var cnt = document.getElementById('svTktCountInput');
  var tktName = document.getElementById('svTktNameInput');
  var price = document.getElementById('svTktPriceInput');
  var expiry = document.getElementById('svTktExpiryInput');
  var valid = true;
  var isCountUnlimited = document.getElementById('svTktCountUnlimited').checked;
  var isExpiryUnlimited = document.getElementById('svTktExpiryUnlimited').checked;
  if (!isCountUnlimited && !cnt.value.trim()) { cnt.classList.add('sv-input-error'); valid = false; } else { cnt.classList.remove('sv-input-error'); }
  if (!tktName.value.trim()) { tktName.classList.add('sv-input-error'); valid = false; } else { tktName.classList.remove('sv-input-error'); }
  if (!price.value.trim()) { price.classList.add('sv-input-error'); valid = false; } else { price.classList.remove('sv-input-error'); }
  if (!isExpiryUnlimited && !expiry.value.trim()) { expiry.classList.add('sv-input-error'); valid = false; } else { expiry.classList.remove('sv-input-error'); }
  if (!valid) return;
  alert('티켓이 등록되었습니다: ' + tktName.value);
  svCloseTktModal();
}

/* ── 드래그 앤 드롭 (서비스 설정 테이블) ── */
function svInitDragDrop(tbody) {
  if (!tbody || tbody._svDragInited) return;
  tbody._svDragInited = true;
  var dragEl = null;
  tbody.addEventListener('dragstart', function(e) {
    var row = e.target.closest('tr');
    if (!row || row.parentNode !== tbody) return;
    dragEl = row;
    row.classList.add('sv-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });
  tbody.addEventListener('dragend', function() {
    if (dragEl) dragEl.classList.remove('sv-dragging');
    tbody.querySelectorAll('tr').forEach(function(r) { r.classList.remove('sv-drop-over'); });
    dragEl = null;
  });
  tbody.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var row = e.target.closest('tr');
    if (!row || row.parentNode !== tbody || !dragEl || dragEl === row) return;
    tbody.querySelectorAll('tr').forEach(function(r) { r.classList.remove('sv-drop-over'); });
    row.classList.add('sv-drop-over');
  });
  tbody.addEventListener('dragleave', function(e) {
    var row = e.target.closest('tr');
    if (row) row.classList.remove('sv-drop-over');
  });
  tbody.addEventListener('drop', function(e) {
    e.preventDefault();
    var row = e.target.closest('tr');
    if (!row || row.parentNode !== tbody || !dragEl || dragEl === row) return;
    var rows = Array.from(tbody.querySelectorAll('tr'));
    var fromIdx = rows.indexOf(dragEl);
    var toIdx = rows.indexOf(row);
    if (fromIdx < toIdx) {
      tbody.insertBefore(dragEl, row.nextSibling);
    } else {
      tbody.insertBefore(dragEl, row);
    }
    tbody.querySelectorAll('tr').forEach(function(r) { r.classList.remove('sv-drop-over'); });
  });
}

// 페이지 로드 시 드래그 앤 드롭 초기화 + 금액 입력 바인딩
document.addEventListener('DOMContentLoaded', function() {
  svInitDragDrop(document.getElementById('svCatTbody'));
  svInitDragDrop(document.getElementById('svSvcTbody'));
  svInitDragDrop(document.getElementById('psCardTbody'));
  // 금액 입력칸 3자리 콤마 바인딩
  ['svSvcPriceInput','svTktPriceInput','svTktRevenueInput',
   'ppPriceInput','ppDepositInput','prdBuyPrice','prdSellPrice',
   'tkeNewPerUse',
   'cmNumFrom','cmNumTo','cmNoVisitDays','cmRecentDays',
   'cmPointsFrom','cmPointsTo','cmPrepaidFrom','cmPrepaidTo',
   'cmAvgSpendFrom','cmAvgSpendTo','cmReferralCountFrom','cmReferralCountTo',
   'cmTotalSalesFrom','cmTotalSalesTo','cmTotalVisitsFrom','cmTotalVisitsTo'
  ].forEach(bindMoneyInput);
  // 기타 코드 할인 - 금액 선택 시만 콤마 적용 (input 이벤트에서 처리)
  var otcDiscInp = document.getElementById('otcDiscountInput');
  if (otcDiscInp && !otcDiscInp._isDummy) {
    otcDiscInp.addEventListener('input', function() {
      var isAmt = document.getElementById('otcDiscAmt').checked;
      if (isAmt) moneyInputFormat(this);
    });
    otcDiscInp.addEventListener('keydown', function(e) {
      var isAmt = document.getElementById('otcDiscAmt').checked;
      if (isAmt) moneyInputKeydown(e);
    });
  }
});

/* ── 정액권 설정 ── */
function ppOpenReg() {
  document.getElementById('ppModalTitle').textContent = currentLang === 'en' ? 'Add Prepaid Card' : '정액권 등록';
  document.getElementById('ppNameInput').value = '';
  document.getElementById('ppPriceInput').value = '';
  document.getElementById('ppStatusToggle').checked = true;
  document.getElementById('ppStatusLabel').textContent = currentLang==='en'?'Active':'사용';
  var depRow = document.getElementById('ppDepositRow');
  var depHint = document.getElementById('ppDepositHint');
  if (depRow) depRow.style.display = '';
  if (depHint) depHint.style.display = '';
  document.getElementById('ppDepositInput').value = '';
  document.getElementById('ppExpiryInput').value = '';
  document.getElementById('ppExpiryInput').disabled = false;
  document.getElementById('ppExpiryUnlimited').checked = false;
  document.getElementById('ppDiscCheckbox').checked = false;
  document.getElementById('ppDiscFields').style.display = '';
  document.getElementById('ppDiscFields').style.opacity = '0.5';
  document.getElementById('ppSvcDiscInput').value = '';
  document.getElementById('ppSvcDiscInput').disabled = true;
  document.getElementById('ppPrdDiscInput').value = '';
  document.getElementById('ppPrdDiscInput').disabled = true;
  document.querySelector('#ppRegModal input[name="ppType"][value="deposit"]').checked = true;
  document.querySelector('#ppRegModal input[name="ppExpiryUnit"][value="month"]').checked = true;
  document.getElementById('ppDeleteBtn').style.display = 'none';
  document.getElementById('ppRegModal').dataset.mode = 'add';
  document.getElementById('ppRegModal').classList.add('show');
}
function ppOpenEdit(idx) {
  document.getElementById('ppModalTitle').textContent = currentLang === 'en' ? 'Edit Prepaid Card' : '정액권 수정';
  document.getElementById('ppDeleteBtn').style.display = 'inline-block';
  var tbody = document.getElementById('psCardTbody');
  var row = tbody ? tbody.querySelectorAll('tr')[idx] : null;
  if (row) {
    var cells = row.querySelectorAll('td');
    // cols: 0=drag, 1=유형, 2=정액권명, 3=판매가, 4=추가금액, 5=적립금액, 6=유효기간, 7=서비스할인, 8=제품할인
    var typeText = (cells[1] ? cells[1].textContent.trim() : '');
    var isDeposit = (typeText === '적립' || typeText === 'Deposit');
    var nameText = cells[2] ? cells[2].textContent.trim() : '';
    var priceText = cells[3] ? cells[3].textContent.trim().replace(/,/g, '') : '0';
    var depositText = cells[5] ? cells[5].textContent.trim().replace(/,/g, '') : '0';
    var expiryText = cells[6] ? cells[6].textContent.trim() : '';
    var svcDisc = cells[7] ? cells[7].textContent.trim().replace('%', '') : '0';
    var prdDisc = cells[8] ? cells[8].textContent.trim().replace('%', '') : '0';
    var isUnused = row.classList.contains('ps-unused');

    // 유형
    if (isDeposit) {
      document.querySelector('#ppRegModal input[name="ppType"][value="deposit"]').checked = true;
    } else {
      document.querySelector('#ppRegModal input[name="ppType"][value="discount"]').checked = true;
    }
    ppSwitchType();

    // 정액권명, 판매가, 적립금액
    document.getElementById('ppNameInput').value = nameText;
    document.getElementById('ppPriceInput').value = formatMoney(parseMoney(priceText));
    document.getElementById('ppDepositInput').value = formatMoney(parseMoney(depositText));

    // 유효기간
    var isUnlimited = (expiryText === '무제한' || expiryText === 'No Limit');
    document.getElementById('ppExpiryUnlimited').checked = isUnlimited;
    document.getElementById('ppExpiryInput').disabled = isUnlimited;
    if (isUnlimited) {
      document.getElementById('ppExpiryInput').value = '';
    } else {
      var expiryNum = parseInt(expiryText) || 12;
      document.getElementById('ppExpiryInput').value = expiryNum;
      if (expiryText.indexOf('일') >= 0 || expiryText.indexOf('Day') >= 0) {
        document.querySelector('#ppRegModal input[name="ppExpiryUnit"][value="day"]').checked = true;
      } else {
        document.querySelector('#ppRegModal input[name="ppExpiryUnit"][value="month"]').checked = true;
      }
    }
    document.querySelectorAll('#ppRegModal input[name="ppExpiryUnit"]').forEach(function(r) { r.disabled = isUnlimited; });

    // 할인율
    var hasDisc = (svcDisc && svcDisc !== '0') || (prdDisc && prdDisc !== '0');
    document.getElementById('ppDiscCheckbox').checked = hasDisc;
    document.getElementById('ppSvcDiscInput').value = svcDisc || '0';
    document.getElementById('ppPrdDiscInput').value = prdDisc || '0';
    document.getElementById('ppSvcDiscInput').disabled = !hasDisc;
    document.getElementById('ppPrdDiscInput').disabled = !hasDisc;
    document.getElementById('ppDiscFields').style.opacity = hasDisc ? '1' : '0.5';

    // 상태
    document.getElementById('ppStatusToggle').checked = !isUnused;
    document.getElementById('ppStatusLabel').textContent = !isUnused ? (currentLang==='en'?'Active':'사용') : (currentLang==='en'?'Inactive':'미사용');
  }
  document.getElementById('ppRegModal').dataset.mode = 'edit';
  document.getElementById('ppRegModal').dataset.editIdx = idx;
  document.getElementById('ppRegModal').classList.add('show');
}
function ppCloseModal() {
  document.getElementById('ppRegModal').classList.remove('show');
}
function ppSwitchType() {
  var isDeposit = document.querySelector('#ppRegModal input[name="ppType"][value="deposit"]').checked;
  var depRow = document.getElementById('ppDepositRow');
  var depHint = document.getElementById('ppDepositHint');
  if (depRow) depRow.style.display = isDeposit ? '' : 'none';
  if (depHint) depHint.style.display = isDeposit ? '' : 'none';
}
function ppToggleExpUnlimited(checked) {
  document.getElementById('ppExpiryInput').disabled = checked;
  if (checked) document.getElementById('ppExpiryInput').value = '';
  document.querySelectorAll('#ppRegModal input[name="ppExpiryUnit"]').forEach(function(r) { r.disabled = checked; });
}
function ppToggleDiscFields(checked) {
  var fields = document.getElementById('ppDiscFields');
  fields.style.display = '';
  var inputs = fields.querySelectorAll('input');
  inputs.forEach(function(inp) { inp.disabled = !checked; });
  fields.style.opacity = checked ? '1' : '0.5';
}
function ppSave() {
  var name = document.getElementById('ppNameInput').value.trim();
  if (!name) { document.getElementById('ppNameInput').focus(); document.getElementById('ppNameInput').classList.add('sv-input-error'); return; }
  document.getElementById('ppNameInput').classList.remove('sv-input-error');
  var isUsed = document.getElementById('ppStatusToggle').checked;
  var mode = document.getElementById('ppRegModal').dataset.mode;
  if (mode === 'edit') {
    var idx = parseInt(document.getElementById('ppRegModal').dataset.editIdx) || 0;
    var tbody = document.getElementById('psCardTbody');
    var row = tbody ? tbody.querySelectorAll('tr')[idx] : null;
    if (row) {
      var showUnused = document.getElementById('psShowUnused') && document.getElementById('psShowUnused').checked;
      if (!isUsed) {
        row.classList.add('ps-unused');
        if (showUnused) row.classList.add('ps-show'); else row.style.display = 'none';
      } else {
        row.classList.remove('ps-unused', 'ps-show');
        row.style.display = '';
      }
    }
  }
  ppCloseModal();
}
function ppDelete() {
  if (!confirm('이 정액권을 삭제하시겠습니까?')) return;
  alert('정액권이 삭제되었습니다.');
  ppCloseModal();
}
function psToggleUnused(checked) {
  var tbody = document.getElementById('psCardTbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr.ps-unused').forEach(function(row) {
    if (checked) {
      row.style.display = '';
      row.classList.add('ps-show');
    } else {
      row.style.display = 'none';
      row.classList.remove('ps-show');
    }
  });
}

function pkgSelectRow(trEl, idx) {
  var tbody = document.getElementById('pkgTbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(function(r) {
      r.classList.remove('active');
      var vb = r.querySelector('.pkg-view-btn');
      if (vb) vb.classList.remove('active');
    });
  }
  trEl.classList.add('active');
  var vBtn = trEl.querySelector('.pkg-view-btn');
  if (vBtn) vBtn.classList.add('active');
}

function sortClTable(thEl, colIdx) {
  var table = document.querySelector('#customerListView .cl-table');
  if (!table) return;
  var tbody = table.querySelector('tbody');
  var rows = Array.from(tbody.querySelectorAll('tr'));

  // 현재 정렬 상태 확인
  var isAsc = thEl.classList.contains('asc');
  var isDesc = thEl.classList.contains('desc');

  // 다른 헤더 초기화
  table.querySelectorAll('.cl-sortable').forEach(function(th) {
    th.classList.remove('asc', 'desc');
  });

  // 첫 클릭=내림차순, 이후 토글
  var dir;
  if (!isAsc && !isDesc) {
    dir = 'desc';
  } else if (isDesc) {
    dir = 'asc';
  } else {
    dir = 'desc';
  }
  thEl.classList.add(dir);

  // 정렬
  rows.sort(function(a, b) {
    var aText = a.querySelectorAll('td')[colIdx].textContent.trim();
    var bText = b.querySelectorAll('td')[colIdx].textContent.trim();

    // 숫자 컬럼 (고객번호, 정액권잔액, 총판매액)
    if (colIdx === 1 || colIdx === 6 || colIdx === 7) {
      var aNum = parseFloat(aText.replace(/,/g, '')) || 0;
      var bNum = parseFloat(bText.replace(/,/g, '')) || 0;
      return dir === 'asc' ? aNum - bNum : bNum - aNum;
    }
    // 문자열 비교
    if (dir === 'asc') return aText.localeCompare(bText, 'ko');
    return bText.localeCompare(aText, 'ko');
  });

  // DOM 재배치
  rows.forEach(function(row) { tbody.appendChild(row); });
  // 정렬 후 1페이지로 이동
  clGoPage(1);
}

function shGoPage(p) {
  if (p < 1) p = 1;
  if (p > shTotalPages) p = shTotalPages;
  shPage = p;

  var tbody = document.getElementById('shTbody');
  if (!tbody) return;
  var allRows = Array.from(tbody.querySelectorAll('tr'));
  var showDeleted = document.querySelector('#salesHistoryView .sh-summary-right input[type="checkbox"]');
  var isDelVisible = showDeleted ? showDeleted.checked : false;

  // 대상 행: 검색 필터 + 삭제 행 체크 상태 반영
  var targetRows = allRows.filter(function(row) {
    if (row.classList.contains('sh-filtered')) return false;
    if (!isDelVisible && row.classList.contains('sh-deleted-row')) return false;
    return true;
  });
  var total = targetRows.length;
  shTotalPages = Math.ceil(total / shPerPage);
  if (shTotalPages < 1) shTotalPages = 1;
  if (shPage > shTotalPages) shPage = shTotalPages;

  var startIdx = (shPage - 1) * shPerPage;
  var endIdx = startIdx + shPerPage;
  var idx = 0;

  allRows.forEach(function(row) {
    if (row.classList.contains('sh-filtered')) {
      row.style.display = 'none';
    } else if (!isDelVisible && row.classList.contains('sh-deleted-row')) {
      row.style.display = 'none';
    } else {
      row.style.display = (idx >= startIdx && idx < endIdx) ? '' : 'none';
      idx++;
    }
  });

  var info = document.getElementById('shPageInfo');
  if (info) {
    var pgLabel = currentLang === 'en' ? 'Page' : '페이지';
    var pgOf = currentLang === 'en' ? 'of' : '의';
    info.innerHTML = '<span data-i18n="sh.page_label" data-ko="페이지" data-en="Page">' + pgLabel + '</span> <b>' + shPage + '</b> <span data-i18n="sh.page_of" data-ko="의" data-en="of">' + pgOf + '</span> <b>' + shTotalPages + '</b>';
  }

  var goSelect = document.getElementById('shGoSelect');
  if (goSelect) {
    goSelect.innerHTML = '';
    for (var i = 1; i <= shTotalPages; i++) {
      var opt = document.createElement('option');
      opt.value = i; opt.textContent = i;
      goSelect.appendChild(opt);
    }
    goSelect.value = shPage;
  }
}

function toggleShPageDd(e) {
  e.stopPropagation();
  var sel = document.getElementById('shGoSelect');
  if (sel.style.display === 'none') {
    sel.style.display = '';
    sel.value = shPage;
  } else {
    sel.style.display = 'none';
  }
}

function hideShPageDd() {
  var sel = document.getElementById('shGoSelect');
  if (sel) sel.style.display = 'none';
}

function clGoPage(p) {
  if (p < 1) p = 1;
  if (p > clTotalPages) p = clTotalPages;
  clPage = p;

  var tbody = document.getElementById('clTbody');
  if (!tbody) return;
  var rows = Array.from(tbody.querySelectorAll('tr'));
  var total = rows.length;
  clTotalPages = Math.ceil(total / clPerPage);
  if (clPage > clTotalPages) clPage = clTotalPages;

  var startIdx = (clPage - 1) * clPerPage;
  var endIdx = startIdx + clPerPage;

  rows.forEach(function(row, i) {
    row.style.display = (i >= startIdx && i < endIdx) ? '' : 'none';
  });

  // 페이지 정보 업데이트
  var info = document.getElementById('clPageInfo');
  if (info) {
    var pgLabel = currentLang === 'en' ? 'Page' : '페이지';
    var pgOf = currentLang === 'en' ? 'of' : '의';
    info.innerHTML = '<span data-i18n="cl.page_label" data-ko="페이지" data-en="Page">' + pgLabel + '</span> <b>' + clPage + '</b> <span data-i18n="cl.page_of" data-ko="의" data-en="of">' + pgOf + '</span> <b>' + clTotalPages + '</b>';
  }

  // 드롭다운 업데이트
  var goSelect = document.getElementById('clGoSelect');
  if (goSelect) {
    goSelect.innerHTML = '';
    for (var i = 1; i <= clTotalPages; i++) {
      var opt = document.createElement('option');
      opt.value = i; opt.textContent = i;
      goSelect.appendChild(opt);
    }
    goSelect.value = clPage;
  }
}

function toggleClPageDd(e) {
  e.stopPropagation();
  var sel = document.getElementById('clGoSelect');
  if (sel.style.display === 'none') {
    sel.style.display = '';
    sel.value = clPage;
  } else {
    sel.style.display = 'none';
  }
}

function hideClPageDd() {
  var sel = document.getElementById('clGoSelect');
  if (sel) sel.style.display = 'none';
}

function openRsvHistory() {
  document.getElementById('apptMenuDropdown').classList.remove('is-open');
  document.getElementById('apptMenuBtn').classList.remove('is-open');
  document.getElementById('rsvHistoryPopup').classList.add('show');
}

function closeRsvHistory() {
  document.getElementById('rsvHistoryPopup').classList.remove('show');
}

function closeCustInfoPopup() {
  document.getElementById('custInfoPopup').classList.remove('show');
  document.getElementById('cipRecentDd').classList.remove('open');
}

function openNoticeModal(title, date, body) {
  document.getElementById('nmTitle').textContent = title;
  document.getElementById('nmDate').textContent = date;
  document.getElementById('nmBody').innerText = body;
  document.getElementById('noticeModal').classList.add('show');
  hideNoticeBubble();
}

function closeNoticeModal() {
  document.getElementById('noticeModal').classList.remove('show');
}

function showNoticeBubble() {
  var unread = document.querySelectorAll('.notice-dd-item.unread .notice-dd-title');
  if (!unread.length) return;
  var bubble = document.getElementById('noticeBubble');
  var dd = document.getElementById('noticeDd');
  if (dd && dd.classList.contains('open')) return; // 드롭다운 열려있으면 스킵
  var title = unread[_noticeBubbleIdx % unread.length];
  var text = title.textContent.replace(/^\s+/, '');
  if (typeof currentLang !== 'undefined' && currentLang === 'en') {
    var enMap = {'아하소프트 플러스 업데이트 안내':'AhaPlus Update Notice','[휴무안내] 삼일절 휴무안내':'[Holiday] Independence Movement Day'};
    for (var k in enMap) { if (text.indexOf(k) >= 0) { text = enMap[k]; break; } }
  }
  bubble.textContent = '📢 ' + text;
  bubble.classList.add('show');
  _noticeBubbleIdx++;
  setTimeout(hideNoticeBubble, 4000);
}

function hideNoticeBubble() {
  var bubble = document.getElementById('noticeBubble');
  if (bubble) bubble.classList.remove('show');
}

// ── 원본 파일에서 분리된 stub 함수들 (참조 오류 방지) ──
function markAllNoticeRead() {
  document.querySelectorAll('.notice-dd-item.unread').forEach(function(el){ el.classList.remove('unread'); });
  var badge = document.getElementById('noticeBadge');
  if (badge) badge.style.display = 'none';
}
function openNoticeDetail(el) {
  var body = el ? el.getAttribute('data-body') : '';
  var modal = document.getElementById('noticeModal');
  if (modal) {
    var bodyEl = modal.querySelector('.notice-modal-body, .nm-body, p');
    if (bodyEl) bodyEl.textContent = body || '';
    modal.classList.add('show');
  } else { alert(body || ''); }
}
function showNoticeList() { toggleNoticeDd(null); }
function openNoticeFromList(el) { openNoticeDetail(el); }
function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('userDd') || document.querySelector('.user-dd');
  if (dd) dd.classList.toggle('open');
}
function switchItemSubTab(el, idx) {
  var tabs = document.querySelectorAll('.rv-item-subtab');
  tabs.forEach(function(t){ t.classList.remove('active'); t.style.borderBottom='2px solid transparent'; t.style.color='#9E9E9E'; });
  if (el) { el.classList.add('active'); el.style.borderBottom='2px solid #6161FF'; el.style.color='#6161FF'; }
}
function openCustDetailFromList(id) { console.log('openCustDetailFromList', id); }
function openCustEditFromList(btn) {
  var tr = btn.closest('tr');
  var cells = tr.querySelectorAll('td');
  var regDate = cells[0].textContent.trim();
  var custNum = cells[1].textContent.trim();
  var custName = cells[2].textContent.trim();
  var phone = cells[3].textContent.trim();
  var gradeGroup = cells[4].textContent.trim();
  var staff = cells[5].textContent.trim();
  var memo = cells[8] ? cells[8].textContent.trim() : '';

  // 팝업 열기
  document.getElementById('custRegPopup').style.display = 'flex';

  // 제목 변경
  var header = document.querySelector('#custRegPopup .svc-popup-header span');
  if (header) { header.textContent = currentLang === 'en' ? 'Edit Client' : '고객 수정'; header.dataset.ko = '고객 수정'; header.dataset.en = 'Edit Client'; }

  // 저장 버튼 텍스트
  var saveBtn = document.querySelector('#custRegPopup .svc-popup-footer .btn-primary');
  if (saveBtn) { saveBtn.textContent = currentLang === 'en' ? 'Save' : '저장'; }

  // 삭제 버튼 표시
  document.getElementById('cregDeleteBtn').style.display = '';

  // 필드 초기화 후 값 채우기
  var ids = ['cregName','cregPhone','cregTel','cregMemo','cregAge','cregBirthY','cregBirthM','cregBirthD'];
  ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  var sels = ['cregGrade','cregGroup','cregStaff','cregVisitPath'];
  sels.forEach(function(id){ var el=document.getElementById(id); if(el) el.selectedIndex=0; });
  document.querySelectorAll('#custRegPopup input[type="radio"]').forEach(function(r){ r.checked=false; });
  var smsEl = document.getElementById('cregSmsBlock'); if(smsEl) smsEl.checked=false;
  var noNumEl = document.getElementById('cregNoNumber'); if(noNumEl) { noNumEl.checked=false; }
  var custNumEl = document.getElementById('cregCustNum'); if(custNumEl) { custNumEl.disabled=false; custNumEl.style.background=''; }

  // 데이터 채우기
  document.getElementById('cregCustNum').value = custNum;
  document.getElementById('cregName').value = custName;
  document.getElementById('cregPhone').value = phone.replace(/-/g,'');
  if (memo) document.getElementById('cregMemo').value = memo;

  // 등록일
  var regDateInput = document.querySelector('#custRegPopup input[type="date"]');
  if (regDateInput && regDate) regDateInput.value = regDate;

  // 담당자 매칭
  if (staff) {
    var staffSel = document.getElementById('cregStaff');
    for (var i = 0; i < staffSel.options.length; i++) {
      if (staffSel.options[i].text === staff) { staffSel.selectedIndex = i; break; }
    }
  }

  // 등급/그룹 매칭 (형식: "등급" 또는 "등급 / 그룹")
  if (gradeGroup) {
    var parts = gradeGroup.split('/').map(function(s){ return s.trim(); });
    if (parts[0]) {
      var gradeSel = document.getElementById('cregGrade');
      for (var i = 0; i < gradeSel.options.length; i++) {
        if (gradeSel.options[i].text === parts[0]) { gradeSel.selectedIndex = i; break; }
      }
    }
    if (parts[1]) {
      var groupSel = document.getElementById('cregGroup');
      for (var i = 0; i < groupSel.options.length; i++) {
        if (groupSel.options[i].text === parts[1]) { groupSel.selectedIndex = i; break; }
      }
    }
  }

  if (currentLang === 'en') applyLang();
}

function deleteCustFromEdit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (confirm(isEn ? 'Are you sure you want to delete this client?' : '이 고객을 삭제하시겠습니까?')) {
    // 현재 편집 중인 고객 정보 수집
    var custNum = document.getElementById('cregCustNum').value;
    var custName = document.getElementById('cregName').value;
    var phoneRaw = document.getElementById('cregPhone').value;
    var phone = phoneRaw.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (phoneRaw.indexOf('-') >= 0) phone = phoneRaw;

    // 고객 목록 테이블에서 해당 행 찾아 데이터 수집 후 삭제
    var rows = document.querySelectorAll('#clTbody tr');
    var salesVal = '0';
    var lastVisitVal = '';
    for (var i = 0; i < rows.length; i++) {
      var tds = rows[i].querySelectorAll('td');
      if (tds.length > 1 && tds[1].textContent.trim() === custNum) {
        salesVal = tds[7] ? tds[7].textContent.trim() : '0';
        lastVisitVal = '';
        rows[i].remove();
        break;
      }
    }

    // 삭제 고객 데이터에 추가
    var today = new Date();
    var delDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    _dlcAllData.unshift({
      delDate: delDate,
      no: parseInt(custNum) || 0,
      name: custName,
      phone: phone,
      sales: salesVal,
      lastVisit: lastVisitVal || '-'
    });

    // 고객 수 갱신
    var countB = document.querySelector('#customerListView .cl-count b');
    if (countB) {
      var cnt = parseInt(countB.textContent) || 0;
      if (cnt > 0) countB.textContent = cnt - 1;
    }

    closeCustRegPopup();
  }
}
function searchCipCustomer() { console.log('searchCipCustomer'); }
function selectCipCustomer(el) { console.log('selectCipCustomer', el); }
function closeDepositModal() {
  var m = document.getElementById('depositModal');
  if (m) m.classList.remove('show');
}
function doPrint() { window.print(); }

// 공지 말풍선 클릭 → 공지 드롭다운 열기
function openNoticeBubbleTarget(e) {
  hideNoticeBubble();
  var btn = document.getElementById('btnNotice');
  if (btn) btn.click();
}

// 공지 드롭다운 토글
function toggleNoticeDd(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('noticeDd');
  if (!dd) return;
  var isOpen = dd.classList.contains('open');
  // 다른 드롭다운 닫기
  document.querySelectorAll('.notice-dd, .user-dd').forEach(function(el) {
    el.classList.remove('open');
  });
  if (!isOpen) {
    dd.classList.add('open');
    // 읽음 처리
    dd.querySelectorAll('.notice-dd-item.unread').forEach(function(item) {
      item.classList.remove('unread');
    });
    var badge = document.getElementById('noticeBadge');
    if (badge) badge.style.display = 'none';
  }
}


// ── 퀵 아이콘 (임시 저장 / 전화 수신 이력) ──
function showTempSaveIcon(count) {
  var btn = document.getElementById('btnTempSave');
  var badge = document.getElementById('tempSaveBadge');
  if (count > 0) { btn.style.display = ''; badge.textContent = count; }
  else { btn.style.display = 'none'; }
}
function showCallHistoryIcon(count) {
  var btn = document.getElementById('btnCallHistory');
  var badge = document.getElementById('callHistoryBadge');
  btn.style.display = '';
  if (count > 0) { badge.style.display = ''; badge.textContent = count; }
  else { badge.style.display = 'none'; }
}
showTempSaveIcon(2);
showCallHistoryIcon(3);

// ── 공지 버블 타이머 ──
var _noticeBubbleIdx = 0;
setTimeout(function() {
  showNoticeBubble();
  window._noticeBubbleTimer = setInterval(showNoticeBubble, 30000);
}, 3000);

// ── 페이징 초기화 ──
var shPage = 1;
var shPerPage = 10;
var shTotalPages = 2;
document.addEventListener("DOMContentLoaded", function() { shGoPage(1); });
if (document.readyState !== "loading") { setTimeout(function(){ shGoPage(1); }, 100); }

var clPage = 1;
var clPerPage = 10;
var clTotalPages = 3;
document.addEventListener("DOMContentLoaded", function() { clGoPage(1); });
if (document.readyState !== "loading") { setTimeout(function(){ clGoPage(1); }, 100); }


// ── 예약 등록 모달 JS ──
  // Customer Registration Popup
  function openCustRegPopup() {
    document.getElementById('custRegPopup').style.display = 'flex';
    var header = document.querySelector('#custRegPopup .svc-popup-header span');
    if (header) { header.textContent = currentLang === 'en' ? 'Add Client' : '고객 등록'; header.dataset.ko = '고객 등록'; header.dataset.en = 'Add Client'; }
    var saveBtn = document.querySelector('#custRegPopup .svc-popup-footer .btn-primary');
    if (saveBtn) { saveBtn.textContent = currentLang === 'en' ? 'Save' : '저장'; saveBtn.dataset.ko = '저장'; saveBtn.dataset.en = 'Save'; }
    // 필드 초기화
    var ids = ['cregName','cregPhone','cregTel','cregMemo','cregAge','cregBirthY','cregBirthM','cregBirthD'];
    ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    var sels = ['cregGrade','cregGroup','cregStaff','cregVisitPath'];
    sels.forEach(function(id){ var el=document.getElementById(id); if(el) el.selectedIndex=0; });
    document.querySelectorAll('#custRegPopup input[type="radio"]').forEach(function(r){ r.checked=false; });
    var smsEl = document.getElementById('cregSmsBlock'); if(smsEl) smsEl.checked=false;
    var noNumEl = document.getElementById('cregNoNumber'); if(noNumEl) { noNumEl.checked=false; }
    var custNumEl = document.getElementById('cregCustNum'); if(custNumEl) { custNumEl.disabled=false; custNumEl.style.background=''; }
    // 신규 등록 모드: 삭제 버튼 숨김
    document.getElementById('cregDeleteBtn').style.display = 'none';
    if (currentLang === 'en') applyLang();
  }
  function closeCustRegPopup() {
    document.getElementById('custRegPopup').style.display = 'none';
    var header = document.querySelector('#custRegPopup .svc-popup-header span');
    if (header) { header.textContent = currentLang === 'en' ? 'Add Client' : '고객등록'; header.dataset.ko = '고객등록'; header.dataset.en = 'Add Client'; }
    var saveBtn = document.querySelector('#custRegPopup .svc-popup-footer .btn-primary');
    if (saveBtn) { saveBtn.textContent = currentLang === 'en' ? 'Save' : '저장'; saveBtn.dataset.ko = '저장'; saveBtn.dataset.en = 'Save'; }
  }
  function saveCustReg() { closeCustRegPopup(); /* save logic */ }
  function openFieldSettings() { document.getElementById('fieldSettingsPopup').style.display = 'flex'; }
  function closeFieldSettings() { document.getElementById('fieldSettingsPopup').style.display = 'none'; }
  function saveFieldSettings() {
    document.querySelectorAll('[data-fs]').forEach(function(cb) {
      var field = cb.dataset.fs;
      var visible = cb.checked;
      document.querySelectorAll('.creg-row[data-field="' + field + '"]').forEach(function(row) {
        row.style.display = visible ? '' : 'none';
      });
    });
    closeFieldSettings();
  }

  // ── 번호 부여 안함 체크 시 고객번호 입력창 비활성화 ──
  function toggleCustNumField() {
    var cb = document.getElementById('cregNoNumber');
    var input = document.getElementById('cregCustNum');
    if (cb.checked) {
      input.value = '';
      input.disabled = true;
      input.style.background = '#F5F5F5';
    } else {
      input.disabled = false;
      input.style.background = '';
    }
  }

  // ── 도로명주소 검색 (juso.go.kr 팝업 API) ──
  function openJusoSearch() {
    new daum.Postcode({
      oncomplete: function(data) {
        document.getElementById('cregPostcode').value = data.zonecode;
        document.getElementById('cregAddr1').value = data.roadAddress || data.jibunAddress;
        document.getElementById('cregAddr2').value = '';
        document.getElementById('cregAddr2').focus();
      }
    }).open();
  }

  // ── 고객번호 설정 팝업 ──
  function openCustNumSetting() {
    document.getElementById('custNumSettingModal').classList.add('show');
  }
  function closeCustNumSetting() {
    document.getElementById('custNumSettingModal').classList.remove('show');
  }
  function saveCustNumSetting() {
    closeCustNumSetting();
  }

  // ── 소개자 검색 팝업 ──
  function openRefSearch() {
    document.getElementById('refSearchInput').value = '';
    document.getElementById('refSearchModal').classList.add('show');
  }
  function closeRefSearch() {
    document.getElementById('refSearchModal').classList.remove('show');
  }
  function searchRef() {
    // 프로토타입: 검색 시뮬레이션
  }
  function selectRef(tr) {
    var name = tr.querySelectorAll('td')[0].textContent.trim();
    document.getElementById('crRefName').value = name;
    document.getElementById('crRefInput').style.display = 'none';
    document.getElementById('crRefSelected').style.display = 'flex';
    closeRefSearch();
  }
  function clearRefSelection() {
    document.getElementById('crRefName').value = '';
    document.getElementById('crRefSelected').style.display = 'none';
    document.getElementById('crRefInput').style.display = 'flex';
  }

  // ── 중복고객 확인 팝업 ──
  function openDupCheck(type) {
    document.getElementById('dupCheckModal').classList.add('show');
  }
  function closeDupCheck() {
    document.getElementById('dupCheckModal').classList.remove('show');
  }


// ── 임의 휴일 및 특근 설정 캘린더 ──
var holeYear = 2026, holeMonth = 2; // 0-indexed
var holeHolidays = {}; // key: 'YYYY-M-D', value: 'holiday'|'special'
var holeCurrentSpecialDay = null;
var holeDayNames = ['일','월','화','수','목','금','토'];

function openHolidayPopup(){
  document.getElementById('holidayPopup').classList.add('show');
}
function closeHolidayPopup(){
  document.getElementById('holidayPopup').classList.remove('show');
}
function openHolidayEditPopup(){
  holeYear = 2026; holeMonth = 2;
  // 직원 → 전체, 타입 → 임의 휴일
  var sel = document.querySelector('#holidayEditPopup select');
  if(sel) sel.selectedIndex = 0;
  document.querySelector('input[name="holeType"][value="holiday"]').checked = true;
  renderHoleCal();
  document.getElementById('holidayEditPopup').classList.add('show');
}
function closeHolidayEditPopup(){
  document.getElementById('holidayEditPopup').classList.remove('show');
}
function holeNavMonth(dir){
  holeMonth += dir;
  if(holeMonth>11){holeMonth=0;holeYear++;}
  if(holeMonth<0){holeMonth=11;holeYear--;}
  renderHoleCal();
}
function renderHoleCal(){
  var mNames=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('holeCalTitle').textContent = holeYear+'년 '+mNames[holeMonth];
  var grid = document.getElementById('holeCalGrid');
  var html = '<span class="dow">일</span><span class="dow">월</span><span class="dow">화</span><span class="dow">수</span><span class="dow">목</span><span class="dow">금</span><span class="dow">토</span>';
  var first = new Date(holeYear, holeMonth, 1);
  var startDay = first.getDay();
  var daysInMonth = new Date(holeYear, holeMonth+1, 0).getDate();
  var prevDays = new Date(holeYear, holeMonth, 0).getDate();
  // prev month
  for(var i=startDay-1;i>=0;i--) html+='<span class="day other">'+(prevDays-i)+'</span>';
  // current month
  for(var d=1;d<=daysInMonth;d++){
    var dow = new Date(holeYear,holeMonth,d).getDay();
    var cls='day';
    var key=holeYear+'-'+holeMonth+'-'+d;
    if(dow===0) cls+=' regular-holiday'; // 일요일 정기휴일
    if(holeHolidays[key]==='holiday') cls+=' hole-selected';
    if(holeHolidays[key]==='special') cls+=' special-workday';
    html+='<span class="'+cls+'" data-d="'+d+'" onclick="holeClickDay('+d+')">'+d+'</span>';
  }
  // next month
  var total = startDay+daysInMonth;
  var rem = (7-total%7)%7;
  for(var i=1;i<=rem;i++) html+='<span class="day other">'+i+'</span>';
  grid.innerHTML = html;
}
function holeClickDay(d){
  var dow = new Date(holeYear,holeMonth,d).getDay();
  if(dow===0) return; // 정기 휴일은 선택 불가
  var key=holeYear+'-'+holeMonth+'-'+d;
  var mode = document.querySelector('input[name="holeType"]:checked').value;
  if(mode==='holiday'){
    // 토글
    if(holeHolidays[key]==='holiday') delete holeHolidays[key];
    else { delete holeHolidays[key]; holeHolidays[key]='holiday'; }
    renderHoleCal();
  } else {
    // 특별 근무일 → 시간 등록 팝업
    holeCurrentSpecialDay = d;
    var dt = new Date(holeYear,holeMonth,d);
    var dayStr = holeYear+'-'+String(holeMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')+' ('+holeDayNames[dt.getDay()]+')';
    document.getElementById('swmDate').textContent = dayStr;
    document.getElementById('swmTimeBody').innerHTML = '';
    openTimeReg();
  }
}
// 특별 근무일 설정
function openSpecialWorkday(){
  document.getElementById('specialWorkdayModal').classList.add('show');
}
function closeSpecialWorkday(){
  document.getElementById('specialWorkdayModal').classList.remove('show');
}
function saveSpecialWorkday(){
  if(holeCurrentSpecialDay!==null){
    var key=holeYear+'-'+holeMonth+'-'+holeCurrentSpecialDay;
    holeHolidays[key]='special';
    renderHoleCal();
  }
  closeSpecialWorkday();
}
// 예약 가능 시간 등록
function openTimeReg(){
  document.getElementById('timeRegModal').classList.add('show');
}
function closeTimeReg(){
  document.getElementById('timeRegModal').classList.remove('show');
}
function confirmTimeReg(){
  var start = document.getElementById('trmStartTime').value;
  var end = document.getElementById('trmEndTime').value;
  closeTimeReg();
  // 특별 근무일 설정 모달에 시간 추가
  var tbody = document.getElementById('swmTimeBody');
  tbody.innerHTML = '<tr><td>'+start+'</td><td>'+end+'</td><td><button class="swm-edit-btn" onclick="openTimeReg()">수정</button></td></tr>';
  openSpecialWorkday();
}

function openTempSaveModal(){ document.getElementById("tempSaveModal").classList.add("show"); }
function closeTempSaveModal(){ document.getElementById("tempSaveModal").classList.remove("show"); }
function openDetailSendModal(){ document.getElementById("detailSendModal").classList.add("show"); }
function closeDetailSendModal(){ document.getElementById("detailSendModal").classList.remove("show"); }
function openTempSaveItem() { /* 영업 화면 제거됨 */ }
function reopenTempSaleReg() {}
function deleteTempSave() {}
function doTempSaveFromReg() {}
function showTempOpenBtn() {}
function addTempIconToAppt() {}

// ── 메가메뉴 위치 조정 (화면 밖 넘침 방지) ──
document.querySelectorAll('.gnb-item.has-menu').forEach(function(item) {
  item.addEventListener('mouseenter', function() {
    var menu = this.querySelector('.mega-menu');
    if (!menu) return;
    // 초기화
    menu.style.left = '0';
    menu.style.right = 'auto';
    // 렌더 후 위치 확인
    requestAnimationFrame(function() {
      var rect = menu.getBoundingClientRect();
      var vw = window.innerWidth;
      if (rect.right > vw - 8) {
        // 우측 넘침 → 우측 정렬
        menu.style.left = 'auto';
        menu.style.right = '0';
        // 그래도 넘치면 뷰포트 기준 조정
        var rect2 = menu.getBoundingClientRect();
        if (rect2.left < 8) {
          menu.style.right = 'auto';
          menu.style.left = (-rect2.left + 8) + 'px';
        }
      }
    });
  });
});

// ── KR/EN 언어 토글 ──

// ── GNB 메가메뉴 화면 밖 넘침 방지 ──
document.querySelectorAll('.gnb-item.has-menu').forEach(function(item) {
  item.addEventListener('mouseenter', function() {
    var menu = this.querySelector('.mega-menu');
    if (!menu) return;
    // 초기화
    menu.style.left = '0';
    menu.style.right = 'auto';
    // 표시 후 위치 확인
    requestAnimationFrame(function() {
      var menuRect = menu.getBoundingClientRect();
      var itemRect = item.getBoundingClientRect();
      if (menuRect.right > window.innerWidth - 8) {
        // GNB 아이템 중앙 기준으로 메가메뉴 배치
        var itemCenter = itemRect.left + itemRect.width / 2;
        var menuHalf = menuRect.width / 2;
        var newLeft = itemCenter - menuHalf - itemRect.left;
        // 화면 좌측 넘침 방지
        var absLeft = itemRect.left + newLeft;
        if (absLeft < 8) newLeft = -itemRect.left + 8;
        // 화면 우측 넘침 방지
        var absRight = itemRect.left + newLeft + menuRect.width;
        if (absRight > window.innerWidth - 8) newLeft -= (absRight - window.innerWidth + 8);
        menu.style.left = newLeft + 'px';
        menu.style.right = 'auto';
      }
    });
  });
});
function toggleLang() {
  currentLang = currentLang === 'ko' ? 'en' : 'ko';
  document.getElementById('langKr').classList.toggle('active', currentLang === 'ko');
  document.getElementById('langEn').classList.toggle('active', currentLang === 'en');
  applyLang();
}
function applyLang() {
  // data-ko / data-en 속성이 있는 모든 요소
  document.querySelectorAll('[data-ko][data-en]').forEach(function(el) {
    var text = currentLang === 'ko' ? el.dataset.ko : el.dataset.en;
    // gnb-item has-menu: 텍스트 노드만 교체 (자식 mega-menu 유지)
    if (el.classList.contains('gnb-item') && el.classList.contains('has-menu')) {
      el.childNodes.forEach(function(node) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          node.textContent = text + '\n    ';
        }
      });
    } else if (el.classList.contains('gnb-item') || el.classList.contains('nav-text-btn') || el.classList.contains('gnb-dashboard') || el.classList.contains('mega-col-title')) {
      // 자식 없는 단순 요소
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        el.textContent = text;
      } else {
        // 첫 텍스트 노드만 교체
        el.childNodes.forEach(function(node) {
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = text;
            return;
          }
        });
      }
    } else if (el.tagName === 'BUTTON' && el.querySelector('svg')) {
      // nav-btn (영업/예약) - SVG 뒤 텍스트
      var svg = el.querySelector('svg');
      var textNode = svg.nextSibling;
      if (textNode && textNode.nodeType === 3) {
        textNode.textContent = '\n        ' + text + '\n      ';
      }
    } else {
      // 자식 중에 data-ko가 있으면 건너뜀 (자식이 개별 번역됨)
      if (el.querySelector('[data-ko]')) return;
      el.textContent = text;
    }
  });
  // data-tooltip 속성 번역
  document.querySelectorAll('[data-i18n-tooltip-ko][data-i18n-tooltip-en]').forEach(function(el) {
    el.setAttribute('data-tooltip', currentLang === 'ko' ? el.getAttribute('data-i18n-tooltip-ko') : el.getAttribute('data-i18n-tooltip-en'));
  });
  // title 속성 번역
  document.querySelectorAll('[data-i18n-title-ko][data-i18n-title-en]').forEach(function(el) {
    el.title = currentLang === 'ko' ? el.getAttribute('data-i18n-title-ko') : el.getAttribute('data-i18n-title-en');
  });
  // 캘린더 그리드 재렌더 (날짜/요일 반영)
  if (typeof showDefaultView === 'function' && document.getElementById('appBody').style.display !== 'none') {
    try { showDefaultView(); } catch(e) {}
  }
  // placeholder 번역
  document.querySelectorAll('[data-i18n-ph-ko][data-i18n-ph-en]').forEach(function(el) {
    el.placeholder = currentLang === 'ko' ? el.getAttribute('data-i18n-ph-ko') : el.getAttribute('data-i18n-ph-en');
  });
  // 툴팁 (CSS ::after)
  var style = document.getElementById('langTooltipStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'langTooltipStyle';
    document.head.appendChild(style);
  }
  if (currentLang === 'en') {
    style.textContent = '';
  } else {
    style.textContent = '';
  }
  // 공지 드롭다운 헤더
  var nddHeader = document.querySelector('.notice-dd-header > span:first-child');
  if (nddHeader) nddHeader.textContent = currentLang === 'ko' ? '공지사항' : 'Notices';
  var nddMark = document.querySelector('.notice-dd-mark');
  if (nddMark) nddMark.textContent = currentLang === 'ko' ? '모두 읽음' : 'Mark all read';
  var nddFooter = document.querySelector('.notice-dd-footer a');
  if (nddFooter) nddFooter.textContent = currentLang === 'ko' ? '전체 보기' : 'View All';
  // 페이지 풋터
  document.querySelectorAll('.page-footer').forEach(function(f) {
    if (currentLang === 'en') {
      if (!f.dataset.koHtml) f.dataset.koHtml = f.innerHTML;
      f.innerHTML = 'Copyright\u00A92005 by AHASOFT All Rights Reserved.';
    } else {
      if (f.dataset.koHtml) f.innerHTML = f.dataset.koHtml;
    }
  });
  // select option 번역 (data-ko/data-en 기반)
  document.querySelectorAll('select option[data-ko][data-en]').forEach(function(opt) {
    opt.textContent = currentLang === 'ko' ? opt.dataset.ko : opt.dataset.en;
  });
  // 항목별 매출 카테고리 데이터 셀 번역
  var catMap = {'속눈썹':'Eyelash','추가':'Add-on','Eyelash':'속눈썹','Add-on':'추가'};
  document.querySelectorAll('#rvSvcTable td, #rvTktTable td').forEach(function(td) {
    var t = td.textContent.trim();
    if (currentLang === 'en' && catMap[t] && !td.classList.contains('svc-detail-col') && !td.classList.contains('tkt-detail-col')) {
      td.textContent = catMap[t];
    } else if (currentLang === 'ko' && catMap[t] && !td.classList.contains('svc-detail-col') && !td.classList.contains('tkt-detail-col')) {
      td.textContent = catMap[t];
    }
  });
  // 서비스 상세 컬럼 번역
  var svcDetailMap = {'속눈썹 리터치':'Eyelash Retouch','래핑':'Wrapping','젤패디 그라데이션':'Gel Pedi Gradation','젤패디 칼라':'Gel Pedi Color',
    'Eyelash Retouch':'속눈썹 리터치','Wrapping':'래핑','Gel Pedi Gradation':'젤패디 그라데이션','Gel Pedi Color':'젤패디 칼라'};
  document.querySelectorAll('#rvSvcTable .svc-detail-col').forEach(function(td) {
    if (td.tagName === 'TH') return;
    var t = td.textContent.trim();
    if (svcDetailMap[t]) td.textContent = svcDetailMap[t];
  });
  // 공지 버블 — 다음 표시 시 영문 적용
  var bubble = document.getElementById('noticeBubble');
  if (bubble && bubble.classList.contains('show')) {
    showNoticeBubble();
  }
  // 기타 코드 뷰 열려있으면 리렌더
  var otcView = document.getElementById('otherCodeSetupView');
  if (otcView && otcView.classList.contains('show')) {
    otcRenderCatList();
    otcRenderItems();
  }
}

// ══ [FEAT-PRODUCT-SETUP] 제품 설정 ══
var prdData = pkgProductData; // 패키지 제품탭과 공유
var prdCats = ['판매'];       // 제품 분류 목록
var prdCodeMode = 'auto';     // 'auto' | 'manual'
var prdEditIdx = -1;

function openProductSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('productSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  prdSyncCats();
  prdRenderTable(prdData);
  if (currentLang === 'en') applyLang();
}

function closeProductSetup() {
  document.getElementById('productSetupView').classList.remove('show');
  showReservationView();
}

// ══ [FEAT-PRODUCTCAT-SETUP] 제품 분류 설정 ══
var prdCatData = [{ name: '판매', inactive: false }]; // 제품 분류 목록
var prdcatEditIdx = -1;

function openProductCatSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  prdcatRender();
  if (currentLang === 'en') applyLang();
}

function closeProductCatSetup() {
  document.getElementById('productCatSetupView').classList.remove('show');
  showReservationView();
}

function prdcatRender() {
  var tbody = document.getElementById('prdcatTbody');
  if (!tbody) return;
  var showUnused = document.getElementById('prdcatShowUnused') && document.getElementById('prdcatShowUnused').checked;
  if (!prdCatData.length) {
    tbody.innerHTML = '<tr class="prdcat-empty"><td colspan="3"><span data-ko="내역이 없습니다" data-en="No items found">내역이 없습니다</span></td></tr>';
    if (currentLang === 'en') applyLang();
    return;
  }
  var editTxt = currentLang === 'en' ? 'Edit' : '수정';
  var html = '';
  prdCatData.forEach(function(cat, i) {
    var rowClass = cat.inactive ? ('prdcat-unused-row' + (showUnused ? ' prdcat-show' : '')) : '';
    html += '<tr draggable="true" data-prdcat-idx="' + i + '"' + (rowClass ? ' class="' + rowClass + '"' : '') + '>'
      + '<td class="prdcat-drag-col"><span class="prdcat-drag-handle"></span></td>'
      + '<td>' + cat.name + (cat.inactive ? ' <span style="font-size:11px;color:#BDBDBD;">[' + (currentLang === 'en' ? 'Inactive' : '미사용') + ']</span>' : '') + '</td>'
      + '<td><button class="prdcat-edit-btn" onclick="prdcatOpenEdit(' + i + ')" data-ko="수정" data-en="Edit">' + editTxt + '</button></td>'
      + '</tr>';
  });
  tbody.innerHTML = html;
  prdcatInitDrag();
  if (currentLang === 'en') applyLang();
}

function prdcatToggleUnused(checked) {
  document.querySelectorAll('#prdcatTbody .prdcat-unused-row').forEach(function(tr) {
    tr.classList.toggle('prdcat-show', checked);
  });
}

function prdcatOpenReg() {
  prdcatEditIdx = -1;
  document.getElementById('prdcatModalTitle').textContent = currentLang === 'en' ? 'Add Category' : '분류 등록';
  document.getElementById('prdcatNameInput').value = '';
  document.getElementById('prdcatStatusRow').style.display = 'none';
  document.getElementById('prdcatDeleteBtn').style.display = 'none';
  var prdcatEl2 = document.getElementById('prdcatNameInput'); if (prdcatEl2) prdcatEl2.style.borderColor = '';
  document.getElementById('prdcatModal').classList.add('show');
  setTimeout(function(){ document.getElementById('prdcatNameInput').focus(); }, 50);
}

function prdcatOpenEdit(idx) {
  var cat = prdCatData[idx];
  if (!cat) return;
  prdcatEditIdx = idx;
  document.getElementById('prdcatModalTitle').textContent = currentLang === 'en' ? 'Edit Category' : '분류 수정';
  document.getElementById('prdcatNameInput').value = cat.name;
  var toggle = document.getElementById('prdcatStatusToggle');
  toggle.checked = !cat.inactive;
  document.getElementById('prdcatStatusLabel').textContent = !cat.inactive ? (currentLang === 'en' ? 'Active' : '사용') : (currentLang === 'en' ? 'Inactive' : '미사용');
  document.getElementById('prdcatStatusRow').style.display = 'flex';
  document.getElementById('prdcatDeleteBtn').style.display = '';
  var prdcatEl3 = document.getElementById('prdcatNameInput'); if (prdcatEl3) prdcatEl3.style.borderColor = '';
  document.getElementById('prdcatModal').classList.add('show');
  setTimeout(function(){ document.getElementById('prdcatNameInput').focus(); }, 50);
}

function prdcatCloseModal() {
  document.getElementById('prdcatModal').classList.remove('show');
}

function prdcatSave() {
  var name = (document.getElementById('prdcatNameInput').value || '').trim();
  var prdcatNameEl = document.getElementById('prdcatNameInput');
  if (prdcatNameEl) prdcatNameEl.style.borderColor = '';
  if (!name) { if (prdcatNameEl) prdcatNameEl.style.borderColor = '#F06060'; return; }
  if (prdcatEditIdx >= 0) {
    var inactive = !document.getElementById('prdcatStatusToggle').checked;
    prdCatData[prdcatEditIdx].name = name;
    prdCatData[prdcatEditIdx].inactive = inactive;
  } else {
    prdCatData.push({ name: name, inactive: false });
  }
  // prdCats 동기화 (제품 페이지 분류 목록과 공유)
  prdcatSyncToPrdCats();
  prdcatCloseModal();
  prdcatRender();
}

function prdcatDelete() {
  if (prdcatEditIdx < 0) return;
  var cat = prdCatData[prdcatEditIdx];
  var msg = currentLang === 'en'
    ? 'Delete category "' + cat.name + '"?'
    : '"' + cat.name + '" 분류를 삭제하시겠습니까?';
  if (!confirm(msg)) return;
  prdCatData.splice(prdcatEditIdx, 1);
  prdcatSyncToPrdCats();
  prdcatCloseModal();
  prdcatRender();
}

function prdcatSyncToPrdCats() {
  // 활성 분류만 prdCats에 반영
  prdCats.length = 0;
  prdCatData.forEach(function(c) { if (!c.inactive) prdCats.push(c.name); });
  prdSyncCats();
}

var _prdcatDragInited = false;
var _prdcatDraggedRow = null;

function prdcatInitDrag() {
  var tbody = document.getElementById('prdcatTbody');
  if (!tbody) return;
  _prdcatDragInited = false;
  _prdcatDraggedRow = null;
  tbody.querySelectorAll('tr[data-prdcat-idx]').forEach(function(row) {
    row.addEventListener('dragstart', function(e) { _prdcatDraggedRow = row; row.style.opacity = '0.4'; });
    row.addEventListener('dragend', function() { row.style.opacity = ''; _prdcatDraggedRow = null; });
    row.addEventListener('dragover', function(e) { e.preventDefault(); });
    row.addEventListener('drop', function(e) {
      e.preventDefault();
      if (!_prdcatDraggedRow || _prdcatDraggedRow === row) return;
      var fromIdx = parseInt(_prdcatDraggedRow.dataset.prdcatIdx);
      var toIdx = parseInt(row.dataset.prdcatIdx);
      if (isNaN(fromIdx) || isNaN(toIdx)) return;
      var moved = prdCatData.splice(fromIdx, 1)[0];
      prdCatData.splice(toIdx, 0, moved);
      prdcatSyncToPrdCats();
      prdcatRender();
    });
  });
}
// ══ [FEAT-PRODUCTCAT-SETUP] END ══

function prdSyncCats() {
  // prdData에서 분류 동기화
  prdData.forEach(function(p) { if (p.cat && prdCats.indexOf(p.cat) < 0) prdCats.push(p.cat); });
  // 필터 셀렉트 업데이트
  var filterSel = document.getElementById('prdFilterCat');
  if (filterSel) {
    var prev = filterSel.value;
    filterSel.innerHTML = '<option value="">' + (currentLang === 'en' ? 'All' : '전체') + '</option>';
    prdCats.forEach(function(c) { filterSel.innerHTML += '<option value="' + c + '">' + c + '</option>'; });
    filterSel.value = prev;
  }
}

function prdRenderTable(list) {
  var tbody = document.getElementById('prdTbody');
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="prd-empty">' + (currentLang === 'en' ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
    document.getElementById('prdCountNum').textContent = '0';
    return;
  }
  var active = list.filter(function(p) { return !p.inactive; });
  document.getElementById('prdCountNum').textContent = active.length;
  tbody.innerHTML = list.map(function(p, i) {
    var realIdx = prdData.indexOf(p);
    var usageArr = [];
    if (p.usageSale) usageArr.push(currentLang === 'en' ? 'Sales' : '판매');
    if (p.usageInternal) usageArr.push(currentLang === 'en' ? 'Internal Use' : '내수');
    var usageStr = usageArr.join('/') || '-';
    var inactiveCls = p.inactive ? ' prd-inactive' : '';
    return '<tr class="' + inactiveCls + '">'
      + '<td><input type="checkbox" class="prd-row-chk" data-prd-idx="' + realIdx + '" onchange="prdUpdateBulkBtns()"></td>'
      + '<td>' + (p.cat || '-') + '</td>'
      + '<td>' + (p.code || '-') + '</td>'
      + '<td>' + (p.name || '') + '</td>'
      + '<td>' + (p.spec || '') + '</td>'
      + '<td>' + Number(p.buyPrice || 0).toLocaleString() + '</td>'
      + '<td>' + Number(p.price || 0).toLocaleString() + '</td>'
      + '<td style="white-space:nowrap;">' + usageStr + '</td>'
      + '<td><button class="prd-edit-btn" data-ko="수정" data-en="Edit" onclick="prdOpenEdit(' + realIdx + ')">' + (currentLang === 'en' ? 'Edit' : '수정') + '</button></td>'
      + '</tr>';
  }).join('');
  document.getElementById('prdChkAll').checked = false;
}

function prdSearch() {
  var cat = (document.getElementById('prdFilterCat') || {}).value || '';
  var q = ((document.getElementById('prdFilterQ') || {}).value || '').trim().toLowerCase();
  var showInactive = (document.getElementById('prdShowUnused') || {}).checked;
  var result = prdData.filter(function(p) {
    if (!showInactive && p.inactive) return false;
    if (cat && p.cat !== cat) return false;
    if (q && !((p.code||'').toLowerCase().includes(q) || (p.name||'').toLowerCase().includes(q) || (p.barcode||'').toLowerCase().includes(q))) return false;
    return true;
  });
  prdRenderTable(result);
  prdUpdateBulkBtns(); // 재렌더 후 버튼 상태 초기화
}

function prdToggleUnused(checked) {
  prdSearch();
}

function prdSelectAll(checked) {
  document.querySelectorAll('#prdTbody .prd-row-chk').forEach(function(c) { c.checked = checked; });
  prdUpdateBulkBtns();
}

function prdUpdateBulkBtns() {
  var checked = document.querySelectorAll('#prdTbody .prd-row-chk:checked');
  var hasActive = false, hasInactive = false;
  checked.forEach(function(c) {
    var idx = parseInt(c.dataset.prdIdx);
    if (!isNaN(idx) && prdData[idx]) {
      if (prdData[idx].inactive) hasInactive = true;
      else hasActive = true;
    }
  });
  var enableBtn  = document.querySelector('.prd-bulk-btn[onclick*="true"]');
  var disableBtn = document.querySelector('.prd-bulk-btn[onclick*="false"]');
  if (enableBtn)  enableBtn.classList.toggle('active', hasInactive);
  if (disableBtn) disableBtn.classList.toggle('active', hasActive);
  // 전체 선택 체크박스 indeterminate 처리
  var allChk = document.getElementById('prdChkAll');
  if (allChk) {
    var total = document.querySelectorAll('#prdTbody .prd-row-chk').length;
    allChk.indeterminate = checked.length > 0 && checked.length < total;
    if (checked.length === total && total > 0) allChk.checked = true;
    else if (checked.length === 0) allChk.checked = false;
  }
}

function prdBulkStatus(active) {
  var btn = document.querySelector('.prd-bulk-btn[onclick*="' + active + '"]');
  if (btn && !btn.classList.contains('active')) return;
  var checked = document.querySelectorAll('#prdTbody .prd-row-chk:checked');
  if (!checked.length) return;
  checked.forEach(function(c) {
    var idx = parseInt(c.dataset.prdIdx);
    if (!isNaN(idx) && prdData[idx]) {
      // active=true(사용 처리)면 inactive인 것만, active=false(미사용 처리)면 active인 것만 변경
      if (active && prdData[idx].inactive) prdData[idx].inactive = false;
      else if (!active && !prdData[idx].inactive) prdData[idx].inactive = true;
    }
  });
  prdSearch();
}

// ── 등록/수정 모달 ──
function prdNextCode() {
  if (prdCodeMode !== 'auto') return '';
  var nums = prdData.map(function(p) { return parseInt(p.code); }).filter(function(n) { return !isNaN(n); });
  return nums.length ? String(Math.max.apply(null, nums) + 1) : '100001';
}

function prdOpenReg() {
  prdEditIdx = -1;
  document.getElementById('prdModalTitle').textContent = currentLang === 'en' ? 'Add Product' : '제품등록';
  document.getElementById('prdCode').value = prdNextCode();
  document.getElementById('prdCode').disabled = (prdCodeMode === 'auto');
  document.getElementById('prdCatSel').innerHTML = '<option value="">' + (currentLang === 'en' ? 'Select' : '선택') + '</option>'
    + prdCats.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
  document.getElementById('prdName').value = '';
  document.getElementById('prdBarcode').value = '';
  document.getElementById('prdBarcode').disabled = false;
  document.getElementById('prdBarcodeSync').checked = false;
  document.getElementById('prdSpec').value = '';
  document.getElementById('prdBuyPrice').value = 0;
  document.getElementById('prdSellPrice').value = 0;
  document.getElementById('prdUsageSale').checked = true;
  document.getElementById('prdUsageInternal').checked = true;
  document.getElementById('prdMemo').value = '';
  document.getElementById('prdStatusToggle').checked = true;
  document.getElementById('prdStatusLabel').textContent = currentLang === 'en' ? 'Active' : '사용';
  ['prdCode','prdCatSel','prdName'].forEach(function(id) { var el = document.getElementById(id); if (el) el.style.borderColor = ''; });
  document.getElementById('prdRegModal').classList.add('show');
}

function prdOpenEdit(idx) {
  var p = prdData[idx];
  if (!p) return;
  prdEditIdx = idx;
  document.getElementById('prdModalTitle').textContent = currentLang === 'en' ? 'Edit Product' : '제품수정';
  document.getElementById('prdCode').value = p.code || '';
  document.getElementById('prdCode').disabled = (prdCodeMode === 'auto');
  document.getElementById('prdCatSel').innerHTML = '<option value="">' + (currentLang === 'en' ? 'Select' : '선택') + '</option>'
    + prdCats.map(function(c) { return '<option value="' + c + '"' + (p.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
  document.getElementById('prdName').value = p.name || '';
  var isSynced = p.barcode && p.code && p.barcode === p.code;
  document.getElementById('prdBarcodeSync').checked = isSynced;
  document.getElementById('prdBarcode').value = p.barcode || '';
  document.getElementById('prdBarcode').disabled = isSynced;
  document.getElementById('prdSpec').value = p.spec || '';
  document.getElementById('prdBuyPrice').value = formatMoney(p.buyPrice || 0);
  document.getElementById('prdSellPrice').value = formatMoney(p.price || 0);
  document.getElementById('prdUsageSale').checked = p.usageSale !== false;
  document.getElementById('prdUsageInternal').checked = !!p.usageInternal;
  document.getElementById('prdMemo').value = p.memo || '';
  document.getElementById('prdStatusToggle').checked = !p.inactive;
  document.getElementById('prdStatusLabel').textContent = (!p.inactive) ? (currentLang === 'en' ? 'Active' : '사용') : (currentLang === 'en' ? 'Inactive' : '미사용');
  ['prdCode','prdCatSel','prdName'].forEach(function(id) { var el = document.getElementById(id); if (el) el.style.borderColor = ''; });
  document.getElementById('prdRegModal').classList.add('show');
}

function prdCloseModal() {
  document.getElementById('prdRegModal').classList.remove('show');
}

function prdToggleBarcodeSync(checked) {
  var codeEl = document.getElementById('prdCode');
  var barcodeEl = document.getElementById('prdBarcode');
  if (checked) { barcodeEl.value = codeEl.value; barcodeEl.disabled = true; }
  else barcodeEl.disabled = false;
}

function prdSave() {
  var code = (document.getElementById('prdCode').value || '').trim();
  var cat  = document.getElementById('prdCatSel').value;
  var name = (document.getElementById('prdName').value || '').trim();
  var prdCodeEl = document.getElementById('prdCode');
  var prdCatEl  = document.getElementById('prdCatSel');
  var prdNameEl = document.getElementById('prdName');
  [prdCodeEl, prdCatEl, prdNameEl].forEach(function(el) { if (el) el.style.borderColor = ''; });
  var valid = true;
  if (!code) { if (prdCodeEl) prdCodeEl.style.borderColor = '#F06060'; valid = false; }
  if (!cat)  { if (prdCatEl)  prdCatEl.style.borderColor  = '#F06060'; valid = false; }
  if (!name) { if (prdNameEl) prdNameEl.style.borderColor = '#F06060'; valid = false; }
  if (!valid) return;
  var barcodeSync = document.getElementById('prdBarcodeSync').checked;
  var obj = {
    code: code,
    cat: cat,
    name: name,
    barcode: barcodeSync ? code : (document.getElementById('prdBarcode').value || ''),
    spec: document.getElementById('prdSpec').value || '',
    buyPrice: parseMoney(document.getElementById('prdBuyPrice').value),
    price: parseMoney(document.getElementById('prdSellPrice').value),
    usageSale: document.getElementById('prdUsageSale').checked,
    usageInternal: document.getElementById('prdUsageInternal').checked,
    memo: document.getElementById('prdMemo').value || '',
    inactive: !document.getElementById('prdStatusToggle').checked
  };
  if (prdEditIdx >= 0) {
    prdData[prdEditIdx] = obj;
  } else {
    prdData.push(obj);
  }
  if (cat && prdCats.indexOf(cat) < 0) prdCats.push(cat);
  prdCloseModal();
  prdSyncCats();
  prdSearch();
}

// ── 분류 등록 모달 ──
function prdOpenCatModal() {
  document.getElementById('prdCatName').value = '';
  var prdCatNameEl2 = document.getElementById('prdCatName'); if (prdCatNameEl2) prdCatNameEl2.style.borderColor = '';
  document.getElementById('prdCatModal').classList.add('show');
}
function prdCloseCatModal() {
  document.getElementById('prdCatModal').classList.remove('show');
}
function prdSaveCat() {
  var name = (document.getElementById('prdCatName').value || '').trim();
  var prdCatNameEl = document.getElementById('prdCatName');
  if (prdCatNameEl) prdCatNameEl.style.borderColor = '';
  if (!name) { if (prdCatNameEl) prdCatNameEl.style.borderColor = '#F06060'; return; }
  if (prdCats.indexOf(name) < 0) prdCats.push(name);
  // 등록 모달 셀렉트 업데이트 후 선택
  var sel = document.getElementById('prdCatSel');
  if (sel && !sel.querySelector('option[value="' + name + '"]')) {
    var opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  }
  if (sel) sel.value = name;
  prdSyncCats();
  prdCloseCatModal();
}

// ── 제품코드 설정 모달 ──
function prdOpenCodeModal() {
  document.getElementById(prdCodeMode === 'auto' ? 'prdCodeAuto' : 'prdCodeManual').checked = true;
  document.getElementById('prdCodeModal').classList.add('show');
}
function prdCloseCodeModal() {
  document.getElementById('prdCodeModal').classList.remove('show');
}
function prdSaveCodeModal() {
  prdCodeMode = document.querySelector('input[name="prdCodeMode"]:checked').value;
  var codeEl = document.getElementById('prdCode');
  if (codeEl) {
    codeEl.disabled = (prdCodeMode === 'auto');
    if (prdCodeMode === 'auto') codeEl.value = prdNextCode();
  }
  prdCloseCodeModal();
}

// ── 엑셀 다운로드 ──
function prdExcelDownload() {
  var header = ['제품코드', '제품명', '분류', '바코드', '규격', '입고가', '판매가', '판매', '내수', '상태', '메모'];
  var rows = prdData.map(function(p) {
    return [p.code||'', p.name||'', p.cat||'', p.barcode||'', p.spec||'', p.buyPrice||0, p.price||0,
      p.usageSale ? 'O' : '', p.usageInternal ? 'O' : '', p.inactive ? '미사용' : '사용', p.memo||''];
  });
  var now = new Date();
  var pad = function(n) { return n < 10 ? '0' + n : n; };
  var ts = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + '_' + pad(now.getMinutes()) + '_' + pad(now.getSeconds());
  var filename = '제품 (' + ts + ').xlsx';
  // Build simple xlsx via XML
  var xmlHeader = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'
    + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
    + ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
    + '<Worksheet ss:Name="제품"><Table>';
  var xmlRows = '';
  // Header row
  xmlRows += '<Row>' + header.map(function(h) { return '<Cell><Data ss:Type="String">' + h + '</Data></Cell>'; }).join('') + '</Row>';
  // Data rows
  rows.forEach(function(r) {
    xmlRows += '<Row>' + r.map(function(v) {
      var type = typeof v === 'number' ? 'Number' : 'String';
      return '<Cell><Data ss:Type="' + type + '">' + String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</Data></Cell>';
    }).join('') + '</Row>';
  });
  // Timestamp row
  xmlRows += '<Row><Cell/><Cell/><Cell/><Cell/><Cell/><Cell/><Cell/><Cell/><Cell/><Cell/>'
    + '<Cell><Data ss:Type="String" ss:StyleID="s1">' + now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate())
    + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</Data></Cell></Row>';
  var xmlFooter = '</Table></Worksheet></Workbook>';
  var blob = new Blob([xmlHeader + xmlRows + xmlFooter], { type: 'application/vnd.ms-excel' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// ══ [FEAT-PRODUCT-SETUP] END ══

function openPackageSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('packageSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  var body = document.querySelector('#packageSetupView .pkg-body');
  if (body) body.scrollTop = 0;
  pkgRenderTable();
  if (currentLang === 'en') applyLang();
}

function closePackageSetup() {
  document.getElementById('packageSetupView').classList.remove('show');
  showReservationView();
}

function pkgOpenReg() {
  pkgEditIdx = -1;
  document.getElementById('pkgModalTitle').textContent = currentLang === 'en' ? 'Add Package' : '패키지 등록';
  pkgCurrentItems = [];
  pkgCurrentSvcCat = null;
  // pkgCurrentTktCat은 리셋하지 않음 — svSaveTicket()에서 저장한 분류 유지
  document.getElementById('pkgNameInput').value = '';
  var st = document.getElementById('pkgStatusToggle');
  st.checked = true;
  document.getElementById('pkgStatusLabel').textContent = currentLang === 'en' ? 'Active' : '사용';
  var pkgNameEl2 = document.getElementById('pkgNameInput'); if (pkgNameEl2) pkgNameEl2.style.borderColor = '';
  document.getElementById('pkgPpWarning').style.display = 'none';
  pkgSelectTab('service');
  pkgUpdateItemsTable();
  document.getElementById('pkgDeleteBtn').style.display = 'none';
  document.getElementById('pkgRegModal').classList.add('show');
}

function pkgOpenEdit(idx) {
  var p = pkgData[idx];
  if (!p) return;
  pkgEditIdx = idx;
  document.getElementById('pkgModalTitle').textContent = currentLang === 'en' ? 'Edit Package' : '패키지 수정';
  pkgCurrentItems = p.items.map(function(it) { return { type:it.type, name:it.name, price:it.price }; });
  pkgCurrentSvcCat = null;
  // pkgCurrentTktCat은 리셋하지 않음 — 마지막 분류 유지
  document.getElementById('pkgNameInput').value = p.name;
  var st = document.getElementById('pkgStatusToggle');
  st.checked = !p.unused;
  document.getElementById('pkgStatusLabel').textContent = st.checked ? (currentLang === 'en' ? 'Active' : '사용') : (currentLang === 'en' ? 'Inactive' : '미사용');
  var pkgNameEl3 = document.getElementById('pkgNameInput'); if (pkgNameEl3) pkgNameEl3.style.borderColor = '';
  document.getElementById('pkgPpWarning').style.display = 'none';
  pkgSelectTab('service');
  pkgUpdateItemsTable();
  document.getElementById('pkgDeleteBtn').style.display = '';
  document.getElementById('pkgRegModal').classList.add('show');
}

function pkgDelete() {
  if (pkgEditIdx < 0) return;
  var msg = currentLang === 'en' ? 'Delete this package?' : '이 패키지를 삭제하시겠습니까?';
  if (!confirm(msg)) return;
  pkgData.splice(pkgEditIdx, 1);
  pkgRenderTable();
  pkgCloseModal();
}

function pkgCloseModal() {
  document.getElementById('pkgRegModal').classList.remove('show');
}

function pkgSelectTab(tab) {
  pkgCurrentTab = tab;
  var tabNames = ['Service','Product','Prepaid','Ticket'];
  tabNames.forEach(function(t) {
    var pane = document.getElementById('pkgPane' + t);
    var btn = document.getElementById('pkgTabBtn' + t);
    var match = (t.toLowerCase() === tab);
    if (pane) pane.classList.toggle('active', match);
    if (btn) btn.classList.toggle('active', match);
  });
  if (tab === 'service') pkgLoadServiceTab();
  else if (tab === 'product') pkgLoadProductTab();
  else if (tab === 'prepaid') pkgLoadPrepaidTab();
  else if (tab === 'ticket') pkgLoadTicketTab();
}

function pkgLoadServiceTab() {
  var cats = Object.keys(svServiceData);
  if (!pkgCurrentSvcCat && cats.length > 0) pkgCurrentSvcCat = cats[0];
  var catList = document.getElementById('pkgSvcCatList');
  catList.innerHTML = cats.map(function(cat) {
    var cls = cat === pkgCurrentSvcCat ? ' pkm-item-active' : '';
    return '<div class="pkm-list-item' + cls + '" onclick="pkgSelectSvcCat(\'' + cat + '\')">' + cat + '</div>';
  }).join('');
  pkgLoadSvcItems();
}

function pkgSelectSvcCat(cat) {
  pkgCurrentSvcCat = cat;
  document.querySelectorAll('#pkgSvcCatList .pkm-list-item').forEach(function(el) {
    el.classList.toggle('pkm-item-active', el.textContent === cat);
  });
  pkgLoadSvcItems();
}

function pkgLoadSvcItems() {
  var svcs = (svServiceData[pkgCurrentSvcCat] || []).filter(function(s) { return !s.unused; });
  var itemList = document.getElementById('pkgSvcItemList');
  if (!svcs.length) { itemList.innerHTML = '<div class="pkm-list-empty">' + (currentLang === 'en' ? 'No items' : '내역이 없습니다') + '</div>'; return; }
  itemList.innerHTML = svcs.map(function(s) {
    var isAdded = pkgCurrentItems.some(function(it) { return it.type === 'service' && it.name === s.name; });
    return '<div class="pkm-list-item' + (isAdded ? ' pkm-item-active' : '') + '" onclick="pkgToggleService(\'' + s.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')">' + s.name + '</div>';
  }).join('');
}

function pkgToggleService(name) {
  var idx = -1;
  pkgCurrentItems.forEach(function(it, i) { if (it.type === 'service' && it.name === name) idx = i; });
  if (idx >= 0) pkgCurrentItems.splice(idx, 1);
  else { pkgNewItemIndex = pkgCurrentItems.length; pkgCurrentItems.push({ type:'service', name:name, price:0 }); }
  pkgLoadSvcItems();
  pkgUpdateItemsTable();
}

function pkgLoadProductTab() {
  var sel = document.getElementById('pkgPrdCatSel');
  // 카테고리 옵션 채우기 (최초 1회)
  if (sel && sel.options.length <= 1) {
    var cats = [];
    pkgProductData.forEach(function(p) { if (p.cat && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    cats.forEach(function(cat) {
      var opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      sel.appendChild(opt);
    });
  }
  var selectedCat = sel ? sel.value : '';
  var q = (document.getElementById('pkgPrdSearchInput').value || '').trim().toLowerCase();
  var allLabel = currentLang === 'en' ? 'Category' : '분류';
  var filtered = pkgProductData.filter(function(p) {
    var catMatch = !selectedCat || selectedCat === allLabel || p.cat === selectedCat;
    var qMatch = !q || p.code.toLowerCase().indexOf(q) >= 0 || p.name.toLowerCase().indexOf(q) >= 0;
    return catMatch && qMatch;
  });
  var itemList = document.getElementById('pkgPrdItemList');
  if (!filtered.length) { itemList.innerHTML = '<div class="pkm-list-empty">' + (currentLang === 'en' ? 'No items' : '내역이 없습니다') + '</div>'; return; }
  itemList.innerHTML = filtered.map(function(p) {
    var isAdded = pkgCurrentItems.some(function(it) { return it.type === 'product' && it.name === p.name; });
    return '<div class="pkm-prd-row' + (isAdded ? ' pkm-item-active' : '') + '" onclick="pkgToggleProduct(\'' + p.name.replace(/'/g,"\\'") + '\',' + p.price + ')">'
      + '<span>' + p.code + '</span><span>' + p.name + '</span></div>';
  }).join('');
}

function pkgSearchProduct() { pkgLoadProductTab(); }

function pkgToggleProduct(name, price) {
  var idx = -1;
  pkgCurrentItems.forEach(function(it, i) { if (it.type === 'product' && it.name === name) idx = i; });
  if (idx >= 0) pkgCurrentItems.splice(idx, 1);
  else { pkgNewItemIndex = pkgCurrentItems.length; pkgCurrentItems.push({ type:'product', name:name, price:price||0 }); }
  pkgLoadProductTab();
  pkgUpdateItemsTable();
}

function pkgLoadPrepaidTab() {
  var cards = ppCardData.filter(function(c) { return !c.unused; });
  var itemList = document.getElementById('pkgPpItemList');
  if (!cards.length) { itemList.innerHTML = '<div class="pkm-list-empty">' + (currentLang === 'en' ? 'No items' : '내역이 없습니다') + '</div>'; return; }
  itemList.innerHTML = cards.map(function(c) {
    var isAdded = pkgCurrentItems.some(function(it) { return it.type === 'prepaid' && it.name === c.name; });
    return '<div class="pkm-pp-item' + (isAdded ? ' pkm-item-active' : '') + '" onclick="pkgTogglePrepaid(\'' + c.name.replace(/'/g,"\\'") + '\',' + c.price + ')">' + c.name + '</div>';
  }).join('');
}

function pkgTogglePrepaid(name, price) {
  var warn = document.getElementById('pkgPpWarning');
  var idx = -1;
  pkgCurrentItems.forEach(function(it, i) { if (it.type === 'prepaid' && it.name === name) idx = i; });
  if (idx >= 0) {
    pkgCurrentItems.splice(idx, 1);
    warn.style.display = 'none';
  } else {
    var alreadyHas = pkgCurrentItems.some(function(it) { return it.type === 'prepaid'; });
    if (alreadyHas) {
      warn.style.display = 'block';
      return;
    }
    pkgNewItemIndex = pkgCurrentItems.length; pkgCurrentItems.push({ type:'prepaid', name:name, price:price||0 });
    warn.style.display = 'none';
  }
  pkgLoadPrepaidTab();
  pkgUpdateItemsTable();
}

function pkgLoadTicketTab() {
  var cats = Object.keys(pkgTicketData);
  // 현재 분류가 없거나 유효하지 않으면, 티켓이 있는 분류 우선 선택
  if (!pkgCurrentTktCat || !pkgTicketData[pkgCurrentTktCat]) {
    var first = cats.find(function(c) { return pkgTicketData[c] && pkgTicketData[c].length > 0; });
    pkgCurrentTktCat = first || (cats.length > 0 ? cats[0] : null);
  }
  var catList = document.getElementById('pkgTktCatList');
  catList.innerHTML = cats.map(function(cat) {
    var cls = cat === pkgCurrentTktCat ? ' pkm-item-active' : '';
    return '<div class="pkm-list-item' + cls + '" onclick="pkgSelectTktCat(\'' + cat + '\')">' + cat + '</div>';
  }).join('');
  pkgLoadTktItems();
}

function pkgSelectTktCat(cat) {
  pkgCurrentTktCat = cat;
  document.querySelectorAll('#pkgTktCatList .pkm-list-item').forEach(function(el) {
    el.classList.toggle('pkm-item-active', el.textContent === cat);
  });
  pkgLoadTktItems();
}

function pkgLoadTktItems() {
  var tickets = pkgTicketData[pkgCurrentTktCat] || [];
  var itemList = document.getElementById('pkgTktItemList');
  if (!tickets.length) { itemList.innerHTML = '<div class="pkm-list-empty">' + (currentLang === 'en' ? 'No items' : '내역이 없습니다') + '</div>'; return; }
  itemList.innerHTML = tickets.map(function(t) {
    var isAdded = pkgCurrentItems.some(function(it) { return it.type === 'ticket' && it.name === t.name; });
    return '<div class="pkm-list-item' + (isAdded ? ' pkm-item-active' : '') + '" onclick="pkgToggleTicket(\'' + t.name.replace(/'/g,"\\'") + '\',' + (t.price||0) + ')">' + t.name + '</div>';
  }).join('');
}

function pkgToggleTicket(name, price) {
  var idx = -1;
  pkgCurrentItems.forEach(function(it, i) { if (it.type === 'ticket' && it.name === name) idx = i; });
  if (idx >= 0) pkgCurrentItems.splice(idx, 1);
  else { pkgNewItemIndex = pkgCurrentItems.length; pkgCurrentItems.push({ type:'ticket', name:name, price:price||0 }); }
  pkgLoadTktItems();
  pkgUpdateItemsTable();
}

function pkgUpdateItemsTable() {
  var tbody = document.getElementById('pkgItemsTbody');
  if (!pkgCurrentItems.length) {
    tbody.innerHTML = '<tr class="pkg-items-empty"><td colspan="3">' + (currentLang === 'en' ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
    document.getElementById('pkgTotalDisplay').textContent = '0';
    return;
  }
  var newIdx = pkgNewItemIndex;
  pkgNewItemIndex = -1;
  tbody.innerHTML = pkgCurrentItems.map(function(it, i) {
    var rowClass = (i === newIdx) ? ' class="pkm-row-new"' : '';
    return '<tr' + rowClass + '><td class="pkm-item-name">' + it.name + '</td>'
      + '<td><input class="pkm-item-price" type="text" inputmode="numeric" value="' + formatMoney(it.price||0) + '" oninput="moneyInputFormat(this);pkgUpdateItemPrice(' + i + ',parseMoney(this.value))"></td>'
      + '<td><button class="pkm-item-del" onclick="pkgRemoveItem(' + i + ')" title="삭제">✕</button></td></tr>';
  }).join('');
  pkgRecalcTotal();
}

function pkgUpdateItemPrice(idx, val) {
  if (pkgCurrentItems[idx]) pkgCurrentItems[idx].price = (typeof val === 'number') ? val : (parseFloat(String(val).replace(/,/g,'')) || 0);
  pkgRecalcTotal();
}

function pkgRecalcTotal() {
  var total = pkgCurrentItems.reduce(function(s, it) { return s + (it.price||0); }, 0);
  document.getElementById('pkgTotalDisplay').textContent = total.toLocaleString();
}

function pkgRemoveItem(idx) {
  pkgCurrentItems.splice(idx, 1);
  pkgUpdateItemsTable();
  if (pkgCurrentTab === 'service') pkgLoadSvcItems();
  else if (pkgCurrentTab === 'product') pkgLoadProductTab();
  else if (pkgCurrentTab === 'prepaid') pkgLoadPrepaidTab();
  else if (pkgCurrentTab === 'ticket') pkgLoadTktItems();
}

function pkgSave() {
  var name = (document.getElementById('pkgNameInput').value || '').trim();
  var pkgNameEl = document.getElementById('pkgNameInput');
  if (pkgNameEl) pkgNameEl.style.borderColor = '';
  if (!name) { if (pkgNameEl) pkgNameEl.style.borderColor = '#F06060'; return; }
  var unused = !document.getElementById('pkgStatusToggle').checked;
  var total = pkgCurrentItems.reduce(function(s, it) { return s + (it.price||0); }, 0);
  var obj = { name:name, items:pkgCurrentItems.slice(), total:total, unused:unused };
  var savedIdx;
  if (pkgEditIdx >= 0) { pkgData[pkgEditIdx] = obj; savedIdx = pkgEditIdx; }
  else { pkgData.push(obj); savedIdx = pkgData.length - 1; }
  pkgRenderTable();
  pkgCloseModal();
  pkgOpenView(savedIdx);
}

function pkgRenderTable() {
  var tbody = document.getElementById('pkgTbody');
  var showUnused = document.getElementById('pkgShowUnused').checked;
  if (!pkgData.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="pkg-empty"><span data-ko="내역이 없습니다" data-en="No items found">내역이 없습니다</span></td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < pkgData.length; i++) {
    var p = pkgData[i];
    var trClass = p.unused ? (' class="pkg-unused' + (showUnused ? ' pkg-show' : '') + '"') : '';
    var editTxt = currentLang === 'en' ? 'Edit' : '수정';
    html += '<tr data-pkg-idx="' + i + '"' + trClass + '>'
      + '<td class="pkg-drag-col"><span class="pkg-drag-handle"></span></td>'
      + '<td class="pkg-td-name">' + p.name + '</td>'
      + '<td>' + (p.total||0).toLocaleString() + '</td>'
      + '<td><button class="pkg-edit-btn" onclick="pkgOpenEdit(' + i + ')" data-ko="수정" data-en="Edit">' + editTxt + '</button></td>'
      + '<td><button class="pkg-view-btn" onclick="pkgOpenView(' + i + ')">→</button></td>'
      + '</tr>';
  }
  tbody.innerHTML = html;
  pkgInitDragAndDrop();
  // 패키지가 있으면 첫 번째 항목 자동 선택
  var firstVisible = pkgData.findIndex(function(p) { return !p.unused; });
  if (firstVisible >= 0) pkgOpenView(firstVisible);
  else pkgClearDetailPanel();
}

function pkgClearDetailPanel() {
  var tbody = document.getElementById('pkgDetailTbody');
  var totalEl = document.getElementById('pkgDetailTotal');
  if (tbody) tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#9E9E9E;padding:40px;">'
    + (currentLang === 'en' ? 'Select a package to view details.' : '패키지를 선택하면 내역이 표시됩니다.') + '</td></tr>';
  if (totalEl) totalEl.textContent = '0';
}

function pkgOpenView(idx) {
  var p = pkgData[idx];
  if (!p) return;
  // 선택 행 하이라이트
  document.querySelectorAll('#pkgTbody tr').forEach(function(tr) { tr.classList.remove('pkg-row-selected'); });
  var selRow = document.querySelector('#pkgTbody tr[data-pkg-idx="' + idx + '"]');
  if (selRow) selRow.classList.add('pkg-row-selected');
  // 상세 패널 렌더
  var panel = document.getElementById('pkgDetailPanel');
  var tbody = document.getElementById('pkgDetailTbody');
  var totalEl = document.getElementById('pkgDetailTotal');
  if (!panel || !tbody || !totalEl) return;
  if (!p.items || !p.items.length) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#9E9E9E;padding:20px;">'
      + (currentLang === 'en' ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
  } else {
    tbody.innerHTML = p.items.map(function(it) {
      return '<tr><td style="text-align:left;">' + (it.name||'') + '</td><td>' + (it.price||0).toLocaleString() + '</td></tr>';
    }).join('');
  }
  totalEl.textContent = (p.total||0).toLocaleString();
}

function pkgToggleUnused(checked) {
  document.querySelectorAll('#pkgTbody .pkg-unused').forEach(function(tr) {
    tr.classList.toggle('pkg-show', checked);
  });
}

var _pkgDragInited = false;
var _pkgDraggedRow = null;

function pkgInitDragAndDrop() {
  var tbody = document.getElementById('pkgTbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr[data-pkg-idx]').forEach(function(row) { row.setAttribute('draggable','true'); });
  if (_pkgDragInited) return;
  _pkgDragInited = true;

  tbody.addEventListener('dragstart', function(e) {
    if (!e.target.closest) return;
    var target = e.target.closest('tr');
    if (target && target.parentNode === tbody && target.hasAttribute('data-pkg-idx')) {
      _pkgDraggedRow = target;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(function() { target.classList.add('sortable-drag'); }, 0);
    }
  });
  tbody.addEventListener('dragend', function() {
    if (_pkgDraggedRow) _pkgDraggedRow.classList.remove('sortable-drag');
    tbody.querySelectorAll('tr.sortable-ghost').forEach(function(r) { r.classList.remove('sortable-ghost'); });
    var newData = [];
    tbody.querySelectorAll('tr[data-pkg-idx]').forEach(function(tr) {
      var idx = parseInt(tr.dataset.pkgIdx);
      if (!isNaN(idx) && pkgData[idx]) newData.push(pkgData[idx]);
    });
    if (newData.length === pkgData.length) pkgData = newData;
    _pkgDraggedRow = null;
    pkgRenderTable();
  });
  tbody.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!e.target.closest) return;
    var target = e.target.closest('tr');
    if (target && target !== _pkgDraggedRow && target.parentNode === tbody && target.hasAttribute('data-pkg-idx')) {
      tbody.querySelectorAll('tr.sortable-ghost').forEach(function(r) { r.classList.remove('sortable-ghost'); });
      target.classList.add('sortable-ghost');
      var bb = target.getBoundingClientRect();
      if (e.clientY > bb.y + bb.height / 2) target.after(_pkgDraggedRow);
      else target.before(_pkgDraggedRow);
    }
  });
  tbody.addEventListener('dragleave', function(e) {
    if (!e.target.closest) return;
    var target = e.target.closest('tr');
    if (target && target !== _pkgDraggedRow) target.classList.remove('sortable-ghost');
  });
}

// ══ [FEAT-OTHERCODE-SETUP] 기타 코드 설정 ══
var otcData = {
  '결제 방법': {
    en: 'Payment Method',
    cols: [{ key:'name', ko:'결제 방법', en:'Payment Method' }],
    items: [
      { name:'현금', inactive:false },
      { name:'카드', inactive:false },
      { name:'계좌이체', inactive:false },
      { name:'지역화폐', inactive:false },
      { name:'네이버 페이', inactive:false },
      { name:'카카오 페이', inactive:false },
      { name:'상품권', inactive:false }
    ]
  },
  '영업구분': {
    en: 'Sales Type',
    cols: [{ key:'name', ko:'영업구분', en:'Sales Type' }],
    items: [{ name:'A', inactive:false }, { name:'B', inactive:false }, { name:'C', inactive:false }]
  },
  '할인구분': {
    en: 'Discount Category',
    cols: [{ key:'name', ko:'할인구분', en:'Discount Category' }, { key:'discount', ko:'할인', en:'Discount' }],
    hasDiscount: true,
    items: [
      { name:'할인이벤트', discount:10, discountType:'%', inactive:false },
      { name:'VIP고객할인', discount:20, discountType:'%', inactive:false }
    ]
  },
  '고객그룹': {
    en: 'Client Group',
    cols: [{ key:'name', ko:'고객그룹', en:'Client Group' }],
    items: [{ name:'그룹A', inactive:false }, { name:'그룹B', inactive:false }]
  },
  '고객등급': {
    en: 'Client Rating',
    cols: [{ key:'name', ko:'고객등급', en:'Client Rating' }],
    items: [{ name:'일반', inactive:false }, { name:'우대', inactive:false }, { name:'VIP', inactive:false }]
  },
  '고객방문경로': {
    en: 'Client Referral Source',
    cols: [{ key:'name', ko:'고객방문경로', en:'Client Referral Source' }],
    items: [
      { name:'소개', inactive:false }, { name:'지인', inactive:false }, { name:'간판', inactive:false },
      { name:'인터넷', inactive:false }, { name:'SNS', inactive:false }, { name:'기타', inactive:false }
    ]
  },
  '내 메세지 분류': {
    en: 'My Message Category',
    cols: [{ key:'name', ko:'내 메세지 분류', en:'My Message Category' }],
    items: [{ name:'메세지함A', inactive:false }, { name:'메세지함B', inactive:false }]
  }
};

var otcCurrentCat = '결제 방법';
var otcEditIdx = -1;

function openOtherCodeSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  otcRenderCatList();
  otcRenderItems();
  if (currentLang === 'en') applyLang();
}

function closeOtherCodeSetup() {
  document.getElementById('otherCodeSetupView').classList.remove('show');
  showReservationView();
}

function otcRenderCatList() {
  var el = document.getElementById('otcCatList');
  if (!el) return;
  var keys = Object.keys(otcData);
  el.innerHTML = keys.map(function(k) {
    var enLabel = otcData[k].en || k;
    var label = (currentLang === 'en' && enLabel) ? enLabel : k;
    return '<div class="otc-cat-item' + (k === otcCurrentCat ? ' active' : '') + '" onclick="otcSelectCat(\'' + k.replace(/'/g, "\\'") + '\')">' +
      '<span data-i18n="sv.otc_cat_' + k.replace(/\s/g,'_') + '" data-ko="' + k + '" data-en="' + enLabel + '">' + label + '</span>' +
      '<span class="otc-cat-arrow">→</span>' +
    '</div>';
  }).join('');
}

function otcSelectCat(cat) {
  otcCurrentCat = cat;
  document.getElementById('otcShowUnused').checked = false;
  // 선택된 분류 이름을 배지에 표시
  var badgeEl = document.getElementById('otcSelectedCatName');
  if (badgeEl && otcData[cat]) {
    badgeEl.textContent = currentLang === 'en' ? (otcData[cat].en || cat) : cat;
  }
  otcRenderCatList();
  otcRenderItems();
}

function otcRenderItems() {
  var cat = otcData[otcCurrentCat];
  if (!cat) return;
  var showUnused = document.getElementById('otcShowUnused') && document.getElementById('otcShowUnused').checked;
  var editTxt = currentLang === 'en' ? 'Edit' : '수정';
  var editColTxt = currentLang === 'en' ? 'Edit' : '수정';

  // thead
  var thead = document.getElementById('otcItemThead');
  if (thead) {
    var thCols = '<th class="otc-drag-col"></th>';
    cat.cols.forEach(function(c) {
      thCols += '<th>' + (currentLang === 'en' ? c.en : c.ko) + '</th>';
    });
    thCols += '<th style="width:80px;">' + editColTxt + '</th>';
    thead.innerHTML = '<tr>' + thCols + '</tr>';
  }

  // tbody
  var tbody = document.getElementById('otcItemTbody');
  if (!tbody) return;
  var items = cat.items;
  if (!items || !items.length) {
    var span = cat.cols.length + 2;
    var emptyTxt = currentLang === 'en' ? 'No items found' : '내역이 없습니다';
    tbody.innerHTML = '<tr class="otc-empty"><td colspan="' + span + '">' + emptyTxt + '</td></tr>';
    return;
  }
  var html = '';
  items.forEach(function(item, i) {
    var rowCls = item.inactive ? ('otc-row-unused' + (showUnused ? ' otc-show' : '')) : '';
    html += '<tr draggable="true" data-otc-idx="' + i + '"' + (rowCls ? ' class="' + rowCls + '"' : '') + '>';
    html += '<td class="otc-drag-col"><span class="otc-drag-handle"></span></td>';
    cat.cols.forEach(function(c) {
      if (c.key === 'name') {
        html += '<td>' + item.name + (item.inactive ? ' <span style="font-size:11px;color:#BDBDBD;">[' + (currentLang === 'en' ? 'Inactive' : '미사용') + ']</span>' : '') + '</td>';
      } else if (c.key === 'discount') {
        var dType = item.discountType || '%';
        var dVal = dType === '금액' ? formatMoney(item.discount || 0) : (item.discount || 0);
        html += '<td>' + dVal + '(' + dType + ')' + '</td>';
      }
    });
    html += '<td><button class="otc-edit-btn" onclick="otcOpenEdit(' + i + ')" data-ko="수정" data-en="Edit">' + editTxt + '</button></td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
  otcInitDrag();
}

function otcToggleUnused(checked) {
  document.querySelectorAll('#otcItemTbody .otc-row-unused').forEach(function(tr) {
    tr.classList.toggle('otc-show', checked);
  });
}

function otcOpenReg() {
  otcEditIdx = -1;
  document.getElementById('otcModalTitle').textContent = currentLang === 'en' ? 'Add Item' : '항목 등록';
  document.getElementById('otcNameInput').value = '';
  var cat = otcData[otcCurrentCat];
  var hasDiscount = cat && cat.hasDiscount;
  document.getElementById('otcDiscountRow').style.display = hasDiscount ? 'flex' : 'none';
  if (hasDiscount) {
    document.getElementById('otcDiscountInput').value = '';
    document.getElementById('otcDiscPct').checked = true;
  }
  document.getElementById('otcStatusToggle').checked = true;
  document.getElementById('otcStatusLabel').textContent = currentLang === 'en' ? 'Active' : '사용';
  var otcNameEl2 = document.getElementById('otcNameInput'); if (otcNameEl2) otcNameEl2.style.borderColor = '';
  document.getElementById('otcModal').classList.add('show');
  setTimeout(function(){ document.getElementById('otcNameInput').focus(); }, 50);
}

function otcOpenEdit(idx) {
  var cat = otcData[otcCurrentCat];
  if (!cat) return;
  var item = cat.items[idx];
  if (!item) return;
  otcEditIdx = idx;
  document.getElementById('otcModalTitle').textContent = currentLang === 'en' ? 'Edit Item' : '항목 수정';
  document.getElementById('otcNameInput').value = item.name;
  var hasDiscount = cat.hasDiscount;
  document.getElementById('otcDiscountRow').style.display = hasDiscount ? 'flex' : 'none';
  if (hasDiscount) {
    document.getElementById('otcDiscountInput').value = item.discountType === '금액' ? formatMoney(item.discount || 0) : (item.discount || '');
    if (item.discountType === '금액') document.getElementById('otcDiscAmt').checked = true;
    else document.getElementById('otcDiscPct').checked = true;
  }
  document.getElementById('otcStatusToggle').checked = !item.inactive;
  document.getElementById('otcStatusLabel').textContent = !item.inactive ? (currentLang === 'en' ? 'Active' : '사용') : (currentLang === 'en' ? 'Inactive' : '미사용');
  var otcNameEl3 = document.getElementById('otcNameInput'); if (otcNameEl3) otcNameEl3.style.borderColor = '';
  document.getElementById('otcModal').classList.add('show');
  setTimeout(function(){ document.getElementById('otcNameInput').focus(); }, 50);
}

function otcCloseModal() {
  document.getElementById('otcModal').classList.remove('show');
}

function otcSwitchDiscType() {
  var inp = document.getElementById('otcDiscountInput');
  var isAmt = document.getElementById('otcDiscAmt').checked;
  var raw = inp.value.replace(/,/g, '');
  if (isAmt) {
    // 금액으로 전환 — 콤마 포맷 적용
    inp.value = formatMoney(parseInt(raw) || 0);
  } else {
    // %로 전환 — 콤마 제거
    inp.value = raw;
  }
}

function otcSave() {
  var name = (document.getElementById('otcNameInput').value || '').trim();
  var otcNameEl = document.getElementById('otcNameInput');
  if (otcNameEl) otcNameEl.style.borderColor = '';
  if (!name) { if (otcNameEl) otcNameEl.style.borderColor = '#F06060'; return; }
  var cat = otcData[otcCurrentCat];
  if (!cat) return;
  var inactive = !document.getElementById('otcStatusToggle').checked;
  var newItem = { name: name, inactive: inactive };
  if (cat.hasDiscount) {
    var discType = document.getElementById('otcDiscPct').checked ? '%' : '금액';
    var disc = discType === '금액' ? parseMoney(document.getElementById('otcDiscountInput').value) : (parseFloat(document.getElementById('otcDiscountInput').value) || 0);
    newItem.discount = disc;
    newItem.discountType = discType;
  }
  if (otcEditIdx >= 0) {
    cat.items[otcEditIdx] = newItem;
  } else {
    cat.items.push(newItem);
  }
  otcCloseModal();
  otcRenderItems();
}

var _otcDraggedRow = null;
function otcInitDrag() {
  var tbody = document.getElementById('otcItemTbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr[data-otc-idx]').forEach(function(row) {
    row.addEventListener('dragstart', function() { _otcDraggedRow = row; row.style.opacity = '0.4'; });
    row.addEventListener('dragend', function() { row.style.opacity = ''; _otcDraggedRow = null; });
    row.addEventListener('dragover', function(e) { e.preventDefault(); });
    row.addEventListener('drop', function(e) {
      e.preventDefault();
      if (!_otcDraggedRow || _otcDraggedRow === row) return;
      var fromIdx = parseInt(_otcDraggedRow.dataset.otcIdx);
      var toIdx = parseInt(row.dataset.otcIdx);
      if (isNaN(fromIdx) || isNaN(toIdx)) return;
      var cat = otcData[otcCurrentCat];
      if (!cat) return;
      var moved = cat.items.splice(fromIdx, 1)[0];
      cat.items.splice(toIdx, 0, moved);
      otcRenderItems();
    });
  });
}
// ══ [FEAT-OTHERCODE-SETUP] END ══

// ══ [FEAT-POINT-SETUP] 포인트 설정 ══
var ptsColState = { svc: false, prd: false, pas: false, tkt: false };
var ptsRefEnabled = false;

function openPointSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('pointSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  ptsRefreshColState();
  if (currentLang === 'en') applyLang();
}

function ptsToggleCol(col, enabled) {
  ptsColState[col] = enabled;
  var cells = document.querySelectorAll('#pointSetupView .pts-cell[data-col="' + col + '"]');
  cells.forEach(function(cell) {
    var inp = cell.querySelector('.pts-input');
    if (inp) inp.disabled = !enabled;
    if (enabled) cell.classList.remove('pts-disabled');
    else cell.classList.add('pts-disabled');
  });
  var capCol = col.charAt(0).toUpperCase() + col.slice(1);
  var label = document.getElementById('ptsLabel' + capCol);
  if (label) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    label.textContent = enabled ? (isEn ? 'On' : '적용') : (isEn ? 'Off' : '적용 안함');
    label.setAttribute('data-ko', enabled ? '적용' : '적용 안함');
    label.setAttribute('data-en', enabled ? 'On' : 'Off');
  }
}

function ptsToggleRef(enabled) {
  ptsRefEnabled = enabled;
  var intro = document.getElementById('ptsRefIntro');
  var receiver = document.getElementById('ptsRefReceiver');
  if (intro) intro.disabled = !enabled;
  if (receiver) receiver.disabled = !enabled;
  var label = document.getElementById('ptsLabelRef');
  if (label) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    label.textContent = enabled ? (isEn ? 'On' : '적용') : (isEn ? 'Off' : '적용 안함');
    label.setAttribute('data-ko', enabled ? '적용' : '적용 안함');
    label.setAttribute('data-en', enabled ? 'On' : 'Off');
  }
}

function ptsRefreshColState() {
  Object.keys(ptsColState).forEach(function(col) {
    var chk = document.getElementById('ptsToggle' + col.charAt(0).toUpperCase() + col.slice(1));
    if (chk) {
      chk.checked = ptsColState[col];
      ptsToggleCol(col, ptsColState[col]);
    }
  });
  // refresh ref toggle
  var refChk = document.getElementById('ptsToggleRef');
  if (refChk) {
    refChk.checked = ptsRefEnabled;
    ptsToggleRef(ptsRefEnabled);
  }
}

function ptsSaveSales() {
  var cols = ['svc', 'prd', 'pas', 'tkt'];
  var rows = 7;
  var data = {};
  cols.forEach(function(col) {
    data[col] = { enabled: ptsColState[col], values: [] };
    for (var i = 0; i < rows; i++) {
      var inp = document.getElementById('pts-' + col + '-' + i);
      var val = ptsParseNum(inp);
      val = Math.round(val * 10) / 10;
      data[col].values.push(val);
    }
  });
  console.log('판매시 포인트 저장:', data);
}

function ptsSaveRef() {
  var intro = ptsParseNum(document.getElementById('ptsRefIntro'));
  var receiver = ptsParseNum(document.getElementById('ptsRefReceiver'));
  intro = Math.floor(intro);
  receiver = Math.floor(receiver);
  console.log('소개 포인트 저장:', { intro: intro, receiver: receiver });
}

/* ── 포인트 입력 제한 ── */
// 판매 포인트: 숫자 + 소수점 1자리, 3자리 콤마
function ptsFormatDecimal(inp) {
  var raw = inp.value.replace(/,/g, '');
  // 숫자와 소수점만 허용
  raw = raw.replace(/[^0-9.]/g, '');
  // 소수점 1개만 허용
  var parts = raw.split('.');
  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
  parts = raw.split('.');
  // 소수점 이하 1자리 제한
  if (parts[1] !== undefined) parts[1] = parts[1].substring(0, 1);
  // 정수부 3자리 콤마
  parts[0] = parts[0].replace(/^0+(?=\d)/, '');
  if (parts[0] === '') parts[0] = '0';
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  inp.value = parts[1] !== undefined ? parts[0] + '.' + parts[1] : parts[0];
}

// 소개 포인트: 정수만, 3자리 콤마
function ptsFormatInt(inp) {
  var raw = inp.value.replace(/,/g, '').replace(/[^0-9]/g, '');
  raw = raw.replace(/^0+(?=\d)/, '');
  if (raw === '') { inp.value = ''; return; }
  inp.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 저장 시 콤마 제거하고 숫자 반환
function ptsParseNum(inp) {
  if (!inp) return 0;
  var v = parseFloat(inp.value.replace(/,/g, ''));
  return isNaN(v) ? 0 : v;
}

// 입력 이벤트 바인딩
(function() {
  // 판매 포인트 입력칸
  var cols = ['svc', 'prd', 'pas', 'tkt'];
  for (var r = 0; r < 7; r++) {
    cols.forEach(function(col) {
      var inp = document.getElementById('pts-' + col + '-' + r);
      if (inp) {
        inp.addEventListener('input', function() { ptsFormatDecimal(this); });
        inp.addEventListener('keydown', function(e) {
          // 허용: 숫자, 소수점, 백스페이스, 탭, 방향키, Delete, Home, End
          if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Delete' ||
              e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') return;
          if (e.key === '.' && !this.value.includes('.')) return;
          if (e.key >= '0' && e.key <= '9') return;
          e.preventDefault();
        });
      }
    });
  }
  // 소개 포인트 입력칸
  ['ptsRefIntro', 'ptsRefReceiver'].forEach(function(id) {
    var inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('input', function() { ptsFormatInt(this); });
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Delete' ||
            e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') return;
        if (e.key >= '0' && e.key <= '9') return;
        e.preventDefault();
      });
    }
  });
})();
// ══ [FEAT-POINT-SETUP] END ══

// ══ [FEAT-CONSENT-SETUP] 동의서 관리 ══
var cstData = [];
var cstSectionIdx = 0;

function openConsentSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('consentSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  cstShowList();
  if (currentLang === 'en') applyLang();
}

function cstShowList() {
  document.getElementById('cstListSection').style.display = '';
  document.getElementById('cstMsgSection').style.display = 'none';
  document.getElementById('cstRegSection').style.display = 'none';
  cstRenderTable();
}

function cstOpenMsgSettings() {
  document.getElementById('cstListSection').style.display = 'none';
  document.getElementById('cstMsgSection').style.display = '';
  document.getElementById('cstRegSection').style.display = 'none';
  if (currentLang === 'en') applyLang();
}

function cstOpenReg(idx) {
  document.getElementById('cstListSection').style.display = 'none';
  document.getElementById('cstMsgSection').style.display = 'none';
  document.getElementById('cstRegSection').style.display = '';
  document.getElementById('cstSectionsContainer').innerHTML = '';
  document.getElementById('cstRegTitleInput').value = '';
  cstSectionIdx = 0;
  // 기본 "내용" 섹션 추가
  cstAddContent();
  if (currentLang === 'en') applyLang();
}

function cstBackToList() {
  cstShowList();
}

function cstToggleFallback(checked) {
  var body = document.getElementById('cstFallbackBody');
  if (body) body.style.display = checked ? '' : 'none';
  var label = document.getElementById('cstFallbackLabel');
  if (label) label.textContent = checked ? 'On' : 'Off';
}

function cstRenderTable() {
  var tbody = document.getElementById('cstTableBody');
  if (!tbody) return;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (cstData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="cst-empty">' + (isEn ? 'No records found.' : '내역이 없습니다') + '</td></tr>';
    document.getElementById('cstTotal').textContent = (isEn ? 'Total 0 records' : '총 0 건');
    return;
  }
  var showUnused = document.getElementById('cstShowUnused') && document.getElementById('cstShowUnused').checked;
  var visibleData = showUnused ? cstData : cstData.filter(function(d) { return !d.inactive; });
  document.getElementById('cstTotal').textContent = (isEn ? 'Total ' + visibleData.length + ' records' : '총 ' + visibleData.length + ' 건');
  if (visibleData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="cst-empty">' + (isEn ? 'No records found.' : '내역이 없습니다') + '</td></tr>';
    return;
  }
  tbody.innerHTML = visibleData.map(function(item, i) {
    var signerCell = item.hasSigner
      ? '<span class="cst-signer-y" onclick="cstAddSigner(' + i + ')">' + (isEn ? 'Y' : 'Y') + '</span>'
      : '<span class="cst-signer-n">N</span>';
    return '<tr>' +
      '<td>' + item.title + '</td>' +
      '<td>' + item.date + '</td>' +
      '<td>' + signerCell + '</td>' +
      '<td>' + (item.completed || 0) + '</td>' +
      '<td><button class="cst-view-btn" onclick="cstViewForm(' + i + ')">' + (isEn ? 'View' : '보기') + '</button></td>' +
      '</tr>';
  }).join('');
}

function cstToggleUnused(checked) {
  cstRenderTable();
}

function cstAddSigner(idx) { /* TODO */ }

var cstDetailIdx = -1;
function cstViewForm(idx) {
  cstDetailIdx = idx;
  var item = cstData[idx];
  if (!item) return;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var html = '';

  // 제목
  html += '<div class="cst-detail-title">' + item.title + '</div>';

  // 고객 정보
  html += '<div class="cst-pv-section">';
  html += '<div class="cst-pv-label">[' + (isEn ? 'Client Info' : '고객 정보') + ']</div>';
  html += '<div class="cst-pv-field"><strong>' + (isEn ? 'Client Name' : '고객명') + '</strong> : ' + (isEn ? 'Ariana' : '홍길동') + '</div>';
  html += '<div class="cst-pv-field"><strong>' + (isEn ? 'Mobile' : '휴대폰') + '</strong> : 010-1234-5678</div>';
  html += '</div>';

  // 저장된 섹션 내용
  if (item.sections) {
    item.sections.forEach(function(sec) {
      html += '<div class="cst-pv-section">';
      if (sec.type === 'content' && sec.value) {
        html += '<div class="cst-pv-content">' + sec.value.replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</div>';
      } else if (sec.type === 'input' || sec.type === 'question') {
        if (sec.title) {
          html += '<div class="cst-pv-field-title">' + (sec.required ? '<span class="cst-pv-req">*</span> ' : '') + '<strong>' + sec.title + '</strong></div>';
        }
        if (sec.selectType === 'single' || sec.selectType === 'multi') {
          var inputTag = sec.selectType === 'single' ? 'radio' : 'checkbox';
          html += '<div class="cst-pv-choices' + (sec.lineByLine ? ' cst-pv-vertical' : '') + '">';
          (sec.choices || []).forEach(function(c) {
            if (c) html += '<label class="cst-pv-opt"><input type="' + inputTag + '" disabled> ' + c + '</label>';
          });
          html += '</div>';
        } else {
          html += '<div class="cst-pv-textarea-placeholder"></div>';
        }
      }
      html += '</div>';
    });
  }

  // 추가 옵션 표시
  if (item.hasSigner || item.hasDownload) {
    html += '<div class="cst-pv-section cst-pv-opts">';
    if (item.hasSigner) {
      html += '<label class="cst-chk-label"><input type="checkbox" checked disabled><span class="cst-chk-mark">✓</span> <strong>' + (isEn ? 'Add Signer' : '동의자 추가') + '</strong></label>';
    }
    if (item.hasDownload) {
      html += '<label class="cst-chk-label"><input type="checkbox" checked disabled><span class="cst-chk-mark">✓</span> <strong>' + (isEn ? 'Download after signing' : '고객 서명 후 동의서 다운로드') + '</strong></label>';
    }
    html += '</div>';
  }

  var modal = document.getElementById('cstDetailModal');
  var body = document.getElementById('cstDetailBody');
  if (modal && body) {
    body.innerHTML = html;
    modal.classList.add('show');
  }
}

function cstEditForm(idx) { /* TODO */ }
function cstDeleteForm(idx) {
  if (idx >= 0 && idx < cstData.length) {
    cstData.splice(idx, 1);
    cstCloseModal('cstDetailModal');
    cstRenderTable();
  }
}

function cstSaveMsgSettings() {
}

function cstOpenModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function cstCloseModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function cstOpenKakaoPreview() {
  var src = document.getElementById('cstKakaoMsgBody');
  var dst = document.getElementById('cstKakaoPreviewText');
  if (src && dst) dst.textContent = src.innerText || src.textContent;
  cstOpenModal('cstKakaoPreviewModal');
}
function cstOpenKakaoAlt() { cstOpenModal('cstKakaoAltModal'); }

var _cstKakaoTemplates = [
  '■ ((매장명)) 동의서 작성 안내 ■\n\n안녕하세요. ((매장명)) 입니다.\n\n원활한 서비스 제공을 위해 ((성명))님의 \'((동의서 제목))\' 작성을 부탁 드립니다.\n\n- 아래 동의서 작성하기 버튼을 클릭해 주세요 -',
  '■ ((매장명)) 동의서 작성 안내 ■\n\n안녕하세요. ((성명)) 고객님, ((매장명)) 입니다.\n\n고객님께 더 나은 서비스를 제공하기 위해 \'((동의서 제목))\' 작성을 요청드립니다.\n\n아래 버튼을 눌러 동의서를 작성해 주시면 감사하겠습니다.'
];
function cstSelectKakaoTemplate(idx) {
  var ta = document.getElementById('cstKakaoMsgBody');
  if (ta) ta.innerText = _cstKakaoTemplates[idx];
  cstCloseModal('cstKakaoAltModal');
}

var _cstSmsTemplates = [
  '■동의서 작성 안내■\n\n안녕하세요 ((매장명)) 입니다.\n\n원활한 서비스 제공을 위해 ((성명))고객님의 \'((동의서 제목))\' 작성을 부탁드립니다.\n\n-아래 동의서 링크를 클릭해주세요-\n((동의서 링크))',
  '■동의서 작성 안내■\n\n안녕하세요 ((성명)) 고객님, ((매장명)) 입니다.\n\n고객님께 더 나은 서비스 제공을 위해 \'((동의서 제목))\' 작성을 요청드립니다.\n\n*링크 클릭이 안되는 경우*\n상단의 매장 전화번호를 휴대폰에 저장해 주세요\n\n-동의서 링크-\n((동의서 링크))'
];
function cstOpenSmsPreview() {
  var src = document.getElementById('cstSmsMsgBody');
  var dst = document.getElementById('cstSmsPreviewText');
  if (src && dst) dst.textContent = src.value;
  cstOpenModal('cstSmsPreviewModal');
}
function cstOpenSmsAlt() { cstOpenModal('cstSmsAltModal'); }
function cstSelectSmsTemplate(idx) {
  var ta = document.getElementById('cstSmsMsgBody');
  if (ta) { ta.value = _cstSmsTemplates[idx]; ta.dispatchEvent(new Event('input')); }
  cstCloseModal('cstSmsAltModal');
}

var _cstLastSel = { start: 0, end: 0 };
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var ta = document.getElementById('cstSmsMsgBody');
    if (!ta) return;
    function savePos() { _cstLastSel.start = ta.selectionStart; _cstLastSel.end = ta.selectionEnd; }
    ta.addEventListener('mouseup', savePos);
    ta.addEventListener('keyup', savePos);
    ta.addEventListener('focus', savePos);
  });
})();

function cstInsertVar(text) {
  var ta = document.getElementById('cstSmsMsgBody');
  if (!ta) return;
  ta.focus();
  var s = _cstLastSel.start, e = _cstLastSel.end;
  var val = ta.value;
  ta.value = val.slice(0, s) + text + val.slice(e);
  var pos = s + text.length;
  ta.setSelectionRange(pos, pos);
  _cstLastSel.start = _cstLastSel.end = pos;
  ta.dispatchEvent(new Event('input'));
}

var _cstIconUp  = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8l4-4 4 4"/></svg>';
var _cstIconDn  = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l4 4 4-4"/></svg>';
var _cstIconDel = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,4 14,4"/><path d="M5,4V2.5h6V4"/><path d="M3.5,4l.9,9.5h7.2l.9-9.5"/><line x1="6.5" y1="7" x2="6.5" y2="11"/><line x1="9.5" y1="7" x2="9.5" y2="11"/></svg>';
var _cstIconX   = '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>';

function _cstSectionHeader(nameKo, nameEn, descKo, descEn) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var name = isEn ? nameEn : nameKo;
  var desc = isEn ? descEn : descKo;
  return '<div class="cst-section-header">' +
    '<span class="cst-section-drag-handle"></span>' +
    '<span class="cst-section-name" data-ko="' + nameKo + '" data-en="' + nameEn + '">' + name + '</span>' +
    (descKo ? '<span class="cst-section-desc" data-ko="' + descKo + '" data-en="' + descEn + '">' + desc + '</span>' : '') +
    '<button class="cst-section-del" onclick="cstDeleteSection(this)" title="삭제">✕</button>' +
  '</div>';
}

var _cstDragged = null;
var _cstFromHandle = false;
function cstInitDragDrop() {
  var container = document.getElementById('cstSectionsContainer');
  if (!container || container._cstDndReady) return;
  container._cstDndReady = true;

  // 핸들을 클릭할 때만 드래그 가능하도록 설정
  container.addEventListener('mousedown', function(e) {
    var handle = e.target.closest('.cst-section-drag-handle');
    var item = e.target.closest('.cst-section-item');
    _cstFromHandle = !!handle;
    if (item) item.setAttribute('draggable', handle ? 'true' : 'false');
  });

  document.addEventListener('mouseup', function() {
    _cstFromHandle = false;
    if (container) {
      container.querySelectorAll('.cst-section-item').forEach(function(el) {
        el.setAttribute('draggable', 'false');
      });
    }
  });

  container.addEventListener('dragstart', function(e) {
    if (!_cstFromHandle) { e.preventDefault(); return; }
    _cstDragged = e.target.closest('.cst-section-item');
    if (!_cstDragged) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setTimeout(function() { if (_cstDragged) _cstDragged.classList.add('sortable-drag'); }, 0);
  });

  container.addEventListener('dragend', function() {
    if (_cstDragged) _cstDragged.classList.remove('sortable-drag');
    container.querySelectorAll('.cst-section-ghost').forEach(function(el) { el.classList.remove('cst-section-ghost'); });
    _cstDragged = null;
    _cstFromHandle = false;
  });

  container.addEventListener('dragover', function(e) {
    if (!_cstDragged) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var target = e.target.closest('.cst-section-item');
    if (!target || target === _cstDragged) return;
    container.querySelectorAll('.cst-section-ghost').forEach(function(el) { el.classList.remove('cst-section-ghost'); });
    target.classList.add('cst-section-ghost');
  });

  container.addEventListener('drop', function(e) {
    e.preventDefault();
    var target = e.target.closest('.cst-section-item');
    if (!target || target === _cstDragged || !_cstDragged) return;
    var items = Array.from(container.querySelectorAll('.cst-section-item'));
    if (items.indexOf(_cstDragged) < items.indexOf(target)) {
      container.insertBefore(_cstDragged, target.nextElementSibling);
    } else {
      container.insertBefore(_cstDragged, target);
    }
    container.querySelectorAll('.cst-section-ghost').forEach(function(el) { el.classList.remove('cst-section-ghost'); });
  });
}

function _cstInlineChk(isEn) {
  return '<label class="cst-section-req-wrap"><input type="checkbox"><span class="cst-section-req-mark">✓</span><span class="cst-section-req-text" data-ko="한줄씩 배치" data-en="Line by line">' + (isEn ? 'Line by line' : '한줄씩 배치') + '</span></label>';
}

function _cstChoiceRows(idx, isEn) {
  return '<div class="cst-choice-area" id="cstChoiceArea_' + idx + '">' +
    '<div class="cst-choice-row">' +
      '<input type="text" data-i18n-ph-ko="선택 항목" data-i18n-ph-en="Option" placeholder="' + (isEn ? 'Option' : '선택 항목') + '">' +
      '<button class="cst-choice-del" onclick="cstDelChoice(this)" title="삭제">' + _cstIconX + '</button>' +
    '</div>' +
  '</div>' +
  '<div class="cst-choice-meta">' +
    '<button class="cst-choice-add-btn" onclick="cstAddChoice(this,\'' + idx + '\')" data-ko="⊕ 선택 목록 추가" data-en="⊕ Add a list">⊕ ' + (isEn ? 'Add a list' : '선택 목록 추가') + '</button>' +
  '</div>';
}

function _cstChoiceTd(idx, isEn) {
  return '<td class="cst-td-top"><span data-ko="선택 목록" data-en="Select List">' + (isEn ? 'Select List' : '선택 목록') + '</span><div class="cst-choice-inline-opt">' + _cstInlineChk(isEn) + '</div></td>';
}

function _cstTypeBody(type, idx, isStore) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var titleLabel = isStore ? (isEn ? 'Title' : '제목') : (isEn ? 'Question' : '질문');
  var html = '<table class="cst-section-form"><tbody>';
  html += '<tr><td></td><td>';
  html += '</td></tr>';
  html += '<tr><td>' + titleLabel + '</td><td><input type="text" class="cst-section-form-input"></td></tr>';
  if (type === 'single' || type === 'multi') {
    html += '<tr>' + _cstChoiceTd(idx, isEn) + '<td>' + _cstChoiceRows(idx, isEn) + '</td></tr>';
  }
  html += '</tbody></table>';
  return html;
}

function cstChangeType(sel, idx, isStore) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var item = sel.closest('.cst-section-item');
  var type = sel.value;
  var bodyDiv = item.querySelector('.cst-section-type-body');
  if (type === 'single' || type === 'multi') {
    bodyDiv.innerHTML = '<table class="cst-section-form"><tbody>' +
      '<tr>' + _cstChoiceTd(idx, isEn) + '<td>' + _cstChoiceRows(idx, isEn) + '</td></tr>' +
      '</tbody></table>';
  } else {
    bodyDiv.innerHTML = '';
  }
}

function cstAddChoice(btn, idx) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var area = document.getElementById('cstChoiceArea_' + idx);
  if (!area) { area = btn.closest('.cst-choice-meta').previousElementSibling; }
  var row = document.createElement('div');
  row.className = 'cst-choice-row';
  row.innerHTML = '<input type="text" placeholder="' + (isEn ? 'Option' : '선택 항목') + '"><button class="cst-choice-del" onclick="cstDelChoice(this)" title="삭제">' + _cstIconX + '</button>';
  area.appendChild(row);
}

function cstDelChoice(btn) {
  var area = btn.closest('.cst-choice-area');
  if (area && area.children.length > 1) btn.closest('.cst-choice-row').remove();
}

function cstAddContent() {
  var container = document.getElementById('cstSectionsContainer');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var div = document.createElement('div');
  div.className = 'cst-section-item';
  div.dataset.secIdx = ++cstSectionIdx;
  div.setAttribute('draggable', 'true');
  div.innerHTML = _cstSectionHeader(
    '내용', 'Contents',
    '동의서 내용을 작성해 주세요', 'Please fill out the consent form.'
  ) + '<textarea class="cst-section-textarea" data-i18n-ph-ko="내용을 입력하세요" data-i18n-ph-en="Enter content..." placeholder="' + (isEn ? 'Enter content...' : '내용을 입력하세요') + '"></textarea>';
  container.appendChild(div);
  cstInitDragDrop();
}

function cstAddStoreInput() {
  var container = document.getElementById('cstSectionsContainer');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var idx = ++cstSectionIdx;
  var div = document.createElement('div');
  div.className = 'cst-section-item';
  div.dataset.secIdx = idx;
  div.setAttribute('draggable', 'true');
  div.innerHTML = _cstSectionHeader(
    '매장 입력', 'Shop Inputs',
    '동의서 서명 시 매장에서 입력하고 싶은 내용을 작성합니다.', 'Write what you want the shop to enter when you sign the agreement.'
  ) +
  '<table class="cst-section-form"><tbody>' +
    '<tr><td data-ko="유형 선택" data-en="Type">' + (isEn ? 'Type' : '유형 선택') + '</td><td>' +
      '<select class="cst-section-type-sel" onchange="cstChangeType(this,' + idx + ',true)">' +
        '<option value="text" data-ko="주관식 입력" data-en="Open-ended Input">' + (isEn ? 'Open-ended Input' : '주관식 입력') + '</option>' +
        '<option value="single" data-ko="선택형 입력(단일선택)" data-en="Optional questions (Single)">' + (isEn ? 'Optional questions (Single)' : '선택형 입력(단일선택)') + '</option>' +
        '<option value="multi" data-ko="선택형 입력(복수선택)" data-en="Optional questions (Multiple)">' + (isEn ? 'Optional questions (Multiple)' : '선택형 입력(복수선택)') + '</option>' +
      '</select>' +
      '<label class="cst-section-req-wrap"><input type="checkbox" checked><span class="cst-section-req-mark">✓</span><span class="cst-section-req-text" data-ko="필수" data-en="Required">' + (isEn ? 'Required' : '필수') + '</span></label>' +
    '</td></tr>' +
    '<tr><td data-ko="제목" data-en="Title">' + (isEn ? 'Title' : '제목') + '</td><td><input type="text" class="cst-section-form-input"></td></tr>' +
  '</tbody></table>' +
  '<div class="cst-section-type-body"></div>';
  container.appendChild(div);
  cstInitDragDrop();
}

function cstAddClientQuestion() {
  var container = document.getElementById('cstSectionsContainer');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var idx = ++cstSectionIdx;
  var div = document.createElement('div');
  div.className = 'cst-section-item';
  div.dataset.secIdx = idx;
  div.setAttribute('draggable', 'true');
  div.innerHTML = _cstSectionHeader(
    '고객 질문', 'Client Questions',
    '동의서 서명 시 고객에게 질문하고 싶은 내용을 작성합니다.', 'List any questions you\'d like to ask the client when they sign the agreement.'
  ) +
  '<table class="cst-section-form"><tbody>' +
    '<tr><td data-ko="유형 선택" data-en="Type">' + (isEn ? 'Type' : '유형 선택') + '</td><td>' +
      '<select class="cst-section-type-sel" onchange="cstChangeType(this,' + idx + ',false)">' +
        '<option value="text" data-ko="주관식 질문" data-en="Open-ended Questions">' + (isEn ? 'Open-ended Questions' : '주관식 질문') + '</option>' +
        '<option value="single" data-ko="선택형 질문(단일선택)" data-en="Optional questions (Single)">' + (isEn ? 'Optional questions (Single)' : '선택형 질문(단일선택)') + '</option>' +
        '<option value="multi" data-ko="선택형 질문(복수선택)" data-en="Optional questions (Multiple)">' + (isEn ? 'Optional questions (Multiple)' : '선택형 질문(복수선택)') + '</option>' +
      '</select>' +
      '<label class="cst-section-req-wrap"><input type="checkbox" checked><span class="cst-section-req-mark">✓</span><span class="cst-section-req-text" data-ko="필수" data-en="Required">' + (isEn ? 'Required' : '필수') + '</span></label>' +
    '</td></tr>' +
    '<tr><td data-ko="질문" data-en="Question">' + (isEn ? 'Question' : '질문') + '</td><td><input type="text" class="cst-section-form-input"></td></tr>' +
  '</tbody></table>' +
  '<div class="cst-section-type-body"></div>';
  container.appendChild(div);
  cstInitDragDrop();
}

function cstDeleteSection(btn) {
  var item = btn.closest('.cst-section-item');
  if (item) item.remove();
}

function cstMoveSection(btn, dir) {
  var item = btn.closest('.cst-section-item');
  var container = document.getElementById('cstSectionsContainer');
  if (!item || !container) return;
  if (dir === 'up' && item.previousElementSibling) {
    container.insertBefore(item, item.previousElementSibling);
  } else if (dir === 'down' && item.nextElementSibling) {
    container.insertBefore(item.nextElementSibling, item);
  }
}

function cstPreviewForm() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var html = '';

  // 고객 정보
  var clientFields = [
    { id: null, ko: '고객명', en: 'Client Name', sampleKo: '홍길동', sampleEn: 'Ariana' },
    { id: null, ko: '휴대폰', en: 'Mobile', sampleKo: '010-1234-5678', sampleEn: '010-1234-5678' }
  ];
  var optFields = [
    { id: 'cstInfoTel', ko: '고객 번호', en: 'Client No.', sample: '001' },
    { id: 'cstInfoGrade', ko: '고객 등급', en: 'Client Grade', sample: 'VIP' },
    { id: 'cstInfoGroup', ko: '고객그룹', en: 'Client Group', sample: '' },
    { id: 'cstInfoBirth', ko: '생일', en: 'Birthday', sample: '' },
    { id: 'cstInfoAddr', ko: '주소', en: 'Address', sample: '' }
  ];
  optFields.forEach(function(f) {
    var el = document.getElementById(f.id);
    if (el && el.checked) clientFields.push(f);
  });

  html += '<div class="cst-pv-section">';
  html += '<div class="cst-pv-label">[' + (isEn ? 'Client Info' : '고객 정보') + ']</div>';
  clientFields.forEach(function(f) {
    var label = isEn ? f.en : f.ko;
    var sample = isEn ? (f.sampleEn || f.sample || '') : (f.sampleKo || f.sample || '');
    html += '<div class="cst-pv-field"><strong>' + label + '</strong> : ' + sample + '</div>';
  });
  html += '</div>';

  // 동적 섹션
  var container = document.getElementById('cstSectionsContainer');
  if (container) {
    container.querySelectorAll('.cst-section-item').forEach(function(item) {
      var nameEl = item.querySelector('.cst-section-name');
      var sectionType = nameEl ? (nameEl.dataset.ko || nameEl.textContent.trim()) : '';

      if (sectionType === '내용') {
        var ta = item.querySelector('.cst-section-textarea');
        var val = ta ? ta.value.trim() : '';
        if (val) {
          html += '<div class="cst-pv-section">';
          html += '<div class="cst-pv-content">' + val.replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</div>';
          html += '</div>';
        }
      } else if (sectionType === '매장 입력' || sectionType === '고객 질문') {
        var titleInput = item.querySelector('.cst-section-form-input');
        var titleVal = titleInput ? titleInput.value.trim() : '';
        var reqChk = item.querySelector('.cst-section-req-wrap input[type="checkbox"]');
        var isReq = reqChk ? reqChk.checked : false;
        var typeSel = item.querySelector('.cst-section-type-sel');
        var typeVal = typeSel ? typeSel.value : 'text';

        html += '<div class="cst-pv-section">';
        if (titleVal) {
          html += '<div class="cst-pv-field-title">' + (isReq ? '<span class="cst-pv-req">*</span> ' : '') + '<strong>' + titleVal + '</strong></div>';
        }

        if (typeVal === 'single' || typeVal === 'multi') {
          // 선택형 — 라디오 또는 체크박스
          var choiceArea = item.querySelector('.cst-choice-area');
          var inlineChk = item.querySelector('.cst-section-req-wrap input[type="checkbox"]:not(:first-child)');
          // 한줄씩 배치 여부 확인
          var lineByLineEl = item.querySelector('.cst-choice-inline-opt input[type="checkbox"]');
          var isLineByLine = lineByLineEl ? lineByLineEl.checked : false;
          var inputType = (typeVal === 'single') ? 'radio' : 'checkbox';

          if (choiceArea) {
            var opts = choiceArea.querySelectorAll('.cst-choice-row input[type="text"]');
            html += '<div class="cst-pv-choices' + (isLineByLine ? ' cst-pv-vertical' : '') + '">';
            opts.forEach(function(opt) {
              var v = opt.value.trim();
              if (v) {
                html += '<label class="cst-pv-opt"><input type="' + inputType + '" disabled> ' + v + '</label>';
              }
            });
            html += '</div>';
          }
        } else {
          // 주관식 — 입력 영역 표시
          html += '<div class="cst-pv-textarea-placeholder"></div>';
        }
        html += '</div>';
      }
    });
  }

  // 추가 옵션 표시
  var pvSigner = document.getElementById('cstOptSigner');
  var pvDownload = document.getElementById('cstOptDownload');
  if ((pvSigner && pvSigner.checked) || (pvDownload && pvDownload.checked)) {
    html += '<div class="cst-pv-section cst-pv-opts">';
    if (pvSigner && pvSigner.checked) {
      html += '<label class="cst-chk-label"><input type="checkbox" checked disabled><span class="cst-chk-mark">✓</span> <strong>' + (isEn ? 'Add Signer' : '동의자 추가') + '</strong></label>';
    }
    if (pvDownload && pvDownload.checked) {
      html += '<label class="cst-chk-label"><input type="checkbox" checked disabled><span class="cst-chk-mark">✓</span> <strong>' + (isEn ? 'Download after signing' : '고객 서명 후 동의서 다운로드') + '</strong></label>';
    }
    html += '</div>';
  }

  var modal = document.getElementById('cstFormPreviewModal');
  var body = document.getElementById('cstFormPreviewBody');
  if (modal && body) {
    body.innerHTML = html;
    modal.classList.add('show');
  }
}

function cstCloseFormPreview() {
  var modal = document.getElementById('cstFormPreviewModal');
  if (modal) modal.classList.remove('show');
}

function cstSaveForm() {
  var title = document.getElementById('cstRegTitleInput').value.trim();
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!title) {
    var inp = document.getElementById('cstRegTitleInput');
    if (inp) { inp.style.borderColor = '#E24B4A'; inp.focus(); setTimeout(function(){ inp.style.borderColor = ''; }, 2000); }
    return;
  }
  var now = new Date();
  var dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  var hasSigner = document.getElementById('cstOptSigner') && document.getElementById('cstOptSigner').checked;
  var hasDownload = document.getElementById('cstOptDownload') && document.getElementById('cstOptDownload').checked;
  // 섹션 데이터 수집
  var sections = [];
  var container = document.getElementById('cstSectionsContainer');
  if (container) {
    container.querySelectorAll('.cst-section-item').forEach(function(item) {
      var nameEl = item.querySelector('.cst-section-name');
      var sType = nameEl ? (nameEl.dataset.ko || nameEl.textContent.trim()) : '';
      if (sType === '내용') {
        var ta = item.querySelector('.cst-section-textarea');
        sections.push({ type: 'content', value: ta ? ta.value : '' });
      } else if (sType === '매장 입력' || sType === '고객 질문') {
        var titleInp = item.querySelector('.cst-section-form-input');
        var reqChk = item.querySelector('.cst-section-req-wrap input[type="checkbox"]');
        var typeSel = item.querySelector('.cst-section-type-sel');
        var sec = {
          type: sType === '매장 입력' ? 'input' : 'question',
          title: titleInp ? titleInp.value : '',
          required: reqChk ? reqChk.checked : false,
          selectType: typeSel ? typeSel.value : 'text'
        };
        if (sec.selectType === 'single' || sec.selectType === 'multi') {
          var lineChk = item.querySelector('.cst-choice-inline-opt input[type="checkbox"]');
          sec.lineByLine = lineChk ? lineChk.checked : false;
          sec.choices = [];
          var choiceInputs = item.querySelectorAll('.cst-choice-row input[type="text"]');
          choiceInputs.forEach(function(ci) { sec.choices.push(ci.value); });
        }
        sections.push(sec);
      }
    });
  }
  cstData.push({ title: title, date: dateStr, hasSigner: hasSigner, hasDownload: hasDownload, completed: 0, sections: sections });
  cstBackToList();
}
// ══ [FEAT-CONSENT-SETUP] END ══

// ══ [FEAT-DETAIL-RECEIPT-SETUP] 상세내역서 설정 ══

function openDetailReceiptSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  drsRefresh();
  if (currentLang === 'en') applyLang();
}

function drsToggle(name, checked) {
  var label = document.getElementById('drsLabel' + name);
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (label) label.textContent = checked ? (isEn ? 'Yes' : '예') : (isEn ? 'No' : '아니오');
  if (name === 'Msg') {
    var area = document.getElementById('drsExtraMsgArea');
    if (area) area.disabled = !checked;
  }
  drsRefreshPreview();
  drsAutoSave();
}

function drsAutoSave() {
  // 자동 저장 (스위치 변경 시 즉시 저장)
  var settings = {
    staff: document.getElementById('drsSwitchStaff') ? document.getElementById('drsSwitchStaff').checked : false,
    prepaid: document.getElementById('drsSwitchPrepaid') ? document.getElementById('drsSwitchPrepaid').checked : false,
    ticket: document.getElementById('drsSwitchTicket') ? document.getElementById('drsSwitchTicket').checked : false,
    point: document.getElementById('drsSwitchPoint') ? document.getElementById('drsSwitchPoint').checked : false,
    msg: document.getElementById('drsSwitchMsg') ? document.getElementById('drsSwitchMsg').checked : false,
    extraMsg: document.getElementById('drsExtraMsgArea') ? document.getElementById('drsExtraMsgArea').value : ''
  };
  console.log('[DRS] Auto-saved:', settings);
}

function drsRefreshPreview() {
  var staffOn = document.getElementById('drsSwitchStaff') && document.getElementById('drsSwitchStaff').checked;
  var ticketOn = document.getElementById('drsSwitchTicket') && document.getElementById('drsSwitchTicket').checked;
  var prepaidOn = document.getElementById('drsSwitchPrepaid') && document.getElementById('drsSwitchPrepaid').checked;
  var pointOn = document.getElementById('drsSwitchPoint') && document.getElementById('drsSwitchPoint').checked;
  var msgOn = document.getElementById('drsSwitchMsg') && document.getElementById('drsSwitchMsg').checked;

  // 담당자 표시
  document.querySelectorAll('.drs-rcpt-staff').forEach(function(el) {
    el.style.display = staffOn ? '' : 'none';
  });

  // 티켓 차감 섹션
  var previewTicket = document.getElementById('drsPreviewTicket');
  if (previewTicket) previewTicket.style.display = ticketOn ? '' : 'none';

  // 정액권 카드
  var prepaidCard = document.getElementById('drsPreviewPrepaidCard');
  if (prepaidCard) prepaidCard.style.display = prepaidOn ? '' : 'none';

  // 티켓 카드
  var ticketCard = document.getElementById('drsPreviewTicketCard');
  if (ticketCard) ticketCard.style.display = ticketOn ? '' : 'none';

  // 포인트 카드
  var pointCard = document.getElementById('drsPreviewPointCard');
  if (pointCard) pointCard.style.display = pointOn ? '' : 'none';

  // 회원권 및 포인트 정보 전체 영역
  var previewMem = document.getElementById('drsPreviewMem');
  var anyMem = prepaidOn || ticketOn || pointOn;
  if (previewMem) previewMem.style.display = anyMem ? '' : 'none';

  // 추가 문구
  var previewFooter = document.getElementById('drsPreviewFooter');
  if (previewFooter) {
    if (msgOn) {
      var area = document.getElementById('drsExtraMsgArea');
      previewFooter.textContent = area ? area.value : '';
      previewFooter.style.display = '';
    } else {
      previewFooter.style.display = 'none';
    }
  }
}

function drsRefresh() {
  // 매장명 동적 로드
  var navShopName = document.querySelector('.nav-shop-name');
  if (navShopName) {
    var shopName = navShopName.textContent.trim();
    var displayEl = document.getElementById('drsShopNameDisplay');
    if (displayEl) displayEl.textContent = shopName;
  }
  drsRefreshPreview();
}


// ══ [FEAT-DETAIL-RECEIPT-SETUP] END ══

// ══ [FEAT-ENV-SETUP] 환경설정 ══

function openEnvSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.remove('show');
  document.getElementById('envSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  if (currentLang === 'en') applyLang();
}

function envToggle(name, checked) {
  var label = document.getElementById('envLabel' + name);
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (label) label.textContent = checked ? (isEn ? 'Yes' : '예') : (isEn ? 'No' : '아니오');
  if (name === 'LoginAlarm') {
    if (checked) {
      document.getElementById('envPhoneModal').classList.add('show');
    }
  }
  if (name === 'NetmoneyAlarm') {
    if (checked) {
      document.getElementById('envNetmoneyModal').classList.add('show');
    }
  }
}

var _envPhoneSaved = false;
var _envNetmoneySaved = false;

function envClosePhoneModal() {
  document.getElementById('envPhoneModal').classList.remove('show');
  if (!_envPhoneSaved) {
    var sw = document.getElementById('envSwitchLoginAlarm');
    if (sw) { sw.checked = false; envToggle('LoginAlarm', false); }
  }
  _envPhoneSaved = false;
}

function envSavePhone() {
  _envPhoneSaved = true;
  document.getElementById('envPhoneModal').classList.remove('show');
}

function envCloseNetmoneyModal() {
  document.getElementById('envNetmoneyModal').classList.remove('show');
  if (!_envNetmoneySaved) {
    var sw = document.getElementById('envSwitchNetmoneyAlarm');
    if (sw) { sw.checked = false; envToggle('NetmoneyAlarm', false); }
  }
  _envNetmoneySaved = false;
}

function envSaveNetmoney() {
  _envNetmoneySaved = true;
  document.getElementById('envNetmoneyModal').classList.remove('show');
}

function envSave() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Saved.' : '저장되었습니다.');
}

// ══ [FEAT-ENV-SETUP] END ══

// ══ [FEAT-AHACALL-SETUP] 아하콜 서비스 ══
function openAhaCallSetup() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  if (currentLang === 'en') applyLang();
}

function openAhaCallHistory() {
  freezeGnb();
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('salesView').classList.remove('show');
  document.getElementById('revSummaryView').classList.remove('show');
  document.getElementById('salesHistoryView').classList.remove('show');
  document.getElementById('customerListView').classList.remove('show');
  document.getElementById('familyListView').classList.remove('show');
  document.getElementById('dupClientListView').classList.remove('show');
  document.getElementById('deletedClientView').classList.remove('show');
  document.getElementById('clientMgmtView').classList.remove('show');
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('serviceSetupView').classList.remove('show');
  document.getElementById('prepaidSetupView').classList.remove('show');
  document.getElementById('packageSetupView').classList.remove('show');
  document.getElementById('productSetupView').classList.remove('show');
  document.getElementById('productCatSetupView').classList.remove('show');
  document.getElementById('otherCodeSetupView').classList.remove('show');
  document.getElementById('pointSetupView').classList.remove('show');
  document.getElementById('consentSetupView').classList.remove('show');
  document.getElementById('detailReceiptSetupView').classList.remove('show');
  document.getElementById('envSetupView').classList.remove('show');
  document.getElementById('ahaCallSetupView').classList.remove('show');
  document.getElementById('ahaCallHistoryView').classList.add('show');
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  // 기본 날짜 설정 (오늘 기준 7일 전 ~ 오늘)
  var today = new Date();
  var weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  document.getElementById('achDateTo').value = today.toISOString().slice(0,10);
  document.getElementById('achDateFrom').value = weekAgo.toISOString().slice(0,10);
  // 초기 빈 테이블
  document.getElementById('achTotalCount').textContent = '0';
  document.getElementById('achTableBody').innerHTML = '<tr class="ach-empty-row"><td colspan="8">내역이 없습니다</td></tr>';
  if (currentLang === 'en') applyLang();
}
// ══ [FEAT-AHACALL-SETUP] END ══

// ══ [FEAT-AHACALL-HISTORY] 아하콜 수신 내역 ══
var _achSampleData = [
  { device:'phone', date:'2026-03-30 11:25', phone:'070-7737-4738', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-03-28 16:42', phone:'053-525-7175', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-03-26 11:08', phone:'053-961-2995', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-03-25 12:02', phone:'010-6431-9779', clientNo:'', clientName:'', checked:false, hasSms:true },
  { device:'phone', date:'2026-03-25 11:56', phone:'010-6431-9779', clientNo:'', clientName:'', checked:false, hasSms:true },
  { device:'phone', date:'2026-03-24 12:06', phone:'070-8997-4938', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-03-24 10:59', phone:'070-4768-8513', clientNo:'', clientName:'', checked:false }
];

var _achDeleteTarget = null;

function achSearch() {
  var tbody = document.getElementById('achTableBody');
  var from = document.getElementById('achDateFrom').value;
  var to = document.getElementById('achDateTo').value;
  var phoneFilter = document.getElementById('achPhoneSearch').value.trim();
  var deviceFilter = document.getElementById('achDeviceFilter').value;

  // 날짜 범위 1년 제한 검증 (오늘 기준 1년 이전 날짜 불가)
  if (from) {
    var today = new Date();
    today.setHours(0,0,0,0);
    var oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    var fromDate = new Date(from);
    if (fromDate < oneYearAgo) {
      var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
      achShowAlert(isEn ? 'Date must be within the last 1 year.' : '날짜는 최근 1년 이내만 가능합니다.');
      return;
    }
  }

  var filtered = _achSampleData.filter(function(r) {
    var d = r.date.slice(0,10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (phoneFilter && r.phone.replace(/-/g,'').indexOf(phoneFilter.replace(/-/g,'')) === -1) return false;
    if (deviceFilter && r.device !== deviceFilter) return false;
    return true;
  });

  document.getElementById('achTotalCount').textContent = filtered.length;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="ach-empty-row"><td colspan="8">' + (isEn ? 'No records found' : '내역이 없습니다') + '</td></tr>';
    return;
  }

  var html = '';
  filtered.forEach(function(r, idx) {
    var phoneRaw = r.phone.replace(/-/g,'');
    var deviceSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>';
    var checkClass = r.checked ? ' checked' : '';
    var checkSvg = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3L12.5 5"/></svg>';

    var smsBtnHtml = '';
    if (r.hasSms) {
      smsBtnHtml = '<button class="ach-icon-btn ach-icon-sms" onclick="achOpenSmsModal(\'' + r.phone + '\')" title="' + (isEn?'Send SMS':'문자발송') + '"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 6l8 5 8-5"/></svg></button>';
    }
    var callBtnHtml = '<button class="ach-icon-btn ach-icon-call" onclick="achOpenCallModal(\'' + phoneRaw + '\')" title="' + (isEn?'Call':'전화걸기') + '"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2h3.5l1 4.5L5 8.5c1.1 2.1 2.9 3.9 5 5l2-2.5L16.5 12V16a1 1 0 01-1 1A14 14 0 012 3a1 1 0 011-1z"/></svg></button>';

    var clientHtml = '';
    if (r.clientNo && r.clientName) {
      clientHtml = r.clientName;
    } else {
      clientHtml = '<div class="ach-client-cell"><span class="ach-unreg-label">' + (isEn?'Unregistered':'미등록 고객') + '</span><button class="ach-reg-btn" onclick="achOpenClientModal(\'' + r.phone + '\')">' + (isEn?'Register':'고객등록') + '</button></div>';
    }

    html += '<tr data-idx="' + idx + '">';
    var deviceLabel = r.device === 'mobile' ? (isEn ? 'Mobile AhaCall' : '휴대폰 아하콜') : (isEn ? 'PC AhaCall' : 'PC 아하콜');
    html += '<td><span class="ach-device-icon" data-tooltip="' + deviceLabel + '">' + deviceSvg + '</span></td>';
    html += '<td>' + r.date + '</td>';
    html += '<td><div class="ach-phone-cell"><button class="ach-check-btn' + checkClass + '" onclick="achToggleCheck(this)">' + checkSvg + '</button><span class="ach-phone-num">' + r.phone + '</span>' + smsBtnHtml + callBtnHtml + '</div></td>';
    html += '<td>' + (r.clientNo || '') + '</td>';
    html += '<td>' + clientHtml + '</td>';
    html += '<td><button class="ach-tbl-btn" onclick="achBooking()" title="' + (isEn?'Book':'예약') + '">→</button></td>';
    html += '<td><button class="ach-tbl-btn" onclick="achSales()" title="' + (isEn?'Sales':'영업') + '">→</button></td>';
    html += '<td><button class="ach-tbl-btn danger" onclick="achOpenDeleteModal(' + idx + ')">' + (isEn?'Delete':'삭제') + '</button></td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
  if (currentLang === 'en') applyLang();
}

function achToggleCheck(btn) {
  btn.classList.toggle('checked');
}

// 전화걸기 모달
function achOpenCallModal(phone) {
  document.getElementById('achCallPhone').value = phone;
  document.getElementById('achCallModal').classList.add('show');
}
function achCloseCallModal() {
  document.getElementById('achCallModal').classList.remove('show');
}
function achDial() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Dialing...' : '전화를 걸고 있습니다...');
}
function achHangup() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Call ended.' : '전화를 끊었습니다.');
  achCloseCallModal();
}

// 문자발송 모달
function achOpenSmsModal(phone) {
  document.getElementById('achSmsPhone').textContent = phone;
  document.getElementById('achSmsContent').value = '';
  document.getElementById('achSmsBytes').textContent = '0';
  document.getElementById('achSmsModal').classList.add('show');
}
function achCloseSmsModal() {
  document.getElementById('achSmsModal').classList.remove('show');
}
function achSendSms() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Message sent.' : '문자가 발송되었습니다.');
  achCloseSmsModal();
}

// 고객등록 모달
function achOpenClientModal(phone) {
  // 기존 고객등록 팝업 재사용
  var popup = document.getElementById('custRegPopup');
  if (popup) {
    // 전화번호 자동 입력
    var phoneInput = document.getElementById('cregPhone');
    if (phoneInput) phoneInput.value = phone ? phone.replace(/-/g,'') : '';
    popup.style.display = 'flex';
  }
}

// 삭제 모달
function achOpenDeleteModal(idx) {
  _achDeleteTarget = idx;
  document.getElementById('achDeleteModal').classList.add('show');
}
function achCloseDeleteModal() {
  document.getElementById('achDeleteModal').classList.remove('show');
  _achDeleteTarget = null;
}
function achConfirmDelete() {
  if (_achDeleteTarget !== null) {
    _achSampleData.splice(_achDeleteTarget, 1);
    achSearch();
  }
  achCloseDeleteModal();
}

// 알림 팝업
function achShowAlert(msg) {
  var el = document.getElementById('achAlertModal');
  if (!el) return;
  document.getElementById('achAlertMsg').innerHTML = msg;
  el.classList.add('show');
}
function achCloseAlert() {
  document.getElementById('achAlertModal').classList.remove('show');
}

// 예약/영업 버튼
function achBooking() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Booking feature.' : '예약 기능입니다.');
}
function achSales() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Sales feature.' : '영업 기능입니다.');
}

// 문자 바이트 카운트
document.addEventListener('DOMContentLoaded', function() {
  var ta = document.getElementById('achSmsContent');
  if (ta) {
    ta.addEventListener('input', function() {
      var bytes = 0;
      for (var i = 0; i < ta.value.length; i++) {
        bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
      }
      document.getElementById('achSmsBytes').textContent = bytes;
    });
  }
});
// ══ [FEAT-AHACALL-HISTORY] END ══

// ══════════════════════════════════════════
// [VIEW-12] 고객 관리 / 문자 발송 (cm)
// ══════════════════════════════════════════

var cmCurrentCategory = 'all';

function hideAllViews() {
  document.getElementById('appBody').style.display = 'none';
  document.getElementById('homeView').style.display = 'none';
  var viewIds = [
    'salesView','revSummaryView','salesHistoryView',
    'customerListView','familyListView','dupClientListView','deletedClientView',
    'clientMgmtView','serviceSetupView','prepaidSetupView','packageSetupView',
    'productSetupView','productCatSetupView','otherCodeSetupView',
    'pointSetupView','consentSetupView','detailReceiptSetupView',
    'envSetupView','ahaCallSetupView','ahaCallHistoryView','noticeListView'
  ];
  viewIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
}

function openClientMgmt() {
  freezeGnb();
  hideAllViews();
  document.getElementById('clientMgmtView').classList.add('show');
  // 메인 카드 그리드로 리셋
  document.getElementById('cmMain').style.display = '';
  document.getElementById('cmSearchView').style.display = 'none';
  document.getElementById('cmResultView').style.display = 'none';
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// 카테고리별 설정
var cmCategories = {
  all:          { ko: '전체 고객',        en: 'All Clients' },
  dormant:      { ko: '휴면고객',         en: 'Dormant Clients' },
  byService:    { ko: '판매 서비스별 고객', en: 'Clients by Sales Service' },
  byProduct:    { ko: '판매 제품별 고객',  en: 'Clients by Sales Product' },
  byAmount:     { ko: '판매 금액별 고객',  en: 'Clients by Sales Amount' },
  membership:   { ko: '회원권 보유 고객',  en: 'Clients with Prepaid Goods' },
  prepaid:      { ko: '정액권별 고객',     en: 'Clients by Prepaid Card' },
  ticket:       { ko: '티켓별 고객',       en: 'Clients by Prepaid Service' },
  noMembership: { ko: '회원권 미보유 고객', en: 'Clients with no Prepaid Goods' },
  birthday:     { ko: '생일 고객',        en: 'Birthday Clients' },
  referral:     { ko: '소개 고객',        en: 'Recommended Clients' }
};

// ── 메뉴별 테이블 컬럼 설정 ──
var cmAllColumns = {
  name:           { ko:'고객명',       en:'Client Name' },
  phone:          { ko:'휴대폰 번호',  en:'Mobile Number' },
  lastVisit:      { ko:'최근 방문일',  en:'Recent Visit Date' },
  grade:          { ko:'고객 등급',    en:'Client Rating' },
  staff:          { ko:'담당자',       en:'Preferred Staff' },
  totalSales:     { ko:'총 판매액',    en:'Total Sales', cls:'cm-td-amount' },
  visitRoute:     { ko:'방문 경로',    en:'Referral Source' },
  periodSales:    { ko:'기간 판매 합계', en:'Period Sales Total', cls:'cm-td-amount' },
  prepaid:        { ko:'정액권',       en:'Prepaid Cards' },
  prepaidBalance: { ko:'정액권 잔액',  en:'Balance', cls:'cm-td-amount' },
  expiry:         { ko:'만료일',       en:'Expiry Date' },
  firstVisit:     { ko:'첫 방문일',    en:'First Visit Date' },
  visitCount:     { ko:'방문횟수',     en:'Number of Visits' },
  regDate:        { ko:'등록일',       en:'Registered Date' },
  referrer:       { ko:'소개한 고객 / 휴대폰 번호', en:'Recommender Name / Mobile Number' },
  points:         { ko:'포인트',       en:'Points' },
  membership:     { ko:'회원권',        en:'Prepaid Goods' },
  memberBalance:  { ko:'정액권 잔액/잔여횟수', en:'Balance/Qty' },
  ticket:         { ko:'티켓',         en:'Prepaid Service' },
  ticketRemain:   { ko:'잔여 횟수',    en:'Quantity' },
  birthday:       { ko:'생일',         en:'Birthday' },
  memo:           { ko:'메모',         en:'Notes' },
  gender:         { ko:'성별',         en:'Gender' },
  avgSpend:       { ko:'객단가',       en:'Average Revenue per Sales', cls:'cm-td-amount' },
  clientNumber:   { ko:'고객번호',     en:'Client No.' },
  group:          { ko:'고객그룹',     en:'Client Group' },
  address:        { ko:'주소',         en:'Address' },
  referralCount:  { ko:'추천 고객 수', en:'Number of Recommendations' }
};

var cmBaseColumns = {
  all:          ['name','phone','lastVisit','grade','staff','totalSales'],
  dormant:      ['name','phone','lastVisit','totalSales','prepaidBalance','points'],
  byService:    ['name','phone','lastVisit','totalSales','staff','visitRoute'],
  byProduct:    ['name','phone','lastVisit','totalSales','staff','visitRoute'],
  byAmount:     ['name','phone','lastVisit','grade','periodSales'],
  membership:   ['name','phone','lastVisit','membership','memberBalance','expiry'],
  prepaid:      ['name','phone','lastVisit','prepaid','prepaidBalance','expiry'],
  ticket:       ['name','phone','lastVisit','ticket','ticketRemain','expiry'],
  noMembership: ['name','phone','lastVisit','firstVisit','visitCount','totalSales'],
  birthday:     ['name','phone','lastVisit','birthday','grade','totalSales'],
  referral:     ['regDate','name','phone','referrer']
};

// 상세 검색 체크 → 추가되는 컬럼 매핑 (기존 검색 폼 ID 사용)
var cmAdvColumnMap = {
  cmChkStaff:          'staff',
  cmChkVisitRoute:     'visitRoute',
  cmChkGrade:          'grade',
  cmChkNumber:         'clientNumber',
  cmChkGroup:          'group',
  cmChkGender:         'gender',
  cmChkAddress:        'address',
  cmChkBirthday:       'birthday',
  cmChkMemo:           'memo',
  cmChkSmsOpt:         null,
  cmChkNoNumber:       null,
  cmChkRegDate:        'regDate',
  cmChkFirstVisit:     'firstVisit',
  cmChkPoints:         'points',
  cmChkLastVisit:      null,
  cmChkPrepaidBalance: 'prepaidBalance',
  cmChkAvgSpend:       'avgSpend',
  cmChkReferralCount:  'referralCount',
  cmChkTotalSales:     'totalSales',
  cmChkTotalVisits:    'visitCount'
};

// 판매 금액별 고객 전용 노트
var cmNotes = {
  byAmount: { ko:'* 기간 판매 합계: 조회 기간 동안의 판매 금액 합계', en:'* Period Sales: Total sales during the inquiry period' }
};

// ── 고객 마스터 데이터 (고객 목록에서 추출) ──
var cmMasterClients = [
  { regDate:'2026-03-19', no:45, name:'김하늘', phone:'010-9876-5432', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:0, memo:'', lastVisit:'2026-03-19', firstVisit:'2026-03-19', visitCount:1, gender:'', birthday:'', address:'', points:0, avgSpend:0 },
  { regDate:'2026-02-06', no:44, name:'박서연', phone:'010-5555-1234', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:0, memo:'', lastVisit:'2026-02-06', firstVisit:'2024-09-12', visitCount:2, gender:'', birthday:'', address:'', points:0, avgSpend:0 },
  { regDate:'2025-12-15', no:43, name:'이수진', phone:'010-3456-7890', grade:'', group:'', staff:'Suji', prepaidBalance:0, totalSales:850000, memo:'', lastVisit:'2025-12-15', firstVisit:'2025-01-15', visitCount:3, gender:'여성', birthday:'', address:'', points:0, avgSpend:283333 },
  { regDate:'2025-12-10', no:42, name:'최윤서', phone:'010-2222-3333', grade:'', group:'', staff:'Jenny', prepaidBalance:800000, totalSales:2450000, memo:'커트+염색 선호', lastVisit:'2025-12-10', firstVisit:'2024-05-10', visitCount:5, gender:'여성', birthday:'', address:'', points:0, avgSpend:490000 },
  { regDate:'2025-11-28', no:41, name:'이지은', phone:'010-8765-4321', grade:'', group:'', staff:'Suji', prepaidBalance:1100000, totalSales:3850000, memo:'정기방문 고객', lastVisit:'2025-11-28', firstVisit:'2024-07-30', visitCount:8, gender:'여성', birthday:'', address:'', points:0, avgSpend:481250 },
  { regDate:'2025-11-15', no:40, name:'정민지', phone:'010-1111-9999', grade:'VVIP', group:'', staff:'Jimmy', prepaidBalance:0, totalSales:1200000, memo:'', lastVisit:'2025-11-15', firstVisit:'2024-12-05', visitCount:4, gender:'여성', birthday:'', address:'', points:0, avgSpend:300000 },
  { regDate:'2025-10-22', no:39, name:'김세나', phone:'019-8000-9000', grade:'Gold', group:'', staff:'Jenny', prepaidBalance:0, totalSales:1680000, memo:'', lastVisit:'2025-10-22', firstVisit:'2024-08-25', visitCount:6, gender:'여성', birthday:'', address:'', points:0, avgSpend:280000 },
  { regDate:'2025-10-09', no:38, name:'한소희', phone:'010-4444-5555', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:320000, memo:'두피 민감', lastVisit:'2025-10-09', firstVisit:'2024-11-20', visitCount:3, gender:'여성', birthday:'', address:'', points:0, avgSpend:106667 },
  { regDate:'2025-09-18', no:37, name:'오서준', phone:'010-6666-7777', grade:'', group:'', staff:'Suji', prepaidBalance:250000, totalSales:980000, memo:'', lastVisit:'2025-09-18', firstVisit:'2024-10-08', visitCount:4, gender:'남성', birthday:'', address:'', points:0, avgSpend:245000 },
  { regDate:'2025-08-30', no:36, name:'윤채원', phone:'010-2233-4455', grade:'Gold', group:'', staff:'Jenny', prepaidBalance:500000, totalSales:3950000, memo:'클리닉 + 커트 세트 선호', lastVisit:'2025-08-30', firstVisit:'2024-06-18', visitCount:10, gender:'여성', birthday:'', address:'', points:0, avgSpend:395000 },
  { regDate:'2025-08-12', no:35, name:'장유진', phone:'010-6677-8899', grade:'VVIP', group:'', staff:'Jenny', prepaidBalance:3200000, totalSales:12500000, memo:'풀케어 정기 고객, 항상 오전 선호', lastVisit:'2025-08-12', firstVisit:'2024-01-05', visitCount:20, gender:'여성', birthday:'', address:'서울', points:5000, avgSpend:625000 },
  { regDate:'2025-07-20', no:34, name:'송다은', phone:'010-4321-8765', grade:'', group:'', staff:'Suji', prepaidBalance:0, totalSales:980000, memo:'레이어드컷만', lastVisit:'2025-07-20', firstVisit:'2025-07-20', visitCount:2, gender:'여성', birthday:'', address:'', points:0, avgSpend:490000 },
  { regDate:'2025-07-05', no:33, name:'백서현', phone:'010-7777-2345', grade:'Gold', group:'', staff:'Jimmy', prepaidBalance:150000, totalSales:2340000, memo:'셋팅펌 위주, 볼륨 원함', lastVisit:'2025-07-05', firstVisit:'2024-03-15', visitCount:7, gender:'여성', birthday:'', address:'', points:0, avgSpend:334286 },
  { regDate:'2025-06-15', no:32, name:'임하준', phone:'010-8888-1111', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:450000, memo:'', lastVisit:'2025-06-15', firstVisit:'2025-06-15', visitCount:1, gender:'남성', birthday:'', address:'', points:0, avgSpend:450000 },
  { regDate:'2025-06-01', no:31, name:'권나연', phone:'010-3333-6666', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:0, memo:'', lastVisit:'', firstVisit:'', visitCount:0, gender:'여성', birthday:'', address:'', points:0, avgSpend:0 },
  { regDate:'2025-05-20', no:30, name:'조예린', phone:'010-1234-5678', grade:'', group:'', staff:'Jenny', prepaidBalance:0, totalSales:2100000, memo:'매직 스트레이트 선호', lastVisit:'2025-05-20', firstVisit:'2024-11-10', visitCount:5, gender:'여성', birthday:'', address:'', points:0, avgSpend:420000 },
  { regDate:'2025-05-05', no:29, name:'강지호', phone:'010-9999-0000', grade:'', group:'', staff:'Suji', prepaidBalance:450000, totalSales:1650000, memo:'', lastVisit:'2025-05-05', firstVisit:'2024-09-20', visitCount:6, gender:'남성', birthday:'', address:'', points:0, avgSpend:275000 },
  { regDate:'2025-04-18', no:28, name:'신미래', phone:'010-7654-3210', grade:'Gold', group:'', staff:'Jimmy', prepaidBalance:0, totalSales:4200000, memo:'탈색 이력 있음', lastVisit:'2025-04-18', firstVisit:'2024-02-14', visitCount:12, gender:'여성', birthday:'', address:'', points:0, avgSpend:350000 },
  { regDate:'2025-04-01', no:27, name:'류하은', phone:'010-5432-1098', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:380000, memo:'', lastVisit:'2025-04-01', firstVisit:'2025-04-01', visitCount:1, gender:'여성', birthday:'', address:'', points:0, avgSpend:380000 },
  { regDate:'2025-03-22', no:26, name:'문태경', phone:'010-2468-1357', grade:'', group:'', staff:'Jenny', prepaidBalance:0, totalSales:1850000, memo:'단발 선호', lastVisit:'2025-03-22', firstVisit:'2024-06-05', visitCount:7, gender:'여성', birthday:'', address:'', points:0, avgSpend:264286 },
  { regDate:'2025-03-10', no:25, name:'황보윤', phone:'010-1357-2468', grade:'VVIP', group:'', staff:'Suji', prepaidBalance:1500000, totalSales:8500000, memo:'', lastVisit:'2025-03-10', firstVisit:'2023-11-20', visitCount:18, gender:'여성', birthday:'', address:'서울', points:10000, avgSpend:472222 },
  { regDate:'2025-02-20', no:24, name:'김하늘', phone:'010-8888-7777', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:120000, memo:'', lastVisit:'2025-02-20', firstVisit:'2025-02-20', visitCount:1, gender:'', birthday:'', address:'', points:0, avgSpend:120000 },
  { regDate:'2025-01-15', no:23, name:'이수진', phone:'010-3456-7890', grade:'', group:'', staff:'Jenny', prepaidBalance:0, totalSales:450000, memo:'', lastVisit:'2025-01-15', firstVisit:'2025-01-15', visitCount:2, gender:'여성', birthday:'', address:'', points:0, avgSpend:225000 },
  { regDate:'2024-12-05', no:22, name:'정민지', phone:'010-1111-9999', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:300000, memo:'', lastVisit:'2024-12-05', firstVisit:'2024-12-05', visitCount:1, gender:'여성', birthday:'', address:'', points:0, avgSpend:300000 },
  { regDate:'2024-11-20', no:21, name:'한소희', phone:'010-4444-5555', grade:'', group:'', staff:'Suji', prepaidBalance:200000, totalSales:560000, memo:'', lastVisit:'2024-11-20', firstVisit:'2024-11-20', visitCount:2, gender:'여성', birthday:'', address:'', points:0, avgSpend:280000 },
  { regDate:'2024-10-08', no:20, name:'오서준', phone:'010-6666-7777', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:0, memo:'', lastVisit:'', firstVisit:'', visitCount:0, gender:'남성', birthday:'', address:'', points:0, avgSpend:0 },
  { regDate:'2024-09-12', no:19, name:'박서연', phone:'010-5555-1234', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:180000, memo:'', lastVisit:'2024-09-12', firstVisit:'2024-09-12', visitCount:1, gender:'', birthday:'', address:'', points:0, avgSpend:180000 },
  { regDate:'2024-08-25', no:18, name:'김세나', phone:'019-8000-9000', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:95000, memo:'', lastVisit:'2024-08-25', firstVisit:'2024-08-25', visitCount:1, gender:'여성', birthday:'', address:'', points:0, avgSpend:95000 },
  { regDate:'2024-07-30', no:17, name:'이지은', phone:'010-8765-4321', grade:'', group:'', staff:'Jenny', prepaidBalance:0, totalSales:720000, memo:'', lastVisit:'2024-07-30', firstVisit:'2024-07-30', visitCount:2, gender:'여성', birthday:'', address:'', points:0, avgSpend:360000 },
  { regDate:'2024-06-18', no:16, name:'윤채원', phone:'010-2233-4455', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:2100000, memo:'', lastVisit:'2024-06-18', firstVisit:'2024-06-18', visitCount:3, gender:'여성', birthday:'', address:'', points:0, avgSpend:700000 },
  { regDate:'2024-05-10', no:15, name:'최윤서', phone:'010-2222-3333', grade:'', group:'', staff:'', prepaidBalance:0, totalSales:380000, memo:'', lastVisit:'2024-05-10', firstVisit:'2024-05-10', visitCount:1, gender:'여성', birthday:'', address:'', points:0, avgSpend:380000 }
];

// ── 고객 마스터에서 검색 조건으로 필터링 ──
function cmFilterClients(cat) {
  var result = cmMasterClients.slice();
  var advOn = document.getElementById('cmAdvToggle') && document.getElementById('cmAdvToggle').checked;

  // 상세 검색 필터 적용
  if (advOn) {
    var chk, el;
    // 담당자
    chk = document.getElementById('cmChkStaff');
    if (chk && chk.checked) {
      el = document.getElementById('cmStaff');
      var sv = el ? el.options[el.selectedIndex].text : '';
      if (sv && sv !== '전체' && sv !== 'All') {
        if (sv === '담당자 없음' || sv === 'No Staff') result = result.filter(function(c) { return !c.staff; });
        else result = result.filter(function(c) { return c.staff === sv || c.staff.toLowerCase() === sv.toLowerCase(); });
      }
    }
    // 고객 등급
    chk = document.getElementById('cmChkGrade');
    if (chk && chk.checked) {
      el = document.getElementById('cmGrade');
      var gv = el ? el.options[el.selectedIndex].text : '';
      if (gv && gv !== '전체' && gv !== 'All') {
        if (gv === '고객 등급 없음' || gv === 'None') result = result.filter(function(c) { return !c.grade; });
        else result = result.filter(function(c) { return c.grade === gv; });
      }
    }
    // 성별
    chk = document.getElementById('cmChkGender');
    if (chk && chk.checked) {
      el = document.getElementById('cmGender');
      var genv = el ? el.options[el.selectedIndex].text : '';
      if (genv && genv !== '전체' && genv !== 'All') {
        if (genv === '성별 없음' || genv === 'None') result = result.filter(function(c) { return !c.gender; });
        else result = result.filter(function(c) { return c.gender === genv; });
      }
    }
    // 메모
    chk = document.getElementById('cmChkMemo');
    if (chk && chk.checked) {
      el = document.getElementById('cmMemo');
      var mv = el ? el.value.trim() : '';
      if (mv) result = result.filter(function(c) { return c.memo && c.memo.indexOf(mv) !== -1; });
      else result = result.filter(function(c) { return !!c.memo; });
    }
    // 주소
    chk = document.getElementById('cmChkAddress');
    if (chk && chk.checked) {
      el = document.getElementById('cmAddress');
      var adv = el ? el.value.trim() : '';
      if (adv) result = result.filter(function(c) { return c.address && c.address.indexOf(adv) !== -1; });
    }
    // 총 판매액
    chk = document.getElementById('cmChkTotalSales');
    if (chk && chk.checked) {
      var tsf = document.getElementById('cmTotalSalesFrom'), tst = document.getElementById('cmTotalSalesTo');
      var tsMin = tsf ? parseInt(tsf.value.replace(/,/g,'')) || 0 : 0;
      var tsMax = tst ? parseInt(tst.value.replace(/,/g,'')) || Infinity : Infinity;
      result = result.filter(function(c) { return c.totalSales >= tsMin && c.totalSales <= tsMax; });
    }
    // 방문 경로 - 데이터에 없으므로 스킵
    // 고객그룹 - 데이터에 없으므로 스킵
  }

  return result;
}

// 숫자 포맷
function cmFmtNum(n) {
  if (!n && n !== 0) return '';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function cmOpenCategory(cat) {
  cmCurrentCategory = cat;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var info = cmCategories[cat] || cmCategories.all;

  // 기존 검색뷰 타이틀 설정 (호환성)
  var titleEl = document.getElementById('cmSearchPanelTitle');
  if (titleEl) {
    titleEl.textContent = isEn ? info.en : info.ko;
    titleEl.setAttribute('data-ko', info.ko);
    titleEl.setAttribute('data-en', info.en);
  }

  // 기존 검색뷰 필터 빌드 (호환성)
  var filterHtml = cmBuildCategoryFilter(cat, isEn);
  var catFilters = document.getElementById('cmCategoryFilters');
  if (catFilters) catFilters.innerHTML = filterHtml;

  // 정액권/티켓 초기 상태 적용
  if (cat === 'prepaid') { cmPopulatePrepaidCards(); cmTogglePrepaidExpiry(); }
  if (cat === 'ticket') cmToggleTicketExpiry();

  // 안내 메시지 표시 여부
  var guideEl = document.getElementById('cmSearchGuide');
  if (guideEl) guideEl.style.display = (cat === 'all') ? '' : 'none';

  // 기존 상세 검색 리셋
  var advToggle = document.getElementById('cmAdvToggle');
  if (advToggle) { advToggle.checked = false; }
  var advPanel = document.getElementById('cmAdvancedPanel');
  if (advPanel) advPanel.style.display = 'none';
  cmResetAdvancedFields();

  // 생일 고객 특수 처리: 상세검색 자동 체크 + 생일 이번달
  if (cat === 'birthday') {
    if (advToggle) {
      advToggle.checked = true;
      if (advPanel) advPanel.style.display = '';
      var chk = document.getElementById('cmChkBirthday');
      if (chk) { chk.checked = true; cmToggleField(chk); }
      var today = new Date();
      var m = today.getMonth() + 1;
      var lastDay = new Date(today.getFullYear(), m, 0).getDate();
      var el = document.getElementById('cmBirthM1'); if(el) el.value = m;
      el = document.getElementById('cmBirthD1'); if(el) el.value = 1;
      el = document.getElementById('cmBirthM2'); if(el) el.value = m;
      el = document.getElementById('cmBirthD2'); if(el) el.value = lastDay;
    }
  }

  // 뷰 전환: 검색 폼 페이지로 이동
  document.getElementById('cmMain').style.display = 'none';
  document.getElementById('cmSearchView').style.display = '';
  document.getElementById('cmResultView').style.display = 'none';
}

function cmBuildCategoryFilter(cat, isEn) {
  var today = new Date().toISOString().split('T')[0];
  var monthStart = today.substring(0, 8) + '01';

  switch(cat) {
    case 'dormant':
      return '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.no_visit" data-ko="미 방문" data-en="Not visited more than">' + (isEn ? 'Not visited more than' : '미 방문') + '</label>' +
        '<input type="text" class="cm-input cm-input-sm" id="cmDormantDays" oninput="cmFormatNumberInput(this)">' +
        '<span data-i18n="cm.days_more" data-ko="일 이상" data-en="days">' + (isEn ? 'days' : '일 이상') + '</span>' +
        '</div>';

    case 'byService':
      var svcCatOpts = '<option data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option>';
      Object.keys(svServiceData).forEach(function(catName) {
        svcCatOpts += '<option value="' + catName + '">' + catName + '</option>';
      });
      return '<div class="cm-cat-filter-row">' +
        '<label data-ko="기간" data-en="Date Range">' + (isEn ? 'Date Range' : '기간') + '</label>' +
        '<input type="date" class="cm-input-date" id="cmSvcDateFrom" value="' + monthStart + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input-date" id="cmSvcDateTo" value="' + today + '">' +
        '<label data-ko="서비스" data-en="Service" style="margin-left:16px;">' + (isEn ? 'Service' : '서비스') + '</label>' +
        '<select id="cmSvcCat" onchange="cmSvcCatChange()">' + svcCatOpts + '</select>' +
        '<select id="cmSvcItem" disabled><option data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option></select>' +
        '</div>';

    case 'byProduct':
      var prodCatOpts = '<option value="" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option>';
      prdCats.forEach(function(c) { prodCatOpts += '<option value="' + c + '">' + c + '</option>'; });
      return '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.period" data-ko="기간" data-en="Date Range">' + (isEn ? 'Date Range' : '기간') + '</label>' +
        '<input type="date" class="cm-input cm-input-date" id="cmProdDateFrom" value="' + monthStart + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmProdDateTo" value="' + today + '">' +
        '<label data-i18n="cm.product" data-ko="제품" data-en="Product" style="margin-left:16px;">' + (isEn ? 'Product' : '제품') + '</label>' +
        '<select class="cm-select" id="cmProdCat" onchange="cmProdCatChange()">' + prodCatOpts + '</select>' +
        '<select class="cm-select" id="cmProdItem" disabled style="opacity:0.4;"><option value="" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option></select>' +
        '</div>';

    case 'byAmount':
      return '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.period" data-ko="기간" data-en="Date Range">' + (isEn ? 'Date Range' : '기간') + '</label>' +
        '<input type="date" class="cm-input cm-input-date" id="cmAmtDateFrom" value="' + monthStart + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmAmtDateTo" value="' + today + '">' +
        '<label data-i18n="cm.sales_amount" data-ko="판매액" data-en="Sales Amount" style="margin-left:16px;">' + (isEn ? 'Sales Amount' : '판매액') + '</label>' +
        '<input type="text" class="cm-input cm-input-sm" id="cmAmtFrom"> <span class="cm-tilde">~</span> <input type="text" class="cm-input cm-input-sm" id="cmAmtTo">' +
        '<label class="cm-chk-label" style="margin-left:8px;"><input type="checkbox" id="cmAmtIncProduct" checked><span class="cm-checkmark">✓</span> <span data-i18n="cm.inc_product" data-ko="제품 포함" data-en="Include Products">' + (isEn ? 'Include Products' : '제품 포함') + '</span></label>' +
        '</div>';

    case 'membership':
      return '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.membership_type" data-ko="회원권" data-en="Prepaid Goods">' + (isEn ? 'Prepaid Goods' : '회원권') + '</label>' +
        '<label class="cm-radio"><input type="radio" name="cmMemType" value="all" checked> <span data-i18n="common.all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmMemType" value="prepaid"> <span data-i18n="cm.prepaid_card" data-ko="정액권" data-en="Prepaid Card">' + (isEn ? 'Prepaid Card' : '정액권') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmMemType" value="ticket"> <span data-i18n="cm.ticket" data-ko="티켓" data-en="Prepaid Service">' + (isEn ? 'Prepaid Service' : '티켓') + '</span></label>' +
        '<label class="cm-chk-label" style="margin-left:16px;"><input type="checkbox" id="cmMemFamily" checked><span class="cm-checkmark">✓</span> <span data-i18n="cm.inc_family" data-ko="가족 회원권 포함" data-en="Include Family Prepaid Goods">' + (isEn ? 'Include Family Prepaid Goods' : '가족 회원권 포함') + '</span></label>' +
        '</div>';

    case 'prepaid':
      return '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.sale_date" data-ko="판매일" data-en="Sales Date">' + (isEn ? 'Sales Date' : '판매일') + '</label>' +
        '<label class="cm-radio"><input type="radio" name="cmPrepaidDate" value="all" checked onchange="cmTogglePrepaidDateRange()"> <span data-i18n="common.all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmPrepaidDate" value="period" onchange="cmTogglePrepaidDateRange()"> <span data-i18n="cm.period" data-ko="기간" data-en="Date Range">' + (isEn ? 'Date Range' : '기간') + '</span></label>' +
        '<span id="cmPrepaidDateRange" style="display:none;margin-left:8px;">' +
        '<input type="date" class="cm-input cm-input-date" id="cmPrepaidSaleDateFrom" value="' + today + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmPrepaidSaleDateTo" value="' + today + '">' +
        '</span>' +
        '</div>' +
        '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.expiry" data-ko="만료일" data-en="Expiry Date">' + (isEn ? 'Expiry Date' : '만료일') + '</label>' +
        '<input type="date" class="cm-input cm-input-date" id="cmPrepaidExpFrom" value="' + today + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmPrepaidExpTo" value="' + today + '">' +
        '<label class="cm-chk-label" style="margin-left:8px;"><input type="checkbox" id="cmPrepaidNoLimit" checked onchange="cmTogglePrepaidExpiry()"><span class="cm-checkmark">✓</span> <span data-i18n="cm.unlimited" data-ko="무제한" data-en="Unlimited">' + (isEn ? 'Unlimited' : '무제한') + '</span></label>' +
        '<label style="margin-left:16px;" data-i18n="cm.prepaid_balance_range" data-ko="정액권별 잔액" data-en="Balance by Prepaid Card">' + (isEn ? 'Balance by Prepaid Card' : '정액권별 잔액') + '</label>' +
        '<input type="text" class="cm-input cm-input-sm" id="cmPrepaidBalFrom"> <span class="cm-tilde">~</span> <input type="text" class="cm-input cm-input-sm" id="cmPrepaidBalTo">' +
        '</div>' +
        '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.prepaid_card" data-ko="정액권" data-en="Prepaid Card">' + (isEn ? 'Prepaid Card' : '정액권') + '</label>' +
        '<select class="cm-select" id="cmPrepaidCard"><option data-i18n="common.all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option></select>' +
        '<label class="cm-chk-label" style="margin-left:8px;"><input type="checkbox" id="cmPrepaidShowUnused"><span class="cm-checkmark">✓</span> <span data-i18n="cm.show_unused" data-ko="미사용 보기" data-en="Show Inactive">' + (isEn ? 'Show Inactive' : '미사용 보기') + '</span></label>' +
        '</div>';

    case 'ticket':
      return '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.sale_date" data-ko="판매일" data-en="Sales Date">' + (isEn ? 'Sales Date' : '판매일') + '</label>' +
        '<label class="cm-radio"><input type="radio" name="cmTicketDate" value="all" checked onchange="cmToggleTicketDateRange()"> <span data-i18n="common.all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmTicketDate" value="period" onchange="cmToggleTicketDateRange()"> <span data-i18n="cm.period" data-ko="기간" data-en="Date Range">' + (isEn ? 'Date Range' : '기간') + '</span></label>' +
        '<span id="cmTicketDateRange" style="display:none;margin-left:8px;">' +
        '<input type="date" class="cm-input cm-input-date" id="cmTicketSaleDateFrom" value="' + today + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmTicketSaleDateTo" value="' + today + '">' +
        '</span>' +
        '</div>' +
        '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.expiry" data-ko="만료일" data-en="Expiry Date">' + (isEn ? 'Expiry Date' : '만료일') + '</label>' +
        '<input type="date" class="cm-input cm-input-date" id="cmTicketExpFrom" value="' + today + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmTicketExpTo" value="' + today + '">' +
        '<label class="cm-chk-label" style="margin-left:8px;"><input type="checkbox" id="cmTicketNoLimit" checked onchange="cmToggleTicketExpiry()"><span class="cm-checkmark">✓</span> <span data-i18n="cm.unlimited" data-ko="무제한" data-en="Unlimited">' + (isEn ? 'Unlimited' : '무제한') + '</span></label>' +
        '<label style="margin-left:16px;" data-i18n="cm.remaining" data-ko="잔여 횟수" data-en="Remaining">' + (isEn ? 'Remaining' : '잔여 횟수') + '</label>' +
        '<input type="text" class="cm-input cm-input-sm" id="cmTicketRemFrom" oninput="cmFormatNumberInput(this)"> <span class="cm-tilde">~</span> <input type="text" class="cm-input cm-input-sm" id="cmTicketRemTo" oninput="cmFormatNumberInput(this)">' +
        '<label class="cm-chk-label" style="margin-left:8px;"><input type="checkbox" id="cmTicketRemNoLimit"><span class="cm-checkmark">✓</span> <span data-i18n="cm.unlimited" data-ko="무제한" data-en="Unlimited">' + (isEn ? 'Unlimited' : '무제한') + '</span></label>' +
        '</div>' +
        '<div class="cm-cat-filter-row">' +
        '<label data-i18n="cm.ticket" data-ko="티켓" data-en="Prepaid Service">' + (isEn ? 'Prepaid Service' : '티켓') + '</label>' +
        '<select class="cm-select" id="cmTicketCat" onchange="cmTicketCatChange()"><option value="">' + (isEn ? 'All' : '전체') + '</option>' + (function(){ var o=''; Object.keys(svServiceData).forEach(function(c){ o+='<option value="'+c+'">'+c+'</option>'; }); return o; })() + '</select>' +
        '<select class="cm-select" id="cmTicketItem" disabled style="opacity:0.4;"><option value="">' + (isEn ? 'All' : '전체') + '</option></select>' +
        '<label class="cm-chk-label" style="margin-left:8px;"><input type="checkbox" id="cmTicketShowUnused"><span class="cm-checkmark">✓</span> <span data-i18n="cm.show_unused" data-ko="미사용 보기" data-en="Show Inactive">' + (isEn ? 'Show Inactive' : '미사용 보기') + '</span></label>' +
        '</div>';

    case 'noMembership':
      return '<div class="cm-cat-filter-row">' +
        '<label class="cm-radio"><input type="radio" name="cmNoMemType" value="all" checked onchange="cmToggleNoMemFamily()"> <span data-i18n="common.all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmNoMemType" value="hasPurchased" onchange="cmToggleNoMemFamily()"> <span data-i18n="cm.has_purchased" data-ko="회원권 구매 이력 있는 고객" data-en="Clients with prepaid goods sales history">' + (isEn ? 'Clients with prepaid goods sales history' : '회원권 구매 이력 있는 고객') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmNoMemType" value="noPurchase" onchange="cmToggleNoMemFamily()"> <span data-i18n="cm.no_purchase" data-ko="회원권 구매 이력 없는 고객" data-en="Clients with no prepaid goods sales history">' + (isEn ? 'Clients with no prepaid goods sales history' : '회원권 구매 이력 없는 고객') + '</span></label>' +
        '<label class="cm-chk-label" id="cmNoMemFamilyLabel" style="margin-left:16px;"><input type="checkbox" id="cmNoMemFamily" checked><span class="cm-checkmark">✓</span> <span data-i18n="cm.inc_family_prepaid" data-ko="가족 정액권 포함" data-en="Include Family Prepaid Card">' + (isEn ? 'Include Family Prepaid Card' : '가족 정액권 포함') + '</span></label>' +
        '</div>';

    case 'referral':
      return '<div class="cm-cat-filter-row">' +
        '<label class="cm-radio"><input type="radio" name="cmRefType" value="regDate" checked onchange="cmToggleRefType()"> <span data-i18n="cm.reg_date" data-ko="등록일" data-en="Registration Date">' + (isEn ? 'Registration Date' : '등록일') + '</span></label>' +
        '<label class="cm-radio"><input type="radio" name="cmRefType" value="client" onchange="cmToggleRefType()"> <span data-i18n="cm.client" data-ko="고객" data-en="Client">' + (isEn ? 'Client' : '고객') + '</span></label>' +
        '<span id="cmRefDateRange">' +
        '<input type="date" class="cm-input cm-input-date" id="cmRefDateFrom" value="' + monthStart + '"> <span class="cm-tilde">~</span> <input type="date" class="cm-input cm-input-date" id="cmRefDateTo" value="' + today + '">' +
        '</span>' +
        '<span id="cmRefClientRange" style="display:none;">' +
        '<select class="cm-select" id="cmRefClientType">' +
        '<option value="referrer" data-ko="소개한 고객" data-en="Referrer">' + (isEn ? 'Referrer' : '소개한 고객') + '</option>' +
        '<option value="referred" data-ko="소개받은 고객" data-en="Referred">' + (isEn ? 'Referred' : '소개받은 고객') + '</option>' +
        '</select>' +
        '<input type="text" class="cm-input" id="cmRefClientSearch" placeholder="' + (isEn ? 'Client name or phone' : '고객명 또는 휴대폰번호') + '" data-i18n-ph-ko="고객명 또는 휴대폰번호" data-i18n-ph-en="Client name or phone" style="width:200px;">' +
        '</span>' +
        '</div>';

    default: // all, birthday
      return '';
  }
}

// 서비스 분류 선택 시 상세 서비스 셀렉트 업데이트
function cmSvcCatChange() {
  var catSel = document.getElementById('cmSvcCat');
  var itemSel = document.getElementById('cmSvcItem');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var allText = isEn ? 'All' : '전체';
  var catName = catSel.value;

  itemSel.innerHTML = '<option>' + allText + '</option>';

  if (catName && svServiceData[catName]) {
    svServiceData[catName].forEach(function(svc) {
      itemSel.innerHTML += '<option value="' + svc.name + '">' + svc.name + '</option>';
    });
    itemSel.disabled = false;
  } else {
    itemSel.disabled = true;
  }
}

function cmPopulatePrepaidCards() {
  var sel = document.getElementById('cmPrepaidCard');
  if (!sel) return;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // 기존 옵션 유지 (전체)
  sel.innerHTML = '<option>' + (isEn ? 'All' : '전체') + '</option>';
  // 설정 > 정액권 테이블에서 이름 가져오기
  var rows = document.querySelectorAll('#psCardTbody tr');
  rows.forEach(function(row) {
    var nameCell = row.querySelector('.ps-td-name');
    if (nameCell) {
      var name = nameCell.textContent.trim();
      if (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      }
    }
  });
}
function cmTicketCatChange() {
  var catSel = document.getElementById('cmTicketCat');
  var itemSel = document.getElementById('cmTicketItem');
  if (!catSel || !itemSel) return;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var cat = catSel.value;
  itemSel.innerHTML = '<option value="">' + (isEn ? 'All' : '전체') + '</option>';
  if (cat) {
    itemSel.disabled = false;
    itemSel.style.opacity = '1';
    var tickets = pkgTicketData[cat] || [];
    tickets.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.name || t;
      opt.textContent = t.name || t;
      itemSel.appendChild(opt);
    });
  } else {
    itemSel.disabled = true;
    itemSel.style.opacity = '0.4';
  }
}
function cmProdCatChange() {
  var catSel = document.getElementById('cmProdCat');
  var itemSel = document.getElementById('cmProdItem');
  if (!catSel || !itemSel) return;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var cat = catSel.value;
  itemSel.innerHTML = '<option value="">' + (isEn ? 'All' : '전체') + '</option>';
  if (cat) {
    itemSel.disabled = false;
    itemSel.style.opacity = '1';
    prdData.forEach(function(p) {
      if (p.cat === cat && !p.inactive) {
        var opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        itemSel.appendChild(opt);
      }
    });
  } else {
    itemSel.disabled = true;
    itemSel.style.opacity = '0.4';
  }
}
function cmFormatNumberInput(el) {
  var pos = el.selectionStart;
  var oldLen = el.value.length;
  var raw = el.value.replace(/[^0-9]/g, '');
  el.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  var newLen = el.value.length;
  el.selectionStart = el.selectionEnd = pos + (newLen - oldLen);
}
function cmToggleRefType() {
  var sel = document.querySelector('input[name="cmRefType"]:checked');
  var dateRange = document.getElementById('cmRefDateRange');
  var clientRange = document.getElementById('cmRefClientRange');
  if (!sel || !dateRange || !clientRange) return;
  if (sel.value === 'regDate') {
    dateRange.style.display = '';
    clientRange.style.display = 'none';
  } else {
    dateRange.style.display = 'none';
    clientRange.style.display = '';
  }
}
function cmToggleNoMemFamily() {
  var sel = document.querySelector('input[name="cmNoMemType"]:checked');
  var chk = document.getElementById('cmNoMemFamily');
  var label = document.getElementById('cmNoMemFamilyLabel');
  if (!sel || !chk || !label) return;
  var disabled = sel.value !== 'all';
  chk.disabled = disabled;
  label.style.opacity = disabled ? '0.4' : '1';
  label.style.pointerEvents = disabled ? 'none' : '';
}
function cmTogglePrepaidDateRange() {
  var sel = document.querySelector('input[name="cmPrepaidDate"]:checked');
  var range = document.getElementById('cmPrepaidDateRange');
  if (range) range.style.display = (sel && sel.value === 'period') ? 'inline' : 'none';
}
function cmTogglePrepaidExpiry() {
  var chk = document.getElementById('cmPrepaidNoLimit');
  var toEl = document.getElementById('cmPrepaidExpTo');
  if (!chk || !toEl) return;
  var disabled = chk.checked;
  toEl.disabled = disabled;
  toEl.style.opacity = disabled ? '0.4' : '1';
}
function cmToggleTicketDateRange() {
  var sel = document.querySelector('input[name="cmTicketDate"]:checked');
  var range = document.getElementById('cmTicketDateRange');
  if (range) range.style.display = (sel && sel.value === 'period') ? 'inline' : 'none';
}
function cmToggleTicketExpiry() {
  var chk = document.getElementById('cmTicketNoLimit');
  var toEl = document.getElementById('cmTicketExpTo');
  if (!chk || !toEl) return;
  var disabled = chk.checked;
  toEl.disabled = disabled;
  toEl.style.opacity = disabled ? '0.4' : '1';
}
function cmToggleAdvanced() {
  var panel = document.getElementById('cmAdvancedPanel');
  panel.style.display = document.getElementById('cmAdvToggle').checked ? '' : 'none';
}

// 체크박스 클릭 시 같은 행의 input/select 활성/비활성 토글
function cmToggleField(chk) {
  var row = chk.closest('.cm-field-row');
  if (!row) return;
  var enabled = chk.checked;
  row.querySelectorAll('select, input[type="text"], input[type="date"], input[type="radio"]').forEach(function(el) {
    el.disabled = !enabled;
  });
}

// 고객번호 없음 체크 시 고객 번호 행 비활성화
function cmToggleNoNumber(chk) {
  var numberChk = document.getElementById('cmChkNumber');
  if (!numberChk) return;
  var numberRow = numberChk.closest('.cm-field-row');
  if (!numberRow) return;
  if (chk.checked) {
    numberRow.classList.add('cm-field-row--disabled');
    numberChk.checked = false;
    numberRow.querySelectorAll('select, input[type="text"]').forEach(function(el) { el.disabled = true; });
  } else {
    numberRow.classList.remove('cm-field-row--disabled');
  }
}

// 날짜 범위 체크 시 이번달 1일 ~ 오늘 기본값 설정
function cmSetDateRangeDefault(fromId, toId, chk) {
  if (!chk.checked) return;
  var today = new Date();
  var y = today.getFullYear();
  var m = String(today.getMonth() + 1).padStart(2, '0');
  var d = String(today.getDate()).padStart(2, '0');
  var fromEl = document.getElementById(fromId);
  var toEl = document.getElementById(toId);
  if (fromEl) fromEl.value = y + '-' + m + '-01';
  if (toEl) toEl.value = y + '-' + m + '-' + d;
}

// 상세 검색 패널 내 모든 필드 초기화 (disabled 상태로)
function cmResetAdvancedFields() {
  var panel = document.getElementById('cmAdvancedPanel');
  if (!panel) return;
  panel.querySelectorAll('input[type="checkbox"]').forEach(function(chk) { chk.checked = false; });
  panel.querySelectorAll('input[type="radio"]').forEach(function(r) { r.checked = false; r.disabled = true; });
  panel.querySelectorAll('select').forEach(function(s) { s.selectedIndex = 0; s.disabled = true; });
  panel.querySelectorAll('input[type="text"], input[type="date"]').forEach(function(inp) { inp.value = ''; inp.disabled = true; });
  panel.querySelectorAll('.cm-field-row--disabled').forEach(function(row) { row.classList.remove('cm-field-row--disabled'); });
}

function cmGoBack() {
  if (document.getElementById('cmResultView').style.display !== 'none') {
    // 결과 → 검색 폼
    document.getElementById('cmResultView').style.display = 'none';
    document.getElementById('cmSearchView').style.display = '';
  } else if (document.getElementById('cmSearchView').style.display !== 'none') {
    // 검색 → 메인 카드그리드
    document.getElementById('cmSearchView').style.display = 'none';
    document.getElementById('cmMain').style.display = '';
  }
}

// 알림 모달 열기/닫기
function cmShowAlert(msg) {
  var modal = document.getElementById('cmAlertModal');
  var msgEl = document.getElementById('cmAlertMsg');
  if (msgEl) msgEl.textContent = msg;
  if (modal) modal.style.display = '';
}
function cmCloseAlert() {
  var modal = document.getElementById('cmAlertModal');
  if (modal) modal.style.display = 'none';
}

function cmDoSearch() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var cat = cmCurrentCategory;
  var info = cmCategories[cat] || cmCategories.all;

  // 생일 유효성 검사: 시작 월/일이 종료 월/일보다 크면 알림
  var chkBirth = document.getElementById('cmChkBirthday');
  if (chkBirth && chkBirth.checked) {
    var bm1 = parseInt(document.getElementById('cmBirthM1').value) || 0;
    var bd1 = parseInt(document.getElementById('cmBirthD1').value) || 0;
    var bm2 = parseInt(document.getElementById('cmBirthM2').value) || 0;
    var bd2 = parseInt(document.getElementById('cmBirthD2').value) || 0;
    if (bm1 > bm2 || (bm1 === bm2 && bd1 > bd2)) {
      cmShowAlert(isEn
        ? 'Birthday month start value must be less than or equal to end value.'
        : '생년 월 은 시작 값이 종료 값보다 작거나 같아야합니다.');
      return;
    }
  }

  // 0) 카테고리 제목 설정
  var catTitleEl = document.getElementById('cmConditionCatTitle');
  if (catTitleEl) catTitleEl.textContent = isEn ? info.en : info.ko;

  // 1) 검색 조건 칩 빌드
  cmBuildConditionChips(cat, isEn);

  // 2) 동적 테이블 컬럼 결정
  var cols = (cmBaseColumns[cat] || cmBaseColumns.all).slice();
  // 상세 검색으로 추가된 컬럼 (기존 검색 폼의 체크박스 읽기)
  var advToggle = document.getElementById('cmAdvToggle');
  if (advToggle && advToggle.checked) {
    Object.keys(cmAdvColumnMap).forEach(function(chkId) {
      var chk = document.getElementById(chkId);
      if (chk && chk.checked && cmAdvColumnMap[chkId]) {
        var colKey = cmAdvColumnMap[chkId];
        if (cols.indexOf(colKey) === -1) cols.push(colKey);
      }
    });
  }

  // 3) 테이블 헤더 생성
  cmBuildTableHeaders(cols, isEn);

  // 4) 테이블 바디 생성 (샘플 데이터)
  cmBuildTableBody(cat, cols);

  // 5) 노트 표시 (판매 금액별)
  var noteEl = document.getElementById('cmResultNote');
  if (noteEl) {
    if (cmNotes[cat]) {
      noteEl.style.display = '';
      noteEl.textContent = isEn ? cmNotes[cat].en : cmNotes[cat].ko;
    } else {
      noteEl.style.display = 'none';
    }
  }

  // 6) 결과 수에 따른 버튼 상태
  cmUpdateResultButtons();

  // 뷰 전환 (이미 결과뷰에 있을 수도 있음)
  document.getElementById('cmSearchView').style.display = 'none';
  document.getElementById('cmResultView').style.display = '';
}

function cmEditCondition() {
  // 결과 → 검색 폼으로 돌아가기
  document.getElementById('cmResultView').style.display = 'none';
  document.getElementById('cmSearchView').style.display = '';
}

// ── 검색 조건 칩 빌드 ──
function cmBuildConditionChips(cat, isEn) {
  var chips = [];
  var info = cmCategories[cat] || cmCategories.all;

  // 카테고리별 고유 필터 칩
  var catChips = cmBuildCategoryChips(cat, isEn);
  chips = chips.concat(catChips);

  // 상세 검색 칩
  var advToggle2 = document.getElementById('cmAdvToggle');
  if (advToggle2 && advToggle2.checked) {
    var advChips = cmBuildAdvancedChips(isEn);
    chips = chips.concat(advChips);
  }

  var container = document.getElementById('cmConditionChips');
  if (container) {
    if (chips.length > 0) {
      container.innerHTML = '<span class="cm-condition-label" data-ko="검색 조건" data-en="Search Conditions">' + (isEn ? 'Search Conditions' : '검색 조건') + '</span><div class="cm-condition-chips-inner">' + chips.join('') + '</div>';
    } else {
      container.innerHTML = '';
    }
  }
}

// ── 카테고리별 고유 필터 → 칩 변환 ──
function cmBuildCategoryChips(cat, isEn) {
  var chips = [];
  var c = function(label, value) {
    if (value) chips.push('<span class="cm-chip cm-chip-cat">' + label + ': ' + value + '</span>');
    else chips.push('<span class="cm-chip cm-chip-cat">' + label + '</span>');
  };

  switch(cat) {
    case 'dormant':
      var days = document.getElementById('cmDormantDays');
      if (days && days.value) c(isEn ? 'Not visited more than' : '미 방문', days.value + (isEn ? ' days' : ' 일 이상'));
      break;
    case 'byService':
      var df = document.getElementById('cmSvcDateFrom'), dt = document.getElementById('cmSvcDateTo');
      if (df && df.value) c(isEn ? 'Date Range' : '기간', df.value + '~' + (dt ? dt.value : ''));
      var sc = document.getElementById('cmSvcCat'), si = document.getElementById('cmSvcItem');
      if (sc && sc.value && sc.selectedIndex > 0) {
        var svcLabel = sc.value;
        if (si && si.value && si.selectedIndex > 0) svcLabel += ' > ' + si.value;
        c(isEn ? 'Service' : '서비스', svcLabel);
      }
      break;
    case 'byProduct':
      var pf = document.getElementById('cmProdDateFrom'), pt = document.getElementById('cmProdDateTo');
      if (pf && pf.value) c(isEn ? 'Date Range' : '기간', pf.value + '~' + (pt ? pt.value : ''));
      var pc = document.getElementById('cmProdCat'), pi = document.getElementById('cmProdItem');
      if (pc && pc.value && pc.selectedIndex > 0) {
        var pLabel = pc.value;
        if (pi && pi.value && pi.selectedIndex > 0) pLabel += ' > ' + pi.value;
        c(isEn ? 'Product' : '제품', pLabel);
      }
      break;
    case 'byAmount':
      var af = document.getElementById('cmAmtDateFrom'), at2 = document.getElementById('cmAmtDateTo');
      if (af && af.value) c(isEn ? 'Date Range' : '기간', af.value + '~' + (at2 ? at2.value : ''));
      var incProd = document.getElementById('cmAmtIncProduct');
      if (incProd && incProd.checked) c(isEn ? 'Include Products' : '제품 포함', '');
      break;
    case 'membership':
      var memType = document.querySelector('input[name="cmMemType"]:checked');
      if (memType) {
        var labels = { all: isEn?'All':'전체', prepaid: isEn?'Prepaid Card':'정액권', ticket: isEn?'Prepaid Service':'티켓' };
        c(labels[memType.value] || '', '');
      }
      var famMem = document.getElementById('cmMemFamily');
      if (famMem && famMem.checked) c(isEn ? 'Include Family Prepaid Goods' : '가족 회원권 포함', '');
      break;
    case 'prepaid':
      var pef = document.getElementById('cmPrepaidExpFrom'), pet = document.getElementById('cmPrepaidExpTo');
      if (pef && pef.value) {
        var expStr = pef.value + '~';
        var noLim = document.getElementById('cmPrepaidNoLimit');
        expStr += (noLim && noLim.checked) ? (isEn ? 'Unlimited' : '무제한') : (pet ? pet.value : '');
        c(isEn ? 'Expiry Date' : '만료일', expStr);
      }
      break;
    case 'ticket':
      var tef = document.getElementById('cmTicketExpFrom'), tet = document.getElementById('cmTicketExpTo');
      if (tef && tef.value) {
        var tExpStr = tef.value + '~';
        var tNoLim = document.getElementById('cmTicketNoLimit');
        tExpStr += (tNoLim && tNoLim.checked) ? (isEn ? 'Unlimited' : '무제한') : (tet ? tet.value : '');
        c(isEn ? 'Expiry Date' : '만료일', tExpStr);
      }
      var tcCat = document.getElementById('cmTicketCat');
      if (tcCat && tcCat.selectedIndex > 0) c(isEn ? 'Category' : '분류', tcCat.value);
      break;
    case 'noMembership':
      var nmType = document.querySelector('input[name="cmNoMemType"]:checked');
      if (nmType) {
        var nmLabels = { all: isEn?'All':'전체', hasPurchased: isEn?'Has History':'회원권 구매 이력 있는 고객', noPurchase: isEn?'No History':'회원권 구매 이력 없는 고객' };
        c(nmLabels[nmType.value] || '', '');
      }
      var nmFam = document.getElementById('cmNoMemFamily');
      if (nmFam && nmFam.checked) c(isEn ? 'Include Family Prepaid Card' : '가족 정액권 포함', '');
      break;
    case 'referral':
      var refType = document.querySelector('input[name="cmRefType"]:checked');
      if (refType && refType.value === 'regDate') {
        var rdf = document.getElementById('cmRefDateFrom'), rdt = document.getElementById('cmRefDateTo');
        if (rdf && rdf.value) c(isEn ? 'Registration Date' : '등록일', rdf.value + '~' + (rdt ? rdt.value : ''));
      }
      break;
    case 'birthday':
      // 생일 조건은 상세 검색 칩에서 표시
      break;
  }
  return chips;
}

// ── 상세 검색 → 칩 변환 (기존 검색 폼 ID 참조) ──
function cmBuildAdvancedChips(isEn) {
  var chips = [];
  var c = function(label, value) {
    if (value) chips.push('<span class="cm-chip">' + label + ': ' + value + '</span>');
    else chips.push('<span class="cm-chip">' + label + '</span>');
  };

  var chk;
  chk = document.getElementById('cmChkStaff');
  if (chk && chk.checked) { var s = document.getElementById('cmStaff'); c(isEn?'Preferred Staff':'담당자', s ? s.options[s.selectedIndex].text : ''); }
  chk = document.getElementById('cmChkNoNumber');
  if (chk && chk.checked) c(isEn?'No \'Client Number\'':'고객번호 없음', '');
  chk = document.getElementById('cmChkNumber');
  if (chk && chk.checked) { var nf = document.getElementById('cmNumFrom'), nt = document.getElementById('cmNumTo'); c(isEn?'Client No.':'고객 번호', (nf?nf.value:'') + ' ~ ' + (nt?nt.value:'')); }
  chk = document.getElementById('cmChkGender');
  if (chk && chk.checked) { var g = document.getElementById('cmGender'); c(isEn?'Gender':'성별', g ? g.options[g.selectedIndex].text : ''); }
  chk = document.getElementById('cmChkBirthday');
  if (chk && chk.checked) {
    var bm1 = document.getElementById('cmBirthM1'), bd1 = document.getElementById('cmBirthD1');
    var bm2 = document.getElementById('cmBirthM2'), bd2 = document.getElementById('cmBirthD2');
    c(isEn?'Birthday':'생일', (bm1?bm1.value:'')+(isEn?'/':'월 ')+(bd1?bd1.value:'')+(isEn?''+'일':' 일')+' ~ '+(bm2?bm2.value:'')+(isEn?'/':'월 ')+(bd2?bd2.value:'')+(isEn?'':'일'));
  }
  chk = document.getElementById('cmChkMemo');
  if (chk && chk.checked) { var m = document.getElementById('cmMemo'); c(isEn?'Notes':'메모', m?m.value:''); }
  chk = document.getElementById('cmChkSmsOpt');
  if (chk && chk.checked) { var so = document.getElementById('cmSmsOpt'); c(isEn?'Don\'t Send Message':'문자 수신거부', so ? so.options[so.selectedIndex].text : ''); }
  chk = document.getElementById('cmChkVisitRoute');
  if (chk && chk.checked) { var vr = document.getElementById('cmVisitRoute'); c(isEn?'Referral Source':'방문 경로', vr ? vr.options[vr.selectedIndex].text : ''); }
  chk = document.getElementById('cmChkGrade');
  if (chk && chk.checked) { var gr = document.getElementById('cmGrade'); c(isEn?'Client Rating':'고객 등급', gr ? gr.options[gr.selectedIndex].text : ''); }
  chk = document.getElementById('cmChkGroup');
  if (chk && chk.checked) { var gp = document.getElementById('cmGroup'); c(isEn?'Client Group':'고객그룹', gp ? gp.options[gp.selectedIndex].text : ''); }
  chk = document.getElementById('cmChkAddress');
  if (chk && chk.checked) { var ad = document.getElementById('cmAddress'); c(isEn?'Address':'주소', ad?ad.value:''); }
  chk = document.getElementById('cmChkRegDate');
  if (chk && chk.checked) { var rdf = document.getElementById('cmRegDateFrom'), rdt = document.getElementById('cmRegDateTo'); c(isEn?'Registered Date':'등록일', (rdf?rdf.value:'')+'~'+(rdt?rdt.value:'')); }

  chk = document.getElementById('cmChkFirstVisit');
  if (chk && chk.checked) { var fvf = document.getElementById('cmFirstVisitFrom'), fvt = document.getElementById('cmFirstVisitTo'); c(isEn?'First Visit Date':'첫 방문일', (fvf?fvf.value:'')+'~'+(fvt?fvt.value:'')); }
  chk = document.getElementById('cmChkLastVisit');
  if (chk && chk.checked) {
    var lvType = document.querySelector('input[name="cmLastVisitType"]:checked');
    if (lvType) {
      if (lvType.value === 'noVisit') { var nd = document.getElementById('cmNoVisitDays'); c(isEn?'Not visited more than':'미 방문', (nd?nd.value:'') + (isEn?' days':' 일 이상')); }
      else if (lvType.value === 'recent') { var rd = document.getElementById('cmRecentDays'); c(isEn?'Visited for Last':'최근', (rd?rd.value:'') + (isEn?' days':' 일 이내 방문')); }
      else if (lvType.value === 'period') { var lvf = document.getElementById('cmLastVisitFrom'), lvt = document.getElementById('cmLastVisitTo'); c(isEn?'Recent Visit Date':'최근 방문일', (lvf?lvf.value:'')+'~'+(lvt?lvt.value:'')); }
    }
  }
  chk = document.getElementById('cmChkPoints');
  if (chk && chk.checked) { var pf = document.getElementById('cmPointsFrom'), pt = document.getElementById('cmPointsTo'); c(isEn?'Loyalty Points':'포인트 잔액', (pf?pf.value:'')+ ' ~ '+(pt?pt.value:'')); }
  chk = document.getElementById('cmChkPrepaidBalance');
  if (chk && chk.checked) { var pbf = document.getElementById('cmPrepaidFrom'), pbt = document.getElementById('cmPrepaidTo'); c(isEn?'Balance':'정액권 잔액', (pbf?pbf.value:'')+' ~ '+(pbt?pbt.value:'')); }
  chk = document.getElementById('cmChkAvgSpend');
  if (chk && chk.checked) { var asf = document.getElementById('cmAvgSpendFrom'), ast = document.getElementById('cmAvgSpendTo'); c(isEn?'Average Revenue per Sales':'객단가', (asf?asf.value:'')+' ~ '+(ast?ast.value:'')); }
  chk = document.getElementById('cmChkReferralCount');
  if (chk && chk.checked) { var rcf = document.getElementById('cmReferralCountFrom'), rct = document.getElementById('cmReferralCountTo'); c(isEn?'Number of Recommendations':'추천 고객 수', (rcf?rcf.value:'')+' ~ '+(rct?rct.value:'')); }
  chk = document.getElementById('cmChkTotalSales');
  if (chk && chk.checked) { var tsf = document.getElementById('cmTotalSalesFrom'), tst = document.getElementById('cmTotalSalesTo'); c(isEn?'Total Sales':'총 판매액', (tsf?tsf.value:'')+' ~ '+(tst?tst.value:'')); }
  chk = document.getElementById('cmChkTotalVisits');
  if (chk && chk.checked) { var tvf = document.getElementById('cmTotalVisitsFrom'), tvt = document.getElementById('cmTotalVisitsTo'); c(isEn?'Total Number of Visit':'총 방문수', (tvf?tvf.value:'')+' ~ '+(tvt?tvt.value:'')); }

  return chips;
}

// ── 테이블 헤더 생성 ──
function cmBuildTableHeaders(cols, isEn) {
  var thead = document.getElementById('cmResultThead');
  if (!thead) return;
  var tr = '<tr><th class="cm-th-check"><label class="cm-chk-label"><input type="checkbox" id="cmCheckAll" onchange="cmToggleAll(this)"><span class="cm-checkmark">✓</span></label></th>';
  cols.forEach(function(key) {
    var col = cmAllColumns[key];
    if (col) tr += '<th data-ko="' + col.ko + '" data-en="' + col.en + '">' + (isEn ? col.en : col.ko) + '</th>';
  });
  tr += '</tr>';
  thead.innerHTML = tr;
}

// ── 테이블 바디 생성 (고객 마스터에서 필터링) ──
var cmPageData = [];
var cmPageCols = [];
var cmPageCurrent = 1;
var cmPageSize = 10;

function cmBuildTableBody(cat, cols) {
  var tbody = document.getElementById('cmResultTbody');
  if (!tbody) return;

  cmPageData = cmFilterClients(cat);
  cmPageCols = cols;
  cmPageCurrent = 1;
  var countEl = document.getElementById('cmResultNum');

  if (cmPageData.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    tbody.innerHTML = '<tr><td class="cm-td-empty" colspan="' + (cols.length + 1) + '">' + (isEn ? 'No data found' : '내역이 없습니다') + '</td></tr>';
    if (countEl) countEl.textContent = '0';
    cmUpdatePagingUI();
    return;
  }

  if (countEl) countEl.textContent = cmPageData.length;
  cmRenderPage();
}

function cmRenderPage() {
  var tbody = document.getElementById('cmResultTbody');
  if (!tbody) return;
  var cols = cmPageCols;
  var start = (cmPageCurrent - 1) * cmPageSize;
  var pageData = cmPageData.slice(start, start + cmPageSize);

  var html = '';
  pageData.forEach(function(c) {
    html += '<tr><td class="cm-td-check"><label class="cm-chk-label"><input type="checkbox" class="cm-row-check" checked><span class="cm-checkmark">✓</span></label></td>';
    cols.forEach(function(key) {
      var val = '';
      var col = cmAllColumns[key];
      var cls = (col && col.cls) ? ' class="' + col.cls + '"' : '';
      switch(key) {
        case 'name': val = c.name; break;
        case 'phone': val = c.phone; break;
        case 'lastVisit': val = c.lastVisit || ''; break;
        case 'grade': val = c.grade || ''; break;
        case 'staff': val = c.staff || ''; break;
        case 'totalSales': val = c.totalSales ? cmFmtNum(c.totalSales) : ''; break;
        case 'visitRoute': val = ''; break;
        case 'periodSales': val = c.totalSales ? cmFmtNum(c.totalSales) : ''; break;
        case 'prepaid': val = c.prepaidBalance > 0 ? '정액권' : ''; break;
        case 'prepaidBalance': val = c.prepaidBalance ? cmFmtNum(c.prepaidBalance) : ''; break;
        case 'expiry': val = c.prepaidBalance > 0 ? '무제한' : ''; break;
        case 'firstVisit': val = c.firstVisit || ''; break;
        case 'visitCount': val = c.visitCount || ''; break;
        case 'regDate': val = c.regDate || ''; break;
        case 'referrer': val = ''; break;
        case 'points': val = c.points ? cmFmtNum(c.points) : ''; break;
        case 'membership': val = c.prepaidBalance > 0 ? '정액권' : ''; break;
        case 'memberBalance': val = c.prepaidBalance ? cmFmtNum(c.prepaidBalance) : ''; break;
        case 'ticket': val = ''; break;
        case 'ticketRemain': val = ''; break;
        case 'birthday': val = c.birthday || ''; break;
        case 'memo': val = c.memo || ''; break;
        case 'gender': val = c.gender || ''; break;
        case 'avgSpend': val = c.avgSpend ? cmFmtNum(c.avgSpend) : ''; break;
        case 'clientNumber': val = c.no || ''; break;
        case 'group': val = c.group || ''; break;
        case 'address': val = c.address || ''; break;
        case 'referralCount': val = ''; break;
        default: val = '';
      }
      html += '<td' + cls + '>' + val + '</td>';
    });
    html += '</tr>';
  });
  tbody.innerHTML = html;
  cmUpdatePagingUI();
  // 전체 선택 체크박스 리셋
  var checkAll = document.getElementById('cmCheckAll');
  if (checkAll) checkAll.checked = true;
}

function cmUpdatePagingUI() {
  var pagingEl = document.getElementById('cmPaging');
  if (!pagingEl) return;
  var totalPages = Math.max(1, Math.ceil(cmPageData.length / cmPageSize));
  if (cmPageData.length > cmPageSize) {
    pagingEl.style.display = 'flex';
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    var html = '';
    html += '<span class="cm-paging-info">' + (isEn ? 'Page' : '페이지') + ' <b>' + cmPageCurrent + '</b> ' + (isEn ? 'of' : '의') + ' <b>' + totalPages + '</b></span>';
    html += '<button class="cm-paging-btn" onclick="cmPageGo(\'first\')" ' + (cmPageCurrent === 1 ? 'disabled' : '') + '>«</button>';
    html += '<button class="cm-paging-btn" onclick="cmPageGo(\'prev\')" ' + (cmPageCurrent === 1 ? 'disabled' : '') + '>‹</button>';
    html += '<button class="cm-paging-btn" onclick="cmPageGo(\'next\')" ' + (cmPageCurrent === totalPages ? 'disabled' : '') + '>›</button>';
    html += '<button class="cm-paging-btn" onclick="cmPageGo(\'last\')" ' + (cmPageCurrent === totalPages ? 'disabled' : '') + '>»</button>';
    html += '<div class="cm-paging-go"><button class="cm-paging-btn" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'\':\'none\'">' + (isEn ? 'Goto' : '이동') + '</button>';
    html += '<select style="display:none;" onchange="cmPageGo(parseInt(this.value));this.style.display=\'none\'">';
    for (var i = 1; i <= totalPages; i++) {
      html += '<option value="' + i + '"' + (i === cmPageCurrent ? ' selected' : '') + '>' + i + '</option>';
    }
    html += '</select></div>';
    pagingEl.innerHTML = html;
  } else {
    pagingEl.style.display = 'none';
  }
}

// ── 결과 수에 따른 버튼 활성화/비활성화 ──
function cmUpdateResultButtons() {
  var countEl = document.getElementById('cmResultNum');
  var count = countEl ? parseInt(countEl.textContent) || 0 : 0;
  var smsBtn = document.getElementById('cmBtnSms');
  var otherBtn = document.getElementById('cmBtnOther');
  if (count === 0) {
    if (smsBtn) smsBtn.classList.add('disabled');
    if (otherBtn) otherBtn.classList.add('disabled');
  } else {
    if (smsBtn) smsBtn.classList.remove('disabled');
    if (otherBtn) otherBtn.classList.remove('disabled');
  }
}

// ── 페이지 이동 ──
function cmPageGo(dir) {
  var totalPages = Math.max(1, Math.ceil(cmPageData.length / cmPageSize));
  if (typeof dir === 'number') { cmPageCurrent = dir; }
  else if (dir === 'first') cmPageCurrent = 1;
  else if (dir === 'prev') cmPageCurrent = Math.max(1, cmPageCurrent - 1);
  else if (dir === 'next') cmPageCurrent = Math.min(totalPages, cmPageCurrent + 1);
  else if (dir === 'last') cmPageCurrent = totalPages;
  cmRenderPage();
}

// 전체 선택/해제
function cmToggleAll(el) {
  var checks = document.querySelectorAll('#cmResultTbody .cm-row-check');
  checks.forEach(function(c) { c.checked = el.checked; });
}

// 기타 작업 드롭다운
function cmToggleOtherMenu() {
  var menu = document.getElementById('cmOtherMenu');
  menu.classList.toggle('open');
}

var cmPendingAction = '';

function cmOtherAction(action) {
  document.getElementById('cmOtherMenu').classList.remove('open');
  cmPendingAction = action;

  // 포인트 초기화 / 고객 삭제 → 대표자 본인 인증
  if (action === 'resetPoints' || action === 'delete') {
    cmOpenOwnerVerify();
  } else {
    // 등급/그룹/담당자/수신거부/다운로드 → 대표자 로그인
    cmOpenOwnerLogin();
  }
}

// 대표자 로그인 모달
function cmOpenOwnerLogin() {
  document.getElementById('cmOwnerId').value = '';
  document.getElementById('cmOwnerPw').value = '';
  document.getElementById('cmOwnerLoginOverlay').classList.add('show');
}
function cmCloseOwnerLogin() {
  document.getElementById('cmOwnerLoginOverlay').classList.remove('show');
  cmPendingAction = '';
}
function cmOwnerLoginConfirm() {
  var action = cmPendingAction;
  document.getElementById('cmOwnerLoginOverlay').classList.remove('show');

  var actionModals = {
    grade: 'cmGradeOverlay',
    group: 'cmGroupOverlay',
    staff: 'cmStaffOverlay',
    smsOpt: 'cmSmsOptOverlay'
  };

  if (action === 'download') {
    cmDownloadExcel();
    cmPendingAction = '';
    return;
  }

  var modalId = actionModals[action];
  if (modalId) {
    if (action === 'smsOpt') {
      var cnt = document.querySelectorAll('#cmResultTbody .cm-row-check:checked').length;
      document.getElementById('cmSmsOptCount').textContent = cnt;
    }
    document.getElementById(modalId).classList.add('show');
  }
}

// 액션 모달 닫기
function cmCloseActionModal(id) {
  document.getElementById(id).classList.remove('show');
  cmPendingAction = '';
}

// 액션 모달 확인
function cmActionConfirm(id) {
  document.getElementById(id).classList.remove('show');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Changes applied.' : '변경이 적용되었습니다.');
  cmPendingAction = '';
}

// 대표자 본인 인증 모달
function cmOpenOwnerVerify() {
  document.getElementById('cmOwnerVerifyOverlay').classList.add('show');
}
function cmCloseOwnerVerify() {
  document.getElementById('cmOwnerVerifyOverlay').classList.remove('show');
  cmPendingAction = '';
}
function cmOwnerVerifyConfirm() {
  var action = cmPendingAction;
  document.getElementById('cmOwnerVerifyOverlay').classList.remove('show');
  // PASS 본인인증 팝업 열기
  document.getElementById('cmPassOverlay').classList.add('show');
}

// 문자 발송 모달
// ── 문자 샘플 데이터 ──
var cmSmsSamples = {
  sms: [
    '(광고)000샵\n봄따라혜택이왔나\'봄\'\n10만원이상결제시10%OFF\n무료수신거부\n0808080132',
    '(광고)000샵\n오늘도세일해\n\'올해첫방문고객\'\n20%할인\n무료수신거부\n0808080132',
    '(광고)000샵\n\'후기를부탁해\'\n리뷰작성하면\n할인율이2배!!\n무료수신거부\n0808080132',
    '(광고)000샵\n봄맞이특가!시술예약하세요!\n10만\'시술시5%할인\n무료수신거부\n0808080132',
    '(광고)000샵\n봄맞이20%할인\n선착순100명\n·5천원할인권·\n추가증정\n무료수신거부\n0808080132',
    '(광고)000샵\n친추하고\'봄\'\n너랑나랑20만원이상시술시10%\n할인\n무료수신거부\n0808080132',
    '(광고)000샵\n·속보·4월한달간\n무조건5%할인^^\n예약가능!!\n무료수신거부\n0808080132',
    '(광고)000샵\n°°설렘쿠폰°°\n10만원\'10%\n20만원\'20%\n무료수신거부\n0808080132'
  ],
  lms: [
    '(광고)000샵\n\n오늘도 세일해\n☆───────\n04.01~04.31\n\n올해 첫 방문고객 30%\n추가인증시 10,000원 추가할인\n☆───────',
    '(광고)000샵\n\n┃화장한봄날┃//)/ \n┃행복가득~(^^ㆍ)\n★.── ──+☆./\n\n봄따라 혜택이 와나봐\n♡♡♡♡♡♡♡♡♡♡♡♡♡\n할인쿠폰 이벤트 10% OFF',
    '(광고)000샵\n\n리뷰 작성하면\n할인율이 두배!!\n\n■ ■ ■ ■ 할\n┃┃(0)┃┃ 착\n\n후기를 남겨주세요\n무료수신거부',
    '(광고)000샵\n\n✿.·˙·.✿.·✿.\n※☆@@@☆※\n✿@☆@☆@@/\n＼☆^^^☆/\n►▶◀◄\n\nSPRING EVENT\n30만원 이상 시술 시 15%',
    '(광고)000샵\n\n쿠폰(─0─)받아\n──m──m──\n┃봄맞이 20%┃\n\n4월 첫 구매 고객에게\n봄맞이 쿠폰을 씁니다!\n\n선착순 100분께는 5,000원\n할인권을 추가로 증정해요♥',
    '(광고)000샵\n\n◎ ◎\n/■▼＼\n)) ((\n"친추하고봄"\n\n봄과 함께하는\n친구추천 이벤트\n\n/ 함께 받는 봉선물!\n/ 20만원 이상 시술 시 10%'
  ],
  mms: [
    '(광고)000샵\n\n오늘도 세일해\n☆───────\n04.01~04.31\n\n올해 첫 방문고객 30%\n추가인증시 10,000원 추가할인\n☆───────',
    '(광고)000샵\n\n┃화장한봄날┃//)/ \n┃행복가득~(^^ㆍ)\n★.── ──+☆./\n\n봄따라 혜택이 와나봐\n♡♡♡♡♡♡♡♡♡♡♡♡♡\n할인쿠폰 이벤트 10% OFF',
    '(광고)000샵\n\n리뷰 작성하면\n할인율이 두배!!\n\n■ ■ ■ ■ 할\n┃┃(0)┃┃ 착\n\n후기를 남겨주세요\n무료수신거부',
    '(광고)000샵\n\n✿.·˙·.✿.·✿.\n※☆@@@☆※\n✿@☆@☆@@/\n＼☆^^^☆/\n►▶◀◄\n\nSPRING EVENT\n30만원 이상 시술 시 15%',
    '(광고)000샵\n\n쿠폰(─0─)받아\n──m──m──\n┃봄맞이 20%┃\n\n4월 첫 구매 고객에게\n봄맞이 쿠폰을 씁니다!',
    '(광고)000샵\n\n◎ ◎\n/■▼＼\n)) ((\n"친추하고봄"\n\n봄과 함께하는\n친구추천 이벤트'
  ]
};
var cmMmsImages = [
  'images/mms-sample (1).png',
  'images/mms-sample (2).png',
  'images/mms-sample (3).png',
  'images/mms-sample (4).png',
  'images/mms-sample (5).png',
  'images/mms-sample (6).png',
  'images/mms-sample (7).png'
];
var cmSmsTypeInfo = {
  sms: { label:'SMS', cost:22, maxBytes:85, cols:4, perPage:8 },
  lms: { label:'LMS', cost:49, maxBytes:2000, cols:3, perPage:6 },
  mms: { label:'MMS', cost:198, maxBytes:2000, cols:3, perPage:6 }
};
var cmCurrentType = 'lms';
var cmCurrentPage = 1;
var cmMmsViewMode = 'image';

function cmOpenSmsModal() {
  document.getElementById('cmSmsOverlay').classList.add('show');
  document.getElementById('cmSmsModal').classList.add('show');
  // 상단 네비게이션의 샵 이름을 광고 라인에 반영
  var shopNameEl = document.querySelector('.nav-shop-name');
  var adLine = document.getElementById('cmAdLine');
  if (shopNameEl && adLine) {
    adLine.textContent = '(광고)' + shopNameEl.textContent.trim();
  }
  cmUpdateSmsBytes();
  cmSmsTypeChange(document.getElementById('cmSmsType').value);
}

function cmCloseSmsModal() {
  document.getElementById('cmSmsOverlay').classList.remove('show');
  document.getElementById('cmSmsModal').classList.remove('show');
}

function cmUpdateSmsBytes() {
  var ta = document.getElementById('cmSmsContent');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) {
    bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  }
  var el = document.getElementById('cmSmsBytes');
  if (el) el.textContent = bytes;
}

function cmInsertConvert(text) {
  var ta = document.getElementById('cmSmsContent');
  if (!ta) return;
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + text + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + text.length;
  ta.focus();
  cmUpdateSmsBytes();
}

function cmSmsTabSwitch(el, mode) {
  var tabs = el.parentElement.querySelectorAll('.cm-sms-sch-btn');
  tabs.forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  var row = document.getElementById('cmSmsScheduleRow');
  if (!row) return;
  if (mode === 'scheduled') {
    row.style.display = 'flex';
    cmInitScheduleDateTime();
  } else {
    row.style.display = 'none';
  }
}

function cmInitScheduleDateTime() {
  var now = new Date();
  var dateInput = document.getElementById('cmSmsScheduleDate');
  var hourSel = document.getElementById('cmSmsScheduleHour');
  var minSel = document.getElementById('cmSmsScheduleMin');

  // 날짜 기본값: 오늘, 최소값: 오늘
  var today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  dateInput.value = today;
  dateInput.min = today;

  // 시간 옵션 생성 (이미 생성되어 있으면 스킵)
  if (hourSel.options.length === 0) {
    for (var h = 0; h < 24; h++) {
      var opt = document.createElement('option');
      opt.value = h;
      opt.textContent = String(h).padStart(2, '0');
      hourSel.appendChild(opt);
    }
  }
  if (minSel.options.length === 0) {
    for (var m = 0; m < 60; m += 5) {
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = String(m).padStart(2, '0');
      minSel.appendChild(opt);
    }
  }

  // 현재 시간 기본값
  hourSel.value = now.getHours();
  // 가장 가까운 5분 단위로 올림
  var roundedMin = Math.ceil(now.getMinutes() / 5) * 5;
  if (roundedMin >= 60) roundedMin = 55;
  minSel.value = roundedMin;

  // 날짜 변경 시 과거 시간 제한
  dateInput.onchange = function() { cmValidateScheduleTime(); };
  hourSel.onchange = function() { cmValidateScheduleTime(); };
  minSel.onchange = function() { cmValidateScheduleTime(); };
}

function cmValidateScheduleTime() {
  var now = new Date();
  var dateInput = document.getElementById('cmSmsScheduleDate');
  var hourSel = document.getElementById('cmSmsScheduleHour');
  var minSel = document.getElementById('cmSmsScheduleMin');
  var today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

  if (dateInput.value === today) {
    // 오늘이면 현재 시간 이전은 선택 불가 → 자동 보정
    var selH = parseInt(hourSel.value);
    var selM = parseInt(minSel.value);
    if (selH < now.getHours() || (selH === now.getHours() && selM <= now.getMinutes())) {
      hourSel.value = now.getHours();
      var roundedMin = Math.ceil(now.getMinutes() / 5) * 5;
      if (roundedMin >= 60) { roundedMin = 0; hourSel.value = Math.min(now.getHours() + 1, 23); }
      minSel.value = roundedMin;
    }
  }
}

function cmToggleAdOptout() {
  var fixedLine = document.querySelector('.cm-phone-fixed-line');
  var fixedBottom = document.querySelector('.cm-phone-fixed-bottom');
  var btn = document.getElementById('cmOptoutToggleBtn');
  if (!fixedLine || !fixedBottom || !btn) return;
  var isVisible = !fixedLine.classList.contains('cm-hidden');
  if (isVisible) {
    fixedLine.classList.add('cm-hidden');
    fixedBottom.classList.add('cm-hidden');
    btn.textContent = '광고/수신거부 삽입';
    btn.setAttribute('data-ko', '광고/수신거부 삽입');
    btn.setAttribute('data-en', 'Add Ad/Opt-out');
  } else {
    fixedLine.classList.remove('cm-hidden');
    fixedBottom.classList.remove('cm-hidden');
    btn.textContent = '광고/수신거부 삭제';
    btn.setAttribute('data-ko', '광고/수신거부 삭제');
    btn.setAttribute('data-en', 'Remove Ad/Opt-out');
  }
  cmUpdateSmsBytes();
}

// 특수문자 팝업
var cmSpecialCharsInit = false;
function cmToggleSpecialChars() {
  var el = document.getElementById('cmSpecialChars');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = '';
    if (!cmSpecialCharsInit) {
      cmSpecialCharsInit = true;
      var chars = '#&*@§※☆★○●◎◇◆◈□■△▲▽▼→←↑↓↔═▷◁▶◀▣▤▥▦▧▨▩㉿㈜♩♪♬™℡℗®ℓ㏂㏘TELa.m.p.m.!\',./:;^_—¨°··…‥//＼∼´∧∨∽˘ˇ¸˛±×÷≠≤≥∞∴♂♀∠⊥⌒∂∇≡≒«»√∝∵∫∪∩'.split('');
      var grid = document.getElementById('cmSpecialGrid');
      chars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        btn.textContent = c;
        btn.onclick = function() { cmInsertConvert(c); };
        grid.appendChild(btn);
      });
    }
  } else {
    el.style.display = 'none';
  }
}

// 문자저장 모달
function cmOpenMsgSaveModal() {
  document.getElementById('cmMsgSaveOverlay').classList.add('show');
}
function cmCloseMsgSaveModal() {
  document.getElementById('cmMsgSaveOverlay').classList.remove('show');
}
function cmDoSaveMsg() {
  var ta = document.getElementById('cmSmsContent');
  if (!ta || !ta.value.trim()) { cmCloseMsgSaveModal(); return; }
  cmAddSavedMsg(ta.value.trim());
  cmCloseMsgSaveModal();
}

function cmAddSavedMsg(text) {
  var grid = document.getElementById('cmMymsgGrid');
  if (!grid) return;
  var bytes = 0;
  for (var i = 0; i < text.length; i++) bytes += text.charCodeAt(i) > 127 ? 2 : 1;

  var card = document.createElement('div');
  card.className = 'cm-mymsg-card';
  card.setAttribute('data-fulltext', text);
  card.innerHTML = '<div class="cm-mymsg-card-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>'
    + '<div class="cm-mymsg-card-bytes">' + bytes + ' / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmEditCard(this)">수정</button>'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()">삭제</button>'
    + '</div>';
  card.querySelector('.cm-mymsg-card-body').onclick = function() {
    var smsTA = document.getElementById('cmSmsContent');
    if (smsTA) { smsTA.value = text; smsTA.focus(); cmUpdateSmsBytes(); }
  };
  grid.appendChild(card);
}

// 테스트발송 모달
function cmOpenTestSendModal() {
  document.getElementById('cmTestSendOverlay').classList.add('show');
}
function cmCloseTestSendModal() {
  document.getElementById('cmTestSendOverlay').classList.remove('show');
}
function cmDoTestSend() {
  cmCloseTestSendModal();
}

function cmSelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  var text = body.innerText || body.textContent;
  var ta = document.getElementById('cmSmsContent');
  if (!ta) return;
  ta.value = text;
  ta.focus();
  cmUpdateSmsBytes();
  var modal = document.querySelector('.cm-sms-modal-scroll');
  if (modal) modal.scrollTop = 0;
}

function cmCalcBytes(text) {
  var b = 0;
  for (var i = 0; i < text.length; i++) b += text.charCodeAt(i) > 127 ? 2 : 1;
  return b;
}

function cmSmsTypeChange(type) {
  cmCurrentType = type;
  cmCurrentPage = 1;
  var info = cmSmsTypeInfo[type];
  // 비용 업데이트
  var costLabel = document.querySelector('#cmSmsTargetCount');
  var targetCount = costLabel ? parseInt(costLabel.textContent) || 3 : 3;
  var costTd = document.querySelectorAll('.cm-sms-info-table td');
  if (costTd.length >= 4) {
    costTd[2].textContent = info.cost + 'p';
    costTd[4].textContent = (info.cost * targetCount) + 'p';
  }
  // 건당비용 라벨
  var costRow = document.querySelectorAll('.cm-sms-info-table tr');
  if (costRow.length >= 2) {
    var labelTd = costRow[1].querySelector('td:first-child');
    if (labelTd) labelTd.textContent = '건당비용 (' + info.label + ')';
  }
  // MMS 이미지 드롭존 토글
  var mmsDropzone = document.getElementById('cmMmsDropzone');
  var saveMsgBtn = document.querySelector('.cm-sms-btn-row .cm-sms-btn-outline[onclick*="cmOpenMsgSaveModal"]');
  if (type === 'mms') {
    mmsDropzone.classList.remove('cm-hidden');
    if (saveMsgBtn) saveMsgBtn.style.display = 'none';
  } else {
    mmsDropzone.classList.add('cm-hidden');
    if (saveMsgBtn) saveMsgBtn.style.display = '';
  }
  // MMS 뷰 토글
  var toggle = document.getElementById('cmMmsViewToggle');
  toggle.style.display = type === 'mms' ? 'flex' : 'none';
  // bytes 최대값
  var bytesDiv = document.querySelector('.cm-sms-bytes');
  if (bytesDiv) {
    var span = bytesDiv.querySelector('span');
    var cur = span ? span.textContent : '0';
    bytesDiv.innerHTML = '<span id="cmSmsBytes">' + cur + '</span> / ' + info.maxBytes + ' Bytes';
  }
  // 타이틀 업데이트
  var label = document.getElementById('cmSampleTypeLabel');
  if (label) label.textContent = info.label;
  // 그리드 컬럼 업데이트
  var grid = document.getElementById('cmSmsPreview');
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  // 렌더링
  cmRenderSamples();
}

function cmRenderSamples() {
  var grid = document.getElementById('cmSmsPreview');
  grid.innerHTML = '';
  grid.classList.remove('mms-image');
  var info = cmSmsTypeInfo[cmCurrentType];

  if (cmCurrentType === 'mms' && cmMmsViewMode === 'image') {
    grid.classList.add('mms-image');
    var start = (cmCurrentPage - 1) * info.perPage;
    var items = cmMmsImages.slice(start, start + info.perPage);
    items.forEach(function(src) {
      var card = document.createElement('div');
      card.className = 'cm-mms-image-card';
      card.innerHTML = '<img src="' + src + '" alt="MMS sample">';
      card.onclick = function() { cmSelectMmsImage(src); };
      grid.appendChild(card);
    });
    cmUpdatePaging(cmMmsImages.length, info.perPage);
  } else {
    var samples = cmSmsSamples[cmCurrentType] || cmSmsSamples.lms;
    var start = (cmCurrentPage - 1) * info.perPage;
    var items = samples.slice(start, start + info.perPage);
    items.forEach(function(text) {
      var bytes = cmCalcBytes(text);
      var card = document.createElement('div');
      card.className = 'cm-sms-preview-card';
      card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>'
        + '<div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
      grid.appendChild(card);
    });
    cmUpdatePaging(samples.length, info.perPage);
  }
}

function cmUpdatePaging(total, perPage) {
  var totalPages = Math.ceil(total / perPage);
  var cur = document.getElementById('cmSmsPageCur');
  var tot = document.getElementById('cmSmsPageTotal');
  if (tot) tot.textContent = totalPages;
  if (cur) cur.textContent = cmCurrentPage;
}

function cmSmsPageGo(dir) {
  var info = cmSmsTypeInfo[cmCurrentType];
  var samples = (cmCurrentType === 'mms' && cmMmsViewMode === 'image') ? cmMmsImages : (cmSmsSamples[cmCurrentType] || cmSmsSamples.lms);
  var totalPages = Math.ceil(samples.length / info.perPage);
  if (dir === 'first') cmCurrentPage = 1;
  else if (dir === 'prev') cmCurrentPage = Math.max(1, cmCurrentPage - 1);
  else if (dir === 'next') cmCurrentPage = Math.min(totalPages, cmCurrentPage + 1);
  else if (dir === 'last') cmCurrentPage = totalPages;
  cmRenderSamples();
}

function cmMmsViewSwitch(mode) {
  cmMmsViewMode = mode;
  cmCurrentPage = 1;
  cmRenderSamples();
}

/* MMS 이미지 드래그앤드롭 / 파일 선택 */
function cmHandleMmsFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('이미지 파일만 첨부할 수 있습니다.'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('cmMmsPreviewImg').src = e.target.result;
    document.getElementById('cmMmsDropzoneEmpty').style.display = 'none';
    document.getElementById('cmMmsDropzonePreview').style.display = '';
  };
  reader.readAsDataURL(file);
}
function cmSelectMmsImage(src) {
  var dropzone = document.getElementById('cmMmsDropzone');
  if (dropzone.classList.contains('cm-hidden')) dropzone.classList.remove('cm-hidden');
  document.getElementById('cmMmsPreviewImg').src = src;
  document.getElementById('cmMmsDropzoneEmpty').style.display = 'none';
  document.getElementById('cmMmsDropzonePreview').style.display = '';
  // 스크롤을 위로 이동하여 이미지 확인
  var modal = document.getElementById('cmSmsModal');
  if (modal) modal.scrollTop = 0;
}
function cmRemoveMmsImage() {
  document.getElementById('cmMmsPreviewImg').src = '';
  document.getElementById('cmMmsDropzonePreview').style.display = 'none';
  document.getElementById('cmMmsDropzoneEmpty').style.display = 'flex';
  document.getElementById('cmMmsFileInput').value = '';
}
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var dz = document.getElementById('cmMmsDropzone');
    if (!dz) return;
    ['dragenter','dragover'].forEach(function(evt) {
      dz.addEventListener(evt, function(e) { e.preventDefault(); dz.classList.add('cm-dragover'); });
    });
    ['dragleave','drop'].forEach(function(evt) {
      dz.addEventListener(evt, function(e) { e.preventDefault(); dz.classList.remove('cm-dragover'); });
    });
    dz.addEventListener('drop', function(e) {
      var file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      var input = document.getElementById('cmMmsFileInput');
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      cmHandleMmsFile(input);
    });
  });
})();

function cmOpenSpamGuide() {
  document.getElementById('cmSpamGuideOverlay').classList.add('show');
}
function cmCloseSpamGuide() {
  document.getElementById('cmSpamGuideOverlay').classList.remove('show');
}
function cmOpenAdGuide() {
  document.getElementById('cmAdGuideOverlay').classList.add('show');
}
function cmCloseAdGuide() {
  document.getElementById('cmAdGuideOverlay').classList.remove('show');
}

function cmGoSenderSetup() {
  cmCloseSmsModal();
}

function cmSmsSampleTabSwitch(el, mode) {
  var tabs = el.parentElement.querySelectorAll('.cm-sms-sample-tab');
  tabs.forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  var panelSamples = document.getElementById('cmSmsPanelSamples');
  var panelMymsgs = document.getElementById('cmSmsPanelMymsgs');
  if (mode === 'samples') {
    panelSamples.style.display = '';
    panelMymsgs.style.display = 'none';
  } else {
    panelSamples.style.display = 'none';
    panelMymsgs.style.display = '';
    // 내 메세지 그리드가 비어있으면 기본 편집 카드 1개 추가
    var grid = document.getElementById('cmMymsgGrid');
    if (grid && grid.children.length === 0) {
      cmToggleMymsgEditor();
    }
  }
}

function cmOpenMymsgCategoryModal() {
  document.getElementById('cmMymsgCatOverlay').classList.add('show');
}
function cmCloseMymsgCategoryModal() {
  document.getElementById('cmMymsgCatOverlay').classList.remove('show');
}
function cmSaveMymsgCategory() {
  var name = document.getElementById('cmMymsgCatName').value.trim();
  if (!name) return;
  var sel = document.getElementById('cmMymsgCategory');
  var opt = document.createElement('option');
  opt.textContent = name;
  sel.appendChild(opt);
  sel.value = name;
  document.getElementById('cmMymsgCatName').value = '';
  cmCloseMymsgCategoryModal();
}
function cmToggleMymsgEditor() {
  // 그리드에 새 편집 카드 추가
  var grid = document.getElementById('cmMymsgGrid');
  if (!grid) return;
  // 이미 편집 중인 카드가 있으면 추가하지 않음
  if (grid.querySelector('.cm-mymsg-card.editing')) return;
  var card = document.createElement('div');
  card.className = 'cm-mymsg-card editing';
  card.innerHTML = '<textarea placeholder="메세지 내용을 입력하세요" oninput="cmUpdateCardBytes(this)"></textarea>'
    + '<div class="cm-mymsg-card-bytes">0 / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmSaveCard(this)">저장</button>'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()">삭제</button>'
    + '</div>';
  grid.appendChild(card);
  card.querySelector('textarea').focus();
}

function cmUpdateCardBytes(ta) {
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  var bytesEl = ta.closest('.cm-mymsg-card').querySelector('.cm-mymsg-card-bytes');
  if (bytesEl) bytesEl.textContent = bytes + ' / 2000 Bytes';
}

function cmSaveCard(btn) {
  var card = btn.closest('.cm-mymsg-card');
  var ta = card.querySelector('textarea');
  if (!ta || !ta.value.trim()) return;
  var text = ta.value.trim();
  var bytes = 0;
  for (var i = 0; i < text.length; i++) bytes += text.charCodeAt(i) > 127 ? 2 : 1;

  // 편집 카드를 저장된 카드로 변환
  card.classList.remove('editing');
  card.innerHTML = '<div class="cm-mymsg-card-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>'
    + '<div class="cm-mymsg-card-bytes">' + bytes + ' / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmEditCard(this)">수정</button>'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()">삭제</button>'
    + '</div>';
  card.setAttribute('data-fulltext', text);
  // 클릭 시 문자 입력창에 삽입
  card.querySelector('.cm-mymsg-card-body').onclick = function() {
    var smsTA = document.getElementById('cmSmsContent');
    if (smsTA) { smsTA.value = text; smsTA.focus(); cmUpdateSmsBytes(); }
  };
}

function cmEditCard(btn) {
  var card = btn.closest('.cm-mymsg-card');
  var text = card.getAttribute('data-fulltext') || '';
  var bytes = 0;
  for (var i = 0; i < text.length; i++) bytes += text.charCodeAt(i) > 127 ? 2 : 1;
  card.classList.add('editing');
  card.innerHTML = '<textarea oninput="cmUpdateCardBytes(this)">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea>'
    + '<div class="cm-mymsg-card-bytes">' + bytes + ' / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmSaveCard(this)">저장</button>'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()">삭제</button>'
    + '</div>';
  card.querySelector('textarea').focus();
}

function cmGoAutoSmsSetup() {
  cmCloseSmsModal();
}

function cmSendSms() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'SMS send feature.' : '문자 발송 기능입니다.');
}

// 드롭다운 외부 클릭 닫기
document.addEventListener('click', function(e) {
  var menu = document.getElementById('cmOtherMenu');
  var btn = document.getElementById('cmBtnOther');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// 문자 바이트 카운트 - cmSmsContent & cmMymsgTextarea
document.addEventListener('DOMContentLoaded', function() {
  var ta = document.getElementById('cmSmsContent');
  if (ta) {
    ta.addEventListener('input', cmUpdateSmsBytes);
  }
  var ta2 = document.getElementById('cmMymsgTextarea');
  if (ta2) {
    ta2.addEventListener('input', cmUpdateMymsgBytes);
  }
});
// PASS 본인인증
function cmClosePass() {
  document.getElementById('cmPassOverlay').classList.remove('show');
  cmPendingAction = '';
}
function cmSelectCarrier(el) {
  document.querySelectorAll('.cm-pass-carrier').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
}
function cmPassToggleAll(el) {
  document.querySelectorAll('.cm-pass-chk').forEach(function(c) { c.checked = el.checked; });
}
function cmPassSubmit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  cmClosePass();
  alert(isEn ? 'Identity verified. Action completed.' : '본인인증이 완료되었습니다. 처리가 완료되었습니다.');
  cmPendingAction = '';
}
// 고객 자료 엑셀 다운로드
function cmDownloadExcel() {
  var catInfo = cmCategories[cmCurrentCategory] || cmCategories.all;
  var catName = catInfo.ko;
  var now = new Date();
  var ts = now.getFullYear().toString() +
    ('0' + (now.getMonth()+1)).slice(-2) +
    ('0' + now.getDate()).slice(-2) +
    ('0' + now.getHours()).slice(-2) + '_' +
    ('0' + now.getMinutes()).slice(-2);
  var fileName = '고객 관리_' + catName + '_(' + ts + ').xlsx';
  var printTime = now.getFullYear() + '-' +
    ('0' + (now.getMonth()+1)).slice(-2) + '-' +
    ('0' + now.getDate()).slice(-2) + ' ' +
    ('0' + now.getHours()).slice(-2) + ':' +
    ('0' + now.getMinutes()).slice(-2) + ':' +
    ('0' + now.getSeconds()).slice(-2);

  // 테이블 데이터 수집
  var rows = document.querySelectorAll('#cmResultTbody tr');
  var data = [];
  rows.forEach(function(tr) {
    var cells = tr.querySelectorAll('td');
    if (cells.length < 7) return;
    data.push({
      name: cells[1].textContent.trim(),
      phone: cells[2].textContent.trim(),
      lastVisit: cells[3].textContent.trim(),
      grade: cells[4].textContent.trim(),
      staff: cells[5].textContent.trim(),
      sales: cells[6].textContent.trim()
    });
  });

  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:spreadsheet" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"><style>td,th{mso-number-format:"\\@";border:1px solid #000;padding:4px 8px;font-size:12px;font-family:"맑은 고딕";}th{background:#C0C0C0;font-weight:bold;text-align:center;}</style></head><body>';
  html += '<table>';
  html += '<tr><td colspan="6" style="font-size:16px;font-weight:bold;border:1px solid #000;">고객 관리</td></tr>';
  html += '<tr><td colspan="6" style="font-size:14px;font-weight:bold;border:1px solid #000;">' + catName + '</td></tr>';
  html += '<tr><td colspan="6" style="border:none;"></td></tr>';
  html += '<tr><td colspan="6" style="font-size:11px;border:none;">출력일시 : ' + printTime + '</td></tr>';
  html += '<tr><th>고객명</th><th>휴대폰 번호</th><th>최근 방문일</th><th>고객 등급</th><th>담당자</th><th>총 판매액</th></tr>';
  data.forEach(function(r) {
    html += '<tr><td style="text-align:center;">' + r.name + '</td><td style="text-align:center;">' + r.phone + '</td><td style="text-align:center;">' + r.lastVisit + '</td><td style="text-align:center;">' + r.grade + '</td><td style="text-align:center;">' + r.staff + '</td><td style="text-align:right;">' + r.sales + '</td></tr>';
  });
  html += '</table></body></html>';

  var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// ══ [VIEW-12] 고객 관리 / 문자 발송 END ══
