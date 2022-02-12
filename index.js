const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// client.on('ready', async () => {
//     console.log('Client is ready!');
//     const chat = await client.getChats();
//     sendMsg = await chat.find(c => c.name == 'Testing')
//     client.sendMessage(sendMsg._serialized, "hello,automated")
// });

// client.on('message', message => {
//     console.log(message.body);
// });
// client.initialize();

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
        console.log(media);
    }
    if (message.body) {
        client.sendMessage(message.from, 'send the videos and images');
    }
});

client.initialize();