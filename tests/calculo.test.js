const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  calcularCotizacion,
  calcularAlmacenamientoGb,
  elegirNvr,
  elegirDisco,
  formatearSoles,
  MENSAJE_A_MEDIDA,
} = require('../calculo.js');

const precios = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'precios.json'), 'utf8'));

function entrada(cambios) {
  return { interiores: 1, exteriores: 0, resolucion: '2MP', dias: 7, instalacion: false, ...cambios };
}

function buscarLinea(resultado, inicio) {
  return resultado.lineas.find((l) => l.concepto.startsWith(inicio));
}

describe('casos normales', () => {
  test('2 interiores + 2 exteriores, 2MP, 15 días, con instalación', () => {
    const r = calcularCotizacion(
      entrada({ interiores: 2, exteriores: 2, resolucion: '2MP', dias: 15, instalacion: true }),
      precios
    );
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

  test('sin instalación no agrega líneas de instalación ni materiales', () => {
    const r = calcularCotizacion(entrada({ interiores: 3, resolucion: '4MP', dias: 7 }), precios);
    assert.equal(r.ok, true);
    assert.equal(buscarLinea(r, 'Instalación'), undefined);
    assert.equal(buscarLinea(r, 'Materiales'), undefined);
    // 3 × 180 + NVR 4 (280) + disco 1 TB (3×7×40 = 840 GB → 220)
    assert.equal(r.subtotal, 540 + 280 + 220);
  });

  test('solo cámaras exteriores no agrega línea de interiores', () => {
    const r = calcularCotizacion(entrada({ interiores: 0, exteriores: 2, resolucion: '4MP' }), precios);
    assert.equal(r.ok, true);
    assert.equal(buscarLinea(r, 'Cámara interior'), undefined);
    assert.equal(buscarLinea(r, 'Cámara exterior 4MP').subtotal, 440);
  });

  test('1 cámara 4MP por 30 días necesita disco de 2 TB', () => {
    const r = calcularCotizacion(entrada({ resolucion: '4MP', dias: 30 }), precios);
    assert.equal(r.gbNecesarios, 1200);
    assert.ok(buscarLinea(r, 'Disco duro 2 TB'));
  });

  test('IGV y total se redondean a 2 decimales', () => {
    const preciosConDecimales = structuredClone(precios);
    preciosConDecimales.camaras.interior['2MP'] = 99.99;
    const r = calcularCotizacion(entrada({ interiores: 3 }), preciosConDecimales);
    // 3 × 99.99 = 299.97 + 280 + 220 = 799.97; IGV = 143.9946 → 143.99
    assert.equal(r.subtotal, 799.97);
    assert.equal(r.igv, 143.99);
    assert.equal(r.total, 943.96);
  });

  test('cambiar precios.json cambia el resultado sin tocar el código', () => {
    const otrosPrecios = structuredClone(precios);
    otrosPrecios.nvr[0].precio = 300;
    const base = calcularCotizacion(entrada(), precios);
    const cambiado = calcularCotizacion(entrada(), otrosPrecios);
    assert.equal(cambiado.subtotal - base.subtotal, 20);
  });
});

describe('límites de cantidad de cámaras', () => {
  test('0 cámaras en total devuelve error', () => {
    const r = calcularCotizacion(entrada({ interiores: 0, exteriores: 0 }), precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'sin_camaras');
  });

  test('1 cámara es válido', () => {
    const r = calcularCotizacion(entrada({ interiores: 1, exteriores: 0 }), precios);
    assert.equal(r.ok, true);
    assert.equal(r.totalCamaras, 1);
  });

  test('16 cámaras (8 + 8) usa NVR de 16 canales', () => {
    const r = calcularCotizacion(entrada({ interiores: 8, exteriores: 8 }), precios);
    assert.equal(r.ok, true);
    assert.equal(r.totalCamaras, 16);
    assert.ok(buscarLinea(r, 'NVR 16 canales'));
    // 16 × 7 × 20 = 2240 GB → 4 TB
    assert.ok(buscarLinea(r, 'Disco duro 4 TB'));
    assert.equal(r.subtotal, 960 + 1200 + 750 + 520);
    assert.equal(r.igv, 617.4);
    assert.equal(r.total, 4047.4);
  });

  test('16 cámaras de un solo tipo es válido', () => {
    const r = calcularCotizacion(entrada({ interiores: 16, exteriores: 0 }), precios);
    assert.equal(r.ok, true);
  });

  test('17 cámaras en total pide proyecto a medida', () => {
    const r = calcularCotizacion(entrada({ interiores: 16, exteriores: 1 }), precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'a_medida');
    assert.equal(r.mensaje, MENSAJE_A_MEDIDA);
  });

  test('32 cámaras (16 + 16) pide proyecto a medida', () => {
    const r = calcularCotizacion(entrada({ interiores: 16, exteriores: 16 }), precios);
    assert.equal(r.motivo, 'a_medida');
  });

  test('más de 16 de un tipo es entrada inválida', () => {
    const r = calcularCotizacion(entrada({ interiores: 17 }), precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'cantidad_invalida');
  });

  test('cantidades negativas o con decimales son inválidas', () => {
    assert.equal(calcularCotizacion(entrada({ interiores: -1 }), precios).motivo, 'cantidad_invalida');
    assert.equal(calcularCotizacion(entrada({ interiores: 1.5 }), precios).motivo, 'cantidad_invalida');
    assert.equal(calcularCotizacion(entrada({ interiores: '2' }), precios).motivo, 'cantidad_invalida');
  });
});

describe('otras validaciones', () => {
  test('resolución inválida', () => {
    assert.equal(calcularCotizacion(entrada({ resolucion: '8MP' }), precios).motivo, 'resolucion_invalida');
  });

  test('días de grabación inválidos', () => {
    assert.equal(calcularCotizacion(entrada({ dias: 10 }), precios).motivo, 'dias_invalidos');
  });

  test('si el almacenamiento supera el disco más grande pide proyecto a medida', () => {
    // 16 × 30 × 40 = 19 200 GB > 8 TB
    const r = calcularCotizacion(entrada({ interiores: 16, resolucion: '4MP', dias: 30 }), precios);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'a_medida');
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
    [140, 1], [1000, 1], [1001, 2], [2000, 2], [2001, 4], [4000, 4], [4001, 8], [8000, 8],
  ];
  for (const [gb, tb] of casos) {
    test(`${gb} GB → disco de ${tb} TB`, () => {
      assert.equal(elegirDisco(gb, precios).tb, tb);
    });
  }

  test('8001 GB → ningún disco', () => {
    assert.equal(elegirDisco(8001, precios), null);
  });
});

describe('formatearSoles', () => {
  test('formatos', () => {
    assert.equal(formatearSoles(0), 'S/ 0.00');
    assert.equal(formatearSoles(5), 'S/ 5.00');
    assert.equal(formatearSoles(1234.5), 'S/ 1,234.50');
    assert.equal(formatearSoles(1911.6), 'S/ 1,911.60');
    assert.equal(formatearSoles(1234567.891), 'S/ 1,234,567.89');
  });
});
