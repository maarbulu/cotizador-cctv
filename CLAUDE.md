# Reglas del proyecto — Cotizador CCTV

Lee `ESPECIFICACION.md` antes de cualquier tarea. Es la fuente de verdad; no la modifiques salvo que te lo pidan.

## Stack
- HTML, CSS y JavaScript puro. Sin frameworks, sin paso de compilación.
- Sin dependencias externas. Las pruebas usan el runner nativo de Node (`node --test`).

## Estructura
- `index.html` — página
- `styles.css` — estilos
- `app.js` — interfaz (lee el formulario, muestra resultados)
- `calculo.js` — lógica pura del cálculo, sin tocar el DOM
- `precios.json` — todos los precios
- `tests/` — pruebas de `calculo.js`

## Convenciones
- Interfaz y comentarios en español (Perú).
- Diseño mobile first, limpio y profesional.
- Montos en soles: `S/ 1,234.50`.
- Nunca escribas precios en el código: siempre desde `precios.json`.

## Forma de trabajar
- Una tarea = un pull request pequeño.
- Antes de terminar: corre `node --test` y verifica que todo pase.
- En la descripción del pull request, en español: qué cambiaste, por qué, y pasos para probarlo.
- Si algo de la especificación es ambiguo, elige la opción más simple y explícalo en el pull request.
