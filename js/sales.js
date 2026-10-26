/* Dux MVP — ventas, punto de venta y movimientos de stock */
'use strict';

Object.assign(App, {
  paymentMethods() {
    return ['Efectivo', 'Transferencia', 'Tarjeta de débito', 'Tarjeta de crédito', 'Mercado Pago', 'Cuenta corriente'];
  },

  docTypes() {
    return ['Factura A', 'Factura B', 'Factura C', 'Ticket', 'Remito'];
  },

  /* ---------------- Sección ventas ---------------- */
  viewSales() {
    const tabs = [
      { id: 'vender', label: 'Punto de venta', icon: 'cart' },
      { id: 'historial', label: 'Historial de ventas', icon: 'receipt' },
      { id: 'movimientos', label: 'Movimientos de stock', icon: 'layers' }
    ];
    const active = ['vender', 'historial', 'movimientos'].includes(this.sub) ? this.sub : 'vender';

    const tabsHtml = tabs.map((tab) => `<a href="#/ventas/${tab.id}" class="tab-pill ${active === tab.id ? 'active' : ''}">${icon(tab.icon, 'h-4 w-4')} ${tab.label}</a>`).join('');

    let content = '';
    if (active === 'historial') content = this.viewSalesHistory();
    else if (active === 'movimientos') content = this.viewMovements();
    else content = this.viewPOS();

    const headerAction = active === 'vender'
      ? `<button type="button" class="btn btn-secondary" onclick="App.go('ventas/historial')">${icon('receipt', 'h-4 w-4')} Historial</button>`
      : `<button type="button" class="btn btn-secondary" onclick="App.go('ventas/movimientos')">${icon('layers', 'h-4 w-4')} Movimientos</button>
         <button type="button" class="btn btn-primary" onclick="App.go('ventas/vender')">${icon('cart', 'h-4 w-4')} Nueva venta</button>`;

    return `
      ${this.pageHeader('Ventas y stock', 'Registrá operaciones y mantené la trazabilidad del inventario.', headerAction, 'Operaciones')}
      <div class="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">${tabsHtml}</div>
      ${content}`;
  },

  /* ---------------- Punto de venta ---------------- */
  posCategories() {
    return [...new Set(Store.data.products.map((product) => product.category))].sort((a, b) => a.localeCompare(b, 'es'));
  },

  posFilteredProducts() {
    const search = this.ui.posSearch.trim().toLowerCase();
    return Store.data.products.filter((product) => {
      if (this.ui.posCategory !== 'all' && product.category !== this.ui.posCategory) return false;
      if (!search) return true;
      return [product.name, product.code, product.category].join(' ').toLowerCase().includes(search);
    });
  },

  viewPOS() {
    if (!Store.data.products.length) {
      return `<div class="card">${UI.empty({
        iconName: 'box',
        title: 'No hay productos cargados',
        text: 'Para vender necesitás cargar al menos un producto en el inventario.',
        action: `<button class="btn btn-primary btn-sm mt-2" onclick="App.openProductModal()">Nuevo producto</button>`
      })}</div>`;
    }

    return `<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <section class="min-w-0">
        <div class="card p-3">
          <div class="input-group">
            ${icon('search')}
            <input class="field h-11 text-[15px]" id="pos-search" value="${esc(this.ui.posSearch)}" placeholder="Ingresá el nombre o SKU del producto…" oninput="App.posSearch(this.value)" />
          </div>
          <div class="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5" id="pos-categories">${this.posCategoriesHTML()}</div>
        </div>

        <div class="mt-3 flex items-center justify-between px-1 text-[10px] text-slate-400" id="pos-meta">${this.posMetaHTML()}</div>

        <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" id="pos-grid">${this.posGridHTML()}</div>
      </section>

      <aside class="min-w-0" id="pos-summary-wrap">${this.posSummaryHTML()}</aside>
    </div>`;
  },

  posCategoriesHTML() {
    const categories = this.posCategories();
    const chips = [`<button type="button" class="chip ${this.ui.posCategory === 'all' ? 'active' : ''}" onclick="App.posSetCategoryByIndex(0)">Todos</button>`]
      .concat(categories.map((category, index) => `<button type="button" class="chip ${this.ui.posCategory === category ? 'active' : ''}" onclick="App.posSetCategoryByIndex(${index + 1})">${esc(category)}</button>`));
    return chips.join('');
  },

  posSetCategoryByIndex(index) {
    const categories = this.posCategories();
    this.ui.posCategory = index === 0 ? 'all' : categories[index - 1];
    const chips = document.getElementById('pos-categories');
    if (chips) chips.innerHTML = this.posCategoriesHTML();
    this.posRefreshGrid();
  },

  posMetaHTML() {
    const count = this.posFilteredProducts().length;
    return `<span>${count} ${count === 1 ? 'producto disponible' : 'productos disponibles'}</span>
      <span class="hidden items-center gap-1 sm:flex">${icon('info', 'h-3 w-3')} Hacé clic para agregar</span>`;
  },

  posGridHTML() {
    const products = this.posFilteredProducts();
    if (!products.length) {
      return `<div class="col-span-full">${UI.empty({ iconName: 'search', title: 'Sin resultados', text: 'Probá con otro nombre, código o categoría.' })}</div>`;
    }

    return products.map((product) => {
      const out = product.stock <= 0;
      return `<button type="button" class="card card-hover group flex flex-col overflow-hidden text-left ${out ? 'cursor-not-allowed opacity-60' : ''}" ${out ? 'disabled' : ''} onclick="App.posAdd('${product.id}')">
        ${productArt(product, 'h-24 sm:h-28')}
        <div class="flex flex-1 flex-col gap-0.5 p-2.5 sm:p-3">
          <div class="flex items-start justify-between gap-1.5">
            <p class="line-clamp-2 min-h-[2.1rem] text-[12px] font-semibold leading-snug text-slate-800">${esc(product.name)}</p>
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">${icon('plus', 'h-3.5 w-3.5')}</span>
          </div>
          <p class="truncate text-[9px] text-slate-400">SKU ${esc(product.code)}</p>
          <div class="mt-auto flex items-end justify-between gap-1 pt-1.5">
            <div class="min-w-0">
              <p class="truncate text-[13px] font-extrabold text-slate-900">${money(product.price)}</p>
              <p class="text-[8px] text-slate-400">+ IVA 21%</p>
            </div>
            ${this.stockBadge(product, '!text-[9px]')}
          </div>
        </div>
      </button>`;
    }).join('');
  },

  posRefreshGrid() {
    const grid = document.getElementById('pos-grid');
    if (grid) grid.innerHTML = this.posGridHTML();
    const meta = document.getElementById('pos-meta');
    if (meta) meta.innerHTML = this.posMetaHTML();
  },

  posSearch(value) {
    this.ui.posSearch = value;
    this.posRefreshGrid();
  },

  posSetClient(value) {
    this.ui.posClient = value;
  },

  posSetDocType(value) {
    this.ui.posDocType = value;
  },

  posCartItem(productId) {
    return this.ui.posCart.find((item) => item.productId === productId);
  },

  posAdd(productId) {
    const product = Store.findProduct(productId);
    if (!product) return;
    if (product.stock <= 0) {
      UI.toast('No hay stock disponible de ' + product.name + '.', 'warning');
      return;
    }
    const existing = this.posCartItem(productId);
    if (existing) {
      if (existing.qty >= product.stock) {
        UI.toast('Ya agregaste todo el stock disponible de ' + product.name + '.', 'warning');
        return;
      }
      existing.qty += 1;
    } else {
      this.ui.posCart.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        qty: 1,
        discount: 0
      });
    }
    this.posRefreshSummary();
  },

  posQty(productId, delta) {
    const item = this.posCartItem(productId);
    if (!item) return;
    const product = Store.findProduct(productId);
    const next = Number(item.qty) + delta;
    if (next <= 0) {
      this.ui.posCart = this.ui.posCart.filter((i) => i.productId !== productId);
      this.posRefreshSummary();
      return;
    }
    if (product && next > product.stock) {
      UI.toast('Stock insuficiente. Disponible: ' + product.stock + '.', 'warning');
      return;
    }
    item.qty = next;
    this.posRefreshSummary();
  },

  posRemove(productId) {
    this.ui.posCart = this.ui.posCart.filter((item) => item.productId !== productId);
    this.posRefreshSummary();
  },

  posSetDiscount(value) {
    this.ui.posDiscount = Math.max(0, Math.min(100, Number(value) || 0));
    this.posRefreshTotals();
  },

  posClearCart() {
    if (!this.ui.posCart.length) return;
    UI.confirm({
      title: 'Vaciar la venta',
      message: 'Se quitarán todos los productos del resumen actual.',
      confirmText: 'Vaciar',
      tone: 'danger',
      action: () => {
        this.ui.posCart = [];
        this.ui.posDiscount = 0;
        this.posRefreshSummary();
      }
    });
  },

  posUnits() {
    return this.ui.posCart.reduce((sum, item) => sum + Number(item.qty), 0);
  },

  posSummaryHTML() {
    const cart = this.ui.posCart;
    const totals = Store.calc(cart, this.ui.posDiscount);
    const units = this.posUnits();
    const items = cart.map((item) => {
      const product = Store.findProduct(item.productId);
      const line = Number(item.qty) * Number(item.price);
      return `<div class="flex items-center gap-2 py-2.5">
        <div class="flex shrink-0 items-center rounded-md border border-slate-200 bg-white">
          <button type="button" class="qty-btn" onclick="App.posQty('${item.productId}',-1)" aria-label="Restar">${icon('minus', 'h-3 w-3')}</button>
          <span class="w-6 text-center text-[11px] font-bold text-slate-700">${item.qty}</span>
          <button type="button" class="qty-btn" onclick="App.posQty('${item.productId}',1)" aria-label="Sumar">${icon('plus', 'h-3 w-3')}</button>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[11px] font-semibold text-slate-700">${esc(item.name)}</p>
          <p class="text-[9px] text-slate-400">${money(item.price)} c/u${product ? ` · stock ${product.stock}` : ''}</p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-[11px] font-bold text-slate-800">${money(line)}</p>
          <button type="button" class="text-[9px] font-medium text-slate-400 transition hover:text-red-500" onclick="App.posRemove('${item.productId}')">Quitar</button>
        </div>
      </div>`;
    }).join('');

    return `<div class="card overflow-hidden xl:sticky xl:top-24">
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 class="text-sm font-bold text-slate-800">Resumen de la venta</h2>
          <p class="mt-0.5 text-[11px] text-slate-400">${units} ${units === 1 ? 'producto seleccionado' : 'productos seleccionados'}</p>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="icon-btn h-7 w-7" title="Vaciar venta" onclick="App.posClearCart()">${icon('refresh', 'h-3.5 w-3.5')}</button>
        </div>
      </div>

      <div class="space-y-3 p-4">
        <div>
          <label class="label flex items-center justify-between" for="pos-client">Cliente <span class="text-[9px] font-medium normal-case tracking-normal text-slate-400">podés escribir uno nuevo</span></label>
          <div class="input-group">
            ${icon('user')}
            <input class="field" id="pos-client" list="clientes-list" value="${esc(this.ui.posClient)}" placeholder="Consumidor Final" oninput="App.posSetClient(this.value)" />
          </div>
          ${this.clientDatalist()}
        </div>

        <div>
          <label class="label" for="pos-doc-type">Tipo de comprobante</label>
          <select class="field" id="pos-doc-type" onchange="App.posSetDocType(this.value)">
            ${this.docTypes().map((type) => `<option ${this.ui.posDocType === type ? 'selected' : ''}>${type}</option>`).join('')}
          </select>
        </div>

        <div class="border-t border-slate-100 pt-1">
          ${cart.length ? `<div class="thin-scroll max-h-[260px] divide-y divide-slate-100 overflow-y-auto">${items}</div>` : `<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-6 text-center">
            <span class="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-300">${icon('cart', 'h-5 w-5')}</span>
            <p class="mt-2 text-[11px] font-semibold text-slate-500">La venta está vacía</p>
            <p class="text-[10px] text-slate-400">Seleccioná productos del catálogo.</p>
          </div>`}
        </div>

        <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <label class="text-[11px] font-semibold text-slate-600" for="pos-discount">Descuento general</label>
          <div class="flex items-center gap-1">
            <input class="field field-sm w-16 text-center" id="pos-discount" type="number" min="0" max="100" step="0.5" value="${Number(this.ui.posDiscount) || 0}" oninput="App.posSetDiscount(this.value)" />
            <span class="text-[11px] font-bold text-slate-500">%</span>
          </div>
        </div>

        <div id="pos-totals">${this.posTotalsHTML()}</div>

        <button type="button" class="btn btn-primary btn-lg w-full justify-between" ${cart.length ? '' : 'disabled'} onclick="App.posCheckout()">
          <span class="flex items-center gap-2">${icon('check-circle', 'h-4 w-4')} Vender</span>
          <span class="text-base font-extrabold" id="pos-pay-total">${money(totals.total)}</span>
        </button>
        <p class="text-center text-[9px] leading-relaxed text-slate-400">El stock se descuenta al confirmar la venta.</p>
      </div>
    </div>`;
  },

  posTotalsHTML() {
    const totals = Store.calc(this.ui.posCart, this.ui.posDiscount);
    return `<div class="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
      <div class="flex justify-between text-slate-500"><span>Neto</span><span class="font-medium text-slate-700">${money(totals.net)}</span></div>
      ${totals.discount > 0 ? `<div class="flex justify-between text-slate-500"><span>Descuento (${Number(this.ui.posDiscount) || 0}%)</span><span class="font-medium text-red-600">− ${money(totals.discount)}</span></div>` : ''}
      <div class="flex justify-between text-slate-500"><span>Subtotal</span><span class="font-medium text-slate-700">${money(totals.subtotal)}</span></div>
      <div class="flex justify-between text-slate-500"><span>IVA 21%</span><span class="font-medium text-slate-700">${money(totals.iva)}</span></div>
    </div>`;
  },

  posRefreshTotals() {
    const totals = document.getElementById('pos-totals');
    if (totals) totals.innerHTML = this.posTotalsHTML();
    const total = Store.calc(this.ui.posCart, this.ui.posDiscount).total;
    const label = document.getElementById('pos-pay-total');
    if (label) label.textContent = money(total);
  },

  posRefreshSummary() {
    const wrapper = document.getElementById('pos-summary-wrap');
    if (wrapper) wrapper.innerHTML = this.posSummaryHTML();
  },

  posCheckout() {
    if (!this.ui.posCart.length) return;
    const totals = Store.calc(this.ui.posCart, this.ui.posDiscount);
    const units = this.posUnits();
    const client = this.ui.posClient.trim() || 'Consumidor Final';
    const items = this.ui.posCart.map((item) => `<div class="flex items-center justify-between gap-2 py-1.5 text-xs">
      <span class="min-w-0 truncate text-slate-600">${item.qty} × ${esc(item.name)}</span>
      <span class="shrink-0 font-semibold text-slate-800">${money(item.qty * item.price)}</span>
    </div>`).join('');

    UI.modal({
      title: 'Confirmar venta',
      subtitle: `${units} ${units === 1 ? 'producto' : 'productos'} · ${client}`,
      size: 'lg',
      iconName: 'cart',
      iconTone: 'blue',
      body: `<div class="space-y-3">
        <div class="thin-scroll max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 px-3 py-1">${items}</div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label" for="sale-payment">Medio de pago</label>
            <select class="field" id="sale-payment">
              ${this.paymentMethods().map((method) => `<option>${method}</option>`).join('')}
            </select>
          </div>
          <div class="rounded-xl bg-blue-50 px-3 py-2">
            <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-blue-500">Total a cobrar</p>
            <p class="mt-0.5 text-xl font-extrabold text-blue-800">${money(totals.total)}</p>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div class="flex justify-between text-[11px] text-slate-500"><span>Comprobante</span><span class="font-semibold text-slate-700">${esc(this.ui.posDocType)}</span></div>
          <div class="mt-1 flex justify-between text-[11px] text-slate-500"><span>Neto + IVA</span><span class="font-semibold text-slate-700">${money(totals.subtotal)} + ${money(totals.iva)}</span></div>
        </div>
        <p class="flex items-start gap-1.5 text-[10px] text-slate-400">${icon('info', 'h-3.5 w-3.5 shrink-0')} Al confirmar se registra la venta, se genera el movimiento de salida y se actualiza el stock.</p>
      </div>`,
      footer: `<button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="App.confirmSale()">${icon('check-circle', 'h-4 w-4')} Confirmar venta</button>`
    });
  },

  confirmSale() {
    const payment = document.getElementById('sale-payment')?.value || 'Efectivo';
    const result = Store.registerSale({
      client: this.ui.posClient,
      docType: this.ui.posDocType,
      paymentMethod: payment,
      items: this.ui.posCart,
      discount: this.ui.posDiscount
    });

    if (!result.ok) {
      UI.toast(result.error, 'error');
      return;
    }

    UI.closeModal();
    this.ui.posCart = [];
    this.ui.posDiscount = 0;
    this.ui.posClient = 'Consumidor Final';
    this.ui.posDocType = 'Factura B';
    this.render();
    UI.toast('Venta ' + result.sale.number + ' registrada por ' + money(result.sale.totals.total) + '.');
    this.openSaleDetail(result.sale.id, true);
  },

  /* ---------------- Historial ---------------- */
  viewSalesHistory() {
    const sales = Store.data.sales;
    const monthKey = isoToday().slice(0, 7);
    const monthSales = sales.filter((sale) => sale.date.startsWith(monthKey));
    const monthTotal = monthSales.reduce((sum, sale) => sum + sale.totals.total, 0);
    const todayTotal = sales.filter((sale) => sale.date === isoToday()).reduce((sum, sale) => sum + sale.totals.total, 0);
    const avg = monthSales.length ? monthTotal / monthSales.length : 0;

    return `<div class="mb-4 grid gap-3 sm:grid-cols-3">
        ${this.miniStat('Total del mes', money(monthTotal), 'trending', 'green')}
        ${this.miniStat('Ventas de hoy', money(todayTotal), 'cart', 'blue')}
        ${this.miniStat('Ticket promedio', money(avg), 'receipt', 'violet')}
      </div>

      <section class="card p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="input-group min-w-0 flex-1">
            ${icon('search')}
            <input class="field" value="${esc(this.ui.salesSearch)}" placeholder="Buscar por número, cliente o medio de pago…" oninput="App.setSalesSearch(this.value)" />
          </div>
          <select class="field w-full lg:w-52" onchange="App.setSalesDocFilter(this.value)">
            <option value="todos" ${this.ui.salesDocFilter === 'todos' ? 'selected' : ''}>Todos los comprobantes</option>
            ${this.docTypes().map((type) => `<option value="${esc(type)}" ${this.ui.salesDocFilter === type ? 'selected' : ''}>${esc(type)}</option>`).join('')}
          </select>
        </div>
      </section>

      <section class="mt-4" id="sales-results">${this.salesResultsHTML()}</section>`;
  },

  filteredSales() {
    const search = this.ui.salesSearch.trim().toLowerCase();
    return Store.data.sales.filter((sale) => {
      if (this.ui.salesDocFilter !== 'todos' && sale.docType !== this.ui.salesDocFilter) return false;
      if (!search) return true;
      const haystack = [sale.number, sale.client, sale.docType, sale.paymentMethod, ...(sale.items || []).map((item) => item.name + ' ' + item.code)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    }).sort((a, b) => b.createdAt - a.createdAt);
  },

  salesResultsHTML() {
    const sales = this.filteredSales();
    if (!sales.length) {
      return `<div class="card">${UI.empty({
        iconName: 'receipt',
        title: 'No hay ventas para mostrar',
        text: this.ui.salesSearch || this.ui.salesDocFilter !== 'todos' ? 'Probá con otro filtro o búsqueda.' : 'Registrá tu primera venta desde el punto de venta.',
        action: `<button class="btn btn-primary btn-sm mt-2" onclick="App.go('ventas/vender')">Ir a vender</button>`
      })}</div>`;
    }

    const rows = sales.map((sale) => {
      const units = sale.items.reduce((sum, item) => sum + item.qty, 0);
      return `<tr>
        <td><span class="font-bold text-slate-800">${esc(sale.number)}</span></td>
        <td class="hidden text-slate-500 sm:table-cell">${dmy(sale.date)}</td>
        <td><p class="max-w-[200px] truncate text-xs font-semibold text-slate-700">${esc(sale.client)}</p><p class="text-[10px] text-slate-400">${esc(sale.docType)}</p></td>
        <td class="hidden text-slate-500 lg:table-cell">${esc(sale.paymentMethod || '—')}</td>
        <td class="num hidden text-slate-500 md:table-cell">${units} u.</td>
        <td class="num font-bold text-slate-800">${money(sale.totals.total)}</td>
        <td>
          <div class="flex items-center justify-end gap-0.5">
            <button type="button" class="icon-btn" title="Ver ticket" onclick="App.openSaleDetail('${sale.id}')">${icon('eye', 'h-4 w-4')}</button>
            <button type="button" class="icon-btn" title="Descargar PDF" onclick="App.pdfSale('${sale.id}')">${icon('download', 'h-4 w-4')}</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `<div class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p class="text-xs text-slate-500"><strong class="font-bold text-slate-800">${sales.length}</strong> ${sales.length === 1 ? 'venta' : 'ventas'}</p>
        <p class="hidden items-center gap-1 text-[10px] text-slate-400 sm:flex">${icon('info', 'h-3.5 w-3.5')} El detalle conserva el precio al momento de la venta</p>
      </div>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Número</th>
              <th class="hidden sm:table-cell">Fecha</th>
              <th>Cliente</th>
              <th class="hidden lg:table-cell">Pago</th>
              <th class="hidden text-right md:table-cell">Ítems</th>
              <th class="text-right">Total</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  setSalesSearch(value) {
    this.ui.salesSearch = value;
    const target = document.getElementById('sales-results');
    if (target) target.innerHTML = this.salesResultsHTML();
  },

  setSalesDocFilter(value) {
    this.ui.salesDocFilter = value;
    const target = document.getElementById('sales-results');
    if (target) target.innerHTML = this.salesResultsHTML();
  },

  openSaleDetail(id, success = false) {
    const sale = Store.data.sales.find((s) => s.id === id);
    if (!sale) return;
    const totals = Store.calc(sale.items, sale.discount);
    const items = sale.items.map((item) => {
      const line = Number(item.qty) * Number(item.price) * (1 - (Number(item.discount) || 0) / 100);
      return `<tr>
        <td class="text-center text-slate-500">${item.qty}</td>
        <td><p class="text-xs font-semibold text-slate-700">${esc(item.name)}</p><p class="text-[10px] text-slate-400">${esc(item.code)}</p></td>
        <td class="num text-slate-500">${money(item.price)}</td>
        <td class="num font-semibold text-slate-800">${money(line)}</td>
      </tr>`;
    }).join('');

    const quote = sale.quoteId ? Store.data.quotes.find((q) => q.id === sale.quoteId) : null;

    const body = `${success ? `<div class="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-800">
      <span class="mt-0.5">${icon('check-circle', 'h-4 w-4')}</span>
      <span><strong>La venta se registró correctamente.</strong> Se actualizó el stock y se generó el movimiento de salida.</span>
    </div>` : ''}

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="rounded-xl border border-slate-200 p-2.5"><p class="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Cliente</p><p class="mt-1 truncate text-xs font-semibold text-slate-700">${esc(sale.client)}</p></div>
      <div class="rounded-xl border border-slate-200 p-2.5"><p class="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Fecha</p><p class="mt-1 text-xs font-semibold text-slate-700">${dmy(sale.date)}</p></div>
      <div class="rounded-xl border border-slate-200 p-2.5"><p class="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Comprobante</p><p class="mt-1 truncate text-xs font-semibold text-slate-700">${esc(sale.docType)}</p></div>
      <div class="rounded-xl border border-slate-200 p-2.5"><p class="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Pago</p><p class="mt-1 truncate text-xs font-semibold text-slate-700">${esc(sale.paymentMethod || '—')}</p></div>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <table class="tbl">
        <thead><tr><th class="w-14 text-center">Cant.</th><th>Producto</th><th class="text-right">P. unit.</th><th class="text-right">Subtotal</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
    </div>

    <div class="mt-4 flex justify-end"><div class="w-full max-w-xs">${this.detailTotals(totals, sale.discount)}</div></div>

    ${quote ? `<button type="button" class="mt-3 flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700 transition hover:bg-blue-100" onclick="UI.closeModal();App.openQuoteDetail('${quote.id}')">
      <span>Originada en el presupuesto ${esc(quote.number)}</span><span>${icon('chevron-right', 'h-4 w-4')}</span>
    </button>` : ''}`;

    const footer = success
      ? `<button type="button" class="btn btn-secondary btn-sm" onclick="App.printSale('${sale.id}')">${icon('printer', 'h-4 w-4')} Imprimir</button>
         <button type="button" class="btn btn-secondary btn-sm" onclick="App.pdfSale('${sale.id}')">${icon('download', 'h-4 w-4')} PDF</button>
         <button type="button" class="btn btn-primary btn-sm" onclick="UI.closeModal();App.go('ventas/vender')">${icon('plus', 'h-4 w-4')} Nueva venta</button>`
      : `<button type="button" class="btn btn-secondary btn-sm" onclick="App.printSale('${sale.id}')">${icon('printer', 'h-4 w-4')} Imprimir</button>
         <button type="button" class="btn btn-secondary btn-sm" onclick="App.pdfSale('${sale.id}')">${icon('download', 'h-4 w-4')} PDF</button>
         <button type="button" class="btn btn-primary btn-sm" onclick="UI.closeModal()">Cerrar</button>`;

    UI.modal({
      title: success ? 'Venta registrada' : 'Venta ' + sale.number,
      subtitle: `${sale.client} · ${money(totals.total)}`,
      size: 'xl',
      iconName: success ? 'check-circle' : 'receipt',
      iconTone: success ? 'green' : 'blue',
      body,
      footer
    });
  },

  /* ---------------- Documentos de venta ---------------- */
  saleDoc(sale) {
    const quote = sale.quoteId ? Store.data.quotes.find((q) => q.id === sale.quoteId) : null;
    return {
      kind: 'venta',
      title: 'Comprobante de venta',
      number: sale.number,
      date: sale.date,
      client: sale.client,
      items: sale.items,
      discount: sale.discount,
      totals: Store.calc(sale.items, sale.discount),
      docType: sale.docType,
      payment: sale.paymentMethod,
      notes: quote ? 'Venta generada a partir del presupuesto ' + quote.number + '.' : '',
      status: null
    };
  },

  pdfSale(id) {
    const sale = Store.data.sales.find((s) => s.id === id);
    if (!sale) return;
    UI.downloadPDF(this.saleDoc(sale));
  },

  printSale(id) {
    const sale = Store.data.sales.find((s) => s.id === id);
    if (!sale) return;
    UI.printDocument(this.saleDoc(sale));
  },

  /* ---------------- Movimientos de stock ---------------- */
  viewMovements() {
    const movements = Store.data.movements;
    const monthKey = isoToday().slice(0, 7);
    const monthCount = movements.filter((movement) => movement.date.startsWith(monthKey)).length;
    const low = Store.lowStock().length;

    return `<div class="mb-4 grid gap-3 sm:grid-cols-3">
        ${this.miniStat('Movimientos totales', String(movements.length), 'layers', 'blue')}
        ${this.miniStat('Movimientos del mes', String(monthCount), 'calendar', 'violet')}
        ${this.miniStat('Productos con stock bajo', String(low), 'alert', low ? 'amber' : 'green')}
      </div>

      <section class="card p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="input-group min-w-0 flex-1">
            ${icon('search')}
            <input class="field" value="${esc(this.ui.movSearch)}" placeholder="Buscar producto, motivo o referencia…" oninput="App.setMovSearch(this.value)" />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select class="field w-full sm:w-44" onchange="App.setMovType(this.value)">
              <option value="todos" ${this.ui.movTypeFilter === 'todos' ? 'selected' : ''}>Todos los movimientos</option>
              <option value="entrada" ${this.ui.movTypeFilter === 'entrada' ? 'selected' : ''}>Entradas</option>
              <option value="salida" ${this.ui.movTypeFilter === 'salida' ? 'selected' : ''}>Salidas</option>
              <option value="ajuste" ${this.ui.movTypeFilter === 'ajuste' ? 'selected' : ''}>Ajustes</option>
            </select>
            <button type="button" class="btn btn-primary" onclick="App.openStockModal()">${icon('plus', 'h-4 w-4')} Registrar movimiento</button>
          </div>
        </div>
      </section>

      <section class="mt-4" id="movements-results">${this.movementsResultsHTML()}</section>`;
  },

  filteredMovements() {
    const search = this.ui.movSearch.trim().toLowerCase();
    return Store.data.movements.filter((movement) => {
      if (this.ui.movTypeFilter !== 'todos' && movement.type !== this.ui.movTypeFilter) return false;
      if (!search) return true;
      return [movement.name, movement.code, movement.reason, movement.ref].join(' ').toLowerCase().includes(search);
    }).sort((a, b) => b.createdAt - a.createdAt);
  },

  movementBadge(type) {
    if (type === 'entrada') return `<span class="badge badge-green">${icon('arrow-down', 'h-3 w-3')} Entrada</span>`;
    if (type === 'salida') return `<span class="badge badge-red">${icon('arrow-up', 'h-3 w-3')} Salida</span>`;
    return `<span class="badge badge-blue">${icon('layers', 'h-3 w-3')} Ajuste</span>`;
  },

  movementsResultsHTML() {
    const movements = this.filteredMovements();
    if (!movements.length) {
      return `<div class="card">${UI.empty({
        iconName: 'layers',
        title: 'Sin movimientos',
        text: this.ui.movSearch || this.ui.movTypeFilter !== 'todos' ? 'Probá con otro filtro o búsqueda.' : 'Registrá una entrada o salida para verla acá.',
        action: `<button class="btn btn-primary btn-sm mt-2" onclick="App.openStockModal()">Registrar movimiento</button>`
      })}</div>`;
    }

    const rows = movements.slice(0, 400).map((movement) => {
      const qtyHtml = movement.type === 'ajuste'
        ? `<span class="font-bold text-blue-700">${movement.stockAfter}</span>`
        : `<span class="font-bold ${movement.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}">${movement.type === 'entrada' ? '+' : '−'}${movement.qty}</span>`;
      return `<tr>
        <td class="whitespace-nowrap text-slate-500">${dmy(movement.date)}</td>
        <td>
          <p class="max-w-[220px] truncate text-xs font-semibold text-slate-700">${esc(movement.name)}</p>
          <p class="text-[10px] text-slate-400">${esc(movement.code)}</p>
        </td>
        <td>${this.movementBadge(movement.type)}</td>
        <td class="num">${qtyHtml}</td>
        <td class="hidden text-slate-500 sm:table-cell">${esc(movement.reason || '—')}</td>
        <td class="hidden text-[10px] text-slate-400 md:table-cell">${esc(movement.ref || '—')}</td>
        <td class="num hidden text-slate-500 lg:table-cell">${movement.stockAfter}</td>
      </tr>`;
    }).join('');

    return `<div class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <p class="text-xs text-slate-500"><strong class="font-bold text-slate-800">${movements.length}</strong> ${movements.length === 1 ? 'movimiento' : 'movimientos'}</p>
        <p class="flex items-center gap-1 text-[10px] text-slate-400">${icon('info', 'h-3.5 w-3.5')} Cada venta genera su salida de stock automáticamente</p>
      </div>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th class="text-right">Cantidad</th>
              <th class="hidden sm:table-cell">Motivo</th>
              <th class="hidden md:table-cell">Referencia</th>
              <th class="hidden text-right lg:table-cell">Stock final</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  setMovSearch(value) {
    this.ui.movSearch = value;
    const target = document.getElementById('movements-results');
    if (target) target.innerHTML = this.movementsResultsHTML();
  },

  setMovType(value) {
    this.ui.movTypeFilter = value;
    const target = document.getElementById('movements-results');
    if (target) target.innerHTML = this.movementsResultsHTML();
  },

  openStockModal(productId = '') {
    const products = Store.data.products;
    if (!products.length) {
      UI.toast('Primero cargá un producto en el inventario.', 'warning');
      this.openProductModal();
      return;
    }
    const selected = productId || products[0].id;

    UI.modal({
      title: 'Registrar movimiento',
      subtitle: 'Entradas, salidas y ajustes de inventario',
      size: 'lg',
      iconName: 'layers',
      iconTone: 'blue',
      body: `<form id="stock-form" class="space-y-4" onsubmit="App.saveStock(event)">
        <div>
          <label class="label" for="stock-product">Producto</label>
          <select class="field" id="stock-product" onchange="App.stockPreview()">
            ${products.map((product) => `<option value="${product.id}" ${selected === product.id ? 'selected' : ''}>${esc(product.code)} · ${esc(product.name)} (stock ${product.stock})</option>`).join('')}
          </select>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label" for="stock-type">Tipo de movimiento</label>
            <select class="field" id="stock-type" onchange="App.stockPreview()">
              <option value="entrada">Entrada de stock</option>
              <option value="salida">Salida de stock</option>
              <option value="ajuste">Ajuste por recuento</option>
            </select>
          </div>
          <div>
            <label class="label" for="stock-qty" id="stock-qty-label">Cantidad a ingresar</label>
            <input class="field" id="stock-qty" type="number" min="0" step="1" value="1" oninput="App.stockPreview()" />
          </div>
        </div>
        <div id="stock-hint" class="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] leading-relaxed text-blue-800"></div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label" for="stock-reason">Motivo</label>
            <input class="field" id="stock-reason" list="stock-reasons" value="Compra" />
            <datalist id="stock-reasons">
              <option value="Compra"></option>
              <option value="Devolución"></option>
              <option value="Pérdida / Rotura"></option>
              <option value="Recuento"></option>
              <option value="Corrección"></option>
              <option value="Otro"></option>
            </datalist>
          </div>
          <div>
            <label class="label" for="stock-ref">Referencia</label>
            <input class="field" id="stock-ref" placeholder="Ej. Factura compra 0001" value="MANUAL" />
          </div>
        </div>
        <div>
          <label class="label" for="stock-note">Nota (opcional)</label>
          <textarea class="field resize-none" id="stock-note" rows="2" placeholder="Detalle adicional del movimiento…"></textarea>
        </div>
      </form>`,
      footer: `<button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button type="submit" form="stock-form" class="btn btn-primary">${icon('check', 'h-4 w-4')} Registrar movimiento</button>`
    });
    setTimeout(() => this.stockPreview(), 20);
  },

  stockPreview() {
    const product = Store.findProduct(document.getElementById('stock-product')?.value);
    if (!product) return;
    const type = document.getElementById('stock-type')?.value || 'entrada';
    const qty = Math.max(0, Number(document.getElementById('stock-qty')?.value) || 0);
    const label = document.getElementById('stock-qty-label');
    const hint = document.getElementById('stock-hint');
    let text = '';

    if (label) {
      label.textContent = type === 'entrada' ? 'Cantidad a ingresar' : type === 'salida' ? 'Cantidad a retirar' : 'Stock final';
    }

    if (type === 'entrada') {
      text = `Stock actual: <strong>${product.stock}</strong> u. · Después del movimiento: <strong>${product.stock + qty}</strong> u.`;
    } else if (type === 'salida') {
      const result = product.stock - qty;
      text = `Stock actual: <strong>${product.stock}</strong> u. · Después del movimiento: <strong>${result}</strong> u.`;
      if (result < 0) text += ' · <span class="font-bold text-red-600">No hay stock suficiente</span>';
    } else {
      text = `Stock actual: <strong>${product.stock}</strong> u. · El recuento dejará el stock en <strong>${qty}</strong> u.`;
    }

    if (hint) hint.innerHTML = text;
  },

  saveStock(event) {
    event.preventDefault();
    const result = Store.addMovement({
      productId: document.getElementById('stock-product').value,
      type: document.getElementById('stock-type').value,
      qty: Number(document.getElementById('stock-qty').value),
      reason: document.getElementById('stock-reason').value,
      ref: document.getElementById('stock-ref').value,
      note: document.getElementById('stock-note').value
    });

    if (!result.ok) {
      UI.toast(result.error, 'error');
      return;
    }

    UI.closeModal();
    UI.toast('Movimiento registrado. Stock actualizado a ' + result.product.stock + ' u.', 'success');
    this.render();
  }
});

/* Arranque */
window.App = App;
App.init();
