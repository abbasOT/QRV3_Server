// scheduler.js
const stripe = require('stripe')('sk_test_51Ot7RbGviWnrTaHnQgDMTyyUkEqs24vHTCCijHd41B71y4x8GxXSOa2T0ReZUYIKRj7MUkpUuDAdipnYKfDXLYDg00qIVJId0u');

const cron = require("node-cron");
const admin = require("firebase-admin");
const db = admin.database();
const moment = require("moment-timezone");
// moment.tz.setDefault("Asia/Karachi");
moment.tz.setDefault("America/New_York");



function formatDate(date) {
  // Extract hours and minutes
  const hours = date.getHours();
  const minutes = date.getMinutes();
  // Determine AM or PM
  const ampm = hours >= 12 ? 'PM' : 'AM';
  // Convert 24-hour time to 12-hour time
  const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  // Format month, day, and year with leading zeros if needed
  const formattedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
  const formattedDay = date.getDate().toString().padStart(2, '0');
  const formattedYear = date.getFullYear();
  // Return formatted date and time string
  return `${formattedMonth}/${formattedDay}/${formattedYear}-${formattedHours}:${formattedMinutes} ${ampm}`;
}




const fetchDataFromPCB = async () => {
  const fieldRef = db.ref("/PCB");

  try {
    const snapshot = await fieldRef.once("value");
    const data = snapshot.val();

    if (data) {
      const currentTime = moment()
      const currentFormattedTime = currentTime.format("HH:mm");
      console.log(20)
      console.log(currentFormattedTime)
      // const currentHours = currentTime.getHours();
      // const currentMinutes = currentTime.getMinutes();
      // const currentFormattedTime = `${currentHours}:${currentMinutes}`;

      for (const pcbId in data) {
        if (data.hasOwnProperty(pcbId)) {
          const pcb = data[pcbId];

          // Check if pcb has ontime and offtime properties
          if (pcb.ontime && pcb.offtime) {
            const onTime = moment(pcb.ontime, "hh:mm a").format("HH:mm");
            const offTime = moment(pcb.offtime, "hh:mm a").format("HH:mm");
            const isTimeIn = await isTimeInRange(
              currentFormattedTime,
              onTime,
              offTime
            );

            console.log("time range is " + isTimeIn + " for " + pcbId)
            console.log(42)
            if (isTimeIn) {
              // If the current time is within the specified range, update light to 1
              if (pcb.light === "0") {

                await db.ref(`/PCB/${pcbId}/light`).set("1");
                // console.log("set 1 :" + pcbId);
              }
            } else {

              if (pcb.light === "1") {

                console.log("set 0 :" + pcbId);
                await db.ref(`/PCB/${pcbId}/light`).set("0");
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Handle errors
    console.error("Error fetching data from PCB:", error.message);
  }
};

const isTimeInRange = async (currentTime, startTime, endTime) => {
  console.log(currentTime + " " + startTime + " " + endTime)
  return (currentTime >= startTime && currentTime < endTime);
};

// Helper function to convert time to 24-hours format
const convertTimeTo24HoursFormat = async (time) => {
  const [timePart, period] = time.split(" ");
  const [hours, minutes] = timePart.split(":");

  let formattedHours = parseInt(hours, 10);

  // Convert to 24-hour format
  if (period.toUpperCase() === "PM" && formattedHours !== 12) {
    formattedHours += 12;
  } else if (period.toUpperCase() === "AM" && formattedHours === 12) {
    formattedHours = 0;
  }

  // Ensure two-digit formatting
  const formattedHoursString = formattedHours.toString().padStart(2, "0");
  const formattedMinutesString = minutes.padStart(2, "0");

  return `${formattedHoursString}:${formattedMinutesString}`;
};

// Helper function to check if current time is within a specified range


// Uncomment the line below if you want to test the function without cron
// fetchDataFromPCB();v   const date = new Date('2023-12-25T00:00:00');
// const timestamp = date.getTime();
// console.log(timestamp);

// const RemvoeAdminTpinsData = async () => {
//   try {
//     const usersRef = db.ref("/residential/users");
//     const snapshot = await usersRef.once("value");
//     const usersData = snapshot.val();

//     for (const userId in usersData) {
//       if (usersData.hasOwnProperty(userId)) {
//         const user = usersData[userId];

//         const TpinsData = user.Tpins;
//         if (user.Tpins) {
//           for (const key in TpinsData) {
//             if (TpinsData.hasOwnProperty(key)) {
//               const Tpin = TpinsData[key];

//               // 24 * 60 * 60 * 1000;
//               if (Tpin.timestamp) {
//                 const isOutdated =
//                   Tpin.daily === "1" &&
//                   Date.now() - Tpin.timestamp >= 1 * 60 * 1000;

//                 if (isOutdated) {
//                   // console.log(`Removing outdated Tpin at key ${key} for user ${userId}`);
//                   await usersRef.child(`${userId}/Tpins/${key}`).remove();
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Error processing Tpins:", error);
//   }
// };

// const removeUsersTpinsData = async () => {
//   try {
//     const usersRef = db.ref("/residential/users");
//     const snapshot = await usersRef.once("value");
//     const usersData = snapshot.val();
//     for (const userId in usersData) {
//       if (usersData.hasOwnProperty(userId)) {
//         const user = usersData[userId];

//         if (user.users) {
//           await removeOutdatedTpinsForUser(userId, user.users, usersRef);
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Error processing Tpins:", error);
//   }
// };

// async function removeOutdatedTpinsForUser(AdminuserId, usersData, usersRef) {
//   for (const userId in usersData) {
//     if (usersData.hasOwnProperty(userId)) {
//       const user = usersData[userId];
//       const TpinsData = user.Tpins;
//       for (const key in TpinsData) {
//         if (TpinsData.hasOwnProperty(key)) {
//           const Tpin = TpinsData[key];
//           if (Tpin.timestamp) {
//             const isOutdated =
//               Tpin.daily === "1" &&
//               Date.now() - Tpin.timestamp >= 1 * 60 * 1000;
//             if (isOutdated) {
//               // console.log(`Removing outdated Tpin at key ${key} for user ${userId} }`);
//               await usersRef
//                 .child(`${AdminuserId}/users/${userId}/Tpins/${key}`)
//                 .remove();
//             }
//           }
//         }
//       }
//     }
//   }
// }

const IncrementAscci = async () => {
  try {
    const asciiRef = admin.database().ref("/ascii");
    const snapshot = await asciiRef.once("value");
    let currentAscii = snapshot.val() || "AA";

    currentAscii = incrementAscii(currentAscii);
    console.log(currentAscii);
    await asciiRef.set(currentAscii);
  } catch (error) {
    console.error("Error generating ASCII:", error.message);
  }
};

function incrementAscii(ascii) {
  let firstChar = ascii[0];
  let secondChar = ascii[1];

  // Increment the second character
  if (secondChar === "Z") {
    secondChar = "A";

    // Increment the first character
    firstChar = String.fromCharCode(firstChar.charCodeAt(0) + 1);

    // Ensure the first character is a letter
    if (!/[A-Z]/.test(firstChar)) {
      // If it's not a letter, set it back to 'A'
      firstChar = "A";
    }
  } else {
    // Increment the second character normally
    secondChar = String.fromCharCode(secondChar.charCodeAt(0) + 1);
  }

  return firstChar + secondChar;
}


const deleteExpiredTempPins = async () => {
  const propertyRef = db.ref('property');
  try {
    const snapshot = await propertyRef.once('value');
    const properties = snapshot.val();

    const currentTime = Date.now();



    for (const propertyId in properties) {
      const property = properties[propertyId];

      ['Property Owner', 'Property Resident'].forEach((role) => {
        if (property[role]) {
          const residents = property[role];

          // console.log("all the residents ", residents)

          for (const residentId in residents) {
            const tempPins = residents[residentId].TempPins;



            if (tempPins) {
              for (const tempPinId in tempPins) {
                const tempPin = tempPins[tempPinId];

                if (tempPin.is24 && tempPin.createdAt) {
                  const createdAt = tempPin.createdAt;
                  const differenceInMinutes = (currentTime - createdAt) / (1000 * 60); // Convert difference to minutes

                  // Check if it's been more than 24 hours + 1 minute
                  if (differenceInMinutes >= (24 * 60) + 1) { // 24 hours * 60 minutes + 1 minute
                    // Delete the tempPin
                    db.ref(`property/${propertyId}/${role}/${residentId}/TempPins/${tempPinId}`).remove();
                    console.log(`Deleted TempPin ${tempPinId} for ${role} with ID ${residentId}`);
                  }
                }
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("Error deleting expired TempPins:", error.message);
  }
};


// const subscriptionCheckforEveryUser = async () => {
//   const now = Date.now();
//   const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;

//   try {
//     // Fetch all users from the /users node
//     const usersSnapshot = await db.ref('/users').once('value');
//     const users = usersSnapshot.val();

//     if (users) {
//       for (const userId in users) {
//         const user = users[userId];

//         // Check if the user's subscriptionDate is older than 30 days
//         if (user.subscriptionDate && (now - user.subscriptionDate) > thirtyDaysInMillis) {
//           // Fetch the property node
//           const userRef = db.ref(`users/${userId}`)
//           await userRef.update({
//             isSubscriptionCancelled: "true"
//           });
//           const propertySnapshot = await db.ref('/property').once('value');
//           const properties = propertySnapshot.val();

//           if (properties) {
//             for (const propertyId in properties) {
//               const property = properties[propertyId];

//               // Check if the user ID is present in any of the child nodes
//               const childNodes = ['Property Owner', 'Property Resident', 'commercialResidents'];
//               for (const node of childNodes) {
//                 if (property[node] && property[node][userId]) {
//                   // Update the isSubscriptionCancelled key to "true"
//                   const updateRef = db.ref(`/property/${propertyId}/${node}/${userId}`);
//                   await updateRef.update({
//                     isSubscriptionCancelled: "true"
//                   });
//                   console.log(`Updated isSubscriptionCancelled to true for user ${userId} in property ${propertyId}`);
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error in subscriptionCheckforEveryUser:', error);
//   }
// }



cron.schedule("* * * * *", () => {
  fetchDataFromPCB();
});

let i = 0;

cron.schedule('*/5 * * * *', () => {
  console.log('Running deleteExpiredTempPins task every 5 minutes');
  deleteExpiredTempPins();
});


// cron.schedule('*/30 * * * * *', () => {
//   console.log('Running autopayment of users every 10 seconds');
//   createSubscriptionsForAllUsers();
// });




function makeid(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

// function generateAlphabeticSeries() {
//   const series = [];

//   for (let i = 65; i <= 90; i++) {  // ASCII codes for A-Z
//     for (let j = 65; j <= 90; j++) {
//       const combination = String.fromCharCode(i) + String.fromCharCode(j);
//       series.push({ combination, asciiCode: i * 100 + j });
//     }
//   }

//   return series;
// }

// const alphabetSeries = generateAlphabeticSeries();
// console.log(alphabetSeries);



// Replace these with your actual Price IDs
// const priceIdA = 'price_1Pt596GviWnrTaHnuh55l1Qx'; // Product A
// const priceIdB = 'price_1Pt5EvGviWnrTaHnNJkmHJXH'; // Product B

// // Step 1: Create a Subscription with Metered Billing and Initial Quantities
// async function createSubscriptionWithMeteredBilling(customerId, priceIdA, quantityA, priceIdB, quantityB) {
//   const subscription = await stripe.subscriptions.create({
//     customer: customerId,
//     items: [
//       { price: priceIdA, quantity: quantityA }, // Product A with initial quantity
//       { price: priceIdB, quantity: quantityB }, // Product B with initial quantity
//     ],
//     expand: ['latest_invoice.payment_intent'],
//   });
//   return subscription;
// }

// // Step 2: Calculate Quantities for Each User
// async function calculateQuantitiesForUser(userId) {
//   const propertySnapshot = await db.ref('/property').once('value');
//   const properties = propertySnapshot.val();

//   let quantityA = 0;
//   let quantityB = 0;

//   if (properties) {
//     for (const propertyId in properties) {
//       const property = properties[propertyId];

//       // Count occurrences in 'Property Owner'
//       if (property['Property Owner'] && property['Property Owner'][userId]) {
//         quantityA++;
//       }

//       // Count occurrences in 'commercialResidents'
//       if (property['commercialResidents'] && property['commercialResidents'][userId]) {
//         quantityB++;
//       }
//     }
//   }

//   return { quantityA, quantityB };
// }

// Step 3: Record Usage for Each Product
async function recordUsage(subscriptionItemIdA, subscriptionItemIdB, quantityA, quantityB) {
  if (subscriptionItemIdA) {
    await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemIdA,
      {
        quantity: quantityA,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'set',
      }
    );
  }

  if (subscriptionItemIdB) {
    await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemIdB,
      {
        quantity: quantityB,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'set',
      }
    );
  }
}
// Replace these with your actual Price IDs
// const priceIdA = 'price_1Pt596GviWnrTaHnuh55l1Qx'; 
const priceIdA = 'price_1Q5KFwGviWnrTaHn2grywNpD';
const priceIdB = 'price_1Pt5EvGviWnrTaHnNJkmHJXH'; // Product B (Metered)
const propertyOwnerAmount = 9.99;
const commercialResidentAmount = 3.99;


// Step 1: Create a Subscription with Metered Billing and Initial Quantities
async function createSubscriptionWithMeteredBilling(customerId, priceIdA, quantityA, priceIdB, quantityB) {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      { price: priceIdA, quantity: quantityA }, // Product A with initial quantity
      { price: priceIdB, quantity: quantityB }, // Product B with initial quantity
    ],
    expand: ['latest_invoice.payment_intent'],
  });
  return subscription;
}

// Step 2: Calculate Quantities for Each User
async function calculateQuantitiesForUser(userId) {
  const propertySnapshot = await db.ref('/property').once('value');
  const properties = propertySnapshot.val();

  let quantityA = 0;
  let quantityB = 0;

  if (properties) {
    for (const propertyId in properties) {
      const property = properties[propertyId];

      // Count occurrences in 'Property Owner'
      if (property['Property Owner'] && property['Property Owner'][userId]) {
        quantityA++;
      }

      // Count occurrences in 'commercialResidents'
      if (property['commercialResidents'] && property['commercialResidents'][userId]) {
        quantityB++;
      }
    }
  }

  return { quantityA, quantityB };
}

async function updatePaymentForUser({ userId, status }) {
  const propertySnapshot = await db.ref('/property').once('value');
  const properties = propertySnapshot.val();

  // Prepare the update object for users/${userId}
  let userUpdates = {};
  if (status === 'f') {
    userUpdates = { isSubscriptionCancelled: "true" };
  } else if (status === 'p') {
    userUpdates = { isSubscriptionCancelled: "false" };
  }

  // Update the users/${userId} node
  await db.ref(`/users/${userId}`).update(userUpdates);

  if (properties) {
    for (const propertyId in properties) {
      const property = properties[propertyId];

      // Prepare the update object for Property Owner and commercialResidents
      let propertyUpdates = {};
      if (status === 'f') {
        propertyUpdates = {
          isSubscriptionCancelled: "true",
          paymentStatus: "Pending"
        };
      } else if (status === 'p') {
        propertyUpdates = {
          isSubscriptionCancelled: "false",
          paymentStatus: "done"
        };
      }

      // Update the 'Property Owner' node if userId exists
      if (property['Property Owner'] && property['Property Owner'][userId]) {
        await db.ref(`/property/${propertyId}/Property Owner/${userId}`).update(propertyUpdates);
      }

      // Update the 'commercialResidents' node if userId exists
      if (property['commercialResidents'] && property['commercialResidents'][userId]) {
        await db.ref(`/property/${propertyId}/commercialResidents/${userId}`).update(propertyUpdates);
      }
    }
  }
}



// Step 4: Automate Usage Recording and Payment Processing Based on Subscription Date
cron.schedule('*/30 * * * * *', async () => { // Runs every 10 seconds
  console.log('Running autopayment of users every 50 seconds');

  try {
    const usersSnapshot = await db.ref('/users').once('value');
    const users = usersSnapshot.val();
    const currentDate = new Date();

    if (users) {
      for (const userId in users) {
        const user = users[userId];

        if (user.customerID && user.subscriptionDate) {

          // const subscriptionDate = new Date(user.subscriptionDate);

          const paymentDate = new Date(user.nextPayment);
          const paymentPlan = user.paymentPlan;
          const subscriptionDate = new Date(user.subscriptionDate);

          // console.log(currentDate.getTime())
          // Extract and format the date parts (YYYY-MM-DD) as strings
          const paymentDateString = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDate.getDate()).padStart(2, '0')}`;
          const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          const subscriptionDateString = `${subscriptionDate.getFullYear()}-${String(subscriptionDate.getMonth() + 1).padStart(2, '0')}-${String(subscriptionDate.getDate()).padStart(2, '0')}`;

          // Compare the two formatted date strings
          const isSameDate = paymentDateString === currentDateString;

          console.log(paymentPlan, subscriptionDateString, paymentDateString, currentDateString, userId, "status of user for payments", isSameDate);

          // Process only if 30 days have passed since the subscription date
          if (isSameDate) {

            const { quantityA, quantityB } = await calculateQuantitiesForUser(userId);

            await updatePaymentForUser({ userId: userId, status: 'f' });

            // Create subscription for each user with initial quantities
            const subscription = await createSubscriptionWithMeteredBilling(user.customerID, priceIdA, quantityA, priceIdB, quantityB);
            console.log(`Subscription created for user ${userId}:`, subscription);

            const totalAmount = (quantityA * propertyOwnerAmount) + (quantityB * commercialResidentAmount);

            // Record usage for each metered subscription item
            for (const item of subscription.items.data) {
              if (item.price.type === 'metered') {
                if (item.price.id === priceIdA) {
                  await recordUsage(item.id, quantityA);
                  // totalAmount += quantityA * propertyOwnerAmount;
                } else if (item.price.id === priceIdB) {
                  await recordUsage(item.id, quantityB);
                  // totalAmount += quantityB * commercialResidentAmount;
                }
              }
            }

            // Process payment for the current month
            const invoice = await stripe.invoices.create({
              customer: user.customerID,
              auto_advance: true, // Auto-finalize invoice
              collection_method: 'charge_automatically',
              subscription: subscription.id
            });

            console.log(`Invoice created for user ${userId}:`, invoice);

            // Update subscription date to the next payment cycle
            let nextPaymentDate;
            const subscriptionPaymentDate = new Date(currentDate);

            if (paymentPlan === "Yearly") {
              // Add 1 year to the subscriptionDate
              nextPaymentDate = new Date(subscriptionPaymentDate.setFullYear(subscriptionPaymentDate.getFullYear() + 1)).getTime();
            } else {
              // Add 30 days to the subscriptionDate
              nextPaymentDate = new Date(subscriptionPaymentDate.setDate(subscriptionPaymentDate.getDate() + 30)).getTime();
            }
            const todayDate = new Date().getTime();
            await db.ref(`/users/${userId}`).update({
              nextPayment: nextPaymentDate,
              subscriptionDate: todayDate
            });

            // Record payment details
            const formattedDate = formatDate(new Date());
            await db.ref(`/payments/${userId}`).push({
              amount: totalAmount,
              date: formattedDate, // format: 08/28/2024-09:45 PM
              status: "Success"
            });
            await updatePaymentForUser({ userId: userId, status: 'p' });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error automating usage recording and payment processing:', error);
  }
});


// // Step 5: Function to Create Subscriptions for All Users (for testing)
// async function createSubscriptionsForAllUsers() {
//   try {
//     const usersSnapshot = await db.ref('/users').once('value');
//     const users = usersSnapshot.val();

//     if (users) {
//       for (const userId in users) {
//         const user = users[userId];
//         if (user.customerID) {
//           const { quantityA, quantityB } = await calculateQuantitiesForUser(userId);

//           // Create subscription for each user with initial quantities
//           const subscription = await createSubscriptionWithMeteredBilling(user.customerID, priceIdA, quantityA, priceIdB, quantityB);
//           console.log(`Subscription created for user ${userId}:`, subscription);

//           // Set initial subscription date
//           await db.ref(`/users/${userId}`).update({
//             subscriptionDate: new Date().getTime()
//           });
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error creating subscriptions for all users:', error);
//   }
// }

// Uncomment to test creating subscriptions for all users



