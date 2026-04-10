/* ========================================
   아하플러스 v2 — 예약 경로별 분석 Script
   ======================================== */

// ── 샘플 데이터 ──
var sampleData = {
  '2026-04': [
    { label: '관리자', count: 1 },
    { label: '네이버', count: 5 }
  ],
  '2026-03': [
    { label: '관리자', count: 8 },
    { label: '네이버', count: 15 },
    { label: '카카오', count: 6 },
    { label: '홈페이지', count: 3 }
  ],
  '2026-02': [
    { label: '관리자', count: 12 },
    { label: '네이버', count: 20 },
    { label: '카카오', count: 9 },
    { label: '전화', count: 4 },
    { label: '홈페이지', count: 7 }
  ],
  '2026-01': [
    { label: '관리자', count: 5 },
    { label: '네이버', count: 11 },
    { label: '카카오', count: 3 }
  ]
};

var chartInstance = null;
var currentData = [];

// ── 도넛/파이 차트 색상 팔레트 ──
var chartColors = [
  '#6161FF', '#43A047', '#F5A623', '#E24B4A', '#29B6F6',
  '#AB47BC', '#FF7043', '#26A69A', '#EC407A', '#8D6E63'
];

// ── 기간 타입 토글 ──
function togglePeriodType() {
  var type = document.querySelector('input[name="periodType"]:checked').value;
  document.getElementById('monthlyDate').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('rangeInputs').style.display = type === 'range' ? 'flex' : 'none';
}

// ── 현재 차트 타입 ──
function getChartType() {
  return document.querySelector('input[name="chartType"]:checked').value;
}

// ── 데이터 조회 ──
function getData() {
  var periodType = document.querySelector('input[name="periodType"]:checked').value;

  if (periodType === 'monthly') {
    var month = document.getElementById('monthlyDate').value;
    return sampleData[month] || [];
  }

  // 기간 조회: 범위 내 월별 데이터 합산
  var start = document.getElementById('rangeStart').value;
  var end = document.getElementById('rangeEnd').value;
  var merged = {};

  Object.keys(sampleData).forEach(function(key) {
    // key 형식: '2026-04', start/end 형식: '2026-04-01'
    var monthStart = key + '-01';
    var monthEnd = key + '-31';
    if (monthEnd >= start && monthStart <= end) {
      sampleData[key].forEach(function(item) {
        if (!merged[item.label]) {
          merged[item.label] = { label: item.label, count: 0 };
        }
        merged[item.label].count += item.count;
      });
    }
  });

  return Object.values(merged);
}

// ── 검색 ──
function doSearch() {
  currentData = getData();
  renderTable(currentData);
  renderChart(currentData);
}

// ── 테이블 렌더링 ──
function renderTable(data) {
  var tbody = document.getElementById('tableBody');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr class="bsa-empty-row"><td colspan="3" data-i18n="common.noData" data-ko="내역이 없습니다" data-en="No data available">내역이 없습니다</td></tr>';
    return;
  }

  var total = data.reduce(function(sum, d) { return sum + d.count; }, 0);

  // 건수 내림차순 정렬
  var sorted = data.slice().sort(function(a, b) { return b.count - a.count; });

  var html = '';
  sorted.forEach(function(d) {
    var ratio = total > 0 ? (d.count / total * 100).toFixed(1) : '0.0';
    html += '<tr>' +
      '<td>' + d.label + '</td>' +
      '<td>' + d.count.toLocaleString() + '</td>' +
      '<td>' + ratio + '%</td>' +
      '</tr>';
  });

  // 합계 행
  html += '<tr class="bsa-total-row">' +
    '<td data-i18n="common.total" data-ko="합계" data-en="Total">합계</td>' +
    '<td>' + total.toLocaleString() + '</td>' +
    '<td>100%</td>' +
    '</tr>';

  tbody.innerHTML = html;
}

// ── 차트 렌더링 (자동 전환) ──
function renderChart(data) {
  var chartType = getChartType();
  if (chartType === 'doughnut') {
    renderDoughnutChart(data);
  } else {
    renderBarChart(data);
  }
}

// ── 도넛 차트 ──
function renderDoughnutChart(data) {
  var canvas = document.getElementById('sourceChart');
  var emptyMsg = document.getElementById('chartEmpty');
  var legendDiv = document.getElementById('chartLegend');
  var chartPanel = document.getElementById('chartPanel');

  // 중앙 텍스트 요소 제거/생성
  removeCenterText();

  if (!data || data.length === 0) {
    canvas.style.display = 'none';
    emptyMsg.style.display = '';
    legendDiv.style.display = 'none';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  emptyMsg.style.display = 'none';
  canvas.style.display = 'block';
  legendDiv.style.display = 'flex';

  // 건수 내림차순 정렬
  var sorted = data.slice().sort(function(a, b) { return b.count - a.count; });

  var labels = sorted.map(function(d) { return d.label; });
  var values = sorted.map(function(d) { return d.count; });
  var colors = sorted.map(function(_, i) { return chartColors[i % chartColors.length]; });
  var total = values.reduce(function(sum, v) { return sum + v; }, 0);

  // 범례
  var legendHtml = '';
  sorted.forEach(function(d, i) {
    var ratio = total > 0 ? (d.count / total * 100).toFixed(1) : '0.0';
    legendHtml += '<span class="bsa-legend-item">' +
      '<span class="bsa-legend-color" style="background:' + colors[i] + ';"></span>' +
      d.label + ' (' + ratio + '%)' +
      '</span>';
  });
  legendDiv.innerHTML = legendHtml;

  // 차트 높이 고정
  chartPanel.style.minHeight = '360px';
  canvas.style.height = '300px';

  if (chartInstance) chartInstance.destroy();

  // 중앙 총합 텍스트 표시
  showCenterText(total);

  var ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var value = ctx.parsed;
              var ratio = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
              return ctx.label + ': ' + value.toLocaleString() + '건 (' + ratio + '%)';
            }
          }
        }
      }
    },
    plugins: [{
      id: 'doughnutLabels',
      afterDatasetsDraw: function(chart) {
        var ctx = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        meta.data.forEach(function(arc, index) {
          var value = chart.data.datasets[0].data[index];
          var ratio = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
          if (parseFloat(ratio) < 8) return; // 8% 미만은 라벨 생략

          var centerPoint = arc.tooltipPosition();
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.font = '600 12px Pretendard';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ratio + '%', centerPoint.x, centerPoint.y);
          ctx.restore();
        });
      }
    }]
  });
}

// ── 중앙 텍스트 표시/제거 ──
function showCenterText(total) {
  removeCenterText();
  var chartPanel = document.getElementById('chartPanel');
  var centerDiv = document.createElement('div');
  centerDiv.className = 'bsa-chart-center';
  centerDiv.id = 'chartCenterText';
  centerDiv.innerHTML =
    '<div class="bsa-chart-center-value">' + total.toLocaleString() + '</div>' +
    '<div class="bsa-chart-center-label" data-i18n="bsa.totalCount" data-ko="총 예약" data-en="Total">총 예약</div>';
  chartPanel.appendChild(centerDiv);
}

function removeCenterText() {
  var existing = document.getElementById('chartCenterText');
  if (existing) existing.remove();
}

// ── 수평 막대 차트 ──
function renderBarChart(data) {
  var canvas = document.getElementById('sourceChart');
  var emptyMsg = document.getElementById('chartEmpty');
  var legendDiv = document.getElementById('chartLegend');
  var chartPanel = document.getElementById('chartPanel');

  removeCenterText();

  if (!data || data.length === 0) {
    canvas.style.display = 'none';
    emptyMsg.style.display = '';
    legendDiv.style.display = 'none';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  emptyMsg.style.display = 'none';
  canvas.style.display = 'block';
  legendDiv.style.display = 'flex';

  // 건수 오름차순 정렬 (상단이 높은 값)
  var sorted = data.slice().sort(function(a, b) { return a.count - b.count; });

  var labels = sorted.map(function(d) { return d.label; });
  var values = sorted.map(function(d) { return d.count; });
  var total = values.reduce(function(sum, v) { return sum + v; }, 0);

  // 범례
  legendDiv.innerHTML =
    '<span class="bsa-legend-item"><span class="bsa-legend-color" style="background:#6161FF;"></span>' +
    '<span data-i18n="bsa.bookingCount" data-ko="예약 건수" data-en="Bookings">예약 건수</span></span>' +
    '<span class="bsa-legend-item" style="margin-left:8px;font-weight:600;">' + total.toLocaleString() + '</span>';

  // 차트 높이: 항목당 최소 40px
  var chartHeight = Math.max(200, sorted.length * 40 + 80);
  chartPanel.style.minHeight = chartHeight + 'px';
  canvas.style.height = chartHeight + 'px';

  if (chartInstance) chartInstance.destroy();

  var ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '예약 건수',
        data: values,
        backgroundColor: '#6161FF',
        borderRadius: 3,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ctx.dataset.label + ': ' + ctx.parsed.x.toLocaleString() + '건';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#F5F5F5' },
          ticks: {
            font: { family: 'Pretendard', size: 11 },
            color: '#9E9E9E',
            stepSize: 1,
            callback: function(v) { return v.toLocaleString(); }
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: 'Pretendard', size: 12 },
            color: '#616161'
          }
        }
      },
      layout: {
        padding: { right: 60 }
      }
    },
    plugins: [{
      id: 'barEndLabels',
      afterDatasetsDraw: function(chart) {
        var ctx = chart.ctx;
        chart.data.datasets.forEach(function(dataset, i) {
          var meta = chart.getDatasetMeta(i);
          meta.data.forEach(function(bar, index) {
            var value = dataset.data[index];
            ctx.save();
            ctx.fillStyle = '#212121';
            ctx.font = '600 11px Pretendard';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(value.toLocaleString(), bar.x + 6, bar.y);
            ctx.restore();
          });
        });
      }
    }]
  });
}

// ── 인쇄 ──
function printPage() {
  window.print();
}

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  togglePeriodType();
  doSearch();
});
