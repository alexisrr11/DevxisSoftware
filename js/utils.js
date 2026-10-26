/* Dux MVP — helpers de UI, documentos, PDF e impresión */
'use strict';

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const money = (n) => '$ ' + (Number(n) || 0).toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const compactMoney = (n) => {
  const value = Number(n) || 0;
  if (Math.abs(value) >= 1000000) return '$ ' + (value / 1000000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
  if (Math.abs(value) >= 100000) return '$ ' + (value / 1000).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + ' k';
  return money(value);
};

const parseISO = (iso) => new Date(String(iso) + 'T00:00:00');

const isoToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const addDays = (iso, days) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const dmy = (iso) => {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const longDate = (iso) => {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const shortDay = (iso) => parseISO(iso).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' }).replace('.', '');

const daysUntil = (iso) => {
  const target = parseISO(iso);
  const today = parseISO(isoToday());
  return Math.round((target - today) / 86400000);
};

const initials = (name) => String(name || '?')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((word) => word.charAt(0).toUpperCase())
  .join('');

const icon = (name, cls = 'h-4 w-4') =>
  `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const ART_PALETTES = {
  'Remeras': ['#dbeafe', '#bfdbfe', '#1d4ed8'],
  'Musculosas': ['#e0e7ff', '#c7d2fe', '#4338ca'],
  'Pantalones': ['#dbeafe', '#a5b4fc', '#3730a3'],
  'Sweaters': ['#e0f2fe', '#bae6fd', '#0369a1'],
  'Camperas': ['#dbeafe', '#93c5fd', '#1e40af'],
  'Accesorios': ['#e0f2fe', '#c7d2fe', '#1e3a8a'],
  'Belleza': ['#fce7f3', '#fbcfe8', '#9d174d'],
  'Deportivo': ['#dcfce7', '#bbf7d0', '#15803d'],
  'Bijouterie': ['#fef3c7', '#fde68a', '#b45309'],
  'General': ['#e2e8f0', '#cbd5e1', '#334155']
};

function artPalette(category) {
  return ART_PALETTES[category] || ART_PALETTES.General;
}

function productArt(product, heightClass = 'h-28') {
  const [from, to, ink] = artPalette(product.category);
  return `<div class="product-art ${heightClass}" style="background-image:linear-gradient(135deg,${from},${to})">
    <span class="art-brand" style="color:${ink}">Dvx</span>
    <svg class="art-package" style="color:${ink}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-package"/></svg>
    ${product.stock <= 0 ? '<span class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-red-600 shadow-sm">Sin stock</span>' : ''}
  </div>`;
}

const UI = {
  _confirmAction: null,
  _lastFocus: null,

  sizeClass(size) {
    return {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-3xl',
      '2xl': 'max-w-5xl',
      '3xl': 'max-w-6xl'
    }[size] || 'max-w-lg';
  },

  modal({ title, subtitle = '', body = '', footer = '', size = 'md', iconName = '', iconTone = 'blue', hideClose = false }) {
    const root = document.getElementById('modal-root');
    const tones = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-emerald-50 text-emerald-600',
      amber: 'bg-amber-50 text-amber-600',
      red: 'bg-red-50 text-red-600',
      slate: 'bg-slate-100 text-slate-600'
    };
    UI._lastFocus = document.activeElement;
    root.innerHTML = `
      <div class="modal-overlay fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-6"
           onclick="if(event.target===this)UI.closeModal()" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-panel my-auto w-full ${UI.sizeClass(size)} overflow-hidden rounded-2xl bg-white shadow-2xl outline-none" tabindex="-1">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div class="flex min-w-0 items-start gap-3">
              ${iconName ? `<span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tones[iconTone] || tones.blue}">${icon(iconName, 'h-5 w-5')}</span>` : ''}
              <div class="min-w-0">
                <h2 class="text-base font-bold leading-tight text-slate-900">${esc(title)}</h2>
                ${subtitle ? `<p class="mt-0.5 text-xs text-slate-500">${esc(subtitle)}</p>` : ''}
              </div>
            </div>
            ${hideClose ? '' : `<button type="button" class="icon-btn -mr-1 shrink-0" aria-label="Cerrar" onclick="UI.closeModal()">${icon('x', 'h-[18px] w-[18px]')}</button>`}
          </div>
          <div class="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 py-4 thin-scroll">${body}</div>
          ${footer ? `<div class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">${footer}</div>` : ''}
        </div>
      </div>`;
    document.body.classList.add('overflow-hidden');
    setTimeout(() => {
      // Priorizamos el primer campo del formulario; si el modal es de solo lectura,
      // enfocamos el panel para no resaltar el botón de cerrar.
      const field = root.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
      const target = field || root.querySelector('.modal-panel');
      if (target) target.focus({ preventScroll: true });
    }, 40);
  },

  closeModal() {
    const root = document.getElementById('modal-root');
    if (!root.innerHTML) return;
    root.innerHTML = '';
    document.body.classList.remove('overflow-hidden');
    UI._confirmAction = null;
    if (UI._lastFocus && typeof UI._lastFocus.focus === 'function') {
      try { UI._lastFocus.focus({ preventScroll: true }); } catch (err) { /* noop */ }
    }
  },

  confirm({ title = '¿Confirmás la acción?', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', tone = 'primary', action = null }) {
    UI._confirmAction = action;
    const confirmClass = tone === 'danger' ? 'btn-danger' : tone === 'success' ? 'btn-success' : 'btn-primary';
    UI.modal({
      title,
      size: 'sm',
      iconName: tone === 'danger' ? 'alert' : 'help',
      iconTone: tone === 'danger' ? 'red' : 'blue',
      body: `<div class="text-sm leading-relaxed text-slate-600">${message}</div>`,
      footer: `
        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">${esc(cancelText)}</button>
        <button type="button" class="btn ${confirmClass}" onclick="UI.runConfirm()">${esc(confirmText)}</button>`
    });
  },

  runConfirm() {
    const action = UI._confirmAction;
    UI.closeModal();
    if (typeof action === 'function') setTimeout(action, 60);
  },

  toast(message, type = 'success', title = '') {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const styles = {
      success: { border: 'border-emerald-200', icon: 'check-circle', tone: 'bg-emerald-50 text-emerald-600', title: title || 'Listo' },
      error: { border: 'border-red-200', icon: 'alert', tone: 'bg-red-50 text-red-600', title: title || 'No se pudo completar' },
      warning: { border: 'border-amber-200', icon: 'alert', tone: 'bg-amber-50 text-amber-600', title: title || 'Atención' },
      info: { border: 'border-blue-200', icon: 'info', tone: 'bg-blue-50 text-blue-600', title: title || 'Información' }
    }[type] || styles_success();
    const el = document.createElement('div');
    el.className = `toast-item pointer-events-auto flex items-start gap-3 rounded-xl border ${styles.border} bg-white px-3.5 py-3 shadow-lg`;
    el.innerHTML = `
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${styles.tone}">${icon(styles.icon, 'h-4 w-4')}</span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-bold text-slate-800">${esc(styles.title)}</p>
        <p class="mt-0.5 text-xs leading-snug text-slate-500">${esc(message)}</p>
      </div>
      <button class="icon-btn -mr-1 -mt-1 h-6 w-6" onclick="this.parentElement.remove()" aria-label="Cerrar">${icon('x', 'h-3.5 w-3.5')}</button>`;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 220);
    }, 3600);
  },

  empty({ iconName = 'package', title = 'Sin resultados', text = '', action = '' }) {
    return `<div class="empty-state">
      <span class="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">${icon(iconName, 'h-6 w-6')}</span>
      <p class="mt-1 text-sm font-semibold text-slate-600">${esc(title)}</p>
      ${text ? `<p class="max-w-xs text-xs text-slate-400">${esc(text)}</p>` : ''}
      ${action}
    </div>`;
  },

  docStatusLabel(status) {
    return { pendiente: 'Pendiente', vencido: 'Vencido', vendido: 'Vendido', anulado: 'Anulado' }[status] || status || '';
  }
};

function styles_success() {
  return { border: 'border-emerald-200', icon: 'check-circle', tone: 'bg-emerald-50 text-emerald-600', title: 'Listo' };
}

/* ---------- Documento imprimible ---------- */
function totalsDocRows(totals, discountPct) {
  return `
    <tr><td style="padding:3px 0;color:#64748b">Neto</td><td style="padding:3px 0;text-align:right">${money(totals.net)}</td></tr>
    ${totals.discount > 0 ? `<tr><td style="padding:3px 0;color:#64748b">Descuento${discountPct ? ' (' + discountPct + '%)' : ''}</td><td style="padding:3px 0;text-align:right;color:#b91c1c">− ${money(totals.discount)}</td></tr>` : ''}
    <tr><td style="padding:3px 0;color:#64748b">Subtotal</td><td style="padding:3px 0;text-align:right">${money(totals.subtotal)}</td></tr>
    <tr><td style="padding:3px 0;color:#64748b">IVA 21%</td><td style="padding:3px 0;text-align:right">${money(totals.iva)}</td></tr>`;
}

function docHTML(d) {
  const isQuote = d.kind === 'presupuesto';
  const rows = d.items.map((item, index) => {
    const line = Number(item.qty) * Number(item.price) * (1 - (Number(item.discount) || 0) / 100);
    return `<tr style="background:${index % 2 ? '#f8fafc' : '#ffffff'}">
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569">${esc(item.qty)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">
        <div style="font-weight:600;color:#0f172a">${esc(item.name)}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">${esc(item.code)}${Number(item.discount) ? ' · Descuento ' + item.discount + '%' : ''}</div>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569;white-space:nowrap">${money(item.price)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a;white-space:nowrap">${money(line)}</td>
    </tr>`;
  }).join('');

  const status = d.status ? `<span style="display:inline-block;margin-top:8px;border-radius:999px;background:${d.status === 'vencido' ? '#fee2e2' : d.status === 'vendido' ? '#dcfce7' : '#e0efff'};color:${d.status === 'vencido' ? '#b91c1c' : d.status === 'vendido' ? '#15803d' : '#0b5fc4'};font-size:10px;font-weight:700;padding:3px 9px;text-transform:uppercase;letter-spacing:.06em">${esc(UI.docStatusLabel(d.status))}</span>` : '';

  return `<div class="doc-sheet" style="max-width:800px;margin:0 auto;background:#fff;padding:38px 44px;font-family:Inter,Arial,Helvetica,sans-serif;color:#0f172a;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid #0b63d6;padding-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:11px;background:#0b63d6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:800">D</div>
        <div>
          <div style="font-size:21px;font-weight:800;letter-spacing:-.02em">Devxis Software</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.14em;margin-top:2px">Gestión comercial</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;font-weight:700">${isQuote ? 'Presupuesto' : 'Comprobante de venta'}</div>
        <div style="font-size:22px;font-weight:800;margin-top:3px">${esc(d.number)}</div>
        <div style="font-size:11px;color:#64748b;margin-top:3px">${dmy(d.date)}</div>
        ${status}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;gap:24px;margin-top:22px">
      <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8">Cliente</div>
        <div style="font-size:14px;font-weight:700;margin-top:4px">${esc(d.client || 'Consumidor Final')}</div>
        ${d.clientDoc ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(d.clientDoc)}</div>` : ''}
      </div>
      <div style="width:230px;text-align:right;font-size:11px;color:#64748b;line-height:1.9">
        ${isQuote ? `<div>Emisión: <strong style="color:#0f172a">${dmy(d.date)}</strong></div><div>Vencimiento: <strong style="color:#0f172a">${dmy(d.dueDate)}</strong></div>` : `<div>Comprobante: <strong style="color:#0f172a">${esc(d.docType || 'Factura B')}</strong></div><div>Medio de pago: <strong style="color:#0f172a">${esc(d.payment || '—')}</strong></div>`}
        <div>Ítems: <strong style="color:#0f172a">${d.items.reduce((sum, item) => sum + Number(item.qty), 0)}</strong></div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:12px">
      <thead>
        <tr style="background:#0b63d6;color:#fff">
          <th style="padding:9px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:.08em;width:44px">Cant.</th>
          <th style="padding:9px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.08em">Descripción</th>
          <th style="padding:9px 10px;text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:.08em;width:100px">P. unit.</th>
          <th style="padding:9px 10px;text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:.08em;width:110px">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:18px">
      <div style="width:270px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">${totalsDocRows(d.totals, d.discount)}</table>
        <div style="display:flex;justify-content:space-between;align-items:center;background:#0b63d6;color:#fff;border-radius:8px;padding:10px 12px;margin-top:8px">
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Total</span>
          <span style="font-size:16px;font-weight:800">${money(d.totals.total)}</span>
        </div>
      </div>
    </div>

    ${d.notes ? `<div style="margin-top:22px;border-top:1px solid #e2e8f0;padding-top:12px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8">Observaciones</div><div style="font-size:11px;color:#475569;margin-top:4px;white-space:pre-line">${esc(d.notes)}</div></div>` : ''}

    <div style="margin-top:34px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;gap:12px;font-size:9px;color:#94a3b8">
      <span>Devxis Software · ${isQuote ? 'Presupuesto' : 'Comprobante interno'} ${esc(d.number)}</span>
      <span>${isQuote ? 'Documento no válido como factura' : 'Gracias por su compra'}</span>
    </div>
  </div>`;
}

/* ---------- PDF ---------- */
UI.downloadPDF = function (d) {
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor) {
    UI.toast('No se pudo cargar el generador de PDF. Revisá tu conexión a internet.', 'error');
    return false;
  }

  const doc = new jsPDFCtor({ unit: 'mm', format: 'a4' });
  const isQuote = d.kind === 'presupuesto';
  const pageWidth = 210;
  const margin = 14;
  const brand = [11, 99, 214];

  const drawHeader = () => {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 9, 12, 12, 2.5, 2.5, 'F');
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('D', margin + 3.2, 17.8);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text('Devxis Software', margin + 16, 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('GESTIÓN COMERCIAL', margin + 16, 20.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(isQuote ? 'PRESUPUESTO' : 'COMPROBANTE DE VENTA', pageWidth - margin, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(d.number + '  ·  ' + dmy(d.date), pageWidth - margin, 20.5, { align: 'right' });
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 283, pageWidth - margin, 283);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(isQuote ? 'Documento no válido como factura' : 'Comprobante interno · Gracias por su compra', margin, 288);
      doc.text('Página ' + page + ' de ' + pageCount, pageWidth - margin, 288, { align: 'right' });
    }
  };

  const tableHeader = (y) => {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CANT.', margin + 4, y + 5.2);
    doc.text('DESCRIPCIÓN', margin + 18, y + 5.2);
    doc.text('P. UNIT.', 145, y + 5.2, { align: 'right' });
    doc.text('SUBTOTAL', 195, y + 5.2, { align: 'right' });
    return y + 8;
  };

  drawHeader();

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CLIENTE', margin, 41);
  doc.setFontSize(11);
  doc.text(d.client || 'Consumidor Final', margin, 46.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (d.clientDoc) doc.text(d.clientDoc, margin, 50.5);

  doc.setFontSize(8);
  const rightX = pageWidth - margin;
  doc.text((isQuote ? 'Emisión' : 'Comprobante') + ': ' + dmy(d.date), rightX, 41, { align: 'right' });
  if (isQuote) {
    doc.text('Vencimiento: ' + dmy(d.dueDate), rightX, 46, { align: 'right' });
  } else {
    doc.text('Comprobante: ' + (d.docType || 'Factura B'), rightX, 46, { align: 'right' });
    doc.text('Medio de pago: ' + (d.payment || '—'), rightX, 51, { align: 'right' });
  }
  if (d.status) {
    doc.text('Estado: ' + UI.docStatusLabel(d.status), rightX, isQuote ? 51 : 56, { align: 'right' });
  }

  let y = tableHeader(58);
  const rowBottom = 262;

  d.items.forEach((item, index) => {
    const nameLines = doc.splitTextToSize(String(item.name), 118).slice(0, 2);
    const rowHeight = Math.max(9, nameLines.length * 4.2 + 4);
    if (y + rowHeight > rowBottom) {
      doc.addPage();
      drawHeader();
      y = tableHeader(38);
    }
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(item.qty), margin + 6, y + 5.5, { align: 'center' });
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(nameLines, margin + 18, y + 5, { lineHeightFactor: 1.15 });
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(String(item.code) + (item.discount ? '  ·  Desc. ' + item.discount + '%' : ''), margin + 18, y + rowHeight - 2);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    doc.text(money(item.price), 145, y + 5.5, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(money(Number(item.qty) * Number(item.price) * (1 - (Number(item.discount) || 0) / 100)), 195, y + 5.5, { align: 'right' });
    y += rowHeight;
  });

  if (y > 230) {
    doc.addPage();
    drawHeader();
    y = 40;
  }

  y += 8;
  const totalsX = 196;
  const labelX = 138;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Neto', labelX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(money(d.totals.net), totalsX, y, { align: 'right' });
  y += 5.5;

  if (d.totals.discount > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Descuento' + (d.discount ? ' (' + d.discount + '%)' : ''), labelX, y);
    doc.setTextColor(185, 28, 28);
    doc.text('- ' + money(d.totals.discount), totalsX, y, { align: 'right' });
    y += 5.5;
  }

  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', labelX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(money(d.totals.subtotal), totalsX, y, { align: 'right' });
  y += 5.5;
  doc.setTextColor(100, 116, 139);
  doc.text('IVA 21%', labelX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(money(d.totals.iva), totalsX, y, { align: 'right' });
  y += 4;

  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.roundedRect(126, y, 70, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL', 130, y + 7.6);
  doc.setFontSize(12);
  doc.text(money(d.totals.total), 192, y + 7.8, { align: 'right' });
  y += 20;

  if (d.notes) {
    if (y > 255) {
      doc.addPage();
      drawHeader();
      y = 40;
    }
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('OBSERVACIONES', margin, y);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const noteLines = doc.splitTextToSize(String(d.notes), 170);
    doc.text(noteLines, margin, y + 5);
  }

  drawFooter();
  doc.save((isQuote ? 'Presupuesto-' : 'Venta-') + d.number + '.pdf');
  return true;
};

/* ---------- Impresión ---------- */
UI.printDocument = function (d) {
  const root = document.getElementById('print-root');
  if (!root) return;
  root.innerHTML = docHTML(d);
  const previousTitle = document.title;
  document.title = (d.kind === 'presupuesto' ? 'Presupuesto ' : 'Venta ') + d.number;
  const restore = () => {
    document.title = previousTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  setTimeout(() => window.print(), 30);
};

/* ---------- Atajos ---------- */
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') UI.closeModal();
});
