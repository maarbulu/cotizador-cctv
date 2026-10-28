// Interfaz del cotizador: lee el formulario y muestra las propuestas.
// Toda la lógica de cálculo está en calculo.js.

(function () {
  'use strict';

  const C = window.Calculo;

  const estado = {
    precios: null,
    lugar: C.LUGARES[0],
    zonas: Object.fromEntries(C.ZONAS.map((zona) => [zona.id, 0])),
  };

  const $resultados = document.getElementById('resultados');
  const $totalCamaras = document.getElementById('total-camaras');

  // Crea un elemento con clase y texto opcionales.
  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function textoCamaras(n) {
    return n === 1 ? '1 cámara' : `${n} cámaras`;
  }

  function enlaceWhatsapp(texto, mensaje) {
    const a = crear('a', 'boton boton-whatsapp', texto);
    a.href = C.urlWhatsapp(mensaje);
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  // ---- Formulario ----

  function construirLugares() {
    const contenedor = document.getElementById('lugares');
    for (const lugar of C.LUGARES) {
      const etiqueta = crear('label', 'chip');
      const input = crear('input');
      input.type = 'radio';
      input.name = 'lugar';
      input.value = lugar;
      input.checked = lugar === estado.lugar;
      input.addEventListener('change', () => {
        estado.lugar = lugar;
        actualizar();
      });
      etiqueta.append(input, crear('span', '', lugar));
      contenedor.append(etiqueta);
    }
  }

  function construirZonas() {
    for (const zona of C.ZONAS) {
      const lista = document.getElementById(`zonas-${zona.tipo}`);
      const item = crear('li', 'zona');
      const nombre = crear('span', 'zona-nombre', zona.nombre);
      nombre.id = `zona-${zona.id}`;

      const contador = crear('div', 'contador');
      const menos = crear('button', 'contador-boton', '−');
      const valor = crear('output', 'contador-valor', '0');
      const mas = crear('button', 'contador-boton', '+');
      menos.type = mas.type = 'button';
      menos.setAttribute('aria-label', `Quitar una cámara en ${zona.nombre}`);
      mas.setAttribute('aria-label', `Agregar una cámara en ${zona.nombre}`);
      valor.setAttribute('aria-labelledby', nombre.id);

      function cambiar(delta) {
        const nuevo = Math.min(C.MAX_CAMARAS, Math.max(0, estado.zonas[zona.id] + delta));
        estado.zonas[zona.id] = nuevo;
        valor.textContent = String(nuevo);
        menos.disabled = nuevo === 0;
        mas.disabled = nuevo === C.MAX_CAMARAS;
        item.classList.toggle('zona-activa', nuevo > 0);
        actualizar();
      }
      menos.addEventListener('click', () => cambiar(-1));
      mas.addEventListener('click', () => cambiar(1));
      menos.disabled = true;

      contador.append(menos, valor, mas);
      item.append(nombre, contador);
      lista.append(item);
    }
  }

  // ---- Resultados ----

  function tablaDesglose(propuesta) {
    const tabla = crear('table', 'desglose');
    const cabecera = tabla.createTHead().insertRow();
    for (const titulo of ['Concepto', 'Cant.', 'P. unit.', 'Subtotal']) {
      const th = crear('th', '', titulo);
      th.scope = 'col';
      cabecera.append(th);
    }
    const cuerpo = tabla.createTBody();
    for (const l of propuesta.lineas) {
      // Un concepto con precio 0 (el asesor de ejemplo) se muestra como "Incluido".
      const incluido = l.precioUnitario === 0;
      const fila = cuerpo.insertRow();
      fila.insertCell().textContent = l.concepto;
      fila.insertCell().textContent = String(l.cantidad);
      fila.insertCell().textContent = incluido ? 'Incluido' : C.formatearSoles(l.precioUnitario);
      fila.insertCell().textContent = incluido ? 'Incluido' : C.formatearSoles(l.subtotal);
    }
    const pie = tabla.createTFoot();
    for (const [concepto, monto, clase] of [
      ['Subtotal', propuesta.subtotal, ''],
      ['IGV 18%', propuesta.igv, ''],
      ['Total', propuesta.total, 'fila-total'],
    ]) {
      const fila = pie.insertRow();
      fila.className = clase;
      const celda = fila.insertCell();
      celda.colSpan = 3;
      celda.textContent = concepto;
      fila.insertCell().textContent = C.formatearSoles(monto);
    }
    return tabla;
  }

  function tarjetaPropuesta(propuesta) {
    const tarjeta = crear('article', 'tarjeta' + (propuesta.recomendada ? ' tarjeta-recomendada' : ''));
    if (propuesta.recomendada) {
      tarjeta.append(crear('span', 'insignia', '★ Recomendada'));
    }
    tarjeta.append(crear('h3', 'tarjeta-nombre', propuesta.nombre));

    const beneficios = crear('ul', 'beneficios');
    for (const b of propuesta.beneficios) {
      beneficios.append(crear('li', '', b));
    }
    beneficios.append(crear('li', 'beneficio-visita', 'Visita técnica gratuita'));
    tarjeta.append(beneficios);

    const precio = crear('p', 'precio');
    precio.append(crear('span', 'precio-desde', 'Desde '), crear('strong', '', C.formatearSoles(propuesta.total)));
    tarjeta.append(precio);

    const detalle = crear('details', 'detalle');
    detalle.append(crear('summary', '', 'Ver qué incluye'), tablaDesglose(propuesta));
    tarjeta.append(detalle);

    tarjeta.append(
      enlaceWhatsapp('Agendar visita gratis', C.armarMensajeVisita(propuesta, estado.lugar, estado.zonas))
    );
    return tarjeta;
  }

  function mostrarAviso(texto, clase) {
    const aviso = crear('div', `aviso ${clase || ''}`);
    aviso.append(crear('p', '', texto));
    $resultados.replaceChildren(aviso);
    return aviso;
  }

  function actualizar() {
    const conteo = C.contarCamaras(estado.zonas);
    $totalCamaras.textContent = textoCamaras(conteo ? conteo.total : 0);
    if (!estado.precios) return;

    const r = C.calcularPropuestas(estado.zonas, estado.precios);
    if (r.ok) {
      const lista = crear('div', 'tarjetas');
      lista.append(...r.propuestas.map(tarjetaPropuesta));
      $resultados.replaceChildren(lista);
    } else if (r.motivo === 'a_medida') {
      const aviso = mostrarAviso(`${r.mensaje}. Para ${textoCamaras(r.conteo.total)} diseñamos tu sistema a la medida.`, 'aviso-medida');
      aviso.append(enlaceWhatsapp('Escríbenos por WhatsApp', C.armarMensajeAMedida(estado.lugar, estado.zonas)));
    } else {
      mostrarAviso(r.mensaje);
    }
  }

  // ---- Inicio ----

  construirLugares();
  construirZonas();
  mostrarAviso('Cargando precios…');

  fetch('precios.json', { cache: 'no-cache' })
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((precios) => {
      estado.precios = precios;
      actualizar();
    })
    .catch(() => {
      mostrarAviso('No pudimos cargar los precios. Recarga la página en unos segundos.', 'aviso-error');
    });
})();
