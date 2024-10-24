var admin = require("firebase-admin");
var fcm = require("fcm-notification");
var serviceAccount = require("../pushNotification/qrdoorman_push_notification.json");

const certPath = admin.credential.cert(serviceAccount);
var FCM = new fcm(certPath);

const sendPushNotification = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { propId, randomString, commercial_prop_id, pcbId } = req.body;

    console.log(propId);
    const url = `PCB/${pcbId}`;
    const urlToSend = `commercial/${commercial_prop_id}`

    const adminRef = admin.database().ref(url);
    const adminsnapshot = await adminRef.once("value");
    const adminData = adminsnapshot.val();

    console.log(adminData.pcbId);


    const Sensor = await CheckSensorValue(adminData.pcbId);

    if (Sensor.status === 400) {
      return res.status(Sensor.status).json({
        error: "Sensor false",
        sensorCheck: Sensor.sensorCheck,
      });
    }


    const deviceToken = await getDeviceToken(commercial_prop_id, userId);
    console.log(deviceToken)
    console.log("userId: " + userId);
    if (deviceToken) {

      const message = {
        notification: {
          title: "QR Doorman",
          body: "You have an incoming call",
        },
        android: {
          notification: {
            channelId: "1",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "res_ring.wav",
            },
          },
        },
        data: {
          page: "2222",
          call_id: randomString,
          // url: `${url}`,
          url: `${urlToSend}`,
          time: new Date().getTime().toString(),
          pcbId: pcbId
        },
        token: deviceToken,
      };

      FCM.send(message, function (err, resp) {
        if (err) {
          return res.status(500).send({
            message: err,
          });
        } else {
          return res.status(200).send({
            message: "Notification sent",
          });
        }
      });
    } else {
      return res.status(400).send({
        message: "This user is not authorized to open the door.",
      });
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(500); // Send a server error response
  }
};

const getDeviceToken = async (commercial_prop_id, userId) => {
  const url = `property/${commercial_prop_id}/commercialResidents/${userId}`;
  console.log(userId)
  console.log("url")
  const usersRef = admin.database().ref(url);
  const snapshot = await usersRef.once("value");
  const userData = snapshot.val();
  let deviceToken;
  if (userData && userData.deviceToken) {
    deviceToken = userData.deviceToken;
    console.log(deviceToken);
  } else {
    console.error("Device token not found in the data.");
  }

  return deviceToken;
};

// const getResidentialTokens = async (propId) => {
//   const url = `property/${propId}/Property Resident`;

//   // Retrieve user data
//   const usersRef = admin.database().ref(url);
//   const snapshot = await usersRef.once("value");
//   const userData = snapshot.val();

//   // Retrieve admin data
//   const adminUrl = `residential/${propId}`;
//   const adminRef = admin.database().ref(adminUrl);
//   const adminsnapshot = await adminRef.once("value");
//   const adminData = adminsnapshot.val();

//   const Sensor = await CheckSensorValue(adminData.pcbId);
//   let deviceTokens = [];
//   if (Sensor.status === 200) {
//     // Push admin's deviceToken if available
//     if (adminData) {
//       deviceTokens.push(adminData.deviceToken);
//     } else {
//       console.error("Admin data not found in the database.");
//     }

//     if (userData) {
//       const usersWithCallProperty = Object.values(userData).filter(
//         (user) => user.call === "1"
//       );
//       deviceTokens = deviceTokens.concat(
//         usersWithCallProperty.map((user) => user.deviceToken)
//       );
//     } else {
//       console.error("User data not found in the database.");
//     }
//     // console.log(deviceTokens)
//     // return deviceTokens;
//     return {
//       status: 200,
//       deviceTokens,
//       sensorCheck: true,
//     };
//   } else if (Sensor.status === 400) {
//     return {
//       status: 400,
//       deviceTokens,
//       sensorCheck: false,
//     };
//   }
// };



// const getResidentialTokens = async (propId) => {
//   const url = `property/${propId}/Property Resident`;

//   // Retrieve user data
//   const usersRef = admin.database().ref(url);
//   const snapshot = await usersRef.once("value");
//   const userData = snapshot.val();

//   let deviceTokens = [];

//   if (userData) {
//     // Extract device tokens from user data
//     deviceTokens = Object.values(userData)
//       .map((user) => user.deviceToken)
//       .filter((token) => token); // Filter out any empty or undefined tokens
//   } else {
//     console.error("User data not found in the database.");
//   }

//   return {
//     status: 200,
//     deviceTokens,
//   };
// };


const getResidentialTokens = async (propId) => {
  const url = `property/${propId}/Property Resident`;

  // Retrieve user data
  const usersRef = admin.database().ref(url);
  const snapshot = await usersRef.once("value");
  const userData = snapshot.val();

  let deviceTokens = [];

  if (userData) {
    // Extract device tokens from user data where isCallAllowed is true
    deviceTokens = Object.values(userData)
      .filter((user) => user.isCallAllowed) // Filter users with isCallAllowed === true
      .map((user) => user.deviceToken)
      .filter((token) => token); // Filter out any empty or undefined tokens
  } else {
    console.error("User data not found in the database.");
  }

  return {
    status: 200,
    deviceTokens,
  };
};



const CheckSensorValue = async (pcbId) => {
  console.log(pcbId);
  console.log(144);
  try {
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
    const pcbSnapshot = await PCBRef.once("value");
    const pcbData = pcbSnapshot.val();

    if (pcbData && pcbData.hasOwnProperty("sensor") && pcbData.sensor === "1") {
      return {
        status: 200,
        message: "Sensor is 1",
        sensorCheck: true,
      };
    } else {
      return {
        status: 400,
        message: "Sensor check failed",
        sensorCheck: false,
      };
    }
  } catch (error) {
    console.error(`Error updating door property for PCB ${pcbId}:`, error);
    return { status: 500, message: "Internal Server Error" };
  }
};

const CallForResidents = async (req, res, next) => {
  try {
    const { residentialPropertyId, pcbId } = req.body;
    const { randomString } = req.body;
    console.log(randomString)
    console.log(177);

    const propertiesRef = admin.database().ref(`/property/${residentialPropertyId}/Property Resident`);

    const propertiesSnapshot = await propertiesRef.once("value");
    const property = propertiesSnapshot.val();


    // Reference to Property Owner
    const propertyOwnerRef = admin.database().ref(`/property/${residentialPropertyId}/Property Owner`);
    const propertyOwnerSnapshot = await propertyOwnerRef.once("value");
    const propertyOwner = propertyOwnerSnapshot.val();
    // Extract the deviceToken if the propertyOwner object has keys
    let propertyOwnerToken = null;
    for (const key in propertyOwner) {
      if (propertyOwner.hasOwnProperty(key)) {
        const isCallAllowed = propertyOwner[key]?.isCallAllowed;
        if (isCallAllowed) {
          propertyOwnerToken = propertyOwner[key]?.deviceToken;
          break; // Exit loop after finding the first valid deviceToken
        }
      }
    }

    const sensorCheck = await getResidentialTokens(residentialPropertyId);

    console.log(propertyOwner, "the token of the property owner")




    const deviceTokens = sensorCheck.deviceTokens;
    if (propertyOwnerToken) {
      deviceTokens.push(propertyOwnerToken);
    }
    console.log(deviceTokens, "all tokens you are looking for ")

    if (sensorCheck.status === 400) {
      return res.status(sensorCheck.status).json({
        error: "Sensor false",
        sensorCheck: sensorCheck.sensorCheck,
      });
    }
    console.log(17);
    let i = 0;
    // console.log(deviceTokens);
    if (deviceTokens.length > 0) {
      for (const deviceToken of deviceTokens) {
        if (deviceToken !== undefined) {
          i++;
          console.log(deviceToken);
          const message = {
            notification: {
              title: "QR Doorman",
              body: "You have an incoming call",
            },
            android: {
              notification: {
                channelId: "1",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "res_ring.wav",
                },
              },
            },
            data: {
              page: "2222",
              url: `residential/${residentialPropertyId}`,
              call_id: randomString,
              time: new Date().getTime().toString(),
              pcbId: pcbId
            },
            token: deviceToken,
          };
          console.log(i);


          try {
            await new Promise((resolve, reject) => {
              FCM.send(message, function (err, resp) {
                if (err) {
                  console.error("Error sending notification:", err);
                  reject(err);
                } else {
                  console.log("Notification sent successfully");
                  resolve(resp);
                }
              });
            });
          } catch (error) {
            // Handle error for this deviceToken
            console.error(`Error sending notification for token ${deviceToken}:`, error);
          }
        }
      }
      return res.status(200).send({
        message: "Notifications sent",
      });
    } else {
      console.log(219);
      return res.status(400).send({
        message: "Device token not found or invalid",
      });
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
    return res.status(500).send({
      message: "Internal Server sasa",
    });
  }
};





const sendDoorPinNotification = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { pcbId, pinName } = req.body;

    // Fetch device token, first name, and last name from /users/${userId}
    const getUserData = async (userId) => {
      const url = `users/${userId}`;
      const usersRef = admin.database().ref(url);
      const snapshot = await usersRef.once("value");
      const userData = snapshot.val();

      if (userData) {
        const { deviceToken, firstName, lastName } = userData;
        if (!deviceToken) {
          console.error("Device token not found for user:", userId);
        }
        return { deviceToken, firstName, lastName };
      } else {
        console.error("User data not found for user:", userId);
        return { deviceToken: null, firstName: null, lastName: null };
      }
    };

    // Fetch device name from /PCB/${pcbId}
    const getDeviceName = async (pcbId) => {
      const pcbRef = admin.database().ref(`/PCB/${pcbId}`);
      const snapshot = await pcbRef.once("value");
      const pcbData = snapshot.val();

      if (pcbData && pcbData.deviceName) {
        return pcbData.deviceName;
      } else {
        console.error("Device name not found for PCB:", pcbId);
        return null;
      }
    };

    // Fetch user data (deviceToken, firstName, lastName)
    const { deviceToken, firstName, lastName } = await getUserData(userId);

    // Fetch device name
    const deviceName = await getDeviceName(pcbId);

    // Log the gathered data
    console.log("Device Token:", deviceToken);
    console.log("Device Name:", deviceName);
    console.log("First Name:", firstName);
    console.log("Last Name:", lastName);


    console.log("userId: " + userId);

    if (deviceToken) {

      const message = {
        notification: {
          title: "QR Doorman",
          body: `Visitor: ${pinName} has arrived to ${deviceName}`,
        },
        android: {
          notification: {
            channelId: "1",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "res_ring.wav",
            },
          },
        },
        data: {
          page: "2233",
          // message_id: randomString,
          // url: `${urlToSend}`,
          time: new Date().getTime().toString(),
          pcbId: pcbId
        },
        token: deviceToken,
      };

      FCM.send(message, function (err, resp) {
        if (err) {
          return res.status(500).send({
            message: err,
          });
        } else {
          return res.status(200).send({
            message: "Notification sent",
          });
        }
      });
    } else {
      return res.status(400).send({
        message: "This user is not authorized to open the door.",
      });
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(500); // Send a server error response
  }
};



module.exports = { sendPushNotification, CallForResidents, sendDoorPinNotification };
