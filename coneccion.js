const { default: makeWASocket, useMultiFileAuthState, makeInMemoryStore, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const store = makeInMemoryStore({});
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["WhatsApp Bot", "Chrome", "1.0"],
        defaultQueryTimeoutMs: 60000
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log("✅ Conectado a WhatsApp");
            const groups = await sock.groupFetchAllParticipating();
            const groupData = Object.entries(groups).map(([id, info]) => ({
                id,
                nombre: info.subject
            }));

            // Guardar en archivos JSON y TXT
            fs.writeFileSync('grupos.json', JSON.stringify(groupData, null, 2));
            const groupText = groupData.map(g => `${g.nombre} - ${g.id}`).join('\n');
            fs.writeFileSync('grupos.txt', groupText);

            console.log("📂 Lista de grupos guardada en grupos.json y grupos.txt");
        }

        // Manejo de errores y reconexión automática
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("⚠️ Desconectado de WhatsApp, reconectando:", shouldReconnect);
            if (shouldReconnect) {
                startBot();
            } else {
                console.log("❌ Sesión cerrada. Escanea nuevamente el código QR.");
            }
        }
    });

    sock.ev.on('messages.upsert', async (msg) => {
        console.log("📩 Nuevo mensaje:", msg);
    });
}

startBot();
