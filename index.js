// importing necessary files
require('dotenv').config()
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Airtable = require('airtable');
const { PDFDocument, StandardFonts } = require("pdf-lib");

// airtable config
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
                URL: chatData['link'],
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


// generating pdf 
async function makePdf() {
    // Create a new document and add a new page
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Get the width and height of the page
    const { width, height } = page.getSize();

    // Draw a string of text toward the top of the page
    const fontSize = 30;
    page.drawText(`Project Progress Report From ${chatData['name']}`, {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
    });

    page.drawText(`Update Text: ${chatData['update']}`, {
        x: 50,
        y: height - 6 * fontSize - 5,
        size: fontSize - 10,
        font: timesRomanFont,
    });
    page.drawText(`Observation Text:${chatData['observation']}`, {
        x: 50,
        y: height - 7 * fontSize - 5,
        size: fontSize - 10,
        font: timesRomanFont,
    });
    page.drawText(`Issue Text:${chatData['issue']}`, {
        x: 50,
        y: height - 8 * fontSize - 5,
        size: fontSize - 10,
        font: timesRomanFont,
    });
    page.drawText(`Link :${chatData['link']}`, {
        x: 50,
        y: height - 9 * fontSize - 5,
        size: fontSize - 10,
        font: timesRomanFont,
    });

    // Load the image and store it as a Node.js buffer in memory
    chatData['media'].forEach(async images => {
        let page2 = pdfDoc.addPage();
        let img = await pdfDoc.embedJpg(images.data);
        let jpgDims = img.scale(0.25)
        page2.drawImage(img, {
            x: page2.getWidth() / 2 - jpgDims.width / 2,
            y: page2.getHeight() / 2 - jpgDims.height / 2,
            width: jpgDims.width,
            height: jpgDims.height,

        });
    })
    // const page2 = pdfDoc.addPage();
    // let img = await pdfDoc.embedJpg(chatData['media'].data);

    // const jpgDims = img.scale(0.25)
    // // Draw the image on the center of the page
    // const { width2, height2 } = img.scale(1);
    // page2.drawImage(img, {
    //     x: page2.getWidth() / 2 - jpgDims.width / 2,
    //     y: page2.getHeight() / 2 - jpgDims.height / 2,
    //     width: jpgDims.width,
    //     height: jpgDims.height,

    // });
    // Write the PDF to a file
    fs.writeFile(
        "./upload/" + uuidv4() + '.pdf',
        await pdfDoc.save(),
        "base64",
        function (err) {
            if (err) {
                console.log(err);
            }
        }
    );
}

// creating object
const chatData = { 'name': '', 'update': '', 'issue': '', 'observation': '', 'media': [] };
const SESSION_FILE_PATH = './session.json';

// holding the session info
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
const client = new Client({ puppeteer: { headless: false }, session: sessionCfg });
client.initialize();

// generate qr
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// authentication via qr
client.on('authenticated', (session) => {
    // console.log('AUTHENTICATED', session);
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
        let fileName;
        if (media.filename === undefined) {
            extension = media.mimetype.includes("audio/ogg; codecs=opus") ? `mp3` : `${media.mimetype.split('/')[1]}`
            media.filename = uuidv4() + "." + extension
        }
        console.log('got it')
        // console.log(chatData)
        chatData["media"].push(media);

        // fs.writeFile(
        //     "./upload/" + media.filename,
        //     media.data,
        //     "base64",
        //     function (err) {
        //         if (err) {
        //             console.log(err);
        //         }
        //     }
        // );
        chatData['media'].length == 1 && client.sendMessage(message.from, 'share drive link.');

    }
    else if (message.body.startsWith('Link')) {
        chatData['link'] = message.body
        client.sendMessage(message.from, 'If you came across any issues please write on that.');
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
        makePdf()
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
        makePdf()
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