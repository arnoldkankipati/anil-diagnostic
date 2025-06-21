function el(id) {
  return document.getElementById(id);
}

const testOptions = [
  { code: "FBS", description: "Fasting Blood Sugar", rate: 60 },
  { code: "HbA1c", description: "Glycated Hemoglobin", rate: 350 },
  { code: "CBP", description: "Complete Blood Picture", rate: 250 },
  { code: "THY", description: "Thyroid Profile", rate: 350 },
];

let selectedTests = [];
let isTestMode = false; // Global test mode flag

// --- Core Helper Functions ---
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

function updateTotals() {
  let subtotal = selectedTests.reduce((sum, t) => sum + (t.rate * (t.qty || 1)), 0);
  let discount = parseFloat(el('discount').value) || 0;
  let total = subtotal - discount;
  el('subtotal').textContent = subtotal.toFixed(2).replace(/\.00$/, '');
  el('total').textContent = total.toFixed(2).replace(/\.00$/, '');
}

function renderTable() {
  const tbody = document.querySelector('#testTableScroll tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  selectedTests.slice().sort((a, b) => a.code.localeCompare(b.code)).forEach((t) => {
    const row = document.createElement('tr');
    const formattedRate = Number.isInteger(t.rate) ? t.rate.toString() : t.rate.toFixed(2);
    row.innerHTML = `
      <td class='p-2 text-center'></td>
      <td class='p-2 text-center'>${t.code}</td>
      <td class='p-2 text-center'>
        <input type="number" min="0" value="${formattedRate}" 
               oninput="updateAmount('${t.code}', this.value)" 
               class="w-24 text-right border rounded px-1 py-0.5 bg-slate-50 focus:ring-2 focus:ring-indigo-300" />
      </td>
      <td class='p-2 text-center'><button onclick="removeTest('${t.code}')" class='text-red-500 hover:text-red-700 font-bold'>&times;</button></td>
    `;
    tbody.appendChild(row);
  });
  updateTotals();
  renderDropdown();
}

function renderDropdown() {
  const select = el('testSelect');
  select.innerHTML = '<option value="" disabled selected>Select a test...</option>';
  const availableTests = testOptions.filter(test =>
    !selectedTests.some(selected => selected.code === test.code)
  );
  availableTests
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.code;
      opt.textContent = `${t.code} — ${t.description} (₹${t.rate})`;
      select.appendChild(opt);
    });
}

function addSelectedTest() {
  const select = el('testSelect');
  const code = select.value;
  const test = testOptions.find(t => t.code === code);
  if (!test) return;
  if (selectedTests.some(t => t.code === code)) {
    showToast("Test already added!");
    return;
  }
  selectedTests.push({ ...test, qty: 1 });
  renderTable();
}

function addCustomTest() {
  const code = el("customCode").value.trim();
  const description = el("customDesc").value.trim();
  const rate = parseFloat(el("customRate").value);
  if (!code || !description || isNaN(rate)) return alert("Fill custom test fields!");
  if (selectedTests.some(t => t.code === code)) {
    showToast("Custom Test already added!");
    return;
  }
  const newTest = { code, description, rate };
  selectedTests.push({ ...newTest, qty: 1 });
  el("customCode").value = el("customDesc").value = el("customRate").value = "";
  renderTable();
  const scrollDiv = document.getElementById('testTableScroll');
  if (scrollDiv) scrollDiv.scrollTop = 0;
  showToast("Custom Test Added!");
  const details = document.getElementById('customTestDetails');
  if (details) details.open = false;
}

function removeTest(code) {
  const testIndex = selectedTests.findIndex(t => t.code === code);
  if (testIndex > -1) {
    selectedTests.splice(testIndex, 1);
    renderTable();
    showToast("Test removed.");
    renderDropdown();
  }
}

function showBillPreview() {
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
  let html = `<div class='mb-2'><b>Patient:</b> ${patientInfo.name} | <b>Age:</b> ${patientInfo.age}</div>`;
  html += `<div class='mb-2'><b>Gender:</b> ${patientInfo.gender} | <b>Phone:</b> ${patientInfo.phone}</div>`;
  html += `<div class='mb-2'><b>Date:</b> ${patientInfo.date} | <b>Payment:</b> ${paymentMode}</div>`;
  html += `<div style='max-height:300px;overflow-y:auto;'><table class='w-full text-left border mb-2'><thead><tr class='bg-slate-100'><th class='p-1'>S.No</th><th class='p-1'>Code</th><th class='p-1'>Description</th><th class='p-1'>Amount (₹)</th></tr></thead><tbody>`;
  selectedTests.slice().sort((a, b) => a.code.localeCompare(b.code)).forEach((t, i) => {
    html += `<tr><td class='p-1'>${i+1}</td><td class='p-1'>${t.code}</td><td class='p-1'>${t.description}</td><td class='p-1'>₹${(t.rate * (t.qty||1)).toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  html += `<div class='text-right'><b>Subtotal:</b> ₹${subtotal.toFixed(2)}<br><b>Discount:</b> ₹${discount.toFixed(2)}<br><span class='text-xl font-bold text-accent'>Total: ₹${total.toFixed(2)}</span></div>`;
  el('billPreviewContent').innerHTML = html;
  const modal = el('billPreviewModal');
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'auto';
}

function hideBillPreview() {
  const modal = el('billPreviewModal');
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
}

function isMobileDevice() {
  return window.innerWidth <= 640; // Tailwind's 'sm' breakpoint
}

function showPdfModal() {
  const modal = el('pdfModal');
  if (!modal) return;

  if (isMobileDevice()) {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.style.display = 'flex'; // Explicitly show as flex
  } else {
    // If not a mobile device, ensure the modal is hidden.
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modal.style.display = 'none'; // Explicitly hide
  }
}

function hidePdfModal() {
  const modal = el('pdfModal');
  if (!modal) return;
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  modal.style.display = 'none'; // Explicitly hide
}

async function saveAndPDF() {
  if (!el("name").value.trim()) return alert("Patient name required");
  if (!/^[0-9]{10}$/.test(el("phone").value)) return alert("Enter a valid 10‑digit mobile");
  showBillPreview();
}

async function realSaveAndPDF() {
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

  if (isTestMode) {
    let ok = false;
    try {
      const res = await fetch(SHEET_URL, { method: 'GET' });
      ok = res.ok;
    } catch (e) {}
    showToast(ok ? 'Sheet connection: OK (no data sent)' : 'Sheet connection: Failed');
    generatePDF({ ...patientInfo, receiptNo: 'AD-TEST-000', tests: selectedTests, total, payment: paymentMode });

    // Handle PDF display based on device
    if (isMobileDevice()) {
      showPdfModal();
    }
    return;
  }

  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patientInfo, tests: selectedTests, subtotal, discount, total, paymentMode })
    });
    const data = await response.json();
    const receiptNo = data.receipt || data.receiptNo || "AD-XXXXXX-XXX";
    const pdfBlob = generatePDF({ ...patientInfo, receiptNo, tests: selectedTests, total, payment: paymentMode });

    // Handle PDF display based on device
    if (isMobileDevice()) {
      showPdfModal();
    }

  } catch (err) {
    alert("Failed to save or fetch receipt number. PDF will use placeholder.");
    const pdfBlob = generatePDF({ ...patientInfo, receiptNo: "AD-XXXXXX-XXX", tests: selectedTests, total, payment: paymentMode });

    // Handle PDF display based on device
    if (isMobileDevice()) {
      showPdfModal();
    }
  }
}

function setTestMode(on) {
  isTestMode = !!on;
  showToast(isTestMode ? "Test Mode ON" : "Test Mode OFF");
  if (isTestMode) {
    el('prefix').value = 'Mr.';
    el('name').value = 'Test Patient';
    el('age').value = '30';
    el('gender').value = 'Male';
    el('phone').value = '9999999999';
    el('date').value = new Date().toISOString().slice(0, 10);
    el('payment').value = 'Cash';
    selectedTests = testOptions.map(t => ({ ...t, qty: 1 }));
    renderDropdown();
    renderTable();
    updateTotals();
  } else {
    el('prefix').value = 'Mr.';
    el('name').value = '';
    el('age').value = '';
    el('gender').value = '';
    el('phone').value = '';
    el('date').value = new Date().toISOString().slice(0, 10);
    el('payment').value = 'Cash';
    selectedTests = [];
    renderDropdown();
    renderTable();
    updateTotals();
  }
}

function updateAmount(code, val) {
  const amount = parseFloat(val) || 0;
  const testIndex = selectedTests.findIndex(t => t.code === code);
  if (testIndex > -1) {
    selectedTests[testIndex].rate = amount;
    renderTable(); // Re-render to update totals and reflect changes
  }
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  el("date").value = new Date().toISOString().slice(0, 10);
  renderDropdown();
  renderTable(); // Ensure table is rendered on load, even if empty

  el("addBtn").onclick = addSelectedTest;
  el("addCustomBtn").onclick = addCustomTest;
  el("discount").oninput = updateTotals;
  el("saveBtn").onclick = saveAndPDF;

  el("name").focus();

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveAndPDF();
    }
    if (document.activeElement === el('testSelect') && e.key === 'Enter') {
      e.preventDefault();
      addSelectedTest();
    }
  });

  const title = document.querySelector('h1');
  if (title) {
    let clickCount = 0;
    let clickTimer = null;
    title.addEventListener('click', () => {
      clickCount++;
      if (clickCount === 3) {
        setTestMode(!isTestMode);
        clickCount = 0;
        clearTimeout(clickTimer);
      } else {
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { clickCount = 0; }, 600);
      }
    });
  }

  el('confirmGeneratePDF').onclick = async function() {
    hideBillPreview();
    await realSaveAndPDF();
  };
  el('cancelPreview').onclick = function() {
    hideBillPreview();
    hidePdfModal();
  };

  // Event listeners for PDF modal buttons
  el('openPdfBtn').onclick = function() {
    // PDF blob URL is set in realSaveAndPDF directly for the pdfViewBtn. Here we need to open the same PDF.
    // As the modal only appears on mobile, we can assume the PDF is handled by the mobile OS. 
    // For this example, we'll just close the modal. In a real app, you might trigger a native share/open.
    hidePdfModal();
  };
  el('closePdfModal').onclick = function() {
    hidePdfModal();
  };

  // Initially hide the PDF modal
  hidePdfModal();
});
