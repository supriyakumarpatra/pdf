const { Client } = require("pg");
//Import Events
const EventEmitter = require("events");
//Import Util
const util = require("util");

const puppeteer = require("puppeteer");
const fs = require("fs");

const minimal_args = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];

var Minio = require("minio");

var minioClient = new Minio.Client({
  endPoint: "play.min.io",
  port: 9000,
  useSSL: true,
  accessKey: "minioadmin",
  secretKey: "minioadmin",
});


// var minioClient = new Minio.Client({
//   endPoint: "iot.hyperthings.in",
//   port: 17206,
//   useSSL: false,
//   accessKey: "xcHwoEOYiOYDksDz",
//   secretKey: "nAZSIkmTHnxDlyeY",
// });


const { db } = require("./config/adaptor");
(async () => {
  const client = new Client(db.pg.uri);
  try {
    await client.connect();
    console.log("DataBase connected!");
  } catch (e) {
    console.log("DataBase Not connected", e);
  }
  // Build and instantiate our custom event emitter
  function DbEventEmitter() {
    EventEmitter.call(this);
  }
  util.inherits(DbEventEmitter, EventEmitter);

  const dbEventEmitter = new DbEventEmitter();

  // Handle New devices
  dbEventEmitter.on("new_data", async (msg) => {
    // fetch device coordinates
    // console.log(msg.endpoint);

    const url = msg.endpoint;
    const browser = await puppeteer.launch({
      headless: true,
      args: minimal_args
    })
    const webPage = await browser.newPage();
    const blocked_domains = [
      'googlesyndication.com',
      'adservice.google.com',
    ];
    await webPage.setRequestInterception(true);
              webPage.on('request', request => {
                const url = request.url()
                if (blocked_domains.some(domain => url.includes(domain))) {
                    request.abort();
                } else {
                    request.continue();
                }
                });
            await webPage.setViewport({ width: 1400, height: 1000 });
            await webPage.goto(url, {
                waitUntil: "networkidle0",
            });
            const pdf = await webPage.pdf({
                printBackground: true,
                format: "letter",
                printBackground: true,
                displayHeaderFooter: true,
                margin: {
                top: "20px",
                bottom: "40px",
                left: "20px",
                right: "20px",
                },
            });
    await browser.close();
    // await browser.close();

    var metaData = {
      "Content-Type": "application/pdf",
      //   "X-Amz-Meta-Testing": 1234,
      //   example: 5678,
    };
    function makeid(length) {
      var result = "IOT";
      var characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      var charactersLength = characters.length;
      for (var i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      return result;
    }
    const sr1 = makeid(5);
    console.log(sr1);
    // console.log(sr1);
    // Using fPutObject API upload your file to the bucket europetrip.
    minioClient.putObject(
      "pdfnotifier",
      `${sr1}.pdf`,
      pdf,
      function (err, etag) {
        if (err) return console.log(err);
        console.log("File uploaded successfully.");

        minioClient.presignedUrl(
          "GET",
          "pdfnotifier",
          `${sr1}.pdf`,
          24 * 60 * 60,
          function (err, presignedUrl) {
            if (err) return console.log(err);
            console.log(presignedUrl);
            const query = {
              text: "UPDATE dbrecords SET result_pdf_url = $1, status = $2 WHERE id = $3",
              values: [presignedUrl,true, msg.id],
            };

            client.query(query, (err, res) => {
              if (err) {
                console.log(err.stack);
              } else {
                console.log(res.rowCount);
              }
            });
          }
        );
      
      }
    );
  });

  // const url = ctx.request.query.target;

  // Designate which channels we are listening on. Add additional channels with multiple lines.

  client.on("notification", function (msg) {
    let payload = JSON.parse(msg.payload);
    console.log('notification');
    dbEventEmitter.emit(msg.channel, payload);
  });
  client.query("LISTEN new_data");
  client.query("LISTEN updatenotifier");
})();

//  async function getUrl() {}

// const { Pool, Client } = require("pg");

// const config = require("./config/adaptor");

// const koa = require("koa");
// const client = require("pg/lib/native/client");

// const PORT = 3030;

// const app = new koa();

// const credentials = {
//   username: "master",
//   host: "localhost",
//   database: "bin-app-vig",
//   password: "DHNNOQIYWMDZZPOQ",
//   port: 30334,
// };

// // Connect with a client.

// async function poolDemo() {
//   const Client = new Client(credentials);

//   await client.connect();

//   client.on("notification", function (msg) {
//     console.log(msg);
//   });
//   var query = pool.query("LISTEN watchers");

//   const now = await pool.query(`SELEct * from foo`);
//   await pool.end();

//   return now;
// }
// (async () => {
//   const poolResult = await poolDemo();
//   console.log("Time with pool: " + poolResult);
// })();

// app.listen(PORT, () => console.log("server running on port " + PORT));
