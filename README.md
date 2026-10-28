# cotizador-cctv
Cotizador web de sistemas de cámaras de seguridad. El cliente indica cuántas cámaras necesita, ve tres propuestas (Básica, Intermedia y Pro) y agenda su visita técnica gratis por WhatsApp.

## Probar en tu computadora
La página lee `precios.json`, así que necesita un servidor local (abrir el archivo con doble clic no funciona):

```bash
python3 -m http.server 8000
```

Luego abre http://localhost:8000

## Cambiar precios
Edita `precios.json`. No hace falta tocar el código.

## Pruebas
```bash
node --test
```
