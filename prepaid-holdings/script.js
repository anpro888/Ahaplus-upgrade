/* ========================================
   아하플러스 v2 — 고객별 정액권 보유 내역 Script
   prefix: pch-
   ======================================== */

// ── 샘플 데이터 ──
var sampleData = [
  {
    clientName: 'Ariana Grande',
    type: '금액 적립',
    typeEn: 'Amount Accumulation',
    cardName: '20만원권',
    cardNameEn: '200K Card',
    balance: 1234567890,
    expiryDate: '2027-06-17',
    saleDate: '2021-11-30',
    saleAmount: 200000,
    accumulatedAmount: 220000
  },
  {
    clientName: 'Taylor Swift',
    type: '금액 적립',
    typeEn: 'Amount Accumulation',
    cardName: '20만원권',
    cardNameEn: '200K Card',
    balance: 102437411013,
    expiryDate: '2027-05-12',
    saleDate: '2025-01-07',
    saleAmount: 200000,
    accumulatedAmount: 220000
  }
];

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  doSearch();
});

// ── 검색 실행 ──
function doSearch() {
  var staffVal = document.getElementById('staffSelect').value;
  var isDiscount = document.getElementById('discountCheck').checked;

  // 직원 필터 (샘플에서는 전체만 사용)
  var filtered = sampleData;
  if (staffVal !== 'all') {
    filtered = [];
  }

  renderSummary(filtered);
  renderTable(filtered, isDiscount);
}

// ── 요약 렌더링 ──
function renderSummary(data) {
  var totalCount = data.length;
  var totalBalance = 0;
  for (var i = 0; i < data.length; i++) {
    totalBalance += data[i].balance;
  }

  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('totalBalance').textContent = formatNumber(totalBalance);
}

// ── 테이블 렌더링 ──
function renderTable(data, isDiscount) {
  var tbody = document.getElementById('tableBody');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr class="pch-empty-row"><td colspan="8" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data available.">내역이 없습니다.</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    html += '<tr>' +
      '<td>' + escapeHtml(d.clientName) + '</td>' +
      '<td>' + escapeHtml(d.type) + '</td>' +
      '<td>' + escapeHtml(d.cardName) + '</td>' +
      '<td>' + formatNumber(d.balance) + '</td>' +
      '<td>' + d.expiryDate + '</td>' +
      '<td>' + d.saleDate + '</td>' +
      '<td>' + formatNumber(d.saleAmount) + '</td>' +
      '<td>' + formatNumber(d.accumulatedAmount) + '</td>' +
      '</tr>';
  }

  tbody.innerHTML = html;
}

// ── 숫자 포맷 (콤마) ──
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── HTML 이스케이프 ──
function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── 인쇄 ──
function printPage() {
  window.print();
}
