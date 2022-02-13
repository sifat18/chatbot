const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
const client = new Client({ puppeteer: { headless: false }, session: sessionCfg });
// const client = new Client()
// client.on('ready', async () => {
//     console.log('Client is ready!');
//     const chat = await client.getChats();
//     sendMsg = await chat.find(c => c.name == 'Testing')
//     client.sendMessage(sendMsg._serialized, "hello,automated")
// });

// client.on('message', message => {
//     console.log(message.body);
// });
client.initialize();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('Client is ready!');

    // Number where you want to send the message.
    const number = "+8801911178585";

    // Your message.
    const text = "what is the update?";

    // Getting chatId from the number.
    // we have to delete "+" from the beginning and add "@c.us" at the end of the number.
    const chatId = number.substring(1) + "@c.us";

    // Sending message.
    client.sendMessage(chatId, text);
});

client.on('message', async message => {
    if (message.hasMedia) {
        const media = await message.downloadMedia();
        // console.log(media);
        client.sendMessage(message.from, 'ok got it');

    }
    if (message.body) {
        client.sendMessage(message.from, 'send the videos and images');
    }
});

// client.initialize();