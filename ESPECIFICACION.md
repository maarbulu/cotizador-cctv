# Cotizador CCTV — Especificación v1

## Objetivo
Página web donde un cliente obtiene, en menos de 1 minuto, un presupuesto estimado de un sistema de videovigilancia y lo envía por WhatsApp para pedir la cotización formal.

## Usuario
Dueño de casa o pequeño negocio en Lima, sin conocimientos técnicos, que entra desde el celular.

## Entradas (formulario)
- Cámaras interiores: 0 a 16
- Cámaras exteriores: 0 a 16
- Resolución: 2MP o 4MP (aplica a todas)
- Días de grabación: 7, 15 o 30
- ¿Incluir instalación?: sí / no

## Reglas de cálculo
Todos los precios se leen de `precios.json` (valores de ejemplo, editables).

1. **Cámaras:** cantidad × precio según tipo (interior/exterior) y resolución.
2. **NVR:** según total de cámaras → hasta 4 = NVR 4 canales; hasta 8 = 8 canales; hasta 16 = 16 canales. Más de 16 cámaras: mostrar mensaje "Contáctanos para un proyecto a medida".
3. **Disco duro:** almacenamiento necesario (GB) = total de cámaras × días × GB por cámara por día (2MP = 20 GB, 4MP = 40 GB). Elegir el disco más pequeño que alcance: 1 TB, 2 TB, 4 TB u 8 TB (1 TB = 1000 GB).
4. **Instalación (si se elige):** total de cámaras × (instalación por punto + materiales por punto).
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
- Desglose por línea (concepto, cantidad, precio unitario, subtotal).
- Subtotal, IGV y total en S/ con 2 decimales.
- Nota visible: "Precio referencial. Sujeto a visita técnica."
- Botón **"Enviar por WhatsApp"** que abre WhatsApp al +51 978 741 045 con el resumen de la cotización ya escrito.

## Criterios de "terminado"
- [ ] Se ve y funciona bien en celular (ancho 380 px) y en escritorio.
- [ ] Cambiar un valor en `precios.json` cambia el resultado sin tocar el código.
- [ ] Valida que haya al menos 1 cámara y máximo 16.
- [ ] Las pruebas automáticas del cálculo pasan.
- [ ] Publicado en GitHub Pages con URL pública.

## Fuera de alcance (v1)
Servidor, login, base de datos, pagos, PDF descargable.
