const { Client } = require("pg");
//Import Events
const EventEmitter = require("events");
//Import Util
const util = require("util");



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
  dbEventEmitter.on("table_data", async (msg) => {
    // fetch device coordinates
    // console.log(msg.endpoint);

    console.log(msg);
  });

  // const url = ctx.request.query.target;

  // Designate which channels we are listening on. Add additional channels with multiple lines.

  client.on("notification", function (msg) {
    let payload = JSON.parse(msg.payload);
    console.log('notification')
    dbEventEmitter.emit(msg.channel, payload);
  });
  client.query("LISTEN new_data");
  client.query("LISTEN table_data");
})();

