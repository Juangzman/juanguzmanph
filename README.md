# juanguzmanph
Portfolio de fotografía y diseño de Juan Guzman · https://www.juanguzmanph.com

La guía completa (preparar la Mac, cómo funciona el código y recetas paso a paso) está en el documento "Guía de la web juanguzmanph.com".

Uso rápido, desde esta carpeta:

    python3 tools/build.py            # genera las páginas
    python3 -m http.server 8000       # vista previa en http://localhost:8000
    ./actualizar.sh "qué cambié"      # genera y publica

Imágenes (con el SSD conectado y FOTOS_SSD apuntando a "Cloude Juan Guzman Web"):

    python3 tools/procesar.py         # galería  -> img/f
    python3 tools/procesar_hero.py    # portada  -> img/h
    cd tools && python3 procesar_diseno.py && cd ..   # diseño -> img/d
