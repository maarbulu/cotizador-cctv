const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  ZONAS,
  PROPUESTAS,
  MENSAJE_SIN_CAMARAS,
  MENSAJE_A_MEDIDA,
  contarCamaras,
  calcularPropuestas,
  calcularAlmacenamientoGb,
  elegirNvr,
  elegirDisco,
  formatearSoles,
  describirZonas,
  armarMensajeVisita,
  armarMensajeAMedida,
  urlWhatsapp,
} = require('../calculo.js');

const precios = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'precios.json'), 'utf8'));

// Ejemplo de la especificación: Entrada (1), Cochera (1), Sala (1).
const ZONAS_EJEMPLO = { entrada: 1, cochera: 1, sala: 1 };

function propuesta(resultado, id) {
  return resultado.propuestas.find((p) => p.id === id);
}

function buscarLinea(prop, inicio) {
  return prop.lineas.find((l) => l.concepto.startsWith(inicio));
}

describe('zonas y conteo de cámaras', () => {
  test('hay 9 zonas: 4 exteriores y 5 interiores', () => {
    assert.equal(ZONAS.length, 9);
    assert.equal(ZONAS.filter((z) => z.tipo === 'exterior').length, 4);
    assert.equal(ZONAS.filter((z) => z.tipo === 'interior').length, 5);
  });

  test('suma interiores, exteriores y total', () => {
    assert.deepEqual(contarCamaras({ entrada: 2, fachada: 1, caja: 3, oficina: 1 }), {
      interiores: 4,
      exteriores: 3,
      total: 7,
    });
  });

  test('zonas vacías cuentan 0', () => {
    assert.deepEqual(contarCamaras({}), { interiores: 0, exteriores: 0, total: 0 });
  });

  test('cantidades inválidas en una zona', () => {
    assert.equal(contarCamaras({ sala: -1 }), null);
    assert.equal(contarCamaras({ sala: 1.5 }), null);
    assert.equal(contarCamaras({ sala: '2' }), null);
    assert.equal(contarCamaras({ sala: 17 }), null);
  });
});

describe('las tres propuestas (ejemplo de la especificación)', () => {
  const r = calcularPropuestas(ZONAS_EJEMPLO, precios);

  test('se calculan siempre las tres, en orden', () => {
    assert.equal(r.ok, true);
    assert.deepEqual(r.propuestas.map((p) => p.id), ['basica', 'intermedia', 'pro']);
    assert.deepEqual(r.conteo, { interiores: 1, exteriores: 2, total: 3 });
  });

  test('solo la Intermedia es recomendada', () => {
    assert.deepEqual(r.propuestas.filter((p) => p.recomendada).map((p) => p.id), ['intermedia']);
  });

  test('Básica: 2MP, 7 días, sin asesor', () => {
    const p = propuesta(r, 'basica');
    assert.deepEqual(p.lineas, [
      { concepto: 'Cámara interior 2MP', cantidad: 1, precioUnitario: 120, subtotal: 120 },
      { concepto: 'Cámara exterior 2MP', cantidad: 2, precioUnitario: 150, subtotal: 300 },
      { concepto: 'NVR 4 canales', cantidad: 1, precioUnitario: 280, subtotal: 280 },
      { concepto: 'Disco duro 1 TB', cantidad: 1, precioUnitario: 220, subtotal: 220 },
      { concepto: 'Instalación por punto', cantidad: 3, precioUnitario: 80, subtotal: 240 },
      { concepto: 'Materiales por punto', cantidad: 3, precioUnitario: 40, subtotal: 120 },
    ]);
    assert.equal(p.gbNecesarios, 420);
    assert.equal(p.subtotal, 1280);
    assert.equal(p.igv, 230.4);
    assert.equal(p.total, 1510.4);
  });

  test('Intermedia: 4MP, 15 días → total S/ 1,864.40 como en la especificación', () => {
    const p = propuesta(r, 'intermedia');
    assert.equal(p.gbNecesarios, 1800);
    assert.ok(buscarLinea(p, 'Disco duro 2 TB'));
    assert.equal(buscarLinea(p, 'Asesor'), undefined);
    assert.equal(p.subtotal, 1580);
    assert.equal(p.igv, 284.4);
    assert.equal(formatearSoles(p.total), 'S/ 1,864.40');
  });

  test('Pro: 4MP, 30 días, con asesor técnico', () => {
    const p = propuesta(r, 'pro');
    assert.equal(p.gbNecesarios, 3600);
    assert.ok(buscarLinea(p, 'Disco duro 4 TB'));
    assert.deepEqual(buscarLinea(p, 'Asesor técnico'), {
      concepto: 'Asesor técnico', cantidad: 1, precioUnitario: 0, subtotal: 0,
    });
    assert.equal(p.subtotal, 180 + 440 + 280 + 520 + 360);
    assert.equal(p.total, 2100.4);
  });

  test('la instalación y los materiales van siempre', () => {
    for (const p of r.propuestas) {
      assert.equal(buscarLinea(p, 'Instalación por punto').cantidad, 3);
      assert.equal(buscarLinea(p, 'Materiales por punto').cantidad, 3);
    }
  });
});

describe('otros casos de cálculo', () => {
  test('solo zonas interiores no agrega línea de exteriores', () => {
    const r = calcularPropuestas({ caja: 2 }, precios);
    for (const p of r.propuestas) {
      assert.equal(buscarLinea(p, 'Cámara exterior'), undefined);
    }
    assert.equal(buscarLinea(propuesta(r, 'basica'), 'Cámara interior 2MP').subtotal, 240);
  });

  test('16 cámaras en Pro necesitan 3 discos de 8 TB', () => {
    // 16 × 30 × 40 = 19 200 GB → 3 × 8 TB
    const r = calcularPropuestas({ entrada: 8, sala: 8 }, precios);
    const p = propuesta(r, 'pro');
    assert.deepEqual(buscarLinea(p, 'Disco duro 8 TB'), {
      concepto: 'Disco duro 8 TB', cantidad: 3, precioUnitario: 950, subtotal: 2850,
    });
    assert.ok(buscarLinea(p, 'NVR 16 canales'));
    assert.equal(p.subtotal, 1440 + 1760 + 750 + 2850 + 1920);
    assert.equal(p.igv, 1569.6);
    assert.equal(p.total, 10289.6);
  });

  test('el precio del asesor se lee de precios.json', () => {
    const otrosPrecios = structuredClone(precios);
    otrosPrecios.asesorTecnico = 150;
    const base = propuesta(calcularPropuestas(ZONAS_EJEMPLO, precios), 'pro');
    const cambiado = propuesta(calcularPropuestas(ZONAS_EJEMPLO, otrosPrecios), 'pro');
    assert.equal(cambiado.subtotal - base.subtotal, 150);
  });

  test('cambiar precios.json cambia las tres propuestas sin tocar el código', () => {
    const otrosPrecios = structuredClone(precios);
    otrosPrecios.instalacion.porPunto = 100;
    const base = calcularPropuestas(ZONAS_EJEMPLO, precios);
    const cambiado = calcularPropuestas(ZONAS_EJEMPLO, otrosPrecios);
    for (let i = 0; i < 3; i++) {
      assert.equal(cambiado.propuestas[i].subtotal - base.propuestas[i].subtotal, 60);
    }
  });

  test('IGV y total se redondean a 2 decimales', () => {
    const otrosPrecios = structuredClone(precios);
    otrosPrecios.camaras.interior['2MP'] = 99.99;
    const p = propuesta(calcularPropuestas({ sala: 3 }, otrosPrecios), 'basica');
    // 299.97 + 280 + 220 + 360 = 1159.97; IGV = 208.7946 → 208.79
    assert.equal(p.subtotal, 1159.97);
    assert.equal(p.igv, 208.79);
    assert.equal(p.total, 1368.76);
  });
});

describe('validaciones', () => {
  test('0 cámaras: "Elige al menos una zona."', () => {
    const r = calcularPropuestas({}, precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'sin_camaras');
    assert.equal(r.mensaje, MENSAJE_SIN_CAMARAS);
    assert.equal(MENSAJE_SIN_CAMARAS, 'Elige al menos una zona.');
  });

  test('1 cámara es válido', () => {
    assert.equal(calcularPropuestas({ cochera: 1 }, precios).ok, true);
  });

  test('16 cámaras es válido', () => {
    const r = calcularPropuestas({ entrada: 4, patio: 4, sala: 4, caja: 4 }, precios);
    assert.equal(r.ok, true);
    assert.equal(r.conteo.total, 16);
  });

  test('17 cámaras: proyecto a medida, sin propuestas', () => {
    const r = calcularPropuestas({ entrada: 16, sala: 1 }, precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'a_medida');
    assert.equal(r.mensaje, MENSAJE_A_MEDIDA);
    assert.equal(r.propuestas, undefined);
    assert.equal(r.conteo.total, 17);
  });

  test('cantidad inválida en una zona', () => {
    assert.equal(calcularPropuestas({ sala: 17 }, precios).motivo, 'cantidad_invalida');
  });
});

describe('elegirNvr', () => {
  const casos = [
    [1, 4], [4, 4], [5, 8], [8, 8], [9, 16], [16, 16],
  ];
  for (const [camaras, canales] of casos) {
    test(`${camaras} cámaras → NVR ${canales} canales`, () => {
      assert.equal(elegirNvr(camaras, precios).canales, canales);
    });
  }

  test('17 cámaras → ningún NVR', () => {
    assert.equal(elegirNvr(17, precios), null);
  });
});

describe('elegirDisco y almacenamiento', () => {
  test('GB por cámara por día según resolución', () => {
    assert.equal(calcularAlmacenamientoGb(1, 1, '2MP'), 20);
    assert.equal(calcularAlmacenamientoGb(1, 1, '4MP'), 40);
    assert.equal(calcularAlmacenamientoGb(4, 15, '2MP'), 1200);
  });

  const casos = [
    [140, 1, 1], [1000, 1, 1], [1001, 2, 1], [2000, 2, 1], [2001, 4, 1],
    [4000, 4, 1], [4001, 8, 1], [8000, 8, 1], [8001, 8, 2], [16000, 8, 2], [19200, 8, 3],
  ];
  for (const [gb, tb, cantidad] of casos) {
    test(`${gb} GB → ${cantidad} disco(s) de ${tb} TB`, () => {
      const disco = elegirDisco(gb, precios);
      assert.equal(disco.tb, tb);
      assert.equal(disco.cantidad, cantidad);
    });
  }
});

describe('formatearSoles', () => {
  test('formatos', () => {
    assert.equal(formatearSoles(0), 'S/ 0.00');
    assert.equal(formatearSoles(5), 'S/ 5.00');
    assert.equal(formatearSoles(1234.5), 'S/ 1,234.50');
    assert.equal(formatearSoles(1864.4), 'S/ 1,864.40');
    assert.equal(formatearSoles(1234567.891), 'S/ 1,234,567.89');
  });
});

describe('mensajes de WhatsApp', () => {
  test('describe solo las zonas elegidas, con nombre corto y en orden', () => {
    assert.equal(describirZonas({ sala: 1, entrada: 1, cochera: 1, patio: 0 }), 'Entrada (1), Cochera (1), Sala (1)');
  });

  test('mensaje de visita idéntico al de la especificación', () => {
    const intermedia = propuesta(calcularPropuestas(ZONAS_EJEMPLO, precios), 'intermedia');
    assert.equal(
      armarMensajeVisita(intermedia, 'Casa', ZONAS_EJEMPLO),
      'Hola, quiero agendar mi visita técnica gratuita.\n' +
        'Propuesta: Intermedia (desde S/ 1,864.40)\n' +
        'Lugar: Casa\n' +
        'Zonas: Entrada (1), Cochera (1), Sala (1)\n' +
        'Mi distrito es:'
    );
  });

  test('mensaje de proyecto a medida', () => {
    assert.equal(
      armarMensajeAMedida('Almacén', { fachada: 10, almacen: 8 }),
      'Hola, quiero cotizar un proyecto a medida.\n' +
        'Lugar: Almacén\n' +
        'Zonas: Fachada (10), Almacén (8)\n' +
        'Total: 18 cámaras\n' +
        'Mi distrito es:'
    );
  });

  test('URL de WhatsApp al +51 978 741 045 con el texto codificado', () => {
    assert.equal(urlWhatsapp('Hola, S/ 1 & 2\nok'), 'https://wa.me/51978741045?text=Hola%2C%20S%2F%201%20%26%202%0Aok');
  });

  test('las propuestas tienen los beneficios de la especificación', () => {
    assert.equal(PROPUESTAS[0].beneficios.join(' · '), 'Imagen buena · Guarda 1 semana · Mira desde tu celular · Instalación profesional');
    assert.equal(
      PROPUESTAS[2].beneficios.join(' · '),
      'Imagen nítida, distingue rostros · Guarda 1 mes · Mira desde tu celular · Instalación profesional · ' +
        'Asesor técnico que diseña tu sistema y te acompaña'
    );
  });
});
