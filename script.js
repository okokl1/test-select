// public/script.js

let programList = [];
let inputRows = [];

// Wait until the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadProgramTable();
  loadInputTable();

  document.getElementById('searchBtn').addEventListener('click', lookupStudent);
  document.getElementById('studentIdInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') lookupStudent();
  });

  document.getElementById('submitBtn').addEventListener('click', confirmSubmit);
  document.getElementById('filterProgram').addEventListener('change', filterInputTable);

  // Auto-refresh every 30 seconds
  setInterval(() => {
    loadProgramTable();
    loadInputTable();
  }, 30000);
});

// Fetch and render the program table
function loadProgramTable() {
  fetch('/program-data')
    .then(response => response.json())
    .then(data => {
      programList = data;
      const tbody = document.querySelector('#programTable tbody');
      const filter = document.getElementById('filterProgram');
      tbody.innerHTML = '';
      filter.innerHTML = '<option value="">ทั้งหมด</option>';

      data.forEach(r => {
        tbody.insertAdjacentHTML('beforeend', `
          <tr>
            <td>${r.program}</td>
            <td>${r.capacity}</td>
            <td>${r.reserved}</td>
            <td>${r.available}</td>
          </tr>
        `);
        filter.insertAdjacentHTML('beforeend',
          `<option value="${r.program}">${r.program}</option>`);
      });
    })
    .catch(error => console.error('Error loading program data:', error));
}

// Look up student information by studentId
function lookupStudent() {
  resetInputArea();
  const id = document.getElementById('studentIdInput').value.trim();
  if (!id) return;
  fetch(`/student-info?studentId=${encodeURIComponent(id)}`)
    .then(response => response.json())
    .then(res => {
      if (!res.found) {
        showError('ไม่พบข้อมูลนี้ กรุณาตรวจสอบ หรือติดต่อ 0817049291');
        return;
      }
      // Display student information
      document.getElementById('titleField').value = res.title;
      document.getElementById('nameField').value = res.name;
      document.getElementById('surnameField').value = res.surname;
      document.getElementById('nameGroup').classList.remove('hidden');

      // Populate program dropdown for available programs (> 0 seats)
      const select = document.getElementById('programSelect');
      select.innerHTML = '';
      programList
        .filter(p => Number(p.available) > 0)
        .forEach(p => {
          select.insertAdjacentHTML('beforeend',
            `<option value="${p.program}">${p.program}</option>`);
        });
      if (!select.options.length) {
        showError('ที่นั่งเต็มทุกแผนการเรียนแล้ว');
        return;
      }
      document.getElementById('programGroup').classList.remove('hidden');
      document.getElementById('submitBtn').classList.remove('hidden');
    })
    .catch(error => console.error('Error looking up student:', error));
}

// Submit the form data
function confirmSubmit() {
  const id = document.getElementById('studentIdInput').value.trim();
  const title = document.getElementById('titleField').value;
  const name = document.getElementById('nameField').value;
  const surname = document.getElementById('surnameField').value;
  const program = document.getElementById('programSelect').value;

  const msg = `${id} ${title}${name} ${surname} เลือกแผนการเรียน ${program} หากข้อมูลนี้ถูกต้องกรุณากดยืนยัน`;

  Swal.fire({
    icon: 'question',
    title: 'ยืนยันข้อมูล',
    html: msg,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก'
  }).then(result => {
    if (!result.isConfirmed) return;
    // Post the form data to the back end
    fetch('/submit-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, title, name, surname, program })
    })
      .then(response => response.json())
      .then(() => {
        Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1500, showConfirmButton: false });
        resetAll();
      })
      .catch(error => console.error('Error submitting data:', error));
  });
}

// Load submitted data and render the input table
function loadInputTable() {
  fetch('/input-data')
    .then(response => response.json())
    .then(data => {
      inputRows = data;
      renderInputTable(data);
    })
    .catch(error => console.error('Error loading input data:', error));
}

function renderInputTable(rows) {
  const tbody = document.querySelector('#inputTable tbody');
  tbody.innerHTML = '';
  rows.forEach(r => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${r.studentId}</td>
        <td>${r.title}</td>
        <td>${r.name}</td>
        <td>${r.surname}</td>
        <td>${r.program}</td>
      </tr>
    `);
  });
}

function filterInputTable() {
  const selected = document.getElementById('filterProgram').value;
  const filtered = selected ? inputRows.filter(r => r.program === selected) : inputRows;
  renderInputTable(filtered);
}

// Helper functions
function resetInputArea() {
  document.getElementById('nameGroup').classList.add('hidden');
  document.getElementById('programGroup').classList.add('hidden');
  document.getElementById('submitBtn').classList.add('hidden');
  document.getElementById('errorMsg').textContent = '';
}

function resetAll() {
  document.getElementById('studentIdInput').value = '';
  resetInputArea();
  loadProgramTable();
  loadInputTable();
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
}
