# Cotizador CCTV — Especificación v2

## Objetivo
Página web donde un cliente, en menos de 1 minuto, indica qué quiere proteger, ve tres propuestas con precio "desde" y **agenda por WhatsApp su visita técnica gratuita**.

El negocio es **venta e instalación** (pago único). La página no vende equipos: vende una solución de seguridad instalada. El detalle de equipos solo se muestra si el cliente lo pide.

## Usuario
Dueño de casa o pequeño negocio en Lima, sin conocimientos técnicos, que entra desde el celular.

## Entradas (formulario)
1. **¿Qué quieres proteger?** Casa, Tienda, Oficina o Almacén. (Solo se usa en el mensaje de WhatsApp.)
2. **¿Qué zonas?** Lista de zonas, cada una con un contador de 0 a 16 cámaras:

| Zona | Tipo de cámara |
|---|---|
| Entrada / puerta principal | Exterior |
| Cochera | Exterior |
| Patio / jardín | Exterior |
| Fachada / perímetro | Exterior |
| Sala / zona de atención | Interior |
| Caja / mostrador | Interior |
| Pasillo / escalera | Interior |
| Almacén / depósito | Interior |
| Oficina / dormitorio | Interior |

Total de cámaras = suma de todas las zonas. Cámaras interiores = suma de zonas interiores; exteriores = suma de zonas exteriores.

No se pregunta resolución, días de grabación ni instalación: eso lo define cada propuesta, y la instalación siempre está incluida.

## Propuestas
Para las mismas zonas se calculan siempre las tres:

| Propuesta | Resolución | Grabación | Asesor técnico |
|---|---|---|---|
| Básica | 2MP | 7 días | — |
| Intermedia ★ recomendada | 4MP | 15 días | — |
| Pro | 4MP | 30 días | Sí, incluido |

Beneficios que se muestran al cliente (en lenguaje simple, sin términos técnicos):
- Básica: "Imagen buena · Guarda 1 semana · Mira desde tu celular · Instalación profesional"
- Intermedia: "Imagen nítida, distingue rostros · Guarda 2 semanas · Mira desde tu celular · Instalación profesional"
- Pro: "Imagen nítida, distingue rostros · Guarda 1 mes · Mira desde tu celular · Instalación profesional · Asesor técnico que diseña tu sistema y te acompaña"

Todas incluyen visita técnica gratuita.

## Reglas de cálculo (por propuesta)
Todos los precios se leen de `precios.json` (valores de ejemplo, editables).

1. **Cámaras:** cantidad × precio según tipo (interior/exterior) y resolución de la propuesta.
2. **NVR:** según total de cámaras → hasta 4 = NVR 4 canales; hasta 8 = 8 canales; hasta 16 = 16 canales.
3. **Disco duro:** almacenamiento necesario (GB) = total de cámaras × días × GB por cámara por día (2MP = 20 GB, 4MP = 40 GB). Elegir el disco más pequeño que alcance: 1 TB, 2 TB, 4 TB u 8 TB (1 TB = 1000 GB). Si no alcanza ni el de 8 TB, usar la cantidad necesaria de discos de 8 TB.
4. **Instalación (siempre):** total de cámaras × (instalación por punto + materiales por punto).
5. **Asesor técnico (solo Pro):** precio de `precios.json` (ejemplo: 0, se muestra como "Incluido").
6. **Subtotal**, **IGV 18%** y **Total**, en soles.

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
| Asesor técnico (Pro) | 0 |

## Salida
- Tres tarjetas, una debajo de otra en celular: nombre, beneficios y **"Desde S/ 1,234.50"** (el total con IGV). La Intermedia lleva la marca "Recomendada".
- En cada tarjeta, un enlace **"Ver qué incluye"** que despliega el desglose (concepto, cantidad, precio unitario, subtotal, IGV y total).
- Nota visible: "Precio referencial. El precio final se confirma en la visita técnica gratuita."
- En cada tarjeta, un botón **"Agendar visita gratis"** que abre WhatsApp al +51 978 741 045 con este mensaje ya escrito:

```
Hola, quiero agendar mi visita técnica gratuita.
Propuesta: Intermedia (desde S/ 1,864.40)
Lugar: Casa
Zonas: Entrada (1), Cochera (1), Sala (1)
Mi distrito es:
```

## Validaciones
- 0 cámaras en total: "Elige al menos una zona."
- Más de 16 cámaras en total: no se muestran propuestas; se muestra "Contáctanos para un proyecto a medida" con un botón de WhatsApp.

## Criterios de "terminado"
- [ ] Se ve y funciona bien en celular (ancho 380 px) y en escritorio.
- [ ] Cambiar un valor en `precios.json` cambia el resultado sin tocar el código.
- [ ] Valida que haya al menos 1 cámara y máximo 16.
- [ ] Las tres propuestas se calculan con las reglas de arriba.
- [ ] El mensaje de WhatsApp sale completo y bien escrito.
- [ ] Las pruebas automáticas del cálculo pasan.
- [ ] Publicado en GitHub Pages con URL pública.

## Fuera de alcance (v2)
Servidor, login, base de datos, pagos, PDF descargable, agenda con calendario, planes mensuales.
