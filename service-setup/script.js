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
  document.getElementById('staffMgmtView').classList.remove('show');
  document.getElementById('payrollView').classList.remove('show');
  document.getElementById('incentiveView').classList.remove('show');
  document.getElementById('paySettingsView').classList.remove('show');
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
  document.getElementById('dcDeleteModal').classList.add('show');
}
function closeDcDeleteModal() {
  document.getElementById('dcDeleteModal').classList.remove('show');
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
    document.getElementById('dlcAlertModal').classList.add('show');
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
    document.getElementById('dlcAlertModal').classList.add('show');
    return;
  }
  // 확인 모달 열기
  document.getElementById('dlcDeleteConfirmModal').classList.add('show');
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
  document.getElementById('dlcAlertModal').classList.remove('show');
}

function closeDlcDeleteConfirmModal() {
  document.getElementById('dlcDeleteConfirmModal').classList.remove('show');
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
  // body lang 클래스 토글
  if (currentLang === 'en') { document.body.classList.add('lang-en'); } else { document.body.classList.remove('lang-en'); }
  // 동적 뷰 리렌더 (번역 루프 전에 실행해야 새 요소에도 적용됨)
  var amsView = document.getElementById('autoMsgSetupView');
  if (amsView && amsView.classList.contains('show') && typeof amsRender === 'function') { amsRender(); }
  var mhView = document.getElementById('msgHistoryView');
  if (mhView && mhView.classList.contains('show') && typeof mhRenderTable === 'function') { mhRenderTable(); }
  // 출퇴근 테이블 리렌더 (지각/조퇴/근무시간 등 동적 텍스트 반영)
  var tcView = document.getElementById('timeClockView');
  if (tcView && tcView.classList.contains('show') && typeof tcSearch === 'function') {
    var tcManage = document.getElementById('tcManageView');
    if (tcManage && tcManage.style.display !== 'none') { tcSearch(); }
  }
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

// 동의서 문자설정: 발송타입 전환 (알림톡 ↔ 문자) — AMS 편집 모달과 동일한 슬라이드 전환
var cstCurrentSendType = 'kakao';
function cstSwitchSendType(mode) {
  if (mode === cstCurrentSendType) return;
  var alimEl = document.getElementById('cstAlimtalkMode');
  var smsEl = document.getElementById('cstSmsMode');
  var outEl = mode === 'sms' ? alimEl : smsEl;
  var inEl = mode === 'sms' ? smsEl : alimEl;
  var outDir = mode === 'sms' ? 'ams-slide-out-left' : 'ams-slide-out-right';
  var inDir = mode === 'sms' ? 'ams-slide-in-right' : 'ams-slide-in-left';

  outEl.classList.add(outDir);
  outEl.addEventListener('animationend', function handler() {
    outEl.removeEventListener('animationend', handler);
    outEl.style.display = 'none';
    outEl.classList.remove(outDir);
    inEl.style.display = '';
    inEl.classList.add(inDir);
    inEl.addEventListener('animationend', function h2() {
      inEl.removeEventListener('animationend', h2);
      inEl.classList.remove(inDir);
    });
  });
  cstCurrentSendType = mode;
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
  { device:'phone', date:'2026-04-06 11:25', phone:'070-7737-4738', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-04-05 16:42', phone:'053-525-7175', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-04-04 11:08', phone:'053-961-2995', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-04-03 12:02', phone:'010-6431-9779', clientNo:'', clientName:'', checked:false, hasSms:true },
  { device:'phone', date:'2026-04-03 11:56', phone:'010-6431-9779', clientNo:'', clientName:'', checked:false, hasSms:true },
  { device:'phone', date:'2026-04-02 12:06', phone:'070-8997-4938', clientNo:'', clientName:'', checked:false },
  { device:'phone', date:'2026-04-01 10:59', phone:'070-4768-8513', clientNo:'', clientName:'', checked:false }
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
    'envSetupView','ahaCallSetupView','ahaCallHistoryView','noticeListView',
    'msgHistoryView','smsRejectView','autoMsgSetupView','senderNumberView',
    'staffMgmtView','staffGoalView','timeClockView','payrollView','incentiveView','paySettingsView'
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
  if (modal) modal.classList.add('show');
}
function cmCloseAlert() {
  var modal = document.getElementById('cmAlertModal');
  if (modal) modal.classList.remove('show');
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
      var chars = ['※','☆','★','♡','♥','○','●','◎','◇','◆','◈','□','■','♦','▣',
        '♣','♧','△','▲','▽','▼','◁','▷','▶','◀','TEL','☎','☏','⊙','●',
        '⇒','⇐','←','→','↑','↓','①','②','③','④','⑤','⑥','⑦','⑧','⑨',
        '—','|','└','┘','┌','┐','·','^0^','*^^*','^_^','(^▽^)b'];
      var grid = document.getElementById('cmSpecialGrid');
      chars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        if (c.length > 2) btn.style.fontSize = '10px';
        btn.textContent = c;
        btn.onclick = function() { cmInsertConvert(c); document.getElementById('cmSpecialChars').style.display = 'none'; };
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
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmEditCard(this)" data-ko="수정" data-en="Edit">수정</button>'
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
  closeMhSmsSendModal();
  openSenderNumberSetup();
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
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmSaveCard(this)" data-ko="저장" data-en="Save">저장</button>'
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
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmEditCard(this)" data-ko="수정" data-en="Edit">수정</button>'
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
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="cmSaveCard(this)" data-ko="저장" data-en="Save">저장</button>'
    + '</div>';
  card.querySelector('textarea').focus();
}

function cmGoAutoSmsSetup() {
  cmCloseSmsModal();
  closeMhSmsSendModal();
  openAutoMsgSetup();
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

// ══════════════════════════════════════════════════════════
// [FEAT-MSG-HISTORY] 문자 발송 내역 / 수신거부 내역
// ══════════════════════════════════════════════════════════

function openMsgHistory() {
  freezeGnb();
  hideAllViews();
  document.getElementById('msgHistoryView').classList.add('show');
  mhFilteredData = mhAllData.slice();
  mhPageCurrent = 1;
  mhRenderTable();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

function backToMsgHistory() {
  hideAllViews();
  document.getElementById('msgHistoryView').classList.add('show');
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

function openSmsRejectView() {
  hideAllViews();
  document.getElementById('smsRejectView').classList.add('show');
  mhSwitchRejectType('sms');
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// ── 데이터 ──
var mhAllData = [
  { idx:'5727314', date:'2026-04-03 09:40', type:'SMS', target:1, scheduled:0, success:1, fail:0, waiting:0, content:'아하소프트가 로그인 되었습니다. 2026-04-03 09:40:24  [zero_shop] [119.196.186.243]', sender:'15444634' },
  { idx:'5725100', date:'2026-04-03 08:00', type:'LMS', target:15, scheduled:0, success:13, fail:2, waiting:0, content:'[아하 네일 스튜디오] 4월 봄맞이 할인 이벤트! 전 시술 20% 할인, 네일+속눈썹 동시 시술 시 추가 10% 할인', sender:'01012345678' },
  { idx:'5715699', date:'2026-04-02 09:24', type:'SMS', target:1, scheduled:0, success:0, fail:1, waiting:0, content:'아하소프트가 로그인 되었습니다. 2026-04-02 09:24:15  [zero_shop] [119.196.186.243]', sender:'15444634' },
  { idx:'5712300', date:'2026-04-01 18:30', type:'MMS', target:8, scheduled:0, success:7, fail:0, waiting:1, content:'[아하 네일 스튜디오] 신규 봄 네일 컬렉션 출시! 파스텔 & 플라워 디자인 입고. 예약 문의 010-1234-5678', sender:'01012345678' },
  { idx:'5705838', date:'2026-04-01 11:07', type:'SMS', target:1, scheduled:0, success:0, fail:1, waiting:0, content:'아하소프트가 로그인 되었습니다. 2026-04-01 11:07:33  [zero_shop] [119.196.186.243]', sender:'15444634' },
  { idx:'5701200', date:'2026-03-31 20:00', type:'KAO', target:25, scheduled:0, success:24, fail:1, waiting:0, content:'[알림톡] 내일 예약이 확정되었습니다. 아하 네일 스튜디오 / 2026-04-01 14:00 / 젤네일 풀세트', sender:'01012345678' },
  { idx:'5698245', date:'2026-03-31 15:41', type:'SMS', target:1, scheduled:0, success:0, fail:1, waiting:0, content:'아하소프트가 로그인 되었습니다. 2026-03-31 15:41:02  [zero_shop] [119.196.186.243]', sender:'15444634' },
  { idx:'5695000', date:'2026-03-30 17:00', type:'LMS', target:32, scheduled:0, success:30, fail:1, waiting:1, content:'[아하 네일 스튜디오] 3월 마지막 주 특별 프로모션! 정액권 10만원 이상 구매 시 1만원 추가 충전 혜택', sender:'01012345678' },
  { idx:'5688551', date:'2026-03-30 16:31', type:'SMS', target:1, scheduled:0, success:0, fail:1, waiting:0, content:'아하소프트가 로그인 되었습니다. 2026-03-30 16:31:18  [zero_shop] [119.196.186.243]', sender:'15444634' },
  { idx:'5680000', date:'2026-03-28 10:00', type:'MMS', target:5, scheduled:0, success:5, fail:0, waiting:0, content:'[아하 네일 스튜디오] 이달의 추천 디자인 모음! 상담 후 시술 시 10% 할인 적용', sender:'01012345678' },
  { idx:'5670000', date:'2026-03-27 14:30', type:'KAO', target:18, scheduled:0, success:17, fail:0, waiting:1, content:'[알림톡] 시술이 완료되었습니다. 후기 작성 시 다음 방문 5% 할인쿠폰 지급!', sender:'01012345678' },
  { idx:'5660000', date:'2026-03-26 09:00', type:'LMS', target:42, scheduled:0, success:40, fail:2, waiting:0, content:'[아하 네일 스튜디오] 봄 시즌 네일 트렌드 안내. 체리블라썸, 그라데이션, 프렌치 등 인기 디자인 예약 가능', sender:'01012345678' },
  { idx:'5635899', date:'2026-03-25 12:13', type:'SMS', target:1, scheduled:0, success:0, fail:1, waiting:0, content:'아하소프트가 로그인 되었습니다. 2026-03-25 12:13:05  [zero_shop] [119.196.186.243]', sender:'15444634' },
  { idx:'5620000', date:'2026-03-22 11:00', type:'MMS', target:10, scheduled:0, success:9, fail:1, waiting:0, content:'[아하 네일 스튜디오] 직원 교육 완료 기념! 3월 한정 신규 고객 첫 방문 30% 할인 이벤트', sender:'01012345678' },
  { idx:'5610000', date:'2026-03-20 16:00', type:'KAO', target:22, scheduled:0, success:21, fail:1, waiting:0, content:'[알림톡] 정액권 잔액 안내: 현재 잔액 50,000원. 충전 시 보너스 적립!', sender:'01012345678' },
  { idx:'5600000', date:'2026-03-18 09:30', type:'LMS', target:35, scheduled:0, success:33, fail:2, waiting:0, content:'[아하 네일 스튜디오] 회원권 만료 임박 안내. 이번 달 내 갱신 시 1개월 무료 연장 혜택!', sender:'01012345678' }
];
var mhPageSize = 10;
var mhPageCurrent = 1;
var mhFilteredData = mhAllData.slice();

function mhRenderTable() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var viewLabel = isEn ? 'View' : '보기';
  var totalPages = Math.max(1, Math.ceil(mhFilteredData.length / mhPageSize));
  if (mhPageCurrent > totalPages) mhPageCurrent = totalPages;
  var start = (mhPageCurrent - 1) * mhPageSize;
  var end = Math.min(start + mhPageSize, mhFilteredData.length);
  var tbody = document.getElementById('mhTbody');
  var html = '';
  for (var i = start; i < end; i++) {
    var d = mhFilteredData[i];
    html += '<tr>' +
      '<td><label class="cm-chk-label"><input type="checkbox" class="mh-row-chk"><span class="cm-checkmark">✓</span></label></td>' +
      '<td>' + d.idx + '</td>' +
      '<td>' + d.date + '</td>' +
      '<td>' + d.type + '</td>' +
      '<td>' + d.target + '</td>' +
      '<td>' + d.scheduled + '</td>' +
      '<td>' + d.success + '</td>' +
      '<td>' + d.fail + '</td>' +
      '<td>' + d.waiting + '</td>' +
      '<td><button class="mh-tbl-btn" onclick="openMhMsgContent(\'' + d.content.replace(/'/g,"\\'") + '\')" data-ko="보기" data-en="View">' + viewLabel + '</button></td>' +
      '<td><button class="mh-tbl-btn" onclick="openMhMsgDetail(' + i + ')" data-ko="보기" data-en="View">' + viewLabel + '</button></td>' +
      '<td><button class="mh-tbl-btn" onclick="openMhMsgDetail(' + i + ')" data-ko="보기" data-en="View">' + viewLabel + '</button></td>' +
      '</tr>';
  }
  if (!mhFilteredData.length) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    html = '<tr><td colspan="12" class="mh-empty">' + (isEn ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
  }
  tbody.innerHTML = html;
  var checkAll = document.getElementById('mhCheckAll');
  if (checkAll) checkAll.checked = false;
  mhUpdatePagingUI();
}

function mhUpdatePagingUI() {
  var pagingEl = document.getElementById('mhPaging');
  if (!pagingEl) return;
  var totalPages = Math.max(1, Math.ceil(mhFilteredData.length / mhPageSize));
  if (mhFilteredData.length > mhPageSize) {
    pagingEl.style.display = 'flex';
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    var html = '';
    html += '<span class="cm-paging-info">' + (isEn ? 'Page' : '페이지') + ' <b>' + mhPageCurrent + '</b> ' + (isEn ? 'of' : '의') + ' <b>' + totalPages + '</b></span>';
    html += '<button class="cm-paging-btn" onclick="mhPageGo(\'first\')" ' + (mhPageCurrent === 1 ? 'disabled' : '') + '>«</button>';
    html += '<button class="cm-paging-btn" onclick="mhPageGo(\'prev\')" ' + (mhPageCurrent === 1 ? 'disabled' : '') + '>‹</button>';
    html += '<button class="cm-paging-btn" onclick="mhPageGo(\'next\')" ' + (mhPageCurrent === totalPages ? 'disabled' : '') + '>›</button>';
    html += '<button class="cm-paging-btn" onclick="mhPageGo(\'last\')" ' + (mhPageCurrent === totalPages ? 'disabled' : '') + '>»</button>';
    html += '<div class="cm-paging-go"><button class="cm-paging-btn" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'\':\'none\'">' + (isEn ? 'Goto' : '이동') + '</button>';
    html += '<select style="display:none;" onchange="mhPageGo(parseInt(this.value));this.style.display=\'none\'">';
    for (var p = 1; p <= totalPages; p++) {
      html += '<option value="' + p + '"' + (p === mhPageCurrent ? ' selected' : '') + '>' + p + '</option>';
    }
    html += '</select></div>';
    pagingEl.innerHTML = html;
  } else {
    pagingEl.style.display = 'none';
  }
}

function mhPageGo(dir) {
  var totalPages = Math.max(1, Math.ceil(mhFilteredData.length / mhPageSize));
  if (typeof dir === 'number') { mhPageCurrent = dir; }
  else if (dir === 'first') mhPageCurrent = 1;
  else if (dir === 'prev') mhPageCurrent = Math.max(1, mhPageCurrent - 1);
  else if (dir === 'next') mhPageCurrent = Math.min(totalPages, mhPageCurrent + 1);
  else if (dir === 'last') mhPageCurrent = totalPages;
  mhRenderTable();
}

// ── 검색 (6개월 검증 포함) ──
function mhSearch() {
  var from = document.getElementById('mhDateFrom').value;
  var to = document.getElementById('mhDateTo').value;
  var type = document.getElementById('mhTypeFilter').value;
  // 6개월 검증
  var today = new Date();
  var sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
  var fromDate = new Date(from);
  if (fromDate < sixMonthsAgo) {
    document.getElementById('mhDateAlertOverlay').classList.add('show');
    return;
  }
  // 필터 적용
  mhFilteredData = mhAllData.filter(function(d) {
    if (type !== 'all' && d.type !== type) return false;
    if (from && d.date < from) return false;
    if (to && d.date > to + ' 23:59') return false;
    return true;
  });
  mhPageCurrent = 1;
  mhRenderTable();
}
function closeMhDateAlert() {
  document.getElementById('mhDateAlertOverlay').classList.remove('show');
}

// ── 체크박스 ──
function mhToggleAll(master) {
  var checks = document.querySelectorAll('#mhTbody .mh-row-chk');
  checks.forEach(function(c) { c.checked = master.checked; });
}

// ── 수신거부 타입 전환 ──
var _mhRejectType = 'sms';
var _mhRejectPage = 1;
var _mhRejectPerPage = 10;

function mhSwitchRejectType(type) {
  _mhRejectType = type;
  _mhRejectPage = 1;
  var smsTable = document.getElementById('mhRejectTableSms');
  var t080Table = document.getElementById('mhRejectTable080');
  if (type === 'sms') {
    smsTable.style.display = '';
    t080Table.style.display = 'none';
  } else {
    smsTable.style.display = 'none';
    t080Table.style.display = '';
  }
  mhRejectPaginate();
}

function mhRejectPaginate() {
  var table = document.getElementById(_mhRejectType === 'sms' ? 'mhRejectTableSms' : 'mhRejectTable080');
  var rows = table.querySelectorAll('tbody tr');
  var total = rows.length;
  var totalPages = Math.ceil(total / _mhRejectPerPage);
  if (totalPages < 1) totalPages = 1;
  if (_mhRejectPage > totalPages) _mhRejectPage = totalPages;
  var start = (_mhRejectPage - 1) * _mhRejectPerPage;
  var end = start + _mhRejectPerPage;
  rows.forEach(function(row, i) {
    row.style.display = (i >= start && i < end) ? '' : 'none';
  });
  document.getElementById('mhRejectCountNum').textContent = total;
  var paging = document.getElementById('mhRejectPaging');
  if (totalPages <= 1) { paging.innerHTML = ''; return; }
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var html = '<span class="cm-paging-info">' + (isEn ? 'Page' : '페이지') + ' <b>' + totalPages + '</b> ' + (isEn ? 'of' : '의') + ' <b>' + _mhRejectPage + '</b></span>';
  html += '<button class="cm-paging-btn" onclick="mhRejectGoPage(1)" ' + (_mhRejectPage <= 1 ? 'disabled' : '') + '>«</button>';
  html += '<button class="cm-paging-btn" onclick="mhRejectGoPage(' + (_mhRejectPage - 1) + ')" ' + (_mhRejectPage <= 1 ? 'disabled' : '') + '>‹</button>';
  html += '<button class="cm-paging-btn" onclick="mhRejectGoPage(' + (_mhRejectPage + 1) + ')" ' + (_mhRejectPage >= totalPages ? 'disabled' : '') + '>›</button>';
  html += '<button class="cm-paging-btn" onclick="mhRejectGoPage(' + totalPages + ')" ' + (_mhRejectPage >= totalPages ? 'disabled' : '') + '>»</button>';
  html += '<button class="cm-paging-btn" onclick="mhRejectGoPage(\'goto\')">' + (isEn ? 'Goto' : '이동') + '</button>';
  paging.innerHTML = html;
}

function mhRejectGoPage(p) {
  if (p === 'goto') {
    var input = prompt('페이지 번호 입력');
    if (!input) return;
    p = parseInt(input);
  }
  p = parseInt(p);
  var table = document.getElementById(_mhRejectType === 'sms' ? 'mhRejectTableSms' : 'mhRejectTable080');
  var total = table.querySelectorAll('tbody tr').length;
  var totalPages = Math.ceil(total / _mhRejectPerPage);
  if (isNaN(p) || p < 1) p = 1;
  if (p > totalPages) p = totalPages;
  _mhRejectPage = p;
  mhRejectPaginate();
}

// ══ 문자발송내역 전용 문자 발송 모달 ══
function openMhSmsSendModal() {
  document.getElementById('mhSmsOverlay').classList.add('show');
  document.getElementById('mhSmsModal').classList.add('show');
  var shopNameEl = document.querySelector('.nav-shop-name');
  var adLine = document.getElementById('mhAdLine');
  if (shopNameEl && adLine) adLine.textContent = '(광고)' + shopNameEl.textContent.trim();
  mhSms2UpdateBytes();
  mhRecvUpdateCount();
  mhSms2CurrentPage = 1;
  mhSms2RenderSamples();
}
function closeMhSmsSendModal() {
  document.getElementById('mhSmsOverlay').classList.remove('show');
  document.getElementById('mhSmsModal').classList.remove('show');
}
function mhSms2UpdateBytes() {
  var ta = document.getElementById('mhSmsContent2');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  document.getElementById('mhSmsBytes2').textContent = bytes;
}
function mhSms2TypeChange(type) {
  var info = cmSmsTypeInfo[type];
  document.getElementById('mhSmsByteLimit2').textContent = info.maxBytes;
  mhSms2UpdateBytes();
  mhSms2CurrentPage = 1;
  mhSms2PerPage = info.perPage;
  // 건당 비용 업데이트
  var costEl = document.getElementById('mhSmsCostLabel');
  if (costEl) costEl.innerHTML = info.cost + '<span class="cm-sms-cost-unit">원 (' + info.label + ')</span>';
  // 총 비용 업데이트
  var ta = document.getElementById('mhRecvTextarea');
  if (ta) {
    var lines = ta.value.split('\n').filter(function(l) { return l.replace(/[^0-9]/g,'').length >= 10; });
    var totalCostEl = document.getElementById('mhSmsTotalCost');
    if (totalCostEl) totalCostEl.innerHTML = (lines.length * info.cost) + '<span>원</span>';
  }
  // MMS 뷰 토글
  var mmsToggle = document.getElementById('mhMmsViewToggle');
  if (mmsToggle) mmsToggle.style.display = type === 'mms' ? 'flex' : 'none';
  // 그리드 컬럼 업데이트
  var grid = document.getElementById('mhSmsPreview');
  if (grid) grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  // 타입 라벨 업데이트
  var label = document.getElementById('mhSampleTypeLabel');
  if (label) label.textContent = info.label;
  mhSms2RenderSamples();
}
function mhSms2SchSwitch(btn, mode) {
  btn.parentElement.querySelectorAll('.cm-sms-sch-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var row = document.getElementById('mhSms2SchRow');
  row.style.display = mode === 'later' ? 'flex' : 'none';
  if (mode === 'later') document.getElementById('mhSms2SchDate').value = new Date().toISOString().slice(0,10);
}
function mhSms2TabSwitch(el, mode) {
  el.parentElement.querySelectorAll('.cm-sms-sample-tab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('mhSms2PanelSamples').style.display = mode === 'samples' ? '' : 'none';
  document.getElementById('mhSms2PanelMymsgs').style.display = mode === 'mymsgs' ? '' : 'none';
}
function mhSms2InsertOptout() {
  var ta = document.getElementById('mhSmsContent2');
  ta.value += '\n무료수신거부 080-808-0132';
  mhSms2UpdateBytes();
  ta.focus();
}
function mhSms2ToggleAdOptout() {
  var adLine = document.getElementById('mhAdLine');
  var screen = adLine.parentElement;
  var fixedBottom = screen.querySelector('.cm-phone-fixed-bottom');
  var btn = document.getElementById('mhOptoutToggleBtn');
  if (!adLine || !fixedBottom || !btn) return;
  var isVisible = !adLine.classList.contains('cm-hidden');
  if (isVisible) {
    adLine.classList.add('cm-hidden');
    fixedBottom.classList.add('cm-hidden');
    btn.textContent = '광고/수신거부 삽입';
    btn.setAttribute('data-ko', '광고/수신거부 삽입');
    btn.setAttribute('data-en', 'Add Ad/Opt-out');
  } else {
    adLine.classList.remove('cm-hidden');
    fixedBottom.classList.remove('cm-hidden');
    btn.textContent = '광고/수신거부 삭제';
    btn.setAttribute('data-ko', '광고/수신거부 삭제');
    btn.setAttribute('data-en', 'Remove Ad/Opt-out');
  }
  mhSms2UpdateBytes();
}

// 특수문자 팝업 (문자발송내역 전용)
var mhSpecialCharsInit = false;
function mhSms2ToggleSpecialChars() {
  var el = document.getElementById('mhSpecialChars');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = '';
    if (!mhSpecialCharsInit) {
      mhSpecialCharsInit = true;
      var chars = ['※','☆','★','♡','♥','○','●','◎','◇','◆','◈','□','■','♦','▣',
        '♣','♧','△','▲','▽','▼','◁','▷','▶','◀','TEL','☎','☏','⊙','●',
        '⇒','⇐','←','→','↑','↓','①','②','③','④','⑤','⑥','⑦','⑧','⑨',
        '—','|','└','┘','┌','┐','·','^0^','*^^*','^_^','(^▽^)b'];
      var grid = document.getElementById('mhSpecialGrid');
      chars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        if (c.length > 2) btn.style.fontSize = '10px';
        btn.textContent = c;
        btn.onclick = function() { mhInsertSpecialChar(c); };
        grid.appendChild(btn);
      });
    }
  } else {
    el.style.display = 'none';
  }
}
function mhInsertSpecialChar(c) {
  var ta = document.getElementById('mhSmsContent2');
  if (!ta) return;
  var start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + c + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + c.length;
  ta.focus();
  mhSms2UpdateBytes();
  document.getElementById('mhSpecialChars').style.display = 'none';
}

// ── 문자발송내역 추천문자 샘플 (고객관리와 동일 데이터 공유) ──
var mhSms2CurrentPage = 1;
var mhSms2PerPage = 6;
var mhMmsViewMode2 = 'image';

function mhSms2RenderSamples() {
  if (typeof cmSmsSamples === 'undefined') return;
  var type = (document.getElementById('mhSmsType2') || {}).value || 'lms';
  var info = cmSmsTypeInfo[type];
  var grid = document.getElementById('mhSmsPreview');
  if (!grid) return;
  grid.innerHTML = '';
  grid.classList.remove('mms-image');

  if (type === 'mms' && mhMmsViewMode2 === 'image') {
    grid.classList.add('mms-image');
    var start = (mhSms2CurrentPage - 1) * info.perPage;
    var items = cmMmsImages.slice(start, start + info.perPage);
    items.forEach(function(src) {
      var card = document.createElement('div');
      card.className = 'cm-mms-image-card';
      card.innerHTML = '<img src="' + src + '" alt="MMS sample">';
      grid.appendChild(card);
    });
    mhSms2UpdatePaging(cmMmsImages.length, info.perPage);
  } else {
    var samples = cmSmsSamples[type] || cmSmsSamples.lms;
    var start = (mhSms2CurrentPage - 1) * info.perPage;
    var items = samples.slice(start, start + info.perPage);
    items.forEach(function(text) {
      var bytes = cmCalcBytes(text);
      var card = document.createElement('div');
      card.className = 'cm-sms-preview-card';
      card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>'
        + '<div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
      grid.appendChild(card);
    });
    mhSms2UpdatePaging(samples.length, info.perPage);
  }
  // 그리드 컬럼
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
}

function mhSms2UpdatePaging(total, perPage) {
  var totalPages = Math.max(1, Math.ceil(total / perPage));
  var cur = document.getElementById('mhSmsPageCur');
  var tot = document.getElementById('mhSmsPageTotal');
  if (tot) tot.textContent = totalPages;
  if (cur) cur.textContent = mhSms2CurrentPage;
}

function mhSms2PageGo(dir) {
  if (typeof cmSmsSamples === 'undefined') return;
  var type = (document.getElementById('mhSmsType2') || {}).value || 'lms';
  var info = cmSmsTypeInfo[type];
  var samples = (type === 'mms' && mhMmsViewMode2 === 'image') ? cmMmsImages : (cmSmsSamples[type] || cmSmsSamples.lms);
  var totalPages = Math.max(1, Math.ceil(samples.length / info.perPage));
  if (dir === 'first') mhSms2CurrentPage = 1;
  else if (dir === 'prev') mhSms2CurrentPage = Math.max(1, mhSms2CurrentPage - 1);
  else if (dir === 'next') mhSms2CurrentPage = Math.min(totalPages, mhSms2CurrentPage + 1);
  else if (dir === 'last') mhSms2CurrentPage = totalPages;
  mhSms2RenderSamples();
}

function mhMmsViewSwitch2(mode) {
  mhMmsViewMode2 = mode;
  mhSms2CurrentPage = 1;
  mhSms2RenderSamples();
}

function mhSms2SelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  var ta = document.getElementById('mhSmsContent2');
  if (ta) { ta.value = body.textContent; mhSms2UpdateBytes(); }
}

function mhRecvUpdateCount() {
  var ta = document.getElementById('mhRecvTextarea');
  if (!ta) return;
  var lines = ta.value.split('\n').filter(function(l) { return l.replace(/[^0-9]/g,'').length >= 10; });
  var el = document.getElementById('mhRecvCount');
  if (el) el.textContent = lines.length;
  var targetEl = document.getElementById('mhSmsTargetCount');
  var costEl = document.getElementById('mhSmsTotalCost');
  if (targetEl) targetEl.innerHTML = lines.length + '<span class="cm-sms-cost-unit">명</span>';
  var type = (document.getElementById('mhSmsType2') || {}).value || 'lms';
  var info = cmSmsTypeInfo[type];
  if (costEl) costEl.innerHTML = (lines.length * info.cost) + '<span>원</span>';
}

// ══ 내 메세지 편집 카드 (문자발송내역용) ══
function mhToggleMymsgEditor() {
  var grid = document.getElementById('mhMymsgGrid');
  if (!grid) return;
  if (grid.querySelector('.cm-mymsg-card.editing')) return;
  var card = document.createElement('div');
  card.className = 'cm-mymsg-card editing';
  card.innerHTML = '<textarea placeholder="메세지 내용을 입력하세요" oninput="mhUpdateCardBytes(this)"></textarea>'
    + '<div class="cm-mymsg-card-bytes">0 / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="mhSaveCard(this)" data-ko="저장" data-en="Save">저장</button>'
    + '</div>';
  grid.appendChild(card);
  card.querySelector('textarea').focus();
}
function mhUpdateCardBytes(ta) {
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  var bytesEl = ta.closest('.cm-mymsg-card').querySelector('.cm-mymsg-card-bytes');
  if (bytesEl) bytesEl.textContent = bytes + ' / 2000 Bytes';
}
function mhSaveCard(btn) {
  var card = btn.closest('.cm-mymsg-card');
  var ta = card.querySelector('textarea');
  if (!ta || !ta.value.trim()) return;
  var text = ta.value.trim();
  var bytes = 0;
  for (var i = 0; i < text.length; i++) bytes += text.charCodeAt(i) > 127 ? 2 : 1;
  card.classList.remove('editing');
  card.setAttribute('data-fulltext', text);
  card.innerHTML = '<div class="cm-mymsg-card-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>'
    + '<div class="cm-mymsg-card-bytes">' + bytes + ' / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="mhEditCard(this)" data-ko="수정" data-en="Edit">수정</button>'
    + '</div>';
  card.querySelector('.cm-mymsg-card-body').onclick = function() {
    var ta2 = document.getElementById('mhSmsContent2');
    if (ta2) { ta2.value = text; mhSms2UpdateBytes(); }
  };
}
function mhEditCard(btn) {
  var card = btn.closest('.cm-mymsg-card');
  var text = card.getAttribute('data-fulltext') || '';
  card.classList.add('editing');
  card.innerHTML = '<textarea oninput="mhUpdateCardBytes(this)">' + text + '</textarea>'
    + '<div class="cm-mymsg-card-bytes">0 / 2000 Bytes</div>'
    + '<div class="cm-mymsg-card-btns">'
    + '<button class="cm-mymsg-card-btn sv-del" onclick="this.closest(\'.cm-mymsg-card\').remove()" data-ko="삭제" data-en="Delete">삭제</button>'
    + '<button class="cm-mymsg-card-btn sv-save" onclick="mhSaveCard(this)" data-ko="저장" data-en="Save">저장</button>'
    + '</div>';
  var ta = card.querySelector('textarea');
  mhUpdateCardBytes(ta);
  ta.focus();
}

// ══ 나의 메세지 등록 (메세지내용 저장용) ══
function openMhMyMsgReg() {
  document.getElementById('mhMyMsgRegOverlay').classList.add('show');
}
function closeMhMyMsgReg() {
  document.getElementById('mhMyMsgRegOverlay').classList.remove('show');
}
function mhDoRegMyMsg() {
  alert('메세지가 저장되었습니다.');
  closeMhMyMsgReg();
}

// ══ 메세지내용 모달 (cst-modal 패턴) ══
function openMhMsgContent(text) {
  document.getElementById('mhMsgContentText').textContent = text || '';
  document.getElementById('mhMsgContentOverlay').classList.add('show');
}
function closeMhMsgContent() {
  document.getElementById('mhMsgContentOverlay').classList.remove('show');
}
function mhSaveMsgContent() {
  openMhMyMsgReg();
}

// ══ 메세지 세부내용 모달 ══
function openMhMsgDetail(idx) {
  var d = mhFilteredData[idx] || mhFilteredData[0];
  document.getElementById('mhDetailSenderNo').textContent = d.sender;
  var tbody = document.getElementById('mhDetailTbody');
  var failCode = d.fail > 0 ? '30125' : '';
  tbody.innerHTML = '<tr>' +
    '<td>' + d.idx + '</td>' +
    '<td>zero_shop</td>' +
    '<td>111</td>' +
    '<td>' + d.date + '</td>' +
    '<td class="mh-detail-msg-cell"><span class="mh-detail-msg-text">' + d.content.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</span><div class="mh-detail-msg-tooltip">' + d.content.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div></td>' +
    '<td></td>' +
    '<td>' + d.scheduled + '</td>' +
    '<td>' + d.success + '</td>' +
    '<td>' + failCode + '</td>' +
    '<td>' + d.waiting + '</td></tr>';
  document.getElementById('mhDetailResultFilter').value = 'all';
  document.getElementById('mhMsgDetailOverlay').classList.add('show');
}
function closeMhMsgDetail() {
  document.getElementById('mhMsgDetailOverlay').classList.remove('show');
}
function mhFilterDetail() {
  // placeholder for result filtering
}

// ══ 실패 코드 모달 ══
var mhFailCodes = [
  ['20000~29xxx','※ 시스템 관련 오류 (인증, API, 공통)','9800','메시지 중복(내부 시스템)'],
  ['30000','메시지 중복','30101','단말기 메시지 FULL'],
  ['30102','타임아웃','30103','무선망에러'],
  ['30105','메시지 중복 발송','30106','월 송신 건수 초과'],
  ['30108','기타에러','30109','착신번호 에러(자리수에러)'],
  ['30110','착신번호 에러(없는 국번)','30111','수신거부 메시지 없음'],
  ['30112','21 시 이후 광고','30113','성인광고, 대출광고 등 기타 제한'],
  ['30114','데이콤 스팸 필터링','30115','야간발송차단'],
  ['30116','사전 미등록 발신번호 사용','30117','전화번호 세칙 미준수 발신번호 사용'],
  ['30118','메시지 형식 오류','30119','발신번호 변작으로 등록된 발신번호 사용'],
  ['30120','번호도용문자차단서비스에 가입된 발신번호 사용','30122','단말기착신거부(스팸등)'],
  ['30125','비가입자,결번,서비스정지','30126','단말기 Power-off 상태'],
  ['30127','음영','31000','잘못된 번호'],
  ['31001','잘못된 컨텐츠','31002','기타'],
  ['31003','건수 부족','31004','중복된 키 접수 차단'],
  ['31100','포맷 에러','31101','수신번호 에러'],
  ['31102','컨텐츠 사이즈 및 개수 초과','31103','잘못된 컨텐츠'],
  ['31104','기업형 MMS 미지원 단말기','31105','단말기 메시지 저장개수 초과'],
  ['31106','전송시간 초과','31107','전원 꺼짐'],
  ['31108','음영지역','31109','기타'],
  ['31110','서버문제로 인한 접수 실패','31111','단말기 일시 서비스 정지'],
  ['31112','통신사 내부 실패(무선망단)','31113','서비스의 일시적인 에러'],
  ['31114','계정 차단','31115','허용되지 않은 IP 접근'],
  ['31116','국제 MMS 발송 권한이 없음','31117','번호이동 에러'],
  ['31118','내부 시스템 오류','31119','스팸'],
  ['31120','중복된 수신번호 접수 차단','31122','전화번호 세칙 미준수 발신번호 사용'],
  ['31123','발신번호 변작으로 등록된 발신번호 사용','31124','번호도용문자차단서비스에 가입된 발신번호 사용'],
  ['32000','데이터 없음','32004','이미지 오류(용량, 사이즈, 파일형식)'],
  ['32005','인증 에러','32113','기타에러.'],
  ['32114','성공불확실(3 일이내수신가능)','32116','전화번호오류'],
  ['32118','메시지길이초과','32119','템플릿 없음'],
  ['32120','메시지를 전송할 수 없음','32121','메시지발송불가시간'],
  ['32123','리포트수신대기 타임아웃','32124','발송시간 지난 데이터'],
  ['32128','존재하지 않는 첨부파일','32129','0 바이트 첨부파일'],
  ['32130','지원하지 않는 첨부파일','32133','메시지본문 길이 초과'],
  ['32134','대체발송(SMS) 메시지본문 길이 초과','32136','MMS 첨부파일 이미지 사이즈 초과'],
  ['32137','기타 에러','32138','형식 오류'],
  ['32140','미등록 발신번호, 발신번호 세칙 위반','32143','Block time (날짜/시간제한)'],
  ['32194','유효하지 않은 발신번호','39000','전원꺼짐'],
  ['기타','※ 기타 발송 결과 오류','','']
];

var mhFailCodePage = 1;
var mhFailCodePerPage = 10;

function openMhFailCode() {
  mhFailCodePage = 1;
  mhRenderFailCodes();
  document.getElementById('mhFailCodeOverlay').classList.add('show');
}
function closeMhFailCode() {
  document.getElementById('mhFailCodeOverlay').classList.remove('show');
}

function mhRenderFailCodes() {
  var total = mhFailCodes.length;
  var totalPages = Math.ceil(total / mhFailCodePerPage);
  var start = (mhFailCodePage - 1) * mhFailCodePerPage;
  var end = Math.min(start + mhFailCodePerPage, total);
  var tbody = document.getElementById('mhFailCodeTbody');
  var html = '';
  for (var i = start; i < end; i++) {
    var r = mhFailCodes[i];
    html += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>';
  }
  tbody.innerHTML = html;

  var paging = document.getElementById('mhFailCodePaging');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var html = '';
  html += '<span class="cm-paging-info">' + (isEn ? 'Page' : '페이지') + ' <b>' + mhFailCodePage + '</b> ' + (isEn ? 'of' : '의') + ' <b>' + totalPages + '</b></span>';
  html += '<button class="cm-paging-btn" onclick="mhFailCodeGoPage(1)" ' + (mhFailCodePage <= 1 ? 'disabled' : '') + '>«</button>';
  html += '<button class="cm-paging-btn" onclick="mhFailCodeGoPage(' + (mhFailCodePage - 1) + ')" ' + (mhFailCodePage <= 1 ? 'disabled' : '') + '>‹</button>';
  html += '<button class="cm-paging-btn" onclick="mhFailCodeGoPage(' + (mhFailCodePage + 1) + ')" ' + (mhFailCodePage >= totalPages ? 'disabled' : '') + '>›</button>';
  html += '<button class="cm-paging-btn" onclick="mhFailCodeGoPage(' + totalPages + ')" ' + (mhFailCodePage >= totalPages ? 'disabled' : '') + '>»</button>';
  html += '<div class="cm-paging-go"><button class="cm-paging-btn" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'\':\'none\'">' + (isEn ? 'Goto' : '이동') + '</button>';
  html += '<select style="display:none;" onchange="mhFailCodeGoPage(parseInt(this.value));this.style.display=\'none\'">';
  for (var fp = 1; fp <= totalPages; fp++) {
    html += '<option value="' + fp + '"' + (fp === mhFailCodePage ? ' selected' : '') + '>' + fp + '</option>';
  }
  html += '</select></div>';
  paging.innerHTML = html;
}

function mhFailCodeGoPage(p) {
  p = parseInt(p);
  var totalPages = Math.ceil(mhFailCodes.length / mhFailCodePerPage);
  if (isNaN(p) || p < 1) p = 1;
  if (p > totalPages) p = totalPages;
  mhFailCodePage = p;
  mhRenderFailCodes();
}

// ══ 삭제 확인 모달 (svc-popup 패턴) ══
function openMhDeleteConfirm() {
  document.getElementById('mhDeleteOverlay').classList.add('show');
}
function closeMhDeleteConfirm() {
  document.getElementById('mhDeleteOverlay').classList.remove('show');
}
function mhDoDelete() {
  alert('삭제되었습니다.');
  closeMhDeleteConfirm();
}

// ══ 이동통신사 별 스팸규제 안내 팝업 ══
function openMhSpamInfoPopup() {
  document.getElementById('mhSpamInfoOverlay').style.display = 'flex';
}
function closeMhSpamInfoPopup() {
  document.getElementById('mhSpamInfoOverlay').style.display = 'none';
}

// ══ [FEAT-MSG-HISTORY] END ══

// ══════════════════════════════════════════════════════════
// [FEAT-AUTO-MSG] 문자 자동 발송 설정
// ══════════════════════════════════════════════════════════

function openAutoMsgSetup() {
  freezeGnb();
  hideAllViews();
  document.getElementById('autoMsgSetupView').classList.add('show');
  amsCurrentTab = 'booking';
  amsCurrentSub = null;
  amsRender();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

var amsCurrentTab = 'booking';
var amsCurrentSub = null;

// ── 탭/서브탭 구조 ──
var amsTabs = {
  booking: {
    subs: [
      { key:'booking_alert', ko:'예약 알림', en:'Booking Reminder' },
      { key:'point_prepaid', ko:'포인트 / 정액권 / 티켓', en:'Points / Prepaid Card / Prepaid Service' },
      { key:'deposit_alert', ko:'예약금 알림', en:'Booking Deposit Notification' }
    ]
  },
  care: {
    subs: [
      { key:'visit_thanks', ko:'방문 감사', en:'Visit Thank You' },
      { key:'aftercare', ko:'시술 후 관리', en:'Post-Service Care' }
    ]
  },
  marketing: {
    subs: [
      { key:'revisit', ko:'재방문 유도', en:'Revisit Encouragement' },
      { key:'birthday', ko:'생일 축하', en:'Birthday Greetings' }
    ]
  }
};

// ── 카드 데이터 ──
// conditional: true = 조건부 발송 탭 (재방문/시술후 관리) - 마스터 설정 + 추가 버튼 표시
var amsCards = {
  booking_alert: [
    { id:'ba1', title:{ko:'선택일 알림 (2~30일전)',en:'Selection date notification (2 to 30 days ago)'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'예약 2~30일 전 발송',en:'Sent 2-30 days before booking'}, preview:'((성명))님, ((예약일)) ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오' },
    { id:'ba2', title:{ko:'전날 알림 (1일전)',en:'Notification from the day before (1 day before)'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'예약 전날 발송',en:'Sent day before booking'}, preview:'((성명))님, 내일 ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오' },
    { id:'ba3', title:{ko:'예약일 당일',en:'On the day'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'예약 당일 오전 발송',en:'Sent on the morning of booking'}, preview:'((성명))님, 오늘 ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오' },
    { id:'ba4', title:{ko:'예약 시간 전',en:'Hours before'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'예약 시간 1~2시간 전 발송',en:'Sent 1-2 hours before booking time'}, preview:'((성명))님, 곧 ((예약시간)) 예약 시간입니다. 아하 네일 스튜디오' },
    { id:'ba5', title:{ko:'예약등록 확인',en:'Booking registrations notification'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'예약 등록 즉시 발송',en:'Sent immediately after booking'}, preview:'((성명))님, ((예약일)) ((예약시간)) 예약이 등록되었습니다.' },
    { id:'ba6', title:{ko:'예약취소 확인',en:'Booking cancel confirm'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'예약 취소 즉시 발송',en:'Sent immediately after cancellation'}, preview:'((성명))님, ((예약일)) ((예약시간)) 예약이 취소되었습니다.' }
  ],
  point_prepaid: [
    { id:'pp1', title:{ko:'포인트(적립시) 알림',en:'Points add notification'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'즉시 발송',en:'Sent immediately'}, preview:'< 포인트 안내 >\n*적립:((적립))P\n*누적:((누적))P\n방문 감사합니다!\n-아하 네일 스튜디오' },
    { id:'pp2', title:{ko:'포인트(사용시) 알림',en:'Points deduction notification'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'즉시 발송',en:'Sent immediately'}, preview:'< 포인트 안내 >\n*차감:((사용))점\n*잔여:((누적))점\n이용 감사합니다!\n-아하 네일 스튜디오' },
    { id:'pp3', title:{ko:'정액권 잔액(판매시) 알림',en:'Balance add notification'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'즉시 발송',en:'Sent immediately'}, preview:'((성명))님 회원권 구입안내\n((정액권명)) / ((선적))원 적립되었습니다\n-아하 네일 스튜디오' },
    { id:'pp4', title:{ko:'정액권 잔액(차감시) 알림',en:'Balance deduction notification'}, type:'LMS', alimtalk:true, active:false, timing:{ko:'즉시 발송',en:'Sent immediately'}, preview:'☆ 아하 네일 스튜디오 정액권 사용 안내 ☆\n\n고객님의 정액권 사용내역 입니다.\n\n◇ 정액권명 : ((정액권명))\n◇ 사용금액 : ((선차))원\n◇ 잔액 : ((선잔))원\n\n현재 사용가능한 정액권의 전체잔액은\n((총잔))원 입니다\n\n방문해 주셔서 감사합니다.' },
    { id:'pp5', title:{ko:'정액권 만료일 알림',en:'Prepaid card expiry date reminder'}, type:'LMS', active:false, timing:{ko:'만료 전 발송',en:'Sent before expiry'}, preview:'((성명))고객님의 회원권\n((정액권명)) / 잔액((선잔))원\n\n유효기간은 ((만료일)) 까지 사용가능 합니다.\n\n금액이 많이 남아 있으시니 기간 내에 오셔서 관리 받으시고 행복한 하루 되세요.\n\n-아하 네일 스튜디오' },
    { id:'pp6', title:{ko:'티켓잔여횟수(판매시)',en:'Prepaid service quantity add notification'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'즉시 발송',en:'Sent immediately'}, preview:'회원권 구매를 감사드립니다.\n*회원권명: ((티켓명))\n*적립횟수: ((적회))회\n-아하 네일 스튜디오' },
    { id:'pp7', title:{ko:'티켓 잔여횟수(차감시) 알림',en:'Prepaid service quantity deduction notification'}, type:'SMS', alimtalk:true, active:false, timing:{ko:'즉시 발송',en:'Sent immediately'}, preview:'*회원권알림\n((성명))님의 ((서비스명)) 회원권이 ((잔회))회 남았습니다\n-아하 네일 스튜디오' },
    { id:'pp8', title:{ko:'티켓 만료일 알림',en:'Prepaid service expiry date reminder'}, type:'LMS', active:false, timing:{ko:'만료 전 발송',en:'Sent before expiry'}, preview:'((성명))고객님의\n((티켓명)) / 잔여횟수 ((잔회))회\n\n유효기간은 ((만료일)) 까지 사용가능 합니다.\n\n회원권 잔여횟수 많이 남아 있으시니 기간 내에 오셔서 관리해주세요.\n\n-아하 네일 스튜디오' }
  ],
  deposit_alert: [
    { id:'da1', title:{ko:'예약금 안내',en:'Booking deposit guide'}, type:'LMS', active:true, timing:{ko:'예약 등록 시 발송',en:'Sent when booking is made'}, preview:'*예약금 입금 안내*\n제로샵입니다\n예약확정을 위해 예약금 입금 부탁드립니다.\n\n1. 예약내용\n-예약일: ((예약월일)) ((예약시각))\n-예약자: ((성명))\n\n2. 예약금 입금정보\n-예약금: ((예약금))원\n-국민은행 000-00000-000\n-예금주 : 000' },
    { id:'da2', title:{ko:'예약금 입금 확인',en:'Booking deposit payment confirmation'}, type:'LMS', active:true, timing:{ko:'입금 확인 시 발송',en:'Sent when deposit is confirmed'}, preview:'* 제로샵 입니다.예약금 입금확인 되어 아래와 같이 고객님의 예약이 확정 되었습니다\n\n* 예약정보\n예약일시 : ((예약월일)) ((예약시각))\n\n* 예약금 환불규정\n예약일 2일전까지 예약취소시 예약금은 전액환불되며, 전일/당일예약 취소시 예약금은 위약금으로 처리됩니다' }
  ],
  visit_thanks: [
    { id:'vt1', title:{ko:'첫방문 고객',en:'First Visit Clients'}, type:'SMS', active:false, timing:{ko:'판매 등록 시 자동 발송',en:'Sent on sales registration'}, preview:'((성명))님, 첫 방문 감사합니다! 다음 방문도 기대하겠습니다. 아하 네일 스튜디오' },
    { id:'vt2', title:{ko:'재방문 고객',en:'Revisit Clients'}, type:'SMS', active:false, timing:{ko:'판매 등록 시 자동 발송',en:'Sent on sales registration'}, preview:'((성명))님, 오늘도 방문해 주셔서 감사합니다! 아하 네일 스튜디오' }
  ],
  aftercare: [
    { id:'ac1', title:{ko:'시술 후 관리 문자',en:'Post-Service Care Message'}, type:'SMS', active:true, category:{ko:'커트, 드라이',en:'Cut, Blow Dry'}, timing:{ko:'방문 1일 후 · 10:00 발송',en:'1 day after visit · 10:00'}, preview:'커트 드라이 시술한지 오래되셨네요. 재방문하셔서 관리해주세요' }
  ],
  revisit: [
    { id:'rv1', title:{ko:'재방문 유도 문자',en:'Revisit Encouragement Message'}, type:'SMS', active:true, category:{ko:'전체',en:'All'}, timing:{ko:'방문 5일 후 · 10:00 발송',en:'5 days after visit · 10:00'}, preview:'전체분류에서 재방문해주세요.' }
  ],
  birthday: [
    { id:'bd1', title:{ko:'생일 축하',en:'Birthday Greetings'}, type:'SMS', active:false, timing:{ko:'생일 당일 오전 발송',en:'Sent on birthday morning'}, preview:'((성명))님, 생일 축하드립니다! 특별한 혜택을 준비했습니다. 아하 네일 스튜디오' }
  ]
};

// 조건부 발송 탭 (마스터 설정 영역 표시)
var amsConditionalSubs = ['aftercare','revisit'];

// ── 렌더링 ──
function amsRender() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var tabData = amsTabs[amsCurrentTab];
  if (!tabData) return;

  // 서브탭
  var subHtml = '';
  tabData.subs.forEach(function(s, i) {
    var isActive = amsCurrentSub ? amsCurrentSub === s.key : i === 0;
    if (!amsCurrentSub && i === 0) amsCurrentSub = s.key;
    subHtml += '<button class="ams-subtab' + (isActive ? ' active' : '') + '" onclick="amsSwitchSub(\'' + s.key + '\')" data-ko="' + s.ko + '" data-en="' + s.en + '">' + (isEn ? s.en : s.ko) + '</button>';
  });
  document.getElementById('amsSubtabs').innerHTML = subHtml;

  var isConditional = amsConditionalSubs.indexOf(amsCurrentSub) >= 0;
  var cards = amsCards[amsCurrentSub] || [];
  var html = '';

  // 조건부 탭: 마스터 설정 + 새 알림 추가 버튼
  if (isConditional) {
    var masterLabel = amsCurrentSub === 'revisit'
      ? {ko:'고객이 일정 기간 미 방문할 경우 재방문 유도 문자가 자동 발송되도록 설정합니다.', en:'Set to automatically send a Revisit Encouragement Message if the client does not visit for a certain period.'}
      : {ko:'시술 후 주의 사항, 관리 주기 안내 등의 문자가 자동 발송 되도록 설정합니다.', en:'Set to automatically send messages such as post-service precautions and service cycle guidance.'};
    html += '<div class="ams-master-row">';
    html += '<span class="ams-master-desc">' + (isEn ? masterLabel.en : masterLabel.ko) + '</span>';
    html += '<button class="ams-add-btn" onclick="amsOpenNewAlert()"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg> <span data-ko="문자 발송 등록" data-en="Add Message">' + (isEn ? 'Add Message' : '문자 발송 등록') + '</span></button>';
    html += '</div>';
  }

  // 카드
  if (cards.length === 0) {
    html += '<div class="ams-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#BDBDBD" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>';
    html += '<p data-ko="등록된 알림이 없습니다." data-en="There is no setup automatic messaging.">' + (isEn ? 'There is no setup automatic messaging.' : '등록된 알림이 없습니다.') + '</p>';
    if (isConditional) {
      html += '<button class="ams-add-btn" onclick="amsOpenNewAlert()"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg> <span>' + (isEn ? 'Add Message' : '문자 발송 등록') + '</span></button>';
    }
    html += '</div>';
  } else {
    cards.forEach(function(c) {
      var titleText = isEn ? c.title.en : c.title.ko;
      var timingText = isEn ? (c.timing.en || c.timing.ko) : c.timing.ko;
      var categoryBadge = c.category ? '<span class="ams-card-badge">' + (isEn ? c.category.en : c.category.ko) + '</span>' : '';
      html += '<div class="ams-card">' +
        '<div class="ams-card-header">' +
          '<div class="ams-card-header-left"><span class="ams-card-title">' + titleText + '</span><div class="ams-card-badges"><span class="ams-card-type">' + c.type + '</span>' + (c.alimtalk ? '<span class="ams-card-alimtalk">' + (isEn ? 'kakao' : '알림톡 가능') + '</span>' : '') + '</div></div>' +
          '<div class="ams-toggle' + (c.active ? ' on' : '') + '" onclick="amsToggle(\'' + c.id + '\',this)"></div>' +
        '</div>' +
        (categoryBadge ? '<div class="ams-card-category-row">' + categoryBadge + '</div>' : '') +
        '<div class="ams-card-timing">' + timingText + '</div>' +
        '<div class="ams-card-preview">' + c.preview + '</div>' +
        '<div class="ams-card-footer">' +
          (isConditional ? '<button class="ams-card-delete-btn" onclick="amsDeleteCard(\'' + c.id + '\')">' +
            (isEn ? 'Delete' : '삭제') +
          '</button>' : '') +
          '<button class="ams-card-edit-btn" onclick="amsOpenEdit(\'' + c.id + '\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> ' +
            (isEn ? 'Edit' : '내용 및 설정 수정') +
          '</button>' +
        '</div>' +
      '</div>';
    });
  }
  document.getElementById('amsCardList').innerHTML = html;
}

function amsSwitchTab(btn, tab) {
  document.querySelectorAll('#amsTabs .ams-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  amsCurrentTab = tab;
  amsCurrentSub = null;
  amsRender();
}

function amsSwitchSub(key) {
  amsCurrentSub = key;
  amsRender();
}

function amsToggle(id, el) {
  el.classList.toggle('on');
  for (var key in amsCards) {
    amsCards[key].forEach(function(c) {
      if (c.id === id) c.active = el.classList.contains('on');
    });
  }
}

function amsDeleteCard(id) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!confirm(isEn ? 'Are you sure you want to delete this alert?' : '해당 알림을 삭제하시겠습니까?')) return;
  for (var key in amsCards) {
    amsCards[key] = amsCards[key].filter(function(c) { return c.id !== id; });
  }
  amsRender();
}

// ── 새 알림 조건 추가 모달 ──
var amsNewAlertCardId = null;
function amsOpenNewAlert() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  // 새 카드 임시 생성
  var newCard = {
    id: 'new_' + Date.now(),
    type: 'SMS',
    active: false,
    timing: { ko: '방문 1일 후 · 10:00 발송', en: '1 day(s) after · 10:00' },
    preview: '',
    title: amsCurrentSub === 'aftercare'
      ? { ko: '시술 후 관리 문자', en: 'Post-Service Care Message' }
      : { ko: '재방문 유도 문자', en: 'Revisit Encouragement Message' },
    category: { ko: '', en: '' }
  };

  // 카드 데이터에 추가
  if (!amsCards[amsCurrentSub]) amsCards[amsCurrentSub] = [];
  amsCards[amsCurrentSub].push(newCard);
  amsEditCardData = newCard;
  amsNewAlertCardId = newCard.id;

  // 타이틀
  document.getElementById('amsEditTitle').textContent = isEn ? newCard.title.en : newCard.title.ko;

  // 안내문
  var noticeText = amsCurrentSub === 'aftercare'
    ? { ko: '시술 후 관리 문자가 자동으로 발송되도록 설정합니다', en: 'Automatic post-treatment care messages' }
    : { ko: '재방문 유도 문자가 자동으로 발송되도록 설정합니다', en: 'Automatic revisit promotion messages' };
  document.getElementById('amsEditNotice').textContent = isEn ? noticeText.en : noticeText.ko;

  // 모든 모드 숨기기
  document.getElementById('amsEditAlimtalkMode').style.display = 'none';
  document.getElementById('amsEditSmsMode').style.display = 'none';
  document.getElementById('amsEditExpiryMode').style.display = 'none';
  document.getElementById('amsEditDepositMode').style.display = 'none';
  document.getElementById('amsEditVisitThanksMode').style.display = 'none';
  document.getElementById('amsEditAftercareMode').style.display = 'none';
  document.getElementById('amsEditCostInfo').style.display = 'none';
  document.querySelector('.ams-edit-setting-bar').style.display = 'none';

  // 시술 후 관리 모드 표시
  document.getElementById('amsEditAftercareMode').style.display = '';

  // 등록 기준 라디오 (재방문 유도만 표시)
  var isRevisitNew = (amsCurrentSub === 'revisit');
  document.querySelectorAll('.ams-ac-basis-item').forEach(function(el) { el.style.display = isRevisitNew ? '' : 'none'; });
  // 시술후 관리: 분류 항상 활성화 / 재방문 유도: 라디오에 따라 제어
  if (!isRevisitNew) {
    document.getElementById('amsAcCategoryWrap').classList.remove('disabled');
  }

  // 재방문 유도: 발송일 줄바꿈
  var revisitBreak = document.querySelector('.ams-ac-revisit-break');
  if (revisitBreak) revisitBreak.style.display = isRevisitNew ? '' : 'none';

  // 발송 대상 고객 (재방문 유도만 표시)
  document.getElementById('amsAcTargetLabel').style.display = isRevisitNew ? '' : 'none';
  document.querySelectorAll('.ams-ac-target-item').forEach(function(el) { el.style.display = isRevisitNew ? '' : 'none'; });
  if (isRevisitNew) {
    document.querySelector('input[name="amsAcTarget"][value="all"]').checked = true;
  }

  // 초기화
  var acTa = document.getElementById('amsAcMsgText');
  if (acTa) acTa.value = '';
  document.getElementById('amsAcMsgType').value = 'sms';
  amsAcUpdateBytes();

  // 전환문자
  var convVars = [
    { field: { ko: '고객명', en: 'Client Name' }, v: '((성명))' },
    { field: { ko: '담당자명(별칭)', en: 'Staff Name (Alias)' }, v: '((담당자명))' }
  ];
  var convHtml = '';
  convVars.forEach(function(cv) {
    convHtml += '<tr><td>' + (isEn ? cv.field.en : cv.field.ko) + '</td><td class="cst-var-link"><span onclick="amsEditInsertConv(\'' + cv.v + '\')">' + cv.v + '</span></td></tr>';
  });
  document.getElementById('amsAcConvBody').innerHTML = convHtml;

  // 등록 기준 라디오 + 멀티셀렉트 초기화
  document.querySelector('input[name="amsAcBasis"][value="all"]').checked = true;
  if (isRevisitNew) {
    document.getElementById('amsAcCategoryWrap').classList.add('disabled');
  } else {
    document.getElementById('amsAcCategoryWrap').classList.remove('disabled');
  }
  document.querySelectorAll('#amsAcMultiDropdown input[type="checkbox"]').forEach(function(c) { c.checked = false; });
  amsAcMultiUpdateLabel();
  document.getElementById('amsAcMultiDropdown').classList.remove('show');

  // 발송일/시각 초기화
  document.getElementById('amsAcSendDay').value = '1';
  document.getElementById('amsAcSendHour').value = '10';
  document.getElementById('amsAcSendMin').value = '00';

  // 샘플
  amsAcPage = 1;
  amsAcRenderSamples();

  // 모달 열기
  document.getElementById('amsEditOverlay').classList.add('show');
  document.getElementById('amsEditModal').classList.add('show');
}

function amsCloseNewAlert() {
  document.getElementById('amsNewAlertOverlay').classList.remove('show');
}

function amsSaveNewAlert() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var type = document.getElementById('amsNewType').value;
  var days = document.getElementById('amsNewDays').value;
  var time = document.getElementById('amsNewTime').value;
  var msg = document.getElementById('amsNewMessage').value;

  if (!msg.trim()) {
    alert(isEn ? 'Please enter message content.' : '메세지 내용을 입력하세요.');
    return;
  }

  var newCard = {
    id: 'new_' + Date.now(),
    type: type,
    active: false,
    timing: { ko: '방문 ' + days + '일 후 · ' + time + ' 발송', en: days + ' day(s) after visit · ' + time },
    preview: msg
  };

  var selectedCats = amsGetSelectedCategories();
  if (amsCurrentSub === 'aftercare') {
    if (selectedCats.length === 0) { alert(isEn ? 'Please select a category.' : '발송 대상 분류를 선택하세요.'); return; }
    newCard.title = { ko: '시술 후 관리 문자', en: 'Post-treatment Care' };
    newCard.category = { ko: selectedCats.join(', '), en: selectedCats.join(', ') };
  } else {
    var basis = document.querySelector('input[name="amsNewBasis"]:checked').value;
    if (basis === 'by_category') {
      if (selectedCats.length === 0) { alert(isEn ? 'Please select a category.' : '발송 대상 분류를 선택하세요.'); return; }
      newCard.category = { ko: selectedCats.join(', '), en: selectedCats.join(', ') };
    } else {
      newCard.category = { ko: '전체', en: 'All' };
    }
    newCard.title = { ko: '재방문 유도 문자', en: 'Revisit Promotion' };
  }

  if (!amsCards[amsCurrentSub]) amsCards[amsCurrentSub] = [];
  amsCards[amsCurrentSub].push(newCard);
  amsCloseNewAlert();
  amsRender();
}

// ── 문자발송 등록 기준 라디오 토글 ──
function amsToggleBasisCategory() {
  var basis = document.querySelector('input[name="amsNewBasis"]:checked').value;
  document.getElementById('amsFormCategory').style.display = basis === 'by_category' ? '' : 'none';
}

// ── 멀티셀렉트 ──
function amsToggleMultiDrop() {
  document.getElementById('amsMultiDropdown').classList.toggle('show');
}
function amsMultiToggleAll(el) {
  var checks = document.querySelectorAll('#amsMultiDropdown input[type="checkbox"]:not([value="전체"])');
  checks.forEach(function(c) { c.checked = el.checked; });
  amsMultiUpdateLabel();
}
function amsMultiUpdateLabel() {
  var checks = document.querySelectorAll('#amsMultiDropdown input[type="checkbox"]:checked:not([value="전체"])');
  var placeholder = document.getElementById('amsMultiPlaceholder');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (checks.length === 0) {
    placeholder.textContent = isEn ? 'Select' : '선택하세요';
    placeholder.classList.remove('has-value');
  } else {
    var names = [];
    checks.forEach(function(c) { names.push(c.value); });
    placeholder.textContent = names.join(', ');
    placeholder.classList.add('has-value');
  }
}
function amsGetSelectedCategories() {
  var checks = document.querySelectorAll('#amsMultiDropdown input[type="checkbox"]:checked:not([value="전체"])');
  var arr = [];
  checks.forEach(function(c) { arr.push(c.value); });
  return arr;
}
// 개별 체크 시 라벨 업데이트
document.addEventListener('change', function(e) {
  if (e.target.closest('#amsMultiDropdown') && e.target.type === 'checkbox' && e.target.value !== '전체') {
    amsMultiUpdateLabel();
  }
});
// 외부 클릭 시 멀티셀렉트 닫기
document.addEventListener('click', function(e) {
  if (!e.target.closest('#amsFormCategory')) {
    var dd = document.getElementById('amsMultiDropdown');
    if (dd) dd.classList.remove('show');
  }
});

// 바이트 카운터
document.addEventListener('input', function(e) {
  if (e.target.id === 'amsNewMessage') {
    var bytes = 0;
    for (var i = 0; i < e.target.value.length; i++) bytes += e.target.value.charCodeAt(i) > 127 ? 2 : 1;
    document.getElementById('amsNewBytes').textContent = bytes;
  }
});

// ── 내용 및 설정 수정 모달 ──
var amsEditCardData = null; // 현재 편집 중인 카드 데이터 참조

var amsEditConfigs = {
  ba1: { notice:{ko:'예약일 기준 선택된 일자 이전에 알림 문자가 자동으로 발송하도록 설정합니다',en:'Set notification text to be sent automatically before the selected date based on the reservation date'}, sendDateType:'select_days' },
  ba2: { notice:{ko:'예약 전날에 고객에게 알림문자가 자동으로 발송되도록 설정합니다',en:'Set up automatic alert messages the day before booking'}, sendDateType:'day_before' },
  ba3: { notice:{ko:'예약 당일에 고객에게 알림문자가 자동으로 발송되도록 설정합니다',en:'Set up automatic alert messages on the day of booking'}, sendDateType:'same_day' },
  ba4: { notice:{ko:'예약 시간에 임박했을 때 고객에게 알림문자가 자동으로 발송되도록 설정합니다',en:'Set up automatic alert messages before booking time'}, sendDateType:'hours_before' },
  ba5: { notice:{ko:'예약이 등록됐을 때 고객에게 알림문자가 자동으로 발송되도록 설정합니다',en:'Set up automatic alert messages when a booking is registered'}, sendDateType:'immediate_select' },
  ba6: { notice:{ko:'예약이 취소됐을 때 고객에게 알림문자가 자동으로 발송되도록 설정합니다',en:'Set up automatic alert messages when a booking is cancelled'}, sendDateType:'immediate' },
  pp1: { notice:{ko:'고객방문후 적립포인트를 알려주는 문자가 자동으로 발송되도록 설정합니다',en:'Automatic alert when points are earned'}, sendDateType:'immediate_select',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'이번포인트',en:'Earned Points'},v:'((적립))'},{field:{ko:'누적포인트',en:'Total Points'},v:'((누적))'}] },
  pp2: { notice:{ko:'고객방문후 사용포인트를 알려주는 문자가 자동으로 발송되도록 설정합니다',en:'Automatic alert when points are used'}, sendDateType:'immediate_select',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'사용포인트',en:'Used Points'},v:'((사용))'},{field:{ko:'누적포인트',en:'Total Points'},v:'((누적))'}] },
  pp3: { notice:{ko:'고객방문후 정액권 잔액을 알려주는 문자가 자동으로 발송되도록 설정합니다 (할인전용 정액권은 발송되지 않습니다)',en:'Automatic alert when prepaid card is sold'}, sendDateType:'immediate_select',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'정액권명',en:'Prepaid Name'},v:'((정액권명))'},{field:{ko:'정액권 적립',en:'Prepaid Credit'},v:'((선적))'},{field:{ko:'정액권 잔액',en:'Prepaid Balance'},v:'((선잔))'},{field:{ko:'정액권 총잔액',en:'Total Balance'},v:'((총잔))'}] },
  pp4: { notice:{ko:'고객방문후 정액권 잔액을 알려주는 문자가 자동으로 발송되도록 설정합니다',en:'Automatic alert when prepaid card is deducted'}, sendDateType:'immediate_select',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'정액권명',en:'Prepaid Name'},v:'((정액권명))'},{field:{ko:'정액권 차감',en:'Deduction'},v:'((선차))'},{field:{ko:'정액권 잔액',en:'Balance'},v:'((선잔))'},{field:{ko:'정액권 총잔액',en:'Total Balance'},v:'((총잔))'}] },
  pp5: { notice:{ko:'고객의 정액권이 만료되기 전 자동으로 안내문자가 발송되도록 설정합니다 (할인전용 정액권은 발송되지 않습니다)',en:'Set to automatically send a notification text message before the client\'s prepaid balance expires (Not send for Discount type of prepaid card)'}, sendDateType:'expiry_days',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'정액권명',en:'Prepaid Name'},v:'((정액권명))'},{field:{ko:'정액권 잔액',en:'Balance'},v:'((선잔))'},{field:{ko:'만료일',en:'Expiry Date'},v:'((만료일))'}] },
  pp6: { notice:{ko:'고객방문후 구매한 티켓을 알려주는 문자가 자동으로 발송되도록 설정합니다',en:'Automatic alert when ticket is sold'}, sendDateType:'immediate_select',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'티켓',en:'Ticket'},v:'((티켓명))'},{field:{ko:'잔여횟수',en:'Remaining'},v:'((잔회))'},{field:{ko:'적립횟수',en:'Earned'},v:'((적회))'}] },
  pp7: { notice:{ko:'고객방문후 티켓잔여횟수를 알려주는 문자가 자동으로 발송되도록 설정합니다',en:'Automatic alert when ticket is used'}, sendDateType:'immediate_select',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'티켓명',en:'Ticket'},v:'((티켓명))'},{field:{ko:'서비스명',en:'Service'},v:'((서비스명))'},{field:{ko:'잔여횟수',en:'Remaining'},v:'((잔회))'}] },
  pp8: { notice:{ko:'고객의 티켓이 만료되기 전 자동으로 안내문자가 발송되도록 설정합니다',en:'Automatic alert before ticket expiry'}, sendDateType:'expiry_days',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'티켓명',en:'Ticket'},v:'((티켓명))'},{field:{ko:'잔여횟수',en:'Remaining'},v:'((잔회))'},{field:{ko:'만료일',en:'Expiry Date'},v:'((만료일))'}] },
  da1: { notice:{ko:'예약금 안내 문자를 설정합니다',en:'Set up deposit info messages'}, sendDateType:'immediate', mode:'deposit',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'예약일',en:'Date'},v:'((예약일))'},{field:{ko:'예약월일',en:'Month/Day'},v:'((예약월일))'},{field:{ko:'예약시각',en:'Time'},v:'((예약시각))'},{field:{ko:'예약금',en:'Deposit'},v:'((예약금))'},{field:{ko:'예약금 입금기한 (00월 00일 00시 00분)',en:'Deadline'},v:'((예약금입금기한))'},{field:{ko:'예약금 입금시한 (00시 00분)',en:'Time Limit'},v:'((예약금입금시한))'}] },
  da2: { notice:{ko:'예약금 결제 확인 문자를 설정합니다',en:'Set up deposit confirmation messages'}, sendDateType:'immediate', mode:'deposit',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'예약일',en:'Date'},v:'((예약일))'},{field:{ko:'예약월일',en:'Month/Day'},v:'((예약월일))'},{field:{ko:'예약시각',en:'Time'},v:'((예약시각))'},{field:{ko:'예약금 입금액',en:'Paid Amount'},v:'((입금액))'}] },
  vt1: { notice:{ko:'고객 방문 시 감사 문자가 자동 발송되도록 설정합니다.',en:'Set up automatic thank-you messages for first-time clients.'}, sendDateType:'visit_thanks', targetLabel:{ko:'첫방문 고객',en:'First Visit Client'},
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'},v:'((담당자명))'}] },
  vt2: { notice:{ko:'고객 방문 시 감사 문자가 자동 발송되도록 설정합니다.',en:'Set up automatic thank-you messages for returning clients.'}, sendDateType:'visit_thanks', targetLabel:{ko:'재방문 고객',en:'Returning Client'},
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'},v:'((담당자명))'}] },
  bd1: { notice:{ko:'고객의 생일이 되면 자동으로 축하문자가 발송되도록 설정합니다.',en:'Set up automatic birthday greeting messages.'}, sendDateType:'birthday_mode',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'}] },
  ac1: { notice:{ko:'시술 후 관리 문자가 자동으로 발송되도록 설정합니다',en:'Automatic post-treatment care messages'}, sendDateType:'aftercare',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'},v:'((담당자명))'}] },
  rv1: { notice:{ko:'재방문 유도 문자가 자동으로 발송되도록 설정합니다',en:'Automatic revisit promotion messages'}, sendDateType:'aftercare',
    convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'},v:'((담당자명))'}] }
};

// 전환문자 매핑 (서브탭 기준)
var amsConversionVars = {
  booking_alert: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'},
    {field:{ko:'예약일',en:'Booking Date'}, v:'((예약일))'},
    {field:{ko:'예약월일',en:'Booking Month/Day'}, v:'((예약월일))'},
    {field:{ko:'예약시각',en:'Booking Time'}, v:'((예약시각))'}
  ],
  point_prepaid: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'},
    {field:{ko:'포인트',en:'Points'}, v:'((포인트))'},
    {field:{ko:'잔액',en:'Balance'}, v:'((잔액))'}
  ],
  deposit_alert: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'},
    {field:{ko:'예약금',en:'Deposit'}, v:'((예약금))'},
    {field:{ko:'계좌',en:'Account'}, v:'((계좌))'}
  ],
  visit_thanks: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'},
    {field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'}, v:'((담당자명))'}
  ],
  aftercare: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'},
    {field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'}, v:'((담당자명))'}
  ],
  revisit: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'},
    {field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'}, v:'((담당자명))'}
  ],
  birthday: [
    {field:{ko:'고객명',en:'Client Name'}, v:'((성명))'}
  ]
};

var amsEditCurrentPage = 1;
var amsEditCurrentType = 'sms';

function amsOpenEdit(cardId) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // 카드 데이터 찾기
  var card = null;
  var subKey = null;
  for (var key in amsCards) {
    amsCards[key].forEach(function(c) {
      if (c.id === cardId) { card = c; subKey = key; }
    });
  }
  if (!card) return;
  amsEditCardData = card;

  // 타이틀
  document.getElementById('amsEditTitle').textContent = isEn ? card.title.en : card.title.ko;

  // 안내문
  // 새로 추가된 카드(new_*)는 서브탭 기준으로 config 생성
  var config = amsEditConfigs[cardId];
  if (!config) {
    if (subKey === 'aftercare') {
      config = { notice:{ko:'시술 후 관리 문자가 자동으로 발송되도록 설정합니다',en:'Automatic post-treatment care messages'}, sendDateType:'aftercare',
        convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'},v:'((담당자명))'}] };
    } else if (subKey === 'revisit') {
      config = { notice:{ko:'재방문 유도 문자가 자동으로 발송되도록 설정합니다',en:'Automatic revisit promotion messages'}, sendDateType:'aftercare',
        convVars:[{field:{ko:'고객명',en:'Client Name'},v:'((성명))'},{field:{ko:'담당자명(별칭)',en:'Staff Name (Alias)'},v:'((담당자명))'}] };
    } else {
      config = { notice:{ko:'자동 발송 설정',en:'Automatic messaging settings'}, sendDateType:'immediate' };
    }
  }
  document.getElementById('amsEditNotice').textContent = isEn ? config.notice.en : config.notice.ko;

  // 전송일 렌더링
  amsEditRenderSendDate(config.sendDateType, isEn);

  // 메시지
  var ta = document.getElementById('amsEditMsgText');
  ta.value = card.preview;
  // 문자유형
  amsEditCurrentType = card.type.toLowerCase() === 'lms' ? 'lms' : 'sms';
  document.getElementById('amsEditMsgType').value = amsEditCurrentType;
  amsEditTypeChange(amsEditCurrentType);
  amsEditUpdateBytes();

  // 전환문자 테이블 (카드별 우선, 없으면 서브탭 기준)
  var convVars = (config && config.convVars) ? config.convVars : (amsConversionVars[subKey] || [{field:{ko:'고객명',en:'Client Name'}, v:'((성명))'}]);
  var convHtml = '';
  convVars.forEach(function(cv) {
    convHtml += '<tr><td>' + (isEn ? cv.field.en : cv.field.ko) + '</td><td class="cst-var-link"><span onclick="amsEditInsertConv(\'' + cv.v + '\')">' + cv.v + '</span></td></tr>';
  });
  document.getElementById('amsEditConvBody').innerHTML = convHtml;
  document.getElementById('amsEditConvBody2').innerHTML = convHtml;

  // 알림톡 타이틀 자동 설정 (카드 소제목 기반)
  var alimTitle = document.getElementById('amsEditAlimTitle');
  if (alimTitle) alimTitle.textContent = isEn ? 'AlimTalk Received' : '알림톡 도착';
  // 알림톡 본문도 카드 메시지로 동기화
  var alimBody = document.getElementById('amsEditAlimBody');
  if (alimBody) alimBody.textContent = card.preview;

  var isExpiry = (cardId === 'pp5' || cardId === 'pp8');
  var isDeposit = (config && config.mode === 'deposit');
  var isVisitThanks = (cardId === 'vt1' || cardId === 'vt2');
  var isAftercare = (config && config.sendDateType === 'aftercare');
  var isBirthday = (config && config.sendDateType === 'birthday_mode');

  // 모든 모드 숨기기
  document.getElementById('amsEditAlimtalkMode').style.display = 'none';
  document.getElementById('amsEditSmsMode').style.display = 'none';
  document.getElementById('amsEditExpiryMode').style.display = 'none';
  document.getElementById('amsEditDepositMode').style.display = 'none';
  document.getElementById('amsEditVisitThanksMode').style.display = 'none';
  document.getElementById('amsEditAftercareMode').style.display = 'none';
  document.getElementById('amsEditBirthdayMode').style.display = 'none';
  document.getElementById('amsEditCostInfo').style.display = 'none';
  document.querySelector('.ams-edit-setting-bar').style.display = 'none';

  if (isBirthday) {
    // 생일 축하 모드
    document.getElementById('amsEditBirthdayMode').style.display = '';
    var bdTa = document.getElementById('amsBdMsgText');
    if (bdTa) bdTa.value = card.preview;
    var bdType = document.getElementById('amsBdMsgType');
    if (bdType) bdType.value = card.type.toLowerCase() === 'lms' ? 'lms' : 'sms';
    amsBdUpdateBytes();
    document.getElementById('amsBdConvBody').innerHTML = convHtml;
    // 전송일/시각 초기화
    document.getElementById('amsBdSendDay').value = '0';
    document.getElementById('amsBdSendHour').value = '10';
    document.getElementById('amsBdSendMin').value = '00';
    // 모든 고객 등급 토글 초기화
    var bdGradeToggle = document.getElementById('amsBdGradeToggle');
    bdGradeToggle.classList.add('on');
    document.getElementById('amsBdGradeLabel').textContent = isEn ? 'Yes' : '예';
    document.getElementById('amsBdGradeChecks').style.display = 'none';
    // 샘플
    amsBdPage = 1;
    amsBdRenderSamples();
  } else if (isAftercare) {
    // 시술 후 관리 / 재방문 유도 모드
    document.getElementById('amsEditAftercareMode').style.display = '';
    // 등록 기준 라디오 (재방문 유도만 표시)
    var isRevisitSub = (subKey === 'revisit');
    document.querySelectorAll('.ams-ac-basis-item').forEach(function(el) { el.style.display = isRevisitSub ? '' : 'none'; });
    // 재방문 유도: 발송일 줄바꿈
    var revisitBreakEdit = document.querySelector('.ams-ac-revisit-break');
    if (revisitBreakEdit) revisitBreakEdit.style.display = isRevisitSub ? '' : 'none';
    // 발송 대상 고객 (재방문 유도만 표시)
    document.getElementById('amsAcTargetLabel').style.display = isRevisitSub ? '' : 'none';
    document.querySelectorAll('.ams-ac-target-item').forEach(function(el) { el.style.display = isRevisitSub ? '' : 'none'; });
    if (isRevisitSub) {
      document.querySelector('input[name="amsAcTarget"][value="all"]').checked = true;
    }
    // 메시지
    var acTa = document.getElementById('amsAcMsgText');
    if (acTa) acTa.value = card.preview;
    var acType = document.getElementById('amsAcMsgType');
    if (acType) acType.value = card.type.toLowerCase() === 'lms' ? 'lms' : 'sms';
    amsAcUpdateBytes();
    // 전환문자
    document.getElementById('amsAcConvBody').innerHTML = convHtml;
    // 등록 기준 라디오 + 발송 대상 분류 초기화
    var catLabel = card.category ? (isEn ? card.category.en : card.category.ko) : '';
    var hasCat = catLabel && catLabel !== '전체' && catLabel !== 'All' && catLabel !== '';
    document.querySelector('input[name="amsAcBasis"][value="' + (hasCat ? 'by_category' : 'all') + '"]').checked = true;
    document.querySelectorAll('#amsAcMultiDropdown input[type="checkbox"]').forEach(function(c) { c.checked = false; });
    if (hasCat) {
      catLabel.split(', ').forEach(function(cat) {
        var cb = document.querySelector('#amsAcMultiDropdown input[value="' + cat.trim() + '"]');
        if (cb) cb.checked = true;
      });
      document.getElementById('amsAcCategoryWrap').classList.remove('disabled');
    } else if (isRevisitSub) {
      document.getElementById('amsAcCategoryWrap').classList.add('disabled');
    } else {
      // 시술후 관리: 분류 항상 활성화
      document.getElementById('amsAcCategoryWrap').classList.remove('disabled');
    }
    amsAcMultiUpdateLabel();
    document.getElementById('amsAcMultiDropdown').classList.remove('show');
    // 발송일/시각
    document.getElementById('amsAcSendDay').value = '1';
    document.getElementById('amsAcSendHour').value = '10';
    document.getElementById('amsAcSendMin').value = '00';
    // 샘플
    amsAcPage = 1;
    amsAcRenderSamples();
  } else if (isVisitThanks) {
    // 방문 감사 모드
    document.getElementById('amsEditVisitThanksMode').style.display = '';
    // 발송 대상 고객
    document.getElementById('amsVtTargetValue').textContent = isEn ? config.targetLabel.en : config.targetLabel.ko;
    // 메시지
    var vtTa = document.getElementById('amsVtMsgText');
    if (vtTa) vtTa.value = card.preview;
    var vtType = document.getElementById('amsVtMsgType');
    if (vtType) vtType.value = card.type.toLowerCase() === 'lms' ? 'lms' : 'sms';
    amsVtUpdateBytes();
    // 전환문자
    document.getElementById('amsVtConvBody').innerHTML = convHtml;
    // 발송일/시각 초기화
    document.getElementById('amsVtSendDate').value = '0';
    document.getElementById('amsVtSendTime').value = '30';
    // 샘플 렌더
    amsVtPage = 1;
    amsVtRenderSamples();
  } else if (isDeposit) {
    // 예약금 모드
    document.getElementById('amsEditDepositMode').style.display = '';
    var depTa = document.getElementById('amsDepositMsgText');
    if (depTa) { depTa.value = card.preview; }
    var depType = document.getElementById('amsDepositMsgType');
    if (depType) depType.value = card.type.toLowerCase() === 'lms' ? 'lms' : 'sms';
    amsDepositUpdateBytes();
    document.getElementById('amsDepositConvBody').innerHTML = convHtml;
    amsDepositPage = 1;
    amsDepositRenderSamples();
  } else if (isExpiry) {
    // 만료일 모드
    document.getElementById('amsEditExpiryMode').style.display = '';
    amsExpiryRenderCards(cardId);
    document.getElementById('amsExpiryConvBody').innerHTML = convHtml;
    amsExpiryPage = 1;
    amsExpiryRenderSamples();
  } else {
    // 일반 모드 (알림톡/문자)
    document.getElementById('amsEditCostInfo').style.display = '';
    document.querySelector('.ams-edit-setting-bar').style.display = '';
    document.querySelector('input[name="amsEditSendType"][value="alimtalk"]').checked = true;
    document.getElementById('amsEditAlimtalkMode').style.display = '';
    amsEditCurrentMode = 'alimtalk';
    var fallbackTa = document.getElementById('amsEditFallbackText');
    if (fallbackTa) { fallbackTa.value = card.preview; amsEditFallbackUpdateBytes(); }
  }

  // 모달 열기
  document.getElementById('amsEditOverlay').classList.add('show');
  document.getElementById('amsEditModal').classList.add('show');
}

function amsEditRenderSendDate(type, isEn) {
  var wrap = document.getElementById('amsEditSendDateWrap');
  var html = '';
  switch (type) {
    case 'select_days':
      html = '<span>' + (isEn ? 'Reservation date' : '예약일 전날') + '</span> '
        + '<select id="amsEditDaysBefore">';
      for (var i = 1; i <= 30; i++) html += '<option value="' + i + '"' + (i === 7 ? ' selected' : '') + '>' + i + (isEn ? 'Day ago' : '일전') + '</option>';
      html += '</select> '
        + '<select id="amsEditHour">';
      for (var h = 0; h < 24; h++) html += '<option value="' + h + '"' + (h === 17 ? ' selected' : '') + '>' + (h < 10 ? '0' + h : h) + '</option>';
      html += '</select> <span>' + (isEn ? 'O\'clock' : '시') + '</span> '
        + '<select id="amsEditMin"><option value="0" selected>00</option><option value="30">30</option></select> <span>' + (isEn ? 'Minutes' : '분') + '</span>';
      break;
    case 'day_before':
      html = '<span>' + (isEn ? 'Reservation date' : '예약일 전날') + '</span> '
        + '<select id="amsEditHour">';
      for (var h = 0; h < 24; h++) html += '<option value="' + h + '"' + (h === 17 ? ' selected' : '') + '>' + (h < 10 ? '0' + h : h) + '</option>';
      html += '</select> <span>' + (isEn ? 'O\'clock' : '시') + '</span> '
        + '<select id="amsEditMin"><option value="0" selected>00</option><option value="30">30</option></select> <span>' + (isEn ? 'Minutes' : '분') + '</span>';
      break;
    case 'same_day':
      html = '<span>' + (isEn ? 'Day of booking' : '예약일 당일') + '</span> '
        + '<select id="amsEditHour">';
      for (var h = 0; h < 24; h++) html += '<option value="' + h + '"' + (h === 10 ? ' selected' : '') + '>' + (h < 10 ? '0' + h : h) + '</option>';
      html += '</select> <span>' + (isEn ? 'O\'clock' : '시') + '</span> '
        + '<select id="amsEditMin"><option value="0" selected>00</option><option value="30">30</option></select> <span>' + (isEn ? 'Minutes' : '분') + '</span>';
      break;
    case 'hours_before':
      html = '<span>' + (isEn ? 'Before booking time' : '예약 시간 전') + '</span> '
        + '<select id="amsEditHoursBefore">';
      for (var h = 1; h <= 12; h++) html += '<option value="' + h + '"' + (h === 2 ? ' selected' : '') + '>' + (h < 10 ? '0' + h : h) + '</option>';
      html += '</select> <span>' + (isEn ? 'O\'clock' : '시간') + '</span> '
        + '<select id="amsEditMin"><option value="0" selected>00</option><option value="30">30</option></select> <span>' + (isEn ? 'Minutes' : '분') + '</span>';
      break;
    case 'immediate_select':
      html = '<select id="amsEditImmediateType">'
        + '<option value="immediate" selected>' + (isEn ? 'Immediately' : '즉시발송') + '</option>'
        + '<option value="10">' + (isEn ? '10 min later' : '10분 후') + '</option>'
        + '<option value="20">' + (isEn ? '20 min later' : '20분 후') + '</option>'
        + '<option value="30">' + (isEn ? '30 min later' : '30분 후') + '</option>'
        + '<option value="60">' + (isEn ? '60 min later' : '60분 후') + '</option>'
        + '</select>';
      break;
    case 'immediate':
      html = '<span>' + (isEn ? 'Immediately' : '즉시발송') + '</span>';
      break;
    case 'expiry_days':
      html = '<span>' + (isEn ? 'Before expiry' : '만료') + '</span> '
        + '<select id="amsEditExpiryDays">';
      [3,5,7,14,30].forEach(function(d) { html += '<option value="' + d + '"' + (d === 7 ? ' selected' : '') + '>' + d + (isEn ? ' days' : '일') + '</option>'; });
      html += '</select> <span>' + (isEn ? 'before' : '전') + '</span>';
      break;
    case 'visit_days':
      html = '<span>' + (isEn ? 'After visit' : '방문') + '</span> '
        + '<select id="amsEditVisitDays">';
      for (var d = 1; d <= 30; d++) html += '<option value="' + d + '"' + (d === 1 ? ' selected' : '') + '>' + d + '</option>';
      html += '</select> <span>' + (isEn ? 'day(s) after' : '일 후') + '</span> '
        + '<select id="amsEditHour">';
      for (var h = 0; h < 24; h++) html += '<option value="' + h + '"' + (h === 10 ? ' selected' : '') + '>' + (h < 10 ? '0' + h : h) + '</option>';
      html += '</select> <span>' + (isEn ? 'O\'clock' : '시') + '</span> '
        + '<select id="amsEditMin"><option value="0" selected>00</option><option value="30">30</option></select> <span>' + (isEn ? 'Minutes' : '분') + '</span>';
      break;
    case 'birthday':
      html = '<span>' + (isEn ? 'Birthday morning' : '생일 당일 오전') + '</span> '
        + '<select id="amsEditHour">';
      for (var h = 0; h < 24; h++) html += '<option value="' + h + '"' + (h === 10 ? ' selected' : '') + '>' + (h < 10 ? '0' + h : h) + '</option>';
      html += '</select> <span>' + (isEn ? 'O\'clock' : '시') + '</span> '
        + '<select id="amsEditMin"><option value="0" selected>00</option><option value="30">30</option></select> <span>' + (isEn ? 'Minutes' : '분') + '</span>';
      break;
  }
  wrap.innerHTML = html;
}

function amsCloseEdit() {
  // 닫을 때 자동 저장
  if (amsEditCardData) {
    var bdMode = document.getElementById('amsEditBirthdayMode');
    var acMode = document.getElementById('amsEditAftercareMode');
    var vtMode = document.getElementById('amsEditVisitThanksMode');
    var depMode = document.getElementById('amsEditDepositMode');
    var expiryMode = document.getElementById('amsEditExpiryMode');
    if (bdMode && bdMode.style.display !== 'none') {
      // 생일 축하 모드
      amsEditCardData.type = document.getElementById('amsBdMsgType').value.toUpperCase();
      var bdTa = document.getElementById('amsBdMsgText');
      if (bdTa) amsEditCardData.preview = bdTa.value;
      var bdDay = document.getElementById('amsBdSendDay').value;
      var bdHr = document.getElementById('amsBdSendHour').value;
      var bdMn = document.getElementById('amsBdSendMin').value;
      var dayLabel = bdDay === '0' ? '당일' : bdDay + '일전';
      amsEditCardData.timing = { ko: '생일 ' + dayLabel + ' · ' + bdHr + ':' + (bdMn === '0' ? '00' : bdMn) + ' 발송', en: 'Birthday ' + (bdDay === '0' ? 'day' : bdDay + ' day(s) before') + ' · ' + bdHr + ':' + bdMn };
    } else if (acMode && acMode.style.display !== 'none') {
      // 시술 후 관리 / 재방문 유도 모드
      amsEditCardData.type = document.getElementById('amsAcMsgType').value.toUpperCase();
      var acTa = document.getElementById('amsAcMsgText');
      if (acTa) amsEditCardData.preview = acTa.value;
      // 분류 저장
      var acBasis = document.querySelector('input[name="amsAcBasis"]:checked');
      var isRevisitSave = (amsCurrentSub === 'revisit');
      if (!isRevisitSave || (acBasis && acBasis.value === 'by_category')) {
        var selCats = amsAcGetSelectedCategories();
        if (selCats.length > 0) {
          amsEditCardData.category = { ko: selCats.join(', '), en: selCats.join(', ') };
        }
      } else {
        amsEditCardData.category = { ko: '전체', en: 'All' };
      }
      // 타이밍 저장
      var day = document.getElementById('amsAcSendDay').value;
      var hr = document.getElementById('amsAcSendHour').value;
      var mn = document.getElementById('amsAcSendMin').value;
      amsEditCardData.timing = { ko: '방문 ' + day + '일 후 · ' + hr + ':' + (mn === '0' ? '00' : mn) + ' 발송', en: day + ' day(s) after · ' + hr + ':' + (mn === '0' ? '00' : mn) };
    } else if (vtMode && vtMode.style.display !== 'none') {
      // 방문 감사 모드
      amsEditCardData.type = document.getElementById('amsVtMsgType').value.toUpperCase();
      var vtTa = document.getElementById('amsVtMsgText');
      if (vtTa) amsEditCardData.preview = vtTa.value;
    } else if (depMode && depMode.style.display !== 'none') {
      var depType = document.getElementById('amsDepositMsgType').value.toUpperCase();
      var depTa = document.getElementById('amsDepositMsgText');
      amsEditCardData.type = depType;
      if (depTa) amsEditCardData.preview = depTa.value;
    } else if (expiryMode && expiryMode.style.display !== 'none') {
      // 만료일 모드는 별도 저장 로직
    } else if (amsEditCurrentMode === 'alimtalk') {
      var fbType = document.getElementById('amsEditFallbackType').value.toUpperCase();
      var fbText = document.getElementById('amsEditFallbackText');
      amsEditCardData.type = fbType;
      if (fbText) amsEditCardData.preview = fbText.value;
    } else {
      var type = document.getElementById('amsEditMsgType').value.toUpperCase();
      var ta = document.getElementById('amsEditMsgText');
      amsEditCardData.type = type;
      if (ta) amsEditCardData.preview = ta.value;
    }
    // 새 등록 모드에서 내용 없으면 카드 제거
    if (amsNewAlertCardId && amsEditCardData && !amsEditCardData.preview.trim()) {
      for (var rmKey in amsCards) {
        amsCards[rmKey] = amsCards[rmKey].filter(function(c) { return c.id !== amsNewAlertCardId; });
      }
    }
    amsNewAlertCardId = null;
    amsRender();
  }
  document.getElementById('amsEditOverlay').classList.remove('show');
  document.getElementById('amsEditModal').classList.remove('show');
  amsEditCardData = null;
  // 특수문자 팝업 닫기
  ['amsEditSmsSpecialChars','amsFallbackSpecialChars','amsExpirySpecialChars',
   'amsDepositSpecialChars','amsVtSpecialChars','amsAcSpecialChars',
   'amsBdSpecialChars','amsNewSpecialChars'].forEach(amsCloseSpecialPopup);
}

function amsEditUpdateBytes() {
  var ta = document.getElementById('amsEditMsgText');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  document.getElementById('amsEditBytes').textContent = bytes;
}

function amsEditTypeChange(type) {
  if (!type) type = document.getElementById('amsEditMsgType').value;
  amsEditCurrentType = type;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.sms;
  document.getElementById('amsEditByteLimit').textContent = info.maxBytes;
  amsEditUpdateBytes();
}

// 발송타입 전환 (알림톡 ↔ 문자)
var amsEditCurrentMode = 'alimtalk';
function amsEditSwitchSendType(mode) {
  if (mode === amsEditCurrentMode) return;
  var smsEl = document.getElementById('amsEditSmsMode');
  var alimEl = document.getElementById('amsEditAlimtalkMode');
  var outEl = mode === 'sms' ? alimEl : smsEl;
  var inEl = mode === 'sms' ? smsEl : alimEl;
  var outDir = mode === 'sms' ? 'ams-slide-out-left' : 'ams-slide-out-right';
  var inDir = mode === 'sms' ? 'ams-slide-in-right' : 'ams-slide-in-left';

  outEl.classList.add(outDir);
  outEl.addEventListener('animationend', function handler() {
    outEl.removeEventListener('animationend', handler);
    outEl.style.display = 'none';
    outEl.classList.remove(outDir);
    inEl.style.display = '';
    inEl.classList.add(inDir);
    inEl.addEventListener('animationend', function h2() {
      inEl.removeEventListener('animationend', h2);
      inEl.classList.remove(inDir);
    });
  });
  amsEditCurrentMode = mode;
}

// 알림톡 fallback 바이트 카운터
function amsEditFallbackUpdateBytes() {
  var ta = document.getElementById('amsEditFallbackText');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  document.getElementById('amsEditFallbackBytes').textContent = bytes;
}

function amsEditFallbackTypeChange(type) {
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.sms;
  document.getElementById('amsEditFallbackByteLimit').textContent = info.maxBytes;
  amsEditFallbackUpdateBytes();
}

// fallback 토글 라벨
document.addEventListener('click', function(e) {
  if (e.target.id === 'amsEditFallbackToggle' || e.target.closest('#amsEditFallbackToggle')) {
    var t = document.getElementById('amsEditFallbackToggle');
    var s = document.getElementById('amsEditFallbackStatus');
    if (s) s.textContent = t.classList.contains('on') ? 'On' : 'Off';
  }
});

function amsEditInsertConv(v) {
  var ta = document.getElementById('amsEditMsgText');
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + v + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + v.length;
  ta.focus();
  amsEditUpdateBytes();
}

// ── 미리보기 / 다른 문구 선택 팝업 ──

// SMS 미리보기 (공통)
function amsOpenSmsPreview(textareaId) {
  var ta = document.getElementById(textareaId);
  var dst = document.getElementById('amsSmsPreviewText');
  if (ta && dst) dst.textContent = ta.value || '';
  cstOpenModal('amsSmsPreviewModal');
}

// 문자 모드 - 미리보기
function amsEditPreview() {
  amsOpenSmsPreview('amsEditMsgText');
}

// 문자 모드 - 다른 문구 선택
var _amsSmsMsgTarget = 'amsEditMsgText';
function amsEditOtherMsg() {
  _amsSmsMsgTarget = 'amsEditMsgText';
  amsRenderSmsAltCards();
  cstOpenModal('amsSmsAltModal');
}

// 알림톡 미리보기 패널
function amsEditAlimPreview() {
  var title = document.getElementById('amsEditAlimTitle');
  var body = document.getElementById('amsEditAlimBody');
  var dstTitle = document.getElementById('amsAlimPreviewTitle');
  var dstBody = document.getElementById('amsAlimPreviewBody');
  if (title && dstTitle) dstTitle.textContent = title.textContent;
  if (body && dstBody) dstBody.textContent = body.textContent;
  cstOpenModal('amsAlimPreviewModal');
}

// 알림톡 다른 문구 선택
function amsEditAlimOtherMsg() {
  amsRenderAlimAltCards();
  cstOpenModal('amsAlimAltModal');
}

// 특수문자 공통 chars
var _amsSpecialChars = ['※','☆','★','♡','♥','○','●','◎','◇','◆','◈','□','■','♦','▣',
  '♣','♧','△','▲','▽','▼','◁','▷','▶','◀','TEL','☎','☏','⊙','●',
  '⇒','⇐','←','→','↑','↓','①','②','③','④','⑤','⑥','⑦','⑧','⑨',
  '—','|','└','┘','┌','┐','·','^0^','*^^*','^_^','(^▽^)b'];

// 특수문자 팝업 위치 지정 (fixed)
function amsPositionSpecialPopup(popupId, btnEl) {
  var el = document.getElementById(popupId);
  if (!el || !btnEl) return;
  var rect = btnEl.getBoundingClientRect();
  // 화면 아래 공간이 부족하면 위로 표시
  var popupH = 220;
  var spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < popupH) {
    el.style.top = (rect.top - popupH - 4) + 'px';
  } else {
    el.style.top = (rect.bottom + 4) + 'px';
  }
  el.style.left = rect.left + 'px';
}

function amsCloseSpecialPopup(popupId) {
  var el = document.getElementById(popupId);
  if (el) el.style.display = 'none';
}

// 특수문자 팝업 생성 팩토리
function amsCreateSpecialCharsToggle(popupId, gridId, textareaId, updateBytesFn) {
  var inited = false;
  return function(btnEl) {
    var el = document.getElementById(popupId);
    if (!el) return;
    if (el.style.display === 'none') {
      el.style.display = '';
      amsPositionSpecialPopup(popupId, btnEl);
      if (!inited) {
        inited = true;
        var grid = document.getElementById(gridId);
        _amsSpecialChars.forEach(function(c) {
          var btn = document.createElement('button');
          btn.className = 'cm-special-char-btn';
          if (c.length > 2) btn.style.fontSize = '10px';
          btn.textContent = c;
          btn.onclick = function() {
            var ta = document.getElementById(textareaId);
            if (ta) {
              var start = ta.selectionStart, end = ta.selectionEnd;
              ta.value = ta.value.substring(0, start) + c + ta.value.substring(end);
              ta.selectionStart = ta.selectionEnd = start + c.length;
              ta.focus();
              if (updateBytesFn) updateBytesFn();
            }
            amsCloseSpecialPopup(popupId);
          };
          grid.appendChild(btn);
        });
      }
    } else {
      el.style.display = 'none';
    }
  };
}

var amsVtToggleSpecialChars = amsCreateSpecialCharsToggle('amsVtSpecialChars', 'amsVtSpecialGrid', 'amsVtMsgText', function(){ amsVtUpdateBytes(); });
var amsAcToggleSpecialChars = amsCreateSpecialCharsToggle('amsAcSpecialChars', 'amsAcSpecialGrid', 'amsAcMsgText', function(){ amsAcUpdateBytes(); });
var amsBdToggleSpecialChars = amsCreateSpecialCharsToggle('amsBdSpecialChars', 'amsBdSpecialGrid', 'amsBdMsgText', function(){ amsBdUpdateBytes(); });
var amsNewToggleSpecialChars = amsCreateSpecialCharsToggle('amsNewSpecialChars', 'amsNewSpecialGrid', 'amsNewMessage', null);

// 문자 모드 - 특수문자
var amsEditSmsSpecialInit = false;
function amsEditSmsToggleSpecialChars(btnEl) {
  var el = document.getElementById('amsEditSmsSpecialChars');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = '';
    amsPositionSpecialPopup('amsEditSmsSpecialChars', btnEl);
    if (!amsEditSmsSpecialInit) {
      amsEditSmsSpecialInit = true;
      var grid = document.getElementById('amsEditSmsSpecialGrid');
      _amsSpecialChars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        if (c.length > 2) btn.style.fontSize = '10px';
        btn.textContent = c;
        btn.onclick = function() {
          var ta = document.getElementById('amsEditMsgText');
          if (ta) {
            var start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + c + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + c.length;
            ta.focus();
            amsEditUpdateBytes();
          }
          amsCloseSpecialPopup('amsEditSmsSpecialChars');
        };
        grid.appendChild(btn);
      });
    }
  } else {
    el.style.display = 'none';
  }
}

// 알림톡 발송 실패시 문자 - 특수문자
var amsFallbackSpecialInit = false;
function amsFallbackToggleSpecialChars(btnEl) {
  var el = document.getElementById('amsFallbackSpecialChars');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = '';
    amsPositionSpecialPopup('amsFallbackSpecialChars', btnEl);
    if (!amsFallbackSpecialInit) {
      amsFallbackSpecialInit = true;
      var grid = document.getElementById('amsFallbackSpecialGrid');
      _amsSpecialChars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        if (c.length > 2) btn.style.fontSize = '10px';
        btn.textContent = c;
        btn.onclick = function() {
          var ta = document.getElementById('amsEditFallbackText');
          if (ta) {
            var start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + c + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + c.length;
            ta.focus();
            amsEditFallbackUpdateBytes();
          }
          amsCloseSpecialPopup('amsFallbackSpecialChars');
        };
        grid.appendChild(btn);
      });
    }
  } else {
    el.style.display = 'none';
  }
}

// 알림톡 발송 실패시 문자 - 미리보기
function amsEditFallbackPreview() {
  amsOpenSmsPreview('amsEditFallbackText');
}

// 알림톡 발송 실패시 문자 - 다른 문구 선택
function amsEditFallbackOtherMsg() {
  _amsSmsMsgTarget = 'amsEditFallbackText';
  amsRenderSmsAltCards();
  cstOpenModal('amsSmsAltModal');
}

// 예약금 미리보기
function amsDepositPreview() {
  amsOpenSmsPreview('amsDepositMsgText');
}

// ── 알림톡 샘플 데이터 ──
var _amsAlimTemplates = [
  { title: '■ 예약 알림 안내 ■', body: '((성명))님, ((예약일)) ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오' },
  { title: '■ 예약 알림 안내 ■', body: '안녕하세요, ((성명))님!\n((예약일)) ((예약시간)) 예약이 확인되었습니다.\n방문을 기다리겠습니다.\n\n아하 네일 스튜디오' }
];

function amsRenderAlimAltCards() {
  var wrap = document.getElementById('amsAlimAltCards');
  if (!wrap) return;
  var html = '';
  _amsAlimTemplates.forEach(function(t, i) {
    html += '<div class="cst-alt-card" onclick="amsSelectAlimTemplate(' + i + ')">'
      + '<div class="cst-kakao-preview"><span class="cst-kakao-badge">kakao</span><div class="cst-kakao-bubble">'
      + '<span class="cst-kakao-msg-title">' + t.title + '</span>'
      + '<div class="cst-kakao-msg-body" style="pointer-events:none;font-size:12px;white-space:pre-wrap;">' + t.body + '</div>'
      + '</div></div></div>';
  });
  wrap.innerHTML = html;
}

function amsSelectAlimTemplate(idx) {
  var t = _amsAlimTemplates[idx];
  if (!t) return;
  var title = document.getElementById('amsEditAlimTitle');
  var body = document.getElementById('amsEditAlimBody');
  if (title) title.textContent = t.title;
  if (body) body.textContent = t.body;
  cstCloseModal('amsAlimAltModal');
}

// ── SMS 샘플 데이터 ──
var _amsSmsTemplates = [
  '((성명))님, ((예약일)) ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오',
  '((성명))님, 내일 ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오',
  '((성명))님, 오늘 ((예약시간))에 예약이 있습니다. 아하 네일 스튜디오'
];

function amsRenderSmsAltCards() {
  var wrap = document.getElementById('amsSmsAltCards');
  if (!wrap) return;
  var html = '';
  _amsSmsTemplates.forEach(function(t, i) {
    html += '<div class="cst-alt-card cst-alt-sms-card" onclick="amsSelectSmsTemplate(' + i + ')">'
      + '<textarea class="cst-sms-textarea cst-alt-textarea" readonly>' + t + '</textarea>'
      + '</div>';
  });
  wrap.innerHTML = html;
}

function amsSelectSmsTemplate(idx) {
  var t = _amsSmsTemplates[idx];
  if (!t) return;
  var ta = document.getElementById(_amsSmsMsgTarget);
  if (ta) { ta.value = t; ta.dispatchEvent(new Event('input')); }
  cstCloseModal('amsSmsAltModal');
}

function amsEditSave() {
  amsCloseEdit();
}

// ── 예약금 모드 (da1, da2) ──
function amsDepositGetType() {
  var sel = document.getElementById('amsDepositMsgType');
  return (sel && sel.value) || 'lms';
}

function amsDepositTypeChange() {
  amsDepositUpdateBytes();
  amsDepositPage = 1;
  amsDepositRenderSamples();
}

function amsDepositUpdateBytes() {
  var ta = document.getElementById('amsDepositMsgText');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  var type = amsDepositGetType();
  var limit = type === 'sms' ? 85 : 2000;
  document.getElementById('amsDepositBytes').textContent = bytes;
  document.getElementById('amsDepositByteLimit').textContent = limit;
}

// 예약금 - 특수문자
var amsDepositSpecialInit = false;
function amsDepositToggleSpecialChars(btnEl) {
  var el = document.getElementById('amsDepositSpecialChars');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = '';
    amsPositionSpecialPopup('amsDepositSpecialChars', btnEl);
    if (!amsDepositSpecialInit) {
      amsDepositSpecialInit = true;
      var grid = document.getElementById('amsDepositSpecialGrid');
      _amsSpecialChars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        if (c.length > 2) btn.style.fontSize = '10px';
        btn.textContent = c;
        btn.onclick = function() {
          var ta = document.getElementById('amsDepositMsgText');
          if (ta) {
            var start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + c + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + c.length;
            ta.focus();
            amsDepositUpdateBytes();
          }
          amsCloseSpecialPopup('amsDepositSpecialChars');
        };
        grid.appendChild(btn);
      });
    }
  } else {
    el.style.display = 'none';
  }
}

var amsDepositPage = 1;
function amsDepositRenderSamples() {
  if (typeof cmSmsSamples === 'undefined') return;
  var type = amsDepositGetType();
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.lms;
  var samples = cmSmsSamples[type] || cmSmsSamples.lms;
  var grid = document.getElementById('amsDepositSmsPreview');
  if (!grid) return;
  grid.innerHTML = '';
  var start = (amsDepositPage - 1) * info.perPage;
  samples.slice(start, start + info.perPage).forEach(function(text) {
    var bytes = cmCalcBytes(text);
    var card = document.createElement('div');
    card.className = 'cm-sms-preview-card';
    card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div><div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
    grid.appendChild(card);
  });
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  var totalPages = Math.max(1, Math.ceil(samples.length / info.perPage));
  document.getElementById('amsDepositPageCur').textContent = amsDepositPage;
  document.getElementById('amsDepositPageTotal').textContent = totalPages;
  // 라벨 업데이트
  var label = document.getElementById('amsDepositSampleLabel');
  if (label) label.textContent = info.label;
}
function amsDepositPageGo(dir) {
  var type = amsDepositGetType();
  var samples = cmSmsSamples[type] || cmSmsSamples.lms;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.lms;
  var totalPages = Math.max(1, Math.ceil(samples.length / info.perPage));
  if (dir === 'first') amsDepositPage = 1;
  else if (dir === 'prev') amsDepositPage = Math.max(1, amsDepositPage - 1);
  else if (dir === 'next') amsDepositPage = Math.min(totalPages, amsDepositPage + 1);
  else if (dir === 'last') amsDepositPage = totalPages;
  amsDepositRenderSamples();
}
function amsDepositSelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  var ta = document.getElementById('amsDepositMsgText');
  if (ta) { ta.value = body.textContent; amsDepositUpdateBytes(); }
}

// ── 만료일 모드 (pp5, pp8) ──
var amsExpiryDefaults = {
  pp5: [
    { title:{ko:'첫번째 발송',en:'1st Send'}, msg:'((성명))고객님의 회원권\n((정액권명)) / 잔액((선잔))원 남아 있으세요.\n\n유효기간은 ((만료일)) 까지 사용가능 합니다.\n금액이 많이 남아 있으시니 기간 내에 오셔서 관리 받으시고 행복한 하루 되세요.\n\n-아하 네일 스튜디오', type:'lms', active:false, expDays:90, minBalance:100000 },
    { title:{ko:'두번째 발송',en:'2nd Send'}, msg:'((성명))고객님의 회원권\n((정액권명)) / 잔액((선잔))원\n\n유효기간 ((만료일)) 까지 사용 가능 합니다.\n회원권 유효기간 이후에는 회원권 잔액 사용이 어려우세요.\n\n바로 전화 주시면 예약 잡아 드릴께요. ^^', type:'lms', active:false, expDays:30, minBalance:1 },
    { title:{ko:'세번째 발송',en:'3rd Send'}, msg:'((성명))고객님의 회원권\n((정액권명)) / 잔액((선잔))원\n\n유효기간 ((만료일)) 까지 사용가능 합니다.\n남은 기간이 얼마 않으시니 꼭 오셔서 사용 해주시고 부득이한 경우 샵으로 전화 주세요.\n\n-아하 네일 스튜디오', type:'lms', active:false, expDays:7, minBalance:1 }
  ],
  pp8: [
    { title:{ko:'첫번째 발송',en:'1st Send'}, msg:'((성명))고객님의\n((티켓명)) / 잔여횟수 ((잔회))회\n\n유효기간은 ((만료일)) 까지 사용가능 합니다.\n회원권 잔여횟수 많이 남아 있으시니 기간 내에 오셔서 관리해주세요.\n\n-아하 네일 스튜디오', type:'lms', active:false, expDays:90, minCount:4 },
    { title:{ko:'두번째 발송',en:'2nd Send'}, msg:'((성명))고객님의\n((티켓명)) / 잔여횟수 ((잔회))회\n\n유효기간 ((만료일)) 까지 사용 가능 합니다.\n회원권 유효기간 이후에는 회원권 잔액 사용이 어려우세요.\n\n바로 전화 주시면 예약 잡아 드릴께요. ^^', type:'lms', active:false, expDays:30, minCount:1 },
    { title:{ko:'세번째 발송',en:'3rd Send'}, msg:'((성명))고객님의\n((티켓명)) / 잔여횟수 ((잔회))회\n\n유효기간 ((만료일)) 까지 사용가능 합니다.\n남은 기간이 얼마 않으시니 꼭 오셔서 사용 해주시고 부득이한 경우 샵으로 전화 주세요.\n\n-아하 네일 스튜디오', type:'lms', active:false, expDays:7, minCount:1 }
  ]
};

function amsExpiryRenderCards(cardId) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var defaults = amsExpiryDefaults[cardId] || amsExpiryDefaults.pp5;
  var isPrepaid = cardId === 'pp5';
  var html = '';
  defaults.forEach(function(d, i) {
    var cardTitle = (typeof d.title === 'object') ? (isEn ? d.title.en : d.title.ko) : d.title;
    html += '<div class="ams-expiry-card">'
      + '<div class="ams-expiry-card-header"><span class="ams-expiry-card-title">' + cardTitle + '</span>'
      + '<div class="ams-toggle' + (d.active ? ' on' : '') + '" id="amsExpToggle' + i + '" onclick="this.classList.toggle(\'on\')"></div></div>'
      + '<div class="cst-sms-type-row"><span class="cst-sms-type-label">' + (isEn ? 'Message type' : '문자유형') + '</span>'
      + '<select class="cst-sms-type-select" id="amsExpType' + i + '" onchange="amsExpiryTypeChange(' + i + ')"><option value="sms">SMS</option><option value="lms"' + (d.type === 'lms' ? ' selected' : '') + '>LMS</option></select>'
      + '<div class="cst-sms-help-wrap"><button class="sv-help-btn">?</button>'
      + '<div class="cst-sms-help-tooltip"><table class="cst-sms-help-table"><thead><tr><th>구분</th><th>요금</th><th>한글 글자수 (byte)</th><th>이미지 첨부</th></tr></thead><tbody><tr><td>단문 SMS</td><td>22원</td><td>42자 (85byte)</td><td>X</td></tr><tr><td>장문 LMS</td><td>49원</td><td>1,000자 (2,000byte)</td><td>X</td></tr><tr><td>그림문자 MMS</td><td>198원</td><td>1,000자 (2,000byte)</td><td>O</td></tr></tbody></table><div class="cst-sms-help-notes">MMS 이미지 첨부 가능 파일형식 : jpg, jpeg, png, bmp, gif<br>(광고) 표시시 한글 3자(6byte)가 소요됩니다<br>수신거부 삽입 시 한글 13자(25byte)가 소요됩니다</div></div>'
      + '</div></div>'
      + '<div class="ams-expiry-cond-row">'
      + '<span>' + (isEn ? 'Send Before' : '만료') + '</span><input type="number" value="' + d.expDays + '" id="amsExpDays' + i + '"><span>' + (isEn ? 'days' : '일 전') + '</span>'
      + '<span>' + (isPrepaid ? (isEn ? 'Only if balance is Over' : '잔액') : (isEn ? 'Remaining' : '잔여횟수')) + '</span><input type="number" value="' + (isPrepaid ? d.minBalance : d.minCount) + '" id="amsExpMin' + i + '"><span>' + (isPrepaid ? (isEn ? 'won+' : '원 이상') : (isEn ? '+' : '이상')) + '</span>'
      + '</div>'
      + '<div class="cst-sms-textarea-wrap"><textarea class="cst-sms-textarea" id="amsExpMsg' + i + '">' + d.msg + '</textarea>'
      + '<div class="cst-sms-byte-count" id="amsExpBytes' + i + '">0 / 2000 Bytes</div></div>'
      + '<div class="ams-expiry-btn-row">'
      + '<button class="ams-expiry-preview-btn" onclick="amsExpiryToggleSpecialChars(' + i + ',this)">' + (isEn ? 'Special character' : '특수문자') + '</button>'
      + '<button class="ams-expiry-preview-btn" onclick="amsOpenSmsPreview(\'amsExpMsg' + i + '\')">' + (isEn ? 'Preview' : '미리보기') + '</button>'
      + '</div>'
      + '</div>';
  });
  document.getElementById('amsExpiryCards').innerHTML = html;
  // 바이트 카운터 초기화
  defaults.forEach(function(d, i) {
    var ta = document.getElementById('amsExpMsg' + i);
    if (ta) {
      var bytes = 0;
      for (var j = 0; j < ta.value.length; j++) bytes += ta.value.charCodeAt(j) > 127 ? 2 : 1;
      var limit = document.getElementById('amsExpType' + i).value === 'sms' ? 85 : 2000;
      document.getElementById('amsExpBytes' + i).textContent = bytes + ' / ' + limit + ' Bytes';
    }
  });
  // 발송시각 select 초기화
  var hourSel = document.getElementById('amsExpiryHour');
  hourSel.innerHTML = '';
  for (var h = 0; h < 24; h++) {
    var opt = document.createElement('option');
    opt.value = h; opt.textContent = h < 10 ? '0' + h : h;
    if (h === 10) opt.selected = true;
    hourSel.appendChild(opt);
  }
}

// 만료일 모드 - 특수문자
var amsExpirySpecialInit = false;
var amsExpirySpecialTarget = 0;
function amsExpiryToggleSpecialChars(cardIdx, btnEl) {
  var el = document.getElementById('amsExpirySpecialChars');
  if (!el) return;
  if (el.style.display === 'none') {
    amsExpirySpecialTarget = cardIdx;
    el.style.display = '';
    amsPositionSpecialPopup('amsExpirySpecialChars', btnEl);
    if (!amsExpirySpecialInit) {
      amsExpirySpecialInit = true;
      var grid = document.getElementById('amsExpirySpecialGrid');
      _amsSpecialChars.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cm-special-char-btn';
        if (c.length > 2) btn.style.fontSize = '10px';
        btn.textContent = c;
        btn.onclick = function() {
          var ta = document.getElementById('amsExpMsg' + amsExpirySpecialTarget);
          if (ta) {
            var start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + c + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + c.length;
            ta.focus();
            // 바이트 업데이트
            var bytes = 0;
            for (var j = 0; j < ta.value.length; j++) bytes += ta.value.charCodeAt(j) > 127 ? 2 : 1;
            var type = document.getElementById('amsExpType' + amsExpirySpecialTarget);
            var limit = (type && type.value === 'sms') ? 85 : 2000;
            var bytesEl = document.getElementById('amsExpBytes' + amsExpirySpecialTarget);
            if (bytesEl) bytesEl.textContent = bytes + ' / ' + limit + ' Bytes';
          }
          amsCloseSpecialPopup('amsExpirySpecialChars');
        };
        grid.appendChild(btn);
      });
    }
  } else {
    el.style.display = 'none';
  }
}

var amsExpiryPage = 1;
var amsExpiryActiveCard = 0;

function amsExpiryGetType() {
  var sel = document.getElementById('amsExpType' + amsExpiryActiveCard);
  return (sel && sel.value) || 'lms';
}

function amsExpiryTypeChange(cardIdx) {
  amsExpiryActiveCard = cardIdx;
  var sel = document.getElementById('amsExpType' + cardIdx);
  if (!sel) return;
  var type = sel.value;
  // 바이트 카운트 업데이트
  var ta = document.getElementById('amsExpMsg' + cardIdx);
  var bytesEl = document.getElementById('amsExpBytes' + cardIdx);
  if (ta && bytesEl) {
    var bytes = 0;
    for (var j = 0; j < ta.value.length; j++) bytes += ta.value.charCodeAt(j) > 127 ? 2 : 1;
    var limit = type === 'sms' ? 85 : 2000;
    bytesEl.textContent = bytes + ' / ' + limit + ' Bytes';
  }
  // 샘플 섹션 업데이트
  amsExpiryPage = 1;
  amsExpiryRenderSamples();
}

function amsExpiryRenderSamples() {
  if (typeof cmSmsSamples === 'undefined') return;
  var type = amsExpiryGetType();
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.lms;
  var samples = cmSmsSamples[type] || cmSmsSamples.lms;
  var grid = document.getElementById('amsExpirySmsPreview');
  if (!grid) return;
  grid.innerHTML = '';
  var start = (amsExpiryPage - 1) * info.perPage;
  var items = samples.slice(start, start + info.perPage);
  items.forEach(function(text) {
    var bytes = cmCalcBytes(text);
    var card = document.createElement('div');
    card.className = 'cm-sms-preview-card';
    card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div><div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
    grid.appendChild(card);
  });
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  var totalPages = Math.max(1, Math.ceil(samples.length / info.perPage));
  var cur = document.getElementById('amsExpiryPageCur');
  var tot = document.getElementById('amsExpiryPageTotal');
  if (cur) cur.textContent = amsExpiryPage;
  if (tot) tot.textContent = totalPages;
  // 라벨 업데이트
  var label = document.getElementById('amsExpirySampleLabel');
  if (label) label.textContent = info.label;
}
function amsExpiryPageGo(dir) {
  var type = amsExpiryGetType();
  var samples = cmSmsSamples[type] || cmSmsSamples.lms;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.lms;
  var totalPages = Math.max(1, Math.ceil(samples.length / info.perPage));
  if (dir === 'first') amsExpiryPage = 1;
  else if (dir === 'prev') amsExpiryPage = Math.max(1, amsExpiryPage - 1);
  else if (dir === 'next') amsExpiryPage = Math.min(totalPages, amsExpiryPage + 1);
  else if (dir === 'last') amsExpiryPage = totalPages;
  amsExpiryRenderSamples();
}
function amsExpirySelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  // 마지막으로 타입 변경한 카드에 삽입
  var ta = document.getElementById('amsExpMsg' + amsExpiryActiveCard);
  if (ta) {
    ta.value = body.textContent;
    // 바이트 카운트 업데이트
    var type = amsExpiryGetType();
    var limit = type === 'sms' ? 85 : 2000;
    var bytes = 0;
    for (var j = 0; j < ta.value.length; j++) bytes += ta.value.charCodeAt(j) > 127 ? 2 : 1;
    var bytesEl = document.getElementById('amsExpBytes' + amsExpiryActiveCard);
    if (bytesEl) bytesEl.textContent = bytes + ' / ' + limit + ' Bytes';
  }
}

// ── 방문 감사 모드 (vt1, vt2) ──
var vtSamples = [
  '고객님! 000샵 입니다♥\n시술은 어떠셨나요? 만족스러우셨다면\n정말 기쁠 것 같아요! 이후 스타일 유지나 관리에 어려운 부분이 있으시면 언제든 편하게 문의해 주세요. 고객님께 딱 맞는 관리 팁을 알려 드릴게요.\n\n앞으로도 다양한 서비스로 최고의 경험을 선사하겠습니다. 마음 편히 재방문 하셔서, 저희와 함께 멋진 시간을 나누시면 좋겠습니다^^',
  '((성명))님♡,\n관리 받으시느라 고생 많으셨습니다. 혹시 부족한 부분이 있었다면 언제든 편하게 연락 주세요!\n\n늘 감사하는 마음으로 그날까지 최선을 다하겠습니다. 오늘도 찾아주셔서 감사합니다. 변함없는 000샵이 될게요!\n♡행복한 하루 보내세요♡',
  '안녕하세요, ((성명))고객님!\n\n오늘 저희 000샵을 방문해 주셔서 정말 감사 드려요!\n\n저희 샵에서 경험하는 시간이 편안하고 즐거우셨기를 진심으로 바라며, 언제든 다시 들러 주시면 더욱 특별한 서비스를 많이할 수 있도록 준비하고 있겠습니다.\n\n고객님의 다음 방문을 기대하며, 매일매일 행복하시길 바랍니다!',
  '안녕하세요, ((성명)) 고객님!\n오늘 방문 어떠셨나요?\n저희가 제공한 서비스가 고객님의 하루에 특별함을 더했으면 좋겠습니다.\n\n000샵은 고객님의 만족을 위해 더욱 섬세한 서비스를 제공할 수 있도록 최선을 다하겠습니다. 언제든지 편하게 방문해주세요.\n감사합니다!',
  '((성명))님 안녕하세요!\n\n오늘 저희 000샵에 방문해 주셔서 진심으로 감사드립니다.\n시술 결과가 마음에 드셨으면 좋겠어요!\n\n관리에 관한 궁금한 점이 있으시면 언제든 편하게 연락 주세요.\n다음에도 더 좋은 서비스로 보답하겠습니다.\n\n좋은 하루 되세요 ♡',
  '((성명))고객님, 안녕하세요!\n\n오늘 방문해 주셔서 감사합니다.\n저희 000샵의 서비스가 고객님께 만족스러운 경험이 되었기를 바랍니다.\n\n다음 방문 시에도 최선을 다해 모시겠습니다.\n편안한 하루 보내세요!'
];
var amsVtPage = 1;

function amsVtUpdateBytes() {
  var ta = document.getElementById('amsVtMsgText');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  var type = document.getElementById('amsVtMsgType').value;
  var limit = type === 'sms' ? 85 : 2000;
  document.getElementById('amsVtBytes').textContent = bytes;
  document.getElementById('amsVtByteLimit').textContent = limit;
}

function amsVtPreview() {
  var msg = document.getElementById('amsVtMsgText').value;
  alert(msg || '미리보기할 내용이 없습니다.');
}

function amsVtGetType() { var s = document.getElementById('amsVtMsgType'); return (s && s.value) || 'lms'; }
function amsVtTypeChange() { amsVtUpdateBytes(); amsVtPage = 1; amsVtRenderSamples(); }

function amsVtRenderSamples() {
  var grid = document.getElementById('amsVtSmsPreview');
  if (!grid) return;
  grid.innerHTML = '';
  var type = amsVtGetType();
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.lms;
  var start = (amsVtPage - 1) * info.perPage;
  vtSamples.slice(start, start + info.perPage).forEach(function(text) {
    var bytes = cmCalcBytes(text);
    var card = document.createElement('div');
    card.className = 'cm-sms-preview-card';
    card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div><div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
    grid.appendChild(card);
  });
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  var totalPages = Math.max(1, Math.ceil(vtSamples.length / info.perPage));
  document.getElementById('amsVtPageCur').textContent = amsVtPage;
  document.getElementById('amsVtPageTotal').textContent = totalPages;
  var label = document.getElementById('amsVtSampleLabel');
  if (label) label.textContent = info.label;
}

function amsVtPageGo(dir) {
  var type = amsVtGetType();
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.lms;
  var totalPages = Math.max(1, Math.ceil(vtSamples.length / info.perPage));
  if (dir === 'first') amsVtPage = 1;
  else if (dir === 'prev') amsVtPage = Math.max(1, amsVtPage - 1);
  else if (dir === 'next') amsVtPage = Math.min(totalPages, amsVtPage + 1);
  else if (dir === 'last') amsVtPage = totalPages;
  amsVtRenderSamples();
}

function amsVtSelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  var ta = document.getElementById('amsVtMsgText');
  if (ta) { ta.value = body.textContent; amsVtUpdateBytes(); }
}

// ── 시술 후 관리 / 재방문 유도 모드 ──
var acSamples = [
  '((성명))님의 아름다움을 약속 드립니다. 관리주기를 놓치지 마세요~^^\n- 000샵',
  '((성명))님 어느새 관리 받으신지 00주가 지났어요. 편한 시간으로 예약 주세요♥\n-000샵',
  '((성명)) 고객님! 재방문 기간이에요. 예약이 필요하시면 언제든 연락주세요.\n- 000샵',
  '((성명))님~ 재방문 주기가 되었습니다. 시기 놓치지 마시고 예약해 주세요^^\n- 000샵',
  '((성명))님, 시술 후 관리가 필요한 시기입니다. 편하신 시간에 방문해 주세요!\n- 000샵',
  '((성명))님 안녕하세요! 지난 시술 후 관리는 잘 되고 계신가요? 궁금한 점 있으시면 편하게 연락 주세요.\n- 000샵',
  '((성명))고객님, 시술 받으신 지 꽤 되셨네요. 관리 받으러 오시면 더 좋은 컨디션 유지할 수 있어요!\n- 000샵',
  '((성명))님, 정기 관리 시기가 다가왔습니다. 미리 예약하시면 원하시는 시간에 편하게 받으실 수 있어요.\n- 000샵'
];
var amsAcPage = 1;

function amsAcUpdateBytes() {
  var ta = document.getElementById('amsAcMsgText');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  var type = document.getElementById('amsAcMsgType').value;
  var limit = type === 'sms' ? 85 : 2000;
  document.getElementById('amsAcBytes').textContent = bytes;
  document.getElementById('amsAcByteLimit').textContent = limit;
}

function amsAcPreview() {
  var msg = document.getElementById('amsAcMsgText').value;
  alert(msg || '미리보기할 내용이 없습니다.');
}

// 등록 기준 라디오 토글
function amsAcToggleBasis() {
  var basis = document.querySelector('input[name="amsAcBasis"]:checked').value;
  var wrap = document.getElementById('amsAcCategoryWrap');
  if (basis === 'by_category') {
    wrap.classList.remove('disabled');
  } else {
    wrap.classList.add('disabled');
    // 선택 초기화
    document.querySelectorAll('#amsAcMultiDropdown input[type="checkbox"]').forEach(function(c) { c.checked = false; });
    amsAcMultiUpdateLabel();
    document.getElementById('amsAcMultiDropdown').classList.remove('show');
  }
}

// 멀티셀렉트
function amsAcToggleMultiDrop() {
  if (document.getElementById('amsAcCategoryWrap').classList.contains('disabled')) return;
  document.getElementById('amsAcMultiDropdown').classList.toggle('show');
}
function amsAcMultiToggleAll(el) {
  var checks = document.querySelectorAll('#amsAcMultiDropdown input[type="checkbox"]:not([value="전체"])');
  checks.forEach(function(c) { c.checked = el.checked; });
  amsAcMultiUpdateLabel();
}
function amsAcMultiUpdateLabel() {
  var checks = document.querySelectorAll('#amsAcMultiDropdown input[type="checkbox"]:checked:not([value="전체"])');
  var ph = document.getElementById('amsAcMultiPlaceholder');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (checks.length === 0) {
    ph.textContent = isEn ? 'Select' : '선택하세요';
    ph.classList.remove('has-value');
  } else {
    var names = [];
    checks.forEach(function(c) { names.push(c.value); });
    ph.textContent = names.join(', ');
    ph.classList.add('has-value');
  }
}
function amsAcGetSelectedCategories() {
  var checks = document.querySelectorAll('#amsAcMultiDropdown input[type="checkbox"]:checked:not([value="전체"])');
  var arr = [];
  checks.forEach(function(c) { arr.push(c.value); });
  return arr;
}
document.addEventListener('change', function(e) {
  if (e.target.closest('#amsAcMultiDropdown') && e.target.type === 'checkbox' && e.target.value !== '전체') {
    amsAcMultiUpdateLabel();
  }
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('#amsAcCategoryWrap')) {
    var dd = document.getElementById('amsAcMultiDropdown');
    if (dd) dd.classList.remove('show');
  }
});

// 샘플
function amsAcTypeChange() { amsAcUpdateBytes(); amsAcPage = 1; amsAcRenderSamples(); }

function amsAcRenderSamples() {
  var grid = document.getElementById('amsAcSmsPreview');
  if (!grid) return;
  grid.innerHTML = '';
  var type = document.getElementById('amsAcMsgType').value;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.sms;
  var start = (amsAcPage - 1) * info.perPage;
  acSamples.slice(start, start + info.perPage).forEach(function(text) {
    var bytes = cmCalcBytes(text);
    var card = document.createElement('div');
    card.className = 'cm-sms-preview-card';
    card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div><div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
    grid.appendChild(card);
  });
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  var totalPages = Math.max(1, Math.ceil(acSamples.length / info.perPage));
  document.getElementById('amsAcPageCur').textContent = amsAcPage;
  document.getElementById('amsAcPageTotal').textContent = totalPages;
  var label = document.getElementById('amsAcSampleLabel');
  if (label) label.textContent = info.label;
}
function amsAcPageGo(dir) {
  var type = document.getElementById('amsAcMsgType').value;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.sms;
  var totalPages = Math.max(1, Math.ceil(acSamples.length / info.perPage));
  if (dir === 'first') amsAcPage = 1;
  else if (dir === 'prev') amsAcPage = Math.max(1, amsAcPage - 1);
  else if (dir === 'next') amsAcPage = Math.min(totalPages, amsAcPage + 1);
  else if (dir === 'last') amsAcPage = totalPages;
  amsAcRenderSamples();
}
function amsAcSelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  var ta = document.getElementById('amsAcMsgText');
  if (ta) { ta.value = body.textContent; amsAcUpdateBytes(); }
}

// ── 생일 축하 모드 (bd1) ──
var bdSamples = [
  '사랑하는 ((성명))님의 생일을 축하드립니다! 행복한 하루 되세요\n-000샵',
  '뜻깊은 오늘, 그 어느때보다도 아름다운날 되기를 바랍니다. 생일축하해요~\n-000샵',
  '오늘 ((성명))님의 생일을 축하합니다! 가장 행복한 하루 보내세요\n-000샵',
  '세상에서 가장 기쁜날! 바로 ((성명))님의 생일날!\n생일 축하해요^^\n-000샵',
  '((성명))님, 생일 축하드려요! 오늘 하루 특별한 선물 같은 시간 보내세요♥\n-000샵',
  '((성명))고객님 생일을 진심으로 축하합니다! 늘 건강하시고 행복하세요.\n-000샵',
  '((성명))님~ 생일 축하드립니다! 소중한 날, 저희 샵에서 특별한 혜택을 준비했어요!\n-000샵',
  '((성명))님의 특별한 날을 축하합니다! 좋은 일만 가득하시길 바랍니다.\n-000샵'
];
var amsBdPage = 1;

function amsBdUpdateBytes() {
  var ta = document.getElementById('amsBdMsgText');
  if (!ta) return;
  var bytes = 0;
  for (var i = 0; i < ta.value.length; i++) bytes += ta.value.charCodeAt(i) > 127 ? 2 : 1;
  var type = document.getElementById('amsBdMsgType').value;
  var limit = type === 'sms' ? 85 : 2000;
  document.getElementById('amsBdBytes').textContent = bytes;
  document.getElementById('amsBdByteLimit').textContent = limit;
}

function amsBdPreview() {
  var msg = document.getElementById('amsBdMsgText').value;
  alert(msg || '미리보기할 내용이 없습니다.');
}

function amsBdGradeToggle(el) {
  el.classList.toggle('on');
  var isOn = el.classList.contains('on');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('amsBdGradeLabel').textContent = isOn ? (isEn ? 'Yes' : '예') : (isEn ? 'No' : '아니오');
  document.getElementById('amsBdGradeChecks').style.display = isOn ? 'none' : '';
}

function amsBdTypeChange() { amsBdUpdateBytes(); amsBdPage = 1; amsBdRenderSamples(); }

function amsBdRenderSamples() {
  var grid = document.getElementById('amsBdSmsPreview');
  if (!grid) return;
  grid.innerHTML = '';
  var type = document.getElementById('amsBdMsgType').value;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.sms;
  var start = (amsBdPage - 1) * info.perPage;
  bdSamples.slice(start, start + info.perPage).forEach(function(text) {
    var bytes = cmCalcBytes(text);
    var card = document.createElement('div');
    card.className = 'cm-sms-preview-card';
    card.innerHTML = '<div class="cm-sms-preview-body">' + text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div><div class="cm-sms-preview-bytes">' + bytes + ' / ' + info.maxBytes + ' Bytes</div>';
    grid.appendChild(card);
  });
  grid.style.gridTemplateColumns = 'repeat(' + info.cols + ',1fr)';
  var totalPages = Math.max(1, Math.ceil(bdSamples.length / info.perPage));
  document.getElementById('amsBdPageCur').textContent = amsBdPage;
  document.getElementById('amsBdPageTotal').textContent = totalPages;
  var label = document.getElementById('amsBdSampleLabel');
  if (label) label.textContent = info.label;
}
function amsBdPageGo(dir) {
  var type = document.getElementById('amsBdMsgType').value;
  var info = cmSmsTypeInfo[type] || cmSmsTypeInfo.sms;
  var totalPages = Math.max(1, Math.ceil(bdSamples.length / info.perPage));
  if (dir === 'first') amsBdPage = 1;
  else if (dir === 'prev') amsBdPage = Math.max(1, amsBdPage - 1);
  else if (dir === 'next') amsBdPage = Math.min(totalPages, amsBdPage + 1);
  else if (dir === 'last') amsBdPage = totalPages;
  amsBdRenderSamples();
}
function amsBdSelectSample(e) {
  var card = e.target.closest('.cm-sms-preview-card');
  if (!card) return;
  var body = card.querySelector('.cm-sms-preview-body');
  if (!body) return;
  var ta = document.getElementById('amsBdMsgText');
  if (ta) { ta.value = body.textContent; amsBdUpdateBytes(); }
}

// ══ [FEAT-AUTO-MSG] END ══

// ══════════════════════════════════════════════════════════════════
// [FEAT-SENDER-NUMBER] 문자 발신번호 설정
// ══════════════════════════════════════════════════════════════════

function openSenderNumberSetup() {
  freezeGnb();
  hideAllViews();
  document.getElementById('senderNumberView').classList.add('show');
  // 메인 뷰로 리셋
  document.getElementById('snMainView').style.display = '';
  document.getElementById('snGuideView').style.display = 'none';
  snShopNameInit();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

function snShowGuide() {
  document.getElementById('snMainView').style.display = 'none';
  document.getElementById('snGuideView').style.display = '';
}

function snBackToMain() {
  document.getElementById('snGuideView').style.display = 'none';
  document.getElementById('snMainView').style.display = '';
}

// 툴팁 외부 클릭 닫기
document.addEventListener('click', function(e) {
  var wrap = document.querySelector('.sn-avail-tooltip-wrap');
  if (wrap && !wrap.contains(e.target)) {
    wrap.classList.remove('show');
  }
  var carrierWrap = document.querySelector('.sn-carrier-tooltip-wrap.show');
  if (carrierWrap && !carrierWrap.contains(e.target)) {
    carrierWrap.classList.remove('show');
  }
});

function snVerifyNumber() {
  var input = document.getElementById('snNumberInput');
  var val = input.value.trim();
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!val) {
    alert(isEn ? 'Please enter a sender number.' : '발신번호를 입력하세요.');
    input.focus();
    return;
  }
  // 유효성 검사: 등록 가능한 번호 패턴
  var patterns = [
    /^01[016789]\d{7,8}$/,           // 휴대폰
    /^0[2-6]\d{7,8}$/,               // 유선전화 (지역번호 포함)
    /^(15|16|18)\d{6}$/,             // 전국대표번호 8자리
    /^0[3-7]0\d{7,8}$/               // 0N0 번호 (030, 050, 070 등)
  ];
  var isValid = patterns.some(function(p) { return p.test(val); });
  if (!isValid) {
    alert(isEn
      ? 'Invalid number format. Please check the available number types.'
      : '등록 가능한 번호 형식이 아닙니다.\n\n- 휴대폰\n- 유선전화 (앞에 지역번호 필요)\n- 전국대표번호 (15YY,16YY,18YY) 8자리\n- 0N0 번호 (030, 050, 070 등)');
    input.focus();
    return;
  }
  // 인증 방법 영역 표시
  document.getElementById('snAuthSection').style.display = '';
  snAuthMethodChange();
}

function snAuthMethodChange() {
  var selected = document.querySelector('input[name="snAuthMethod"]:checked');
  var phoneRow = document.getElementById('snPhoneVerifyRow');
  var docSection = document.getElementById('snDocVerifySection');
  if (selected && selected.value === 'phone') {
    phoneRow.style.display = '';
    docSection.style.display = 'none';
  } else {
    phoneRow.style.display = 'none';
    docSection.style.display = '';
  }
}

function snDocMethodChange() {
  var method = document.querySelector('input[name="snDocMethod"]:checked');
  var val = method ? method.value : 'file';
  document.getElementById('snDocFileSection').style.display = val === 'file' ? '' : 'none';
  document.getElementById('snDocFaxSection').style.display = val === 'fax' ? '' : 'none';
  document.getElementById('snDocEmailSection').style.display = val === 'email' ? '' : 'none';
}

function snDocFileSelected(input) {
  var nameEl = document.getElementById('snDocFileName');
  if (input.files && input.files.length > 0) {
    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
      alert(isEn ? 'File must be under 5MB.' : '5MB 이하의 파일만 등록 가능합니다.');
      input.value = '';
      nameEl.style.display = 'none';
      return;
    }
    nameEl.textContent = file.name;
    nameEl.style.display = '';
  } else {
    nameEl.style.display = 'none';
  }
}

function snDocSubmit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var method = document.querySelector('input[name="snDocMethod"]:checked');
  if (method && method.value === 'file') {
    var fileInput = document.getElementById('snDocFileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert(isEn ? 'Please attach a file.' : '파일을 첨부해주세요.');
      return;
    }
  }
  alert(isEn ? 'Document verification request has been submitted.' : '서류인증 신청이 완료되었습니다.');
  // 서류인증 영역 닫기 및 초기화
  document.getElementById('snDocVerifySection').style.display = 'none';
  document.getElementById('snAuthSection').style.display = 'none';
  document.querySelector('input[name="snAuthMethod"][value="phone"]').checked = true;
  document.getElementById('snPhoneVerifyRow').style.display = '';
  // 접수 방법 초기화
  document.querySelector('input[name="snDocMethod"][value="file"]').checked = true;
  snDocMethodChange();
  // 파일 입력 초기화
  var fi = document.getElementById('snDocFileInput');
  if (fi) fi.value = '';
  var fn = document.getElementById('snDocFileName');
  if (fn) fn.style.display = 'none';
  // 번호 입력 초기화
  document.getElementById('snNumberInput').value = '';
}

function snDocCancel() {
  document.getElementById('snDocVerifySection').style.display = 'none';
  document.querySelector('input[name="snAuthMethod"][value="phone"]').checked = true;
  document.getElementById('snPhoneVerifyRow').style.display = '';
}

function snSubmitPhoneVerify() {
  var name = document.getElementById('snPhoneVerifyCode').value.trim();
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!name) {
    alert(isEn ? 'Please enter your name.' : '이름을 입력해주세요.');
    document.getElementById('snPhoneVerifyCode').focus();
    return;
  }
  // PASS 본인인증 팝업 표시
  document.getElementById('snPassPopup').style.display = '';
  // 초기화
  document.getElementById('snPassAgreeAll').checked = false;
  document.querySelectorAll('.sn-pass-agree-check').forEach(function(c) { c.checked = false; });
  document.getElementById('snPassSubmitBtn').disabled = true;
  document.querySelectorAll('.sn-pass-carrier').forEach(function(b) { b.classList.remove('selected'); });
}

function snClosePassPopup() {
  document.getElementById('snPassPopup').style.display = 'none';
}

function snSelectCarrier(carrier) {
  document.querySelectorAll('.sn-pass-carrier').forEach(function(b) { b.classList.remove('selected'); });
  event.currentTarget.classList.add('selected');
}

function snPassToggleAll() {
  var allChecked = document.getElementById('snPassAgreeAll').checked;
  document.querySelectorAll('.sn-pass-agree-check').forEach(function(c) { c.checked = allChecked; });
  snPassUpdateSubmit();
}

function snPassCheckAgree() {
  var checks = document.querySelectorAll('.sn-pass-agree-check');
  var allChecked = Array.from(checks).every(function(c) { return c.checked; });
  document.getElementById('snPassAgreeAll').checked = allChecked;
  snPassUpdateSubmit();
}

function snPassUpdateSubmit() {
  var checks = document.querySelectorAll('.sn-pass-agree-check');
  var allChecked = Array.from(checks).every(function(c) { return c.checked; });
  document.getElementById('snPassSubmitBtn').disabled = !allChecked;
}

function snPassSubmit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var selected = document.querySelector('.sn-pass-carrier.selected');
  if (!selected) {
    alert(isEn ? 'Please select a carrier.' : '통신사를 선택해주세요.');
    return;
  }
  snClosePassPopup();
  alert(isEn ? 'PASS verification completed.' : 'PASS 인증이 완료되었습니다.');
}

function snShowCertPopup(carrier) {
  var img = document.getElementById('snCertImage');
  img.src = 'images/' + carrier + '.png';
  document.getElementById('snCertPopup').style.display = '';
}

function snCloseCertPopup() {
  document.getElementById('snCertPopup').style.display = 'none';
}

// 매장명 수정/저장/취소
var snShopNameBackup = '';
function snShopNameInit() {
  var shopNameEl = document.querySelector('.nav-shop-name');
  var input = document.getElementById('snKakaoShopName');
  if (shopNameEl && input) {
    var name = shopNameEl.textContent.trim();
    input.value = name;
    var titleName = document.getElementById('snAlimTitleName');
    var storeName = document.getElementById('snAlimStoreName');
    if (titleName) titleName.textContent = name;
    if (storeName) storeName.textContent = name;
  }
  // 등록된 발신번호(★ 기본번호)를 알림톡 미리보기에 반영
  var phoneLine = document.getElementById('snAlimPhoneLine');
  if (phoneLine) {
    var starRow = document.querySelector('#snListBody .sn-star');
    if (starRow) {
      var numText = starRow.parentElement.textContent.replace('★', '').trim();
      phoneLine.textContent = '☎ ' + numText;
      phoneLine.style.display = '';
    } else {
      phoneLine.style.display = 'none';
    }
  }
}
function snShopNameEdit() {
  var input = document.getElementById('snKakaoShopName');
  snShopNameBackup = input.value;
  input.disabled = false;
  input.focus();
  document.getElementById('snShopEditBtn').style.display = 'none';
  document.getElementById('snShopSaveBtn').style.display = '';
  document.getElementById('snShopCancelBtn').style.display = '';
}
function snShopNameSave() {
  var input = document.getElementById('snKakaoShopName');
  var val = input.value.trim();
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!val) {
    alert(isEn ? 'Please enter a store name.' : '매장명을 입력해주세요.');
    input.focus();
    return;
  }
  input.disabled = true;
  document.getElementById('snShopEditBtn').style.display = '';
  document.getElementById('snShopSaveBtn').style.display = 'none';
  document.getElementById('snShopCancelBtn').style.display = 'none';
  // 미리보기 업데이트
  var titleName = document.getElementById('snAlimTitleName');
  var storeName = document.getElementById('snAlimStoreName');
  if (titleName) titleName.textContent = val;
  if (storeName) storeName.textContent = val;
  alert(isEn ? 'Store name has been saved.' : '매장명이 저장되었습니다.');
}
function snShopNameCancel() {
  var input = document.getElementById('snKakaoShopName');
  input.value = snShopNameBackup;
  input.disabled = true;
  document.getElementById('snShopEditBtn').style.display = '';
  document.getElementById('snShopSaveBtn').style.display = 'none';
  document.getElementById('snShopCancelBtn').style.display = 'none';
}

function snShowAlimPreview() {
  // 데모: 알림톡 미리보기
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'KakaoTalk notification preview.' : '알림톡 발송 예시 미리보기');
}

// ── 자동 발신번호로 설정 ──
function snSetDefault(btn) {
  var row = btn.closest('tr');
  var tbody = document.getElementById('snListBody');
  var rows = tbody.querySelectorAll('tr');

  rows.forEach(function(r) {
    // 기존 기본번호 별표 제거
    var starEl = r.querySelector('.sn-star');
    if (starEl) starEl.remove();

    // 메모 셀 초기화
    var memoCell = r.querySelector('.sn-memo-cell');
    if (memoCell) {
      var autoLabel = memoCell.querySelector('.sn-auto-label');
      if (autoLabel) autoLabel.remove();
    }

    // 설정 셀에 버튼 복원
    var actionCell = r.querySelector('.sn-action-cell');
    if (actionCell && !actionCell.querySelector('.sn-set-default-btn')) {
      actionCell.innerHTML = '<button class="sn-set-default-btn" onclick="snSetDefault(this)" data-i18n="cl.sn_set_default" data-ko="자동 발신번호로 설정" data-en="Set as Default">자동 발신번호로 설정</button><button class="sn-delete-btn" onclick="snDeleteNumber(this)" data-i18n="common.delete" data-ko="삭제" data-en="Delete">삭제</button>';
    }
  });

  // 선택한 행에 별표 추가
  var numCell = row.querySelector('td');
  var star = document.createElement('span');
  star.className = 'sn-star';
  star.textContent = '★';
  numCell.insertBefore(star, numCell.firstChild);

  // 메모 셀에 자동발신번호 표시
  var memoCell = row.querySelector('.sn-memo-cell');
  if (memoCell) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    var label = document.createElement('span');
    label.className = 'sn-auto-label';
    label.setAttribute('data-i18n', 'cl.sn_auto_memo');
    label.setAttribute('data-ko', '자동발신번호');
    label.setAttribute('data-en', 'Automatic Send Number');
    label.textContent = isEn ? 'Automatic Send Number' : '자동발신번호';
    memoCell.appendChild(label);
  }

  // 설정 셀 버튼 제거 (기본번호는 삭제/변경 불가)
  var actionCell = row.querySelector('.sn-action-cell');
  if (actionCell) actionCell.innerHTML = '';

  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// ── 발신번호 삭제 ──
var _snDeleteTarget = null;
function snDeleteNumber(btn) {
  _snDeleteTarget = btn.closest('tr');
  document.getElementById('snDeleteConfirmModal').classList.add('show');
}
function snCloseDeleteModal() {
  document.getElementById('snDeleteConfirmModal').classList.remove('show');
  _snDeleteTarget = null;
}
function snConfirmDelete() {
  if (_snDeleteTarget) {
    _snDeleteTarget.remove();
    _snDeleteTarget = null;
  }
  snCloseDeleteModal();
}

// ══ [FEAT-SENDER-NUMBER] END ══

// ══════════════════════════════════════════════════════════════
// ══ [FEAT-STAFF-MGMT] 직원관리 ══
// ══════════════════════════════════════════════════════════════

function openStaffMgmt() {
  freezeGnb();
  hideAllViews();
  document.getElementById('staffMgmtView').classList.add('show');
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// ── 검색 ──
function stfDoSearch() {
  var kw = document.getElementById('stfSearchInput').value.trim().toLowerCase();
  if (!kw) return;
  var rows = document.querySelectorAll('#stfTableBody tr');
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    row.style.display = text.indexOf(kw) >= 0 ? '' : 'none';
  });
}

// ── 등록 모달 ──
function stfOpenRegModal() {
  document.getElementById('stfRegModal').classList.add('show');
}
function stfCloseRegModal() {
  document.getElementById('stfRegModal').classList.remove('show');
}
function stfSaveReg() {
  var nick = document.getElementById('stfRegNick').value.trim();
  if (!nick) {
    alert(typeof currentLang !== 'undefined' && currentLang === 'en' ? 'Nickname is required.' : '직원명(별칭)을 입력해주세요.');
    return;
  }
  // 테이블에 추가
  var tbody = document.getElementById('stfTableBody');
  var rowCount = tbody.querySelectorAll('tr').length + 1;
  var no = document.getElementById('stfRegNo').value;
  var name = document.getElementById('stfRegName').value;
  var mobile = document.getElementById('stfRegMobile').value;
  var hire = document.getElementById('stfRegHire').value;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td>' + no + '</td>' +
    '<td>' + nick + '</td>' +
    '<td>' + name + '</td>' +
    '<td>' + mobile + '</td>' +
    '<td>' + hire + '</td>' +
    '<td><button class="stf-link-btn" onclick="stfOpenWorkHourModal(' + (rowCount - 1) + ')" data-i18n="sv.staff_btn_setup" data-ko="설정" data-en="Setup">설정</button></td>' +
    '<td><button class="stf-link-btn" onclick="stfOpenEditModal(' + (rowCount - 1) + ')" data-i18n="sv.staff_btn_edit" data-ko="수정" data-en="Edit">수정</button></td>';
  tbody.appendChild(tr);
  // 다음 번호 갱신
  document.getElementById('stfRegNo').value = parseInt(no) + 1;
  // 폼 리셋
  document.getElementById('stfRegNick').value = '';
  document.getElementById('stfRegName').value = '';
  document.getElementById('stfRegMobile').value = '';
  document.getElementById('stfRegPhone').value = '';
  document.getElementById('stfRegEmail').value = '';
  document.getElementById('stfRegCareer').value = '';
  document.getElementById('stfRegPosition').value = '';
  document.getElementById('stfRegCert').value = '';
  document.getElementById('stfRegHire').value = '';
  document.getElementById('stfRegResign').value = '';
  document.getElementById('stfRegMemo').value = '';
  stfCloseRegModal();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// ── 수정 모달 ──
function stfOpenEditModal(idx) {
  var rows = document.querySelectorAll('#stfTableBody tr');
  if (rows[idx]) {
    var cells = rows[idx].querySelectorAll('td');
    document.getElementById('stfEditNo').value = cells[0].textContent;
    document.getElementById('stfEditNick').value = cells[1].textContent;
    document.getElementById('stfEditName').value = cells[2].textContent;
    document.getElementById('stfEditMobile').value = cells[3].textContent;
    document.getElementById('stfEditHire').value = cells[4].textContent;
  }
  document.getElementById('stfEditModal').classList.add('show');
}
function stfCloseEditModal() {
  document.getElementById('stfEditModal').classList.remove('show');
}
// ── 별칭 수정 플로우: 수정 버튼 → 알림 팝업 → 확인 → 입력 팝업 → 확인 → 반영 ──
function stfShowNickAlert() {
  document.getElementById('stfNickAlertModal').classList.add('show');
}
function stfCloseNickAlert() {
  document.getElementById('stfNickAlertModal').classList.remove('show');
}
function stfConfirmNickAlert() {
  stfCloseNickAlert();
  // 입력 팝업 열기
  document.getElementById('stfNickRenameInput').value = '';
  document.getElementById('stfNickRenameModal').classList.add('show');
  setTimeout(function() { document.getElementById('stfNickRenameInput').focus(); }, 100);
}
function stfCloseNickRename() {
  document.getElementById('stfNickRenameModal').classList.remove('show');
}
function stfConfirmNickRename() {
  var newNick = document.getElementById('stfNickRenameInput').value.trim();
  if (!newNick) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    alert(isEn ? 'Please enter a nickname.' : '별칭을 입력해주세요.');
    return;
  }
  document.getElementById('stfEditNick').value = newNick;
  stfCloseNickRename();
}
function stfSaveEdit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  alert(isEn ? 'Staff info saved.' : '직원 정보가 저장되었습니다.');
  stfCloseEditModal();
}

// ── 근무시간 설정 모달 ──
var stfWorkHours = [];
var stfWhEditIdx = -1;

function stfOpenWorkHourModal(staffIdx) {
  document.getElementById('stfWorkHourModal').classList.add('show');
  stfRenderWhTable();
}
function stfCloseWorkHourModal() {
  document.getElementById('stfWorkHourModal').classList.remove('show');
}
function stfRenderWhTable() {
  var tbody = document.getElementById('stfWhTableBody');
  if (stfWorkHours.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    tbody.innerHTML = '<tr class="stf-wh-empty"><td colspan="4">' + (isEn ? 'No records' : '내역이 없습니다') + '</td></tr>';
    return;
  }
  var html = '';
  stfWorkHours.forEach(function(wh, i) {
    html += '<tr>';
    html += '<td>' + wh.start + '</td>';
    html += '<td>' + wh.end + '</td>';
    html += '<td>' + wh.days.join(', ') + '</td>';
    html += '<td><button class="stf-wh-edit-btn" onclick="stfEditWh(' + i + ')">수정</button> <button class="stf-wh-del-btn" onclick="stfDelWh(' + i + ')">삭제</button></td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

// ── 근무시간 등록 모달 ──
function stfOpenWhAddModal() {
  stfWhEditIdx = -1;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('stfWhAddTitle').textContent = isEn ? 'Add Working Hours' : '근무시간 등록';
  var delBtn = document.getElementById('stfWhDeleteBtn');
  if (delBtn) delBtn.style.display = 'none';
  stfPopulateTimeSelects();
  document.getElementById('stfWhStart').value = '00:00';
  document.getElementById('stfWhEnd').value = '00:00';
  document.querySelectorAll('#stfWhDayList input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
  document.getElementById('stfWhDayList').style.display = 'none';
  document.getElementById('stfWhDayText').textContent = isEn ? 'Select Days' : '요일 선택';
  document.getElementById('stfWhAddModal').classList.add('show');
}
function stfCloseWhAddModal() {
  document.getElementById('stfWhAddModal').classList.remove('show');
}
function stfPopulateTimeSelects() {
  var startSel = document.getElementById('stfWhStart');
  var endSel = document.getElementById('stfWhEnd');
  if (startSel.options.length > 0) return;
  for (var h = 0; h < 24; h++) {
    for (var m = 0; m < 60; m += 30) {
      var val = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      startSel.add(new Option(val, val));
      endSel.add(new Option(val, val));
    }
  }
}
function stfToggleDayPicker() {
  var list = document.getElementById('stfWhDayList');
  list.style.display = list.style.display === 'none' ? 'block' : 'none';
}
function stfSaveWhAdd() {
  var start = document.getElementById('stfWhStart').value;
  var end = document.getElementById('stfWhEnd').value;
  var days = [];
  document.querySelectorAll('#stfWhDayList input[type="checkbox"]:checked').forEach(function(cb) {
    days.push(cb.value);
  });
  if (days.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    alert(isEn ? 'Please select at least one day.' : '요일을 선택해주세요.');
    return;
  }
  if (stfWhEditIdx >= 0) {
    stfWorkHours[stfWhEditIdx] = { start: start, end: end, days: days };
  } else {
    stfWorkHours.push({ start: start, end: end, days: days });
  }
  stfRenderWhTable();
  stfCloseWhAddModal();
}
function stfEditWh(idx) {
  stfWhEditIdx = idx;
  var wh = stfWorkHours[idx];
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('stfWhAddTitle').textContent = isEn ? 'Edit Working Hours' : '근무시간 수정';
  stfPopulateTimeSelects();
  document.getElementById('stfWhStart').value = wh.start;
  document.getElementById('stfWhEnd').value = wh.end;
  document.querySelectorAll('#stfWhDayList input[type="checkbox"]').forEach(function(cb) {
    cb.checked = wh.days.indexOf(cb.value) >= 0;
  });
  document.getElementById('stfWhDayList').style.display = 'none';
  stfUpdateDayText();
  var delBtn = document.getElementById('stfWhDeleteBtn');
  if (delBtn) delBtn.style.display = '';
  document.getElementById('stfWhAddModal').classList.add('show');
}
function stfDeleteWhEntry() {
  if (stfWhEditIdx >= 0) {
    stfDelWh(stfWhEditIdx);
    document.getElementById('stfWhAddModal').classList.remove('show');
  }
}
function stfDelWh(idx) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!confirm(isEn ? 'Delete this work hour entry?' : '해당 근무시간을 삭제하시겠습니까?')) return;
  stfWorkHours.splice(idx, 1);
  stfRenderWhTable();
}
function stfUpdateDayText() {
  var days = [];
  document.querySelectorAll('#stfWhDayList input[type="checkbox"]:checked').forEach(function(cb) {
    days.push(cb.value);
  });
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var el = document.getElementById('stfWhDayText');
  if (days.length > 0) {
    el.textContent = days.join(', ');
    el.classList.add('has-value');
  } else {
    el.textContent = isEn ? 'Select Days' : '요일 선택';
    el.classList.remove('has-value');
  }
}

// 요일 체크박스 변경 시 텍스트 업데이트
document.addEventListener('DOMContentLoaded', function() {
  var dayList = document.getElementById('stfWhDayList');
  if (dayList) {
    dayList.addEventListener('change', stfUpdateDayText);
  }

  // ── 별칭과 동일 체크박스 동기화 (등록) ──
  var regSame = document.getElementById('stfRegSameNick');
  if (regSame) {
    regSame.addEventListener('change', function() {
      var nameInput = document.getElementById('stfRegName');
      if (this.checked) {
        nameInput.value = document.getElementById('stfRegNick').value;
        nameInput.readOnly = true;
      } else {
        nameInput.readOnly = false;
      }
    });
    // 별칭 입력 시 실명도 실시간 동기화
    var regNick = document.getElementById('stfRegNick');
    if (regNick) {
      regNick.addEventListener('input', function() {
        if (regSame.checked) {
          document.getElementById('stfRegName').value = this.value;
        }
      });
    }
  }

  // ── 별칭과 동일 체크박스 동기화 (수정) ──
  var editSame = document.getElementById('stfEditSameNick');
  if (editSame) {
    editSame.addEventListener('change', function() {
      var nameInput = document.getElementById('stfEditName');
      if (this.checked) {
        nameInput.value = document.getElementById('stfEditNick').value;
        nameInput.readOnly = true;
      } else {
        nameInput.readOnly = false;
      }
    });
    var editNick = document.getElementById('stfEditNick');
    if (editNick) {
      editNick.addEventListener('input', function() {
        if (editSame.checked) {
          document.getElementById('stfEditName').value = this.value;
        }
      });
    }
  }
});

// 우편번호 검색 (다음 주소 API)
function stfSearchZip(mode) {
  if (typeof daum === 'undefined' || typeof daum.Postcode === 'undefined') {
    alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  new daum.Postcode({
    oncomplete: function(data) {
      var prefix = mode === 'edit' ? 'stfEdit' : 'stfReg';
      document.getElementById(prefix + 'Zip').value = data.zonecode;
      document.getElementById(prefix + 'Addr1').value = data.roadAddress || data.jibunAddress;
      document.getElementById(prefix + 'Addr2').focus();
    }
  }).open();
}

// ── 입력 유효성 ──
// 숫자만 입력
function stfNumericOnly(e) {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
}
// 이메일 유효성 (blur 시)
function stfValidateEmail(e) {
  var v = e.target.value.trim();
  if (!v) { e.target.style.borderColor = ''; return; }
  var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  e.target.style.borderColor = ok ? '' : '#F06060';
}

document.addEventListener('DOMContentLoaded', function() {
  // 숫자 전용 필드
  var numIds = [
    'stfRegMobile','stfRegPhone','stfRegBirthY','stfRegBirthM','stfRegBirthD',
    'stfEditMobile','stfEditPhone','stfEditBirthY','stfEditBirthM','stfEditBirthD'
  ];
  numIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', stfNumericOnly);
  });
  // 이메일 유효성
  ['stfRegEmail','stfEditEmail'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('blur', stfValidateEmail);
  });
});

// ══ [FEAT-STAFF-MGMT] END ══

// ══════════════════════════════════════════════════════════════
// ══ [FEAT-PAYROLL] 급여 명세서 ══
// ══════════════════════════════════════════════════════════════

// 급여 명세서 데이터 저장소
var paySlipStore = [];

// ── 직원 관리 테이블에서 등록된 직원 목록 가져오기 ──
function payGetStaffList() {
  var staffArr = [];
  var rows = document.querySelectorAll('#stfTableBody tr');
  rows.forEach(function(row) {
    var nickTd = row.querySelectorAll('td')[1]; // 직원명(별칭)
    if (nickTd) {
      var name = nickTd.textContent.trim();
      if (name) staffArr.push(name);
    }
  });
  return staffArr;
}

// ── 급여 관련 모든 직원 드롭다운을 동적으로 갱신 ──
function payRefreshStaffDropdowns() {
  var staffArr = payGetStaffList();
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  // 1) 급여 명세서 작성 모달 - payCreateStaff
  var createSel = document.getElementById('payCreateStaff');
  if (createSel) {
    var curVal = createSel.value;
    createSel.innerHTML = '<option value="" data-i18n="common.opt_select" data-ko="선택" data-en="Select">' + (isEn ? 'Select' : '선택') + '</option>';
    staffArr.forEach(function(name) {
      createSel.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
    if (curVal) createSel.value = curVal;
  }

  // 2) 급여 명세서 메인 필터 - payStaffFilter
  var filterSel = document.getElementById('payStaffFilter');
  if (filterSel) {
    var curVal2 = filterSel.value;
    filterSel.innerHTML = '<option data-i18n="common.opt_all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option>';
    staffArr.forEach(function(name) {
      filterSel.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
    if (curVal2) filterSel.value = curVal2;
  }

  // 3) 인센티브 직원 필터
  var incSel = document.getElementById('payIncStaffFilter');
  if (incSel) {
    var curVal3 = incSel.value;
    incSel.innerHTML = '<option data-i18n="common.opt_all" data-ko="전체" data-en="All">' + (isEn ? 'All' : '전체') + '</option>';
    staffArr.forEach(function(name) {
      incSel.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
    if (curVal3) incSel.value = curVal3;
  }

  // 4) 급여 설정 - 직원 멀티 셀렉트 드롭다운들
  var dropdownIds = ['psetStaffDropdown', 'psetDedStaffDropdown', 'psetItemStaffDropdown'];
  dropdownIds.forEach(function(ddId) {
    var dd = document.getElementById(ddId);
    if (!dd) return;
    // 전체 선택 체크박스 유지
    var toggleAllFn = '';
    if (ddId === 'psetStaffDropdown') toggleAllFn = 'psetStaffToggleAll(this)';
    else if (ddId === 'psetDedStaffDropdown') toggleAllFn = 'psetDedStaffToggleAll(this)';
    else if (ddId === 'psetItemStaffDropdown') toggleAllFn = 'psetItemStaffToggleAll(this)';
    dd.innerHTML =
      '<label class="pset-staff-option"><input type="checkbox" value="전체" onchange="' + toggleAllFn + '"><span class="stf-day-checkmark">✓</span> <span data-i18n="pay.set_all" data-ko="전체 선택" data-en="Select All">' + (isEn ? 'Select All' : '전체 선택') + '</span></label>';
    staffArr.forEach(function(name) {
      dd.innerHTML += '<label class="pset-staff-option"><input type="checkbox" value="' + name + '"><span class="stf-day-checkmark">✓</span> <span>' + name + '</span></label>';
    });
  });

  // 5) 급여 명세서 수정 모달 - payEditStaff
  var editSel = document.getElementById('payEditStaff');
  if (editSel) {
    var curVal4 = editSel.value;
    editSel.innerHTML = '<option value="" data-i18n="common.opt_select" data-ko="선택" data-en="Select">' + (isEn ? 'Select' : '선택') + '</option>';
    staffArr.forEach(function(name) {
      editSel.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
    if (curVal4) editSel.value = curVal4;
  }
}

function openPayrollView() {
  freezeGnb();
  hideAllViews();
  document.getElementById('payrollView').classList.add('show');
  payRefreshStaffDropdowns();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

function payToggleDateType() {
  var isMonth = document.querySelector('input[name="payDateType"][value="month"]').checked;
  document.getElementById('payDateMonth').style.display = isMonth ? '' : 'none';
  document.getElementById('payDateRange').style.display = isMonth ? 'none' : '';
}

function payDoSearch() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // 데모: 검색 동작
}

// ── 직원별 인센티브 (페이지 뷰) ──
function payOpenIncentive() {
  freezeGnb();
  hideAllViews();
  document.getElementById('incentiveView').classList.add('show');
  payRefreshStaffDropdowns();
  payRenderIncTable();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}
function payRenderIncTable() {
  var tbody = document.getElementById('payIncTbody');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // 급여 설정에서 추가된 직원 목록 수집
  var staffCards = document.querySelectorAll('#psetStaffList .pset-staff-card');
  if (staffCards.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="pay-empty">' + (isEn ? 'No records.' : '내역이 없습니다.') + '</td></tr>';
    return;
  }
  var html = '';
  staffCards.forEach(function(card) {
    var name = card.getAttribute('data-staff');
    var baseEl = card.querySelector('.pset-base-pay-display');
    var basePay = baseEl ? baseEl.getAttribute('data-value') || '0' : '0';
    html += '<tr>' +
      '<td>' + name + '</td>' +
      '<td>' + Number(basePay).toLocaleString() + '</td>' +
      '<td></td><td></td><td></td><td></td><td></td><td></td><td></td>' +
      '<td><button class="pset-range-edit-btn" onclick="alert(\'' + (isEn ? 'Excel download' : '엑셀 다운로드') + '\')">' + (isEn ? 'Excel' : '엑셀') + '</button></td>' +
    '</tr>';
  });
  // 합계 행
  html += '<tr style="font-weight:600;background:#FAFAFA;">' +
    '<td>' + (isEn ? 'Total' : '합계') + '</td>' +
    '<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>' +
  '</tr>';
  tbody.innerHTML = html;
}

// ── 급여 명세서 작성 ──
function payOpenCreate() { payRefreshStaffDropdowns(); document.getElementById('payCreateModal').classList.add('show'); }
function payCloseCreate() { document.getElementById('payCreateModal').classList.remove('show'); if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang(); }
function payGenerate() {
  var from = document.getElementById('payCreateFrom').value;
  var to = document.getElementById('payCreateTo').value;
  var staff = document.getElementById('payCreateStaff').value;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!from || !to) { alert(isEn ? 'Please select the working period.' : '근무 기간을 선택해 주세요.'); return; }
  if (!staff) { alert(isEn ? 'Please select staff.' : '직원을 선택해 주세요.'); return; }
  document.getElementById('payCreatePlaceholder').style.display = 'none';
  document.getElementById('payCreateContent').style.display = '';
  document.getElementById('payBtnSave').classList.remove('pay-btn-disabled');
  document.getElementById('payBtnSave').classList.add('pay-btn-primary');
  document.getElementById('payBtnSaveCont').classList.remove('pay-btn-disabled');
  document.getElementById('payBtnSaveCont').classList.add('pay-btn-primary');
  // 명세서 작성 → 다시 선택 버튼 전환 + 입력 비활성화
  document.getElementById('payBtnGenerate').style.display = 'none';
  document.getElementById('payBtnReselect').style.display = '';
  document.getElementById('payCreateFrom').readOnly = true;
  document.getElementById('payCreateTo').readOnly = true;
  document.getElementById('payCreateStaff').disabled = true;
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}
function payReselect() {
  // 다시 선택 → 전단계 화면으로 복귀
  document.getElementById('payCreatePlaceholder').style.display = '';
  document.getElementById('payCreateContent').style.display = 'none';
  document.getElementById('payBtnSave').classList.add('pay-btn-disabled');
  document.getElementById('payBtnSave').classList.remove('pay-btn-primary');
  document.getElementById('payBtnSaveCont').classList.add('pay-btn-disabled');
  document.getElementById('payBtnSaveCont').classList.remove('pay-btn-primary');
  document.getElementById('payBtnGenerate').style.display = '';
  document.getElementById('payBtnReselect').style.display = 'none';
  document.getElementById('payCreateFrom').readOnly = false;
  document.getElementById('payCreateTo').readOnly = false;
  document.getElementById('payCreateStaff').disabled = false;
  document.querySelectorAll('#payCreateContent .pay-amt-input').forEach(function(inp) { inp.value = ''; });
}
function paySaveCreate() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // 테이블에 행 추가
  payAddToList();
  alert(isEn ? 'Payslip saved.' : '급여 명세서가 저장되었습니다.');
  payCloseCreate();
  payResetCreateForm();
}
function paySaveContinue() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  payAddToList();
  alert(isEn ? 'Saved. You can create another.' : '저장되었습니다. 계속 작성할 수 있습니다.');
  payResetCreateForm();
}
function payCollectCreateData() {
  var rows = document.querySelectorAll('#payCreateContent .pay-salary-table tbody tr:not(.pay-total-row)');
  var payItems = [], dedItems = [];
  rows.forEach(function(row) {
    var cells = row.querySelectorAll('td');
    var payLabel = cells[0].textContent.trim();
    var payVal = cells[1].querySelector('input') ? cells[1].querySelector('input').value.replace(/[^0-9]/g, '') : '';
    var dedLabel = cells[2].textContent.trim();
    var dedVal = cells[3].querySelector('input') ? cells[3].querySelector('input').value.replace(/[^0-9]/g, '') : '';
    payItems.push({ label: payLabel, amount: payVal ? parseInt(payVal) : 0 });
    dedItems.push({ label: dedLabel, amount: dedVal ? parseInt(dedVal) : 0 });
  });
  var advanceEl = document.getElementById('payAdvance');
  var advance = advanceEl ? parseInt((advanceEl.value || '0').replace(/[^0-9]/g, '')) || 0 : 0;
  var incomeTypeEl = document.getElementById('payIncomeType');
  var incomeType = incomeTypeEl ? incomeTypeEl.value : 'earned';
  return { payItems: payItems, dedItems: dedItems, advance: advance, incomeType: incomeType };
}
function payAddToList() {
  var from = document.getElementById('payCreateFrom').value;
  var to = document.getElementById('payCreateTo').value;
  var staff = document.getElementById('payCreateStaff').value;
  var now = new Date();
  var dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  // 데이터 수집 및 저장
  var data = payCollectCreateData();
  var totalPay = 0, totalDed = 0;
  data.payItems.forEach(function(item) { totalPay += item.amount; });
  data.dedItems.forEach(function(item) { totalDed += item.amount; });
  var record = {
    id: Date.now(),
    dateStr: dateStr,
    staff: staff,
    from: from,
    to: to,
    payItems: data.payItems,
    dedItems: data.dedItems,
    advance: data.advance,
    incomeType: data.incomeType,
    totalPay: totalPay,
    totalDed: totalDed
  };
  paySlipStore.push(record);
  var tbody = document.getElementById('payTableBody');
  var empty = tbody.querySelector('.pay-empty');
  if (empty) empty.parentElement.remove();
  var tr = document.createElement('tr');
  tr.setAttribute('data-payslip-id', record.id);
  var netPay = totalPay - totalDed;
  var viewLabel = isEn ? 'View' : '보기';
  tr.innerHTML = '<td>' + dateStr + '</td><td>' + staff + '</td><td>' + from + ' ~ ' + to + '</td><td>' + totalPay.toLocaleString() + '</td><td><button class="pay-view-btn" onclick="payOpenViewModal(this)" data-i18n="common.btn_view" data-ko="보기" data-en="View">' + viewLabel + '</button></td><td><button class="pay-view-btn" onclick="payOpenIncDetail()" data-i18n="common.btn_view" data-ko="보기" data-en="View">' + viewLabel + '</button></td>';
  tbody.appendChild(tr);
  // 요약 갱신
  var allTotal = 0;
  paySlipStore.forEach(function(r) { allTotal += r.totalPay; });
  var count = tbody.querySelectorAll('tr').length;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('paySummary').textContent = isEn
    ? 'Total ' + count + ' records, Total salary ' + allTotal.toLocaleString()
    : '총 ' + count + ' 건, 총 급여 ' + allTotal.toLocaleString();
}
function payResetCreateForm() {
  document.getElementById('payCreatePlaceholder').style.display = '';
  document.getElementById('payCreateContent').style.display = 'none';
  document.getElementById('payBtnSave').classList.add('pay-btn-disabled');
  document.getElementById('payBtnSave').classList.remove('pay-btn-primary');
  document.getElementById('payBtnSaveCont').classList.add('pay-btn-disabled');
  document.getElementById('payBtnSaveCont').classList.remove('pay-btn-primary');
  document.getElementById('payBtnGenerate').style.display = '';
  document.getElementById('payBtnReselect').style.display = 'none';
  document.getElementById('payCreateFrom').value = '';
  document.getElementById('payCreateTo').value = '';
  document.getElementById('payCreateStaff').value = '';
  document.getElementById('payCreateFrom').readOnly = false;
  document.getElementById('payCreateTo').readOnly = false;
  document.getElementById('payCreateStaff').disabled = false;
  document.querySelectorAll('.pay-amt-input').forEach(function(inp) { inp.value = ''; });
}

// ── 급여 설정 (페이지 뷰) ──
function payOpenItemSetupPopup() {
  document.getElementById('payItemSetupPopup').classList.add('show');
}
function payCloseItemSetupPopup() {
  document.getElementById('payItemSetupPopup').classList.remove('show');
}
function paySaveItemSetup() {
  payCloseItemSetupPopup();
}
function payEditItemName(btn, currentName) {
  var newName = prompt('항목명을 입력하세요:', currentName);
  if (newName && newName.trim()) {
    var td = btn.closest('tr').querySelector('td:nth-child(2)');
    if (td) td.textContent = newName.trim();
  }
}

function payOpenSettings() {
  // 열려있는 급여 관련 모달 모두 닫기
  ['payCreateModal', 'payEditModal', 'payViewModal'].forEach(function(id) {
    var m = document.getElementById(id);
    if (m) m.classList.remove('show');
  });
  freezeGnb();
  hideAllViews();
  document.getElementById('paySettingsView').classList.add('show');
  payRefreshStaffDropdowns();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// 탭 전환
// ── 인센티브 계산 방식 전환 (매출액 기준 ↔ 판매 항목별) ──
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('input[name="psetCalcMethod"]').forEach(function(r) {
    r.addEventListener('change', function() {
      var isSales = (this.value === 'sales');
      document.getElementById('psetSalesBasedView').style.display = isSales ? '' : 'none';
      document.getElementById('psetItemBasedView').style.display = isSales ? 'none' : '';
    });
  });
  // 포인트 차감 토글
  var pointToggle = document.getElementById('psetItemPointToggle');
  if (pointToggle) {
    pointToggle.addEventListener('change', function() {
      var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
      this.closest('.pset-ded-row').querySelector('.pset-ded-status').textContent = this.checked ? (isEn ? 'On' : '적용함') : (isEn ? 'Off' : '적용 안함');
    });
  }
});
function psetItemProductIncChange() {
  var val = document.querySelector('input[name="psetItemProductInc"]:checked').value;
  document.getElementById('psetItemProductTable').style.display = (val === 'pay') ? '' : 'none';
}
// 제품 매출 인센티브 지급률 팝업
function psetOpenItemRateModal() {
  document.getElementById('psetItemRateSaleInput').value = document.getElementById('psetItemSaleRate').textContent || '';
  document.getElementById('psetItemRatePpInput').value = document.getElementById('psetItemPpDedRate').textContent || '';
  document.getElementById('psetItemRateModal').classList.add('show');
}
function psetCloseItemRate() { document.getElementById('psetItemRateModal').classList.remove('show'); }
function psetSaveItemRate() {
  document.getElementById('psetItemSaleRate').textContent = document.getElementById('psetItemRateSaleInput').value.trim() || '';
  document.getElementById('psetItemPpDedRate').textContent = document.getElementById('psetItemRatePpInput').value.trim() || '';
  psetCloseItemRate();
}
// 판매 항목별 직원 선택
function psetToggleItemStaffDrop() { document.getElementById('psetItemStaffDropdown').classList.toggle('show'); }
function psetItemStaffToggleAll(chk) {
  var checked = chk.checked;
  document.querySelectorAll('#psetItemStaffDropdown input[type="checkbox"]').forEach(function(cb) { cb.checked = checked; });
}
document.addEventListener('click', function(e) {
  var m = document.getElementById('psetItemStaffMulti');
  if (m && !m.contains(e.target)) document.getElementById('psetItemStaffDropdown').classList.remove('show');
});
function psetItemAddStaff() {
  var names = [];
  document.querySelectorAll('#psetItemStaffDropdown input[type="checkbox"]:checked').forEach(function(cb) {
    if (cb.value !== '전체') names.push(cb.value);
  });
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (names.length === 0) { alert(isEn ? 'Please select staff.' : '직원을 선택해주세요.'); return; }
  var list = document.getElementById('psetItemStaffList');
  names.forEach(function(name) {
    if (list.querySelector('[data-staff="' + name + '"]')) return;
    document.getElementById('psetItemStaffEmpty').style.display = 'none';
    var card = document.createElement('div');
    card.className = 'pset-staff-card';
    card.setAttribute('data-staff', name);
    card.style.cssText = 'display:flex;align-items:center;gap:16px;padding:12px 20px;';
    card.innerHTML =
      '<span class="pset-staff-card-name" style="min-width:60px;">' + name + '</span>' +
      '<span class="pset-base-pay-display" onclick="psetOpenBasePay(this)" data-value="0" style="width:120px;">0</span>';
    list.appendChild(card);
  });
  document.getElementById('psetItemStaffDropdown').classList.remove('show');
}

function psetSwitchTab(idx) {
  document.querySelectorAll('.pset-tab').forEach(function(t, i) { t.classList.toggle('active', i === idx); });
  document.querySelectorAll('.pset-panel').forEach(function(p, i) { p.style.display = i === idx ? '' : 'none'; });
}

// 매출 구간 토글
function psetToggleRange() {
  var on = document.getElementById('psetRangeToggle').checked;
  document.getElementById('psetRangeCriteria').style.display = on ? '' : 'none';
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('psetRangeStatus').textContent = on ? (isEn ? 'On' : '적용함') : (isEn ? 'Off' : '적용 안함');
}

// 직원 멀티셀렉트
function psetToggleStaffDrop() {
  document.getElementById('psetStaffDropdown').classList.toggle('show');
}
function psetStaffToggleAll(el) {
  var checked = el.checked;
  document.querySelectorAll('#psetStaffDropdown input[type="checkbox"]').forEach(function(cb) { cb.checked = checked; });
  psetUpdateStaffPh();
}
function psetUpdateStaffPh() {
  var names = [];
  document.querySelectorAll('#psetStaffDropdown input[type="checkbox"]:checked').forEach(function(cb) {
    if (cb.value !== '전체') names.push(cb.value);
  });
  var ph = document.getElementById('psetStaffPh');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (names.length > 0) {
    ph.textContent = names.join(', ');
    ph.classList.add('has-value');
  } else {
    ph.textContent = isEn ? 'Empty Selection' : '직원 선택';
    ph.classList.remove('has-value');
  }
}
document.addEventListener('DOMContentLoaded', function() {
  var dd = document.getElementById('psetStaffDropdown');
  if (dd) dd.addEventListener('change', function(e) {
    if (e.target.value !== '전체') psetUpdateStaffPh();
  });
  // 외부 클릭 시 닫기
  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('psetStaffMulti');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('psetStaffDropdown').classList.remove('show');
    }
  });
});

// 직원 추가
function psetAddStaff() {
  var names = [];
  document.querySelectorAll('#psetStaffDropdown input[type="checkbox"]:checked').forEach(function(cb) {
    if (cb.value !== '전체') names.push(cb.value);
  });
  if (names.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    alert(isEn ? 'Please select staff.' : '직원을 선택해주세요.');
    return;
  }
  document.getElementById('psetStaffEmpty').style.display = 'none';
  var list = document.getElementById('psetStaffList');
  names.forEach(function(name) {
    // 중복 체크
    if (list.querySelector('[data-staff="' + name + '"]')) return;
    var card = document.createElement('div');
    card.className = 'pset-staff-card';
    card.setAttribute('data-staff', name);
    card.innerHTML =
      '<div class="pset-staff-card-header">' +
        '<span class="pset-staff-card-name">' + name + '</span>' +
        '<span class="pset-label" data-i18n="pay.item_base" data-ko="기본급" data-en="Base Salary">' + (isEn ? 'Base Salary' : '기본급') + '</span> <span class="pset-base-pay-display" onclick="psetOpenBasePay(this)" data-value="0">0</span> ' +
        '<span class="pset-label" data-i18n="pay.tax_class" data-ko="소득 구분" data-en="Tax Classification">' + (isEn ? 'Tax Classification' : '소득 구분') + '</span> <select class="pay-select" style="height:28px;font-size:12px;"><option data-i18n="pay.income_biz" data-ko="사업 소득" data-en="Business Income">' + (isEn ? 'Business Income' : '사업 소득') + '</option><option data-i18n="pay.income_earned" data-ko="근로 소득" data-en="Earned Income">' + (isEn ? 'Earned Income' : '근로 소득') + '</option><option data-i18n="pay.income_other" data-ko="기타 소득" data-en="Other Income">' + (isEn ? 'Other Income' : '기타 소득') + '</option></select>' +
        '<div class="pset-staff-card-actions">' +
          '<button class="pset-range-add-btn" onclick="psetOpenRangeReg(this)" data-i18n="pay.btn_add_range" data-ko="매출 구간 등록" data-en="Add Sales Amount Level">' + (isEn ? 'Add Sales Amount Level' : '매출 구간 등록') + '</button>' +
          '<button class="pset-staff-del-btn" onclick="psetRemoveStaff(this)" data-i18n="pay.del_staff" data-ko="직원 삭제" data-en="Delete Staff">' + (isEn ? 'Delete Staff' : '직원 삭제') + '</button>' +
        '</div>' +
      '</div>' +
      '<table class="pay-table" style="border:1px solid #E0E0E0;">' +
        '<thead><tr>' +
          '<th rowspan="2" data-i18n="pay.range_level" data-ko="매출 구간" data-en="Sales Amount Level">' + (isEn ? 'Sales Amount Level' : '매출 구간') + '</th>' +
          '<th colspan="2" data-i18n="pay.inc_th_svc" data-ko="서비스" data-en="Service">' + (isEn ? 'Service' : '서비스') + '</th><th colspan="2" data-i18n="pay.inc_th_prod" data-ko="제품" data-en="Product">' + (isEn ? 'Product' : '제품') + '</th>' +
          '<th rowspan="2" data-i18n="pay.inc_th_prepaid" data-ko="정액권 판매" data-en="Prepaid Card Sales">' + (isEn ? 'Prepaid Card Sales' : '정액권 판매') + '</th><th rowspan="2" data-i18n="pay.inc_th_ticket" data-ko="티켓 판매" data-en="Prepaid Service Sales">' + (isEn ? 'Prepaid Service Sales' : '티켓 판매') + '</th><th rowspan="2" data-i18n="pay.spec_th_edit" data-ko="수정" data-en="Edit">' + (isEn ? 'Edit' : '수정') + '</th>' +
        '</tr><tr><th data-i18n="pay.inc_th_sales" data-ko="판매" data-en="Sales">' + (isEn ? 'Sales' : '판매') + '</th><th data-i18n="pay.inc_th_deduct" data-ko="차감" data-en="Deduction">' + (isEn ? 'Deduction' : '차감') + '</th><th data-i18n="pay.inc_th_sales" data-ko="판매" data-en="Sales">' + (isEn ? 'Sales' : '판매') + '</th><th data-i18n="pay.inc_th_deduct" data-ko="차감" data-en="Deduction">' + (isEn ? 'Deduction' : '차감') + '</th></tr></thead>' +
        '<tbody><tr><td colspan="8" class="pay-empty">' + (isEn ? 'Add Sales Amount Level please.' : '매출 구간을 등록하세요.') + '</td></tr></tbody>' +
      '</table>';
    list.appendChild(card);
  });
  // 드롭다운 닫기
  document.getElementById('psetStaffDropdown').classList.remove('show');
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

function psetRemoveStaff(btn) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!confirm(isEn ? 'Remove this staff?' : '해당 직원을 삭제하시겠습니까?')) return;
  btn.closest('.pset-staff-card').remove();
  var list = document.getElementById('psetStaffList');
  if (!list.querySelector('.pset-staff-card')) {
    document.getElementById('psetStaffEmpty').style.display = '';
  }
}

// 매출 구간 등록 팝업
function psetOpenRangeReg(btn) {
  document.getElementById('psetRangeRegModal').classList.add('show');
  document.getElementById('psetRangeRegModal').dataset.targetStaff = btn.closest('.pset-staff-card').dataset.staff;
}
function psetCloseRangeReg() {
  document.getElementById('psetRangeRegModal').classList.remove('show');
}
function psetRangeFormatRate(val) {
  if (!val) return '';
  var num = val.replace(/[^0-9.]/g, '');
  return num ? num + '%' : '';
}
function psetSaveRangeReg() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var fromVal = document.getElementById('psetRangeFrom').value.replace(/[^0-9]/g, '');
  var toVal = document.getElementById('psetRangeTo').value.replace(/[^0-9]/g, '');
  var unlimited = document.getElementById('psetRangeUnlimited').checked;
  if (!fromVal) { alert(isEn ? 'Please enter start range.' : '시작 매출 구간을 입력해 주세요.'); return; }
  if (!unlimited && !toVal) { alert(isEn ? 'Please enter end range or check Unlimited.' : '종료 매출 구간을 입력하거나 무제한을 체크해 주세요.'); return; }
  var rangeText = Number(fromVal).toLocaleString() + ' ~' + (unlimited ? '' : ' ' + Number(toVal).toLocaleString());
  var rateInputs = document.querySelectorAll('#psetRangeRegModal .pay-modal-body table tbody input.pay-amt-input');
  var rates = [];
  rateInputs.forEach(function(inp) { rates.push(inp.value.trim() || ''); });
  var staffName = document.getElementById('psetRangeRegModal').dataset.targetStaff;
  var card = document.querySelector('#psetStaffList .pset-staff-card[data-staff="' + staffName + '"]');
  if (card) {
    var tbody = card.querySelector('table tbody');
    var emptyRow = tbody.querySelector('.pay-empty');
    if (emptyRow) emptyRow.closest('tr').remove();
    var tr = document.createElement('tr');
    tr.setAttribute('data-range-from', fromVal);
    tr.setAttribute('data-range-to', unlimited ? '' : toVal);
    tr.setAttribute('data-range-unlimited', unlimited ? '1' : '0');
    tr.setAttribute('data-rates', JSON.stringify(rates));
    tr.innerHTML =
      '<td>' + rangeText + '</td>' +
      '<td>' + psetRangeFormatRate(rates[0]) + '</td><td>' + psetRangeFormatRate(rates[1]) + '</td>' +
      '<td>' + psetRangeFormatRate(rates[2]) + '</td><td>' + psetRangeFormatRate(rates[3]) + '</td>' +
      '<td>' + psetRangeFormatRate(rates[4]) + '</td><td>' + psetRangeFormatRate(rates[5]) + '</td>' +
      '<td><button class="pset-range-edit-btn" onclick="psetOpenRangeEdit(this)" data-i18n="pay.btn_edit" data-ko="수정" data-en="Edit">' + (isEn ? 'Edit' : '수정') + '</button></td>';
    tbody.appendChild(tr);
  }
  // 입력 초기화
  document.getElementById('psetRangeFrom').value = '1';
  document.getElementById('psetRangeTo').value = '';
  document.getElementById('psetRangeUnlimited').checked = false;
  var toInput = document.getElementById('psetRangeTo');
  toInput.disabled = false;
  toInput.style.background = '#fff';
  toInput.style.color = '#212121';
  rateInputs.forEach(function(inp) { inp.value = ''; });
  psetCloseRangeReg();
}

// ── 매출 구간 수정 팝업 ──
var psetRangeEditTargetRow = null;
function psetOpenRangeEdit(btn) {
  var tr = btn.closest('tr');
  psetRangeEditTargetRow = tr;
  var fromVal = tr.getAttribute('data-range-from') || '';
  var toVal = tr.getAttribute('data-range-to') || '';
  var unlimited = tr.getAttribute('data-range-unlimited') === '1';
  var rates = JSON.parse(tr.getAttribute('data-rates') || '[]');
  document.getElementById('psetRangeEditFrom').value = fromVal;
  document.getElementById('psetRangeEditTo').value = toVal;
  document.getElementById('psetRangeEditUnlimited').checked = unlimited;
  var toInput = document.getElementById('psetRangeEditTo');
  if (unlimited) {
    toInput.disabled = true; toInput.style.background = '#F5F5F5'; toInput.style.color = '#9E9E9E';
  } else {
    toInput.disabled = false; toInput.style.background = '#fff'; toInput.style.color = '#212121';
  }
  for (var i = 0; i < 6; i++) {
    var el = document.getElementById('psetRangeEditRate' + i);
    if (el) el.value = (rates[i] || '').replace(/%/g, '');
  }
  document.getElementById('psetRangeEditModal').classList.add('show');
}
function psetCloseRangeEdit() {
  document.getElementById('psetRangeEditModal').classList.remove('show');
  psetRangeEditTargetRow = null;
}
function psetSaveRangeEdit() {
  if (!psetRangeEditTargetRow) return;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var fromVal = document.getElementById('psetRangeEditFrom').value.replace(/[^0-9]/g, '');
  var toVal = document.getElementById('psetRangeEditTo').value.replace(/[^0-9]/g, '');
  var unlimited = document.getElementById('psetRangeEditUnlimited').checked;
  if (!fromVal) { alert(isEn ? 'Please enter start range.' : '시작 매출 구간을 입력해 주세요.'); return; }
  var rangeText = Number(fromVal).toLocaleString() + ' ~' + (unlimited ? '' : ' ' + Number(toVal).toLocaleString());
  var rates = [];
  for (var i = 0; i < 6; i++) {
    var el = document.getElementById('psetRangeEditRate' + i);
    rates.push(el ? el.value.trim() : '');
  }
  var tr = psetRangeEditTargetRow;
  tr.setAttribute('data-range-from', fromVal);
  tr.setAttribute('data-range-to', unlimited ? '' : toVal);
  tr.setAttribute('data-range-unlimited', unlimited ? '1' : '0');
  tr.setAttribute('data-rates', JSON.stringify(rates));
  var cells = tr.querySelectorAll('td');
  cells[0].textContent = rangeText;
  for (var j = 0; j < 6; j++) {
    cells[j + 1].textContent = psetRangeFormatRate(rates[j]);
  }
  psetCloseRangeEdit();
}
function psetDeleteRangeEdit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!confirm(isEn ? 'Delete this sales range?' : '해당 매출 구간을 삭제하시겠습니까?')) return;
  if (psetRangeEditTargetRow) {
    var tbody = psetRangeEditTargetRow.closest('tbody');
    psetRangeEditTargetRow.remove();
    if (!tbody.querySelectorAll('tr').length) {
      var emptyTr = document.createElement('tr');
      emptyTr.innerHTML = '<td colspan="8" class="pay-empty">' + (isEn ? 'Add Sales Amount Level please.' : '매출 구간을 등록하세요.') + '</td>';
      tbody.appendChild(emptyTr);
    }
  }
  psetCloseRangeEdit();
}
// 수정 팝업 무제한 체크박스
document.addEventListener('DOMContentLoaded', function() {
  var chk = document.getElementById('psetRangeEditUnlimited');
  if (chk) {
    chk.addEventListener('change', function() {
      var toInput = document.getElementById('psetRangeEditTo');
      if (this.checked) {
        toInput.value = ''; toInput.disabled = true; toInput.style.background = '#F5F5F5'; toInput.style.color = '#9E9E9E';
      } else {
        toInput.disabled = false; toInput.style.background = '#fff'; toInput.style.color = '#212121';
      }
    });
  }
});

// ── 기본급 설정 팝업 ──
var psetBasePayTarget = null;
function psetOpenBasePay(el) {
  psetBasePayTarget = el;
  var val = el.getAttribute('data-value') || '0';
  document.getElementById('psetBasePayInput').value = val !== '0' ? Number(val).toLocaleString() : '';
  document.getElementById('psetBasePayModal').classList.add('show');
  setTimeout(function() { document.getElementById('psetBasePayInput').focus(); }, 100);
}
function psetCloseBasePay() {
  document.getElementById('psetBasePayModal').classList.remove('show');
  psetBasePayTarget = null;
}
function psetSaveBasePay() {
  var raw = (document.getElementById('psetBasePayInput').value || '0').replace(/[^0-9]/g, '');
  var val = parseInt(raw) || 0;
  if (psetBasePayTarget) {
    psetBasePayTarget.setAttribute('data-value', val);
    psetBasePayTarget.textContent = val.toLocaleString();
  }
  psetCloseBasePay();
}

// ── 매출구간 등록 — 무제한 체크박스 ──
document.addEventListener('DOMContentLoaded', function() {
  var unlimitedChk = document.getElementById('psetRangeUnlimited');
  if (unlimitedChk) {
    unlimitedChk.addEventListener('change', function() {
      var toInput = document.getElementById('psetRangeTo');
      if (this.checked) {
        toInput.value = '';
        toInput.disabled = true;
        toInput.style.background = '#F5F5F5';
        toInput.style.color = '#9E9E9E';
      } else {
        toInput.disabled = false;
        toInput.style.background = '#fff';
        toInput.style.color = '#212121';
      }
    });
  }
});

// ── 인센티브 공제 탭 토글 ──
function psetDedToggle(type) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (type === 'product') {
    var on = document.getElementById('psetDedProductToggle').checked;
    document.getElementById('psetDedProductStatus').textContent = on ? (isEn ? 'On' : '적용함') : (isEn ? 'Off' : '적용 안함');
  } else if (type === 'vat') {
    var on = document.getElementById('psetDedVatToggle').checked;
    document.getElementById('psetDedVatStatus').textContent = on ? (isEn ? 'On' : '적용함') : (isEn ? 'Off' : '적용 안함');
    document.getElementById('psetDedVatSub').style.display = on ? '' : 'none';
  } else if (type === 'paymethod') {
    var on = document.getElementById('psetDedPayMethodToggle').checked;
    document.getElementById('psetDedPayMethodStatus').textContent = on ? (isEn ? 'On' : '적용함') : (isEn ? 'Off' : '적용 안함');
    document.getElementById('psetDedPayMethodSub').style.display = on ? '' : 'none';
  }
}

// ── 부가세 공제율 팝업 ──
function psetOpenVatRate() {
  var customRadio = document.querySelector('input[name="psetVatType"][value="custom"]');
  if (customRadio) customRadio.checked = true;
  var val = document.getElementById('psetVatCustomRate').getAttribute('data-value') || '0';
  document.getElementById('psetVatRateInput').value = val !== '0' ? val : '';
  document.getElementById('psetVatRateModal').classList.add('show');
  setTimeout(function() { document.getElementById('psetVatRateInput').focus(); }, 100);
}
function psetCloseVatRate() { document.getElementById('psetVatRateModal').classList.remove('show'); }
function psetSaveVatRate() {
  var raw = (document.getElementById('psetVatRateInput').value || '0').replace(/[^0-9.]/g, '');
  var val = parseFloat(raw) || 0;
  var el = document.getElementById('psetVatCustomRate');
  el.setAttribute('data-value', val);
  el.textContent = val;
  psetCloseVatRate();
}

// ── 결제 방법별 공제 수정 팝업 ──
function psetEditPayMethodRates() {
  // 현재 테이블의 값을 팝업에 로드
  var mainTable = document.getElementById('psetPayMethodTable');
  var editTable = document.getElementById('psetPayMethodEditBody');
  var mainRows = mainTable.querySelectorAll('tbody tr');
  var editRows = editTable.querySelectorAll('tr');
  mainRows.forEach(function(row, ri) {
    if (ri >= editRows.length) return;
    var mainCells = row.querySelectorAll('td');
    var editInputs = editRows[ri].querySelectorAll('input.pay-amt-input');
    var inputIdx = 0;
    for (var ci = 1; ci < mainCells.length; ci += 2) {
      if (inputIdx < editInputs.length) {
        editInputs[inputIdx].value = mainCells[ci].textContent.trim();
        inputIdx++;
      }
    }
  });
  document.getElementById('psetPayMethodModal').classList.add('show');
}
function psetClosePayMethod() { document.getElementById('psetPayMethodModal').classList.remove('show'); }
function psetSavePayMethod() {
  // 팝업 입력값을 메인 테이블에 반영
  var mainTable = document.getElementById('psetPayMethodTable');
  var editTable = document.getElementById('psetPayMethodEditBody');
  var mainRows = mainTable.querySelectorAll('tbody tr');
  var editRows = editTable.querySelectorAll('tr');
  editRows.forEach(function(row, ri) {
    if (ri >= mainRows.length) return;
    var inputs = row.querySelectorAll('input.pay-amt-input');
    var mainCells = mainRows[ri].querySelectorAll('td');
    var inputIdx = 0;
    for (var ci = 1; ci < mainCells.length; ci += 2) {
      if (inputIdx < inputs.length) {
        var val = inputs[inputIdx].value.trim();
        mainCells[ci].textContent = val ? val + (val.indexOf('%') === -1 ? '%' : '') : '';
        inputIdx++;
      }
    }
  });
  psetClosePayMethod();
}

// 인센티브 공제 - 직원별 설정 추가
// ── 인센티브 공제 - 직원 멀티 셀렉트 ──
function psetToggleDedStaffDrop() {
  document.getElementById('psetDedStaffDropdown').classList.toggle('show');
}
function psetDedStaffToggleAll(chk) {
  var checked = chk.checked;
  document.querySelectorAll('#psetDedStaffDropdown input[type="checkbox"]').forEach(function(cb) { cb.checked = checked; });
}
document.addEventListener('click', function(e) {
  var multi = document.getElementById('psetDedStaffMulti');
  if (multi && !multi.contains(e.target)) {
    document.getElementById('psetDedStaffDropdown').classList.remove('show');
  }
});

function psetDedAddStaff() {
  var names = [];
  document.querySelectorAll('#psetDedStaffDropdown input[type="checkbox"]:checked').forEach(function(cb) {
    if (cb.value !== '전체') names.push(cb.value);
  });
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (names.length === 0) { alert(isEn ? 'Please select staff.' : '직원을 선택해주세요.'); return; }
  var list = document.getElementById('psetDedStaffList');
  names.forEach(function(name) {
  if (list.querySelector('[data-staff="' + name + '"]')) return;
  document.getElementById('psetDedStaffEmpty').style.display = 'none';
  var uid = 'dedStaff_' + Date.now();
  var card = document.createElement('div');
  card.className = 'pset-staff-card';
  card.setAttribute('data-staff', name);
  card.innerHTML =
    '<div class="pset-staff-card-header">' +
      '<span class="pset-staff-card-name">' + name + '</span>' +
      '<div class="pset-staff-card-actions">' +
        '<button class="pset-staff-del-btn" onclick="psetDedRemoveStaff(this)" data-i18n="pay.del_staff" data-ko="직원 삭제" data-en="Delete Staff">' + (isEn ? 'Delete Staff' : '직원 삭제') + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="pset-ded-box" style="margin-top:8px;">' +
      // 제품 매출에서 입고가 공제
      '<div class="pset-ded-row"><span class="pset-ded-label">' + (isEn ? 'Deduct Product Purchase Cost' : '제품 매출에서 입고가 공제') + '</span>' +
        '<label class="pay-toggle"><input type="checkbox" onchange="psetDedStaffToggle(this)"><span class="pay-toggle-slider"></span></label>' +
        '<span class="pset-ded-status">' + (isEn ? 'On' : '적용함') + '</span></div>' +
      // 부가세 공제
      '<div class="pset-ded-row"><span class="pset-ded-label">' + (isEn ? 'Deduct VAT' : '부가세 공제') + '</span>' +
        '<label class="pay-toggle"><input type="checkbox" onchange="psetDedStaffToggle(this)"><span class="pay-toggle-slider"></span></label>' +
        '<span class="pset-ded-status">' + (isEn ? 'On' : '적용함') + '</span></div>' +
      '<div class="pset-ded-sub">' +
        '<label class="pay-radio"><input type="radio" name="' + uid + '_vat" value="legal" checked> <span>' + (isEn ? 'Apply statutory VAT (divide sales by 1.1)' : '법정 부가세 적용 (매출을 1.1로 나눔)') + '</span></label>' +
        '<label class="pay-radio"><input type="radio" name="' + uid + '_vat" value="custom"> <span>' + (isEn ? 'Arbitrary Application(Deduction Rate' : '임의 적용(공제율') + '</span>' +
          ' <span class="pset-base-pay-display" onclick="psetOpenVatRate()" style="width:60px;height:28px;font-size:12px;" data-value="0">0</span>' +
          ' <span>%)</span></label>' +
      '</div>' +
      // 결제 방법별 공제
      '<div class="pset-ded-row"><span class="pset-ded-label">' + (isEn ? 'Deduct by Payment Method' : '결제 방법별 공제') + '</span>' +
        '<label class="pay-toggle"><input type="checkbox" onchange="psetDedStaffToggle(this)"><span class="pay-toggle-slider"></span></label>' +
        '<span class="pset-ded-status">' + (isEn ? 'On' : '적용함') + '</span></div>' +
      '<div class="pset-ded-sub">' +
        '<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">' +
          '<button class="pset-range-add-btn" onclick="psetEditPayMethodRates()">' + (isEn ? 'Edit' : '수정') + '</button>' +
        '</div>' +
        '<table class="pay-table pset-pay-method-table">' +
          '<thead><tr><th>' + (isEn ? 'Payment Method' : '결제 방법') + '</th><th>' + (isEn ? 'Deduction Rate' : '공제율') + '</th><th>' + (isEn ? 'Payment Method' : '결제 방법') + '</th><th>' + (isEn ? 'Deduction Rate' : '공제율') + '</th><th>' + (isEn ? 'Payment Method' : '결제 방법') + '</th><th>' + (isEn ? 'Deduction Rate' : '공제율') + '</th><th>' + (isEn ? 'Payment Method' : '결제 방법') + '</th><th>' + (isEn ? 'Deduction Rate' : '공제율') + '</th></tr></thead>' +
          '<tbody>' +
            '<tr><td class="pset-pm-highlight">' + (isEn ? 'Point Deduction' : '포인트 차감') + '</td><td>100.0%</td><td class="pset-pm-highlight">' + (isEn ? 'Balance Deduction' : '정액권 차감') + '</td><td></td><td class="pset-pm-highlight">' + (isEn ? 'Service Deduction' : '티켓 차감') + '</td><td></td><td>' + (isEn ? 'Outstanding' : '미수금') + '</td><td></td></tr>' +
            '<tr><td>' + (isEn ? 'Cash' : '현금') + '</td><td></td><td>' + (isEn ? 'Card' : '카드') + '</td><td></td><td>' + (isEn ? 'Bank Transfer' : '계좌이체') + '</td><td></td><td>' + (isEn ? 'Local Currency' : '지역화폐') + '</td><td></td></tr>' +
            '<tr><td>' + (isEn ? 'Naver Pay' : '네이버 페이') + '</td><td></td><td>' + (isEn ? 'Kakao Pay' : '카카오 페이') + '</td><td></td><td>' + (isEn ? 'Gift Card' : '상품권') + '</td><td></td><td></td><td></td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  list.appendChild(card);
  // 토글 초기 상태: 체크된 것은 적용함
  card.querySelectorAll('.pay-toggle input[type="checkbox"]').forEach(function(chk) { chk.checked = true; });
  }); // end names.forEach
  // 드롭다운 닫기
  document.getElementById('psetDedStaffDropdown').classList.remove('show');
}
function psetDedStaffToggle(chk) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var status = chk.closest('.pset-ded-row').querySelector('.pset-ded-status');
  if (status) status.textContent = chk.checked ? (isEn ? 'On' : '적용함') : (isEn ? 'Off' : '적용 안함');
}
function psetDedRemoveStaff(btn) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!confirm(isEn ? 'Remove this staff?' : '해당 직원을 삭제하시겠습니까?')) return;
  btn.closest('.pset-staff-card').remove();
  var list = document.getElementById('psetDedStaffList');
  if (!list.querySelector('.pset-staff-card')) document.getElementById('psetDedStaffEmpty').style.display = '';
}

// ── 특정 항목 인센티브 ──
var psetSpecData = []; // {type:'svc'|'tkt'|'pp', cat:string, name:string, price:number, incSale:string, incSaleType:'percent'|'amount', incDed:string}

function psetRenderSpecTable() {
  var tbody = document.getElementById('psetSpecTbody');
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (psetSpecData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="pay-empty">' + (isEn ? 'No records' : '내역이 없습니다') + '</td></tr>';
    return;
  }
  tbody.innerHTML = psetSpecData.map(function(d, i) {
    var incSaleDisp = d.incSale + (d.incSaleType === 'percent' ? ' %' : '');
    var incDedDisp = d.incDed ? d.incDed + ' %' : '';
    var nameStyle = (d.type === 'svc' || d.type === 'tkt') ? ' style="color:#6161FF;font-weight:600;"' : '';
    var catLabel = d.cat || (d.type === 'pp' ? (isEn ? 'Prepaid Card' : '정액권') : '');
    return '<tr>' +
      '<td>' + catLabel + '</td>' +
      '<td' + nameStyle + '>' + d.name + '</td>' +
      '<td>' + (d.price ? Number(d.price).toLocaleString() : '0') + '</td>' +
      '<td>' + incSaleDisp + '</td>' +
      '<td>' + incDedDisp + '</td>' +
      '<td><button class="pset-range-edit-btn" onclick="psetEditSpecItem(' + i + ')">' + (isEn ? 'Edit' : '수정') + '</button></td>' +
    '</tr>';
  }).join('');
}
var psetSpecEditIdx = -1; // -1 = 등록 모드, 0+ = 수정 모드

function psetEditSpecItem(idx) {
  var d = psetSpecData[idx];
  if (!d) return;
  psetSpecEditIdx = idx;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (d.type === 'svc') {
    psetOpenSpecSvcModal();
    // 기존 값 채우기
    var catSel = document.getElementById('psetSpecSvcCat');
    catSel.value = d.cat;
    psetSpecSvcCatChange();
    document.getElementById('psetSpecSvcItem').value = d.name;
    document.getElementById('psetSpecSvcPrice').value = d.price ? Number(d.price).toLocaleString() : '';
    document.getElementById('psetSpecSvcIncSale').value = d.incSale;
    document.getElementById('psetSpecSvcIncDed').value = d.incDed;
    document.querySelector('input[name="psetSpecSvcIncType"][value="' + d.incSaleType + '"]').checked = true;
    psetSpecIncTypeChange('Svc');
    // 타이틀/푸터 수정 모드
    document.getElementById('psetSpecSvcModalTitle').textContent = isEn ? 'Edit Service Salary' : '서비스 급여 수정';
    document.getElementById('psetSpecSvcFooter').innerHTML =
      '<button class="pay-footer-btn pay-btn-outline" onclick="psetCloseSpecSvc()">' + (isEn ? 'Cancel' : '취소') + '</button>' +
      '<button class="pay-footer-btn pay-btn-danger" onclick="psetDeleteSpecFromEdit()">' + (isEn ? 'Delete' : '삭제') + '</button>' +
      '<button class="pay-footer-btn pay-btn-primary" onclick="psetSaveSpecSvc()">' + (isEn ? 'Save' : '저장') + '</button>';
  } else if (d.type === 'tkt') {
    psetOpenSpecTktModal();
    document.getElementById('psetSpecTktCat').value = d.cat;
    psetSpecTktCatChange();
    document.getElementById('psetSpecTktItem').value = d.name;
    document.getElementById('psetSpecTktPrice').value = d.price ? Number(d.price).toLocaleString() : '';
    document.getElementById('psetSpecTktIncSale').value = d.incSale;
    document.querySelector('input[name="psetSpecTktIncType"][value="' + d.incSaleType + '"]').checked = true;
    document.getElementById('psetSpecTktModalTitle').textContent = isEn ? 'Edit Prepaid Service Salary' : '티켓 급여 수정';
    document.getElementById('psetSpecTktFooter').innerHTML =
      '<button class="pay-footer-btn pay-btn-outline" onclick="psetCloseSpecTkt()">' + (isEn ? 'Cancel' : '취소') + '</button>' +
      '<button class="pay-footer-btn pay-btn-danger" onclick="psetDeleteSpecFromEdit()">' + (isEn ? 'Delete' : '삭제') + '</button>' +
      '<button class="pay-footer-btn pay-btn-primary" onclick="psetSaveSpecTkt()">' + (isEn ? 'Save' : '저장') + '</button>';
  } else if (d.type === 'pp') {
    psetOpenSpecPpModal();
    document.getElementById('psetSpecPpItem').value = d.name;
    psetSpecPpItemChange();
    document.getElementById('psetSpecPpIncSale').value = d.incSale;
    document.querySelector('input[name="psetSpecPpIncType"][value="' + d.incSaleType + '"]').checked = true;
    document.getElementById('psetSpecPpModalTitle').textContent = isEn ? 'Edit Prepaid Card Salary' : '정액권 급여 수정';
    document.getElementById('psetSpecPpFooter').innerHTML =
      '<button class="pay-footer-btn pay-btn-outline" onclick="psetCloseSpecPp()">' + (isEn ? 'Cancel' : '취소') + '</button>' +
      '<button class="pay-footer-btn pay-btn-danger" onclick="psetDeleteSpecFromEdit()">' + (isEn ? 'Delete' : '삭제') + '</button>' +
      '<button class="pay-footer-btn pay-btn-primary" onclick="psetSaveSpecPp()">' + (isEn ? 'Save' : '저장') + '</button>';
  }
}
function psetDeleteSpecFromEdit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (!confirm(isEn ? 'Delete this item?' : '해당 항목을 삭제하시겠습니까?')) return;
  if (psetSpecEditIdx >= 0) {
    psetSpecData.splice(psetSpecEditIdx, 1);
    psetSpecEditIdx = -1;
    psetRenderSpecTable();
  }
  psetCloseSpecSvc(); psetCloseSpecTkt(); psetCloseSpecPp();
}
function psetResetSpecModalMode(type) {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  psetSpecEditIdx = -1;
  if (type === 'svc') {
    document.getElementById('psetSpecSvcModalTitle').textContent = isEn ? 'Add Service Salary' : '서비스 급여 등록';
    document.getElementById('psetSpecSvcFooter').innerHTML =
      '<button class="pay-footer-btn pay-btn-outline" onclick="psetCloseSpecSvc()">' + (isEn ? 'Cancel' : '취소') + '</button>' +
      '<button class="pay-footer-btn pay-btn-primary" onclick="psetSaveSpecSvc()">' + (isEn ? 'Save' : '저장') + '</button>';
  } else if (type === 'tkt') {
    document.getElementById('psetSpecTktModalTitle').textContent = isEn ? 'Add Prepaid Service Salary' : '티켓 급여 등록';
    document.getElementById('psetSpecTktFooter').innerHTML =
      '<button class="pay-footer-btn pay-btn-outline" onclick="psetCloseSpecTkt()">' + (isEn ? 'Cancel' : '취소') + '</button>' +
      '<button class="pay-footer-btn pay-btn-primary" onclick="psetSaveSpecTkt()">' + (isEn ? 'Save' : '저장') + '</button>';
  } else if (type === 'pp') {
    document.getElementById('psetSpecPpModalTitle').textContent = isEn ? 'Add Prepaid Card Salary' : '정액권 급여 등록';
    document.getElementById('psetSpecPpFooter').innerHTML =
      '<button class="pay-footer-btn pay-btn-outline" onclick="psetCloseSpecPp()">' + (isEn ? 'Cancel' : '취소') + '</button>' +
      '<button class="pay-footer-btn pay-btn-primary" onclick="psetSaveSpecPp()">' + (isEn ? 'Save' : '저장') + '</button>';
  }
}

// 서비스 급여 등록 모달
function psetOpenSpecSvcModal() {
  var catSel = document.getElementById('psetSpecSvcCat');
  catSel.innerHTML = '<option value=""></option>';
  Object.keys(svServiceData).forEach(function(cat) {
    if (svCatUsedData[cat] === false) return;
    catSel.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
  });
  document.getElementById('psetSpecSvcItem').innerHTML = '<option value=""></option>';
  document.getElementById('psetSpecSvcPrice').value = '';
  document.getElementById('psetSpecSvcIncSale').value = '';
  document.getElementById('psetSpecSvcIncDed').value = '';
  document.querySelector('input[name="psetSpecSvcIncType"][value="percent"]').checked = true;
  document.getElementById('psetSpecSvcModal').classList.add('show');
}
function psetCloseSpecSvc() { document.getElementById('psetSpecSvcModal').classList.remove('show'); psetResetSpecModalMode('svc'); }
function psetSpecSvcCatChange() {
  var cat = document.getElementById('psetSpecSvcCat').value;
  var itemSel = document.getElementById('psetSpecSvcItem');
  itemSel.innerHTML = '<option value=""></option>';
  if (cat && svServiceData[cat]) {
    svServiceData[cat].forEach(function(s) {
      if (s.used === false) return;
      itemSel.innerHTML += '<option value="' + s.name + '">' + s.name + '</option>';
    });
  }
  document.getElementById('psetSpecSvcPrice').value = '';
}
function psetSpecSvcItemChange() {
  // 서비스에는 가격 데이터가 없으므로 비워둠
  document.getElementById('psetSpecSvcPrice').value = '';
}
// 인센티브 % ↔ 금액 라디오 변경 시 차감 입력 비활성화
function psetSpecIncTypeChange(prefix) {
  var type = document.querySelector('input[name="psetSpec' + prefix + 'IncType"]:checked').value;
  var dedInput = document.getElementById('psetSpec' + prefix + 'IncDed');
  var dedRow = document.getElementById('psetSpec' + prefix + 'DedRow');
  if (type === 'amount') {
    if (dedInput) { dedInput.disabled = true; dedInput.value = ''; dedInput.style.background = '#F5F5F5'; }
    if (dedRow) dedRow.style.opacity = '0.5';
  } else {
    if (dedInput) { dedInput.disabled = false; dedInput.style.background = '#fff'; }
    if (dedRow) dedRow.style.opacity = '1';
  }
}
function psetSaveSpecSvc() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var cat = document.getElementById('psetSpecSvcCat').value;
  var name = document.getElementById('psetSpecSvcItem').value;
  var incSale = document.getElementById('psetSpecSvcIncSale').value.trim();
  var incDed = document.getElementById('psetSpecSvcIncDed').value.trim();
  var incType = document.querySelector('input[name="psetSpecSvcIncType"]:checked').value;
  if (!cat || !name || !incSale) { alert(isEn ? 'Please fill required fields.' : '필수 항목을 입력해주세요.'); return; }
  var entry = { type:'svc', cat:cat, name:name, price:'', incSale:incSale, incSaleType:incType, incDed:incDed };
  if (psetSpecEditIdx >= 0) { psetSpecData[psetSpecEditIdx] = entry; } else { psetSpecData.push(entry); }
  psetRenderSpecTable();
  psetCloseSpecSvc();
}

// 티켓 급여 등록 모달
function psetOpenSpecTktModal() {
  var catSel = document.getElementById('psetSpecTktCat');
  catSel.innerHTML = '<option value=""></option>';
  Object.keys(svServiceData).forEach(function(cat) {
    if (svCatUsedData[cat] === false) return;
    catSel.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
  });
  document.getElementById('psetSpecTktItem').innerHTML = '<option value=""></option>';
  document.getElementById('psetSpecTktPrice').value = '';
  document.getElementById('psetSpecTktIncSale').value = '';
  document.querySelector('input[name="psetSpecTktIncType"][value="percent"]').checked = true;
  document.getElementById('psetSpecTktModal').classList.add('show');
}
function psetCloseSpecTkt() { document.getElementById('psetSpecTktModal').classList.remove('show'); psetResetSpecModalMode('tkt'); }
function psetSpecTktCatChange() {
  var cat = document.getElementById('psetSpecTktCat').value;
  var itemSel = document.getElementById('psetSpecTktItem');
  itemSel.innerHTML = '<option value=""></option>';
  // 티켓은 분류별 서비스 기반으로 표시
  if (cat && svServiceData[cat]) {
    svServiceData[cat].forEach(function(s) {
      if (s.used === false) return;
      itemSel.innerHTML += '<option value="' + s.name + '">' + s.name + '</option>';
    });
  }
  document.getElementById('psetSpecTktPrice').value = '';
}
function psetSaveSpecTkt() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var cat = document.getElementById('psetSpecTktCat').value;
  var name = document.getElementById('psetSpecTktItem').value;
  var incSale = document.getElementById('psetSpecTktIncSale').value.trim();
  var incType = document.querySelector('input[name="psetSpecTktIncType"]:checked').value;
  if (!cat || !name || !incSale) { alert(isEn ? 'Please fill required fields.' : '필수 항목을 입력해주세요.'); return; }
  var entry = { type:'tkt', cat:cat, name:name, price:'', incSale:incSale, incSaleType:incType, incDed:'' };
  if (psetSpecEditIdx >= 0) { psetSpecData[psetSpecEditIdx] = entry; } else { psetSpecData.push(entry); }
  psetRenderSpecTable();
  psetCloseSpecTkt();
}

// 정액권 급여 등록 모달
function psetOpenSpecPpModal() {
  var itemSel = document.getElementById('psetSpecPpItem');
  itemSel.innerHTML = '<option value=""></option>';
  ppCardData.forEach(function(pp) {
    itemSel.innerHTML += '<option value="' + pp.name + '" data-price="' + pp.price + '">' + pp.name + '</option>';
  });
  document.getElementById('psetSpecPpPrice').value = '';
  document.getElementById('psetSpecPpIncSale').value = '';
  document.querySelector('input[name="psetSpecPpIncType"][value="percent"]').checked = true;
  document.getElementById('psetSpecPpModal').classList.add('show');
}
function psetCloseSpecPp() { document.getElementById('psetSpecPpModal').classList.remove('show'); psetResetSpecModalMode('pp'); }
function psetSpecPpItemChange() {
  var sel = document.getElementById('psetSpecPpItem');
  var opt = sel.options[sel.selectedIndex];
  var price = opt ? opt.getAttribute('data-price') : '';
  document.getElementById('psetSpecPpPrice').value = price ? Number(price).toLocaleString() : '';
}
function psetSaveSpecPp() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var name = document.getElementById('psetSpecPpItem').value;
  var price = document.getElementById('psetSpecPpPrice').value.replace(/,/g, '');
  var incSale = document.getElementById('psetSpecPpIncSale').value.trim();
  var incType = document.querySelector('input[name="psetSpecPpIncType"]:checked').value;
  if (!name || !incSale) { alert(isEn ? 'Please fill required fields.' : '필수 항목을 입력해주세요.'); return; }
  var entry = { type:'pp', cat:'', name:name, price:price, incSale:incSale, incSaleType:incType, incDed:'' };
  if (psetSpecEditIdx >= 0) { psetSpecData[psetSpecEditIdx] = entry; } else { psetSpecData.push(entry); }
  psetRenderSpecTable();
  psetCloseSpecPp();
}

// ── 항목명 수정 ──
var payEditItemTarget = null;
function payEditItem(btn) {
  payEditItemTarget = btn.closest('tr').querySelector('td:nth-child(2)');
  document.getElementById('payEditItemInput').value = payEditItemTarget.textContent;
  document.getElementById('payEditItemModal').classList.add('show');
}
function payCloseEditItem() { document.getElementById('payEditItemModal').classList.remove('show'); }
function paySaveEditItem() {
  var val = document.getElementById('payEditItemInput').value.trim();
  if (val && payEditItemTarget) payEditItemTarget.textContent = val;
  payCloseEditItem();
}

// ── 급여 명세서 보기 ──
function payGetRecordByBtn(btn) {
  var row = btn.closest('tr');
  var id = parseInt(row.getAttribute('data-payslip-id'));
  for (var i = 0; i < paySlipStore.length; i++) {
    if (paySlipStore[i].id === id) return { record: paySlipStore[i], index: i, row: row };
  }
  return null;
}
function payOpenViewModal(btn) {
  var found = payGetRecordByBtn(btn);
  var row = btn.closest('tr');
  var cells = row.querySelectorAll('td');
  var staff = cells[1].textContent;
  var period = cells[2].textContent;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  document.getElementById('payViewHeading').textContent = isEn ? 'Payslip (' + staff + ')' : '급여 명세서 (' + staff + ' 님)';
  document.getElementById('payViewPeriod').textContent = (isEn ? 'Work Period: ' : '근무 기간: ') + period;
  // 저장된 데이터 표시
  var html = '';
  if (found && found.record) {
    var rec = found.record;
    var maxLen = Math.max(rec.payItems.length, rec.dedItems.length);
    for (var i = 0; i < maxLen; i++) {
      var payLabel = i < rec.payItems.length ? rec.payItems[i].label : '';
      var payAmt = i < rec.payItems.length && rec.payItems[i].amount ? rec.payItems[i].amount.toLocaleString() : '';
      var dedLabel = i < rec.dedItems.length ? rec.dedItems[i].label : '';
      var dedAmt = i < rec.dedItems.length && rec.dedItems[i].amount ? rec.dedItems[i].amount.toLocaleString() : '';
      html += '<tr><td>' + payLabel + '</td><td>' + payAmt + '</td><td>' + dedLabel + '</td><td>' + dedAmt + '</td></tr>';
    }
    html += '<tr class="pay-total-row"><td><strong>' + (isEn ? 'Total Pay' : '급여 합계') + '</strong></td><td><strong>' + rec.totalPay.toLocaleString() + '</strong></td><td><strong>' + (isEn ? 'Total Ded.' : '공제 합계') + '</strong></td><td><strong>' + rec.totalDed.toLocaleString() + '</strong></td></tr>';
    var netPay = rec.totalPay - rec.totalDed;
    document.getElementById('payViewNetPay').textContent = netPay.toLocaleString();
    document.getElementById('payViewAdvance').textContent = rec.advance ? rec.advance.toLocaleString() : '0';
    document.getElementById('payViewFinalPay').textContent = (netPay - rec.advance).toLocaleString();
    // 현재 보고 있는 record id 저장 (수정/삭제 용)
    document.getElementById('payViewModal').setAttribute('data-payslip-id', rec.id);
  } else {
    // fallback: 데이터 없는 경우
    var items = ['기본급','인센티브','식대','직책 수당','자격 수당','초과 근무 수당','휴일 근무 수당','연차 수당','기타 수당1','기타 수당2','기타 수당3'];
    var deds = ['제품 사용','지각','조퇴','결근','근로 소득세','주민세','건강보험','국민연금','고용보험','산재보험','기타 공제1'];
    for (var j = 0; j < items.length; j++) {
      html += '<tr><td>' + items[j] + '</td><td></td><td>' + deds[j] + '</td><td></td></tr>';
    }
    html += '<tr class="pay-total-row"><td><strong>급여 합계</strong></td><td></td><td><strong>공제 합계</strong></td><td></td></tr>';
    document.getElementById('payViewNetPay').textContent = '0';
    document.getElementById('payViewAdvance').textContent = '0';
    document.getElementById('payViewFinalPay').textContent = '0';
  }
  document.getElementById('payViewSalaryBody').innerHTML = html;
  document.getElementById('payViewModal').classList.add('show');
}
function payCloseView() { document.getElementById('payViewModal').classList.remove('show'); if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang(); }
function payPrintView() { window.print(); }
function payEditFromView() {
  var payslipId = parseInt(document.getElementById('payViewModal').getAttribute('data-payslip-id'));
  var rec = null;
  for (var i = 0; i < paySlipStore.length; i++) {
    if (paySlipStore[i].id === payslipId) { rec = paySlipStore[i]; break; }
  }
  if (!rec) { payCloseView(); return; }
  // 기간/직원 세팅
  document.getElementById('payEditFrom').value = rec.from;
  document.getElementById('payEditTo').value = rec.to;
  var sel = document.getElementById('payEditStaff');
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].text === rec.staff || sel.options[i].value === rec.staff) {
      sel.selectedIndex = i; break;
    }
  }
  // 소득 구분 세팅
  document.getElementById('payEditIncomeType').value = rec.incomeType || 'biz';
  payEditIncomeTypeChange();
  // 급여 항목 값 세팅
  var rows = document.querySelectorAll('#payEditSalaryBody tr:not(.pay-total-row)');
  rows.forEach(function(row, idx) {
    var payInput = row.querySelector('td:nth-child(2) input');
    var dedInput = row.querySelector('td:nth-child(4) input');
    if (payInput) {
      payInput.value = (idx < rec.payItems.length && rec.payItems[idx].amount) ? rec.payItems[idx].amount.toLocaleString() : '';
    }
    if (dedInput) {
      dedInput.value = (idx < rec.dedItems.length && rec.dedItems[idx].amount) ? rec.dedItems[idx].amount.toLocaleString() : '';
    }
  });
  // 가지급금 세팅
  document.getElementById('payEditAdvance').value = rec.advance ? rec.advance.toLocaleString() : '';
  payEditCalcTotals();
  // 수정 중인 record id 저장
  document.getElementById('payEditModal').setAttribute('data-payslip-id', rec.id);
  payCloseView();
  document.getElementById('payEditModal').classList.add('show');
}
function payCloseEdit() { document.getElementById('payEditModal').classList.remove('show'); if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang(); }
function paySaveEdit() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var payslipId = parseInt(document.getElementById('payEditModal').getAttribute('data-payslip-id'));
  var rec = null, recIdx = -1;
  for (var i = 0; i < paySlipStore.length; i++) {
    if (paySlipStore[i].id === payslipId) { rec = paySlipStore[i]; recIdx = i; break; }
  }
  if (!rec) { alert(isEn ? 'Payslip not found.' : '명세서를 찾을 수 없습니다.'); return; }
  // 수정된 데이터 수집
  rec.from = document.getElementById('payEditFrom').value;
  rec.to = document.getElementById('payEditTo').value;
  rec.staff = document.getElementById('payEditStaff').value;
  rec.incomeType = document.getElementById('payEditIncomeType').value;
  var rows = document.querySelectorAll('#payEditSalaryBody tr:not(.pay-total-row)');
  var payItems = [], dedItems = [];
  rows.forEach(function(row) {
    var payLabel = row.querySelector('td:nth-child(1)').textContent.trim();
    var payInput = row.querySelector('td:nth-child(2) input');
    var dedLabel = row.querySelector('td:nth-child(3)').textContent.trim();
    var dedInput = row.querySelector('td:nth-child(4) input');
    var payVal = payInput ? parseInt((payInput.value || '0').replace(/[^0-9]/g, '')) || 0 : 0;
    var dedVal = dedInput ? parseInt((dedInput.value || '0').replace(/[^0-9]/g, '')) || 0 : 0;
    payItems.push({ label: payLabel, amount: payVal });
    dedItems.push({ label: dedLabel, amount: dedVal });
  });
  rec.payItems = payItems;
  rec.dedItems = dedItems;
  rec.advance = parseInt((document.getElementById('payEditAdvance').value || '0').replace(/[^0-9]/g, '')) || 0;
  var totalPay = 0, totalDed = 0;
  payItems.forEach(function(item) { totalPay += item.amount; });
  dedItems.forEach(function(item) { totalDed += item.amount; });
  rec.totalPay = totalPay;
  rec.totalDed = totalDed;
  // 메인 테이블 행 갱신
  var tr = document.querySelector('#payTableBody tr[data-payslip-id="' + payslipId + '"]');
  if (tr) {
    var cells = tr.querySelectorAll('td');
    cells[1].textContent = rec.staff;
    cells[2].textContent = rec.from + ' ~ ' + rec.to;
    cells[3].textContent = totalPay.toLocaleString();
  }
  // 요약 갱신
  var allTotal = 0;
  paySlipStore.forEach(function(r) { allTotal += r.totalPay; });
  var count = document.querySelectorAll('#payTableBody tr').length;
  document.getElementById('paySummary').textContent = isEn
    ? 'Total ' + count + ' records, Total salary ' + allTotal.toLocaleString()
    : '총 ' + count + ' 건, 총 급여 ' + allTotal.toLocaleString();
  alert(isEn ? 'Payslip saved.' : '급여 명세서가 저장되었습니다.');
  payCloseEdit();
}

// 소득 구분 변경 시 공제 항목 동적 변경
var payEditDedMap = {
  biz: [
    {key:'product', ko:'제품 사용', en:'Product Use'},
    {key:'late', ko:'지각', en:'Tardiness'},
    {key:'early', ko:'조퇴', en:'Early Leave'},
    {key:'absent', ko:'결근', en:'Absence'},
    {key:'other1', ko:'기타 공제1', en:'Other Deduction 1'},
    {key:'biz_tax', ko:'사업 소득세 자동 계산', en:'Business Income Tax'}
  ],
  earned: [
    {key:'product', ko:'제품 사용', en:'Product Use'},
    {key:'late', ko:'지각', en:'Tardiness'},
    {key:'early', ko:'조퇴', en:'Early Leave'},
    {key:'absent', ko:'결근', en:'Absence'},
    {key:'income_tax', ko:'근로 소득세', en:'Income Tax'},
    {key:'resident', ko:'주민세', en:'Resident Tax'},
    {key:'health', ko:'건강보험', en:'Health Insurance'},
    {key:'pension', ko:'국민연금', en:'National Pension'},
    {key:'employ', ko:'고용보험', en:'Employment Insurance'},
    {key:'industrial', ko:'산재보험', en:'Industrial Accident Insurance'},
    {key:'other1', ko:'기타 공제1', en:'Other Deduction 1'}
  ],
  other: [
    {key:'product', ko:'제품 사용', en:'Product Use'},
    {key:'late', ko:'지각', en:'Tardiness'},
    {key:'early', ko:'조퇴', en:'Early Leave'},
    {key:'absent', ko:'결근', en:'Absence'},
    {key:'other1', ko:'기타 공제1', en:'Other Deduction 1'}
  ]
};
function payEditIncomeTypeChange() {
  var type = document.getElementById('payEditIncomeType').value;
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var deds = payEditDedMap[type] || payEditDedMap.biz;
  var rows = document.querySelectorAll('#payEditSalaryBody tr:not(.pay-total-row)');
  rows.forEach(function(row, i) {
    var dedTd = row.querySelector('td:nth-child(3)');
    var dedInput = row.querySelector('td:nth-child(4)');
    if (!dedTd || !dedInput) return;
    if (i < deds.length) {
      dedTd.textContent = isEn ? deds[i].en : deds[i].ko;
      dedTd.setAttribute('data-ded', deds[i].key);
      if (!dedInput.querySelector('input')) {
        dedInput.innerHTML = '<input type="text" class="pay-amt-input">';
      }
    } else {
      dedTd.textContent = '';
      dedTd.setAttribute('data-ded', 'none');
      dedInput.innerHTML = '';
    }
  });
}

// 작성 모달 합계 자동 계산
function payCreateCalcTotals() {
  var rows = document.querySelectorAll('#payCreateContent .pay-salary-table tbody tr:not(.pay-total-row)');
  var totalPay = 0, totalDed = 0;
  rows.forEach(function(row) {
    var payInput = row.querySelector('td:nth-child(2) input');
    var dedInput = row.querySelector('td:nth-child(4) input');
    if (payInput && payInput.value) totalPay += parseInt(payInput.value.replace(/[^0-9]/g, '')) || 0;
    if (dedInput && dedInput.value) totalDed += parseInt(dedInput.value.replace(/[^0-9]/g, '')) || 0;
  });
  var el = document.getElementById('payTotalPay');
  if (el) el.innerHTML = '<strong>' + totalPay.toLocaleString() + '</strong>';
  var el2 = document.getElementById('payTotalDed');
  if (el2) el2.innerHTML = '<strong>' + totalDed.toLocaleString() + '</strong>';
  var net = totalPay - totalDed;
  var el3 = document.getElementById('payNetPay');
  if (el3) el3.textContent = net.toLocaleString();
  var advance = parseInt((document.getElementById('payAdvance').value || '0').replace(/[^0-9]/g, '')) || 0;
  var el4 = document.getElementById('payFinalPay');
  if (el4) el4.textContent = (net - advance).toLocaleString();
}

// 수정 모달 합계 자동 계산
function payEditCalcTotals() {
  var rows = document.querySelectorAll('#payEditSalaryBody tr:not(.pay-total-row)');
  var totalPay = 0, totalDed = 0;
  rows.forEach(function(row) {
    var payInput = row.querySelector('td:nth-child(2) input');
    var dedInput = row.querySelector('td:nth-child(4) input');
    if (payInput && payInput.value) totalPay += parseInt(payInput.value.replace(/[^0-9]/g, '')) || 0;
    if (dedInput && dedInput.value) totalDed += parseInt(dedInput.value.replace(/[^0-9]/g, '')) || 0;
  });
  document.getElementById('payEditTotalPay').innerHTML = '<strong>' + totalPay.toLocaleString() + '</strong>';
  document.getElementById('payEditTotalDed').innerHTML = '<strong>' + totalDed.toLocaleString() + '</strong>';
  var net = totalPay - totalDed;
  document.getElementById('payEditNetPay').textContent = net.toLocaleString();
  var advance = parseInt((document.getElementById('payEditAdvance').value || '0').replace(/[^0-9]/g, '')) || 0;
  document.getElementById('payEditFinalPay').textContent = (net - advance).toLocaleString();
}
document.addEventListener('DOMContentLoaded', function() {
  // 작성 모달 합계 리스너
  var createContent = document.getElementById('payCreateContent');
  if (createContent) {
    createContent.addEventListener('input', function(e) {
      if (e.target.classList.contains('pay-amt-input')) payCreateCalcTotals();
    });
  }
  var createAdv = document.getElementById('payAdvance');
  if (createAdv) createAdv.addEventListener('input', function() { payCreateCalcTotals(); });
  // 수정 모달 합계 리스너
  var editTable = document.getElementById('payEditSalaryTable');
  if (editTable) {
    editTable.addEventListener('input', function(e) {
      if (e.target.classList.contains('pay-amt-input')) payEditCalcTotals();
    });
  }
  var advInput = document.getElementById('payEditAdvance');
  if (advInput) advInput.addEventListener('input', function() { payEditCalcTotals(); });
});

// ── 삭제 ──
function payDeletePayslip() { document.getElementById('payDeleteConfirm').classList.add('show'); }
function payCloseDeleteConfirm() { document.getElementById('payDeleteConfirm').classList.remove('show'); }
function payConfirmDelete() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var payslipId = parseInt(document.getElementById('payViewModal').getAttribute('data-payslip-id'));
  // store 에서 제거
  paySlipStore = paySlipStore.filter(function(r) { return r.id !== payslipId; });
  // 테이블 행 제거
  var tr = document.querySelector('#payTableBody tr[data-payslip-id="' + payslipId + '"]');
  if (tr) tr.remove();
  // 빈 상태 체크
  var tbody = document.getElementById('payTableBody');
  if (!tbody.querySelectorAll('tr').length) {
    var emptyTr = document.createElement('tr');
    emptyTr.innerHTML = '<td colspan="6" class="pay-empty">' + (isEn ? 'No records.' : '내역이 없습니다.') + '</td>';
    tbody.appendChild(emptyTr);
  }
  // 요약 갱신
  var allTotal = 0;
  paySlipStore.forEach(function(r) { allTotal += r.totalPay; });
  var count = paySlipStore.length;
  document.getElementById('paySummary').textContent = isEn
    ? 'Total ' + count + ' records, Total salary ' + allTotal.toLocaleString()
    : '총 ' + count + ' 건, 총 급여 ' + allTotal.toLocaleString();
  alert(isEn ? 'Deleted.' : '삭제되었습니다.');
  payCloseDeleteConfirm();
  payCloseView();
}

// ── 인센티브 내역 ──
function payOpenIncDetail() { document.getElementById('payIncDetailModal').classList.add('show'); }
function payCloseIncDetail() { document.getElementById('payIncDetailModal').classList.remove('show'); if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang(); }
function payIncSwitchTab(idx) {
  document.querySelectorAll('.pay-inc-tab').forEach(function(t, i) { t.classList.toggle('active', i === idx); });
  document.querySelectorAll('.pay-inc-panel').forEach(function(p, i) { p.style.display = i === idx ? '' : 'none'; });
}

// ── 근무기간 시작일 → 종료일 자동 설정 ──
document.addEventListener('DOMContentLoaded', function() {
  var fromInput = document.getElementById('payCreateFrom');
  if (fromInput) {
    fromInput.addEventListener('change', function() {
      if (!this.value) return;
      var d = new Date(this.value);
      var year = d.getFullYear();
      var month = d.getMonth(); // 0-based
      var today = new Date();
      var lastDay = new Date(year, month + 1, 0); // 해당 월 마지막 날
      // 시작월이 이번 달이면 오늘 날짜, 아니면 해당 월 마지막 날
      var endDate;
      if (year === today.getFullYear() && month === today.getMonth()) {
        endDate = today < lastDay ? today : lastDay;
      } else {
        endDate = lastDay;
      }
      var ey = endDate.getFullYear();
      var em = String(endDate.getMonth() + 1).padStart(2, '0');
      var ed = String(endDate.getDate()).padStart(2, '0');
      document.getElementById('payCreateTo').value = ey + '-' + em + '-' + ed;
    });
  }
});

// ── 급여 금액 입력: 숫자만 + 천단위 콤마 ──
function payFormatAmount(e) {
  var raw = e.target.value.replace(/[^0-9]/g, '');
  e.target.value = raw ? Number(raw).toLocaleString() : '';
}

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('pay-amt-input')) {
      payFormatAmount(e);
    }
  });
});

// ══ [FEAT-PAYROLL] END ══

// ══════════════════════════════════════════════════════════════
// ══ [FEAT-TIMECLOCK] 출퇴근 관리 ══
// ══════════════════════════════════════════════════════════════

var tcClockTimer = null;

// ── 출퇴근 샘플 데이터 (2026-03-01 ~ 2026-03-31) ──
var tcSampleData = (function() {
  var records = [];
  var staffList = [
    { name: '원장님', nameEn: 'Director' },
    { name: '수진', nameEn: 'Sujin' },
    { name: '지훈', nameEn: 'Jihoon' }
  ];
  // 근무 시간 패턴
  var schedules = {
    '원장님': { inH: 9, inM: 0, outH: 18, outM: 30 },
    '수진':   { inH: 9, inM: 0, outH: 18, outM: 0 },
    '지훈':   { inH: 10, inM: 0, outH: 19, outM: 0 }
  };
  // 변동 패턴 (분 단위 오차)
  var variations = [0, -3, 2, 5, -1, 8, -2, 1, 4, -5, 3, 6, -4, 0, 7, 2, -3, 1, -1, 5, 3, -2, 4, 0, -6, 2, 8, -3, 1, 6, -1];

  for (var d = 1; d <= 31; d++) {
    var dateStr = '2026-03-' + String(d).padStart(2, '0');
    var dayOfWeek = new Date(2026, 2, d).getDay(); // 0=Sun
    if (dayOfWeek === 0) continue; // 일요일 제외

    for (var s = 0; s < staffList.length; s++) {
      var staff = staffList[s];
      var sch = schedules[staff.name];
      var v = variations[(d + s * 7) % variations.length];

      // 결근 패턴: 지훈 3/12, 수진 3/24
      if (staff.name === '지훈' && d === 12) {
        records.push({ date: dateStr, staff: staff.name, staffEn: staff.nameEn, inTime: '', outTime: '', workHours: '', absent: 'Y', ip: '', memo: '', tardy: false, leaveEarly: false });
        continue;
      }
      if (staff.name === '수진' && d === 24) {
        records.push({ date: dateStr, staff: staff.name, staffEn: staff.nameEn, inTime: '', outTime: '', workHours: '', absent: 'Y', ip: '', memo: '', tardy: false, leaveEarly: false });
        continue;
      }

      // 퇴근 미등록 패턴: 3/3 원장님, 3/3 지훈, 3/10 수진
      if ((staff.name === '원장님' && d === 3) || (staff.name === '지훈' && d === 3) || (staff.name === '수진' && d === 10)) {
        var inH2 = sch.inH;
        var inM2 = sch.inM + v;
        if (inM2 < 0) { inM2 += 60; inH2 -= 1; }
        if (inM2 >= 60) { inM2 -= 60; inH2 += 1; }
        var inTimeStr2 = String(inH2).padStart(2, '0') + ':' + String(inM2).padStart(2, '0');
        var tardy2 = (inH2 * 60 + inM2) > (sch.inH * 60 + sch.inM);
        records.push({ date: dateStr, staff: staff.name, staffEn: staff.nameEn, inTime: inTimeStr2, outTime: '', workHours: '', absent: '', ip: '192.168.1.100', memo: '', tardy: tardy2, leaveEarly: false });
        continue;
      }

      var inH = sch.inH;
      var inM = sch.inM + v;
      if (inM < 0) { inM += 60; inH -= 1; }
      if (inM >= 60) { inM -= 60; inH += 1; }

      var outH = sch.outH;
      var outM = sch.outM + v;
      if (outM < 0) { outM += 60; outH -= 1; }
      if (outM >= 60) { outM -= 60; outH += 1; }

      // 조퇴 패턴: 원장님 3/7 (16시 퇴근), 지훈 3/20 (17시 퇴근)
      if (staff.name === '원장님' && d === 7) { outH = 16; outM = 0; }
      if (staff.name === '지훈' && d === 20) { outH = 17; outM = 0; }

      var inTimeStr = String(inH).padStart(2, '0') + ':' + String(inM).padStart(2, '0');
      var outTimeStr = String(outH).padStart(2, '0') + ':' + String(outM).padStart(2, '0');

      // 근무 시간 계산
      var totalMin = (outH * 60 + outM) - (inH * 60 + inM);
      var wH = Math.floor(totalMin / 60);
      var wM = totalMin % 60;
      var workHoursStr = wH + '시간 ' + wM + '분';

      // 지각 판정: 출근 시각 > 기준 출근
      var tardy = (inH * 60 + inM) > (sch.inH * 60 + sch.inM);
      // 조퇴 판정: 퇴근 시각 < 기준 퇴근
      var leaveEarly = (outH * 60 + outM) < (sch.outH * 60 + sch.outM);

      records.push({
        date: dateStr, staff: staff.name, staffEn: staff.nameEn,
        inTime: inTimeStr, outTime: outTimeStr, workHours: workHoursStr,
        absent: '', ip: '192.168.1.100', memo: '',
        tardy: tardy, leaveEarly: leaveEarly
      });
    }
  }
  return records;
})();

// ── 출퇴근 테이블 렌더링 ──
var tcCurrentPage = 1;
var tcPageSize = 10;
var tcFilteredData = [];

function tcRenderTable(dateFilter) {
  var tbody = document.getElementById('tcTableBody');
  if (!tbody) return;
  var staffVal = document.getElementById('tcStaffSelect') ? document.getElementById('tcStaffSelect').value : 'all';
  var statusVal = document.getElementById('tcStatusSelect') ? document.getElementById('tcStatusSelect').value : 'all';

  tcFilteredData = tcSampleData.filter(function(r) {
    if (dateFilter && r.date !== dateFilter) return false;
    if (staffVal !== 'all' && r.staff !== staffVal) return false;
    if (statusVal === 'tardy' && !r.tardy) return false;
    if (statusVal === 'leaveEarly' && !r.leaveEarly) return false;
    if (statusVal === 'absent' && r.absent !== 'Y') return false;
    return true;
  });

  if (tcFilteredData.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    tbody.innerHTML = '<tr class="tc-empty-row"><td colspan="9" data-i18n="common.noData" data-ko="내역이 없습니다" data-en="No data for table">' + (isEn ? 'No data for table' : '내역이 없습니다') + '</td></tr>';
    tcRenderPagination(0);
    return;
  }

  var totalPages = Math.ceil(tcFilteredData.length / tcPageSize);
  if (tcCurrentPage > totalPages) tcCurrentPage = totalPages;
  var start = (tcCurrentPage - 1) * tcPageSize;
  var pageData = tcFilteredData.slice(start, start + tcPageSize);

  var html = '';
  pageData.forEach(function(r) {
    html += tcBuildRow(r);
  });
  tbody.innerHTML = html;
  tcRenderPagination(tcFilteredData.length);
}

function tcRenderPagination(total) {
  var wrap = document.getElementById('tcPaginationWrap');
  if (!wrap) return;
  if (total <= tcPageSize) { wrap.innerHTML = ''; return; }
  var totalPages = Math.ceil(total / tcPageSize);
  var html = '<div class="tc-pagination">';
  html += '<button class="tc-page-btn" onclick="tcGoPage(' + Math.max(1, tcCurrentPage - 1) + ')" ' + (tcCurrentPage <= 1 ? 'disabled' : '') + '>&laquo;</button>';
  for (var p = 1; p <= totalPages; p++) {
    html += '<button class="tc-page-btn' + (p === tcCurrentPage ? ' tc-page-active' : '') + '" onclick="tcGoPage(' + p + ')">' + p + '</button>';
  }
  html += '<button class="tc-page-btn" onclick="tcGoPage(' + Math.min(totalPages, tcCurrentPage + 1) + ')" ' + (tcCurrentPage >= totalPages ? 'disabled' : '') + '>&raquo;</button>';
  html += '</div>';
  wrap.innerHTML = html;
}

function tcGoPage(page) {
  tcCurrentPage = page;
  var type = document.querySelector('input[name="tcPeriodType"]:checked');
  if (type && type.value === 'monthly') {
    tcRenderTableByMonth(document.getElementById('tcMonthDate').value);
  } else if (type && type.value === 'range') {
    tcRenderTableByRange(document.getElementById('tcStartDate').value, document.getElementById('tcEndDate').value);
  } else {
    var dateInput = document.getElementById('tcDailyDate');
    tcRenderTable(dateInput ? dateInput.value : null);
  }
}

// ── 행 HTML 공통 생성 ──
function tcBuildRow(r) {
  var idx = tcSampleData.indexOf(r);
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var row = '<tr>';
  row += '<td>' + r.date + '</td>';
  row += '<td>' + r.staff + '</td>';
  row += '<td>' + r.inTime;
  if (r.tardy) row += ' <span style="color:#F06060;font-weight:600;font-size:11px;">(' + (isEn ? 'Tardy' : '지각') + ')</span>';
  row += '</td>';

  // 퇴근 시각: 없으면 "등록" 버튼 표시
  if (r.inTime && !r.outTime && r.absent !== 'Y') {
    row += '<td><button class="stf-link-btn tc-add-out-btn" onclick="tcOpenClockOutForRow(' + idx + ')" data-i18n="tc.btnAdd" data-ko="등록" data-en="Add">' + (isEn ? 'Add' : '등록') + '</button></td>';
  } else {
    row += '<td>' + r.outTime;
    if (r.leaveEarly) row += ' <span style="color:#F06060;font-weight:600;font-size:11px;">(' + (isEn ? 'Leave Early' : '조퇴') + ')</span>';
    row += '</td>';
  }

  // 근무시간: 영문 모드시 "Xh Ym" 형식
  var whDisplay = r.workHours;
  if (isEn && whDisplay) {
    whDisplay = whDisplay.replace(/(\d+)시간\s*/, '$1h ').replace(/(\d+)분/, '$1m');
  }
  row += '<td>' + whDisplay + '</td>';
  row += '<td>' + r.absent + '</td>';
  row += '<td>' + r.ip + '</td>';
  row += '<td>' + r.memo + '</td>';
  row += '<td><button class="stf-link-btn" onclick="tcOpenEditModal(' + idx + ')" data-i18n="tc.btnEdit" data-ko="수정" data-en="Edit">' + (isEn ? 'Edit' : '수정') + '</button></td>';
  row += '</tr>';
  return row;
}

// ── 행에서 퇴근 등록 모달 열기 (직원 자동 선택) ──
function tcOpenClockOutForRow(idx) {
  var r = tcSampleData[idx];
  if (!r) return;
  document.getElementById('tcClockOutModal').classList.add('tc-show');
  tcUpdateClockTime('tcClockOutTime');
  tcClockTimer = setInterval(function() { tcUpdateClockTime('tcClockOutTime'); }, 1000);
  // 직원 자동 선택
  var sel = document.getElementById('tcClockOutStaff');
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].text === r.staff) { sel.selectedIndex = i; break; }
  }
  // 저장 시 해당 레코드 업데이트하도록 인덱스 저장
  sel.dataset.rowIdx = idx;
}

// ── 출퇴근 수정 모달 ──
var tcEditingIdx = -1;

function tcOpenEditModal(idx) {
  tcEditingIdx = idx;
  var r = tcSampleData[idx];
  if (!r) return;

  document.getElementById('tcEditDate').value = r.date;
  document.getElementById('tcEditStaffName').textContent = r.staff;
  document.getElementById('tcEditTardy').checked = r.tardy || false;
  document.getElementById('tcEditLeaveEarly').checked = r.leaveEarly || false;

  // 출근 시간 셀렉트 (0~23)
  tcPopulateHourSelect('tcEditInHour', 0, 23, r.inTime ? parseInt(r.inTime.split(':')[0]) : '');
  tcPopulateMinSelect('tcEditInMin', r.inTime ? parseInt(r.inTime.split(':')[1]) : '');

  // 퇴근 시간 셀렉트 (0~23 + 다음날 00~11)
  tcPopulateHourSelectNextDay('tcEditOutHour', r.outTime ? parseInt(r.outTime.split(':')[0]) : '');
  tcPopulateMinSelect('tcEditOutMin', r.outTime ? parseInt(r.outTime.split(':')[1]) : '');

  document.getElementById('tcEditModal').classList.add('tc-show');
}

function tcCloseEditModal() {
  document.getElementById('tcEditModal').classList.remove('tc-show');
  tcEditingIdx = -1;
}

function tcSaveEdit() {
  if (tcEditingIdx < 0) return;
  var r = tcSampleData[tcEditingIdx];

  var inH = document.getElementById('tcEditInHour').value;
  var inM = document.getElementById('tcEditInMin').value;
  var outH = document.getElementById('tcEditOutHour').value;
  var outM = document.getElementById('tcEditOutMin').value;

  // 출근 시간
  if (inH !== '' && inM !== '') {
    r.inTime = String(inH).padStart(2, '0') + ':' + String(inM).padStart(2, '0');
  }

  // 퇴근 시간
  if (outH !== '' && outM !== '') {
    var oh = parseInt(outH);
    var om = parseInt(outM);
    var ih = parseInt(inH);
    var im = parseInt(inM);
    var outTotal = oh * 60 + om;
    var inTotal = ih * 60 + im;

    // 퇴근 <= 출근 검증 (익일이 아닌 경우)
    if (oh < 24 && outTotal <= inTotal) {
      alert('퇴근 시간은 출근 시간보다 나중이어야 합니다.');
      return;
    }

    var displayH = oh > 23 ? oh - 24 : oh;
    r.outTime = String(displayH).padStart(2, '0') + ':' + String(om).padStart(2, '0');

    // 근무 시간 계산
    if (oh > 23) outTotal = (oh - 24) * 60 + om + 24 * 60;
    if (outTotal <= inTotal) outTotal += 24 * 60;
    var diff = outTotal - inTotal;
    r.workHours = Math.floor(diff / 60) + '시간 ' + (diff % 60) + '분';
  }

  r.date = document.getElementById('tcEditDate').value;
  r.tardy = document.getElementById('tcEditTardy').checked;
  r.leaveEarly = document.getElementById('tcEditLeaveEarly').checked;

  tcCloseEditModal();
  tcSearch();
}

function tcDeleteRecord() {
  if (tcEditingIdx < 0) return;
  if (!confirm('정말 삭제하시겠습니까?')) return;
  tcSampleData.splice(tcEditingIdx, 1);
  tcCloseEditModal();
  tcSearch();
}

// ── 시간 셀렉트 생성 헬퍼 ──
function tcPopulateHourSelect(id, min, max, selectedVal) {
  var sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Select</option>';
  for (var h = min; h <= max; h++) {
    var opt = document.createElement('option');
    opt.value = h;
    opt.textContent = String(h).padStart(2, '0');
    if (selectedVal !== '' && parseInt(selectedVal) === h) opt.selected = true;
    sel.appendChild(opt);
  }
}

function tcPopulateHourSelectNextDay(id, selectedVal) {
  var sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Select</option>';
  for (var h = 0; h <= 36; h++) {
    var opt = document.createElement('option');
    opt.value = h;
    if (h <= 23) {
      opt.textContent = String(h).padStart(2, '0');
    } else {
      opt.textContent = '+1일 ' + String(h - 24).padStart(2, '0');
    }
    if (selectedVal !== '' && parseInt(selectedVal) === h) opt.selected = true;
    sel.appendChild(opt);
  }
}

function tcPopulateMinSelect(id, selectedVal) {
  var sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Select</option>';
  for (var m = 0; m <= 59; m++) {
    var opt = document.createElement('option');
    opt.value = m;
    opt.textContent = String(m).padStart(2, '0');
    if (selectedVal !== '' && parseInt(selectedVal) === m) opt.selected = true;
    sel.appendChild(opt);
  }
}

function openTimeClock() {
  freezeGnb();
  hideAllViews();
  document.getElementById('timeClockView').classList.add('show');
  tcShowManage();
  // 기본 날짜로 테이블 렌더링
  var dateInput = document.getElementById('tcDailyDate');
  if (dateInput) tcRenderTable(dateInput.value);
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// ── 서브뷰 전환 ──
function tcShowManage() {
  document.getElementById('tcSummaryView').style.display = 'none';
  document.getElementById('tcWorkHoursView').style.display = 'none';
  document.getElementById('tcManageView').style.display = 'flex';
  tcSearch();
}
function tcOpenSumDetail(staffName) {
  // 해당 직원으로 필터 설정 후 출퇴근 관리 화면 전환
  var sel = document.getElementById('tcStaffSelect');
  if (sel) {
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text === staffName || sel.options[i].value === staffName) {
        sel.selectedIndex = i;
        break;
      }
    }
  }
  tcShowManage();
}

function tcShowSummary() {
  document.getElementById('tcManageView').style.display = 'none';
  document.getElementById('tcWorkHoursView').style.display = 'none';
  document.getElementById('tcSummaryView').style.display = 'flex';
}
function tcShowWorkHours() {
  document.getElementById('tcManageView').style.display = 'none';
  document.getElementById('tcSummaryView').style.display = 'none';
  document.getElementById('tcWorkHoursView').style.display = 'flex';
}

// ── 근무 시간 설정 데이터 ──
var tcWhData = {
  0: [
    { start: '09:00', finish: '18:30', days: '월, 화, 수, 목, 금, 토' },
    { start: '09:00', finish: '14:00', days: '일' }
  ],
  1: [
    { start: '09:00', finish: '18:00', days: '월, 화, 수, 목, 금' }
  ],
  2: []
};
var tcWhEditingStaff = -1;
var tcWhEditingIdx = -1;

function tcOpenWhSetupModal(staffIdx) {
  tcWhEditingStaff = staffIdx;
  tcRenderWhSetup();
  document.getElementById('tcWhSetupModal').classList.add('tc-show');
}
function tcCloseWhSetupModal() {
  document.getElementById('tcWhSetupModal').classList.remove('tc-show');
}

function tcRenderWhSetup() {
  var tbody = document.getElementById('tcWhSetupBody');
  var schedules = tcWhData[tcWhEditingStaff] || [];
  if (schedules.length === 0) {
    tbody.innerHTML = '<tr class="tc-empty-row"><td colspan="4">내역이 없습니다</td></tr>';
    return;
  }
  var html = '';
  schedules.forEach(function(sch, idx) {
    html += '<tr>';
    html += '<td>' + sch.start + '</td>';
    html += '<td>' + sch.finish + '</td>';
    html += '<td>' + sch.days + '</td>';
    html += '<td>';
    html += '<button class="stf-link-btn" onclick="tcEditWhEntry(' + idx + ')" style="margin-right:4px;">수정</button>';
    html += '<button class="stf-link-btn stf-danger" onclick="tcDeleteWhEntry(' + idx + ')">삭제</button>';
    html += '</td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

function tcOpenWhRegisterModal(staffIdx) {
  tcWhEditingStaff = staffIdx;
  tcWhEditingIdx = -1;
  tcPopulateWhTimeOptions('tcWhStartTime', false);
  tcPopulateWhTimeOptions('tcWhFinishTime', true);
  tcWhResetDayChecks();
  document.getElementById('tcWhAddModal').classList.add('tc-show');
}

function tcOpenWhAddModal() {
  tcWhEditingIdx = -1;
  tcPopulateWhTimeOptions('tcWhStartTime', false);
  tcPopulateWhTimeOptions('tcWhFinishTime', true);
  tcWhResetDayChecks();
  document.getElementById('tcWhAddModal').classList.add('tc-show');
}
function tcCloseWhAddModal() {
  document.getElementById('tcWhAddModal').classList.remove('tc-show');
}

function tcEditWhEntry(idx) {
  tcWhEditingIdx = idx;
  var sch = tcWhData[tcWhEditingStaff][idx];
  tcPopulateWhTimeOptions('tcWhStartTime', false);
  tcPopulateWhTimeOptions('tcWhFinishTime', true);
  document.getElementById('tcWhStartTime').value = sch.start;
  document.getElementById('tcWhFinishTime').value = sch.finish;
  var dayMap = { '월':'mon','화':'tue','수':'wed','목':'thu','금':'fri','토':'sat','일':'sun' };
  tcWhResetDayChecks();
  var dayParts = sch.days.split(',');
  dayParts.forEach(function(d) {
    var val = dayMap[d.trim()];
    if (val) {
      var cb = document.querySelector('#tcWhDayDropdown input[value="' + val + '"]');
      if (cb) cb.checked = true;
    }
  });
  tcWhUpdateDayLabel();
  document.getElementById('tcWhAddModal').classList.add('tc-show');
}

function tcDeleteWhEntry(idx) {
  if (!confirm('삭제하시겠습니까?')) return;
  tcWhData[tcWhEditingStaff].splice(idx, 1);
  tcRenderWhSetup();
}

function tcSaveWhEntry() {
  var start = document.getElementById('tcWhStartTime').value;
  var finish = document.getElementById('tcWhFinishTime').value;
  var selectedDays = tcWhGetSelectedDays();
  if (!start || !finish || selectedDays.length === 0) { alert('모든 항목을 입력하세요.'); return; }

  // 유효성 검증
  var startMin = tcWhTimeToMin(start);
  var finishMin = tcWhTimeToMin(finish);
  if (finish.indexOf('+1') === 0) finishMin += 24 * 60;
  if (finishMin <= startMin) { alert('종료 시간은 시작 시간보다 나중이어야 합니다.'); return; }
  if (finishMin - startMin > 24 * 60) { alert('근무시간은 24시간을 초과할 수 없습니다.'); return; }

  var dayMap = { 'mon':'월','tue':'화','wed':'수','thu':'목','fri':'금','sat':'토','sun':'일' };
  var dayNames = selectedDays.map(function(v) { return dayMap[v] || v; });
  var entry = { start: start, finish: finish, days: dayNames.join(', ') };

  if (!tcWhData[tcWhEditingStaff]) tcWhData[tcWhEditingStaff] = [];
  if (tcWhEditingIdx >= 0) {
    tcWhData[tcWhEditingStaff][tcWhEditingIdx] = entry;
  } else {
    tcWhData[tcWhEditingStaff].push(entry);
  }
  tcCloseWhAddModal();
  tcRenderWhSetup();
}

function tcWhTimeToMin(timeStr) {
  var cleaned = timeStr.replace('+1일 ', '');
  var parts = cleaned.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function tcPopulateWhTimeOptions(selectId, includeNextDay) {
  var sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">선택</option>';
  for (var h = 0; h < 24; h++) {
    for (var m = 0; m < 60; m += 30) {
      var val = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      var opt = document.createElement('option');
      opt.value = val; opt.textContent = val;
      sel.appendChild(opt);
    }
  }
  if (includeNextDay) {
    for (var h2 = 0; h2 <= 12; h2++) {
      for (var m2 = 0; m2 < 60; m2 += 30) {
        if (h2 === 12 && m2 > 0) break;
        var val2 = '+1일 ' + String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0');
        var opt2 = document.createElement('option');
        opt2.value = val2; opt2.textContent = val2;
        sel.appendChild(opt2);
      }
    }
  }
}

// ── 요일 다중선택 ──
function tcWhToggleDayDrop() {
  document.getElementById('tcWhDayDropdown').classList.toggle('tc-wh-show');
}
function tcWhDayToggleAll(el) {
  var checks = document.querySelectorAll('#tcWhDayDropdown input[type="checkbox"]:not([value="all"])');
  checks.forEach(function(c) { c.checked = el.checked; });
  tcWhUpdateDayLabel();
}
function tcWhUpdateDayLabel() {
  var checks = document.querySelectorAll('#tcWhDayDropdown input[type="checkbox"]:checked:not([value="all"])');
  var placeholder = document.getElementById('tcWhDayPlaceholder');
  var dayLabelMap = { 'mon':'월','tue':'화','wed':'수','thu':'목','fri':'금','sat':'토','sun':'일' };
  if (checks.length === 0) {
    placeholder.textContent = '선택';
    placeholder.classList.remove('tc-wh-has-value');
  } else {
    var names = [];
    checks.forEach(function(c) { names.push(dayLabelMap[c.value] || c.value); });
    placeholder.textContent = names.join(', ');
    placeholder.classList.add('tc-wh-has-value');
  }
  // 전체 체크 동기화
  var allCheck = document.querySelector('#tcWhDayDropdown input[value="all"]');
  var total = document.querySelectorAll('#tcWhDayDropdown input[type="checkbox"]:not([value="all"])');
  if (allCheck) allCheck.checked = (checks.length === total.length);
}
function tcWhGetSelectedDays() {
  var checks = document.querySelectorAll('#tcWhDayDropdown input[type="checkbox"]:checked:not([value="all"])');
  var arr = [];
  checks.forEach(function(c) { arr.push(c.value); });
  return arr;
}
function tcWhResetDayChecks() {
  var checks = document.querySelectorAll('#tcWhDayDropdown input[type="checkbox"]');
  checks.forEach(function(c) { c.checked = false; });
  var placeholder = document.getElementById('tcWhDayPlaceholder');
  if (placeholder) { placeholder.textContent = '선택'; placeholder.classList.remove('tc-wh-has-value'); }
  var dd = document.getElementById('tcWhDayDropdown');
  if (dd) dd.classList.remove('tc-wh-show');
}
// 개별 요일 체크 시 라벨 업데이트
document.addEventListener('change', function(e) {
  if (e.target.closest('#tcWhDayDropdown') && e.target.type === 'checkbox' && e.target.value !== 'all') {
    tcWhUpdateDayLabel();
  }
});
// 외부 클릭 시 요일 드롭다운 닫기
document.addEventListener('click', function(e) {
  if (!e.target.closest('#tcWhDayField')) {
    var dd = document.getElementById('tcWhDayDropdown');
    if (dd) dd.classList.remove('tc-wh-show');
  }
});

// ── 기간 타입 토글 (관리) ──
function tcTogglePeriod() {
  var t = document.querySelector('input[name="tcPeriodType"]:checked').value;
  document.getElementById('tcDailyDate').style.display = t === 'daily' ? '' : 'none';
  document.getElementById('tcMonthDate').style.display = t === 'monthly' ? '' : 'none';
  document.getElementById('tcRangeWrap').style.display = t === 'range' ? 'flex' : 'none';
}

// ── 기간 타입 토글 (집계) ──
function tcToggleSumPeriod() {
  var t = document.querySelector('input[name="tcSumPeriod"]:checked').value;
  document.getElementById('tcSumMonth').style.display = t === 'monthly' ? '' : 'none';
  document.getElementById('tcSumRangeWrap').style.display = t === 'range' ? 'flex' : 'none';
}

// ── 검색 ──
function tcSearch() {
  var periodType = document.querySelector('input[name="tcPeriodType"]:checked').value;
  if (periodType === 'daily') {
    tcRenderTable(document.getElementById('tcDailyDate').value);
  } else if (periodType === 'monthly') {
    var month = document.getElementById('tcMonthDate').value; // "2026-03"
    tcRenderTableByMonth(month);
  } else {
    var start = document.getElementById('tcStartDate').value;
    var end = document.getElementById('tcEndDate').value;
    tcRenderTableByRange(start, end);
  }
}

function tcRenderTableByMonth(month) {
  var tbody = document.getElementById('tcTableBody');
  if (!tbody) return;
  var staffVal = document.getElementById('tcStaffSelect').value;
  var statusVal = document.getElementById('tcStatusSelect').value;

  tcFilteredData = tcSampleData.filter(function(r) {
    if (!r.date.startsWith(month)) return false;
    if (staffVal !== 'all' && r.staff !== staffVal) return false;
    if (statusVal === 'tardy' && !r.tardy) return false;
    if (statusVal === 'leaveEarly' && !r.leaveEarly) return false;
    if (statusVal === 'absent' && r.absent !== 'Y') return false;
    return true;
  });

  if (tcFilteredData.length === 0) {
    tbody.innerHTML = '<tr class="tc-empty-row"><td colspan="9">내역이 없습니다</td></tr>';
    tcRenderPagination(0);
    return;
  }
  var totalPages = Math.ceil(tcFilteredData.length / tcPageSize);
  if (tcCurrentPage > totalPages) tcCurrentPage = totalPages;
  var s = (tcCurrentPage - 1) * tcPageSize;
  var pageData = tcFilteredData.slice(s, s + tcPageSize);
  var html = '';
  pageData.forEach(function(r) { html += tcBuildRow(r); });
  tbody.innerHTML = html;
  tcRenderPagination(tcFilteredData.length);
}

function tcRenderTableByRange(start, end) {
  var tbody = document.getElementById('tcTableBody');
  if (!tbody) return;
  var staffVal = document.getElementById('tcStaffSelect').value;
  var statusVal = document.getElementById('tcStatusSelect').value;

  tcFilteredData = tcSampleData.filter(function(r) {
    if (start && r.date < start) return false;
    if (end && r.date > end) return false;
    if (staffVal !== 'all' && r.staff !== staffVal) return false;
    if (statusVal === 'tardy' && !r.tardy) return false;
    if (statusVal === 'leaveEarly' && !r.leaveEarly) return false;
    if (statusVal === 'absent' && r.absent !== 'Y') return false;
    return true;
  });

  if (tcFilteredData.length === 0) {
    tbody.innerHTML = '<tr class="tc-empty-row"><td colspan="9">내역이 없습니다</td></tr>';
    tcRenderPagination(0);
    return;
  }
  var totalPages = Math.ceil(tcFilteredData.length / tcPageSize);
  if (tcCurrentPage > totalPages) tcCurrentPage = totalPages;
  var s = (tcCurrentPage - 1) * tcPageSize;
  var pageData = tcFilteredData.slice(s, s + tcPageSize);
  var html = '';
  pageData.forEach(function(r) { html += tcBuildRow(r); });
  tbody.innerHTML = html;
  tcRenderPagination(tcFilteredData.length);
}

function tcSumSearch() { /* 서버 연동 시 구현 */ }

// ── 인쇄 ──
function tcPrint() { window.print(); }

// ── 출근 등록 모달 ──
function tcOpenClockInModal() {
  document.getElementById('tcClockInModal').classList.add('tc-show');
  tcUpdateClockTime('tcClockInTime');
  tcClockTimer = setInterval(function() { tcUpdateClockTime('tcClockInTime'); }, 1000);
}
function tcCloseClockInModal() {
  document.getElementById('tcClockInModal').classList.remove('tc-show');
  if (tcClockTimer) { clearInterval(tcClockTimer); tcClockTimer = null; }
  document.getElementById('tcClockInStaff').value = '';
  document.getElementById('tcClockInMemo').value = '';
}
function tcDoClockIn() {
  var staff = document.getElementById('tcClockInStaff').value;
  if (!staff) { alert('직원을 선택하세요.'); return; }
  alert('출근 등록되었습니다.');
  tcCloseClockInModal();
}

// ── 퇴근 등록 모달 ──
function tcOpenClockOutModal() {
  document.getElementById('tcClockOutModal').classList.add('tc-show');
  tcUpdateClockTime('tcClockOutTime');
  tcClockTimer = setInterval(function() { tcUpdateClockTime('tcClockOutTime'); }, 1000);
}
function tcCloseClockOutModal() {
  document.getElementById('tcClockOutModal').classList.remove('tc-show');
  if (tcClockTimer) { clearInterval(tcClockTimer); tcClockTimer = null; }
  document.getElementById('tcClockOutStaff').value = '';
  document.getElementById('tcClockOutMemo').value = '';
}
function tcDoClockOut() {
  var sel = document.getElementById('tcClockOutStaff');
  var staff = sel.value;
  if (!staff) { alert('직원을 선택하세요.'); return; }

  // 행에서 열었을 경우 해당 레코드 업데이트
  var rowIdx = sel.dataset.rowIdx;
  if (rowIdx !== undefined && rowIdx !== '') {
    var r = tcSampleData[parseInt(rowIdx)];
    if (r) {
      var now = new Date();
      var outH = now.getHours();
      var outM = now.getMinutes();
      r.outTime = String(outH).padStart(2, '0') + ':' + String(outM).padStart(2, '0');
      // 근무 시간 계산
      if (r.inTime) {
        var inParts = r.inTime.split(':');
        var inTotal = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
        var outTotal = outH * 60 + outM;
        if (outTotal <= inTotal) outTotal += 24 * 60;
        var diff = outTotal - inTotal;
        r.workHours = Math.floor(diff / 60) + '시간 ' + (diff % 60) + '분';
      }
    }
    sel.dataset.rowIdx = '';
  }

  alert('퇴근 등록되었습니다.');
  tcCloseClockOutModal();
  tcSearch(); // 테이블 갱신
}

// ── 시각 표시 ──
function tcUpdateClockTime(elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  var now = new Date();
  var y = now.getFullYear();
  var mo = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  var h = now.getHours();
  var ampm = h >= 12 ? '오후' : '오전';
  var h12 = h % 12 || 12;
  var mi = String(now.getMinutes()).padStart(2, '0');
  var s = String(now.getSeconds()).padStart(2, '0');
  el.textContent = y + '-' + mo + '-' + d + '    ' + String(h12).padStart(2, '0') + ':' + mi + ':' + s + ' ' + ampm;
}

// ── 결근 등록 모달 ──
function tcOpenAbsentModal() {
  document.getElementById('tcAbsentModal').classList.add('tc-show');
  document.getElementById('tcAbsentDate').value = new Date().toISOString().slice(0, 10);
}
function tcCloseAbsentModal() {
  document.getElementById('tcAbsentModal').classList.remove('tc-show');
  document.getElementById('tcAbsentStaff').value = '';
  document.getElementById('tcAbsentMemo').value = '';
}
function tcDoAbsent() {
  var staff = document.getElementById('tcAbsentStaff').value;
  if (!staff) { alert('직원을 선택하세요.'); return; }
  alert('결근 등록되었습니다.');
  tcCloseAbsentModal();
}

// ══ [FEAT-TIMECLOCK] END ══

// ══════════════════════════════════════════════════════════════
// ══ [FEAT-STAFF-GOAL] 직원별 목표 관리 ══
// ══════════════════════════════════════════════════════════════

var sgGoalData = [
  { name: '원장님', service: 1200000, product: 300000, prepaid: 800000, ticket: 400000, total: 2700000, aService: 850000, aProduct: 120000, aPrepaid: 500000, aTicket: 200000, aTotal: 1670000 },
  { name: '수진', service: 800000, product: 200000, prepaid: 500000, ticket: 300000, total: 1800000, aService: 950000, aProduct: 250000, aPrepaid: 580000, aTicket: 350000, aTotal: 2130000 },
  { name: '지훈', service: 600000, product: 150000, prepaid: 0, ticket: 0, total: 750000, aService: 430000, aProduct: 60000, aPrepaid: 0, aTicket: 0, aTotal: 490000 }
];
var sgDeleteRow = null;
/* sgChartInstance 제거 — pure CSS bar chart 사용 */

function openStaffGoal() {
  freezeGnb();
  hideAllViews();
  document.getElementById('staffGoalView').classList.add('show');
  sgShowManage();
  if (typeof currentLang !== 'undefined' && currentLang === 'en') applyLang();
}

// ── 서브뷰 전환 ──
function sgShowSetting() {
  document.getElementById('sgManageView').style.display = 'none';
  document.getElementById('sgSettingView').style.display = 'flex';
  sgUpdatePeriodLabel();
  sgUpdateSaveState();
}
function sgShowManage() {
  document.getElementById('sgSettingView').style.display = 'none';
  document.getElementById('sgManageView').style.display = 'flex';
  sgRenderTable();
  sgRenderChart();
}

// ── 기간 타입 토글 ──
function sgTogglePeriod() {
  var t = document.querySelector('input[name="sgPeriodType"]:checked').value;
  document.getElementById('sgMonth').style.display = t === 'monthly' ? '' : 'none';
  document.getElementById('sgRangeInputs').style.display = t === 'range' ? 'flex' : 'none';
}

// ── 집계 기준 툴팁 ──
function sgToggleTooltip(e) {
  e.stopPropagation();
  document.getElementById('sgAggTooltip').classList.toggle('sg-show');
}

// ── 구분 드롭다운 ──
function sgToggleCatDd(e) {
  e.stopPropagation();
  document.getElementById('sgCatMenu').classList.toggle('sg-show');
}
function sgUpdateCatLabel() {
  var chks = document.querySelectorAll('.sg-cat-chk');
  var all = true, names = [];
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  chks.forEach(function(c) { if (!c.checked) all = false; else names.push(c.closest('label').querySelector('span:last-child').textContent); });
  document.getElementById('sgCatLabel').textContent = (all || names.length === 0) ? (isEn ? 'All' : '전체') : names.join(', ');
}

// ── 직원 드롭다운 ──
function sgToggleStaffDd(e) {
  e.stopPropagation();
  document.getElementById('sgStaffMenu').classList.toggle('sg-show');
}
function sgToggleSelAll() {
  var v = document.getElementById('sgStaffSelAll').checked;
  document.querySelectorAll('.sg-staff-chk').forEach(function(c) { c.checked = v; });
}

// ── 직원 추가 ──
function sgAddStaff() {
  var chks = document.querySelectorAll('.sg-staff-chk:checked');
  if (chks.length === 0) return;
  var tbody = document.getElementById('sgSetTbody');
  var empty = tbody.querySelector('.sg-empty-row');
  if (empty) empty.remove();

  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  chks.forEach(function(chk) {
    var name = chk.value;
    var dup = false;
    tbody.querySelectorAll('tr[data-staff]').forEach(function(r) { if (r.dataset.staff === name) dup = true; });
    if (dup) return;

    var tr = document.createElement('tr');
    tr.setAttribute('data-staff', name);
    tr.innerHTML =
      '<td>' + name + '</td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="service" oninput="sgFmtNum(this)" /></td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="product" oninput="sgFmtNum(this)" /></td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="prepaid" oninput="sgFmtNum(this)" /></td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="ticket" oninput="sgFmtNum(this)" /></td>' +
      '<td><button class="sg-del-btn" onclick="sgOpenDelModal(this)" data-i18n="sg.delete" data-ko="삭제" data-en="Delete">' + (isEn ? 'Delete' : '삭제') + '</button></td>';
    tbody.appendChild(tr);
    chk.checked = false;
  });
  document.getElementById('sgStaffSelAll').checked = false;
  document.getElementById('sgStaffMenu').classList.remove('sg-show');
  sgUpdateSaveState();
}

// ── 숫자 포맷 ──
function sgFmtNum(el) {
  var v = el.value.replace(/[^0-9]/g, '');
  el.value = v === '' ? '' : Number(v).toLocaleString();
}
function sgParseNum(s) { return parseInt((s || '0').replace(/,/g, ''), 10) || 0; }

// ── 저장 버튼 상태 ──
function sgUpdateSaveState() {
  var rows = document.querySelectorAll('#sgSetTbody tr[data-staff]');
  var btn = document.getElementById('sgSaveBtn');
  btn.style.opacity = rows.length > 0 ? '1' : '0.5';
  btn.style.pointerEvents = rows.length > 0 ? 'auto' : 'none';
}

// ── 삭제 모달 ──
function sgOpenDelModal(btn) {
  sgDeleteRow = btn.closest('tr');
  document.getElementById('sgDeleteModal').classList.add('sg-show');
  document.getElementById('sgConfirmDelBtn').onclick = sgConfirmDel;
}
function sgCloseDelModal() {
  document.getElementById('sgDeleteModal').classList.remove('sg-show');
  sgDeleteRow = null;
}
function sgConfirmDel() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (sgDeleteRow) {
    var name = sgDeleteRow.dataset.staff;
    sgDeleteRow.remove();
    sgGoalData = sgGoalData.filter(function(d) { return d.name !== name; });
    var tbody = document.getElementById('sgSetTbody');
    if (!tbody.querySelector('tr[data-staff]')) {
      tbody.innerHTML = '<tr class="sg-empty-row"><td colspan="6" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data for table">' + (isEn ? 'No data for table' : '내역이 없습니다.') + '</td></tr>';
    }
    sgUpdateSaveState();
  }
  sgCloseDelModal();
}

// ── 저장 ──
function sgSave() {
  var rows = document.querySelectorAll('#sgSetTbody tr[data-staff]');
  sgGoalData = [];
  rows.forEach(function(row) {
    var inp = row.querySelectorAll('.sg-goal-input');
    var s = sgParseNum(inp[0].value), p = sgParseNum(inp[1].value);
    var pp = sgParseNum(inp[2].value), t = sgParseNum(inp[3].value);
    if (s === 0 && p === 0 && pp === 0 && t === 0) return;
    sgGoalData.push({ name: row.dataset.staff, service: s, product: p, prepaid: pp, ticket: t, total: s + p + pp + t });
  });
  // 직원 select에 반영
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  var sel = document.getElementById('sgStaffSelect');
  sel.innerHTML = '<option value="all">' + (isEn ? 'All' : '전체') + '</option>';
  sgGoalData.forEach(function(d) {
    sel.innerHTML += '<option value="' + d.name + '">' + d.name + '</option>';
  });
  alert(isEn ? 'Saved.' : '저장되었습니다.');
}

// ── 전월 목표 복사 ──
function sgCopyPrev() {
  var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (sgGoalData.length === 0) { alert(isEn ? 'No previous month goal data to copy.' : '복사할 전월 목표 데이터가 없습니다.'); return; }
  var tbody = document.getElementById('sgSetTbody');
  var empty = tbody.querySelector('.sg-empty-row');
  if (empty) empty.remove();

  sgGoalData.forEach(function(d) {
    var ex = tbody.querySelector('tr[data-staff="' + d.name + '"]');
    if (ex) {
      var inp = ex.querySelectorAll('.sg-goal-input');
      inp[0].value = d.service.toLocaleString();
      inp[1].value = d.product.toLocaleString();
      inp[2].value = d.prepaid.toLocaleString();
      inp[3].value = d.ticket.toLocaleString();
    } else {
      var tr = document.createElement('tr');
      tr.setAttribute('data-staff', d.name);
      tr.innerHTML =
        '<td>' + d.name + '</td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="service" value="' + d.service.toLocaleString() + '" oninput="sgFmtNum(this)" /></td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="product" value="' + d.product.toLocaleString() + '" oninput="sgFmtNum(this)" /></td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="prepaid" value="' + d.prepaid.toLocaleString() + '" oninput="sgFmtNum(this)" /></td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="ticket" value="' + d.ticket.toLocaleString() + '" oninput="sgFmtNum(this)" /></td>' +
        '<td><button class="sg-del-btn" onclick="sgOpenDelModal(this)" data-i18n="sg.delete" data-ko="삭제" data-en="Delete">' + (isEn ? 'Delete' : '삭제') + '</button></td>';
      tbody.appendChild(tr);
    }
  });
  sgUpdateSaveState();
}

// ── 목표 관리 테이블 렌더링 ──
function sgPct(a, g) { return g > 0 ? (a / g * 100).toFixed(1) + '%' : '-'; }
function sgCell(a, g) { return '<td>' + a.toLocaleString() + ' / ' + g.toLocaleString() + '</td><td>' + sgPct(a, g) + '</td>'; }

function sgRenderTable() {
  var tbody = document.getElementById('sgGoalTbody');
  if (sgGoalData.length === 0) {
    var isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    tbody.innerHTML = '<tr class="sg-empty-row"><td colspan="11" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data for table">' + (isEn ? 'No data for table' : '내역이 없습니다.') + '</td></tr>';
    return;
  }
  var html = '';
  var ts=0,tp=0,tpp=0,tt=0,ta=0, as=0,ap=0,app=0,at=0,aa=0;
  sgGoalData.forEach(function(d) {
    var aS = d.aService||0, aP = d.aProduct||0, aPP = d.aPrepaid||0, aT = d.aTicket||0, aA = d.aTotal||(aS+aP+aPP+aT);
    ts+=d.service; tp+=d.product; tpp+=d.prepaid; tt+=d.ticket; ta+=d.total;
    as+=aS; ap+=aP; app+=aPP; at+=aT; aa+=aA;
    html += '<tr><td>' + d.name + '</td>' +
      sgCell(aS, d.service) + sgCell(aP, d.product) + sgCell(aPP, d.prepaid) + sgCell(aT, d.ticket) + sgCell(aA, d.total) + '</tr>';
  });
  var isEn2 = (typeof currentLang !== 'undefined' && currentLang === 'en');
  html += '<tr class="sg-total-row"><td data-i18n="sg.total" data-ko="합계" data-en="Total">' + (isEn2 ? 'Total' : '합계') + '</td>' +
    sgCell(as,ts) + sgCell(ap,tp) + sgCell(app,tpp) + sgCell(at,tt) + sgCell(aa,ta) + '</tr>';
  tbody.innerHTML = html;
}

// ── 차트 렌더링 (CSS bar chart) ──
function sgRenderChart() {
  var chart = document.getElementById('sgBarChart');
  var emptyMsg = document.getElementById('sgChartEmpty');
  var legend = document.getElementById('sgChartLegend');

  if (sgGoalData.length === 0) {
    chart.style.display = 'none';
    chart.innerHTML = '';
    emptyMsg.style.display = '';
    legend.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  chart.style.display = 'block';
  legend.style.display = 'flex';

  var maxTotal = 0;
  sgGoalData.forEach(function(d) { if (d.total > maxTotal) maxTotal = d.total; });
  if (maxTotal === 0) maxTotal = 1;

  var html = '';
  sgGoalData.forEach(function(d) {
    var achieved = d.aTotal || 0;
    var pct = d.total > 0 ? (achieved / d.total * 100).toFixed(1) : 0;
    var pctNum = parseFloat(pct);
    var isOver = pctNum > 100;

    // 100% 이하: 기본 파란색 바
    // 100% 초과: 100%까지 파란색 + 초과분 인디고색 (2단 바)
    var barHtml;
    if (isOver) {
      // 전체 트랙을 100% 기준으로 maxPct까지 스케일
      var baseWidth = (100 / pctNum) * 100; // 100% 부분이 차지하는 비율
      barHtml = '<div class="sg-bar-fill" style="width:' + baseWidth + '%;border-radius:6px 0 0 6px;"></div>' +
                '<div class="sg-bar-fill sg-bar-fill-over" style="width:' + (100 - baseWidth) + '%;border-radius:0 6px 6px 0;"></div>';
    } else {
      var fillWidth = d.total > 0 ? (achieved / d.total) * 100 : 0;
      barHtml = '<div class="sg-bar-fill" style="width:' + fillWidth + '%;"></div>';
    }

    html += '<div class="sg-bar-row">' +
      '<div class="sg-bar-label">' + d.name + '</div>' +
      '<div class="sg-bar-track" style="position:relative;display:flex;">' +
        barHtml +
        '<div class="sg-bar-info">' + pct + '% / ' + d.total.toLocaleString() + '</div>' +
      '</div>' +
      '<div class="sg-bar-value" style="' + (isOver ? 'color:#FF8A3D;font-weight:700;' : '') + '">' + pct + '%</div>' +
    '</div>';
  });
  chart.innerHTML = html;
}

// ── 검색 ──
function sgSearch() { sgRenderTable(); sgRenderChart(); }
function sgSearchSetting() { sgUpdatePeriodLabel(); }

// ── 기간 라벨 ──
function sgUpdatePeriodLabel() {
  var y = document.getElementById('sgSetYear').value;
  var m = document.getElementById('sgSetMonth').value;
  document.getElementById('sgPeriodLabel').textContent = y + '년 ' + parseInt(m) + '월';
}

// ── 외부 클릭 닫기 ──
document.addEventListener('click', function(e) {
  if (!e.target.closest('#sgCatDropdown')) { var m = document.getElementById('sgCatMenu'); if (m) m.classList.remove('sg-show'); }
  if (!e.target.closest('#sgStaffDdWrap')) { var m = document.getElementById('sgStaffMenu'); if (m) m.classList.remove('sg-show'); }
  if (!e.target.closest('.sg-help-wrap')) { var m = document.getElementById('sgAggTooltip'); if (m) m.classList.remove('sg-show'); }
});

// ══ [FEAT-STAFF-GOAL] END ══
