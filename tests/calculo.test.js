const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  calcularCotizacion,
  calcularPropuestas,
  calcularAlmacenamientoGb,
  elegirNvr,
  elegirDisco,
  formatearSoles,
  mensajeWhatsApp,
  mensajeAMedida,
  MENSAJE_A_MEDIDA,
} = require('../calculo.js');

const precios = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'precios.json'), 'utf8'));

function entrada(cambios) {
  return { interiores: 1, exteriores: 0, resolucion: '2MP', dias: 7, ...cambios };
}

function buscarLinea(resultado, inicio) {
  return resultado.lineas.find((l) => l.concepto.startsWith(inicio));
}

describe('calcularCotizacion', () => {
  test('2 dentro + 2 fuera, 2MP, 15 días: desglose completo con instalación', () => {
    const r = calcularCotizacion(entrada({ interiores: 2, exteriores: 2, dias: 15 }), precios);
    assert.equal(r.ok, true);
    assert.deepEqual(r.lineas, [
      { concepto: 'Cámara interior 2MP', cantidad: 2, precioUnitario: 120, subtotal: 240 },
      { concepto: 'Cámara exterior 2MP', cantidad: 2, precioUnitario: 150, subtotal: 300 },
      { concepto: 'NVR 4 canales', cantidad: 1, precioUnitario: 280, subtotal: 280 },
      { concepto: 'Disco duro 2 TB', cantidad: 1, precioUnitario: 320, subtotal: 320 },
      { concepto: 'Instalación por punto', cantidad: 4, precioUnitario: 80, subtotal: 320 },
      { concepto: 'Materiales por punto', cantidad: 4, precioUnitario: 40, subtotal: 160 },
    ]);
    assert.equal(r.gbNecesarios, 1200);
    assert.equal(r.subtotal, 1620);
    assert.equal(r.igv, 291.6);
    assert.equal(r.total, 1911.6);
  });

  test('solo cámaras de fuera no agrega línea de interiores', () => {
    const r = calcularCotizacion(entrada({ interiores: 0, exteriores: 2, resolucion: '4MP' }), precios);
    assert.equal(r.ok, true);
    assert.equal(buscarLinea(r, 'Cámara interior'), undefined);
    assert.equal(buscarLinea(r, 'Cámara exterior 4MP').subtotal, 440);
  });

  test('IGV y total se redondean a 2 decimales', () => {
    const preciosConDecimales = structuredClone(precios);
    preciosConDecimales.camaras.interior['2MP'] = 99.99;
    const r = calcularCotizacion(entrada({ interiores: 3 }), preciosConDecimales);
    // 3 × 99.99 + 280 + 220 + 3 × 120 = 1159.97; IGV = 208.7946 → 208.79
    assert.equal(r.subtotal, 1159.97);
    assert.equal(r.igv, 208.79);
    assert.equal(r.total, 1368.76);
  });

  test('cambiar precios.json cambia el resultado sin tocar el código', () => {
    const otrosPrecios = structuredClone(precios);
    otrosPrecios.nvr[0].precio = 300;
    const base = calcularCotizacion(entrada(), precios);
    const cambiado = calcularCotizacion(entrada(), otrosPrecios);
    assert.equal(cambiado.subtotal - base.subtotal, 20);
  });

  test('si no alcanza un disco de 8 TB, usa varios', () => {
    // 16 × 30 × 40 = 19 200 GB → 3 discos de 8 TB
    const r = calcularCotizacion(entrada({ interiores: 16, resolucion: '4MP', dias: 30 }), precios);
    assert.equal(r.ok, true);
    assert.deepEqual(buscarLinea(r, 'Disco duro'), {
      concepto: 'Disco duro 8 TB', cantidad: 3, precioUnitario: 950, subtotal: 2850,
    });
  });
});

describe('calcularPropuestas', () => {
  test('2 dentro + 2 fuera: totales de Básica, Intermedia y Pro', () => {
    const r = calcularPropuestas({ interiores: 2, exteriores: 2 }, precios);
    assert.equal(r.ok, true);
    assert.deepEqual(r.propuestas.map((p) => p.nombre), ['Básica', 'Intermedia', 'Pro']);
    assert.deepEqual(r.propuestas.map((p) => p.total), [1793.6, 2454.4, 2961.8]);
  });

  test('cada propuesta usa su resolución y su disco', () => {
    const [basica, intermedia, pro] = calcularPropuestas({ interiores: 2, exteriores: 2 }, precios).propuestas;
    assert.ok(buscarLinea(basica, 'Cámara interior 2MP'));
    assert.ok(buscarLinea(basica, 'Disco duro 1 TB')); // 4 × 7 × 20 = 560 GB
    assert.ok(buscarLinea(intermedia, 'Cámara interior 4MP'));
    assert.ok(buscarLinea(intermedia, 'Disco duro 4 TB')); // 4 × 15 × 40 = 2400 GB
    assert.ok(buscarLinea(pro, 'Disco duro 8 TB')); // 4 × 30 × 40 = 4800 GB
  });

  test('solo la Intermedia es recomendada', () => {
    const r = calcularPropuestas({ interiores: 1, exteriores: 0 }, precios);
    assert.deepEqual(r.propuestas.map((p) => p.recomendada), [false, true, false]);
  });
});

describe('límites de cantidad de cámaras', () => {
  test('0 cámaras en total devuelve error', () => {
    const r = calcularPropuestas({ interiores: 0, exteriores: 0 }, precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'sin_camaras');
  });

  test('1 cámara es válido', () => {
    const r = calcularPropuestas({ interiores: 0, exteriores: 1 }, precios);
    assert.equal(r.ok, true);
  });

  test('16 cámaras (8 + 8) usa NVR de 16 canales en las tres propuestas', () => {
    const r = calcularPropuestas({ interiores: 8, exteriores: 8 }, precios);
    assert.equal(r.ok, true);
    for (const p of r.propuestas) {
      assert.equal(p.totalCamaras, 16);
      assert.ok(buscarLinea(p, 'NVR 16 canales'));
    }
    // Básica: 960 + 1200 + 750 + 520 (4 TB) + 16 × 120 = 5350
    assert.equal(r.propuestas[0].subtotal, 5350);
    assert.equal(r.propuestas[0].total, 6313);
  });

  test('16 cámaras de un solo tipo es válido', () => {
    assert.equal(calcularPropuestas({ interiores: 16, exteriores: 0 }, precios).ok, true);
  });

  test('17 cámaras en total pide proyecto a medida', () => {
    const r = calcularPropuestas({ interiores: 16, exteriores: 1 }, precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'a_medida');
    assert.equal(r.mensaje, MENSAJE_A_MEDIDA);
  });

  test('32 cámaras (16 + 16) pide proyecto a medida', () => {
    assert.equal(calcularPropuestas({ interiores: 16, exteriores: 16 }, precios).motivo, 'a_medida');
  });

  test('más de 16 de un tipo, negativos o decimales son inválidos', () => {
    for (const interiores of [17, -1, 1.5, '2']) {
      const r = calcularPropuestas({ interiores, exteriores: 0 }, precios);
      assert.equal(r.motivo, 'cantidad_invalida', `interiores = ${interiores}`);
    }
  });
});

describe('elegirNvr', () => {
  const casos = [[1, 4], [4, 4], [5, 8], [8, 8], [9, 16], [16, 16]];
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
    [4000, 4, 1], [4001, 8, 1], [8000, 8, 1], [8001, 8, 2], [16000, 8, 2], [16001, 8, 3],
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
    assert.equal(formatearSoles(1234567.891), 'S/ 1,234,567.89');
  });
});

describe('mensajes de WhatsApp', () => {
  test('mensaje para agendar visita', () => {
    const datos = { interiores: 2, exteriores: 2 };
    const intermedia = calcularPropuestas(datos, precios).propuestas[1];
    assert.equal(
      mensajeWhatsApp(intermedia, datos),
      'Hola, quiero agendar mi visita técnica gratuita.\n' +
        'Propuesta: Intermedia (desde S/ 2,454.40)\n' +
        'Cámaras: 2 dentro, 2 fuera\n' +
        'Mi distrito es:'
    );
  });

  test('mensaje para proyecto a medida', () => {
    assert.equal(
      mensajeAMedida({ interiores: 10, exteriores: 10 }),
      'Hola, necesito un proyecto a medida.\nCámaras: 10 dentro, 10 fuera (20 en total)\nMi distrito es:'
    );
  });
});
