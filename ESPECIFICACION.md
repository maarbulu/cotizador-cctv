# Cotizador CCTV — Especificación v2 (prueba)

## Objetivo
Página web donde un cliente, en menos de 1 minuto, ve tres propuestas de videovigilancia con precio "desde" y **agenda por WhatsApp su visita técnica gratuita**.

El negocio es **venta e instalación** (pago único). La instalación está siempre incluida. Es una versión de prueba: lo más simple posible.

## Usuario
Dueño de casa o pequeño negocio en Lima, sin conocimientos técnicos, que entra desde el celular.

## Entradas (formulario)
- Cámaras dentro (interiores): 0 a 16
- Cámaras fuera (exteriores): 0 a 16

Nada más. La resolución y los días de grabación los define cada propuesta.

## Propuestas
Para las mismas cámaras se calculan siempre las tres:

| Propuesta | Resolución | Grabación | Extra |
|---|---|---|---|
| Básica | 2MP | 7 días | — |
| Intermedia (recomendada) | 4MP | 15 días | — |
| Pro | 4MP | 30 días | Asesor técnico incluido (sin costo adicional) |

## Reglas de cálculo (por propuesta)
Todos los precios se leen de `precios.json` (valores de ejemplo, editables).

1. **Cámaras:** cantidad × precio según tipo (interior/exterior) y resolución.
2. **NVR:** según total de cámaras → hasta 4 = NVR 4 canales; hasta 8 = 8 canales; hasta 16 = 16 canales.
3. **Disco duro:** almacenamiento necesario (GB) = total de cámaras × días × GB por cámara por día (2MP = 20 GB, 4MP = 40 GB). Elegir el disco más pequeño que alcance: 1 TB, 2 TB, 4 TB u 8 TB (1 TB = 1000 GB). Si no alcanza ni el de 8 TB, usar la cantidad necesaria de discos de 8 TB.
4. **Instalación (siempre):** total de cámaras × (instalación por punto + materiales por punto).
5. **Subtotal**, **IGV 18%** y **Total**, en soles.

### Precios de ejemplo (S/)
| Concepto | Precio |
|---|---|
| Cámara interior 2MP | 120 |
| Cámara interior 4MP | 180 |
| Cámara exterior 2MP | 150 |
| Cámara exterior 4MP | 220 |
| NVR 4 canales | 280 |
| NVR 8 canales | 420 |
| NVR 16 canales | 750 |
| Disco 1 TB | 220 |
| Disco 2 TB | 320 |
| Disco 4 TB | 520 |
| Disco 8 TB | 950 |
| Instalación por punto | 80 |
| Materiales por punto | 40 |

## Salida
- Tres tarjetas con nombre, beneficios en lenguaje simple y **"Desde S/ 1,234.50"** (total con IGV e instalación). La Intermedia lleva la marca "Recomendada".
- En cada tarjeta, "Ver qué incluye" despliega el desglose (concepto, cantidad, precio unitario, subtotal, IGV y total).
- Nota visible: "Precio referencial. El precio final se confirma en la visita técnica gratuita."
- En cada tarjeta, botón **"Agendar visita gratis"** que abre WhatsApp al +51 978 741 045 con este mensaje:

```
Hola, quiero agendar mi visita técnica gratuita.
Propuesta: Intermedia (desde S/ 2,454.40)
Cámaras: 2 dentro, 2 fuera
Mi distrito es:
```

## Validaciones
- 0 cámaras en total: "Agrega al menos 1 cámara."
- Más de 16 en total: no se muestran propuestas; se muestra "Contáctanos para un proyecto a medida" con un botón de WhatsApp.

## Criterios de "terminado"
- [ ] Se ve y funciona bien en celular (ancho 380 px) y en escritorio.
- [ ] Cambiar un valor en `precios.json` cambia el resultado sin tocar el código.
- [ ] Valida que haya al menos 1 cámara y máximo 16.
- [ ] Las pruebas automáticas del cálculo pasan.
- [ ] Publicado en GitHub Pages con URL pública.

## Fuera de alcance
Servidor, login, base de datos, pagos, PDF descargable, agenda con calendario.
