/* Dux MVP — capa de datos (localStorage) */
(function () {
  'use strict';

  const KEY = 'dvx_mvp_v1';
  const VERSION = 1;

  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const uid = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isoDate = (d = new Date()) => {
    const t = new Date(d);
    t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    return t.toISOString().slice(0, 10);
  };
  const parseDate = (s) => new Date(s + 'T00:00:00');
  const addDays = (s, n) => {
    const d = parseDate(s);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  };
  const daysAgo = (n) => addDays(isoDate(), -n);
  const stamp = (iso, hour = 10, minute = 0) => parseDate(iso).getTime() + hour * 3600000 + minute * 60000;

  function calcTotals(items, globalDiscount = 0) {
    const net = (items || []).reduce((sum, item) => {
      const line = Number(item.qty) * Number(item.price) * (1 - (Number(item.discount) || 0) / 100);
      return sum + line;
    }, 0);
    const discount = net * ((Number(globalDiscount) || 0) / 100);
    const subtotal = net - discount;
    const iva = subtotal * 0.21;
    return {
      net: round2(net),
      discount: round2(discount),
      subtotal: round2(subtotal),
      iva: round2(iva),
      total: round2(subtotal + iva)
    };
  }

  function seed() {
    const products = [
      { id: 'p1', code: 'REM-001', name: 'Remera básica blanca', category: 'Remeras', price: 12000, cost: 6500, stock: 24, minStock: 8 },
      { id: 'p2', code: 'MUS-002', name: 'Musculosa negra', category: 'Musculosas', price: 10900, cost: 5800, stock: 6, minStock: 8 },
      { id: 'p3', code: 'JEA-003', name: 'Jean recto azul', category: 'Pantalones', price: 32900, cost: 18500, stock: 12, minStock: 5 },
      { id: 'p4', code: 'SWE-004', name: 'Sweater gris', category: 'Sweaters', price: 28500, cost: 15000, stock: 3, minStock: 6 },
      { id: 'p5', code: 'MED-005', name: 'Medias pack x3', category: 'Accesorios', price: 4500, cost: 2100, stock: 40, minStock: 10 },
      { id: 'p6', code: 'CAM-006', name: 'Campera puffer negra', category: 'Camperas', price: 58900, cost: 33000, stock: 7, minStock: 4 },
      { id: 'p7', code: 'CIN-007', name: 'Cinto de cuero', category: 'Accesorios', price: 15900, cost: 7800, stock: 15, minStock: 5 },
      { id: 'p8', code: 'POL-008', name: 'Polera cuello alto', category: 'Sweaters', price: 19500, cost: 9500, stock: 9, minStock: 5 },
      { id: 'p9', code: 'COL-009', name: 'Color labial mate', category: 'Belleza', price: 8900, cost: 3200, stock: 32, minStock: 10 },
      { id: 'p10', code: 'MAL-010', name: 'Malla deportiva', category: 'Deportivo', price: 26900, cost: 12500, stock: 2, minStock: 5 },
      { id: 'p11', code: 'GOR-011', name: 'Gorra trucker', category: 'Accesorios', price: 12900, cost: 5400, stock: 18, minStock: 6 },
      { id: 'p12', code: 'ARO-012', name: 'Mix de aros', category: 'Bijouterie', price: 6900, cost: 2500, stock: 45, minStock: 12 },
      { id: 'p13', code: 'SOM-013', name: 'Sombrero de paja', category: 'Accesorios', price: 17900, cost: 8200, stock: 4, minStock: 6 },
      { id: 'p14', code: 'ABR-014', name: 'Abrigo largo camel', category: 'Camperas', price: 74900, cost: 42000, stock: 5, minStock: 3 },
      { id: 'p15', code: 'JOG-015', name: 'Jogging frisa', category: 'Deportivo', price: 31000, cost: 16000, stock: 11, minStock: 5 },
      { id: 'p16', code: 'PAN-016', name: 'Pantalón sastrero', category: 'Pantalones', price: 35900, cost: 19000, stock: 8, minStock: 4 },
      { id: 'p17', code: 'ANI-017', name: 'Anillo minimal', category: 'Bijouterie', price: 5900, cost: 2000, stock: 25, minStock: 10 },
      { id: 'p18', code: 'GUA-018', name: 'Guantes de invierno', category: 'Accesorios', price: 9900, cost: 4300, stock: 6, minStock: 5 }
    ];

    const clients = [
      { id: 'c1', name: 'Consumidor Final' },
      { id: 'c2', name: 'María González' },
      { id: 'c3', name: 'Juan Pérez' },
      { id: 'c4', name: 'Lucía Fernández' },
      { id: 'c5', name: 'Estudio Contable Rivas' },
      { id: 'c6', name: 'Sofía Martínez' }
    ];

    const productById = (id) => products.find((p) => p.id === id);

    function buildItems(raw) {
      return raw.map(([productId, qty, discount = 0]) => {
        const p = productById(productId);
        return {
          productId: p.id,
          code: p.code,
          name: p.name,
          qty,
          price: p.price,
          discount
        };
      });
    }

    function buildSale(id, number, daysBack, client, docType, paymentMethod, rawItems, hour) {
      const date = daysAgo(daysBack);
      const items = buildItems(rawItems);
      return {
        id,
        number,
        date,
        createdAt: stamp(date, hour, 15),
        client,
        docType,
        paymentMethod,
        items,
        discount: 0,
        totals: calcTotals(items, 0)
      };
    }

    const sales = [
      buildSale('s1', 'V-0001', 12, 'María González', 'Factura B', 'Tarjeta de crédito', [['p8', 1], ['p12', 1]], 11),
      buildSale('s2', 'V-0002', 9, 'Juan Pérez', 'Factura B', 'Transferencia', [['p15', 1], ['p17', 1]], 16),
      buildSale('s3', 'V-0003', 6, 'Sofía Martínez', 'Factura B', 'Tarjeta de débito', [['p14', 1]], 12),
      buildSale('s4', 'V-0004', 4, 'Consumidor Final', 'Ticket', 'Efectivo', [['p1', 2], ['p5', 1]], 10),
      buildSale('s5', 'V-0005', 2, 'Lucía Fernández', 'Factura B', 'Transferencia', [['p4', 1], ['p11', 1]], 17),
      buildSale('s6', 'V-0006', 1, 'María González', 'Factura B', 'Tarjeta de crédito', [['p3', 1], ['p7', 1]], 15),
      buildSale('s7', 'V-0007', 0, 'Juan Pérez', 'Factura B', 'Efectivo', [['p6', 1]], 9),
      buildSale('s8', 'V-0008', 0, 'Consumidor Final', 'Ticket', 'Mercado Pago', [['p5', 2], ['p9', 1]], 11)
    ];

    function buildQuote(id, number, daysBack, dueInDays, client, rawItems, discount, notes, status = 'pendiente') {
      const date = daysAgo(daysBack);
      const items = buildItems(rawItems);
      return {
        id,
        number,
        date,
        dueDate: addDays(isoDate(), dueInDays),
        createdAt: stamp(date, 12, 30),
        client,
        clientDoc: '',
        items,
        discount,
        notes: notes || '',
        status,
        totals: calcTotals(items, discount)
      };
    }

    const quotes = [
      buildQuote('q1', 'P-0001', 1, 6, 'Lucía Fernández', [['p3', 1], ['p8', 1]], 0, 'Entrega sin cargo dentro de CABA.'),
      buildQuote('q2', 'P-0002', 2, 2, 'Estudio Contable Rivas', [['p6', 3]], 5, 'Precio especial por cantidad.'),
      buildQuote('q3', 'P-0003', 10, -2, 'Juan Pérez', [['p1', 2], ['p2', 1]], 0, ''),
      buildQuote('q4', 'P-0004', 1, 12, 'Sofía Martínez', [['p14', 1], ['p11', 2]], 0, 'Reserva sujeta a stock.')
    ];

    const today = isoDate();

    // Movimientos: stock inicial + salidas por ventas, con stock resultante trazable.
    const soldByProduct = {};
    sales.forEach((sale) => sale.items.forEach((item) => {
      soldByProduct[item.productId] = (soldByProduct[item.productId] || 0) + item.qty;
    }));

    const movements = [];
    products.forEach((p) => {
      const initial = p.stock + (soldByProduct[p.id] || 0);
      movements.push({
        id: uid('m'),
        date: addDays(today, -45),
        createdAt: stamp(addDays(today, -45), 8, 0),
        productId: p.id,
        code: p.code,
        name: p.name,
        type: 'entrada',
        qty: initial,
        delta: initial,
        reason: 'Stock inicial',
        ref: 'INV-000',
        stockAfter: 0
      });
    });

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        movements.push({
          id: uid('m'),
          date: sale.date,
          createdAt: sale.createdAt,
          productId: item.productId,
          code: item.code,
          name: item.name,
          type: 'salida',
          qty: item.qty,
          delta: -item.qty,
          reason: 'Venta',
          ref: sale.number,
          stockAfter: 0
        });
      });
    });

    movements.sort((a, b) => a.createdAt - b.createdAt);
    const running = {};
    movements.forEach((m) => {
      running[m.productId] = (running[m.productId] || 0) + m.delta;
      m.stockAfter = running[m.productId];
    });

    return {
      version: VERSION,
      business: { name: 'Devxis Software', tagline: 'Gestión comercial' },
      products,
      clients,
      quotes,
      sales,
      movements
    };
  }

  let data = null;

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('No se pudo guardar en localStorage', err);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION && Array.isArray(parsed.products)) {
          data = parsed;
          data.clients = data.clients || [];
          data.quotes = data.quotes || [];
          data.sales = data.sales || [];
          data.movements = data.movements || [];
          return;
        }
      }
    } catch (err) {
      console.warn('Datos locales inválidos, se regeneran.', err);
    }
    data = seed();
    persist();
  }

  function nextNumber(prefix, list) {
    const max = list.reduce((acc, item) => {
      const n = parseInt(String(item.number || '').replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return prefix + '-' + String(max + 1).padStart(4, '0');
  }

  function ensureClient(name) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    let client = data.clients.find((c) => c.name.toLowerCase() === clean.toLowerCase());
    if (!client) {
      client = { id: uid('c'), name: clean };
      data.clients.push(client);
    }
    return client;
  }

  function findProduct(id) {
    return data.products.find((p) => p.id === id);
  }

  const Store = {
    init() {
      load();
      return data;
    },
    get data() { return data; },
    save: persist,
    reload: load,
    calc: calcTotals,
    nextNumber,
    ensureClient,
    findProduct,
    round2,

    reset() {
      data = seed();
      persist();
      return data;
    },

    exportJSON() {
      return JSON.stringify(data, null, 2);
    },

    saveProduct(input) {
      const code = String(input.code || '').trim().toUpperCase();
      const name = String(input.name || '').trim();
      if (!code || !name) return { ok: false, error: 'Código y descripción son obligatorios.' };
      if (Number(input.price) < 0 || Number(input.stock) < 0) return { ok: false, error: 'Precio y stock no pueden ser negativos.' };

      const duplicate = data.products.find((p) => p.code.toLowerCase() === code.toLowerCase() && p.id !== input.id);
      if (duplicate) return { ok: false, error: 'Ya existe un producto con el código ' + code + '.' };

      const payload = {
        code,
        name,
        category: String(input.category || 'General').trim() || 'General',
        price: round2(input.price),
        cost: round2(input.cost || 0),
        stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
        minStock: Math.max(0, Math.floor(Number(input.minStock) || 0))
      };

      if (input.id) {
        const product = findProduct(input.id);
        if (!product) return { ok: false, error: 'Producto no encontrado.' };
        const previousStock = product.stock;
        Object.assign(product, payload);
        if (payload.stock !== previousStock) {
          data.movements.push({
            id: uid('m'),
            date: isoDate(),
            createdAt: Date.now(),
            productId: product.id,
            code: product.code,
            name: product.name,
            type: 'ajuste',
            qty: payload.stock,
            delta: payload.stock - previousStock,
            reason: 'Edición de producto',
            ref: product.code,
            stockAfter: payload.stock
          });
        }
        persist();
        return { ok: true, product };
      }

      const product = { id: uid('p'), ...payload, createdAt: Date.now() };
      data.products.push(product);
      if (product.stock > 0) {
        data.movements.push({
          id: uid('m'),
          date: isoDate(),
          createdAt: Date.now(),
          productId: product.id,
          code: product.code,
          name: product.name,
          type: 'entrada',
          qty: product.stock,
          delta: product.stock,
          reason: 'Alta de producto',
          ref: product.code,
          stockAfter: product.stock
        });
      }
      persist();
      return { ok: true, product };
    },

    deleteProduct(id) {
      const index = data.products.findIndex((p) => p.id === id);
      if (index === -1) return { ok: false, error: 'Producto no encontrado.' };
      data.products.splice(index, 1);
      persist();
      return { ok: true };
    },

    addMovement(input) {
      const product = findProduct(input.productId);
      if (!product) return { ok: false, error: 'Seleccioná un producto válido.' };
      const type = input.type;
      const qty = Math.floor(Number(input.qty));
      if (!Number.isFinite(qty) || qty < 0) return { ok: false, error: 'Ingresá una cantidad válida.' };

      let newStock;
      let delta;
      if (type === 'entrada') {
        newStock = product.stock + qty;
        delta = qty;
      } else if (type === 'salida') {
        if (qty > product.stock) return { ok: false, error: 'No hay stock suficiente. Disponible: ' + product.stock + '.' };
        newStock = product.stock - qty;
        delta = -qty;
      } else if (type === 'ajuste') {
        newStock = qty;
        delta = newStock - product.stock;
      } else {
        return { ok: false, error: 'Tipo de movimiento inválido.' };
      }

      product.stock = newStock;
      data.movements.push({
        id: uid('m'),
        date: isoDate(),
        createdAt: Date.now(),
        productId: product.id,
        code: product.code,
        name: product.name,
        type,
        qty,
        delta,
        reason: String(input.reason || 'Ajuste manual').trim() || 'Ajuste manual',
        ref: String(input.ref || 'MANUAL').trim() || 'MANUAL',
        note: String(input.note || '').trim(),
        stockAfter: newStock
      });
      persist();
      return { ok: true, product };
    },

    registerSale(input) {
      const items = (input.items || []).map((item) => {
        const product = findProduct(item.productId);
        return {
          productId: item.productId,
          code: product ? product.code : item.code,
          name: product ? product.name : item.name,
          qty: Math.floor(Number(item.qty)),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          product
        };
      });

      if (!items.length) return { ok: false, error: 'La venta no tiene productos.' };

      for (const item of items) {
        if (!item.product) return { ok: false, error: 'El producto ' + item.name + ' ya no existe.' };
        if (!Number.isFinite(item.qty) || item.qty <= 0) return { ok: false, error: 'Cantidad inválida en ' + item.name + '.' };
        if (item.qty > item.product.stock) {
          return { ok: false, error: 'Stock insuficiente de ' + item.product.name + ' (disponible: ' + item.product.stock + ').' };
        }
      }

      const cleanItems = items.map(({ product, ...rest }) => rest);
      const totals = calcTotals(cleanItems, input.discount);
      const sale = {
        id: uid('s'),
        number: nextNumber('V', data.sales),
        date: input.date || isoDate(),
        createdAt: Date.now(),
        client: String(input.client || 'Consumidor Final').trim() || 'Consumidor Final',
        docType: input.docType || 'Factura B',
        paymentMethod: input.paymentMethod || 'Efectivo',
        items: cleanItems,
        discount: Number(input.discount) || 0,
        totals,
        quoteId: input.quoteId || null
      };

      items.forEach((item) => {
        item.product.stock -= item.qty;
        data.movements.push({
          id: uid('m'),
          date: sale.date,
          createdAt: sale.createdAt + data.movements.length,
          productId: item.product.id,
          code: item.product.code,
          name: item.product.name,
          type: 'salida',
          qty: item.qty,
          delta: -item.qty,
          reason: 'Venta',
          ref: sale.number,
          stockAfter: item.product.stock
        });
      });

      ensureClient(sale.client);
      data.sales.push(sale);

      if (sale.quoteId) {
        const quote = data.quotes.find((q) => q.id === sale.quoteId);
        if (quote) {
          quote.status = 'vendido';
          quote.saleId = sale.id;
          quote.soldAt = Date.now();
        }
      }

      persist();
      return { ok: true, sale };
    },

    saveQuote(input) {
      const totals = calcTotals(input.items, input.discount);
      const payload = {
        client: String(input.client || '').trim(),
        clientDoc: String(input.clientDoc || '').trim(),
        date: input.date,
        dueDate: input.dueDate,
        items: input.items,
        discount: Number(input.discount) || 0,
        notes: String(input.notes || '').trim(),
        totals
      };

      let quote;
      if (input.id) {
        quote = data.quotes.find((q) => q.id === input.id);
        if (!quote) return { ok: false, error: 'Presupuesto no encontrado.' };
        Object.assign(quote, payload);
      } else {
        quote = {
          id: uid('q'),
          number: nextNumber('P', data.quotes),
          ...payload,
          status: 'pendiente',
          createdAt: Date.now()
        };
        data.quotes.push(quote);
      }

      ensureClient(quote.client);
      persist();
      return { ok: true, quote };
    },

    deleteQuote(id) {
      const index = data.quotes.findIndex((q) => q.id === id);
      if (index === -1) return { ok: false, error: 'Presupuesto no encontrado.' };
      data.quotes.splice(index, 1);
      persist();
      return { ok: true };
    },

    lowStock() {
      return data.products.filter((p) => p.stock <= p.minStock);
    },

    pendingQuotes() {
      return data.quotes.filter((q) => q.status === 'pendiente');
    }
  };

  window.Store = Store;
})();
