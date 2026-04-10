/* ========================================
   아하플러스 v2 — 전체 고객 현황 Script
   prefix: cs-
   ======================================== */

// ── 샘플 데이터 ──
// 기본 (상세 OFF): 회원 / 비회원 / 휴면 고객
// 상세 (상세 ON):  회원 / 비회원(회원권 만료) / 비회원 / 휴면 회원 / 휴면 비회원

var sampleDataSimple = [
  { label: '회원',     labelEn: 'Members',          count: 8 },
  { label: '비회원',   labelEn: 'Non Members',      count: 3 },
  { label: '휴면 고객', labelEn: 'Dormant Clients',  count: 3 }
];

var sampleDataDetail = [
  { label: '회원',              labelEn: 'Member',                     count: 8 },
  { label: '비회원 (회원권 만료)', labelEn: 'Non-member (Expired)',       count: 0 },
  { label: '비회원',             labelEn: 'Non-member',                 count: 3 },
  { label: '휴면 회원',          labelEn: 'Dormant Member',             count: 1 },
  { label: '휴면 비회원',        labelEn: 'Dormant Non-member',          count: 2 }
];

// 색상 매핑
var colorsSimple = ['#6161FF', '#43A047', '#FF9800'];
var colorsDetail = ['#6161FF', '#F06060', '#43A047', '#90CAF9', '#AB47BC'];

// ── 전역 변수 ──
var chartInstance = null;

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  doSearch();
});

// ── 검색 실행 ──
function doSearch() {
  var isDetail = document.getElementById('detailCheck').checked;
  var chartType = document.querySelector('input[name="chartType"]:checked').value;

  var data = isDetail ? sampleDataDetail : sampleDataSimple;
  var colors = isDetail ? colorsDetail : colorsSimple;

  renderLegend(data, colors);
  renderChart(data, colors, chartType);
  renderTable(data);
}

// ── 범례 렌더링 ──
function renderLegend(data, colors) {
  var legendEl = document.getElementById('chartLegend');
  var html = '';
  for (var i = 0; i < data.length; i++) {
    html += '<span class="cs-legend-item">' +
      '<span class="cs-legend-color" style="background:' + colors[i] + '"></span>' +
      '<span>' + data[i].label + '</span>' +
      '</span>';
  }
  legendEl.innerHTML = html;
}

// ── 차트 렌더링 ──
function renderChart(data, colors, chartType) {
  var ctx = document.getElementById('statusChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  var labels = [];
  var values = [];
  for (var i = 0; i < data.length; i++) {
    labels.push(data[i].label);
    values.push(data[i].count);
  }

  if (chartType === 'pie') {
    chartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                var val = context.parsed;
                var pct = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
                return context.label + ': ' + val + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  } else {
    // 막대 차트
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          maxBarThickness: 48
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                var val = context.parsed.y;
                var pct = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
                return val + '명 (' + pct + '%)';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Pretendard', size: 12 },
              color: '#616161'
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F0F0F0' },
            ticks: {
              font: { family: 'Pretendard', size: 12 },
              color: '#616161',
              stepSize: 1
            }
          }
        }
      }
    });
  }
}

// ── 테이블 렌더링 ──
function renderTable(data) {
  var tbody = document.getElementById('tableBody');
  var total = 0;
  for (var i = 0; i < data.length; i++) {
    total += data[i].count;
  }

  var html = '';
  for (var i = 0; i < data.length; i++) {
    var pct = total > 0 ? (data[i].count / total * 100).toFixed(1) : '0.0';
    var countDisplay = data[i].count > 0 ? data[i].count : '-';
    html += '<tr>' +
      '<td>' + data[i].label + '</td>' +
      '<td>' + countDisplay + '</td>' +
      '<td>' + pct + '%</td>' +
      '</tr>';
  }

  // 합계 행
  html += '<tr class="cs-total-row">' +
    '<td data-i18n="common.total" data-ko="합계" data-en="Total">합계</td>' +
    '<td>' + total + '</td>' +
    '<td>100%</td>' +
    '</tr>';

  tbody.innerHTML = html;
}

// ── 인쇄 ──
function printPage() {
  window.print();
}
