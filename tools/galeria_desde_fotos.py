"""Arma data/galeria.json (la galería que edita el Estudio) a partir de tools/fotos.json.
OJO: reemplaza lo que hayas cambiado desde el Estudio. Usalo solo para empezar de cero
después de reprocesar todo con tools/procesar.py."""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NOMBRES = {"conciertos": "Conciertos", "eventos": "Eventos", "deportes": "Deportes", "gastronomia": "Gastronomía",
           "moda": "Moda", "book": "Book", "retratos": "Retratos"}
PORTADAS = {"conciertos": "conciertos-34", "eventos": "eventos-17", "deportes": "deportes-02",
            "gastronomia": "gastronomia-25", "moda": "moda-05", "book": "book-02", "retratos": "retratos-01"}
fotos = json.loads((RAIZ / "tools" / "fotos.json").read_text())
galeria = {"categorias": [
    {"id": k, "nombre": n, "portada": PORTADAS.get(k, f"{k}-01"),
     "fotos": [{"slug": s, "w": w, "h": h} for s, w, h in fotos[k]]}
    for k, n in NOMBRES.items()]}
(RAIZ / "data" / "galeria.json").write_text(json.dumps(galeria, ensure_ascii=False, indent=1))
print("data/galeria.json:", {c["id"]: len(c["fotos"]) for c in galeria["categorias"]})
