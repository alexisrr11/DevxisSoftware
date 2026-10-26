/* Dux MVP — aplicación: núcleo, inicio y productos */
'use strict';

const App = {
  section: 'inicio',
  sub: '',
  param: '',
  _renderedKey: '',

  ui: {
    productSearch: '',
    productCategory: 'all',
    productLow: false,

    quoteSearch: '',
    quoteFilter: 'todos',
    quoteDraft: null,
    quoteProductSearch: '',

    posSearch: '',
    posCategory: 'all',
    posCart: [],
    posClient: 'Consumidor Final',
    posDocType: 'Factura B',
    posDiscount: 0,

    salesSearch: '',
    salesDocFilter: 'todos',

    movSearch: '',
    movTypeFilter: 'todos'
  },

  /* ---------------- Router ---------------- */
  init() {
    Store.init();
    if (!location.hash) history.replaceState(null, '', '#/inicio');
    this.parseRoute();
    this.render();
    window.addEventListener('hashchange', () => {
      this.parseRoute();
      this.render();
    });
  },

  parseRoute() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    this.section = parts[0] || 'inicio';
    this.sub = parts[1] || '';
    this.param = parts[2] || '';
    if (this.section === 'ventas' && !this.sub) this.sub = 'vender';
  },

  go(route) {
    const target = '#/' + String(route || 'inicio').replace(/^#?\/?/, '');
    if (location.hash === target) {
      this.parseRoute();
      this.render();
      return;
    }
    location.hash = target;
  },

  render() {
    this.renderNav();
    let html = '';
    switch (this.section) {
      case 'productos':
        html = this.viewProducts();
        break;
      case 'presupuestos':
        html = (this.sub === 'nuevo' || this.sub === 'editar') ? this.viewQuoteBuilder() : this.viewQuotes();
        break;
      case 'ventas':
        html = this.viewSales();
        break;
      case 'inicio':
      default:
        html = this.viewDashboard();
    }
    const view = document.getElementById('view');
    if (view) view.innerHTML = html;
    this.updateNotifDot();

    const key = this.section + '/' + this.sub + '/' + this.param;
    if (key !== this._renderedKey) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      this._renderedKey = key;
    }
  },

  renderNav() {
    const items = [
      { key: 'inicio', label: 'Inicio', short: 'Inicio', icon: 'home', hash: '#/inicio' },
      { key: 'productos', label: 'Productos e inventario', short: 'Productos', icon: 'box', hash: '#/productos' },
      { key: 'presupuestos', label: 'Presupuestos', short: 'Presupuestos', icon: 'receipt', hash: '#/presupuestos' },
      { key: 'ventas', label: 'Ventas y stock', short: 'Ventas', icon: 'cart', hash: '#/ventas/vender' }
    ];

    const desktop = items.map((item) => {
      const active = this.section === item.key;
      return `<a href="${item.hash}" class="nav-tab ${active ? 'active' : ''}">${icon(item.icon, 'h-4 w-4')}<span>${item.label}</span></a>`;
    }).join('');
    const mobile = items.map((item) => {
      const active = this.section === item.key;
      return `<a href="${item.hash}" class="nav-tab flex-1 justify-center px-2.5 py-1.5 text-[12px] ${active ? 'active' : ''}"><span>${item.short}</span></a>`;
    }).join('');

    const desktopNav = document.getElementById('main-nav');
    const mobileNav = document.getElementById('mobile-nav');
    if (desktopNav) desktopNav.innerHTML = desktop;
    if (mobileNav) mobileNav.innerHTML = mobile;
  },

  updateNotifDot() {
    const dot = document.getElementById('notif-dot');
    if (!dot) return;
    const low = Store.lowStock().length;
    const soon = Store.pendingQuotes().filter((q) => daysUntil(q.dueDate) <= 3).length;
    dot.classList.toggle('hidden', low + soon === 0);
  },

  /* ---------------- Helpers de vista ---------------- */
  pageHeader(title, subtitle, actions = '', eyebrow = '') {
    return `<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        ${eyebrow ? `<p class="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">${esc(eyebrow)}</p>` : ''}
        <h1 class="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">${esc(title)}</h1>
        <p class="mt-1 text-sm text-slate-500">${subtitle}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">${actions}</div>
    </div>`;
  },

  kpi({ label, value, sub, iconName, tone = 'blue', hint = '' }) {
    const tones = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-emerald-50 text-emerald-600',
      amber: 'bg-amber-50 text-amber-600',
      red: 'bg-red-50 text-red-600',
      violet: 'bg-violet-50 text-violet-600'
    };
    return `<div class="card p-4 sm:p-5" ${hint ? `title="${esc(hint)}"` : ''}>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400">${esc(label)}</p>
          <p class="mt-2 truncate text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">${value}</p>
          <p class="mt-1 truncate text-[11px] text-slate-400">${sub}</p>
        </div>
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone] || tones.blue}">${icon(iconName, 'h-5 w-5')}</span>
      </div>
    </div>`;
  },

  miniStat(label, value, iconName = '', tone = 'blue') {
    const tones = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-emerald-600 bg-emerald-50',
      amber: 'text-amber-600 bg-amber-50',
      red: 'text-red-600 bg-red-50',
      slate: 'text-slate-500 bg-slate-100'
    };
    return `<div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      ${iconName ? `<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.blue}">${icon(iconName, 'h-4 w-4')}</span>` : ''}
      <div class="min-w-0">
        <p class="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">${esc(label)}</p>
        <p class="truncate text-sm font-extrabold text-slate-800">${value}</p>
      </div>
    </div>`;
  },

  stockBadge(product, extra = '') {
    if (product.stock <= 0) return `<span class="badge badge-red ${extra}">Sin stock</span>`;
    if (product.stock <= product.minStock) return `<span class="badge badge-amber ${extra}">Stock ${product.stock}</span>`;
    return `<span class="badge badge-green ${extra}">Stock ${product.stock}</span>`;
  },

  quoteStatus(quote) {
    if (quote.status === 'pendiente' && daysUntil(quote.dueDate) < 0) return 'vencido';
    return quote.status;
  },

  quoteBadge(quote) {
    const status = this.quoteStatus(quote);
    const map = {
      pendiente: ['badge-blue', 'Pendiente'],
      vencido: ['badge-red', 'Vencido'],
      vendido: ['badge-green', 'Vendido'],
      anulado: ['badge-slate', 'Anulado']
    };
    const [cls, label] = map[status] || ['badge-slate', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  dueHint(dueDate) {
    const days = daysUntil(dueDate);
    if (days < 0) return `<span class="text-[10px] font-semibold text-red-500">Venció hace ${Math.abs(days)} d</span>`;
    if (days === 0) return `<span class="text-[10px] font-semibold text-amber-600">Vence hoy</span>`;
    if (days <= 3) return `<span class="text-[10px] font-semibold text-amber-600">Vence en ${days} d</span>`;
    return `<span class="text-[10px] text-slate-400">Vence en ${days} d</span>`;
  },

  detailTotals(totals, discount = 0) {
    return `<div class="space-y-1.5 text-sm">
      <div class="flex justify-between text-slate-500"><span>Neto</span><span class="font-medium text-slate-700">${money(totals.net)}</span></div>
      ${totals.discount > 0 ? `<div class="flex justify-between text-slate-500"><span>Descuento${discount ? ' (' + discount + '%)' : ''}</span><span class="font-medium text-red-600">− ${money(totals.discount)}</span></div>` : ''}
      <div class="flex justify-between text-slate-500"><span>Subtotal</span><span class="font-medium text-slate-700">${money(totals.subtotal)}</span></div>
      <div class="flex justify-between text-slate-500"><span>IVA 21%</span><span class="font-medium text-slate-700">${money(totals.iva)}</span></div>
      <div class="mt-2 flex items-center justify-between rounded-lg bg-blue-600 px-3 py-2.5 text-white">
        <span class="text-[11px] font-bold uppercase tracking-[0.08em]">Total</span>
        <span class="text-base font-extrabold">${money(totals.total)}</span>
      </div>
    </div>`;
  },

  clientDatalist() {
    return `<datalist id="clientes-list">${Store.data.clients.map((c) => `<option value="${esc(c.name)}"></option>`).join('')}</datalist>`;
  },

  /* ---------------- Inicio ---------------- */
  viewDashboard() {
    const sales = Store.data.sales;
    const products = Store.data.products;
    const monthKey = isoToday().slice(0, 7);
    const monthSales = sales.filter((sale) => sale.date.startsWith(monthKey));
    const monthTotal = monthSales.reduce((sum, sale) => sum + sale.totals.total, 0);
    const todaySales = sales.filter((sale) => sale.date === isoToday());
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.totals.total, 0);
    const low = Store.lowStock();
    const pending = Store.pendingQuotes();
    const pendingTotal = pending.reduce((sum, quote) => sum + quote.totals.total, 0);
    const inventoryValue = products.reduce((sum, p) => sum + (Number(p.cost) || 0) * p.stock, 0);

    const lastDays = Array.from({ length: 7 }, (_, index) => addDays(isoToday(), index - 6));
    const dayTotals = lastDays.map((day) => sales.filter((sale) => sale.date === day).reduce((sum, sale) => sum + sale.totals.total, 0));
    const maxDay = Math.max(...dayTotals, 1);
    const weekTotal = dayTotals.reduce((sum, value) => sum + value, 0);

    const bars = dayTotals.map((value, index) => {
      const pct = Math.max(value > 0 ? 6 : 1.5, Math.round((value / maxDay) * 100));
      return `<div class="flex h-full flex-1 flex-col justify-end">
        <div class="chart-bar" style="height:${pct}%" data-value="${money(value)}"></div>
      </div>`;
    }).join('');

    const labels = lastDays.map((day) => `<div class="flex-1 text-center text-[9px] font-medium capitalize text-slate-400">${shortDay(day)}</div>`).join('');

    const recentSales = [...sales]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((sale) => `<button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50" onclick="App.openSaleDetail('${sale.id}')">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">${icon('receipt', 'h-4 w-4')}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold text-slate-700">${esc(sale.client)}</span>
          <span class="block text-[10px] text-slate-400">${esc(sale.number)} · ${dmy(sale.date)} · ${esc(sale.docType)}</span>
        </span>
        <span class="shrink-0 text-xs font-bold text-slate-800">${money(sale.totals.total)}</span>
        <span class="shrink-0 text-slate-300">${icon('chevron-right', 'h-4 w-4')}</span>
      </button>`).join('');

    const lowRows = low.slice(0, 4).map((product) => `<div class="flex items-center gap-2.5 px-4 py-2.5">
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">${icon('package', 'h-4 w-4')}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-semibold text-slate-700">${esc(product.name)}</p>
        <p class="text-[10px] text-slate-400">${esc(product.code)} · mín. ${product.minStock}</p>
      </div>
      <span class="badge ${product.stock === 0 ? 'badge-red' : 'badge-amber'}">${product.stock} u.</span>
      <button type="button" class="btn btn-soft btn-sm" onclick="App.openStockModal('${product.id}')">Reponer</button>
    </div>`).join('');

    const pendingRows = [...pending]
      .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
      .slice(0, 4)
      .map((quote) => `<button type="button" class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-slate-50" onclick="App.openQuoteDetail('${quote.id}')">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">${icon('receipt', 'h-4 w-4')}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold text-slate-700">${esc(quote.client)}</span>
          <span class="block text-[10px] text-slate-400">${esc(quote.number)} · ${this.dueHint(quote.dueDate)}</span>
        </span>
        <span class="shrink-0 text-right">
          <span class="block text-xs font-bold text-slate-800">${money(quote.totals.total)}</span>
          <span class="mt-0.5 block">${this.quoteBadge(quote)}</span>
        </span>
      </button>`).join('');

    const quickActions = [
      { label: 'Nueva venta', desc: 'Cobrar y descontar stock', iconName: 'cart', action: "App.go('ventas/vender')", tone: 'bg-blue-50 text-blue-600' },
      { label: 'Nuevo presupuesto', desc: 'Cotizar en segundos', iconName: 'receipt', action: 'App.newQuote()', tone: 'bg-violet-50 text-violet-600' },
      { label: 'Nuevo producto', desc: 'Cargar en el inventario', iconName: 'plus', action: 'App.openProductModal()', tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Movimientos', desc: 'Entradas y salidas', iconName: 'layers', action: "App.go('ventas/movimientos')", tone: 'bg-amber-50 text-amber-600' }
    ].map((item) => `<button type="button" class="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40" onclick="${item.action}">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.tone}">${icon(item.iconName, 'h-[18px] w-[18px]')}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-bold text-slate-700">${item.label}</span>
        <span class="block truncate text-[10px] text-slate-400">${item.desc}</span>
      </span>
      <span class="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500">${icon('chevron-right', 'h-4 w-4')}</span>
    </button>`).join('');

    return `
      ${this.pageHeader('Resumen del negocio', `${longDate(isoToday())} · Todo lo importante, en un vistazo.`,
        `<button type="button" class="btn btn-secondary" onclick="App.newQuote()">${icon('receipt', 'h-4 w-4')} Nuevo presupuesto</button>
         <button type="button" class="btn btn-primary" onclick="App.go('ventas/vender')">${icon('cart', 'h-4 w-4')} Nueva venta</button>`,
        'Panel general')}

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${this.kpi({ label: 'Ventas del mes', value: money(monthTotal), sub: `${monthSales.length} ventas · Hoy ${money(todayTotal)}`, iconName: 'trending', tone: 'blue', hint: 'Total facturado en el mes en curso' })}
        ${this.kpi({ label: 'Presupuestos pendientes', value: String(pending.length), sub: `${money(pendingTotal)} en cotizaciones`, iconName: 'receipt', tone: 'violet', hint: 'Presupuestos aún no convertidos en venta' })}
        ${this.kpi({ label: 'Stock bajo', value: String(low.length), sub: low.length ? 'Productos que requieren reposición' : 'Todo el inventario está en orden', iconName: 'alert', tone: low.length ? 'amber' : 'green' })}
        ${this.kpi({ label: 'Valor de inventario', value: money(inventoryValue), sub: `${products.length} productos · valorizado a costo`, iconName: 'package', tone: 'green' })}
      </div>

      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section class="card p-4 sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Actividad de ventas</h2>
              <p class="mt-0.5 text-xs text-slate-400">Últimos 7 días</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Acumulado</p>
              <p class="text-base font-extrabold text-slate-900">${money(weekTotal)}</p>
            </div>
          </div>
          <div class="mt-5 flex h-36 items-end gap-2 sm:gap-3">${bars}</div>
          <div class="mt-2 flex gap-2 sm:gap-3">${labels}</div>
        </section>

        <section class="card p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Accesos rápidos</h2>
              <p class="mt-0.5 text-xs text-slate-400">Atajos a las tareas frecuentes</p>
            </div>
            <span class="text-slate-300">${icon('sparkles', 'h-5 w-5')}</span>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">${quickActions}</div>
        </section>
      </div>

      <div class="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section class="card overflow-hidden">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Ventas recientes</h2>
              <p class="text-xs text-slate-400">Últimas operaciones registradas</p>
            </div>
            <button type="button" class="text-xs font-semibold text-blue-600 hover:text-blue-800" onclick="App.go('ventas/historial')">Ver todas</button>
          </div>
          <div class="divide-y divide-slate-100">${recentSales || UI.empty({ iconName: 'cart', title: 'Todavía no hay ventas', text: 'Registrá tu primera venta para verla acá.' })}</div>
        </section>

        <div class="space-y-5">
          <section class="card overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-slate-800">Stock bajo</h2>
                ${low.length ? `<span class="badge badge-amber">${low.length}</span>` : ''}
              </div>
              <button type="button" class="text-xs font-semibold text-blue-600 hover:text-blue-800" onclick="App.go('productos')">Ver todo</button>
            </div>
            <div class="divide-y divide-slate-100">
              ${lowRows || `<div class="px-4 py-5 text-center text-xs text-slate-400">No hay productos por debajo del stock mínimo.</div>`}
            </div>
          </section>

          <section class="card overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-slate-800">Presupuestos por vencer</h2>
                ${pending.length ? `<span class="badge badge-blue">${pending.length}</span>` : ''}
              </div>
              <button type="button" class="text-xs font-semibold text-blue-600 hover:text-blue-800" onclick="App.go('presupuestos')">Ver todos</button>
            </div>
            <div class="divide-y divide-slate-100">
              ${pendingRows || `<div class="px-4 py-5 text-center text-xs text-slate-400">No hay presupuestos pendientes.</div>`}
            </div>
          </section>
        </div>
      </div>

      <p class="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
        ${icon('info', 'h-3.5 w-3.5')} Demo Funcional.
      </p>`;
  },

  /* ---------------- Productos ---------------- */
  viewProducts() {
    const products = Store.data.products;
    const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es'));
    const inventoryValue = products.reduce((sum, p) => sum + (Number(p.cost) || 0) * p.stock, 0);
    const low = products.filter((p) => p.stock <= p.minStock);

    return `
      ${this.pageHeader('Productos e inventario', 'Alta, edición y control de stock de tu catálogo.',
        `<button type="button" class="btn btn-secondary" onclick="App.go('ventas/movimientos')">${icon('layers', 'h-4 w-4')} Movimientos</button>
         <button type="button" class="btn btn-primary" onclick="App.openProductModal()">${icon('plus', 'h-4 w-4')} Nuevo producto</button>`,
        'Catálogo')}

      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        ${this.miniStat('Productos activos', `${products.length} SKU`, 'box', 'blue')}
        ${this.miniStat('Stock bajo', `${low.length} productos`, 'alert', low.length ? 'amber' : 'green')}
        ${this.miniStat('Inventario a costo', money(inventoryValue), 'dollar', 'green')}
      </div>

      <section class="card p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="input-group min-w-0 flex-1">
            ${icon('search')}
            <input class="field" value="${esc(this.ui.productSearch)}" placeholder="Buscar por nombre, código o categoría…" oninput="App.setProductSearch(this.value)" />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select class="field w-full sm:w-48" onchange="App.setProductCategory(this.value)">
              <option value="all">Todas las categorías</option>
              ${categories.map((cat) => `<option value="${esc(cat)}" ${this.ui.productCategory === cat ? 'selected' : ''}>${esc(cat)}</option>`).join('')}
            </select>
            <button type="button" class="chip ${this.ui.productLow ? 'active' : ''}" onclick="App.toggleProductLow()">
              ${icon('alert', 'h-3.5 w-3.5')} Stock bajo ${low.length ? `· ${low.length}` : ''}
            </button>
          </div>
        </div>
      </section>

      <section class="mt-4" id="products-results">${this.productsResultsHTML()}</section>`;
  },

  filteredProducts() {
    const search = this.ui.productSearch.trim().toLowerCase();
    return Store.data.products.filter((product) => {
      if (this.ui.productLow && product.stock > product.minStock) return false;
      if (this.ui.productCategory !== 'all' && product.category !== this.ui.productCategory) return false;
      if (!search) return true;
      return [product.name, product.code, product.category].join(' ').toLowerCase().includes(search);
    }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  productsResultsHTML() {
    const products = this.filteredProducts();
    const hasFilters = this.ui.productSearch || this.ui.productCategory !== 'all' || this.ui.productLow;

    if (!products.length) {
      return `<div class="card">${UI.empty({
        iconName: 'search',
        title: 'No encontramos productos',
        text: hasFilters ? 'Probá con otra búsqueda o quitá los filtros.' : 'Cargá tu primer producto para empezar.',
        action: hasFilters
          ? `<button class="btn btn-secondary btn-sm mt-2" onclick="App.clearProductFilters()">Limpiar filtros</button>`
          : `<button class="btn btn-primary btn-sm mt-2" onclick="App.openProductModal()">Nuevo producto</button>`
      })}</div>`;
    }

    const rows = products.map((product) => {
      const [from, to, ink] = artPalette(product.category);
      return `<tr>
        <td>
          <div class="flex items-center gap-2.5">
            <span class="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg" style="background-image:linear-gradient(135deg,${from},${to});color:${ink}">
              ${icon('package', 'h-4 w-4')}
            </span>
            <div class="min-w-0">
              <p class="max-w-[240px] truncate text-xs font-semibold text-slate-800">${esc(product.name)}</p>
              <p class="text-[10px] text-slate-400">${esc(product.code)}</p>
            </div>
          </div>
        </td>
        <td class="hidden md:table-cell"><span class="badge badge-slate">${esc(product.category)}</span></td>
        <td class="num"><span class="font-semibold text-slate-800">${money(product.price)}</span><span class="ml-1 text-[9px] text-slate-400">+IVA</span></td>
        <td class="num hidden lg:table-cell text-slate-500">${product.cost ? money(product.cost) : '—'}</td>
        <td>${this.stockBadge(product)}</td>
        <td class="num hidden xl:table-cell text-[10px] text-slate-400">mín. ${product.minStock}</td>
        <td>
          <div class="flex items-center justify-end gap-0.5">
            <button type="button" class="icon-btn" title="Ajustar stock" onclick="App.openStockModal('${product.id}')">${icon('layers', 'h-4 w-4')}</button>
            <button type="button" class="icon-btn" title="Editar producto" onclick="App.openProductModal('${product.id}')">${icon('pencil', 'h-4 w-4')}</button>
            <button type="button" class="icon-btn danger" title="Eliminar producto" onclick="App.deleteProduct('${product.id}')">${icon('trash', 'h-4 w-4')}</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `<div class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <p class="text-xs text-slate-500"><strong class="font-bold text-slate-800">${products.length}</strong> ${products.length === 1 ? 'producto' : 'productos'}${hasFilters ? ' con filtros aplicados' : ''}</p>
        <p class="flex items-center gap-1 text-[10px] text-slate-400">${icon('info', 'h-3.5 w-3.5')} Precios expresados sin IVA</p>
      </div>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="hidden md:table-cell">Categoría</th>
              <th class="text-right">Precio venta</th>
              <th class="hidden text-right lg:table-cell">Costo</th>
              <th>Stock</th>
              <th class="hidden text-right xl:table-cell">Mínimo</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  refreshProducts() {
    const target = document.getElementById('products-results');
    if (target) target.innerHTML = this.productsResultsHTML();
  },

  setProductSearch(value) {
    this.ui.productSearch = value;
    this.refreshProducts();
  },

  setProductCategory(value) {
    this.ui.productCategory = value;
    this.refreshProducts();
  },

  toggleProductLow() {
    this.ui.productLow = !this.ui.productLow;
    const button = document.querySelector('.chip[onclick="App.toggleProductLow()"]');
    if (button) button.classList.toggle('active', this.ui.productLow);
    this.refreshProducts();
  },

  clearProductFilters() {
    this.ui.productSearch = '';
    this.ui.productCategory = 'all';
    this.ui.productLow = false;
    this.render();
  },

  openProductModal(id = null) {
    const product = id ? Store.findProduct(id) : null;
    this._editingProductId = product ? product.id : null;
    const categories = [...new Set(Store.data.products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es'));

    UI.modal({
      title: product ? 'Editar producto' : 'Nuevo producto',
      subtitle: product ? product.code : 'Completá los datos del artículo. El precio se carga sin IVA.',
      size: 'lg',
      iconName: 'box',
      iconTone: product ? 'blue' : 'green',
      body: `<form id="product-form" class="space-y-4" onsubmit="App.saveProduct(event)">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label" for="pf-code">Código / SKU *</label>
            <input class="field" id="pf-code" required maxlength="30" placeholder="Ej. REM-001" value="${esc(product ? product.code : '')}" />
          </div>
          <div>
            <label class="label" for="pf-category">Categoría</label>
            <input class="field" id="pf-category" list="category-list" placeholder="Ej. Remeras" value="${esc(product ? product.category : '')}" />
            <datalist id="category-list">${categories.map((cat) => `<option value="${esc(cat)}"></option>`).join('')}</datalist>
          </div>
        </div>
        <div>
          <label class="label" for="pf-name">Descripción *</label>
          <input class="field" id="pf-name" required maxlength="90" placeholder="Ej. Remera básica de algodón" value="${esc(product ? product.name : '')}" />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label" for="pf-price">Precio de venta (sin IVA) *</label>
            <input class="field" id="pf-price" type="number" min="0" step="0.01" required placeholder="0,00" value="${product ? product.price : ''}" />
          </div>
          <div>
            <label class="label" for="pf-cost">Costo (opcional)</label>
            <input class="field" id="pf-cost" type="number" min="0" step="0.01" placeholder="0,00" value="${product && product.cost ? product.cost : ''}" />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="label" for="pf-stock">Stock actual</label>
            <input class="field" id="pf-stock" type="number" min="0" step="1" value="${product ? product.stock : 0}" />
          </div>
          <div>
            <label class="label" for="pf-min">Stock mínimo</label>
            <input class="field" id="pf-min" type="number" min="0" step="1" value="${product ? product.minStock : 0}" />
          </div>
        </div>
        <div class="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] leading-relaxed text-blue-800">
          ${icon('info', 'h-4 w-4 shrink-0')}
          <span>El IVA (21%) se suma en la venta. Los cambios de stock quedan registrados como movimiento de ajuste.</span>
        </div>
      </form>`,
      footer: `
        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button type="submit" form="product-form" class="btn btn-primary">${icon('check', 'h-4 w-4')} ${product ? 'Guardar cambios' : 'Crear producto'}</button>`
    });
  },

  saveProduct(event) {
    event.preventDefault();
    const result = Store.saveProduct({
      id: this._editingProductId || undefined,
      code: document.getElementById('pf-code').value,
      name: document.getElementById('pf-name').value,
      category: document.getElementById('pf-category').value,
      price: Number(document.getElementById('pf-price').value),
      cost: Number(document.getElementById('pf-cost').value || 0),
      stock: Number(document.getElementById('pf-stock').value || 0),
      minStock: Number(document.getElementById('pf-min').value || 0)
    });
    if (!result.ok) {
      UI.toast(result.error, 'error');
      return;
    }
    UI.closeModal();
    this._editingProductId = null;
    UI.toast(result.product.name + ' se guardó correctamente.');
    this.render();
  },

  deleteProduct(id) {
    const product = Store.findProduct(id);
    if (!product) return;
    UI.confirm({
      title: 'Eliminar producto',
      message: `Se eliminará <strong>${esc(product.name)}</strong> del catálogo. Las ventas y presupuestos anteriores conservan su detalle histórico.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      action: () => {
        const result = Store.deleteProduct(id);
        if (!result.ok) {
          UI.toast(result.error, 'error');
          return;
        }
        UI.toast('Producto eliminado.', 'info');
        this.render();
      }
    });
  },

  /* ---------------- Ayuda / configuración ---------------- */
  openHelp() {
    UI.modal({
      title: 'Guía rápida',
      subtitle: 'Todo lo que podés hacer en este MVP',
      size: 'lg',
      iconName: 'help',
      body: `<div class="space-y-3">
        ${[
          ['Inicio', 'Resumen de ventas del mes, presupuestos pendientes, stock bajo y accesos rápidos.', 'home'],
          ['Productos e inventario', 'Alta y edición con código, descripción, precio sin IVA, costo opcional, stock y stock mínimo.', 'box'],
          ['Presupuestos', 'Seleccioná cliente y productos, definí cantidades, descuentos y vencimiento. Podés imprimir, exportar a PDF y convertir en venta.', 'receipt'],
          ['Ventas y stock', 'Punto de venta estilo Dvx, historial de operaciones y trazabilidad completa de entradas, salidas y ajustes.', 'cart']
        ].map(([title, text, iconName]) => `<div class="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">${icon(iconName, 'h-4 w-4')}</span>
          <div><p class="text-xs font-bold text-slate-800">${title}</p><p class="mt-0.5 text-xs leading-relaxed text-slate-500">${text}</p></div>
        </div>`).join('')}
        <div class="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
          <strong class="text-slate-700">Datos de demo:</strong> la información se guarda en <code class="rounded bg-white px-1 py-0.5 text-[10px]">localStorage</code>. Podés restablecerla desde Configuración. El IVA aplicado es del 21% y los precios se cargan netos.
        </div>
      </div>`,
      footer: `<button type="button" class="btn btn-primary" onclick="UI.closeModal()">Entendido</button>`
    });
  },

  openNotifications() {
    const low = Store.lowStock();
    const pending = Store.pendingQuotes().sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
    const lowHtml = low.slice(0, 4).map((product) => `<button type="button" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-amber-50" onclick="UI.closeModal();setTimeout(()=>App.openStockModal('${product.id}'),80)">
      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-600">${icon('alert', 'h-3.5 w-3.5')}</span>
      <span class="min-w-0 flex-1 text-xs font-medium text-slate-700">${esc(product.name)}</span>
      <span class="badge badge-amber">${product.stock} u.</span>
    </button>`).join('');

    const pendingHtml = pending.slice(0, 4).map((quote) => `<button type="button" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50" onclick="UI.closeModal();setTimeout(()=>App.openQuoteDetail('${quote.id}'),80)">
      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600">${icon('clock', 'h-3.5 w-3.5')}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-medium text-slate-700">${esc(quote.client)}</span>
        <span class="block text-[10px] text-slate-400">${esc(quote.number)} · ${dmy(quote.dueDate)}</span>
      </span>
      <span class="text-[10px] font-semibold text-amber-600">${Math.max(0, daysUntil(quote.dueDate))} d</span>
    </button>`).join('');

    UI.modal({
      title: 'Notificaciones',
      subtitle: 'Alertas de inventario y presupuestos',
      size: 'md',
      iconName: 'bell',
      body: `<div class="space-y-4">
        <div>
          <div class="mb-1 flex items-center justify-between"><p class="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Stock bajo</p><span class="badge badge-amber">${low.length}</span></div>
          ${lowHtml || '<p class="px-3 py-2 text-xs text-slate-400">Sin alertas de stock.</p>'}
        </div>
        <div>
          <div class="mb-1 flex items-center justify-between"><p class="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Presupuestos pendientes</p><span class="badge badge-blue">${pending.length}</span></div>
          ${pendingHtml || '<p class="px-3 py-2 text-xs text-slate-400">Sin presupuestos pendientes.</p>'}
        </div>
      </div>`,
      footer: `<button type="button" class="btn btn-secondary" onclick="UI.closeModal();App.go('productos')">Ver inventario</button>
               <button type="button" class="btn btn-primary" onclick="UI.closeModal();App.go('presupuestos')">Ver presupuestos</button>`
    });
  },

  openSettings() {
    const data = Store.data;
    let size = 0;
    try { size = new Blob([JSON.stringify(data)]).size; } catch (err) { size = 0; }
    UI.modal({
      title: 'Configuración',
      subtitle: 'Datos y mantenimiento de la demo',
      size: 'lg',
      iconName: 'settings',
      body: `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          ${this.miniStat('Productos', data.products.length, 'box', 'blue')}
          ${this.miniStat('Ventas', data.sales.length, 'cart', 'green')}
          ${this.miniStat('Presupuestos', data.quotes.length, 'receipt', 'violet')}
          ${this.miniStat('Movimientos', data.movements.length, 'layers', 'amber')}
        </div>
        <div class="rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-500">
          ${icon('info', 'h-4 w-4 text-blue-500')} Los datos se guardan en el almacenamiento local del navegador (${(size / 1024).toFixed(1)} KB). No se envían a ningún servidor.
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <button type="button" class="btn btn-secondary" onclick="App.downloadBackup()">${icon('download', 'h-4 w-4')} Exportar respaldo JSON</button>
          <button type="button" class="btn btn-danger" onclick="App.resetDemo()">${icon('refresh', 'h-4 w-4')} Restablecer datos demo</button>
        </div>
        <div class="rounded-xl bg-blue-50/70 p-3 text-[11px] leading-relaxed text-blue-900">
          <strong>MVP Devxis Software</strong><br />HTML + Tailwind CSS + JavaScript · Persistencia localStorage · PDF con jsPDF.
        </div>
      </div>`,
      footer: `<button type="button" class="btn btn-primary" onclick="UI.closeModal()">Cerrar</button>`
    });
  },

  downloadBackup() {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dvx-backup-' + isoToday() + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('Respaldo JSON descargado.', 'info');
  },

  resetDemo() {
    UI.confirm({
      title: 'Restablecer datos de demo',
      message: 'Se eliminarán los productos, ventas y presupuestos que hayas creado y se restaurará la información de ejemplo. Esta acción no se puede deshacer.',
      confirmText: 'Restablecer',
      tone: 'danger',
      action: () => {
        Store.reset();
        this.ui.quoteDraft = null;
        this.ui.posCart = [];
        this.ui.posDiscount = 0;
        this.ui.posClient = 'Consumidor Final';
        this.ui.productSearch = '';
        this.ui.productCategory = 'all';
        this.ui.productLow = false;
        this.go('inicio');
        this.render();
        UI.toast('Datos de demo restablecidos.', 'info');
      }
    });
  },

  refresh() {
    Store.reload();
    this.render();
    UI.toast('Datos actualizados desde el navegador.', 'info');
  }
};
