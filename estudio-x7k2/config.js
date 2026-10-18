/* Configuración del Estudio. Para usarlo en la web de un cliente, copiá la carpeta
   y cambiá solo estos datos (ver la guía: "Plantilla del Estudio para clientes"). */
window.ESTUDIO_CONFIG = {
  marca: 'Juan Guzman',                 // se ve arriba del título en el ingreso
  owner: 'Juangzman',                   // usuario de GitHub dueño del repositorio
  repo: 'juanguzmanph',                 // repositorio de la web
  rama: 'main',
  galeria: 'data/galeria.json',         // orden, categorías y portadas
  carpetaFotos: 'img/f',                // donde se guardan las fotos (desde la raíz del repo)
  anchos: [800, 1600],                  // tamaños que se generan de cada foto
  accesos: 'estudio-x7k2/accesos.json', // usuarios y contraseñas (cifrados)
  raizWeb: '../',                       // de esta carpeta a la raíz de la web
  paginaGaleria: 'fotografia.html',     // para el botón "Ver en la web"
};
