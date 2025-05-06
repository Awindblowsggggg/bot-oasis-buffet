const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const palabraClave = "cakes"; // 🎂 Palabra clave para bienvenida

// 📌 **Palabras clave y sus archivos JSON correspondientes**
const palabrasClaveArchivos = {
    "paw": "Paw-Patrol.json",
    "patrol": "Paw-Patrol.json",
    "princesas": "Princesas.json",
    "princesa": "Princesas.json",
    "prinsesas": "Princesas.json",
    "minie": "Minnie.json",
    "mini": "Minnie.json",
    "minnie": "Minnie.json",
    "monster": "Paw-Patrol-Monster-Truck.json",
    "plim": "Plim-Plim.json",
    "payaso": "Plim-Plim.json",
    "mohana": "Mohana-bb.json",
    "sirenita": "Sirenita.json",
    "sofia": "Sofia.json",
    "stitch": "Stitch.json",
    "steach": "Stitch.json",
    "bob": "Bob-Esponja.json",
    "esponja": "Bob-Esponja.json"
};

// 📥 **Cargar contenido desde archivo JSON**
function cargarContenidoJSON(nombreArchivo) {
    try {
        if (!fs.existsSync(nombreArchivo)) {
            console.error(`❌ Archivo no encontrado: ${nombreArchivo}`);
            return [];
        }
        const data = JSON.parse(fs.readFileSync(nombreArchivo, 'utf-8'));
        return data.productos || [];
    } catch (err) {
        console.error(`❌ Error al cargar ${nombreArchivo}:`, err.message);
        return [];
    }
}

// 🎂 **Cargar mensaje de bienvenida**
function cargarTematicas() {
    try {
        const data = JSON.parse(fs.readFileSync('tematicas.json', 'utf-8'));
        return data.mensaje || "🎂 ¡Bienvenido a *Oasis Buffet*! 🍰";
    } catch (err) {
        console.error('❌ Error al cargar tematicas.json:', err.message);
        return "🎂 ¡Bienvenido a *Oasis Buffet*! 🍰";
    }
}

// 🔁 **Iniciar el bot**
async function iniciarBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false
        });

        sock.ev.on('creds.update', saveCreds);

        // 🔄 **Manejo de conexión y QR**
        sock.ev.on('connection.update', (update) => {
            const { connection, qr } = update;
            if (qr) {
                qrcode.generate(qr, { small: true });
            } else if (connection === 'open') {
                console.log('✅ ¡Bot conectado a WhatsApp!');
            } else if (connection === 'close') {
                console.error('❌ Conexión cerrada, intentando reconectar...');
                iniciarBot(); // 🔄 Reiniciar el bot
            }
        });

        // 📩 **Manejo de mensajes**
        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                for (const msg of messages) {
                    if (!msg.message) continue;

                    const textoRecibido = msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        msg.message?.videoMessage?.caption || '';

                    const textoNormalizado = textoRecibido.toLowerCase().trim();
                    const fromMe = msg.key.fromMe;
                    const remoteJid = msg.key.remoteJid;
                    const esGrupo = remoteJid.endsWith('@g.us');
                    const nombreCliente = msg.pushName || "Cliente";

                    console.log('📨 Mensaje recibido:', textoRecibido);

                    // 🎂 **Respuesta de bienvenida si el cliente escribe "cakes"**
                    if (!fromMe && !esGrupo && textoNormalizado.includes(palabraClave)) {
                        const bienvenida = `🎉 ¡Hola ${nombreCliente}! ${cargarTematicas()}`;
                        await sock.sendMessage(remoteJid, { text: bienvenida });
                        continue; // Usar `continue` para seguir procesando otras palabras
                    }

                    // 🔍 **Buscar palabras clave en el mensaje**
                    for (const palabra in palabrasClaveArchivos) {
                        const regex = new RegExp(`\\b${palabra}\\b`, 'i'); // Expresión regular para detección precisa

                        if (!fromMe && !esGrupo && regex.test(textoNormalizado)) {
                            const archivoJSON = palabrasClaveArchivos[palabra];
                            const productos = cargarContenidoJSON(archivoJSON);

                            for (const producto of productos) {
                                let mensajeProducto = `🎂 *${producto.nombre}*\n\n📌 ${producto.descripcion}\n💰 Precio: ${producto.precio}`;
                                await sock.sendMessage(remoteJid, { text: mensajeProducto });

                                if (fs.existsSync(producto.imagen)) {
                                    await sock.sendMessage(remoteJid, { image: { url: producto.imagen } });
                                } else {
                                    console.error(`❌ Imagen no encontrada: ${producto.imagen}`);
                                }
                            }
                            break; // Usar `break` en lugar de `return`
                        }
                    }
                }
            } catch (err) {
                console.error('❌ Error procesando mensaje:', err);
            }
        });

    } catch (err) {
        console.error('❌ Error iniciando el bot:', err);
        setTimeout(iniciarBot, 5000); // 🔄 Reiniciar en 5 segundos si hay un error
    }
}

iniciarBot();