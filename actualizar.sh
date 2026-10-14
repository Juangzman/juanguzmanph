#!/bin/bash
# Regenera las páginas y publica la web en GitHub Pages.
# Uso (desde la carpeta del repo):  ./actualizar.sh "qué cambié"
set -e
cd "$(dirname "$0")"
python3 tools/build.py
git add -A
git commit -m "${1:-Actualiza la web}"
git push origin main
git push origin main:diseno-web
echo "Listo. En 3 a 5 minutos se ve en https://www.juanguzmanph.com (recargá con Cmd+Shift+R)."
