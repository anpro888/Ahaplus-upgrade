/* ========================================
   아하플러스 v2 — 출퇴근 관리 Script
   prefix: tc-
   ======================================== */

// ── 데모 데이터 ──
var tcRecords = [
  { date: '2025-11-03', staff: 'Jimmy', inTime: '19:03', outTime: '', hoursWorked: '', absent: '', ip: '89.147.101.199', notes: '', tardy: false, leaveEarly: false },
  { date: '2025-11-03', staff: 'Suji', inTime: '18:48', outTime: '18:48', hoursWorked: '0 Hours 0 Minutes', absent: '', ip: '89.147.101.199/89.147.101.199', notes: '', tardy: false, leaveEarly: false },
  { date: '2025-11-03', staff: 'Alice', inTime: '18:41', outTime: '18:47', hoursWorked: '0 Hours 5 Minutes', absent: '', ip: '89.147.101.199/89.147.101.199', notes: '', tardy: false, leaveEarly: false }
];

var workingHoursData = {
  1: [
    { start: '09:00', finish: '18:30', days: '월, 화, 수, 목, 금, 토' },
    { start: '09:00', finish: '14:00', days: '일' }
  ],
  2: []
};

var editingIndex = -1;
var editingWhStaffId = null;
var editingWhIndex = -1;
var deleteCallback = null;

// ── 뷰 전환 ──
function showTimeClockView() {
  document.getElementById('timeClockView').style.display = 'block';
  document.getElementById('workingHoursView').style.display = 'none';
  document.getElementById('daysWorkedView').style.display = 'none';
}

function showWorkingHoursView() {
  document.getElementById('timeClockView').style.display = 'none';
  document.getElementById('workingHoursView').style.display = 'block';
  document.getElementById('daysWorkedView').style.display = 'none';
  renderWhTable();
}

function showDaysWorkedView() {
  document.getElementById('timeClockView').style.display = 'none';
  document.getElementById('workingHoursView').style.display = 'none';
  document.getElementById('daysWorkedView').style.display = 'block';
}

// ── 기간 필터 토글 ──
function toggleTcPeriod() {
  var type = document.querySelector('input[name="tcPeriodType"]:checked').value;
  document.getElementById('tcDailyDate').style.display = type === 'daily' ? '' : 'none';
  document.getElementById('tcMonthDate').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('tcRangeInputs').style.display = type === 'range' ? 'flex' : 'none';
}

function toggleDwPeriod() {
  var type = document.querySelector('input[name="dwPeriodType"]:checked').value;
  document.getElementById('dwMonthDate').style.display = type === 'monthly' ? '' : 'none';
  document.getElementById('dwRangeInputs').style.display = type === 'range' ? 'flex' : 'none';
}

// ── 현재 시각 포맷 ──
function formatCurrentTime() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  var hours = now.getHours();
  var mins = String(now.getMinutes()).padStart(2, '0');
  var secs = String(now.getSeconds()).padStart(2, '0');
  var ampm = hours >= 12 ? 'PM' : 'AM';
  var h12 = hours % 12 || 12;
  return y + '-' + m + '-' + d + '    ' + String(h12).padStart(2, '0') + ':' + mins + ':' + secs + ' ' + ampm;
}

// ── 모달 공통 ──
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ── 출근 등록 ──
function openClockInModal() {
  document.getElementById('clockInTime').textContent = formatCurrentTime();
  document.getElementById('clockInStaff').value = '';
  document.getElementById('clockInNotes').value = '';
  document.getElementById('clockInModal').style.display = 'flex';
}

function saveClockIn() {
  var staff = document.getElementById('clockInStaff').value;
  if (!staff) {
    alert('직원을 선택하세요.');
    return;
  }
  var now = new Date();
  var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var staffName = document.getElementById('clockInStaff').selectedOptions[0].text;

  tcRecords.push({
    date: dateStr,
    staff: staffName,
    inTime: timeStr,
    outTime: '',
    hoursWorked: '',
    absent: '',
    ip: '127.0.0.1',
    notes: document.getElementById('clockInNotes').value,
    tardy: false,
    leaveEarly: false
  });

  closeModal('clockInModal');
  renderTcTable();
}

// ── 퇴근 등록 ──
function openClockOutModal() {
  document.getElementById('clockOutTime').textContent = formatCurrentTime();
  document.getElementById('clockOutStaff').value = '';
  document.getElementById('clockOutNotes').value = '';
  document.getElementById('clockOutModal').style.display = 'flex';
}

function openClockOutModalForRow(index) {
  document.getElementById('clockOutTime').textContent = formatCurrentTime();
  var record = tcRecords[index];
  if (record) {
    var staffSelect = document.getElementById('clockOutStaff');
    for (var i = 0; i < staffSelect.options.length; i++) {
      if (staffSelect.options[i].text === record.staff) {
        staffSelect.selectedIndex = i;
        break;
      }
    }
  }
  document.getElementById('clockOutNotes').value = '';
  document.getElementById('clockOutModal').style.display = 'flex';
}

function saveClockOut() {
  var staff = document.getElementById('clockOutStaff').value;
  if (!staff) {
    alert('직원을 선택하세요.');
    return;
  }
  var staffName = document.getElementById('clockOutStaff').selectedOptions[0].text;
  var now = new Date();
  var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  // 해당 직원의 퇴근 미등록 레코드 찾기
  for (var i = 0; i < tcRecords.length; i++) {
    if (tcRecords[i].staff === staffName && !tcRecords[i].outTime) {
      tcRecords[i].outTime = timeStr;
      tcRecords[i].hoursWorked = calcHoursWorked(tcRecords[i].inTime, timeStr);
      break;
    }
  }

  closeModal('clockOutModal');
  renderTcTable();
}

// ── 결근 등록 ──
function openAbsentModal() {
  var today = new Date();
  document.getElementById('absentDate').value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  document.getElementById('absentStaff').value = '';
  document.getElementById('absentNotes').value = '';
  document.getElementById('absentModal').style.display = 'flex';
}

function saveAbsent() {
  var staff = document.getElementById('absentStaff').value;
  if (!staff) {
    alert('직원을 선택하세요.');
    return;
  }
  var date = document.getElementById('absentDate').value;
  var staffName = document.getElementById('absentStaff').selectedOptions[0].text;

  tcRecords.push({
    date: date,
    staff: staffName,
    inTime: '',
    outTime: '',
    hoursWorked: '',
    absent: 'Y',
    ip: '',
    notes: document.getElementById('absentNotes').value,
    tardy: false,
    leaveEarly: false
  });

  closeModal('absentModal');
  renderTcTable();
}

// ── 근무 시간 계산 ──
function calcHoursWorked(inTime, outTime) {
  if (!inTime || !outTime) return '';
  var inParts = inTime.split(':');
  var outParts = outTime.split(':');
  var inMin = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
  var outMin = parseInt(outParts[0]) * 60 + parseInt(outParts[1]);
  // 익일 퇴근 처리
  if (outMin <= inMin) {
    outMin += 24 * 60;
  }
  var diff = outMin - inMin;
  var hours = Math.floor(diff / 60);
  var mins = diff % 60;
  return hours + ' Hours ' + mins + ' Minutes';
}

// ── 퇴근 등록 버튼 표시 여부 (출근 다음날 12:00 이후이면 숨김) ──
function canShowAddOutButton(record) {
  if (record.outTime || record.absent === 'Y') return false;
  if (!record.inTime) return false;

  var now = new Date();
  var dateParts = record.date.split('-');
  var clockInDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  var nextDayNoon = new Date(clockInDate);
  nextDayNoon.setDate(nextDayNoon.getDate() + 1);
  nextDayNoon.setHours(12, 0, 0, 0);

  return now < nextDayNoon;
}

// ── 출퇴근 테이블 렌더 ──
function renderTcTable() {
  var tbody = document.getElementById('tcTableBody');
  if (tcRecords.length === 0) {
    tbody.innerHTML = '<tr class="tc-empty-row"><td colspan="9" data-i18n="common.noData" data-ko="내역이 없습니다." data-en="No data available.">내역이 없습니다.</td></tr>';
    return;
  }

  var html = '';
  tcRecords.forEach(function(r, idx) {
    html += '<tr>';
    html += '<td>' + r.date + '</td>';
    html += '<td>' + r.staff + '</td>';
    html += '<td>' + r.inTime + '</td>';

    // 퇴근 시각: 없으면 등록 버튼
    if (!r.outTime && r.absent !== 'Y') {
      if (canShowAddOutButton(r)) {
        html += '<td><button class="tc-btn-add" onclick="openClockOutModalForRow(' + idx + ')" data-i18n="tc.add" data-ko="등록" data-en="Add">등록</button></td>';
      } else {
        html += '<td></td>';
      }
    } else {
      html += '<td>' + (r.outTime || '') + '</td>';
    }

    html += '<td>' + r.hoursWorked + '</td>';
    html += '<td>' + r.absent + '</td>';
    html += '<td>' + r.ip + '</td>';
    html += '<td>' + r.notes + '</td>';
    html += '<td><button class="tc-btn-edit" onclick="openEditModal(' + idx + ')" data-i18n="tc.editBtn" data-ko="수정" data-en="Edit">수정</button></td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

// ── 출퇴근 수정 모달 ──
function openEditModal(index) {
  editingIndex = index;
  var record = tcRecords[index];

  document.getElementById('editDate').value = record.date;
  document.getElementById('editStaffName').textContent = record.staff;
  document.getElementById('editTardy').checked = record.tardy || false;
  document.getElementById('editLeaveEarly').checked = record.leaveEarly || false;

  // 시간 셀렉트 초기화 (출근: 0~23시, 퇴근: 0~다음날12시=36시)
  populateHourSelect('editInHour', 0, 23, record.inTime ? parseInt(record.inTime.split(':')[0]) : '');
  populateMinSelect('editInMin', record.inTime ? parseInt(record.inTime.split(':')[1]) : '');

  // 퇴근: 다음날 12:00 PM까지 선택 가능
  populateHourSelectNextDay('editOutHour', record.outTime ? parseInt(record.outTime.split(':')[0]) : '');
  populateMinSelect('editOutMin', record.outTime ? parseInt(record.outTime.split(':')[1]) : '');

  // 기준 시간 (근무 시간 설정에서 가져옴) - 데모용
  populateHourSelect('editRefInHour', 0, 23, '');
  populateMinSelect('editRefInMin', '');
  populateHourSelectNextDay('editRefOutHour', '');
  populateMinSelect('editRefOutMin', '');

  document.getElementById('editModal').style.display = 'flex';
}

function saveEditTimeClock() {
  if (editingIndex < 0) return;
  var record = tcRecords[editingIndex];

  var inHour = document.getElementById('editInHour').value;
  var inMin = document.getElementById('editInMin').value;
  var outHour = document.getElementById('editOutHour').value;
  var outMin = document.getElementById('editOutMin').value;

  // 출근 시간 설정
  if (inHour !== '' && inMin !== '') {
    record.inTime = String(inHour).padStart(2, '0') + ':' + String(inMin).padStart(2, '0');
  }

  // 퇴근 시간 설정
  if (outHour !== '' && outMin !== '') {
    var outH = parseInt(outHour);
    var inH = parseInt(inHour);
    var outM = parseInt(outMin);
    var inM = parseInt(inMin);

    // 퇴근 시간 <= 출근 시간 검증
    var outTotal = outH * 60 + outM;
    var inTotal = inH * 60 + inM;

    // 익일인 경우 (outH가 0~11이고 inH가 12 이상이면 익일로 판단)
    if (outH >= 24) {
      // 명시적으로 다음날 시간
    } else if (outTotal <= inTotal && outH < inH) {
      // 익일 퇴근으로 간주
    } else if (outTotal <= inTotal) {
      alert('퇴근 시간은 출근 시간보다 나중이어야 합니다.');
      return;
    }

    record.outTime = String(outH > 23 ? outH - 24 : outH).padStart(2, '0') + ':' + String(outM).padStart(2, '0');
    record.hoursWorked = calcHoursWorked(record.inTime, record.outTime);
  }

  record.date = document.getElementById('editDate').value;
  record.tardy = document.getElementById('editTardy').checked;
  record.leaveEarly = document.getElementById('editLeaveEarly').checked;

  closeModal('editModal');
  renderTcTable();
}

function deleteTimeClock() {
  if (editingIndex < 0) return;
  deleteCallback = function() {
    tcRecords.splice(editingIndex, 1);
    editingIndex = -1;
    closeModal('editModal');
    renderTcTable();
  };
  document.getElementById('confirmDeleteBtn').onclick = function() {
    if (deleteCallback) deleteCallback();
    closeModal('deleteConfirmModal');
    deleteCallback = null;
  };
  document.getElementById('deleteConfirmModal').style.display = 'flex';
}

// ── 시간 셀렉트 생성 ──
function populateHourSelect(id, min, max, selectedVal) {
  var select = document.getElementById(id);
  select.innerHTML = '<option value="">Select</option>';
  for (var h = min; h <= max; h++) {
    var opt = document.createElement('option');
    opt.value = h;
    opt.textContent = String(h).padStart(2, '0');
    if (selectedVal !== '' && parseInt(selectedVal) === h) opt.selected = true;
    select.appendChild(opt);
  }
}

function populateHourSelectNextDay(id, selectedVal) {
  var select = document.getElementById(id);
  select.innerHTML = '<option value="">Select</option>';
  // 0~23 (당일) + 24~35 (다음날 00:00~11:00 = 표시: +1일 00~11)
  for (var h = 0; h <= 35; h++) {
    var opt = document.createElement('option');
    opt.value = h;
    if (h <= 23) {
      opt.textContent = String(h).padStart(2, '0');
    } else {
      opt.textContent = '+1일 ' + String(h - 24).padStart(2, '0');
    }
    if (selectedVal !== '' && parseInt(selectedVal) === h) opt.selected = true;
    select.appendChild(opt);
  }
}

function populateMinSelect(id, selectedVal) {
  var select = document.getElementById(id);
  select.innerHTML = '<option value="">Select</option>';
  for (var m = 0; m <= 59; m++) {
    var opt = document.createElement('option');
    opt.value = m;
    opt.textContent = String(m).padStart(2, '0');
    if (selectedVal !== '' && parseInt(selectedVal) === m) opt.selected = true;
    select.appendChild(opt);
  }
}

// ── 검색 ──
function searchTimeClock() {
  renderTcTable();
}

function searchDaysWorked() {
  // 데모: 검색 시 집계 데이터 갱신 없음
}

// ── 인쇄 ──
function printTimeClock() {
  window.print();
}

function printDaysWorked() {
  window.print();
}

// ── 집계 상세 ──
function viewDaysWorkedDetail(staffName) {
  // 데모: 상세 보기 시 출퇴근 관리 뷰로 전환
  showTimeClockView();
}

// ══════════════════════════════════════════
//   근무 시간 설정
// ══════════════════════════════════════════

// ── 근무 시간 테이블 렌더 ──
function renderWhTable() {
  var tbody = document.getElementById('whTableBody');
  var html = '';
  var staffList = [
    { id: 1, name: '홍길동' },
    { id: 2, name: '김철수' }
  ];

  staffList.forEach(function(s) {
    var schedules = workingHoursData[s.id] || [];
    html += '<tr data-staff-id="' + s.id + '">';
    html += '<td>' + s.id + '</td>';
    html += '<td>' + s.name + '</td>';
    html += '<td class="tc-wh-info">';
    if (schedules.length > 0) {
      schedules.forEach(function(sch) {
        html += sch.start + ' ~ ' + sch.finish + ' ' + sch.days + '<br/>';
      });
    }
    html += '</td>';
    if (schedules.length > 0) {
      html += '<td><button class="tc-btn-edit" onclick="openWorkingHourSetupModal(' + s.id + ')">' + '수정' + '</button></td>';
    } else {
      html += '<td><button class="tc-btn-add" onclick="openWorkingHourSetupModal(' + s.id + ')">' + '등록' + '</button></td>';
    }
    html += '</tr>';
  });

  tbody.innerHTML = html;
}

// ── 근무시간 설정 모달 (목록) ──
function openWorkingHourSetupModal(staffId) {
  editingWhStaffId = staffId;
  renderWhSetupTable();
  document.getElementById('whSetupModal').style.display = 'flex';
}

function renderWhSetupTable() {
  var tbody = document.getElementById('whSetupTableBody');
  var schedules = workingHoursData[editingWhStaffId] || [];

  if (schedules.length === 0) {
    tbody.innerHTML = '<tr class="tc-empty-row"><td colspan="4" data-i18n="common.noData" data-ko="내역이 없습니다" data-en="No data for table">내역이 없습니다</td></tr>';
    return;
  }

  var html = '';
  schedules.forEach(function(sch, idx) {
    html += '<tr>';
    html += '<td>' + sch.start + '</td>';
    html += '<td>' + sch.finish + '</td>';
    html += '<td>' + sch.days + '</td>';
    html += '<td>';
    html += '<button class="tc-btn-edit" onclick="editWorkingHour(' + idx + ')" style="margin-right:4px;" data-i18n="tc.editBtn" data-ko="수정" data-en="Edit">수정</button>';
    html += '<button class="tc-btn-edit" onclick="deleteWorkingHour(' + idx + ')" style="color:#F06060;border-color:#F06060;" data-i18n="tc.delete" data-ko="삭제" data-en="Delete">삭제</button>';
    html += '</td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

// ── 근무시간 등록 모달 ──
function openAddWhModal() {
  editingWhIndex = -1;
  populateTimeOptions('whStartTime', false);
  populateTimeOptions('whFinishTime', true);
  document.getElementById('whDayOfWeek').value = '';
  document.getElementById('addWhModal').style.display = 'flex';
}

function editWorkingHour(index) {
  editingWhIndex = index;
  var schedules = workingHoursData[editingWhStaffId] || [];
  var sch = schedules[index];

  populateTimeOptions('whStartTime', false);
  populateTimeOptions('whFinishTime', true);

  document.getElementById('whStartTime').value = sch.start;
  document.getElementById('whFinishTime').value = sch.finish;

  // 요일 매핑 (복수 요일 → 첫번째만 선택, 데모용)
  var dayMap = { '월': 'mon', '화': 'tue', '수': 'wed', '목': 'thu', '금': 'fri', '토': 'sat', '일': 'sun' };
  var firstDay = sch.days.split(',')[0].trim();
  document.getElementById('whDayOfWeek').value = dayMap[firstDay] || '';

  document.getElementById('addWhModal').style.display = 'flex';
}

function deleteWorkingHour(index) {
  deleteCallback = function() {
    var schedules = workingHoursData[editingWhStaffId] || [];
    schedules.splice(index, 1);
    workingHoursData[editingWhStaffId] = schedules;
    renderWhSetupTable();
    renderWhTable();
  };
  document.getElementById('confirmDeleteBtn').onclick = function() {
    if (deleteCallback) deleteCallback();
    closeModal('deleteConfirmModal');
    deleteCallback = null;
  };
  document.getElementById('deleteConfirmModal').style.display = 'flex';
}

function saveWorkingHour() {
  var start = document.getElementById('whStartTime').value;
  var finish = document.getElementById('whFinishTime').value;
  var dayVal = document.getElementById('whDayOfWeek').value;

  if (!start || !finish || !dayVal) {
    alert('모든 항목을 입력하세요.');
    return;
  }

  // 유효성 검증: 종료 시간 <= 시작 시간
  var startMin = timeToMinutes(start);
  var finishMin = timeToMinutes(finish);

  // 다음날 시간인 경우
  if (finish.startsWith('+1일')) {
    finishMin += 24 * 60;
  }

  if (finishMin <= startMin) {
    alert('종료 시간은 시작 시간보다 나중이어야 합니다.');
    return;
  }

  // 24시간 초과 검증
  if (finishMin - startMin > 24 * 60) {
    alert('근무시간은 24시간을 초과할 수 없습니다.');
    return;
  }

  var dayMap = { 'mon': '월', 'tue': '화', 'wed': '수', 'thu': '목', 'fri': '금', 'sat': '토', 'sun': '일' };
  var dayLabel = dayMap[dayVal] || dayVal;

  if (!workingHoursData[editingWhStaffId]) {
    workingHoursData[editingWhStaffId] = [];
  }

  var entry = { start: start, finish: finish, days: dayLabel };

  if (editingWhIndex >= 0) {
    workingHoursData[editingWhStaffId][editingWhIndex] = entry;
  } else {
    workingHoursData[editingWhStaffId].push(entry);
  }

  closeModal('addWhModal');
  renderWhSetupTable();
  renderWhTable();
}

function timeToMinutes(timeStr) {
  // "+1일 HH:MM" or "HH:MM"
  var cleaned = timeStr.replace('+1일 ', '');
  var parts = cleaned.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ── 시간 옵션 생성 (30분 간격) ──
function populateTimeOptions(selectId, includeNextDay) {
  var select = document.getElementById(selectId);
  select.innerHTML = '<option value="">선택</option>';

  // 당일: 00:00 ~ 23:30
  for (var h = 0; h < 24; h++) {
    for (var m = 0; m < 60; m += 30) {
      var val = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    }
  }

  // 다음날: 00:00 ~ 12:00
  if (includeNextDay) {
    for (var h2 = 0; h2 <= 12; h2++) {
      for (var m2 = 0; m2 < 60; m2 += 30) {
        if (h2 === 12 && m2 > 0) break;
        var val2 = '+1일 ' + String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0');
        var opt2 = document.createElement('option');
        opt2.value = val2;
        opt2.textContent = val2;
        select.appendChild(opt2);
      }
    }
  }
}

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', function() {
  renderTcTable();

  // 오늘 날짜 기본값
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  document.getElementById('tcDailyDate').value = todayStr;
});
