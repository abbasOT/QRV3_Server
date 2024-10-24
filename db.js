// const admin = require("firebase-admin");
// const serviceAccount = require("./qrdoorman-ebf21-firebase-adminsdk-r9hlo-8bcaf530b9.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://qrdoorman-ebf21-default-rtdb.firebaseio.com",
//   storageBucket: "qrdoorman-ebf21.appspot.com",
// });

// module.exports = admin;



const admin = require("firebase-admin");

const serviceAccount = require("./qrdoormanv3-firebase-adminsdk-stm1h-bff36020a5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://qrdoormanv3-default-rtdb.firebaseio.com",
  storageBucket: "qrdoormanv3.appspot.com",

});

const db = admin.firestore(); // Firestore initialization
const rtdb = admin.database(); // Realtime Database initialization
const auth = admin.auth(); // Authentication initialization
const storage = admin.storage().bucket(); // Cloud Storage initialization



module.exports = {
  admin,
  db,
  rtdb,
  auth,
  storage,
};
