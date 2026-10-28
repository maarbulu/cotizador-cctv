// Lógica pura del cotizador CCTV. No toca el DOM.
// Los precios llegan siempre como parámetro (leídos de precios.json).

(function (raiz) {
  'use strict';

  // Reglas técnicas de la especificación (no son precios).
  const MAX_CAMARAS = 16;
  const GB_POR_CAMARA_POR_DIA = { '2MP': 20, '4MP': 40 };
  const GB_POR_TB = 1000;
  const TASA_IGV = 0.18;

  const MENSAJE_A_MEDIDA = 'Contáctanos para un proyecto a medida';

  // Las tres propuestas que se muestran al cliente.
  const PROPUESTAS = [
    {
      id: 'basica',
      nombre: 'Básica',
      resolucion: '2MP',
      dias: 7,
      recomendada: false,
      beneficios: ['Imagen buena', 'Guarda 1 semana de video', 'Mira tus cámaras desde el celular', 'Instalación profesional'],
    },
    {
      id: 'intermedia',
      nombre: 'Intermedia',
      resolucion: '4MP',
      dias: 15,
      recomendada: true,
      beneficios: ['Imagen nítida, distingue rostros', 'Guarda 2 semanas de video', 'Mira tus cámaras desde el celular', 'Instalación profesional'],
    },
    {
      id: 'pro',
      nombre: 'Pro',
      resolucion: '4MP',
      dias: 30,
      recomendada: false,
      beneficios: ['Imagen nítida, distingue rostros', 'Guarda 1 mes de video', 'Mira tus cámaras desde el celular', 'Instalación profesional', 'Asesor técnico que diseña tu sistema y te acompaña'],
    },
  ];

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

  // Devuelve { tb, precio, cantidad }: el disco más pequeño que alcance,
  // o varios del más grande si ninguno alcanza solo.
  function elegirDisco(gbNecesarios, precios) {
    const opciones = [...precios.discos].sort((a, b) => a.tb - b.tb);
    const unico = opciones.find((disco) => disco.tb * GB_POR_TB >= gbNecesarios);
    if (unico) {
      return { ...unico, cantidad: 1 };
    }
    const mayor = opciones[opciones.length - 1];
    return { ...mayor, cantidad: Math.ceil(gbNecesarios / (mayor.tb * GB_POR_TB)) };
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

  // Valida las cantidades. Devuelve un error o null si todo está bien.
  function validarCantidades(interiores, exteriores) {
    if (!esCantidadValida(interiores) || !esCantidadValida(exteriores)) {
      return error('cantidad_invalida', `Cada cantidad debe ser un número entero entre 0 y ${MAX_CAMARAS}.`);
    }
    const total = interiores + exteriores;
    if (total < 1) {
      return error('sin_camaras', 'Agrega al menos 1 cámara.');
    }
    if (total > MAX_CAMARAS) {
      return error('a_medida', MENSAJE_A_MEDIDA);
    }
    return null;
  }

  // Calcula una cotización. La instalación siempre está incluida.
  // entrada: { interiores, exteriores, resolucion, dias }
  // Devuelve { ok: true, lineas, subtotal, igv, total, ... } o { ok: false, motivo, mensaje }.
  function calcularCotizacion(entrada, precios) {
    const { interiores, exteriores, resolucion, dias } = entrada;

    const invalido = validarCantidades(interiores, exteriores);
    if (invalido) {
      return invalido;
    }

    const totalCamaras = interiores + exteriores;
    const nvr = elegirNvr(totalCamaras, precios);
    const gbNecesarios = calcularAlmacenamientoGb(totalCamaras, dias, resolucion);
    const disco = elegirDisco(gbNecesarios, precios);

    const lineas = [];
    if (interiores > 0) {
      lineas.push(linea(`Cámara interior ${resolucion}`, interiores, precios.camaras.interior[resolucion]));
    }
    if (exteriores > 0) {
      lineas.push(linea(`Cámara exterior ${resolucion}`, exteriores, precios.camaras.exterior[resolucion]));
    }
    lineas.push(linea(`NVR ${nvr.canales} canales`, 1, nvr.precio));
    lineas.push(linea(`Disco duro ${disco.tb} TB`, disco.cantidad, disco.precio));
    lineas.push(linea('Instalación por punto', totalCamaras, precios.instalacion.porPunto));
    lineas.push(linea('Materiales por punto', totalCamaras, precios.instalacion.materialesPorPunto));

    const subtotal = redondear(lineas.reduce((suma, l) => suma + l.subtotal, 0));
    const igv = redondear(subtotal * TASA_IGV);
    const total = redondear(subtotal + igv);

    return { ok: true, totalCamaras, gbNecesarios, lineas, subtotal, igv, total };
  }

  // Calcula las tres propuestas para las mismas cámaras.
  // entrada: { interiores, exteriores }
  // Devuelve { ok: true, propuestas: [...] } o { ok: false, motivo, mensaje }.
  function calcularPropuestas(entrada, precios) {
    const { interiores, exteriores } = entrada;
    const invalido = validarCantidades(interiores, exteriores);
    if (invalido) {
      return invalido;
    }
    const propuestas = PROPUESTAS.map((p) => ({
      ...p,
      ...calcularCotizacion({ interiores, exteriores, resolucion: p.resolucion, dias: p.dias }, precios),
    }));
    return { ok: true, propuestas };
  }

  // Formatea un monto en soles: 1234.5 → "S/ 1,234.50".
  function formatearSoles(monto) {
    const [entero, decimales] = redondear(monto).toFixed(2).split('.');
    const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `S/ ${conComas}.${decimales}`;
  }

  // Texto que se envía por WhatsApp para agendar la visita.
  function mensajeWhatsApp(propuesta, entrada) {
    return [
      'Hola, quiero agendar mi visita técnica gratuita.',
      `Propuesta: ${propuesta.nombre} (desde ${formatearSoles(propuesta.total)})`,
      `Cámaras: ${entrada.interiores} dentro, ${entrada.exteriores} fuera`,
      'Mi distrito es:',
    ].join('\n');
  }

  // Texto de WhatsApp cuando el proyecto pasa de 16 cámaras.
  function mensajeAMedida(entrada) {
    const total = entrada.interiores + entrada.exteriores;
    return [
      'Hola, necesito un proyecto a medida.',
      `Cámaras: ${entrada.interiores} dentro, ${entrada.exteriores} fuera (${total} en total)`,
      'Mi distrito es:',
    ].join('\n');
  }

  const api = {
    MAX_CAMARAS,
    TASA_IGV,
    MENSAJE_A_MEDIDA,
    PROPUESTAS,
    calcularCotizacion,
    calcularPropuestas,
    calcularAlmacenamientoGb,
    elegirNvr,
    elegirDisco,
    formatearSoles,
    mensajeWhatsApp,
    mensajeAMedida,
  };

  // Funciona en Node (pruebas) y en el navegador (sin paso de compilación).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    raiz.Calculo = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
