function cargarTiposProductos() {
    google.script.run.withSuccessHandler(function(tipos) {
        let select = document.getElementById("tipo-producto");
        select.innerHTML = ""; // Limpiar opciones previas
        tipos.forEach(tipo => {
            let option = document.createElement("option");
            option.value = tipo;
            option.textContent = tipo;
            select.appendChild(option);
        });
    }).obtenerTiposProductos();
}

function habilitarImagenes() {
    let codigo = document.getElementById("codigo").value.trim();
    document.getElementById("image-url").disabled = codigo === "";
}

function permitirArrastrar(event) {
    event.preventDefault();
}

async function procesarImagenURL() {
    let url = document.getElementById("image-url").value.trim();
    if (url === "") return;

    let loadingGif = document.createElement("img");
    loadingGif.setAttribute("src", "https://i.gifer.com/ZZ5H.gif");
    loadingGif.setAttribute("width", "30");
    loadingGif.setAttribute("height", "30");
    let previewContainer = document.getElementById("image-preview");
    previewContainer.appendChild(loadingGif);

    try {
        let nombreImagen = generarNombreImagen();
        let nuevaUrl = await subirImagenIbb(url, nombreImagen);

        if (nuevaUrl) {
            mostrarImagen(nuevaUrl);
        } else {
            console.error("⚠️ No se pudo obtener la URL de ibb.com");
        }
    } catch (error) {
        console.error("❌ Error al procesar imagen:", error);
    } finally {
        loadingGif.remove();
        document.getElementById("image-url").value = ""; // Limpia el campo
    }
}


async function procesarImagenesArrastradas(event) {
    event.preventDefault();
    let files = event.dataTransfer.files;

    for (let file of files) {
        let reader = new FileReader();
        reader.onload = async function (e) {
            let base64Image = e.target.result.split(",")[1]; // Extrae solo la parte de la imagen
            let nombreImagen = generarNombreImagen();
            let nuevaUrl = await subirImagenIbb(base64Image, nombreImagen);

            if (nuevaUrl) {
                mostrarImagen(nuevaUrl);
            } else {
                console.error("⚠️ Error al subir imagen arrastrada");
            }
        };
        reader.readAsDataURL(file);
    }
}

// 📌 7️⃣ Subir imagen a ibb.com con nombre camuflado
async function subirImagenIbb(imageData, fileName) {
    const apiKey = "3717e2228df458827cb7e06855655ce7";
    const formData = new FormData();

    formData.append("key", apiKey);

    // ⚠️ Si viene como base64 con prefijo "data:image/png;base64,..."
    if (imageData.startsWith("data:image")) {
        formData.append("image", imageData.split(",")[1]);
    } else {
        formData.append("image", imageData); // se asume URL o base64 puro
    }

    formData.append("name", fileName);

    const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (!data.success) throw new Error("Error al subir la imagen");
    return data.data.url;
}

// 🏷️ 8️⃣ Generar nombre camuflado para imágenes
function generarNombreImagen() {
    let codigoOriginal = document.getElementById("codigo").value.trim();
    let ultimosCuatroDigitos = codigoOriginal.slice(-4);
    let contador = document.querySelectorAll(".image-preview img").length + 1;
    return `ARC-${ultimosCuatroDigitos}-${String(contador).padStart(2, '0')}`;
}

function seleccionarImagenPrincipal(img) {
    document.querySelectorAll(".image-preview img").forEach(el => el.classList.remove("selected"));
    img.classList.add("selected");
}

function detectarEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Evita que el formulario se envíe
        procesarImagenURL(); // Llama a la función de procesamiento
    }
}

let uploadedImages = [];

function mostrarImagen(imageUrl) {
    let previewContainer = document.getElementById("image-preview");

    // Crear el contenedor de la imagen
    let imgDiv = document.createElement("div");
    imgDiv.classList.add("img-thumbnail");

    // Crear la imagen con referrerpolicy para evitar bloqueos
    let img = document.createElement("img");
    img.setAttribute("src", imageUrl);
    img.setAttribute("referrerpolicy", "no-referrer");
    img.setAttribute("width", "80");
    img.setAttribute("height", "80");
    img.onclick = () => seleccionarImagenPrincipal(img, imageUrl);

    // Botón de eliminación
    let deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.innerHTML = "❌";
    deleteBtn.onclick = function () {
        imgDiv.remove(); // Elimina el contenedor de la imagen
        uploadedImages = uploadedImages.filter(url => url !== imageUrl); // Elimina del array de imágenes subidas
    };

    // Agregar elementos al contenedor y luego al preview
    imgDiv.appendChild(img);
    imgDiv.appendChild(deleteBtn);
    previewContainer.appendChild(imgDiv);

    uploadedImages.push(imageUrl); // Añadir la imagen al array de imágenes subidas
} 

document.getElementById("tipo-producto").addEventListener("change", function () {
    const tipoSeleccionado = this.value;
    if (!tipoSeleccionado) return;

    console.log("📡 Solicitando sugerencias para tipo:", tipoSeleccionado);

    google.script.run.withSuccessHandler(function (sugerencias) {
        console.log("✅ Sugerencias recibidas:", sugerencias);

        for (let i = 1; i <= 4; i++) {
            let inputDato = document.getElementById(`dato${i}`);

            // 🔹 Limpiar el valor del campo antes de agregar nuevas sugerencias
            inputDato.value = "";

            // 🔹 Eliminar el <datalist> anterior y crear uno nuevo
            let datalistId = inputDato.id + "-list";
            let datalistExistente = document.getElementById(datalistId);
            if (datalistExistente) {
                datalistExistente.remove(); // 🔥 Se elimina completamente
            }

            let nuevoDatalist = document.createElement("datalist");
            nuevoDatalist.id = datalistId;
            document.body.appendChild(nuevoDatalist);
            inputDato.setAttribute("list", datalistId);

            // 🔹 Agregar nuevas sugerencias si existen
            if (sugerencias[i - 1] && sugerencias[i - 1].length > 0) {
                sugerencias[i - 1].forEach(valor => {
                    let option = document.createElement("option");
                    option.value = valor;
                    nuevoDatalist.appendChild(option);
                });
            }
        }
    }).obtenerSugerenciasPorTipo(tipoSeleccionado);
});

// 🔹 Función para configurar las sugerencias en los campos Dato 1 - Dato 4
function configurarSugerencias(input, sugerencias) {
    if (!sugerencias || sugerencias.length === 0) return;

    let datalistId = input.id + "-list"; // ID del <datalist>
    let datalist = document.getElementById(datalistId);

    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = datalistId;
        document.body.appendChild(datalist);
        input.setAttribute("list", datalistId);
    }

    datalist.innerHTML = ""; // Limpiar opciones previas

    sugerencias.forEach(valor => {
        let option = document.createElement("option");
        option.value = valor;
        datalist.appendChild(option);
    });
}

async function registrarProducto() {
    if (uploadedImages.length === 0) {
        alert("❌ Debes subir al menos una imagen antes de registrar el producto.");
        return;
    }

    let fotoPrincipalIndex = uploadedImages.length > 0 ? 1 : "";
    let selectedImage = document.querySelector(".image-preview img.selected");
    if (selectedImage) {
        fotoPrincipalIndex = uploadedImages.indexOf(selectedImage.src) + 1;
    }

    // Subida opcional del mosaico y recortes
    let urlsMosaico = null;
    const mosaicoActivado = document.getElementById("activar-mosaico").checked;
    const codigoProducto = document.getElementById("codigo").value.trim();

    if (mosaicoActivado) {
        try {
            urlsMosaico = await subirRecortesTVYGuardar(codigoProducto);
            if (!urlsMosaico) {
                alert("❌ Falló la subida del mosaico. No se puede registrar el producto.");
                return;
            }
        } catch (error) {
            console.error("❌ Error subiendo mosaico:", error);
            alert("❌ Falló la subida del mosaico.");
            return;
        }
    }

    let formData = {
        codigo: codigoProducto,
        tipo: document.getElementById("tipo-producto").value.trim(),
        marca: document.getElementById("marca").value.trim(),
        producto: document.getElementById("producto").value.trim(),
        pvp: parseFloat(document.getElementById("pvp").value),
        dto: parseFloat(document.getElementById("dto").value) / 100,
        url: document.getElementById("product-url").value.trim(),
        fotos: JSON.stringify(uploadedImages),
        fotoPrincipal: fotoPrincipalIndex,
        preferente: document.getElementById("preferente").checked,
        camuflado: document.getElementById("camuflado").checked,
        nombreAlternativo: document.getElementById("camuflado").checked ? document.getElementById("nombre-alternativo").value : "",
        dato1: document.getElementById("dato1").value.trim(),
        valor1: document.getElementById("valor1").value.trim(),
        dato2: document.getElementById("dato2").value.trim(),
        valor2: document.getElementById("valor2").value.trim(),
        dato3: document.getElementById("dato3").value.trim(),
        valor3: document.getElementById("valor3").value.trim(),
        dato4: document.getElementById("dato4").value.trim(),
        valor4: document.getElementById("valor4").value.trim(),
        urlMosaico: urlsMosaico ? urlsMosaico.mosaicoCompleto : "",
        urlImagenesVD: urlsMosaico
            ? JSON.stringify({
                  TV40: urlsMosaico.TV40,
                  TV50: urlsMosaico.TV50,
                  TV55: urlsMosaico.TV55,
                  TV65: urlsMosaico.TV65,
                  TV75: urlsMosaico.TV75
              })
            : ""
    };

    console.log("📤 Enviando producto a Apps Script:", formData);

    google.script.run.withSuccessHandler(response => {
        alert(response);
        document.getElementById("product-form").reset();
        uploadedImages = [];
        document.getElementById("image-preview").innerHTML = "";
        document.getElementById("nombre-alternativo-container").style.display = "none";
    }).guardarProducto(formData);
}

// 🟢 Cargar las marcas al abrir el modal
function cargarMarcas() {
    google.script.run.withSuccessHandler(function(marcas) {
        let datalist = document.getElementById("marcas");
        datalist.innerHTML = ""; // Borrar valores anteriores

        marcas.forEach(marca => {
            let option = document.createElement("option");
            option.value = marca;
            datalist.appendChild(option);
        });
    }).obtenerMarcas();
}

function toggleNombreAlternativo() {
    const camuflado = document.getElementById("camuflado").checked;
    const nombreAlternativoContainer = document.getElementById("nombre-alternativo-container");

    if (!nombreAlternativoContainer) {
        console.error("⚠️ Error: No se encontró el contenedor de Nombre Alternativo.");
        return;
    }

    if (camuflado) {
        nombreAlternativoContainer.style.display = "flex";  // Usa "flex" en lugar de "block" si el CSS usa display:flex
        obtenerNombreAlternativo();  // Obtener un nombre alternativo solo si está activado
    } else {
        nombreAlternativoContainer.style.display = "none";
        document.getElementById("nombre-alternativo").value = "";
    }
}

function obtenerNombreAlternativo() {
    google.script.run.withSuccessHandler(function(nombre) {
        if (nombre) {
            document.getElementById("nombre-alternativo").value = nombre;
        } else {
            alert("⚠️ No hay más nombres alternativos disponibles.");
        }
    }).getNombreAlternativo();
}

document.getElementById("activar-mosaico").addEventListener("change", function () {
    const config = document.getElementById("mosaico-config");
    config.style.display = this.checked ? "block" : "none";
});

function actualizarOpcionesDisposicion() {
    const tipo = document.getElementById("tipo-imagen-mosaico").value;
    const disposicion = document.getElementById("tipo-disposicion");
    const patronConfig = document.getElementById("patron-config");
    const repeticiones = document.getElementById("repeticiones-mosaico");

    // Mostrar u ocultar campos según tipo
    if (tipo === "mosaico") {
        repeticiones.style.display = "block";
        disposicion.disabled = true;
        patronConfig.style.display = "none";
    } else {
        repeticiones.style.display = "none";
        disposicion.disabled = false;
        patronConfig.style.display = (disposicion.value === "patron" && tipo === "pieza") ? "block" : "none";
    }

    // Mostrar patrón de giro solo si aplica
    disposicion.addEventListener("change", function () {
        patronConfig.style.display = (this.value === "patron" && tipo === "pieza") ? "block" : "none";
    });
}

let urlsMosaico = [];

async function detectarUrlMosaico(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        const input = event.target;
        const urlOriginal = input.value.trim();
        if (!urlOriginal) return;

        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = urlOriginal;

            img.onload = async () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                const base64 = canvas.toDataURL("image/jpeg").split(",")[1];
                try {
                    const nuevaURL = await subirImagenIbb(base64, generarNombreImagen());
                    if (nuevaURL && !urlsMosaico.includes(nuevaURL)) {
                        urlsMosaico.push(nuevaURL);
                        mostrarImagenMosaico(nuevaURL);
                        input.value = "";
                        actualizarOpcionesTipoImagen();
                    }
                } catch (e) {
                    alert("❌ Error al subir imagen a ImgBB");
                    console.error(e);
                }
            };

            img.onerror = () => {
                alert("❌ No se pudo cargar la imagen (posible CORS).");
            };
        } catch (error) {
            alert("❌ Error inesperado al procesar la imagen.");
            console.error(error);
        }
    }
}

function mostrarImagenMosaico(url) {
    const contenedor = document.getElementById("imagenes-mosaico");
    const div = document.createElement("div");

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = url;
    img.alt = "Imagen del mosaico";
    img.width = 80;
    img.height = 80;
    img.style.objectFit = "cover";

    const btn = document.createElement("button");
    btn.textContent = "❌";
    btn.className = "delete-btn";
    btn.onclick = function () {
        div.remove();
        urlsMosaico = urlsMosaico.filter(u => u !== url);
        actualizarOpcionesTipoImagen();
    };

    div.appendChild(img);
    div.appendChild(btn);
    contenedor.appendChild(div);
}

function actualizarOpcionesTipoImagen() {
    const select = document.getElementById("tipo-imagen-mosaico");

    // Restaurar visibilidad si corresponde
    Array.from(select.options).forEach(opt => opt.disabled = false);

    if (urlsMosaico.length > 1) {
        const mosaicoOpt = Array.from(select.options).find(opt => opt.value === "mosaico");
        const unicaOpt = Array.from(select.options).find(opt => opt.value === "pieza");
        if (mosaicoOpt) {
            mosaicoOpt.disabled = true;
            unicaOpt.disabled = true;
            select.value = "varias"; // Forzar a varias
        }
    }

    actualizarOpcionesDisposicion();
}

function generarMosaico() {
    const anchoBaldosa = parseInt(document.getElementById("ancho-baldosa").value);
    const altoBaldosa = parseInt(document.getElementById("alto-baldosa").value);
    const tipoImagen = document.getElementById("tipo-imagen-mosaico").value;
    const tipoDisposicion = document.getElementById("tipo-disposicion").value;
    const patronGiro = document.getElementById("patron-giro").value || null;
    const repX = parseInt(document.getElementById("rep-x").value) || 0;
    const repY = parseInt(document.getElementById("rep-y").value) || 0;

    const contenedor = document.getElementById("mosaico-render");
    contenedor.innerHTML = ""; // Limpiar anterior

    if (!urlsMosaico.length) {
        alert("❌ Debes añadir al menos una imagen.");
        return;
    }

    if (tipoImagen === "mosaico" && (repX === 0 || repY === 0)) {
        alert("❌ Debes indicar el número de repeticiones.");
        return;
    }

    // Calcular dimensiones necesarias para cubrir 200x200 cm
    const minAnchoCm = 200;
    const minAltoCm = 200;
    const cols = tipoImagen === "mosaico" ? repX : Math.ceil(minAnchoCm / anchoBaldosa);
    const rows = tipoImagen === "mosaico" ? repY : Math.ceil(minAltoCm / altoBaldosa);

    contenedor.style.gridTemplateColumns = `repeat(${cols}, ${anchoBaldosa * 2}px)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const div = document.createElement("div");
            const img = document.createElement("img");

            // Elegir imagen según tipo
            let url;
            if (tipoImagen === "pieza") {
                url = urlsMosaico[0];
            } else if (tipoImagen === "varias") {
                url = urlsMosaico[(x + y * cols) % urlsMosaico.length];
            } else if (tipoImagen === "mosaico") {
                url = urlsMosaico[0];
            }

            img.src = url;
            img.style.width = `${anchoBaldosa * 2}px`;
            img.style.height = `${altoBaldosa * 2}px`;
            img.style.objectFit = "cover";
            img.style.transition = "transform 0.2s ease";

            // Rotaciones aleatorias
            if (tipoDisposicion === "normal") {
                const grados = Math.random() < 0.5 ? 0 : 180;
                img.style.transform = `rotate(${grados}deg)`;
            }

            if (tipoDisposicion === "cuadrada") {
                const grados = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
                img.style.transform = `rotate(${grados}deg)`;
            }

            if (tipoDisposicion === "patron" && tipoImagen === "pieza") {
                const g0 = patronGiro === "+90" ? 90 : -90;
                const g1 = (360 + g0 * 3) % 360;
                const patrón = [
                    [0, g0],
                    [g1, 180]
                ];
                const fila = y % 2;
                const col = x % 2;
                img.style.transform = `rotate(${patrón[fila][col]}deg)`;
            }

            // MODO MADERA con desplazamientos 1/3 y 2/3 y ajuste de columnas
            if (tipoDisposicion === "madera") {
                const anchoPx = anchoBaldosa * 2;
                const altoPx = altoBaldosa * 2;
            
                const filas = Math.ceil(200 / altoBaldosa);
                const columnas = Math.ceil(200 / anchoBaldosa);
            
                const contenedor = document.getElementById("mosaico-render");
                contenedor.innerHTML = "";
                contenedor.style.position = "relative";
                contenedor.style.width = `${(columnas * anchoPx) + columnas - 1}px`;
                contenedor.style.height = `${(filas * altoPx) + filas - 1}px`;
                contenedor.style.overflow = "hidden";
            
                for (let y = 0; y < filas; y++) {
                    const desplazamientoFactor = (y % 3 === 1) ? 1 / 3 : (y % 3 === 2) ? 2 / 3 : 0;
                    const desplazamientoPx = desplazamientoFactor * anchoPx;
            
                    const columnasFila = desplazamientoFactor > 0 ? columnas + 1 : columnas;
            
                    let primeraURL = null;
                    let primeraRotacion = null;
            
                    for (let x = 0; x < columnasFila; x++) {
                        const img = document.createElement("img");
            
                        const esUltimaRepetida = (x === columnasFila - 1 && desplazamientoFactor > 0);
            
                        let url, rotacion;
            
                        if (esUltimaRepetida && primeraURL !== null) {
                            url = primeraURL;
                            rotacion = primeraRotacion;
                        } else {
                            url = tipoImagen === "pieza"
                                ? urlsMosaico[0]
                                : urlsMosaico[(x + y * columnas) % urlsMosaico.length];
            
                            rotacion = Math.random() < 0.5 ? 0 : 180;
            
                            if (x === 0) {
                                primeraURL = url;
                                primeraRotacion = rotacion;
                            }
                        }
            
                        img.src = url;
                        img.style.width = `${anchoPx}px`;
                        img.style.height = `${altoPx}px`;
                        img.style.objectFit = "cover";
                        img.style.position = "absolute";
                        img.style.transform = `rotate(${rotacion}deg)`;
            
                        const left = Math.round(x * (anchoPx + 1) - desplazamientoPx);
                        const top = y * (altoPx + 1);
            
                        img.style.left = `${left}px`;
                        img.style.top = `${top}px`;
            
                        contenedor.appendChild(img);
                    }
                }
            
                return;
            }

            div.appendChild(img);
            contenedor.appendChild(div);
        }
    }

    console.log("✅ Mosaico generado:", { tipoImagen, tipoDisposicion, rows, cols });
}

async function capturarRecortesTV() {
    const contenedor = document.getElementById("mosaico-render");

    if (!contenedor || contenedor.children.length === 0) {
        alert("❌ No hay mosaico generado para capturar.");
        return;
    }

    const canvasOriginal = await html2canvas(contenedor, {
        useCORS: true,
        scale: 2
    });

    const result = {};

    const medidas = [
        { nombre: "40", w: 177, h: 100 },
        { nombre: "50", w: 221, h: 125 },
        { nombre: "55", w: 244, h: 137 },
        { nombre: "65", w: 288, h: 162 },
        { nombre: "75", w: 332, h: 187 }
    ];

    medidas.forEach(({ nombre, w, h }) => {
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = w;
        cropCanvas.height = h;

        const ctx = cropCanvas.getContext("2d");
        const cx = canvasOriginal.width / 2 - w / 2;
        const cy = canvasOriginal.height / 2 - h / 2;

        ctx.drawImage(canvasOriginal, cx, cy, w, h, 0, 0, w, h);

        result[`TV${nombre}`] = cropCanvas.toDataURL("image/png");
    });

    // También guardamos el mosaico completo
    result.mosaicoCompleto = canvasOriginal.toDataURL("image/png");

    return result; // contiene las 6 imágenes: 5 TVs + completo
}

async function subirRecortesTVYGuardar(codigoProducto) {
    const imagenes = await capturarRecortesTV();
    if (!imagenes) return;

    const urlsSubidas = {};

    for (const key in imagenes) {
        const nombre = `MOSAICO_${key}_${codigoProducto}`;
        try {
            const url = await subirImagenIbb(imagenes[key], nombre);
            urlsSubidas[key] = url;
        } catch (error) {
            console.error(`❌ Error subiendo ${key}:`, error);
            alert(`❌ Falló la subida de ${key}`);
            return;
        }
    }

    console.log("✅ Subidas completadas:", urlsSubidas);
    return urlsSubidas;
}

cargarTiposProductos();
cargarMarcas();