// --- pdfGenerator.js ---
function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const margin = 15;

  // 1. HEADER (32pt height)
  doc.setFillColor(25, 55, 109);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(35);
  doc.text('A N I L   D I A G N O S T I C S', pageW / 2, 18, { align: 'center' });

  // 2. INVOICE BOX (20pt height at y=50)
  const invoiceY = 50;
  doc.setFillColor(231, 238, 255);
  doc.roundedRect(margin, invoiceY, pageW - 2 * margin, 20, 4, 4, 'F');
  doc.setFontSize(16);
  doc.setTextColor(25, 55, 109);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details', margin + 5, invoiceY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Receipt No: ${data.receiptNo}`, margin + 5, invoiceY + 15);
  doc.text(
    `Date: ${new Date(data.date).toLocaleDateString('en-IN')}`,
    pageW - margin - 5,
    invoiceY + 15,
    { align: 'right' }
  );

  // 3. PATIENT BOX (35pt height at y=78)
  const patientY = 78;
  doc.setFillColor(243, 246, 255);
  doc.roundedRect(margin, patientY, pageW - 2 * margin, 35, 4, 4, 'F');
  doc.setTextColor(25, 55, 109);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', margin + 5, patientY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.name}`, margin + 5, patientY + 15);
  doc.text(`Age: ${data.age} yrs`, margin + 5, patientY + 23);
  doc.text(`Gender: ${data.gender}`, pageW / 2, patientY + 15);
  doc.text(`Phone:  ${data.phone}`, pageW / 2, patientY + 23);

  // 4. TABLE starting at y=118 (Qty removed)
  const tableY = 118;
  const body = data.tests.map((t, i) => [
    (i + 1).toString(),
    t.code,
    t.description,
    `Rs ${(t.rate * (t.qty || 1)).toFixed(2)}`
  ]);
  doc.autoTable({
    startY: tableY,
    head: [[
      'S.No', 'Code', 'Test Description', 'Amount (Rs)'
    ]],
    body,
    theme: 'grid',
    styles: { overflow: 'linebreak', cellPadding: 4, fontSize: 12 },
    headStyles: {
      fillColor: [25, 55, 109], textColor: 255, fontStyle: 'bold', fontSize: 14, halign: 'center'
    },
    bodyStyles: { halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: pageW - 2 * margin - 20 - 30 - 40, halign: 'left' },
      3: { cellWidth: 40 }
    },
    tableLineColor: [25, 55, 109], tableLineWidth: 0.5
  });

  // 5. TOTAL (box 140x16 at tableEndY+8)
  const endY = doc.lastAutoTable.finalY + 8;
  const boxW = 140;
  doc.setFillColor(25, 55, 109);
  doc.roundedRect((pageW - boxW) / 2, endY, boxW, 16, 6, 6, 'F');
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: Rs ${data.total.toFixed(2)}`, pageW / 2, endY + 11, { align: 'center' });

  // 6. PAYMENT MODE at y=endY+25
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`Payment Mode: ${data.payment}`, margin, endY + 25);

// 7. STAMP (72 × 39 at bottom‑right)
const stampW = 72, stampH = 39;
const stampX = pageW - margin - stampW;
const stampY = Math.max(doc.lastAutoTable.finalY + 28, pageH - stampH - margin)-10;

doc.setFillColor(240, 244, 255);                       // fill
doc.roundedRect(stampX, stampY, stampW, stampH, 6, 6, 'F');
doc.setDrawColor(25, 55, 109); doc.setLineWidth(1.1);  // border
doc.roundedRect(stampX, stampY, stampW, stampH, 6, 6);

// ── Heading (tighter) ───────────────────────────────────────────────
doc.setTextColor(25, 55, 109);
doc.setFont('helvetica', 'bold'); doc.setFontSize(12);

const head1Y = stampY + 10;              // was +12
const head2Y = head1Y + 6;               // was +10 (now 6)
doc.text('A N I L',             stampX + stampW/2, head1Y, { align: 'center' });
doc.text('D I A G N O S T I C S', stampX + stampW/2, head2Y, { align: 'center' });

// ── Details (tighter start + line gap) ──────────────────────────────
doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(70);

const details = [
  '(Sample Collection Centre)',
  'B.S. Maktha, Begumpet',
  'Hyderabad 500016 (T.S.)',
  'Ph: 9908722079'
];

let yPos = head2Y + 4;   // was +6 → starts sooner
details.forEach(line => {
  doc.text(line, stampX + stampW/2, yPos, { align: 'center' });
  yPos += 5;            // was +7 → tighter line spacing
});


  // 8. FOOTER at pageH-10
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(120);
  doc.text('Thank you for choosing Anil Diagnostics.', pageW/2, pageH - 10, { align: 'center' });

  const filename = `Anil_Diagnostics_Invoice_${data.receiptNo}.pdf`;
  doc.save(filename); // triggers download

  const pdfUrl = doc.output('bloburl');
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  // Show modal popup for PDF open and sharing
  const modal = document.getElementById('pdfModal');
  const openBtn = document.getElementById('openPdfBtn');
  const closeBtn = document.getElementById('closePdfModal');
  const shareBtn = document.getElementById('sharePdfBtn');
  if (modal && openBtn && closeBtn) {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    openBtn.onclick = () => {
      window.open(pdfUrl, '_blank');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
    };
    closeBtn.onclick = () => {
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
    };
    if (shareBtn && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      shareBtn.style.display = 'inline-block';
      shareBtn.onclick = async () => {
        try {
          await navigator.share({
            files: [pdfFile],
            title: filename,
            text: 'Here is your PDF bill from Anil Diagnostics.'
          });
        } catch (err) {
          alert('Sharing failed or was cancelled.');
        }
      };
    } else if (shareBtn) {
      shareBtn.style.display = 'none';
    }
  }
}