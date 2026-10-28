// Interfaz del cotizador: lee el formulario y muestra las propuestas.
// Toda la lógica de cálculo está en calculo.js.

(function () {
  'use strict';

  const WHATSAPP = '51978741045';
  const { MAX_CAMARAS, calcularPropuestas, formatearSoles, mensajeWhatsApp, mensajeAMedida } = window.Calculo;

  const campos = {
    interiores: document.getElementById('interiores'),
    exteriores: document.getElementById('exteriores'),
  };
  const aviso = document.getElementById('aviso');
  const contenedor = document.getElementById('propuestas');
  const nota = document.getElementById('nota');

  let precios = null;

  function enlaceWhatsApp(texto) {
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  }

  // Convierte el texto del campo en un número entero entre 0 y 16.
  function leerCantidad(campo) {
    const n = parseInt(campo.value, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(n, MAX_CAMARAS);
  }

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function botonWhatsApp(texto, mensaje) {
    const a = crear('a', 'boton-whatsapp', texto);
    a.href = enlaceWhatsApp(mensaje);
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function filaTabla(celdas, etiqueta) {
    const tr = document.createElement('tr');
    celdas.forEach((c) => tr.appendChild(crear(etiqueta || 'td', '', c)));
    return tr;
  }

  function tablaDesglose(p) {
    const tabla = document.createElement('table');
    const thead = document.createElement('thead');
    thead.appendChild(filaTabla(['Concepto', 'Cant.', 'P. unit.', 'Subtotal'], 'th'));
    const tbody = document.createElement('tbody');
    p.lineas.forEach((l) => {
      tbody.appendChild(filaTabla([l.concepto, String(l.cantidad), formatearSoles(l.precioUnitario), formatearSoles(l.subtotal)]));
    });
    const tfoot = document.createElement('tfoot');
    [['Subtotal', p.subtotal], ['IGV 18%', p.igv], ['Total', p.total]].forEach(([nombre, monto]) => {
      const tr = document.createElement('tr');
      const td = crear('td', '', nombre);
      td.colSpan = 3;
      tr.appendChild(td);
      tr.appendChild(crear('td', '', formatearSoles(monto)));
      tfoot.appendChild(tr);
    });
    tabla.append(thead, tbody, tfoot);
    const caja = crear('div', 'tabla-contenedor');
    caja.appendChild(tabla);
    return caja;
  }

  function tarjeta(p, entrada) {
    const art = crear('article', p.recomendada ? 'tarjeta recomendada' : 'tarjeta');

    const cabeza = crear('div', 'tarjeta-cabeza');
    cabeza.appendChild(crear('h2', '', p.nombre));
    if (p.recomendada) cabeza.appendChild(crear('span', 'etiqueta', 'Recomendada'));
    art.appendChild(cabeza);

    art.appendChild(crear('p', 'ficha', `${p.resolucion} · ${p.dias} días de grabación`));

    const precio = crear('p', 'precio');
    precio.append(
      crear('span', 'precio-desde', 'Desde'),
      crear('span', 'precio-monto', formatearSoles(p.total)),
      crear('span', 'precio-incluye', 'Incluye IGV e instalación')
    );
    art.appendChild(precio);

    const lista = crear('ul', 'beneficios');
    p.beneficios.forEach((b) => lista.appendChild(crear('li', '', b)));
    art.appendChild(lista);

    art.appendChild(botonWhatsApp('Agendar visita gratis', mensajeWhatsApp(p, entrada)));

    const detalle = crear('details', 'desglose');
    detalle.appendChild(crear('summary', '', 'Ver qué incluye'));
    detalle.appendChild(tablaDesglose(p));
    art.appendChild(detalle);

    return art;
  }

  function mostrarAviso(resultado, entrada) {
    aviso.replaceChildren(crear('p', '', resultado.mensaje));
    if (resultado.motivo === 'a_medida') {
      aviso.appendChild(botonWhatsApp('Escríbenos por WhatsApp', mensajeAMedida(entrada)));
    }
    aviso.hidden = false;
  }

  function actualizar() {
    if (!precios) return;
    const entrada = {
      interiores: leerCantidad(campos.interiores),
      exteriores: leerCantidad(campos.exteriores),
    };
    const resultado = calcularPropuestas(entrada, precios);

    contenedor.replaceChildren();
    if (!resultado.ok) {
      mostrarAviso(resultado, entrada);
      nota.hidden = true;
      return;
    }
    aviso.hidden = true;
    nota.hidden = false;
    resultado.propuestas.forEach((p) => contenedor.appendChild(tarjeta(p, entrada)));
  }

  // Botones − y +
  document.querySelectorAll('.contador-boton').forEach((boton) => {
    boton.addEventListener('click', () => {
      const campo = campos[boton.dataset.campo];
      const nuevo = leerCantidad(campo) + Number(boton.dataset.paso);
      campo.value = Math.max(0, Math.min(MAX_CAMARAS, nuevo));
      actualizar();
    });
  });

  // Escribir el número directamente
  Object.values(campos).forEach((campo) => {
    campo.addEventListener('input', actualizar);
    campo.addEventListener('change', () => {
      campo.value = leerCantidad(campo);
      actualizar();
    });
  });

  fetch('precios.json')
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then((datos) => {
      precios = datos;
      actualizar();
    })
    .catch(() => {
      mostrarAviso({ mensaje: 'No se pudieron cargar los precios. Recarga la página.' }, null);
      nota.hidden = true;
    });
})();
