// Lógica pura del cotizador CCTV. No toca el DOM.
// Los precios llegan siempre como parámetro (leídos de precios.json).

(function (raiz) {
  'use strict';

  // Reglas técnicas de la especificación (no son precios).
  const MAX_CAMARAS = 16;
  const GB_POR_CAMARA_POR_DIA = { '2MP': 20, '4MP': 40 };
  const GB_POR_TB = 1000;
  const TASA_IGV = 0.18;

  const TELEFONO_WHATSAPP = '51978741045';

  const MENSAJE_SIN_CAMARAS = 'Elige al menos una zona.';
  const MENSAJE_A_MEDIDA = 'Contáctanos para un proyecto a medida';

  const LUGARES = ['Casa', 'Tienda', 'Oficina', 'Almacén'];

  // Zonas que el cliente puede proteger. El nombre corto se usa en WhatsApp.
  const ZONAS = [
    { id: 'entrada', nombre: 'Entrada / puerta principal', tipo: 'exterior' },
    { id: 'cochera', nombre: 'Cochera', tipo: 'exterior' },
    { id: 'patio', nombre: 'Patio / jardín', tipo: 'exterior' },
    { id: 'fachada', nombre: 'Fachada / perímetro', tipo: 'exterior' },
    { id: 'sala', nombre: 'Sala / zona de atención', tipo: 'interior' },
    { id: 'caja', nombre: 'Caja / mostrador', tipo: 'interior' },
    { id: 'pasillo', nombre: 'Pasillo / escalera', tipo: 'interior' },
    { id: 'almacen', nombre: 'Almacén / depósito', tipo: 'interior' },
    { id: 'oficina', nombre: 'Oficina / dormitorio', tipo: 'interior' },
  ].map((zona) => ({ ...zona, nombreCorto: zona.nombre.split(' / ')[0] }));

  // Las tres propuestas que se calculan siempre para las mismas zonas.
  const PROPUESTAS = [
    {
      id: 'basica',
      nombre: 'Básica',
      resolucion: '2MP',
      dias: 7,
      asesor: false,
      recomendada: false,
      beneficios: ['Imagen buena', 'Guarda 1 semana', 'Mira desde tu celular', 'Instalación profesional'],
    },
    {
      id: 'intermedia',
      nombre: 'Intermedia',
      resolucion: '4MP',
      dias: 15,
      asesor: false,
      recomendada: true,
      beneficios: ['Imagen nítida, distingue rostros', 'Guarda 2 semanas', 'Mira desde tu celular', 'Instalación profesional'],
    },
    {
      id: 'pro',
      nombre: 'Pro',
      resolucion: '4MP',
      dias: 30,
      asesor: true,
      recomendada: false,
      beneficios: [
        'Imagen nítida, distingue rostros',
        'Guarda 1 mes',
        'Mira desde tu celular',
        'Instalación profesional',
        'Asesor técnico que diseña tu sistema y te acompaña',
      ],
    },
  ];

  // Redondea a 2 decimales evitando errores de coma flotante.
  function redondear(monto) {
    return Math.round((monto + Number.EPSILON) * 100) / 100;
  }

  function esCantidadValida(n) {
    return Number.isInteger(n) && n >= 0 && n <= MAX_CAMARAS;
  }

  // Suma las cámaras por tipo. zonas: { entrada: 1, sala: 2, ... } (las que falten valen 0).
  // Devuelve { interiores, exteriores, total } o null si alguna cantidad es inválida.
  function contarCamaras(zonas) {
    const conteo = { interiores: 0, exteriores: 0, total: 0 };
    for (const zona of ZONAS) {
      const cantidad = zonas[zona.id] === undefined ? 0 : zonas[zona.id];
      if (!esCantidadValida(cantidad)) {
        return null;
      }
      if (zona.tipo === 'interior') {
        conteo.interiores += cantidad;
      } else {
        conteo.exteriores += cantidad;
      }
      conteo.total += cantidad;
    }
    return conteo;
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
  // o la cantidad necesaria del más grande si ninguno alcanza solo.
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

  // Calcula una propuesta para un conteo de cámaras ya validado (1 a 16 en total).
  // Devuelve { id, nombre, ..., gbNecesarios, lineas, subtotal, igv, total }.
  function calcularPropuesta(propuesta, conteo, precios) {
    const { resolucion, dias } = propuesta;
    const { interiores, exteriores, total: totalCamaras } = conteo;

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
    if (propuesta.asesor) {
      lineas.push(linea('Asesor técnico', 1, precios.asesorTecnico));
    }

    const subtotal = redondear(lineas.reduce((suma, l) => suma + l.subtotal, 0));
    const igv = redondear(subtotal * TASA_IGV);
    const total = redondear(subtotal + igv);

    return { ...propuesta, gbNecesarios, lineas, subtotal, igv, total };
  }

  // Calcula las tres propuestas para las zonas elegidas.
  // Devuelve { ok: true, conteo, propuestas } o { ok: false, motivo, mensaje }.
  function calcularPropuestas(zonas, precios) {
    const conteo = contarCamaras(zonas);
    if (!conteo) {
      return error('cantidad_invalida', `Cada zona debe tener entre 0 y ${MAX_CAMARAS} cámaras.`);
    }
    if (conteo.total < 1) {
      return error('sin_camaras', MENSAJE_SIN_CAMARAS);
    }
    if (conteo.total > MAX_CAMARAS) {
      return { ...error('a_medida', MENSAJE_A_MEDIDA), conteo };
    }
    const propuestas = PROPUESTAS.map((propuesta) => calcularPropuesta(propuesta, conteo, precios));
    return { ok: true, conteo, propuestas };
  }

  // Formatea un monto en soles: 1234.5 → "S/ 1,234.50".
  function formatearSoles(monto) {
    const [entero, decimales] = redondear(monto).toFixed(2).split('.');
    const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `S/ ${conComas}.${decimales}`;
  }

  // "Entrada (1), Cochera (1), Sala (1)" en el orden de ZONAS, solo las elegidas.
  function describirZonas(zonas) {
    return ZONAS.filter((zona) => zonas[zona.id] > 0)
      .map((zona) => `${zona.nombreCorto} (${zonas[zona.id]})`)
      .join(', ');
  }

  // Mensaje para agendar la visita técnica de una propuesta.
  function armarMensajeVisita(propuesta, lugar, zonas) {
    return [
      'Hola, quiero agendar mi visita técnica gratuita.',
      `Propuesta: ${propuesta.nombre} (desde ${formatearSoles(propuesta.total)})`,
      `Lugar: ${lugar}`,
      `Zonas: ${describirZonas(zonas)}`,
      'Mi distrito es:',
    ].join('\n');
  }

  // Mensaje para pedir un proyecto a medida (más de 16 cámaras).
  function armarMensajeAMedida(lugar, zonas) {
    const conteo = contarCamaras(zonas);
    return [
      'Hola, quiero cotizar un proyecto a medida.',
      `Lugar: ${lugar}`,
      `Zonas: ${describirZonas(zonas)}`,
      `Total: ${conteo ? conteo.total : '?'} cámaras`,
      'Mi distrito es:',
    ].join('\n');
  }

  function urlWhatsapp(mensaje) {
    return `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  }

  const api = {
    MAX_CAMARAS,
    TASA_IGV,
    MENSAJE_SIN_CAMARAS,
    MENSAJE_A_MEDIDA,
    LUGARES,
    ZONAS,
    PROPUESTAS,
    contarCamaras,
    calcularPropuesta,
    calcularPropuestas,
    calcularAlmacenamientoGb,
    elegirNvr,
    elegirDisco,
    formatearSoles,
    describirZonas,
    armarMensajeVisita,
    armarMensajeAMedida,
    urlWhatsapp,
  };

  // Funciona en Node (pruebas) y en el navegador (sin paso de compilación).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    raiz.Calculo = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
