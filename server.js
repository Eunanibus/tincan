const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require("crypto");
const express = require('express');
const redis = require("redis");

const client = redis.createClient('redis://redis:6379');
const app = express();

const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.KEY;
const key = crypto.scryptSync(KEY, 'salt', 32);
const EXPIRY_HOURS = 1;
const TIME_TO_LIVE = 60 * 60 * (EXPIRY_HOURS || 1);

if (KEY && KEY !== "") {

    app.use(cors());

    app.get("*", express.static(__dirname + '/public'));

    app.post("/submit", bodyParser.json(), async (req, res) => {
        const { id, data } = req.body;
        if (id && data) {
            const iv = Buffer.alloc(16, 0);

            try {
                const encryptedData = await encryptData(iv, data);
                client.set(
                    id,
                    JSON.stringify({
                        i: iv.toString('hex'),
                        d: encryptedData,
                    }),
                    'EX',
                    TIME_TO_LIVE
                );
                res.status(200).send();
            } catch (exception) {
                res.status(500).send('encryption & storage failed');
            }
        } else {
            res.status(400).send('required parameters missing');
        }
    });

    app.post("/fetch", bodyParser.json(), async (req, res) => {
        const {id} = req.body;
        if (id) {
            client.get(id, async (err, result) => {
                if (!err && result) {
                    try {
                        const {i, d} = JSON.parse(result);
                        const decryptedData = await decryptData(Buffer.from(i, 'hex'), d);
                        client.del(id);
                        res.json({
                            data: decryptedData.toString('hex')
                        })
                    } catch (e) {
                        res.status(500).send('decryption error')
                    }
                } else {
                    res.status(404).send('item not found');
                }
            });
        }
    });

    console.log(`KEY: ${KEY}`);
    app.listen(process.env.PORT);

} else {
    console.error('encryption key not set. server terminated');
    process.exit(1);
}

async function encryptData(iv, data) {
    return new Promise((resolve, reject) => {
        try {

            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

            let encrypted = '';
            cipher.on('readable', () => {
                let chunk;
                while (null !== (chunk = cipher.read())) {
                    encrypted += chunk.toString('hex');
                }
            });

            cipher.on('end', () => {
                resolve(encrypted);
            });

            cipher.write(data);
            cipher.end();
        } catch (exception) {
            reject({ message: exception.message });
        }
    });
}

async function decryptData(iv, data) {
    return new Promise((resolve, reject) => {
        try {
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

            let decrypted = '', chunk;
            decipher.on('readable', () => {
                while (null !== (chunk = decipher.read())) {
                    decrypted += chunk.toString('utf8');
                }
            });

            decipher.on('end', () => {
                resolve(decrypted)
            });

            decipher.write(data, 'hex');
            decipher.end();
        } catch (exception) {
            reject({ message: exception.message });
        }
    }).catch(exception => {
        return exception;
    });
}
