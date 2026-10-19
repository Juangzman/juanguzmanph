# Tarifario · juanguzmanph.com/cotizador-q4m9 (privado)

Página pública con precios de referencia para fotografía, diseño y web en Tucumán, un cotizador que
cualquiera puede usar con sus propios precios, y un promedio colaborativo que se alimenta de forma anónima.

## Qué archivo hace qué

| Archivo | Para qué sirve |
| --- | --- |
| `tools/tarifario.json` | **Los precios.** Servicios, rangos (`min` / `max`), combos, fuentes y la URL del promedio (`endpoint`). |
| `tools/tarifario.py` | Arma el HTML de la página (lo llama `tools/build.py`). |
| `cotizador-q4m9/app.js` | El cotizador: selector de cliente y experiencia (acomoda los precios sugeridos), buscador, lista de servicios con escala de precio, hoja del presupuesto en vivo con color de marca tomado del logo, IVA, guardados, PDF, WhatsApp y aportes. |
| `cotizador-q4m9/tarifario.css` | Estilos propios del tarifario (usa los colores y tipografías de `css/styles.css`). |
| `cotizador-q4m9/sw.js` + `manifest.webmanifest` | Modo sin internet e instalación como app. |
| `tools/tarifario-apps-script.gs` | El código que va en Google Sheets para el promedio colaborativo. |

## Cambiar un precio o sumar un servicio

1. Abrí `tools/tarifario.json`.
2. Editá `min` y `max` del servicio (en pesos, sin puntos). Para uno nuevo, copiá un bloque `{ "id": ..., }`
   dentro del grupo que corresponda y poné un `id` único en minúsculas con guiones (por ejemplo `foto-mascotas`).
   **No cambies el `id` de un servicio que ya existe:** los aportes de la comunidad están guardados con ese nombre.
3. Cambiá `"actualizado"` (por ejemplo `"Enero 2027"`).
4. `./actualizar.sh "Tarifario: precios de enero"` → genera y publica.

## Conectar el promedio colaborativo (Google Sheets) — una sola vez

1. Entrá a [sheets.new](https://sheets.new) con tu cuenta de Google y ponele de nombre **Tarifario · aportes**.
2. Menú **Extensiones → Apps Script**. Borrá lo que aparece y pegá todo el contenido de `tools/tarifario-apps-script.gs`. Guardá (ícono de disquete).
3. Arriba, elegí la función **probar** y tocá **Ejecutar**. Google te pide permisos: aceptá con tu cuenta
   (si aparece "Google no verificó esta app", tocá *Configuración avanzada → Ir a…*: es tu propio script).
   En la planilla aparece la hoja **aportes** con una fila de prueba. Borrá esa fila.
4. **Implementar → Nueva implementación →** engranaje → **App web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   Tocá **Implementar** y copiá la URL que termina en `/exec`.
5. Pegala en `tools/tarifario.json`, en `"endpoint": "https://script.google.com/macros/s/.../exec"`.
6. `./actualizar.sh "Tarifario: conecto el promedio de la comunidad"`.

Listo: en el panel del presupuesto aparece la casilla para sumar precios, y cuando un servicio junta
5 aportes (`minimo_aportes` en el JSON) se muestra "Promedio en Tucumán" debajo del rango.

**Si cambiás el código del script** después: *Implementar → Administrar implementaciones → editar (lápiz) →
Versión: nueva → Implementar*. Así la URL sigue siendo la misma.

## Cómo se cuida el promedio

- Solo viaja el servicio y el precio. Nunca nombres, contactos, ni datos del cliente.
- No se envían los precios que quedaron con el valor de referencia (no son de nadie), ni valores menores
  a la cuarta parte del mínimo o mayores a cuatro veces el máximo.
- Cada dispositivo cuenta una vez por servicio cada 30 días: si vuelve a presupuestar, se actualiza su valor.
- El cálculo descarta los atípicos (rango intercuartil) y usa solo los últimos 6 meses, por la inflación.
- Sin internet, los aportes quedan en espera en el dispositivo y se mandan solos cuando vuelve la conexión.

## Datos de quien usa el cotizador

Todo (perfil, precios propios, presupuestos) queda en el navegador de cada persona (`localStorage`).
"Exportar copia" baja un `.json` para pasarlo a otro dispositivo con "Importar copia".
Borrar los datos del sitio en el navegador borra todo eso.
