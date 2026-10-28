// Lógica pura del cotizador CCTV. No toca el DOM.
// Los precios llegan siempre como parámetro (leídos de precios.json).

(function (raiz) {
  'use strict';

  // Reglas técnicas de la especificación (no son precios).
  const MAX_CAMARAS = 16;
  const RESOLUCIONES = ['2MP', '4MP'];
  const DIAS_VALIDOS = [7, 15, 30];
  const GB_POR_CAMARA_POR_DIA = { '2MP': 20, '4MP': 40 };
  const GB_POR_TB = 1000;
  const TASA_IGV = 0.18;

  const MENSAJE_A_MEDIDA = 'Contáctanos para un proyecto a medida';

  // Redondea a 2 decimales evitando errores de coma flotante.
  function redondear(monto) {
    return Math.round((monto + Number.EPSILON) * 100) / 100;
  }

  function esCantidadValida(n) {
    return Number.isInteger(n) && n >= 0 && n <= MAX_CAMARAS;
  }

  // Devuelve el NVR más pequeño con canales suficientes, o null si ninguno alcanza.
  function elegirNvr(totalCamaras, precios) {
    const opciones = [...precios.nvr].sort((a, b) => a.canales - b.canales);
    return opciones.find((nvr) => nvr.canales >= totalCamaras) || null;
  }

  // Almacenamiento necesario en GB.
  function calcularAlmacenamientoGb(totalCamaras, dias, resolucion) {
    return totalCamaras * dias * GB_POR_CAMARA_POR_DIA[resolucion];
  }

  // Devuelve el disco más pequeño que alcance, o null si ninguno alcanza.
  function elegirDisco(gbNecesarios, precios) {
    const opciones = [...precios.discos].sort((a, b) => a.tb - b.tb);
    return opciones.find((disco) => disco.tb * GB_POR_TB >= gbNecesarios) || null;
  }

  function linea(concepto, cantidad, precioUnitario) {
    return {
      concepto,
      cantidad,
      precioUnitario,
      subtotal: redondear(cantidad * precioUnitario),
    };
  }

  function error(motivo, mensaje) {
    return { ok: false, motivo, mensaje };
  }

  // Calcula la cotización completa.
  // entrada: { interiores, exteriores, resolucion, dias, instalacion }
  // Devuelve { ok: true, lineas, subtotal, igv, total, ... } o { ok: false, motivo, mensaje }.
  function calcularCotizacion(entrada, precios) {
    const { interiores, exteriores, resolucion, dias, instalacion } = entrada;

    if (!esCantidadValida(interiores) || !esCantidadValida(exteriores)) {
      return error('cantidad_invalida', `La cantidad de cámaras de cada tipo debe ser un número entero entre 0 y ${MAX_CAMARAS}.`);
    }
    if (!RESOLUCIONES.includes(resolucion)) {
      return error('resolucion_invalida', 'Elige una resolución válida: 2MP o 4MP.');
    }
    if (!DIAS_VALIDOS.includes(dias)) {
      return error('dias_invalidos', 'Elige 7, 15 o 30 días de grabación.');
    }

    const totalCamaras = interiores + exteriores;
    if (totalCamaras < 1) {
      return error('sin_camaras', 'Ingresa al menos 1 cámara.');
    }
    if (totalCamaras > MAX_CAMARAS) {
      return error('a_medida', MENSAJE_A_MEDIDA);
    }

    const nvr = elegirNvr(totalCamaras, precios);
    const gbNecesarios = calcularAlmacenamientoGb(totalCamaras, dias, resolucion);
    const disco = elegirDisco(gbNecesarios, precios);
    if (!nvr || !disco) {
      return error('a_medida', MENSAJE_A_MEDIDA);
    }

    const lineas = [];
    if (interiores > 0) {
      lineas.push(linea(`Cámara interior ${resolucion}`, interiores, precios.camaras.interior[resolucion]));
    }
    if (exteriores > 0) {
      lineas.push(linea(`Cámara exterior ${resolucion}`, exteriores, precios.camaras.exterior[resolucion]));
    }
    lineas.push(linea(`NVR ${nvr.canales} canales`, 1, nvr.precio));
    lineas.push(linea(`Disco duro ${disco.tb} TB`, 1, disco.precio));
    if (instalacion) {
      lineas.push(linea('Instalación por punto', totalCamaras, precios.instalacion.porPunto));
      lineas.push(linea('Materiales por punto', totalCamaras, precios.instalacion.materialesPorPunto));
    }

    const subtotal = redondear(lineas.reduce((suma, l) => suma + l.subtotal, 0));
    const igv = redondear(subtotal * TASA_IGV);
    const total = redondear(subtotal + igv);

    return { ok: true, totalCamaras, gbNecesarios, lineas, subtotal, igv, total };
  }

  // Formatea un monto en soles: 1234.5 → "S/ 1,234.50".
  function formatearSoles(monto) {
    const [entero, decimales] = redondear(monto).toFixed(2).split('.');
    const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `S/ ${conComas}.${decimales}`;
  }

  const api = {
    MAX_CAMARAS,
    TASA_IGV,
    MENSAJE_A_MEDIDA,
    calcularCotizacion,
    calcularAlmacenamientoGb,
    elegirNvr,
    elegirDisco,
    formatearSoles,
  };

  // Funciona en Node (pruebas) y en el navegador (sin paso de compilación).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    raiz.Calculo = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
