require('dotenv').config()
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_KEY
});
const base = Airtable.base(process.env.AIRTABLE_BASE);


// airtable
const uploadToAirTable = async () => {
    base('Project tracker').create([
        {
            "fields": {
                Name: chatData['name'],
                Update: chatData['update'],
                Issue: chatData['issue'],
                Observation: chatData['observation'],
                // Attachments:
                //     [
                //         {
                //             "id": uuidv4(),
                //             "size": 26317,
                //             "url": chatData['media'].data,
                //             "type": "image/jpeg",
                //             "filename": chatData['media'].filename,
                //         }
                //     ]
            }
        }
    ], { typecast: true }, function (err, records) {
        if (err) {
            console.error(err);
            return;
        }
        records.forEach(function (record) {
            console.log(record.getId());
        });
    });
}


// creating object
const chatData = { 'name': '', 'update': '', 'issue': '', 'observation': '' };
const SESSION_FILE_PATH = './session.json';

// holding the session info
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

// generate qr
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// authentication via qr
client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});
// authentication failure

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});

// ready for chatting
client.on('ready', () => {
    console.log('Client is ready!');

    // Number where you want to send the message.
    const number = "+8801911178585";

    // Your message.
    const text = "Hi, What's your name?";

    // Getting chatId from the number.
    // we have to delete "+" from the beginning and add "@c.us" at the end of the number.
    const chatId = number.substring(1) + "@c.us";

    // Sending message.
    client.sendMessage(chatId, text);
});
let extension;
// responses
client.on('message', async message => {

    if (message.hasMedia) {
        const media = await message.downloadMedia();
        // console.log(media);
        client.sendMessage(message.from, 'If you came across any issues please write on that.');
        let fileName;
        if (media.filename === undefined) {
            extension = media.mimetype.includes("audio/ogg; codecs=opus") ? `mp3` : `${media.mimetype.split('/')[1]}`
            media.filename = uuidv4() + "." + extension
        }
        console.log('got it')
        // console.log(chatData)
        chatData["media"] = media;

        fs.writeFile(
            "./upload/" + media.filename,
            media.data,
            "base64",
            function (err) {
                if (err) {
                    console.log(err);
                }
            }
        );
        // trial

    }
    else if (message.body.startsWith('Yes')) {
        client.sendMessage(message.from, 'what are they?');
    }
    else if (message.body.startsWith('Name')) {
        const token = message.body.split(':')[1];

        chatData['name'] = token;
        client.sendMessage(message.from, "What's the project progress today");
    }
    // trial

    else if (message.body.startsWith('No')) {
        client.sendMessage(message.from, 'Thank you');
        uploadToAirTable()
        setTimeout(() => {
            process.exit(0)

        }, 15000)
    }

    else if (message.body.startsWith('Issue')) {
        const token = message.body.split(':')[1];

        chatData['issue'] = token;
        // console.log(chatData);

        client.sendMessage(message.from, 'Do you have any observation to add');
    }
    else if (message.body.startsWith('Observation')) {
        const token = message.body.split(':')[1];

        chatData['observation'] = token;
        // console.log(chatData);

        client.sendMessage(message.from, 'Thank you');
        uploadToAirTable()

        setTimeout(() => {
            process.exit(0)

        }, 15000)
    }
    // trial

    else if (message.body) {
        chatData["update"] = message.body;
        // console.log(chatData);
        client.sendMessage(message.from, "please send some images from today's progress.");

        // setTimeout(() => {
        // }, 5000)
    }
});
// new added
client.on('change_state', state => {
    console.log('CHANGE STATE', state);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});