/* ========================================
   아하플러스 v2 — 서비스 매출 분석 Script
   ======================================== */

// ── 샘플 데이터 ──
var sampleData = {
  staff: {
    all: [
      { label: '원장님', quantity: 15, amount: 450000 },
      { label: '별별별', quantity: 12, amount: 360000 },
      { label: 'staff', quantity: 8, amount: 240000 }
    ],
    '원장님': [
      { label: '선택 안함', quantity: 15, amount: 450000 }
    ],
    '별별별': [
      { label: '선택 안함', quantity: 12, amount: 360000 }
    ],
    'staff': [
      { label: '선택 안함', quantity: 8, amount: 240000 }
    ]
  },
  category: {
    all: [
      { label: '헤어', quantity: 22, amount: 660000 },
      { label: '네일', quantity: 8, amount: 240000 },
      { label: '피부관리', quantity: 5, amount: 150000 }
    ],
    '원장님': [
      { label: '헤어', quantity: 10, amount: 300000 },
      { label: '피부관리', quantity: 5, amount: 150000 }
    ],
    '별별별': [
      { label: '헤어', quantity: 7, amount: 210000 },
      { label: '네일', quantity: 5, amount: 150000 }
    ],
    'staff': [
      { label: '헤어', quantity: 5, amount: 150000 },
      { label: '네일', quantity: 3, amount: 90000 }
    ]
  },
  service: {
    all: [
      { label: '커트', quantity: 12, amount: 240000 },
      { label: '펌', quantity: 5, amount: 250000 },
      { label: '염색', quantity: 5, amount: 200000 },
      { label: '클리닉', quantity: 4, amount: 120000 },
      { label: '젤네일', quantity: 5, amount: 100000 },
      { label: '속눈썹', quantity: 3, amount: 90000 },
      { label: '두피관리', quantity: 1, amount: 50000 }
    ],
    '원장님': [
      { label: '커트', quantity: 6, amount: 120000 },
      { label: '펌', quantity: 4, amount: 200000 },
      { label: '염색', quantity: 3, amount: 120000 },
      { label: '두피관리', quantity: 1, amount: 50000 }
    ],
    '별별별': [
      { label: '커트', quantity: 4, amount: 80000 },
      { label: '젤네일', quantity: 5, amount: 100000 },
      { label: '염색', quantity: 2, amount: 80000 },
      { label: '클리닉', quantity: 2, amount: 60000 }
    ],
    'staff': [
      { label: '커트', quantity: 2, amount: 40000 },
      { label: '펌', quantity: 1, amount: 50000 },
      { label: '속눈썹', quantity: 3, amount: 90000 },
      { label: '클리닉', quantity: 2, amount: 60000 }
    ]
  },
  weekday: {
    all: [
      { label: '월', quantity: 4, amount: 120000 },
      { label: '화', quantity: 6, amount: 180000 },
      { label: '수', quantity: 5, amount: 150000 },
      { label: '목', quantity: 7, amount: 210000 },
      { label: '금', quantity: 8, amount: 240000 },
      { label: '토', quantity: 3, amount: 90000 },
      { label: '일', quantity: 2, amount: 60000 }
    ],
    '원장님': [
      { label: '월', quantity: 2, amount: 60000 },
      { label: '화', quantity: 3, amount: 90000 },
      { label: '수', quantity: 2, amount: 60000 },
      { label: '목', quantity: 3, amount: 90000 },
      { label: '금', quantity: 3, amount: 90000 },
      { label: '토', quantity: 1, amount: 30000 },
      { label: '일', quantity: 1, amount: 30000 }
    ],
    '별별별': [
      { label: '월', quantity: 1, amount: 30000 },
      { label: '화', quantity: 2, amount: 60000 },
      { label: '수', quantity: 2, amount: 60000 },
      { label: '목', quantity: 3, amount: 90000 },
      { label: '금', quantity: 3, amount: 90000 },
      { label: '토', quantity: 1, amount: 30000 }
    ],
    'staff': [
      { label: '월', quantity: 1, amount: 30000 },
      { label: '화', quantity: 1, amount: 30000 },
      { label: '수', quantity: 1, amount: 30000 },
      { label: '목', quantity: 1, amount: 30000 },
      { label: '금', quantity: 2, amount: 60000 },
      { label: '토', quantity: 1, amount: 30000 },
      { label: '일', quantity: 1, amount: 30000 }
    ]
  },
  hour: {
    all: [
      { label: '10시', quantity: 3, amount: 90000 },
      { label: '11시', quantity: 5, amount: 150000 },
      { label: '12시', quantity: 4, amount: 120000 },
      { label: '13시', quantity: 3, amount: 90000 },
      { label: '14시', quantity: 6, amount: 180000 },
      { label: '15시', quantity: 5, amount: 150000 },
      { label: '16시', quantity: 4, amount: 120000 },
      { label: '17시', quantity: 3, amount: 90000 },
      { label: '18시', quantity: 2, amount: 60000 }
    ],
    '원장님': [
      { label: '10시', quantity: 2, amount: 60000 },
      { label: '11시', quantity: 2, amount: 60000 },
      { label: '13시', quantity: 2, amount: 60000 },
      { label: '14시', quantity: 3, amount: 90000 },
      { label: '15시', quantity: 3, amount: 90000 },
      { label: '16시', quantity: 2, amount: 60000 },
      { label: '17시', quantity: 1, amount: 30000 }
    ],
    '별별별': [
      { label: '10시', quantity: 1, amount: 30000 },
      { label: '11시', quantity: 2, amount: 60000 },
      { label: '12시', quantity: 2, amount: 60000 },
      { label: '14시', quantity: 2, amount: 60000 },
      { label: '15시', quantity: 2, amount: 60000 },
      { label: '16시', quantity: 2, amount: 60000 },
      { label: '18시', quantity: 1, amount: 30000 }
    ],
    'staff': [
      { label: '11시', quantity: 1, amount: 30000 },
      { label: '12시', quantity: 2, amount: 60000 },
      { label: '13시', quantity: 1, amount: 30000 },
      { label: '14시', quantity: 1, amount: 30000 },
      { label: '16시', quantity: 1, amount: 30000 },
      { label: '17시', quantity: 1, amount: 30000 },
      { label: '18시', quantity: 1, amount: 30000 }
    ]
  }
};

var chartInstance = null;
var currentData = [];

// ── 분석 항목별 헤더 라벨 ──
var headerLabels = {
  staff:    { ko: '직원',   en: 'Staff' },
  category: { ko: '분류',   en: 'Category' },
  service:  { ko: '서비스', en: 'Service' },
  weekday:  { ko: '요일',   en: 'Weekday' },
  hour:     { ko: '시간',   en: 'Hour' }
};

// ── 분석 항목별 차트 타입 규칙 ──
// staff: 수평 막대 고정, category: 파이(기본)/막대 전환 가능, service: 수평 막대 고정
// weekday: 수평 막대 고정, hour: 수평 막대 고정
var chartTypeRules = {
  staff:    { defaultType: 'bar',  userChangeable: false },
  category: { defaultType: 'pie',  userChangeable: true },
  service:  { defaultType: 'bar',  userChangeable: false },
  weekday:  { defaultType: 'bar',  userChangeable: false },
  hour:     { defaultType: 'bar',  userChangeable: false }
};

// ── 파이 차트 색상 팔레트 ──
var pieColors = [
  '#6161FF', '#43A047', '#F5A623', '#E24B4A', '#29B6F6',
  '#AB47BC', '#FF7043', '#26A69A', '#EC407A', '#8D6E63'
];

// ── 기간 타입 토글 ──
function togglePeriodType() {
  var type = document.querySelector('input[name="periodType"]:checked').value;
  document.getElementById('dailyDate').style.display = type === 'daily' ? '' : 'none';
  document.getElementById('monthlyDate').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('rangeInputs').style.display = type === 'range' ? 'flex' : 'none';
}

// ── 현재 차트 타입 결정 ──
function getChartType() {
  var analysisType = document.getElementById('analysisType').value;
  var rule = chartTypeRules[analysisType];
  if (rule.userChangeable) {
    return document.getElementById('chartTypeSelect').value;
  }
  return rule.defaultType;
}

// ── 분석 항목 변경 ──
function onAnalysisTypeChange() {
  var type = document.getElementById('analysisType').value;
  var th = document.getElementById('colHeader');
  var label = headerLabels[type];
  th.textContent = label.ko;
  th.setAttribute('data-ko', label.ko);
  th.setAttribute('data-en', label.en);
  th.setAttribute('data-i18n', 'svra.' + type);

  // 차트 타입 드롭다운 표시/숨김
  var chartTypeGroup = document.getElementById('chartTypeGroup');
  var rule = chartTypeRules[type];
  if (rule.userChangeable) {
    chartTypeGroup.style.display = '';
    // 분류 선택 시 기본값을 파이로 리셋
    document.getElementById('chartTypeSelect').value = rule.defaultType;
  } else {
    chartTypeGroup.style.display = 'none';
  }

  // 데이터가 이미 로드된 상태면 차트 즉시 재렌더링
  if (currentData.length > 0) {
    doSearch();
  }
}

// ── 데이터 조회 ──
function getData() {
  var analysisType = document.getElementById('analysisType').value;
  var staff = document.getElementById('staffSelect').value;
  var key = staff === 'all' ? 'all' : staff;
  var typeData = sampleData[analysisType];
  return (typeData && typeData[key]) ? typeData[key] : [];
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
  var valueType = document.querySelector('input[name="valueType"]:checked').value;

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr class="svra-empty-row"><td colspan="4" data-i18n="common.noData" data-ko="내역이 없습니다" data-en="No data available">내역이 없습니다</td></tr>';
    return;
  }

  var totalQty = 0;
  var totalAmt = 0;
  data.forEach(function(d) {
    totalQty += d.quantity;
    totalAmt += d.amount;
  });

  // 정렬
  var sorted = data.slice().sort(function(a, b) {
    return valueType === 'amount' ? b.amount - a.amount : b.quantity - a.quantity;
  });

  var html = '';
  sorted.forEach(function(d) {
    var ratioBase = valueType === 'amount' ? totalAmt : totalQty;
    var ratio = ratioBase > 0 ? ((valueType === 'amount' ? d.amount : d.quantity) / ratioBase * 100).toFixed(1) : '0.0';
    html += '<tr>' +
      '<td>' + d.label + '</td>' +
      '<td>' + d.quantity.toLocaleString() + '</td>' +
      '<td>' + d.amount.toLocaleString() + '</td>' +
      '<td>' + ratio + '%</td>' +
      '</tr>';
  });

  // 합계 행
  html += '<tr class="svra-total-row">' +
    '<td data-i18n="common.total" data-ko="합계" data-en="Total">합계</td>' +
    '<td>' + totalQty.toLocaleString() + '</td>' +
    '<td>' + totalAmt.toLocaleString() + '</td>' +
    '<td>100.0%</td>' +
    '</tr>';

  tbody.innerHTML = html;
}

// ── 차트 렌더링 (자동 전환) ──
function renderChart(data) {
  var chartType = getChartType();
  if (chartType === 'pie') {
    renderPieChart(data);
  } else {
    renderBarChart(data);
  }
}

// ── 수평 막대 차트 ──
function renderBarChart(data) {
  var canvas = document.getElementById('revenueChart');
  var emptyMsg = document.getElementById('chartEmpty');
  var legendDiv = document.getElementById('chartLegend');
  var valueType = document.querySelector('input[name="valueType"]:checked').value;
  var chartPanel = document.getElementById('chartPanel');

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

  // 금액/수량 내림차순 정렬 (상단이 높은 값)
  var sorted = data.slice().sort(function(a, b) {
    return valueType === 'amount' ? a.amount - b.amount : a.quantity - b.quantity;
  });

  var labels = sorted.map(function(d) { return d.label; });
  var values = sorted.map(function(d) {
    return valueType === 'amount' ? d.amount : d.quantity;
  });

  var labelText = valueType === 'amount' ? '금액' : '수량';
  var total = values.reduce(function(sum, v) { return sum + v; }, 0);

  // 범례
  legendDiv.innerHTML =
    '<span class="svra-legend-item"><span class="svra-legend-color" style="background:#43A047;"></span>' + labelText + '</span>' +
    '<span class="svra-legend-item" style="margin-left:8px;font-weight:600;">' + total.toLocaleString() + '</span>';

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
        label: labelText,
        data: values,
        backgroundColor: '#43A047',
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
              return ctx.dataset.label + ': ' + ctx.parsed.x.toLocaleString();
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

// ── 파이 차트 ──
function renderPieChart(data) {
  var canvas = document.getElementById('revenueChart');
  var emptyMsg = document.getElementById('chartEmpty');
  var legendDiv = document.getElementById('chartLegend');
  var valueType = document.querySelector('input[name="valueType"]:checked').value;
  var chartPanel = document.getElementById('chartPanel');

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

  // 금액/수량 내림차순 정렬
  var sorted = data.slice().sort(function(a, b) {
    return valueType === 'amount' ? b.amount - a.amount : b.quantity - a.quantity;
  });

  var labels = sorted.map(function(d) { return d.label; });
  var values = sorted.map(function(d) {
    return valueType === 'amount' ? d.amount : d.quantity;
  });
  var colors = sorted.map(function(_, i) { return pieColors[i % pieColors.length]; });

  var labelText = valueType === 'amount' ? '금액' : '수량';
  var total = values.reduce(function(sum, v) { return sum + v; }, 0);

  // 범례: 색상별 라벨
  var legendHtml = '';
  sorted.forEach(function(d, i) {
    var val = valueType === 'amount' ? d.amount : d.quantity;
    var ratio = total > 0 ? (val / total * 100).toFixed(1) : '0.0';
    legendHtml += '<span class="svra-legend-item">' +
      '<span class="svra-legend-color" style="background:' + colors[i] + ';"></span>' +
      d.label + ' (' + ratio + '%)' +
      '</span>';
  });
  legendDiv.innerHTML = legendHtml;

  // 차트 높이 고정
  chartPanel.style.minHeight = '360px';
  canvas.style.height = '300px';

  if (chartInstance) chartInstance.destroy();

  var ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
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
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var value = ctx.parsed;
              var ratio = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
              return ctx.label + ': ' + value.toLocaleString() + ' (' + ratio + '%)';
            }
          }
        }
      }
    },
    plugins: [{
      id: 'pieLabels',
      afterDatasetsDraw: function(chart) {
        var ctx = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        meta.data.forEach(function(arc, index) {
          var value = chart.data.datasets[0].data[index];
          var ratio = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
          if (parseFloat(ratio) < 5) return; // 5% 미만은 라벨 생략

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

// ── 인쇄 ──
function printPage() {
  window.print();
}

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  togglePeriodType();
  onAnalysisTypeChange();
});
