/**
 * Tarifario juanguzmanph.com · promedio colaborativo de precios en Tucumán
 *
 * Va pegado en Google Apps Script, dentro de una planilla de Google Sheets
 * (Extensiones → Apps Script). La guía paso a paso está en tools/TARIFARIO.md.
 *
 * - doPost: recibe aportes anónimos { dispositivo, items: [{ id, precio }] } y los anota en la hoja "aportes".
 *   Un mismo dispositivo cuenta una sola vez por servicio cada 30 días (si vuelve a aportar, se actualiza su valor).
 * - doGet (?accion=promedios): devuelve, por servicio, cantidad de aportes, promedio y rango medio (p25–p75)
 *   de los últimos 6 meses, sin los valores atípicos.
 */

const HOJA = 'aportes';
const DIAS_VIGENCIA = 180;     // se usan los aportes de los últimos 6 meses
const DIAS_REPETIDO = 30;      // un dispositivo vale una vez por servicio en este plazo
const PRECIO_MIN = 1000;
const PRECIO_MAX = 100000000;
const MAX_ITEMS = 40;

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA);
  if (!h) {
    h = libro.insertSheet(HOJA);
    h.appendRow(['fecha', 'servicio', 'precio', 'ciudad', 'version', 'dispositivo']);
    h.setFrozenRows(1);
  }
  return h;
}

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let datos;
  try { datos = JSON.parse(e.postData.contents); } catch (err) { return respuesta_({ ok: false, error: 'json' }); }
  if (!datos || datos.web) return respuesta_({ ok: true });                  // campo trampa para bots
  const disp = String(datos.dispositivo || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  if (disp.length < 12 || !Array.isArray(datos.items)) return respuesta_({ ok: false, error: 'datos' });

  const items = datos.items.slice(0, MAX_ITEMS).filter((it) =>
    it && /^[a-z0-9-]{2,40}$/.test(it.id) && Number(it.precio) >= PRECIO_MIN && Number(it.precio) <= PRECIO_MAX);
  if (!items.length) return respuesta_({ ok: true, guardados: 0 });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const h = hoja_();
    const ahora = new Date();
    const limite = ahora.getTime() - DIAS_REPETIDO * 864e5;
    const filas = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, 6).getValues() : [];
    const ciudad = String(datos.ciudad || 'tucuman').slice(0, 30);
    const version = String(datos.v || '').slice(0, 20);
    items.forEach((it) => {
      const precio = Math.round(Number(it.precio));
      // si este dispositivo ya aportó este servicio hace poco, se actualiza esa fila
      for (let i = filas.length - 1; i >= 0; i--) {
        const f = filas[i];
        if (f[5] === disp && f[1] === it.id && new Date(f[0]).getTime() >= limite) {
          h.getRange(i + 2, 1, 1, 6).setValues([[ahora, it.id, precio, ciudad, version, disp]]);
          return;
        }
      }
      h.appendRow([ahora, it.id, precio, ciudad, version, disp]);
    });
    CacheService.getScriptCache().remove('promedios');
  } finally {
    lock.releaseLock();
  }
  return respuesta_({ ok: true, guardados: items.length });
}

function percentil_(orden, p) {
  const pos = (orden.length - 1) * p;
  const a = Math.floor(pos), b = Math.ceil(pos);
  return orden[a] + (orden[b] - orden[a]) * (pos - a);
}

function calcular_() {
  const h = hoja_();
  if (h.getLastRow() < 2) return { actualizado: new Date().toISOString(), servicios: {} };
  const desde = Date.now() - DIAS_VIGENCIA * 864e5;
  const porServicio = {};
  h.getRange(2, 1, h.getLastRow() - 1, 3).getValues().forEach((f) => {
    if (new Date(f[0]).getTime() < desde) return;
    const p = Number(f[2]);
    if (!p) return;
    (porServicio[f[1]] = porServicio[f[1]] || []).push(p);
  });
  const servicios = {};
  Object.keys(porServicio).forEach((id) => {
    let v = porServicio[id].sort((a, b) => a - b);
    // fuera los atípicos: más allá de 1,5 veces el rango intercuartil
    if (v.length >= 4) {
      const q1 = percentil_(v, 0.25), q3 = percentil_(v, 0.75), r = q3 - q1;
      v = v.filter((x) => x >= q1 - 1.5 * r && x <= q3 + 1.5 * r);
    }
    const promedio = v.reduce((a, x) => a + x, 0) / v.length;
    servicios[id] = {
      n: v.length,
      promedio: Math.round(promedio / 500) * 500,
      p25: Math.round(percentil_(v, 0.25) / 500) * 500,
      p75: Math.round(percentil_(v, 0.75) / 500) * 500,
    };
  });
  return { actualizado: new Date().toISOString(), servicios };
}

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('promedios');
  if (guardado) return ContentService.createTextOutput(guardado).setMimeType(ContentService.MimeType.JSON);
  const datos = JSON.stringify(calcular_());
  cache.put('promedios', datos, 600); // 10 minutos
  return ContentService.createTextOutput(datos).setMimeType(ContentService.MimeType.JSON);
}

/** Para probar desde el editor: corré esta función y mirá la hoja "aportes". */
function probar() {
  const r = doPost({ postData: { contents: JSON.stringify({ dispositivo: 'prueba0000000001', ciudad: 'tucuman', v: 'prueba', items: [{ id: 'dis-logo', precio: 230000 }] }) } });
  Logger.log(r.getContent());
  Logger.log(doGet({}).getContent());
}
