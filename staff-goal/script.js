/* ========================================
   아하플러스 v2 — 직원별 목표 관리 Script
   ======================================== */

// ── 데모 데이터 ──
let goalData = [];
let staffList = [
  { name: '원장님', value: 'owner' }
];
let deleteTargetRow = null;
let chartInstance = null;

// ── 뷰 전환 ──
function showGoalSettingView() {
  document.getElementById('goalManageView').style.display = 'none';
  document.getElementById('goalSettingView').style.display = 'block';
  updateSettingPeriodLabel();
}

function showGoalManageView() {
  document.getElementById('goalSettingView').style.display = 'none';
  document.getElementById('goalManageView').style.display = 'block';
  renderGoalTable();
  renderChart();
}

// ── 기간 타입 토글 ──
function togglePeriodType() {
  var type = document.querySelector('input[name="periodType"]:checked').value;
  document.getElementById('goalMonth').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('rangeInputs').style.display = type === 'range' ? 'flex' : 'none';
}

// ── 집계 기준 툴팁 ──
function toggleAggTooltip(e) {
  e.stopPropagation();
  var tooltip = document.getElementById('aggTooltip');
  tooltip.classList.toggle('sg-show');
}

// ── 구분 드롭다운 ──
function toggleCategoryDropdown(e) {
  e.stopPropagation();
  var menu = document.getElementById('categoryMenu');
  menu.classList.toggle('sg-show');
}

function updateCategoryLabel() {
  var checks = document.querySelectorAll('.sg-cat-chk');
  var allChecked = true;
  var names = [];
  checks.forEach(function(chk) {
    if (!chk.checked) allChecked = false;
    else names.push(chk.closest('label').querySelector('span:last-child').textContent);
  });
  var label = document.getElementById('categoryLabel');
  if (allChecked || names.length === 0) {
    label.textContent = '전체';
  } else {
    label.textContent = names.join(', ');
  }
}

// ── 직원 추가 드롭다운 ──
function toggleStaffDropdown(e) {
  e.stopPropagation();
  var menu = document.getElementById('staffMenu');
  menu.classList.toggle('sg-show');
}

function toggleStaffSelectAll() {
  var allChk = document.getElementById('staffSelectAll');
  var checks = document.querySelectorAll('.sg-staff-chk');
  checks.forEach(function(chk) { chk.checked = allChk.checked; });
}

// ── 직원 목록에 추가 ──
function addStaffToList() {
  var checks = document.querySelectorAll('.sg-staff-chk:checked');
  if (checks.length === 0) return;

  var tbody = document.getElementById('settingTableBody');
  var emptyRow = tbody.querySelector('.sg-empty-row');
  if (emptyRow) emptyRow.remove();

  checks.forEach(function(chk) {
    var name = chk.value;
    // 이미 추가되어 있으면 스킵
    var existing = tbody.querySelectorAll('tr[data-staff]');
    var dup = false;
    existing.forEach(function(r) { if (r.dataset.staff === name) dup = true; });
    if (dup) return;

    var tr = document.createElement('tr');
    tr.setAttribute('data-staff', name);
    tr.innerHTML =
      '<td>' + name + '</td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="service" placeholder="" oninput="formatNumber(this)" /></td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="product" placeholder="" oninput="formatNumber(this)" /></td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="prepaid" placeholder="" oninput="formatNumber(this)" /></td>' +
      '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="ticket" placeholder="" oninput="formatNumber(this)" /></td>' +
      '<td><button class="sg-del-btn" onclick="openDeleteModal(this)" data-i18n="sg.delete" data-ko="삭제" data-en="Delete">삭제</button></td>';
    tbody.appendChild(tr);
    chk.checked = false;
  });
  document.getElementById('staffSelectAll').checked = false;

  // 드롭다운 닫기
  document.getElementById('staffMenu').classList.remove('sg-show');
  updateSaveButtonState();
}

// ── 숫자 포맷 (콤마) ──
function formatNumber(el) {
  var val = el.value.replace(/[^0-9]/g, '');
  if (val === '') { el.value = ''; return; }
  el.value = Number(val).toLocaleString();
}

function parseNumber(str) {
  return parseInt((str || '0').replace(/,/g, ''), 10) || 0;
}

// ── 저장 버튼 상태 ──
function updateSaveButtonState() {
  var rows = document.querySelectorAll('#settingTableBody tr[data-staff]');
  var btn = document.getElementById('saveGoalBtn');
  if (rows.length > 0) {
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  } else {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  }
}

// ── 삭제 모달 ──
function openDeleteModal(btn) {
  deleteTargetRow = btn.closest('tr');
  document.getElementById('deleteModal').style.display = 'flex';
  document.getElementById('confirmDeleteBtn').onclick = confirmDelete;
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  deleteTargetRow = null;
}

function confirmDelete() {
  if (deleteTargetRow) {
    var staffName = deleteTargetRow.dataset.staff;
    deleteTargetRow.remove();
    // goalData에서도 제거
    goalData = goalData.filter(function(d) { return d.name !== staffName; });
    // 빈 행 표시
    var tbody = document.getElementById('settingTableBody');
    if (!tbody.querySelector('tr[data-staff]')) {
      tbody.innerHTML = '<tr class="sg-empty-row"><td colspan="6" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data available.">내역이 없습니다.</td></tr>';
    }
    updateSaveButtonState();
  }
  closeDeleteModal();
}

// ── 저장 ──
function saveGoals() {
  var rows = document.querySelectorAll('#settingTableBody tr[data-staff]');
  goalData = [];
  rows.forEach(function(row) {
    var inputs = row.querySelectorAll('.sg-goal-input');
    var service = parseNumber(inputs[0].value);
    var product = parseNumber(inputs[1].value);
    var prepaid = parseNumber(inputs[2].value);
    var ticket = parseNumber(inputs[3].value);
    if (service === 0 && product === 0 && prepaid === 0 && ticket === 0) return;
    goalData.push({
      name: row.dataset.staff,
      service: service,
      product: product,
      prepaid: prepaid,
      ticket: ticket,
      total: service + product + prepaid + ticket
    });
  });
  alert('저장되었습니다.');
}

// ── 전월 목표 복사 ──
function copyPrevMonth() {
  if (goalData.length === 0) {
    alert('복사할 전월 목표 데이터가 없습니다.');
    return;
  }
  var tbody = document.getElementById('settingTableBody');
  var emptyRow = tbody.querySelector('.sg-empty-row');
  if (emptyRow) emptyRow.remove();

  goalData.forEach(function(d) {
    var existing = tbody.querySelector('tr[data-staff="' + d.name + '"]');
    if (existing) {
      var inputs = existing.querySelectorAll('.sg-goal-input');
      inputs[0].value = d.service.toLocaleString();
      inputs[1].value = d.product.toLocaleString();
      inputs[2].value = d.prepaid.toLocaleString();
      inputs[3].value = d.ticket.toLocaleString();
    } else {
      var tr = document.createElement('tr');
      tr.setAttribute('data-staff', d.name);
      tr.innerHTML =
        '<td>' + d.name + '</td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="service" value="' + d.service.toLocaleString() + '" oninput="formatNumber(this)" /></td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="product" value="' + d.product.toLocaleString() + '" oninput="formatNumber(this)" /></td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="prepaid" value="' + d.prepaid.toLocaleString() + '" oninput="formatNumber(this)" /></td>' +
        '<td><input type="text" class="sg-input-number sg-goal-input" data-cat="ticket" value="' + d.ticket.toLocaleString() + '" oninput="formatNumber(this)" /></td>' +
        '<td><button class="sg-del-btn" onclick="openDeleteModal(this)" data-i18n="sg.delete" data-ko="삭제" data-en="Delete">삭제</button></td>';
      tbody.appendChild(tr);
    }
  });
  updateSaveButtonState();
}

// ── 목표 관리 테이블 렌더링 ──
function renderGoalTable() {
  var tbody = document.getElementById('goalTableBody');
  if (goalData.length === 0) {
    tbody.innerHTML = '<tr class="sg-empty-row"><td colspan="11" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data available.">내역이 없습니다.</td></tr>';
    return;
  }

  var html = '';
  var totalService = 0, totalProduct = 0, totalPrepaid = 0, totalTicket = 0, totalAll = 0;

  goalData.forEach(function(d) {
    totalService += d.service;
    totalProduct += d.product;
    totalPrepaid += d.prepaid;
    totalTicket += d.ticket;
    totalAll += d.total;

    html += '<tr>' +
      '<td>' + d.name + '</td>' +
      '<td>0<br/>/' + d.service.toLocaleString() + '</td>' +
      '<td></td>' +
      '<td>0<br/>/' + d.product.toLocaleString() + '</td>' +
      '<td></td>' +
      '<td>0<br/>/' + d.prepaid.toLocaleString() + '</td>' +
      '<td></td>' +
      '<td>0<br/>/' + d.ticket.toLocaleString() + '</td>' +
      '<td></td>' +
      '<td>0<br/>/' + d.total.toLocaleString() + '</td>' +
      '<td></td>' +
      '</tr>';
  });

  // 합계 행
  html += '<tr class="sg-total-row">' +
    '<td data-i18n="sg.total" data-ko="합계" data-en="Total">합계</td>' +
    '<td>0<br/>/' + totalService.toLocaleString() + '</td>' +
    '<td></td>' +
    '<td>0<br/>/' + totalProduct.toLocaleString() + '</td>' +
    '<td></td>' +
    '<td>0<br/>/' + totalPrepaid.toLocaleString() + '</td>' +
    '<td></td>' +
    '<td>0<br/>/' + totalTicket.toLocaleString() + '</td>' +
    '<td></td>' +
    '<td>0<br/>/' + totalAll.toLocaleString() + '</td>' +
    '<td></td>' +
    '</tr>';

  tbody.innerHTML = html;
}

// ── 차트 렌더링 ──
function renderChart() {
  var canvas = document.getElementById('goalChart');
  var emptyMsg = document.getElementById('chartEmpty');
  var legend = document.getElementById('chartLegend');

  if (goalData.length === 0) {
    canvas.style.display = 'none';
    emptyMsg.style.display = '';
    legend.style.display = 'none';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  emptyMsg.style.display = 'none';
  canvas.style.display = 'block';
  legend.style.display = 'flex';

  var labels = goalData.map(function(d) { return d.name; });
  var totals = goalData.map(function(d) { return d.total; });
  var achieved = goalData.map(function() { return 0; }); // 데모: 달성 0
  var remaining = totals.slice();

  if (chartInstance) chartInstance.destroy();

  var ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '달성',
          data: achieved,
          backgroundColor: '#43A047',
          barPercentage: 0.5
        },
        {
          label: '잔여목표',
          data: remaining,
          backgroundColor: '#E0E0E0',
          barPercentage: 0.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ctx.dataset.label + ': ' + ctx.parsed.y.toLocaleString();
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { family: 'Pretendard', size: 12 },
            color: '#616161'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            font: { family: 'Pretendard', size: 11 },
            color: '#9E9E9E',
            callback: function(v) { return v.toLocaleString(); }
          },
          grid: { color: '#F5F5F5' }
        }
      }
    }
  });

  // 차트 위에 목표값 표시
  canvas.parentElement.style.minHeight = '360px';
}

// ── 검색 ──
function searchGoal() {
  renderGoalTable();
  renderChart();
}

function searchSetting() {
  updateSettingPeriodLabel();
}

// ── 설정 기간 라벨 ──
function updateSettingPeriodLabel() {
  var y = document.getElementById('settingYear').value;
  var m = document.getElementById('settingMonth').value;
  document.getElementById('settingPeriodLabel').textContent = y + '년 ' + parseInt(m) + '월';
}

// ── 외부 클릭 시 드롭다운/툴팁 닫기 ──
document.addEventListener('click', function(e) {
  // 카테고리 드롭다운
  if (!e.target.closest('#categoryDropdown')) {
    document.getElementById('categoryMenu').classList.remove('sg-show');
  }
  // 직원 드롭다운
  if (!e.target.closest('#staffAddDropdown')) {
    document.getElementById('staffMenu').classList.remove('sg-show');
  }
  // 툴팁
  if (!e.target.closest('#aggHelpBtn') && !e.target.closest('#aggTooltip')) {
    document.getElementById('aggTooltip').classList.remove('sg-show');
  }
});

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  updateSaveButtonState();
  updateSettingPeriodLabel();
});
