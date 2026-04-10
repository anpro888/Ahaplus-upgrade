/* ========================================
   아하플러스 v2 — 예약 상세 집계 Script
   ======================================== */

// ── 샘플 데이터 ──

// 일별 데이터 (날짜별)
var dailyData = {
  '2026-04-10': {
    summary: { admin: 0, naver: 0, total: 0, cancel: 0, noshow: 0 },
    resources: []
  },
  '2026-04-09': {
    summary: { admin: 1, naver: 3, total: 4, cancel: 1, noshow: 0 },
    resources: [
      { name: '실장님', admin: 1, naver: 1, total: 2, cancel: 0, noshow: 0 },
      { name: '원장님', admin: 0, naver: 2, total: 2, cancel: 1, noshow: 0 }
    ]
  }
};

// 월별 데이터
var monthlyData = {
  '2026-04': {
    summary: { admin: 3, naver: 7, total: 10, cancel: 4, noshow: 0 },
    resources: [
      { name: '서희(방문결제)', admin: 0, naver: 2, total: 2, cancel: 0, noshow: 0 },
      { name: '실장님', admin: 2, naver: 1, total: 3, cancel: 1, noshow: 0 },
      { name: '원장님', admin: 1, naver: 3, total: 4, cancel: 2, noshow: 0 },
      { name: '토미(선결 예약금)', admin: 0, naver: 1, total: 1, cancel: 1, noshow: 0 }
    ],
    prevMonth: {
      label: '2026년 3월',
      admin: 2, naver: 16, total: 18, cancel: 1, noshow: 0
    }
  },
  '2026-03': {
    summary: { admin: 2, naver: 16, total: 18, cancel: 1, noshow: 0 },
    resources: [
      { name: '서희(방문결제)', admin: 0, naver: 5, total: 5, cancel: 0, noshow: 0 },
      { name: '실장님', admin: 1, naver: 4, total: 5, cancel: 0, noshow: 0 },
      { name: '원장님', admin: 1, naver: 5, total: 6, cancel: 1, noshow: 0 },
      { name: '토미(선결 예약금)', admin: 0, naver: 2, total: 2, cancel: 0, noshow: 0 }
    ],
    prevMonth: {
      label: '2026년 2월',
      admin: 3, naver: 12, total: 15, cancel: 2, noshow: 1
    }
  }
};

// ── 기간 타입 토글 ──
function togglePeriodType() {
  var type = document.querySelector('input[name="periodType"]:checked').value;
  document.getElementById('dailyDate').style.display = type === 'daily' ? '' : 'none';
  document.getElementById('monthlyDate').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('rangeInputs').style.display = type === 'range' ? 'flex' : 'none';

  // 전월 대비 예약 섹션은 월별에서만 표시
  document.getElementById('monthCompareSection').style.display = type === 'monthly' ? '' : 'none';
}

// ── 검색 ──
function doSearch() {
  var type = document.querySelector('input[name="periodType"]:checked').value;
  var data = null;

  if (type === 'daily') {
    var dateVal = document.getElementById('dailyDate').value;
    data = dailyData[dateVal] || { summary: { admin: 0, naver: 0, total: 0, cancel: 0, noshow: 0 }, resources: [] };
    renderSummary(data.summary);
    renderResources(data.resources);
    document.getElementById('monthCompareSection').style.display = 'none';
  } else if (type === 'monthly') {
    var monthVal = document.getElementById('monthlyDate').value;
    data = monthlyData[monthVal] || null;
    if (data) {
      renderSummary(data.summary);
      renderResources(data.resources);
      renderMonthCompare(monthVal, data);
      document.getElementById('monthCompareSection').style.display = '';
    } else {
      renderSummary({ admin: 0, naver: 0, total: 0, cancel: 0, noshow: 0 });
      renderResources([]);
      renderMonthCompare(monthVal, null);
      document.getElementById('monthCompareSection').style.display = '';
    }
  } else {
    // 기간 - 샘플에서는 월별 데이터 합산으로 시뮬레이션
    renderSummary({ admin: 0, naver: 0, total: 0, cancel: 0, noshow: 0 });
    renderResources([]);
    document.getElementById('monthCompareSection').style.display = 'none';
  }
}

// ── 예약 집계 렌더링 ──
function renderSummary(s) {
  var tbody = document.getElementById('summaryBody');
  var adminRatio = s.total > 0 ? Math.round(s.admin / s.total * 100) : 0;
  var naverRatio = s.total > 0 ? Math.round(s.naver / s.total * 100) : 0;
  var totalRatio = s.total > 0 ? '100' : '0';
  var cancelRatio = s.total > 0 ? Math.round(s.cancel / s.total * 100) : 0;
  var noshowRatio = s.total > 0 ? Math.round(s.noshow / s.total * 100) : 0;

  var html = '<tr>' +
    '<td data-i18n="bda.bookingCount" data-ko="예약 건수" data-en="Booking Count">' + escapeHtml('예약 건수') + '</td>' +
    '<td>' + s.admin + '</td>' +
    '<td>' + s.naver + '</td>' +
    '<td>' + s.total + '</td>' +
    '<td class="bda-highlight">' + s.cancel + '</td>' +
    '<td>' + s.noshow + '</td>' +
    '</tr>';
  html += '<tr>' +
    '<td data-i18n="bda.ratioPercent" data-ko="비율(%)" data-en="Ratio(%)">' + escapeHtml('비율(%)') + '</td>' +
    '<td>' + adminRatio + '%</td>' +
    '<td>' + naverRatio + '%</td>' +
    '<td>' + totalRatio + '%</td>' +
    '<td class="bda-highlight">' + cancelRatio + '%</td>' +
    '<td>' + noshowRatio + '%</td>' +
    '</tr>';

  tbody.innerHTML = html;
}

// ── 자원별 분석 렌더링 ──
function renderResources(resources) {
  var tbody = document.getElementById('resourceBody');

  if (!resources || resources.length === 0) {
    tbody.innerHTML = '<tr class="bda-empty-row"><td colspan="6" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data available.">내역이 없습니다.</td></tr>';
    return;
  }

  var html = '';
  resources.forEach(function(r) {
    html += '<tr>' +
      '<td>' + escapeHtml(r.name) + '</td>' +
      '<td>' + r.admin + '</td>' +
      '<td class="' + (r.naver > 0 ? 'bda-highlight' : '') + '">' + r.naver + '</td>' +
      '<td>' + r.total + '</td>' +
      '<td class="' + (r.cancel > 0 ? 'bda-highlight' : '') + '">' + r.cancel + '</td>' +
      '<td>' + r.noshow + '</td>' +
      '</tr>';
  });

  tbody.innerHTML = html;
}

// ── 전월 대비 예약 렌더링 ──
function renderMonthCompare(monthVal, data) {
  var tbody = document.getElementById('monthCompareBody');

  if (!data) {
    tbody.innerHTML = '<tr class="bda-empty-row"><td colspan="6" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data available.">내역이 없습니다.</td></tr>';
    return;
  }

  var cur = data.summary;
  var prev = data.prevMonth;

  // 현재 월 라벨
  var parts = monthVal.split('-');
  var curLabel = parts[0] + '년 ' + parseInt(parts[1], 10) + '월';

  var html = '<tr>' +
    '<td>' + escapeHtml(curLabel) + '</td>' +
    '<td>' + cur.admin + '</td>' +
    '<td>' + cur.naver + '</td>' +
    '<td>' + cur.total + '</td>' +
    '<td class="bda-highlight">' + cur.cancel + '</td>' +
    '<td>' + cur.noshow + '</td>' +
    '</tr>';

  if (prev) {
    html += '<tr>' +
      '<td>' + escapeHtml(prev.label) + '</td>' +
      '<td>' + prev.admin + '</td>' +
      '<td>' + prev.naver + '</td>' +
      '<td>' + prev.total + '</td>' +
      '<td>' + prev.cancel + '</td>' +
      '<td>' + prev.noshow + '</td>' +
      '</tr>';

    // 증감 행
    var diffAdmin = cur.admin - prev.admin;
    var diffNaver = cur.naver - prev.naver;
    var diffTotal = cur.total - prev.total;
    var diffCancel = cur.cancel - prev.cancel;
    var diffNoshow = cur.noshow - prev.noshow;

    html += '<tr class="bda-change-row">' +
      '<td data-i18n="bda.change" data-ko="증감" data-en="Change">' + escapeHtml('증감') + '</td>' +
      '<td>' + formatChange(diffAdmin, prev.admin) + '</td>' +
      '<td>' + formatChange(diffNaver, prev.naver) + '</td>' +
      '<td>' + formatChange(diffTotal, prev.total) + '</td>' +
      '<td>' + formatChange(diffCancel, prev.cancel) + '</td>' +
      '<td>' + formatChange(diffNoshow, prev.noshow) + '</td>' +
      '</tr>';
  }

  tbody.innerHTML = html;
}

// ── 증감 포맷 ──
function formatChange(diff, prevVal) {
  if (diff === 0) return '0';
  var pctStr = '';
  if (prevVal > 0) {
    var pct = Math.round(diff / prevVal * 100);
    pctStr = '(' + (pct > 0 ? '+' : '') + pct + '%)';
  } else if (diff !== 0) {
    // 전월이 0인데 현재 값이 있는 경우
    pctStr = '';
  }
  var sign = diff > 0 ? '+' : '';
  return diff + pctStr;
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

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  togglePeriodType();
});
