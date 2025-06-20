// --- main.js ---

// ---------- Master test list ----------
const baseTests = [
  { code: "FBS", description: "Fasting Blood Sugar", rate: 60 },
  { code: "HbA1c", description: "Glycated Hemoglobin", rate: 350 },
  { code: "CBP", description: "Complete Blood Picture", rate: 250 },
  { code: "THY", description: "Thyroid Profile", rate: 350 },
];

let testOptions = [...baseTests];   // grows when custom added
let selectedTests = [];             // rows on the bill

// ---------- Helpers ----------
const el = id => document.getElementById(id);

function renderDropdown() {
  const sel = el("testSelect");
  sel.innerHTML = '<option value="">Select a test</option>';
  testOptions.forEach((t, i) => {
    if (!selectedTests.some(s => s.code === t.code)) {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = `${t.code} – ${t.description} – ₹${t.rate}`;
      sel.appendChild(o);
    }
  });
}

function updateTotals() {
  const subtotal = selectedTests.reduce((sum, t) => sum + t.qty * t.rate, 0);
  const discount = parseFloat(el("discount").value) || 0;
  el("subtotal").textContent = subtotal.toFixed(2);
  el("total").textContent = (subtotal - discount).toFixed(2);
}

function renderTable() {
  const tbody = document.querySelector("#testTableScroll tbody");
  tbody.innerHTML = "";

  selectedTests.forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class=\"p-2 border\">${i + 1}</td>
      <td class=\"p-2 border\">${t.code}</td>
      <td class=\"p-2 border text-right\">
        <input type=\"number\" min=\"0\" value=\"${(t.qty * t.rate).toFixed(2)}\"
          class=\"w-24 text-right border rounded\"
          style=\"font-size:16px\"
          onchange=\"updateAmount(${i}, this.value)\">
      </td>
      <td class=\"p-2 border text-center\">
        <button data-remove-index=\"${i}\" class=\"remove-test-btn text-red-600 transition-transform hover:scale-125\">&times;</button>
      </td>
    `;
    tr.classList.add('animate-fadein');
    tbody.appendChild(tr);
  });

  // Event delegation for remove test button (re-attach every render)
  tbody.onclick = function(e) {
    const btn = e.target.closest('.remove-test-btn');
    if (btn) {
      const idx = parseInt(btn.getAttribute('data-remove-index'));
      if (!isNaN(idx)) removeTest(idx);
    }
  };

  renderDropdown();
  updateTotals();
}

// ---------- CRUD operations ----------
function addSelectedTest() {
  const idx = el("testSelect").value;
  if (idx === "") return;
  const test = { ...testOptions[idx], qty: 1 };
  selectedTests.push(test);
  renderTable();
  const scrollDiv = document.getElementById('testTableScroll');
  if (scrollDiv) scrollDiv.scrollTop = 0;
  showToast("Test Added!");
}

function addCustomTest() {
  const code = el("customCode").value.trim();
  const description = el("customDesc").value.trim();
  const rate = parseFloat(el("customRate").value);
  if (!code || !description || isNaN(rate)) return alert("Fill custom test fields!");
  testOptions.push({ code, description, rate });
  el("customCode").value = el("customDesc").value = el("customRate").value = "";
  renderDropdown();
  const scrollDiv = document.getElementById('testTableScroll');
  if (scrollDiv) scrollDiv.scrollTop = 0;
  showToast("Custom Test Added!");
}

function updateQty(i, val) {
  selectedTests[i].qty = parseInt(val) || 1;
  renderTable();
}
function updateRate(i, val) {
  selectedTests[i].rate = parseFloat(val) || 0;
  renderTable();
}
function removeTest(i) {
  const tbody = document.querySelector("#testTableScroll tbody");
  const row = tbody.children[i];
  if (row) {
    row.classList.add('animate-fadeout');
    setTimeout(() => {
      selectedTests.splice(i, 1);
      renderTable();
      showToast("Test Removed!");
    }, 300);
  } else {
    selectedTests.splice(i, 1);
    renderTable();
    showToast("Test Removed!");
  }
}

// ---------- Save + PDF ----------
async function getNextReceiptNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const res = await fetch('https://api.counterapi.dev/v1/counter/increment', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ut_d7x6BEQVJTQRMv64x5JKFBWGGIDYDnKxHH1pJ52R',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key: 'receipt' })
  });
  const data = await res.json();
  const last3 = data.value.toString().padStart(3, "0");
  return `AD-${today}-${last3}`;
}

async function saveAndPDF() {
  if (!el("name").value.trim()) return alert("Patient name required");
  if (!/^\d{10}$/.test(el("phone").value)) return alert("Enter a valid 10‑digit mobile");

  const patientInfo = {
    name: el("prefix").value + ' ' + el("name").value.trim(),
    age: el("age").value.trim(),
    gender: el("gender").value,
    phone: el("phone").value.trim(),
    date: el("date").value,
  };

  const discount = parseFloat(el("discount").value) || 0;
  const subtotal = parseFloat(el("subtotal").textContent);
  const total = parseFloat(el("total").textContent);
  const paymentMode = el("payment").value;

  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patientInfo, tests: selectedTests, subtotal, discount, total, paymentMode })
    });
    const data = await response.json();
    const receiptNo = data.receipt || data.receiptNo || "AD-XXXXXX-XXX";
    generatePDF({ ...patientInfo, receiptNo, tests: selectedTests, total, payment: paymentMode });
  } catch (err) {
    alert("Failed to save or fetch receipt number. PDF will use placeholder.");
    generatePDF({ ...patientInfo, receiptNo: "AD-XXXXXX-XXX", tests: selectedTests, total, payment: paymentMode });
  }
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  el("date").value = new Date().toISOString().slice(0, 10);
  renderDropdown();

  el("addBtn").onclick = addSelectedTest;
  el("addCustomBtn").onclick = addCustomTest;
  el("discount").oninput = updateTotals;
  el("saveBtn").onclick = saveAndPDF;
});

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.pointerEvents = 'auto';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.pointerEvents = 'none';
  }, 1500);
}

// Add updateAmount function
function updateAmount(i, val) {
  const amount = parseFloat(val) || 0;
  selectedTests[i].rate = amount; // since qty is always 1
  renderTable();
}
