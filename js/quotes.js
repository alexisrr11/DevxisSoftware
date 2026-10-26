/* Dux MVP — presupuestos */
'use strict';

Object.assign(App, {
  /* ---------------- Listado ---------------- */
  viewQuotes() {
    const quotes = Store.data.quotes;
    const pending = quotes.filter((quote) => this.quoteStatus(quote) === 'pendiente');
    const expired = quotes.filter((quote) => this.quoteStatus(quote) === 'vencido');
    const active = quotes.filter((quote) => this.quoteStatus(quote) !== 'vendido');
    const activeTotal = active.reduce((sum, quote) => sum + quote.totals.total, 0);

    return `
      ${this.pageHeader('Presupuestos', 'Cotizá, imprimí y convertí presupuestos en ventas.',
        `<button type="button" class="btn btn-primary" onclick="App.newQuote()">${icon('plus', 'h-4 w-4')} Nuevo presupuesto</button>`,
        'Cotizaciones')}

      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        ${this.miniStat('Pendientes', `${pending.length} presupuestos`, 'clock', 'blue')}
        ${this.miniStat('Vencidos', `${expired.length} presupuestos`, 'alert', expired.length ? 'red' : 'slate')}
        ${this.miniStat('Total cotizado activo', money(activeTotal), 'receipt', 'violet')}
      </div>

      <section class="card p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="input-group min-w-0 flex-1">
            ${icon('search')}
            <input class="field" value="${esc(this.ui.quoteSearch)}" placeholder="Buscar por número, cliente o producto…" oninput="App.setQuoteSearch(this.value)" />
          </div>
          <select class="field w-full lg:w-52" onchange="App.setQuoteFilter(this.value)">
            <option value="todos" ${this.ui.quoteFilter === 'todos' ? 'selected' : ''}>Todos los estados</option>
            <option value="pendientes" ${this.ui.quoteFilter === 'pendientes' ? 'selected' : ''}>Pendientes</option>
            <option value="vencidos" ${this.ui.quoteFilter === 'vencidos' ? 'selected' : ''}>Vencidos</option>
            <option value="vendidos" ${this.ui.quoteFilter === 'vendidos' ? 'selected' : ''}>Vendidos</option>
          </select>
        </div>
      </section>

      <section class="mt-4" id="quotes-results">${this.quotesResultsHTML()}</section>`;
  },

  filteredQuotes() {
    const search = this.ui.quoteSearch.trim().toLowerCase();
    const filter = this.ui.quoteFilter;
    return Store.data.quotes.filter((quote) => {
      const status = this.quoteStatus(quote);
      if (filter === 'pendientes' && status !== 'pendiente') return false;
      if (filter === 'vencidos' && status !== 'vencido') return false;
      if (filter === 'vendidos' && status !== 'vendido') return false;
      if (!search) return true;
      const haystack = [quote.number, quote.client, quote.clientDoc, ...(quote.items || []).map((item) => item.name + ' ' + item.code)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    }).sort((a, b) => b.createdAt - a.createdAt);
  },

  quotesResultsHTML() {
    const quotes = this.filteredQuotes();
    if (!quotes.length) {
      return `<div class="card">${UI.empty({
        iconName: 'receipt',
        title: 'No hay presupuestos para mostrar',
        text: this.ui.quoteSearch || this.ui.quoteFilter !== 'todos' ? 'Probá con otro filtro o búsqueda.' : 'Creá tu primer presupuesto para enviarlo a un cliente.',
        action: `<button class="btn btn-primary btn-sm mt-2" onclick="App.newQuote()">Nuevo presupuesto</button>`
      })}</div>`;
    }

    const rows = quotes.map((quote) => {
      const status = this.quoteStatus(quote);
      const units = quote.items.reduce((sum, item) => sum + Number(item.qty), 0);
      return `<tr>
        <td><span class="font-bold text-slate-800">${esc(quote.number)}</span></td>
        <td>
          <p class="max-w-[200px] truncate text-xs font-semibold text-slate-700">${esc(quote.client)}</p>
          <p class="text-[10px] text-slate-400">${quote.clientDoc ? esc(quote.clientDoc) : 'Sin documento'}</p>
        </td>
        <td class="hidden text-slate-500 sm:table-cell">${dmy(quote.date)}</td>
        <td>
          <p class="text-slate-600">${dmy(quote.dueDate)}</p>
          ${status === 'vendido' ? '<p class="text-[10px] text-emerald-600">Convertido en venta</p>' : this.dueHint(quote.dueDate)}
        </td>
        <td class="num hidden text-slate-500 md:table-cell">${units} u.</td>
        <td class="num font-bold text-slate-800">${money(quote.totals.total)}</td>
        <td>${this.quoteBadge(quote)}</td>
        <td>
          <div class="flex items-center justify-end gap-0.5">
            <button type="button" class="icon-btn" title="Ver detalle" onclick="App.openQuoteDetail('${quote.id}')">${icon('eye', 'h-4 w-4')}</button>
            <button type="button" class="icon-btn" title="Descargar PDF" onclick="App.pdfQuote('${quote.id}')">${icon('download', 'h-4 w-4')}</button>
            ${status !== 'vendido' ? `<button type="button" class="icon-btn" title="Editar" onclick="App.editQuote('${quote.id}')">${icon('pencil', 'h-4 w-4')}</button>` : ''}
            ${status !== 'vendido' ? `<button type="button" class="icon-btn text-blue-600" title="Convertir en venta" onclick="App.convertQuote('${quote.id}')">${icon('cart', 'h-4 w-4')}</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    return `<div class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p class="text-xs text-slate-500"><strong class="font-bold text-slate-800">${quotes.length}</strong> ${quotes.length === 1 ? 'presupuesto' : 'presupuestos'}</p>
        <p class="hidden text-[10px] text-slate-400 sm:block">Los presupuestos vencidos se calculan automáticamente por fecha.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th class="hidden sm:table-cell">Emisión</th>
              <th>Vencimiento</th>
              <th class="hidden text-right md:table-cell">Ítems</th>
              <th class="text-right">Total</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  setQuoteSearch(value) {
    this.ui.quoteSearch = value;
    const target = document.getElementById('quotes-results');
    if (target) target.innerHTML = this.quotesResultsHTML();
  },

  setQuoteFilter(value) {
    this.ui.quoteFilter = value;
    const target = document.getElementById('quotes-results');
    if (target) target.innerHTML = this.quotesResultsHTML();
  },

  openQuoteDetail(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    const status = this.quoteStatus(quote);
    const canConvert = status !== 'vendido';
    const totals = Store.calc(quote.items, quote.discount);

    const items = quote.items.map((item) => {
      const line = Number(item.qty) * Number(item.price) * (1 - (Number(item.discount) || 0) / 100);
      return `<tr>
        <td class="text-center text-slate-500">${item.qty}</td>
        <td><p class="text-xs font-semibold text-slate-700">${esc(item.name)}</p><p class="text-[10px] text-slate-400">${esc(item.code)}${item.discount ? ` · Desc. ${item.discount}%` : ''}</p></td>
        <td class="num text-slate-500">${money(item.price)}</td>
        <td class="num font-semibold text-slate-800">${money(line)}</td>
      </tr>`;
    }).join('');

    const body = `<div class="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p class="label">Cliente</p>
        <p class="text-sm font-bold text-slate-800">${esc(quote.client)}</p>
        <p class="mt-0.5 text-xs text-slate-500">${quote.clientDoc ? esc(quote.clientDoc) : 'Sin documento cargado'}</p>
        <div class="mt-2">${this.quoteBadge(quote)}</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-xl border border-slate-200 p-2.5">
          <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Emisión</p>
          <p class="mt-1 text-xs font-semibold text-slate-700">${dmy(quote.date)}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-2.5">
          <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Vencimiento</p>
          <p class="mt-1 text-xs font-semibold text-slate-700">${dmy(quote.dueDate)}</p>
          ${status === 'vendido' ? '' : `<div class="mt-0.5">${this.dueHint(quote.dueDate)}</div>`}
        </div>
      </div>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <table class="tbl">
        <thead><tr><th class="w-14 text-center">Cant.</th><th>Producto</th><th class="text-right">P. unit.</th><th class="text-right">Subtotal</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
    </div>

    <div class="mt-4 flex justify-end">
      <div class="w-full max-w-xs">${this.detailTotals(totals, quote.discount)}</div>
    </div>

    ${quote.notes ? `<div class="mt-4 rounded-xl bg-slate-50 p-3"><p class="label">Observaciones</p><p class="whitespace-pre-line text-xs leading-relaxed text-slate-600">${esc(quote.notes)}</p></div>` : ''}

    ${quote.saleId ? `<button type="button" class="mt-4 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100" onclick="UI.closeModal();App.openSaleDetail('${quote.saleId}')">
      <span>Presupuesto convertido en venta</span><span>${icon('chevron-right', 'h-4 w-4')}</span>
    </button>` : ''}`;

    const footer = `
      ${status !== 'vendido' ? `<button type="button" class="btn btn-danger btn-sm mr-auto" onclick="App.deleteQuote('${quote.id}')">${icon('trash', 'h-4 w-4')} Eliminar</button>` : ''}
      <button type="button" class="btn btn-secondary btn-sm" onclick="App.printQuote('${quote.id}')">${icon('printer', 'h-4 w-4')} Imprimir</button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="App.pdfQuote('${quote.id}')">${icon('download', 'h-4 w-4')} PDF</button>
      ${status !== 'vendido' ? `<button type="button" class="btn btn-secondary btn-sm" onclick="App.editQuote('${quote.id}')">${icon('pencil', 'h-4 w-4')} Editar</button>` : ''}
      ${canConvert ? `<button type="button" class="btn btn-primary btn-sm" onclick="App.convertQuote('${quote.id}')">${icon('cart', 'h-4 w-4')} Convertir en venta</button>` : ''}`;

    UI.modal({
      title: 'Presupuesto ' + quote.number,
      subtitle: quote.client + ' · ' + dmy(quote.date),
      size: 'xl',
      iconName: 'receipt',
      iconTone: status === 'vendido' ? 'green' : status === 'vencido' ? 'red' : 'blue',
      body,
      footer
    });
  },

  /* ---------------- Constructor ---------------- */
  newQuote() {
    this.ui.quoteDraft = {
      id: null,
      client: '',
      clientDoc: '',
      date: isoToday(),
      dueDate: addDays(isoToday(), 15),
      discount: 0,
      notes: '',
      items: []
    };
    this.ui.quoteProductSearch = '';
    this.go('presupuestos/nuevo');
  },

  editQuote(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    if (this.quoteStatus(quote) === 'vendido') {
      UI.toast('Un presupuesto convertido en venta no se puede editar.', 'warning');
      return;
    }
    this.ui.quoteDraft = {
      id: quote.id,
      number: quote.number,
      client: quote.client,
      clientDoc: quote.clientDoc || '',
      date: quote.date,
      dueDate: quote.dueDate,
      discount: quote.discount || 0,
      notes: quote.notes || '',
      items: quote.items.map((item) => ({ ...item }))
    };
    this.ui.quoteProductSearch = '';
    this.go('presupuestos/editar/' + quote.id);
  },

  ensureQuoteDraft() {
    const editingId = this.sub === 'editar' ? this.param : null;
    if (editingId) {
      const quote = Store.data.quotes.find((q) => q.id === editingId);
      if (!quote) {
        this.ui.quoteDraft = null;
        this.go('presupuestos');
        return null;
      }
      if (!this.ui.quoteDraft || this.ui.quoteDraft.id !== quote.id) {
        this.ui.quoteDraft = {
          id: quote.id,
          number: quote.number,
          client: quote.client,
          clientDoc: quote.clientDoc || '',
          date: quote.date,
          dueDate: quote.dueDate,
          discount: quote.discount || 0,
          notes: quote.notes || '',
          items: quote.items.map((item) => ({ ...item }))
        };
      }
    } else if (!this.ui.quoteDraft) {
      this.ui.quoteDraft = {
        id: null,
        client: '',
        clientDoc: '',
        date: isoToday(),
        dueDate: addDays(isoToday(), 15),
        discount: 0,
        notes: '',
        items: []
      };
    }

    const draft = this.ui.quoteDraft;
    if (!draft.date) draft.date = isoToday();
    if (!draft.dueDate) draft.dueDate = addDays(draft.date, 15);
    return draft;
  },

  viewQuoteBuilder() {
    const draft = this.ensureQuoteDraft();
    if (!draft) return '';
    const isEdit = Boolean(draft.id);
    const totals = Store.calc(draft.items, draft.discount);

    return `
      <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex items-start gap-3">
          <button type="button" class="icon-btn mt-0.5 border border-slate-200 bg-white" title="Volver" onclick="App.go('presupuestos')">${icon('arrow-left', 'h-4 w-4')}</button>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Cotizaciones</p>
            <h1 class="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">${isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h1>
            <p class="mt-1 text-sm text-slate-500">${isEdit ? 'Modificá el contenido y guardá los cambios.' : 'Elegí los productos, definí cantidades y condiciones comerciales.'}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn btn-secondary" onclick="App.go('presupuestos')">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="App.saveQuote(false)">${icon('check', 'h-4 w-4')} Guardar presupuesto</button>
        </div>
      </div>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section class="card overflow-hidden">
          <div class="border-b border-slate-100 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-bold text-slate-800">Agregar productos</h2>
                <p class="mt-0.5 text-xs text-slate-400">Buscá en tu catálogo y sumá artículos al presupuesto.</p>
              </div>
              <span class="badge badge-slate">${Store.data.products.length} SKU</span>
            </div>
            <div class="input-group mt-3">
              ${icon('search')}
              <input class="field" value="${esc(this.ui.quoteProductSearch)}" placeholder="Buscar por nombre o código…" oninput="App.setQuoteProductSearch(this.value)" />
            </div>
          </div>
          <div id="quote-picker" class="thin-scroll max-h-[calc(100vh-19rem)] overflow-y-auto p-3">${this.quotePickerHTML()}</div>
        </section>

        <aside class="min-w-0">
          <div class="card overflow-hidden xl:sticky xl:top-24">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 class="text-sm font-bold text-slate-800">Detalle del presupuesto</h2>
                <p class="mt-0.5 text-xs text-slate-400">${isEdit ? esc(this.ui.quoteDraft.number || '') : 'Se generará un número al guardar'}</p>
              </div>
              <span class="badge badge-blue" id="quote-item-count">${this.quoteUnits()} ítems</span>
            </div>

            <div class="max-h-[calc(100vh-9rem)] space-y-4 overflow-y-auto p-4 thin-scroll">
              <div>
                <label class="label" for="quote-client">Cliente *</label>
                <input class="field" id="quote-client" list="clientes-list" placeholder="Nombre o razón social" value="${esc(draft.client)}" oninput="App.quoteSetClient(this.value)" />
                ${this.clientDatalist()}
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="quote-doc">Documento / CUIT</label>
                  <input class="field" id="quote-doc" placeholder="Opcional" value="${esc(draft.clientDoc)}" oninput="App.quoteSetDoc(this.value)" />
                </div>
                <div>
                  <label class="label" for="quote-due">Vencimiento</label>
                  <input class="field" id="quote-due" type="date" value="${esc(draft.dueDate)}" onchange="App.quoteSetDue(this.value)" />
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-slate-100 pt-3">
                <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Productos</p>
                ${draft.items.length ? `<button type="button" class="text-[10px] font-semibold text-red-500 hover:text-red-700" onclick="App.quoteClearItems()">Vaciar</button>` : ''}
              </div>

              <div id="quote-items" class="space-y-2">${this.quoteItemsHTML()}</div>

              <div>
                <label class="label" for="quote-notes">Observaciones</label>
                <textarea class="field resize-none" id="quote-notes" rows="2" placeholder="Condiciones, validez, forma de entrega…" oninput="App.quoteSetNotes(this.value)">${esc(draft.notes)}</textarea>
              </div>

              <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <label class="text-xs font-semibold text-slate-600" for="quote-discount">Descuento general</label>
                <div class="flex items-center gap-1">
                  <input class="field field-sm w-16 text-center" id="quote-discount" type="number" min="0" max="100" step="0.5" value="${Number(draft.discount) || 0}" oninput="App.quoteSetDiscount(this.value)" />
                  <span class="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div id="quote-totals">${this.quoteTotalsHTML()}</div>

              <div class="space-y-2">
                <button type="button" class="btn btn-primary w-full" onclick="App.saveQuote(false)">${icon('check', 'h-4 w-4')} Guardar presupuesto</button>
                <button type="button" class="btn btn-secondary w-full" onclick="App.saveQuote(true)">${icon('download', 'h-4 w-4')} Guardar y descargar PDF</button>
              </div>
              <p class="text-center text-[10px] text-slate-400">Precios sin IVA · IVA 21%</p>
            </div>
          </div>
        </aside>
      </div>`;
  },

  quotePickerHTML() {
    const search = this.ui.quoteProductSearch.trim().toLowerCase();
    const products = Store.data.products.filter((product) => {
      if (!search) return true;
      return [product.name, product.code, product.category].join(' ').toLowerCase().includes(search);
    }).sort((a, b) => a.name.localeCompare(b.name, 'es'));

    if (!products.length) {
      return UI.empty({ iconName: 'search', title: 'Sin productos', text: 'Probá con otra búsqueda o cargá un producto nuevo.' });
    }

    return `<div class="grid gap-2 sm:grid-cols-2">${products.map((product) => {
      const [from, to, ink] = artPalette(product.category);
      return `<button type="button" class="group flex items-center gap-2.5 rounded-xl border border-slate-200 p-2 text-left transition hover:border-blue-300 hover:bg-blue-50/40" onclick="App.quoteAdd('${product.id}')">
        <span class="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg" style="background-image:linear-gradient(135deg,${from},${to});color:${ink}">${icon('package', 'h-[18px] w-[18px]')}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[11px] font-semibold text-slate-700">${esc(product.name)}</span>
          <span class="block text-[9px] text-slate-400">${esc(product.code)} · ${product.stock} u.</span>
        </span>
        <span class="shrink-0 text-right">
          <span class="block text-[11px] font-bold text-slate-800">${money(product.price)}</span>
          <span class="mt-0.5 grid h-5 w-5 place-items-center rounded bg-slate-100 text-slate-500 transition group-hover:bg-blue-600 group-hover:text-white">${icon('plus', 'h-3 w-3')}</span>
        </span>
      </button>`;
    }).join('')}</div>`;
  },

  quoteUnits() {
    return (this.ui.quoteDraft.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  },

  quoteItemsHTML() {
    const items = this.ui.quoteDraft.items || [];
    if (!items.length) {
      return `<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-5 text-center">
        <span class="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-300">${icon('cart', 'h-4 w-4')}</span>
        <p class="mt-2 text-[11px] font-semibold text-slate-500">Todavía no agregaste productos</p>
        <p class="text-[10px] text-slate-400">Usá el buscador de la izquierda.</p>
      </div>`;
    }

    return items.map((item) => {
      const line = Number(item.qty) * Number(item.price) * (1 - (Number(item.discount) || 0) / 100);
      return `<div class="rounded-lg border border-slate-200 p-2.5">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-[11px] font-semibold text-slate-700">${esc(item.name)}</p>
            <p class="text-[9px] text-slate-400">${esc(item.code)} · ${money(item.price)} c/u</p>
          </div>
          <button type="button" class="icon-btn h-5 w-5 shrink-0" title="Quitar" onclick="App.quoteRemove('${item.productId}')">${icon('x', 'h-3 w-3')}</button>
        </div>
        <div class="mt-2 flex items-center justify-between gap-2">
          <div class="flex items-center rounded-md border border-slate-200 bg-white">
            <button type="button" class="qty-btn" onclick="App.quoteQty('${item.productId}',-1)" aria-label="Restar">${icon('minus', 'h-3 w-3')}</button>
            <span class="w-6 text-center text-[11px] font-semibold">${item.qty}</span>
            <button type="button" class="qty-btn" onclick="App.quoteQty('${item.productId}',1)" aria-label="Sumar">${icon('plus', 'h-3 w-3')}</button>
          </div>
          <div class="flex items-center gap-0.5 text-[9px] text-slate-400">
            <span>Desc.</span>
            <input class="field field-sm w-12 text-center" type="number" min="0" max="100" step="1" value="${Number(item.discount) || 0}" oninput="App.quoteLineDisc('${item.productId}',this.value)" />
            <span>%</span>
          </div>
          <p class="text-[11px] font-bold text-slate-800" id="quote-line-${item.productId}">${money(line)}</p>
        </div>
      </div>`;
    }).join('');
  },

  quoteTotalsHTML() {
    const draft = this.ui.quoteDraft;
    const totals = Store.calc(draft.items, draft.discount);
    return `<div class="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
      <div class="flex justify-between text-slate-500"><span>Neto</span><span class="font-medium text-slate-700">${money(totals.net)}</span></div>
      ${totals.discount > 0 ? `<div class="flex justify-between text-slate-500"><span>Descuento (${Number(draft.discount) || 0}%)</span><span class="font-medium text-red-600">− ${money(totals.discount)}</span></div>` : ''}
      <div class="flex justify-between text-slate-500"><span>Subtotal</span><span class="font-medium text-slate-700">${money(totals.subtotal)}</span></div>
      <div class="flex justify-between text-slate-500"><span>IVA 21%</span><span class="font-medium text-slate-700">${money(totals.iva)}</span></div>
      <div class="mt-2 flex items-center justify-between rounded-lg bg-blue-600 px-3 py-2.5 text-white">
        <span class="text-[11px] font-bold uppercase tracking-[0.08em]">Total</span>
        <span class="text-base font-extrabold">${money(totals.total)}</span>
      </div>
    </div>`;
  },

  setQuoteProductSearch(value) {
    this.ui.quoteProductSearch = value;
    const target = document.getElementById('quote-picker');
    if (target) target.innerHTML = this.quotePickerHTML();
  },

  quoteAdd(productId) {
    const product = Store.findProduct(productId);
    if (!product) return;
    const draft = this.ui.quoteDraft;
    const existing = draft.items.find((item) => item.productId === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      draft.items.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        qty: 1,
        discount: 0
      });
    }
    this.refreshQuoteEditor();
  },

  quoteQty(productId, delta) {
    const item = this.ui.quoteDraft.items.find((i) => i.productId === productId);
    if (!item) return;
    item.qty = Math.max(1, Math.min(9999, Number(item.qty) + delta));
    this.refreshQuoteEditor();
  },

  quoteRemove(productId) {
    this.ui.quoteDraft.items = this.ui.quoteDraft.items.filter((item) => item.productId !== productId);
    this.refreshQuoteEditor();
  },

  quoteClearItems() {
    this.ui.quoteDraft.items = [];
    this.refreshQuoteEditor();
  },

  quoteLineDisc(productId, value) {
    const item = this.ui.quoteDraft.items.find((i) => i.productId === productId);
    if (!item) return;
    item.discount = Math.max(0, Math.min(100, Number(value) || 0));
    const line = Number(item.qty) * Number(item.price) * (1 - item.discount / 100);
    const lineEl = document.getElementById('quote-line-' + productId);
    if (lineEl) lineEl.textContent = money(line);
    this.refreshQuoteTotals();
  },

  quoteSetDiscount(value) {
    this.ui.quoteDraft.discount = Math.max(0, Math.min(100, Number(value) || 0));
    this.refreshQuoteTotals();
  },

  quoteSetClient(value) {
    this.ui.quoteDraft.client = value;
  },

  quoteSetDoc(value) {
    this.ui.quoteDraft.clientDoc = value;
  },

  quoteSetNotes(value) {
    this.ui.quoteDraft.notes = value;
  },

  quoteSetDue(value) {
    this.ui.quoteDraft.dueDate = value;
  },

  refreshQuoteEditor() {
    const items = document.getElementById('quote-items');
    const count = document.getElementById('quote-item-count');
    if (items) items.innerHTML = this.quoteItemsHTML();
    if (count) count.textContent = this.quoteUnits() + ' ítems';
    this.refreshQuoteTotals();
  },

  refreshQuoteTotals() {
    const totals = document.getElementById('quote-totals');
    if (totals) totals.innerHTML = this.quoteTotalsHTML();
  },

  saveQuote(withPdf = false) {
    const draft = this.ui.quoteDraft;
    if (!draft) return;
    if (!draft.client.trim()) {
      UI.toast('Ingresá el nombre del cliente para guardar el presupuesto.', 'warning');
      const client = document.getElementById('quote-client');
      if (client) client.focus();
      return;
    }
    if (!draft.items.length) {
      UI.toast('Agregá al menos un producto al presupuesto.', 'warning');
      return;
    }
    if (!draft.dueDate || draft.dueDate < draft.date) {
      UI.toast('La fecha de vencimiento no puede ser anterior a la emisión.', 'warning');
      return;
    }

    const result = Store.saveQuote({
      id: draft.id,
      client: draft.client,
      clientDoc: draft.clientDoc,
      date: draft.date,
      dueDate: draft.dueDate,
      discount: draft.discount,
      notes: draft.notes,
      items: draft.items.map((item) => ({ ...item }))
    });

    if (!result.ok) {
      UI.toast(result.error, 'error');
      return;
    }

    if (withPdf) this.downloadQuotePDF(result.quote);
    UI.toast('Presupuesto ' + result.quote.number + ' guardado correctamente.');
    this.ui.quoteDraft = null;
    this.ui.quoteProductSearch = '';
    this.go('presupuestos');
  },

  deleteQuote(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    UI.confirm({
      title: 'Eliminar presupuesto',
      message: `Se eliminará el presupuesto <strong>${esc(quote.number)}</strong> de <strong>${esc(quote.client)}</strong>. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      action: () => {
        const result = Store.deleteQuote(id);
        if (!result.ok) {
          UI.toast(result.error, 'error');
          return;
        }
        if (this.ui.quoteDraft && this.ui.quoteDraft.id === id) this.ui.quoteDraft = null;
        UI.toast('Presupuesto eliminado.', 'info');
        if (this.sub === 'editar' || this.sub === 'nuevo') {
          this.go('presupuestos');
        } else {
          this.render();
        }
      }
    });
  },

  /* ---------------- Documentos ---------------- */
  quoteDoc(quote) {
    return {
      kind: 'presupuesto',
      title: 'Presupuesto',
      number: quote.number,
      date: quote.date,
      dueDate: quote.dueDate,
      client: quote.client,
      clientDoc: quote.clientDoc,
      items: quote.items,
      discount: quote.discount,
      totals: Store.calc(quote.items, quote.discount),
      notes: quote.notes,
      status: this.quoteStatus(quote)
    };
  },

  downloadQuotePDF(quote) {
    return UI.downloadPDF(this.quoteDoc(quote));
  },

  pdfQuote(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    this.downloadQuotePDF(quote);
  },

  printQuote(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    UI.printDocument(this.quoteDoc(quote));
  },

  /* ---------------- Conversión a venta ---------------- */
  convertQuote(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    if (this.quoteStatus(quote) === 'vendido') {
      UI.toast('Este presupuesto ya fue convertido en venta.', 'info');
      return;
    }

    const issues = [];
    quote.items.forEach((item) => {
      const product = Store.findProduct(item.productId);
      if (!product) issues.push(`${item.name}: producto eliminado`);
      else if (product.stock < item.qty) issues.push(`${product.name}: necesitás ${item.qty} u. y hay ${product.stock}`);
    });

    const totals = Store.calc(quote.items, quote.discount);
    const canConfirm = issues.length === 0;

    UI.modal({
      title: 'Convertir en venta',
      subtitle: `Presupuesto ${quote.number} · ${quote.client}`,
      size: 'lg',
      iconName: 'cart',
      iconTone: canConfirm ? 'green' : 'red',
      body: `<div class="space-y-3">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div class="flex items-center justify-between text-xs"><span class="text-slate-500">Cliente</span><span class="font-semibold text-slate-800">${esc(quote.client)}</span></div>
          <div class="mt-1.5 flex items-center justify-between text-xs"><span class="text-slate-500">Productos</span><span class="font-semibold text-slate-800">${quote.items.reduce((sum, item) => sum + item.qty, 0)} unidades</span></div>
          <div class="mt-1.5 flex items-center justify-between text-xs"><span class="text-slate-500">Total</span><span class="font-extrabold text-blue-700">${money(totals.total)}</span></div>
        </div>

        <div>
          <label class="label" for="convert-payment">Medio de pago</label>
          <select class="field" id="convert-payment">
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta de débito</option>
            <option>Tarjeta de crédito</option>
            <option>Mercado Pago</option>
            <option>Cuenta corriente</option>
          </select>
        </div>

        ${issues.length ? `<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] leading-relaxed text-red-700">
          <p class="font-bold">No hay stock suficiente:</p>
          <ul class="mt-1 list-inside list-disc">${issues.map((issue) => `<li>${esc(issue)}</li>`).join('')}</ul>
          <p class="mt-1">Reponé el inventario o editá las cantidades del presupuesto.</p>
        </div>` : `<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-700">
          Al confirmar se registra la venta, se descuenta el stock y el presupuesto queda marcado como vendido.
        </div>`}
      </div>`,
      footer: `<button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" ${canConfirm ? '' : 'disabled'} onclick="App.confirmQuoteSale('${quote.id}')">${icon('check-circle', 'h-4 w-4')} Confirmar venta</button>`
    });
  },

  confirmQuoteSale(id) {
    const quote = Store.data.quotes.find((q) => q.id === id);
    if (!quote) return;
    const payment = document.getElementById('convert-payment')?.value || 'Efectivo';
    const result = Store.registerSale({
      client: quote.client,
      docType: 'Factura B',
      paymentMethod: payment,
      items: quote.items,
      discount: quote.discount,
      quoteId: quote.id
    });

    if (!result.ok) {
      UI.toast(result.error, 'error');
      return;
    }

    UI.closeModal();
    this.render();
    UI.toast('Presupuesto convertido en venta ' + result.sale.number + '.');
    this.openSaleDetail(result.sale.id, true);
  }
});
