const admin = require("firebase-admin");
const asciiHelper = require("../common/asciiHelper");
const fs = require("fs");
const PDFDocument = require("pdfkit-table");
const { sendEmailWithAttachment } = require("../util/SendEmail");

function incrementAscii(ascii) {
  const nextAscii = parseInt(ascii, 36) + 1;
  return nextAscii.toString(36).toUpperCase();
}

// if (Object.keys(pinsData).length === 1) {
//   const asciiRef = admin.database().ref('/ascii');
//   const snapshot2 = await asciiRef.once('value');
//   currentAscii = snapshot2.val() || 'AA';
//   currentAscii = incrementAscii(currentAscii);
//   await asciiRef.set(currentAscii);
// }else{
//   console.log(pinData.PinCode.substring(0, 2))
//   currentAscii = pinData.PinCode.substring(0, 2);
// }

const signup = async (req, res) => {
  try {
    const { name, lastName, address, phoneNumber, email, password, propertyName, propertyEmail } = req.body;

    console.log(name, lastName, address, phoneNumber, email, password, propertyName, propertyEmail);
    // Check if the email already exists
    const commercialSnapshot = await admin.database().ref("/commercial").once("value");
    // const usersSnapshot = await admin.database().ref("/users").once("value");
    let emailExists = false;
    let propertyEmailExists = false;

    commercialSnapshot.forEach((userSnapshot) => {
      const userData = userSnapshot.val();

      if (userData.email === email) {
        emailExists = true;
        return true; // Stop iteration if email is found
      }

      if (userData.propertyEmail === propertyEmail) {
        propertyEmailExists = true;
        return true; // Stop iteration if propertyEmail is found
      }
    });

    // usersSnapshot.forEach((userSnapshot) => {
    //   const userData = userSnapshot.val();
    //   if (userData.email === email) {
    //     emailExists = true;
    //     return true; // Stop iteration if email is found
    //   }
    // })

    if (emailExists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    if (propertyEmailExists) {
      return res.status(400).json({ error: "Property email already exists" });
    }


    const newUserRef = admin.database().ref("/commercial").push();
    const firebaseGeneratedKey = newUserRef.key;
    const prefixedKey = "commercial" + firebaseGeneratedKey;


    let currentAscii = "AA";
    const asciiRef = admin.database().ref("/ascii");
    const snapshot2 = await asciiRef.once("value");
    currentAscii = snapshot2.val() || "AA";


    const prefixedUserData = {
      [prefixedKey]: {
        name,
        lastName,
        address,
        phoneNumber,
        email,
        password,
        propertyName,
        propertyEmail,
        id: prefixedKey,
        status: "inactive",
        SC: currentAscii,
        usercount: "0",
        WelcomMessage: "QR DoorMan"
      },
    };


    // Create the data object for the users ref
    // const dataSendForUser = {
    //   [AuthId]: {
    //     isSubscriptionCancelled: "false",
    //     firstName: name,
    //     phone: phoneNumber,
    //     cardType: "",
    //     deviceToken: "",
    //     isLoggedIn: false,
    //     last4: "",
    //     lastName,
    //     address,
    //     email,
    //     pass: password,
    //     uid: AuthId,
    //     specialChar: currentAscii,
    //     confirmEmail: email,
    //     confirmPass: password,
    //     customerID: "",
    //   }
    // };


    await admin.database().ref("/commercial").update(prefixedUserData);
    // await admin.database().ref("/users").update(dataSendForUser);
    currentAscii = incrementAscii(currentAscii);
    await asciiRef.set(currentAscii);

    res.status(201).json({ message: "Signup successful", userId: prefixedKey });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(password);
    // Retrieve user data from /commercialAdmin based on the provided email
    const snapshot = await admin
      .database()
      .ref("/commercial")
      .orderByChild("propertyEmail")
      .equalTo(email)
      .once("value");
    const userData = snapshot.val();

    if (!userData) {
      // If no user with the provided email is found, return an error
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if the provided password matches the stored password
    const userKey = Object.keys(userData)[0]; // Get the dynamically generated key
    const user = userData[userKey]; // Get the user data using the key

    if (!user || user.password !== password) {
      // If no user with the provided email is found or password doesn't match, return an error
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If email and password match, consider it a successful login
    res
      .status(200)
      .json({ message: "Login successful", user, userKey, userData: user });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// const changePassword = async (req, res) => {
//   try {
//     const { com_prop_id } = req.params;
//     const { oldpassword, newpassword, propertyId } = req.body;


//     // Check if the user ID and old password are provided
//     if (!com_prop_id || !oldpassword) {
//       return res
//         .status(400)
//         .json({ error: "User ID and old password are required" });
//     }

//     // Retrieve user data from the database based on the user ID
//     const userRef = admin.database().ref(`/commercial/${com_prop_id}`);
//     const usersComRef = admin.database().ref(`/users/${com_prop_id}`);
//     const commercialAdminRef = admin.database().ref(`/property/${propertyId}/commercialAdmin`);

//     const userSnapshot = await userRef.once("value");

//     // Check if the user exists
//     if (!userSnapshot.exists()) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const userData = userSnapshot.val();

//     // Check if the old password matches the stored password
//     if (userData.password !== oldpassword) {
//       return res.status(401).json({ error: "Old password is incorrect" });
//     }

//     // Update the user's password with the new password
//     await userRef.update({ password: newpassword });
//     await usersComRef.update({ password: newpassword });
//     await commercialAdminRef.update({ password: newpassword });

//     res.status(200).json({ message: "Password changed successfully" });
//   } catch (error) {
//     console.error("Error in changing password:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

const changePassword = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { oldpassword, newpassword, propertyId } = req.body;

    // Extract the authId by removing "commercial" prefix from com_prop_id
    const authId = com_prop_id.replace('commercial', '');

    // Check if the user ID and old password are provided
    if (!authId || !oldpassword) {
      return res
        .status(400)
        .json({ error: "User ID and old password are required" });
    }

    // Retrieve user data from the database based on the user ID
    const userRef = admin.database().ref(`/commercial/${com_prop_id}`);
    // const usersComRef = admin.database().ref(`/users/${authId}`);
    const commercialAdminRef = admin.database().ref(`/property/${propertyId}/commercialAdmin`);

    const userSnapshot = await userRef.once("value");

    // Check if the user exists
    if (!userSnapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userSnapshot.val();

    // Check if the old password matches the stored password
    if (userData.password !== oldpassword) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    // Update the user's password with the new password in all specified nodes
    await userRef.update({ password: newpassword });
    // await usersComRef.update({ pass: newpassword, confirmPass: newpassword });
    await commercialAdminRef.update({ password: newpassword });

    // Update the password in Firebase Authentication
    // await admin.auth().updateUser(authId, { password: newpassword });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error in changing password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};













const GetComAdmin = async (req, res) => {
  try {
    const { com_prop_id } = req.params;

    // Assuming you have a reference to your database
    const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);

    // Fetch data from the database
    const snapshot = await commercialRef.once("value");
    const data = snapshot.val();
    const residentsRef = admin
      .database()
      .ref(`/commercial/users/${com_prop_id}/users`);

    // Fetch data from the database
    const snapshot2 = await residentsRef.once("value");
    const residentsData = snapshot2.val();
    let AdminData = [];
    AdminData = {
      userId: {
        name: data.name,
        lname: data.lastName,
        userId: data.id,
      },
    };

    res.status(200).json({ commercialAdmin: data, residentsData, AdminData });
  } catch (error) {
    console.error("Error in fetching residents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//find Property

const findProperty = async (req, res) => {
  const { com_prop_id } = req.params;
  const { PropertyId } = req.body;
  console.log(com_prop_id);
  console.log(PropertyId);
  try {
    // Get the property data from the StandByProperties node
    const standByPropertiesRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties/${PropertyId}`);
    const snapshot = await standByPropertiesRef.once("value");

    // Check if the property exists in StandByProperties
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Property not found by given id" });
    }

    const propertyData = snapshot.val();

    // Remove the property from StandByProperties
    await standByPropertiesRef.remove();

    // Update the status to "active" and save in the commercial node
    const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const snapshotExsiting = await commercialRef.once("value");
    const existingData = snapshotExsiting.val();

    const date = Date.now()




    // Create a new node with the commercial user in the new reference
    const newCommercialAdminRef = admin.database().ref(`/property/${PropertyId}/commercialAdmin`);
    const newData = {
      ...existingData,
      ...propertyData,
      date: `${date}`,
      status: "active",
    };

    await newCommercialAdminRef.set(newData);
    await commercialRef.set(newData);

    // await commercialRef.remove();



    // Respond with success
    res.status(200).json({
      message: "Property assigned successfully",
    });
  } catch (error) {
    console.error("Error moving property:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// const AddResidents = async (req, res) => {
//   const residentsRef = admin.database().ref(`/commercial/waitingusers`);
//   // const { com_prop_id } = req.params;
//   const { email, name, lname, address, phone, commercial_prop_id } = req.body;
//   const adminRef = admin.database().ref(`/commercial/${commercial_prop_id}`);
//   const snapshot = await adminRef.once("value");
//   const adminData = snapshot.val();

//   console.log(name)
//   console.log(231)
//   console.log(lname)
//   try {
//     // Fetch all users from waiting users
//     const snapshot = await residentsRef.once("value");
//     const allUsers = snapshot.val();

//     let matchingUser;
//     let userId;

//     // Iterate through all users to find the matching one
//     for (const [key, user] of Object.entries(allUsers)) {
//       if (user.email.trim() === email.trim() && user.firstName.trim() === name.trim() && user.lastName.trim() === lname.trim()) {
//         user.userId = key;
//         user.status = "suspended";
//         console.log(user);
//         matchingUser = user;
//         userId = key;
//         break;
//       }
//     }

//     if (!matchingUser) {
//       return res.status(404).json({ error: "User not found" });
//     } else {
//       sendEmailWithAttachment(matchingUser.email);
//     }

//     const prefixedKey = userId;
//     const newUsersRef = admin
//       .database()
//       .ref(`/commercial/users/${commercial_prop_id}/users`);
//     const newUserNode = {};
//     console.log(259 + adminData.propertyId);
//     matchingUser.propertyId = adminData.propertyId;
//     newUserNode[prefixedKey] = matchingUser;
//     await newUsersRef.update(newUserNode);

//     if (adminData && adminData.usercount !== undefined) {
//       // Increment the usercount property
//       adminData.usercount++;

//       // Update the value in the database
//       adminRef.update({ usercount: adminData.usercount });
//     } else {
//       // Handle the case where adminData or usercount doesn't exist as expected
//       console.error("Invalid data structure or missing usercount property");
//     }

//     // Remove the user from the old location
//     await residentsRef.child(userId).remove();

//     const snapshot1 = await newUsersRef.once("value");
//     const residentsData = snapshot1.val();

//     res.status(200).json({ residents: residentsData });
//   } catch (error) {
//     console.error("Error in adding resident:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


const AddResidents = async (req, res) => {
  const { email, name, lname, commercial_prop_id, commercialId, } = req.body;
  const { com_prop_id } = req.params

  // Replace @ and . with _ and , respectively
  const sanitizedEmail = email.replace(/[@.]/g, (match) => (match === '@' ? '_' : ','));

  try {
    // Reference to the waiting_residents node
    const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const commercialSnapshot = await commercialRef.once('value');
    const commercialData = commercialSnapshot.val();
    const commercialAdminEmail = commercialData.email;

    const minUserLicense = parseInt(commercialData?.minUserLicense, 10) || 10;



    const commercialAdminRef = admin.database().ref(`property/${commercial_prop_id}/commercialAdmin`);
    const commercialResidentsRef = admin.database().ref(`property/${commercial_prop_id}/commercialResidents`);
    // const intercomRef = admin.database().ref(`property/${commercial_prop_id}/intercoms`)
    const commercialResidentsSnapshot = await commercialResidentsRef.once('value');
    const residentCount = commercialResidentsSnapshot.numChildren();

    // Check if the current number of residents is below the minUserLicense
    if (residentCount >= minUserLicense) {
      return res.status(400).json({ error: "User limit reached. Cannot add more residents." });
    }

    // Check if the email exists in the users node
    const usersSnapshot = await admin.database().ref('users').once('value');
    const usersData = usersSnapshot.val();

    // Flag to track if the email exists in the users node
    let emailExistsInUsers = false;
    // let isCommercialEmail = false;
    let FirstName = false;
    let LastName = false;

    // Iterate through users to find a matching email or propertyEmail
    for (const userId in usersData) {
      const user = usersData[userId];
      // Check if the email exists in this user's data
      const emailMatch = user.email === email || (user.propertyEmail && user.propertyEmail === email);
      const firstName = user.firstName === name;
      const lastName = user.lastName === lname;

      if (emailMatch && firstName && lastName) {
        emailExistsInUsers = true;
        FirstName = true;
        LastName = true;
        // No need to continue if we've already found the relevant data
        break;
      }
    }

    // // Check if the email exists in commercialAdmin
    // if (commercialAdminEmail === email) {
    //   isCommercialEmail = true;
    // }


    // Check if the email exists in commercialResidents
    let emailExistsInCommercialResidents = false;
    commercialResidentsSnapshot.forEach((residentSnapshot) => {
      const residentData = residentSnapshot.val();
      if (residentData.email === email) {
        emailExistsInCommercialResidents = true;
        return true;  // This breaks out of the forEach loop
      }
    });

    // Decision conditions
    if (!emailExistsInUsers && !FirstName && !LastName) {
      return res.status(404).json({ error: "Account does not exist with this data" });
    }

    // if (isCommercialEmail) {
    //   return res.status(400).json({ error: "Cannot add resident: Email belongs to a commercial Admin." });
    // }

    if (emailExistsInCommercialResidents) {
      return res.status(400).json({ error: "Cannot add resident: Email already exists in commercial residents." });
    }



    const AdminSnapshot = await commercialAdminRef.once('value');
    const AdminData = AdminSnapshot.val();



    const AdminPhoneNumber = AdminData.phoneNumber;
    const AdminPropertyName = AdminData.propertyName;

    // Initialize variables to store phone and address
    let phone = null;
    let address = null;

    // Loop through each user in the 'users' node
    for (const userId in usersData) {
      // Skip users whose IDs start with 'commercial'
      // if (userId.startsWith('commercial')) continue;

      const userData = usersData[userId];

      // Check if the email matches the email in the req.body
      if (userData.email === email) {
        // Set the phone and address if email matches
        phone = userData.phone;
        address = userData.address;
        firstName = userData.firstName;
        lastName = userData.lastName;
        break; // Exit the loop since we found the match
      }
    }


    const intercomRef = admin.database().ref(`property/${commercial_prop_id}/intercoms`)

    let applayout1 = "";
    let applayout2 = "";

    // Check if intercomRef exists
    const intercomSnapshot = await intercomRef.once('value');
    const snapshot = intercomSnapshot.val();
    if (snapshot) {
      const intercomKeys = Object.keys(snapshot);
      console.log(intercomKeys, "1111111111111111")
      // Ensure there are at most two intercoms
      if (intercomKeys.length <= 2) {
        intercomKeys.forEach(key => {
          const intercom = snapshot[key];
          const intercomNo = intercom.IntercomNo;
          const appLayout = intercom.appLayout;

          console.log(intercomNo, appLayout, "22222222222222")

          // Assign appLayout values to newResidentData based on IntercomNo
          if (intercomNo === "1") {
            applayout1 = appLayout;
          } else if (intercomNo === "2") {
            applayout2 = appLayout;
          }
        });
      } else {
        console.error('More than two intercoms found');
      }
    } else {
      console.log('No intercoms found');
    }

    console.log(applayout1, applayout2, "the applayout values i want to send")

    // Prepare the data to be saved
    const newResidentData = {
      email,
      firstName,
      lastName,
      address,
      phone,
      commercial_prop_id,
      suspendResident: "false",
      AdminPhoneNumber: AdminPhoneNumber,
      propertyName: AdminPropertyName,
      userID: sanitizedEmail,
      paymentStatus: "Pending",
      applayout1: applayout1 || "",
      applayout2: applayout2 || "",

    };


    // Save the new resident data to the node with the sanitized email as the key
    await commercialResidentsRef.child(sanitizedEmail).set(newResidentData);

    // Fetch the newly added data to return in the response
    const newSnapshot = await commercialResidentsRef.child(sanitizedEmail).once('value');
    const addedResident = newSnapshot.val();



    // Send success response with the newly added resident data
    res.status(200).json({ resident: addedResident });
  } catch (error) {
    console.error("Error in adding resident:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};







const GetResidents = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { commercial_prop_id } = req.query;

    // Assuming you have a reference to your database
    const residentsRef = admin
      .database()
      .ref(`/property/${commercial_prop_id}/commercialResidents`);

    // Fetch data from the database
    const snapshot = await residentsRef.once("value");
    const residentsData = snapshot.val();
    res.status(200).json({ residents: residentsData });
  } catch (error) {
    console.error("Error in fetching residents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const DeleteResident = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { userId } = req.params;
    const { propertyId } = req.query;

    // Reference to the specific pin to delete
    const residentRef = admin
      .database()
      .ref(`/property/${propertyId}/commercialResidents/${userId}`);

    residentRef.remove();



    // Respond with a success message and all remaining pins
    res.status(200).json({
      message: "resident deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleting resident:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
//  moveUserToWaitingUsers

const moveUserToWaitingUsers = async (propType, userId, userData) => {


  try {
    if (userData.login !== 0) {
      userData.login = "0";
    }
    if (userData.payment !== null) {
      userData.payment = ""
    }
    if (userData.payments) {
      delete userData.payments
    }



    // Reference to the waiting users location
    const waitingUsersRef = admin
      .database()
      .ref(`/${propType}/waitingusers/${userId}`);

    // Write user data to waiting users location
    await waitingUsersRef.set(userData);

    return { success: true };
  } catch (error) {
    console.error("Error moving user to waiting users:", error);
    throw error;
  }
};
//

const UpdateResident = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { userId } = req.params;
    const { propertyId, actionType } = req.body;
    const { commercialResidentId } = req.body
    console.log(com_prop_id, userId, commercialResidentId, propertyId);

    // Reference to the specific pin to update
    const residentRef = admin.database().ref(`/property/${propertyId}/commercialResidents/${commercialResidentId}`);
    const userRef = admin.database().ref(`/users/${commercialResidentId}`)

    // Fetch the current data of the resident
    const residentSnapshot = await residentRef.once("value");
    const residentData = residentSnapshot.val();

    // Update the pin
    if (actionType === "suspend") {
      if (residentData && residentData.isFavourite === true) {
        // If 'favourite' is true, update the userRef 'favourite' field to an empty string
        await userRef.update({
          favourite: "",
        });

        // Also update the residentRef 'favourite' field to false
        await residentRef.update({
          isFavourite: false,
        });
      }
      await residentRef.update({
        suspendResident: "true",
      });
    }
    else {
      await residentRef.update({
        suspendResident: "false",
      });
    }

    // Respond with a success message and all updated pins
    res.status(200).json({
      message: "Resident updated successfully",
    });
  } catch (error) {
    console.error("Error in updating pin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//pins

// let currentAscii = snapshot.val() || 'AA';

// Increment the ASCII value (e.g., AA -> AB, ZZ -> AAA)
// currentAscii = incrementAscii(currentAscii);

// Save the updated ASCII value back to the database
// await asciiRef.set(currentAscii);

const AddPins = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { PinCode, PinCodeName, propertyId } = req.body;
    console.log(com_prop_id)
    // Save the pin in the specified reference
    const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const snapshotExsiting = await commercialRef.once("value");
    const existingData = snapshotExsiting.val();
    const firstName = existingData.name;
    const lastName = existingData.lastName;

    const pinsRef = admin
      .database()
      .ref(`/property/${propertyId}/AdminPins`);

    const PinsSnapshot = await pinsRef.once('value');
    const pins = PinsSnapshot.val();


    if (pins) {

      const pinExists = Object.values(pins).some(pinCode => pinCode.pin === PinCode);
      if (pinExists) {
        return res.status(400).json({ message: 'Pin code already exists' });
      }
    }
    console.log(pins)

    // Check if any pin code matches the provided PinCode


    const newPinRef = pinsRef.push();
    const newPinId = newPinRef.key;

    const pinData = {
      pin: PinCode,
      name: PinCodeName,
      pinId: newPinId,
      createdBy: `${firstName} ${lastName}`

    };

    await newPinRef.set(pinData);

    // Fetch all pins from the reference
    const snapshot = await pinsRef.once("value");
    const pinsData = snapshot.val();
    let currentAscii;

    console.log(Object.keys(pinsData).length);

    res.status(201).json({
      message: "Pin created successfully",
      pins: pinsData,
      pinId: newPinRef.key,
      ascii: currentAscii,
    });






    // if (Object.keys(pinsData).length === 1) {
    //   const asciiRef = admin.database().ref('/ascii');
    //   const snapshot2 = await asciiRef.once('value');
    //   currentAscii = snapshot2.val() || 'AA';
    //   currentAscii = incrementAscii(currentAscii);
    //   await asciiRef.set(currentAscii);
    // }else{
    //   console.log(pinData.PinCode.substring(0, 2))
    //   currentAscii = pinData.PinCode.substring(0, 2);
    // }

    // Update the ASCII value (e.g., AA -> AB, ZZ -> AAA)

  } catch (error) {
    console.error("Error in adding pin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const GetPins = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { propertyId } = req.query;

    const PinsRef = admin
      .database()
      .ref(`/property/${propertyId}/AdminPins`);

    const SCRef = admin.database().ref(`/commercial/${com_prop_id}`);

    const snapshot2 = await SCRef.once("value");
    const SCData = snapshot2.val();
    console.log(SCData.SC);

    // Fetch data from the database
    const snapshot = await PinsRef.once("value");
    const pinsData = snapshot.val();

    res.status(200).json({
      pins: pinsData,
      message: "Pin retrieved successfully",
      SC: SCData.SC,
    });
  } catch (error) {
    console.error("Error in fetching pinsCode:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const DeletePins = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { pinId } = req.params;
    const { propertyId } = req.query;

    console.log(pinId, propertyId, "the data for the delete pin")

    // Reference to the specific pin to delete
    const pinRef = admin
      .database()
      .ref(`/property/${propertyId}/AdminPins/${pinId}`);

    // Check if the pin exists
    const pinSnapshot = await pinRef.once("value");
    if (!pinSnapshot.exists()) {
      return res.status(404).json({ error: "Pin not found" });
    }

    // Delete the pin
    await pinRef.remove();

    // Fetch all remaining pins from the reference
    const remainingPinsSnapshot = await pinRef.parent.once("value");
    const remainingPinsData = remainingPinsSnapshot.val();

    // Respond with a success message and all remaining pins
    res.status(200).json({
      message: "Pin deleted successfully",
      remainingPins: remainingPinsData,
    });
  } catch (error) {
    console.error("Error in deleting pin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const UpdatePins = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { pinId } = req.params;
    console.log(pinId);
    const { pinCode, pinCodeName, propertyId } = req.body;
    // Reference to the specific pin to update
    const pinRef = admin
      .database()
      .ref(`/property/${propertyId}/AdminPins/${pinId}`);

    // Check if the pin exists
    const pinSnapshot = await pinRef.once("value");
    if (!pinSnapshot.exists()) {
      return res.status(404).json({ error: "Pin not found" });
    }

    // Reference to all pins in AdminPins
    const allPinsRef = admin
      .database()
      .ref(`/property/${propertyId}/AdminPins`);

    // Fetch all pins
    const allPinsSnapshot = await allPinsRef.once("value");
    const allPinsData = allPinsSnapshot.val();

    // Check if the updated pin code already exists in other pins
    const pinExists = Object.values(allPinsData).some(
      (pin) => pin.pin === pinCode
    );

    if (pinExists) {
      return res.status(400).json({ message: "Pin already exists" });
    }

    // Update the pin
    await pinRef.update({
      pin: pinCode,
      name: pinCodeName,
      pinId: pinId,
    });

    // Fetch all updated pins from the reference
    const updatedPinsSnapshot = await pinRef.parent.once("value");
    const updatedPinsData = updatedPinsSnapshot.val();

    // Respond with a success message and all updated pins
    res.status(200).json({
      message: "Pin updated successfully",
      updatedPins: updatedPinsData,
    });
  } catch (error) {
    console.error("Error in updating pin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//setTimer

const setTimer = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { ontime, offtime } = req.body;
    console.log(ontime)
    console.log(offtime)

    const commercialSnapshot = await admin
      .database()
      .ref(`/commercial/${com_prop_id}`)
      .once("value");
    const commercialData = commercialSnapshot.val();

    if (commercialData && commercialData.pcbId) {
      const pcbId = commercialData.pcbId;

      console.log(pcbId);

      const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
      await PCBRef.update({
        ontime: ontime,
        offtime: offtime,
      });

      res.status(201).json({
        message: "SetTime successfully",
      });
    } else {
      res.status(404).json({ error: "pcbId not found in the commercial data" });
    }
  } catch (error) {
    console.error("Error in adding pin:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Intercom id

// const AddInterComId = async (req, res) => {
//   try {
//     const { com_prop_id } = req.params;
//     const { intercomId, deviceName, commercial_prop_id, intercomNo } = req.body;
//     console.log(intercomId);

//     const pcbsRef = admin
//       .database()
//       .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs/${intercomId}`);
//     const pcbsSnapshot = await pcbsRef.once("value");
//     const pcbsData = pcbsSnapshot.val();
//     // Check if the PCB with the specified IntercomId exists
//     if (!pcbsSnapshot.exists()) {
//       return res.status(404).json({ error: "PCB not found" });
//     }

//     const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
//     const snapshotExsiting = await commercialRef.once("value");
//     const existingData = snapshotExsiting.val();


//     if (existingData.pcbId === intercomId) {
//       // If pcbId already exists, send a response
//       return res
//         .status(400)
//         .json({ error: "PCB ID already exists", pcbId: existingData.pcbId });
//     }
//     // Determine which PCB slot to update
//     if (!existingData.pcbId1) {
//       // If pcbId1 does not exist, add as the first intercom
//       await commercialRef.update({
//         ...existingData,
//         pcbId1: intercomId,
//         deviceName1: deviceName,
//         pcbStatus1: "online",
//       });
//     } else if (!existingData.pcbId2) {
//       // If pcbId1 exists but pcbId2 does not, add as the second intercom
//       await commercialRef.update({
//         ...existingData,
//         pcbId2: intercomId,
//         deviceName2: deviceName,
//         pcbStatus2: "online",
//       });
//     } else {
//       // If both pcbId1 and pcbId2 exist, return an error
//       return res
//         .status(400)
//         .json({ error: "Maximum of 2 Intercoms already added" });
//     }

//     const currentTimestamp = Date.now();
//     const updatedsnapshot = await commercialRef.once("value");
//     const updatedData = updatedsnapshot.val();
//     await pcbsRef.remove();

//     const PCBRef = admin.database().ref(`/PCB/${intercomId}`);
//     const intercomsRef = admin.database().ref(`/property/${commercial_prop_id}/intercoms/${intercomId}`);
//     pcbsData.propertyId = commercial_prop_id;
//     pcbsData.commercialAdminId = com_prop_id;
//     pcbsData.deviceName = deviceName,
//       pcbsData.door = "0";
//     pcbsData.light = "0";
//     pcbsData.appLayout = "default";
//     pcbsData.IntercomNo = `${intercomNo}`;
//     pcbsData.addedByAdmin = currentTimestamp
//     await PCBRef.set(pcbsData);
//     await intercomsRef.set(pcbsData);

//     res.status(200).json({
//       message: "InterComId updated successfully",
//       commercialData: updatedData,
//     });
//   } catch (error) {
//     console.error("Error in updating pin:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

const AddInterComId = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { intercomId, deviceName, commercial_prop_id, intercomNo } = req.body;
    console.log(intercomId);

    const deletedPCBRef = admin.database().ref(`/deletedPCB/${intercomId}`);
    const deletedPCBSnapshot = await deletedPCBRef.once("value");
    const deletedPCBData = deletedPCBSnapshot.val();

    // Check if intercomId exists in deletedPCB and if the propertyId matches
    if (deletedPCBSnapshot.exists() && deletedPCBData.propertyId === commercial_prop_id) {
      console.log("Intercom found in deletedPCB, proceeding with cut and paste.");

      // Proceed with "cut and paste"
      const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
      const snapshotExsiting = await commercialRef.once("value");
      const existingData = snapshotExsiting.val();

      // Check if we can add the intercom (only up to 2 intercoms)
      if (!existingData.pcbId1) {
        // Add as the first intercom
        await commercialRef.update({
          ...existingData,
          pcbId1: intercomId,
          deviceName1: deviceName,
          pcbStatus1: "online",
        });
      } else if (!existingData.pcbId2) {
        // Add as the second intercom
        await commercialRef.update({
          ...existingData,
          pcbId2: intercomId,
          deviceName2: deviceName,
          pcbStatus2: "online",
        });
      } else {
        return res.status(400).json({ error: "Maximum of 2 Intercoms already added" });
      }

      // After adding the intercom, remove it from deletedPCB

      // Add the intercom data back to the PCB and property/intercoms nodes
      const intercomsRef = admin.database().ref(`/property/${commercial_prop_id}/intercoms/${intercomId}`);

      deletedPCBData.commercialAdminId = com_prop_id;
      deletedPCBData.deviceName = deviceName;
      deletedPCBData.door = "0";
      deletedPCBData.light = "0";
      deletedPCBData.appLayout = "default";
      deletedPCBData.IntercomNo = `${intercomNo}`;
      deletedPCBData.addedByAdmin = Date.now();
      deletedPCBData.propertyId = commercial_prop_id;


      await intercomsRef.set(deletedPCBData);


      await deletedPCBRef.remove();


      res.status(200).json({
        message: "InterComId added successfully",
        commercialData: deletedPCBData,
      });
    } else {
      // If not found in deletedPCB, proceed with the original flow

      const pcbsRef = admin
        .database()
        .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs/${intercomId}`);
      const pcbsSnapshot = await pcbsRef.once("value");
      const pcbsData = pcbsSnapshot.val();

      // Check if the PCB with the specified IntercomId exists
      if (!pcbsSnapshot.exists()) {
        return res.status(404).json({ error: "PCB not found" });
      }

      const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
      const snapshotExsiting = await commercialRef.once("value");
      const existingData = snapshotExsiting.val();

      // Check if the PCB ID already exists
      if (existingData.pcbId === intercomId) {
        return res
          .status(400)
          .json({ error: "PCB ID already exists", pcbId: existingData.pcbId });
      }

      // Add the intercom based on available slots
      if (!existingData.pcbId1) {
        await commercialRef.update({
          ...existingData,
          pcbId1: intercomId,
          deviceName1: deviceName,
          pcbStatus1: "online",
        });
      } else if (!existingData.pcbId2) {
        await commercialRef.update({
          ...existingData,
          pcbId2: intercomId,
          deviceName2: deviceName,
          pcbStatus2: "online",
        });
      } else {
        return res.status(400).json({ error: "Maximum of 2 Intercoms already added" });
      }

      // Remove from StandByPCBs and add it to PCB and intercom nodes
      await pcbsRef.remove();

      const PCBRef = admin.database().ref(`/PCB/${intercomId}`);
      const intercomsRef = admin.database().ref(`/property/${commercial_prop_id}/intercoms/${intercomId}`);

      pcbsData.propertyId = commercial_prop_id;
      pcbsData.commercialAdminId = com_prop_id;
      pcbsData.deviceName = deviceName;
      pcbsData.door = "0";
      pcbsData.light = "0";
      pcbsData.appLayout = "default";
      pcbsData.IntercomNo = `${intercomNo}`;
      pcbsData.addedByAdmin = Date.now();

      await PCBRef.set(pcbsData);
      await intercomsRef.set(pcbsData);

      res.status(200).json({
        message: "InterComId added successfully",
        commercialData: existingData,
      });
    }
  } catch (error) {
    console.error("Error in adding InterComId:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};







const GetIntercoms = async (req, res) => {
  try {
    const { propertyId } = req.params; // Get the commercial property ID from the request parameters

    console.log(propertyId, "the id i am looking for");

    const intercomsRef = admin
      .database()
      .ref(`/property/${propertyId}/intercoms`); // Reference to the intercoms node for the specified commercial property

    const intercomsSnapshot = await intercomsRef.once("value");
    const intercomsData = intercomsSnapshot.val();

    if (!intercomsData) {
      // If no intercoms found for the specified property
      return res.status(404).json({ error: "No intercoms found" });
    }

    // Transform the intercomsData object into an array of intercom objects
    const intercomsArray = Object.entries(intercomsData).map(([id, intercom]) => ({
      id,
      ...intercom,
    }));

    res.status(200).json({
      message: "Intercoms retrieved successfully",
      intercoms: intercomsArray,
    });
  } catch (error) {
    console.error("Error retrieving intercoms:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




const UpdateIntercomId = async (req, res) => {
  try {
    const { com_prop_id } = req.params; // Get the property ID and intercom ID from the request parameters
    const { intercomId, applayoutValue, propId, doorValue, pcbIndexNumber, onlineStatus } = req.body; // Get the new door value and applayout value from the request body

    console.log(propId, intercomId, onlineStatus, "the data you want")

    const intercomRef = admin.database().ref(`/property/${propId}/intercoms/${intercomId}`);
    // Reference to the specific intercom node
    const commercialResidentsRef = admin.database().ref(`/property/${propId}/commercialResidents`);


    const pcbRef = admin.database().ref(`PCB/${intercomId}`);
    const pcbSnapshot = await pcbRef.once("value");
    const pcbData = pcbSnapshot.val();
    const intercomNo = pcbData.IntercomNo

    const EventRef = admin.database().ref(`property/${propId}/events`)

    // Update the intercom's door and applayout values
    if (doorValue !== undefined) {
      await intercomRef.update({
        door: doorValue,
      });
      await pcbRef.update({
        door: doorValue,
      });
      // Create a new event with a generated ID
      if (doorValue === "1") {
        // Create a new event with a generated ID
        const newEventRef = EventRef.push(); // This generates a new unique ID
        await newEventRef.set({
          timestamp: admin.database.ServerValue.TIMESTAMP, // Add a timestamp
          message: "commercialAdmin visitor",
          eventType: "key", // Example event type
          intercomNo: intercomNo
        });
      }

    }
    if (applayoutValue !== undefined) {
      await intercomRef.update({
        // door: doorValue,
        appLayout: applayoutValue,
      });

      // Update all commercial residents with the new applayoutValue
      const commercialResidentsSnapshot = await commercialResidentsRef.once('value');
      const commercialResidentsData = commercialResidentsSnapshot.val();

      if (commercialResidentsData) {
        const updates = {};
        Object.keys(commercialResidentsData).forEach(residentId => {
          updates[`/property/${propId}/commercialResidents/${residentId}/applayout${pcbIndexNumber}`] = applayoutValue;
        });

        await admin.database().ref().update(updates);
      }
    }


    // Update online status if only the online status is provided
    if (onlineStatus !== undefined && doorValue === undefined && applayoutValue === undefined) {
      await intercomRef.update({
        isOnline: onlineStatus,
      });
      await pcbRef.update({
        isOnline: onlineStatus,
      });
    }


    res.status(200).json({
      message: "Intercom updated successfully",
    });
  } catch (error) {
    console.error("Error updating intercom:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};





// const deleteIntercomId = async (req, res) => {

//   try {
//     const { com_prop_id } = req.params;
//     const { intercomId, propId } = req.query;
//     console.log(com_prop_id, intercomId, propId)
//     // Get the new door value and applayout value from the request body
//     const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
//     const snapshotExisting = await commercialRef.once("value");
//     const existingData = snapshotExisting.val();

//     // Check which intercom ID matches and delete the corresponding data
//     if (existingData.pcbId1 === intercomId) {
//       // Delete the data related to the first intercom
//       await commercialRef.update({
//         pcbId1: null,
//         deviceName1: null,
//         pcbStatus1: null,
//       });
//     } else if (existingData.pcbId2 === intercomId) {
//       // Delete the data related to the second intercom
//       await commercialRef.update({
//         pcbId2: null,
//         deviceName2: null,
//         pcbStatus2: null,
//       });
//     } else {
//       // If no matching intercom ID is found, return an error
//       return res.status(404).json({ error: "Intercom ID not found" });
//     }

//     // Reference to the specific commercial property
//     const intercomRef = admin.database().ref(`/property/${propId}/intercoms/${intercomId}`);
//     const PCBRef = admin.database().ref(`/PCB/${intercomId}`);




//     // Retrieve the commercial property data
//     const intercomSnapshot = await intercomRef.once("value");
//     const pcbSnapshot = await PCBRef.once("value");
//     const intercomData = intercomSnapshot.val();
//     const pcbData = pcbSnapshot.val();

//     if (!intercomData || !pcbData) {
//       // If the commercial property doesn't exist, send a not found response
//       return res.status(404).json({ error: "intercom not found" });
//     }
//     else {
//       await intercomRef.remove();
//       await PCBRef.remove();
//       res.status(200).json({
//         message: "InterComId deleted successfully",
//       });
//     }
//   } catch (error) {
//     console.error("Error in deleting InterComId:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

//

// const deleteIntercomId = async (req, res) => {
//   try {
//     const { com_prop_id } = req.params;
//     const { intercomId, propId } = req.query;
//     console.log(com_prop_id, intercomId, propId);

//     // Reference to the commercial property
//     const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
//     const snapshotExisting = await commercialRef.once("value");
//     const existingData = snapshotExisting.val();

//     // Check which intercom ID matches and delete the corresponding data
//     if (existingData.pcbId1 === intercomId) {
//       // Delete the data related to the first intercom
//       await commercialRef.update({
//         pcbId1: null,
//         deviceName1: null,
//         pcbStatus1: null,
//       });
//     } else if (existingData.pcbId2 === intercomId) {
//       // Delete the data related to the second intercom
//       await commercialRef.update({
//         pcbId2: null,
//         deviceName2: null,
//         pcbStatus2: null,
//       });
//     } else {
//       // If no matching intercom ID is found, return an error
//       return res.status(404).json({ error: "Intercom ID not found" });
//     }

//     // Reference to the specific intercom (property) and PCB data
//     const intercomRef = admin.database().ref(`/property/${propId}/intercoms/${intercomId}`);
//     const PCBRef = admin.database().ref(`/PCB/${intercomId}`);
//     const deletedPCBRef = admin.database().ref(`/deletedPCB/${intercomId}`);

//     // Retrieve intercom and PCB data
//     const intercomSnapshot = await intercomRef.once("value");
//     const pcbSnapshot = await PCBRef.once("value");
//     const intercomData = intercomSnapshot.val();
//     const pcbData = pcbSnapshot.val();

//     if (!intercomData || !pcbData) {
//       // If the intercom or PCB doesn't exist, send a not found response
//       return res.status(404).json({ error: "Intercom not found" });
//     }

//     // Move data to `/deletedPCB/${intercomId}` without removing from `/PCB/${intercomId}`
//     await deletedPCBRef.set({
//       ...pcbData,
//     });

//     // Remove only the intercom data from the `intercomRef`
//     await intercomRef.remove();

//     res.status(200).json({
//       message: "InterComId deleted from property and moved to deletedPCB successfully",
//     });
//   } catch (error) {
//     console.error("Error in deleting InterComId:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };




const deleteIntercomId = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { intercomId, propId } = req.query;
    console.log(com_prop_id, intercomId, propId);

    // Reference to the commercial property
    const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const snapshotExisting = await commercialRef.once("value");
    const existingData = snapshotExisting.val();

    // Check which intercom ID matches and delete the corresponding data
    if (existingData.pcbId1 === intercomId) {
      // Delete the data related to the first intercom
      await commercialRef.update({
        pcbId1: null,
        deviceName1: null,
        pcbStatus1: null,
      });
    } else if (existingData.pcbId2 === intercomId) {
      // Delete the data related to the second intercom
      await commercialRef.update({
        pcbId2: null,
        deviceName2: null,
        pcbStatus2: null,
      });
    } else {
      // If no matching intercom ID is found, return an error
      return res.status(404).json({ error: "Intercom ID not found" });
    }

    // Reference to the specific intercom (property) and PCB data
    const intercomRef = admin.database().ref(`/property/${propId}/intercoms/${intercomId}`);
    const PCBRef = admin.database().ref(`/PCB/${intercomId}`);
    const deletedPCBRef = admin.database().ref(`/deletedPCB/${intercomId}`);

    // Retrieve intercom and PCB data
    const intercomSnapshot = await intercomRef.once("value");
    const pcbSnapshot = await PCBRef.once("value");
    const intercomData = intercomSnapshot.val();
    const pcbData = pcbSnapshot.val();

    if (!intercomData || !pcbData) {
      // If the intercom or PCB doesn't exist, send a not found response
      return res.status(404).json({ error: "Intercom not found" });
    }



    // Remove only the intercom data from the `intercomRef`
    await intercomRef.remove();

    // Retrieve IntercomNo from PCB data
    const IntercomNo = pcbData.IntercomNo;

    // Reference to events and commercialResidents
    const eventsRef = admin.database().ref(`/property/${propId}/events`);
    const commercialResidentsRef = admin.database().ref(`/property/${propId}/commercialResidents`);

    // Delete events related to the intercom ID
    const eventsSnapshot = await eventsRef.once("value");
    const eventsData = eventsSnapshot.val();
    if (eventsData) {
      for (const [eventId, eventData] of Object.entries(eventsData)) {
        if (eventData.intercomNo === IntercomNo) {
          // Check if the IntercomNo matches and delete the event
          await eventsRef.child(eventId).remove();
        }
      }
    }

    // Delete events from commercialResidents
    const commercialResidentsSnapshot = await commercialResidentsRef.once("value");
    const commercialResidentsData = commercialResidentsSnapshot.val();
    if (commercialResidentsData) {
      for (const [residentId, residentData] of Object.entries(commercialResidentsData)) {
        if (residentData.events) {
          for (const [eventId, eventData] of Object.entries(residentData.events)) {
            if (eventData.intercomNo === IntercomNo) {
              // Check if the IntercomNo matches and delete the event
              await commercialResidentsRef.child(`${residentId}/events/${eventId}`).remove();
            }
          }
        }
      }
    }

    // Move data to `/deletedPCB/${intercomId}` without removing from `/PCB/${intercomId}`
    await deletedPCBRef.set({
      ...pcbData,
    });



    res.status(200).json({
      message: "IntercomId deleted from property, moved to deletedPCB, and associated events removed successfully",
    });
  } catch (error) {
    console.error("Error in deleting InterComId:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};













const updateUser = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { name, lastName, address, phoneNumber, propertyName, propertyId, email } = req.body;

    console.log(propertyId, "the property Id")
    // Extract the authId by removing "commercial" prefix from com_prop_id
    // Reference to the specific user to update
    const userRef = admin.database().ref(`/commercial/${com_prop_id}`);
    // const usersComRef = admin.database().ref(`/users/${authId}`);
    const commercialAdminRef = admin.database().ref(`/property/${propertyId}/commercialAdmin`);

    // Check if the user exists
    const userSnapshot = await userRef.once("value");
    if (!userSnapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user information
    await userRef.update({
      name,
      lastName,
      address,
      phoneNumber,
      propertyName,
      email,
    });
    // await usersComRef.update({
    //   firstName: name,
    //   lastName: lastName,
    //   address,
    //   phone: phoneNumber,
    // });
    await commercialAdminRef.update({
      firstName: name,
      lastName,
      address,
      phoneNumber,
      propertyName,
      email,
    });

    const updatedUserSnapshot = await userRef.once("value");
    const updatedUserData = updatedUserSnapshot.val();
    // Respond with a success message
    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUserData });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



// const deleteUser = async (req, res) => {
//   try {
//     const { com_prop_id } = req.params;
//     const { propertyId } = req.query;
//     const { userPhoneNumber, userEmail } = req.body;

//     // Your logic to delete the user, for example:
//     const userRef = admin.database().ref(`/commercial/${com_prop_id}`);
//     const usersComRef = admin.database().ref(`/users/${com_prop_id}`);
//     const commercialAdminRef = admin.database().ref(`/property/${propertyId}`);
//     const notificationsRef = admin.database().ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/notifications/unRead");

//     // await deleteUsers("commercial", com_prop_id);

//     await userRef.remove();
//     await usersComRef.remove();
//     await commercialAdminRef.remove();

//     // Add notification
//     const newNotificationRef = notificationsRef.push();
//     const notificationData = {
//       userPhoneNumber,
//       userEmail,
//       message: "Commercial Admin Account has been deleted",
//       timestamp: Date.now(), // Current time in milliseconds
//     };

//     await newNotificationRef.set(notificationData);


//     res.status(200).json({ message: "User deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting user:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };



const deleteUser = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { propertyId } = req.query;
    const { userPhoneNumber, userEmail } = req.body;

    // Retrieve the authId by checking Firebase Authentication for the email
    // const userRecord = await admin.auth().getUserByEmail(userEmail);
    // const authId = userRecord.uid;

    const userRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const snapshot = await userRef.once('value');
    const data = snapshot.val();
    // Extract userCount from the data
    const userCount = data ? data.usercount : "0";

    // const usersComRef = admin.database().ref(`/users/${authId}`);
    const commercialAdminRef = admin.database().ref(`/property/${propertyId}`);
    // const paymentref = admin.database().ref(`/payments/${authId}`);


    // // Firebase Realtime Database references
    // const propertyRef = admin.database().ref(`/property`);

    // // Check all nodes in the property child
    // const propertySnapshot = await propertyRef.once('value');
    // const properties = propertySnapshot.val();

    // if (properties) {
    //   for (const propKey in properties) {
    //     const propData = properties[propKey];

    //     // If the AuthId is present in "Property Owner", remove the entire property child
    //     if (propData["Property Owner"] && propData["Property Owner"].hasOwnProperty(authId)) {
    //       await admin.database().ref(`/property/${propKey}`).remove();
    //     }

    //     // If the AuthId is present in "commercialResidents" or "Property Resident", remove only the AuthId reference
    //     if (propData["commercialResidents"] && propData["commercialResidents"].hasOwnProperty(authId)) {
    //       await admin.database().ref(`/property/${propKey}/commercialResidents/${authId}`).remove();
    //     }

    //     if (propData["Property Resident"] && propData["Property Resident"].hasOwnProperty(authId)) {
    //       await admin.database().ref(`/property/${propKey}/Property Resident/${authId}`).remove();
    //     }
    //   }
    // }


    await userRef.remove();
    // await usersComRef.remove();
    await commercialAdminRef.remove();
    // await paymentref.remove();
    // Remove the user from Firebase Authentication
    // await admin.auth().deleteUser(authId);

    // Add notification
    const notificationsRef = admin.database().ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/notifications/unRead");
    const notifications = [
      "Commercial Admin Account has been deleted",
      "Commercial Property has been deleted"
    ];

    // Create notifications using a loop
    for (const message of notifications) {
      const newNotificationRef = notificationsRef.push();
      const notificationData = {
        userPhoneNumber,
        userEmail,
        message,
        userCount,
        timestamp: Date.now(), // Current time in milliseconds
      };

      await newNotificationRef.set(notificationData);
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



























async function deleteUsers(property_type, prop_id) {

  const AdminUserRef = admin
    .database()
    .ref(`/${property_type}/users/${prop_id}/users`);
  const usersSnapshot = await AdminUserRef.once("value");
  const users = usersSnapshot.val();

  if (users) {
    await Promise.all(Object.keys(users).map(async (userId) => {
      const user = users[userId];
      console.log(user); // Just for debugging, you can remove this line if not needed


      const UserRef = admin
        .database()
        .ref(`/${property_type}/users/${prop_id}/users/${userId}`);

      await UserRef.remove();

      // if(changeUserStatus) {
      //     await UserRef.update({ status: status });
      // }else{
      //   const {success} =  await moveUserToWaitingUsers(property_type,userId, user);
      //   await UserRef.remove(); 
      // }


    }));
  }
}

// Get Resident With PCB Id
const VisitorData = async (req, res) => {
  try {
    const { pcbId } = req.params;
    console.log(pcbId);
    let data = [];
    // Assuming you have a reference to your database
    const residentsRef = admin.database().ref(`/PCB/${pcbId}`);

    const snapshot = await residentsRef.once("value");
    const pcbData = snapshot.val();

    // Check if residentsData exists
    if (!pcbData) {
      return res.status(404).json({ error: "Residents data not found" });
    }

    // Check if the propertyId field exists
    const prop_id = pcbData.commercialAdminId;
    const commercial_prop_id = pcbData.propertyId;
    let proptype;
    if (isCommercialProperty(prop_id)) {
      console.log(`${prop_id} is a commercialAdminId.`);
      console.log(`${commercial_prop_id} is a commercialAdminId.`);
      // Handle commercial property case
      proptype = "commercial";
      const AdminRef = admin.database().ref(`/commercial/${prop_id}`);
      const AdminRefsnapshot = await AdminRef.once("value");
      const AdminData = AdminRefsnapshot.val();
      const AllresidentsRef = admin
        .database()
        .ref(`/property/${commercial_prop_id}/commercialResidents`);

      const Allresidentssnapshot = await AllresidentsRef.once("value");
      const AllresidentsData = Allresidentssnapshot.val();
      let activeUsers = [];
      if (AllresidentsData) {
        data = {
          userId: {
            name: AdminData.name,
            lname: AdminData.lastName,
            userId: AdminData.id,
          },
        };
        console.log(pcbData, "the data of the pcb is ")
        console.log(AdminData, "the commercial admin data")
        console.log(data, "the userId data")
        activeUsers = Object.values(AllresidentsData)
          .filter((user) => user.paymentStatus === "done")
        // .sort((a, b) => a.name.localeCompare(b.name));
        console.log(activeUsers, "the commercial residents are...")
        res.status(200).json({
          residents: activeUsers,
          propId: prop_id,
          AdminData,
          proptype,
          data,
          pcbData,
        });
      } else {
        res.status(200).json({
          residents: activeUsers,
          propId: prop_id,
          AdminData,
          proptype,
          data,
          pcbData,
        });
      }
    } else {
      console.log(`${prop_id} is a residential property.`);

      const AdminRef = admin.database().ref(`/residential/${prop_id}`);
      const AdminRefsnapshot = await AdminRef.once("value");
      const AdminData = AdminRefsnapshot.val();
      data = {
        userId: {
          name: AdminData.name,
          lname: AdminData.lastName,
          userId: AdminData.id,
        },
      };
      proptype = "residential";

      res.status(200).json({
        residents: [],
        propId: prop_id,
        AdminData,
        proptype,
        data,
        pcbData,
      });
    }

    // console.log(com_id)
    if (!prop_id) {
      return res
        .status(404)
        .json({ error: "Property ID not found in residents data" });
    }
  } catch (error) {
    console.error("Error in fetching residents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

function isCommercialProperty(propertyId) {
  return propertyId.startsWith("c");
}
// Open door With Pin
const findPin = (pinsData, pin) => {
  return Object.entries(pinsData).find(
    ([pinId, pinData]) => pinData.pin === pin
  );
};

const findPinInAnotherNode = async (matchingPinId, usersData, adminData, propId) => {
  try {
    // if (usersData) {
    //   // Iterate over each user ID asynchronously
    //   for (const userId of Object.keys(usersData)) {
    //     const userData = usersData[userId];
    //     // Check each user for the matching pin
    //     const matchingUserPin = findUserByPin(userData, matchingPinId);
    //     if (matchingUserPin) {
    //       console.log(`Matching user found with ID ${userId}. ${matchingPinId}`);
    //       return { userId, userData, matchingUserPin };
    //     }
    //   }

    //   // No matching user found
    //   return null;
    // } else {
    //   // No users found for the specified comId in the second node
    //   return null;
    // }

    // Check in usersData
    if (usersData) {
      for (const userId of Object.keys(usersData)) {
        const userData = usersData[userId];
        const matchingUserPin = findUserByPin(userData, matchingPinId);
        if (matchingUserPin) {
          console.log(`Matching user found in usersData with ID ${userId}. Pin: ${matchingPinId}`);
          return { userId, userData, matchingUserPin };
        }
      }
    }

    // Check in adminData (assuming there is only one key)
    if (adminData) {
      const adminId = Object.keys(adminData)[0]; // Get the single key
      const adminDataItem = adminData[adminId];
      const matchingAdminPin = findUserByPin(adminDataItem, matchingPinId);
      if (matchingAdminPin) {
        console.log(`Matching user found in adminData with ID ${adminId}. Pin: ${matchingPinId}`);
        return { userId: adminId, userData: adminDataItem, matchingUserPin: matchingAdminPin };
      }
    }

    // No matching user found in both usersData and adminData
    return null;
  } catch (error) {
    console.error("Error in finding pin in another node:", error);
    return null;
  }
};

const AccessDoorWithPin = async (req, res) => {
  try {
    const { comId } = req.params;
    const { pin, propertyId, pcbId } = req.body;


    console.log(comId, pin, propertyId, "the data i want for commercial visitor door pins")

    // Assuming you have a reference to your database
    const PinRef = admin.database().ref(`property/${propertyId}/AdminPins`);
    const snapshot = await PinRef.once("value");
    const pinsData = snapshot.val();

    const AdminRef = admin.database().ref(`commercial/${comId}`);
    const Adminsnapshot = await AdminRef.once("value");
    const AdminData = Adminsnapshot.val();

    const EventRef = admin.database().ref(`property/${propertyId}/events`);
    let response_msg = "";
    if (pinsData) {

      console.log(800);
      const matchingPin = findPin(pinsData, pin);
      if (matchingPin && AdminData.status === "active") {

        const updateResult = await updateDoorProperty(pcbId);
        if (updateResult.status === 200) {
          // await TpinRef.child(matchingTpin.key).remove();
          console.log(matchingPin)
          const pinData = matchingPin[1];

          // Dynamically access the PinCodeName property
          const pinCodeName = pinData['PinCodeName'];
          console.log(pinCodeName);
          console.log(985)
          const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
          const pcbSnapshot = await PCBRef.once("value");
          const pcbData = pcbSnapshot.val();

          const intercomNo = pcbData.IntercomNo
          const deviceName = pcbData.deviceName
          const eventMessage = `${AdminData.name} ${AdminData.lastName}`;
          const userid = "";

          logDoorOpenEvent(EventRef, eventMessage, "servicePinCode", intercomNo, deviceName,);
          return res.status(200).json({
            message: "Pin matched successfully",
            sensorCheck: updateResult.sensorCheck,
          });
        } else if (updateResult.status === 400) {
          return res.status(updateResult.status).json({
            error: updateResult.message,
            sensorCheck: updateResult.sensorCheck,
          });
        }
      } else if (matchingPin && AdminData.status === "inactive") {
        response_msg = "Sorry you cannot access the door";
        console.log("in else");
      } else {
        response_msg = "Wrong Pin Entered";
      }
    }

    // const FindCommercialResidentsPinRef = admin
    //   .database()
    //   .ref(`property/${propertyId}/commercialResidents`);
    // const UsersPinsnapshot = await FindCommercialResidentsPinRef.once("value");
    // const usersData = UsersPinsnapshot.val();

    // if (usersData) {
    //   const matchingUser = await findPinInAnotherNode(pin, usersData, comId);

    //   if (matchingUser && matchingUser.userData.status === "active") {
    //     const { matchingUserPin, userData } = matchingUser;
    //     console.log(987);
    //     console.log(matchingUser.userData.status);
    //     const updateResult = await updateDoorProperty(pcbId);

    //     if (updateResult.status === 200) {
    //       if (matchingUser.matchingUserPin.type === "T") {
    //         const RemovePinRef = admin
    //           .database()
    //           .ref(
    //             `property${propertyId}/commercialResidents/${matchingUser.userId}/TempPins`
    //           );
    //         await RemovePinRef.child(
    //           matchingUser.matchingUserPin.pinName
    //         ).remove();
    //       }
    //       console.log(1001)
    //       const userId = userData.userId;
    //       console.log(matchingUserPin.pinData.name);
    //       // The door was successfully updated
    //       const eventType = matchingUserPin.type === "Ppin" ? "" : "'s visitor";
    //       //admin events
    //       logDoorOpenEvent(
    //         EventRef,
    //         `${userData.firstName}'s visitor.`,
    //         matchingUserPin.type
    //       );
    //       //user events
    //       const EventForUserRef = admin.database().ref(`property/${propertyId}/events`);
    //       logDoorOpenEventForUser(EventForUserRef, matchingUserPin.pinData.name, matchingUserPin.type)

    //       res.status(200).json({
    //         message: "Pin matched successfully",
    //         sensorCheck: updateResult.sensorCheck,
    //       });
    //     } else if (updateResult.status === 400) {
    //       res.status(updateResult.status).json({
    //         error: updateResult.message,
    //         sensorCheck: updateResult.sensorCheck,
    //       });
    //     }
    //   } else if (
    //     matchingUser &&
    //     (matchingUser.userData.status === "suspended" ||
    //       matchingUser.userData.status === "inactive")
    //   ) {
    //     res.status(404).json({ error: "Sorry you cannot access the door" });
    //   } else {
    //     res.status(404).json({ error: response_msg });
    //   }
    // } else {
    //   res.status(404).json({ error: "Wrong Pin Entered" });
    // }

    const FindCommercialResidentsPinRef = admin
      .database()
      .ref(`property/${propertyId}/commercialResidents`);
    const UsersPinsnapshot = await FindCommercialResidentsPinRef.once("value");
    const usersData = UsersPinsnapshot.val();



    if (usersData) {
      const matchingUser = await findPinInAnotherNode(pin, usersData, comId);

      if (matchingUser && matchingUser.userData.status === "active") {
        const { matchingUserPin, userData } = matchingUser;
        console.log(987);
        console.log(matchingUser.userData.status);
        const updateResult = await updateDoorProperty(pcbId);

        if (updateResult.status === 200) {
          console.log(1001);
          const userId = userData.userID;
          console.log(matchingUserPin.pinData.name);

          const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
          const pcbSnapshot = await PCBRef.once("value");
          const pcbData = pcbSnapshot.val();

          const intercomNo = pcbData.IntercomNo
          const deviceName = pcbData.deviceName;
          // The door was successfully updated
          const eventType = matchingUserPin.type === "P" ? "" : "'s visitor";




          console.log(userId, "99999999999999999999999999999")

          // Log admin events
          logDoorOpenEvent(
            EventRef,
            `${matchingUserPin.pinData.createdBy} ${eventType}`,
            matchingUserPin.type,
            intercomNo,
            deviceName,

          );

          if (matchingUserPin.type === "P") {

            const userRef = admin.database().ref(`property/${propertyId}/commercialResidents/${matchingUser.userId}`);
            const userEventRef = admin.database().ref(`property/${propertyId}/commercialResidents/${matchingUser.userId}/events`);
            const snapshot = await userRef.once("value");

            if (snapshot.exists()) {
              await userEventRef.push().set({
                timestamp: admin.database.ServerValue.TIMESTAMP,
                message: `${matchingUserPin.pinData.createdBy} ${eventType}`,
                eventType: matchingUserPin.type,
                intercomNo: intercomNo,
                gateName: deviceName,
                isSeen: false
              });
            } else {
              console.log(`Path does not exist: ${userEventRef.path.toString()}`);
            }
          }

          else if (matchingUserPin.type === "T") {
            const userRef = admin.database().ref(`property/${propertyId}/commercialResidents/${matchingUser.userId}`);
            const userEventRef = admin.database().ref(`property/${propertyId}/commercialResidents/${matchingUser.userId}/events`);
            const snapshot = await userRef.once("value");

            if (snapshot.exists()) {
              await userEventRef.push().set({
                timestamp: admin.database.ServerValue.TIMESTAMP,
                message: `${matchingUserPin.pinData.createdBy} ${eventType}`,
                eventType: matchingUserPin.type,
                intercomNo: intercomNo,
                gateName: deviceName,
                isSeen: false
              });
            } else {
              console.log(`Path does not exist: ${userEventRef.path.toString()}`);
            }

            const RemovePinRef = admin
              .database()
              .ref(
                `property/${propertyId}/commercialResidents/${matchingUser.userId}/TempPins`
              );
            await RemovePinRef.child(matchingUserPin.pinName).remove();
          }

          res.status(200).json({
            message: "Pin matched successfully",
            sensorCheck: updateResult.sensorCheck,
            userId: matchingUser.userId,
            pinName: matchingUserPin.pinData.name
          });
        } else if (updateResult.status === 400) {

          res.status(updateResult.status).json({
            error: updateResult.message,
            sensorCheck: updateResult.sensorCheck,
          });
        }
      } else if (
        matchingUser &&
        (matchingUser.userData.status === "suspended" ||
          matchingUser.userData.status === "inactive")
      ) {
        res.status(404).json({ error: "Sorry you cannot access the door" });
      } else {
        res.status(404).json({ error: "Wrong Pin Entered" });
      }
    } else {
      res.status(404).json({ error: "Wrong Pin Entered" });
    }



  } catch (error) {
    console.error("Error in accessing pins:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }



};


// Add event
const logDoorOpenEvent = async (EventRef, eventMessage, type, intercomNo, deviceName) => {
  console.log("1038", type)
  try {
    await EventRef.push().set({
      timestamp: admin.database.ServerValue.TIMESTAMP,
      message: eventMessage,
      eventType: type,
      intercomNo: intercomNo,
      gateName: deviceName,
      isSeen: false
    });
    return { message: "success" };
  } catch (error) {
    console.error("Error logging door open event:", error);
    return { message: "error" };
  }
};
const logDoorOpenEventForUser = async (EventRef, eventMessage, type, intercomNo) => {
  console.log("1060", type)
  try {
    await EventRef.push().set({
      timestamp: admin.database.ServerValue.TIMESTAMP,
      message: eventMessage,
      eventType: type,
      intercomNo: intercomNo,
    });
    return { message: "success" };
  } catch (error) {
    console.error("Error logging door open event:", error);
    return { message: "error" };
  }
};
// const updateDoorProperty = async (pcbId) => {
//   console.log(pcbId, "the pcbId i want in my update function");

//   try {
//     const PCBRef = admin.database().ref(`/PCB/${pcbId}`);

//     // Get the current PCB data
//     const pcbSnapshot = await PCBRef.once("value");
//     const pcbData = pcbSnapshot.val();
//     console.log(pcbData);

//     if (pcbData && pcbData.hasOwnProperty("sensor") && pcbData.sensor === "1") {
//       // Check if 'sensor' property exists and its value is equal to 1

//       // Update the door property to "1"
//       await PCBRef.update({ door: "1" });

//       // Reset the door property to "0" after 1 second
//       setTimeout(async () => {
//         await PCBRef.update({ door: "0" });
//       }, 1000);

//       console.log(`Door property for PCB ${pcbId} updated to 1 successfully.`);
//       return {
//         status: 200,
//         message: "Door opened successfully",
//         sensorCheck: true,
//       };
//     } else {
//       return {
//         status: 400,
//         message: "Sensor check failed",
//         sensorCheck: false,
//       };
//     }
//   } catch (error) {
//     console.error(`Error updating door property for PCB ${pcbId}:`, error);
//     return { status: 500, message: "Internal Server Error" };
//   }
// };

const updateDoorProperty = async (pcbId) => {
  console.log(pcbId, "the pcbId I want in my update function");

  try {
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);


    // Get the current PCB data
    const pcbSnapshot = await PCBRef.once("value");
    const pcbData = pcbSnapshot.val();
    console.log(pcbData);

    if (pcbData && pcbData.hasOwnProperty("sensor") && pcbData.sensor === "1") {
      // Check if 'sensor' property exists and its value is equal to 1

      // Update the door property to "1" while keeping other data intact
      await PCBRef.update({ ...pcbData, door: "1" });

      console.log(`Door property for PCB ${pcbId} updated to 1 successfully.`);

      // Reset the door property to "0" after 1 second
      setTimeout(async () => {
        await PCBRef.update({ ...pcbData, door: "0" });
        console.log(`Door property for PCB ${pcbId} reset to 0 successfully.`);
      }, 5000);

      return {
        status: 200,
        message: "Door opened successfully",
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



const findUserByPin = (userData, pin) => {
  // Check Ppins node
  console.log(userData, "inside findUserByPin func");
  for (const pinName in userData.PermPins) {
    const pinData = userData.PermPins[pinName];

    if (pinData.pin === pin) {
      console.log(1094);
      return { pinName, pinData, type: "P" };
    }
  }

  // Check Tpins node

  for (const pinName in userData.TempPins) {
    const pinData = userData.TempPins[pinName];

    if (pinData.pin === pin) {
      console.log(1105, "T");
      return { pinName, pinData, type: "T" };
    }
  }

  return null;
};
//OpenDoorWithPinResidential



const findPinforRedidentialNode = async (propId, matchingPinId) => {
  try {
    const FindPinRef = admin
      .database()
      .ref(`residential/users/${propId}/users`);
    const snapshot = await FindPinRef.once("value");
    const usersData = snapshot.val();

    if (usersData) {
      for (const userId of Object.keys(usersData)) {
        const userData = usersData[userId];

        console.log(1126);
        const matchingUserPin = findUserByPin(userData, matchingPinId);

        if (matchingUserPin) {
          if (matchingUserPin.type === "T") {
            console.log(1131);
            const RemovePinRef = admin
              .database()
              .ref(`residential/users/${propId}/users/${userId}/Tpins`);
            await RemovePinRef.child(matchingUserPin.pinName).remove();
            console.log(929);
          }
          console.log(`Matching user found with ID ${userId}.`);
          return { userId, userData, matchingUserPin };
        }
      }
      return null;
    } else {
      // No users found for the specified comId in the second node
      return null;
    }
  } catch (error) {
    console.error("Error in finding pin in another node:", error);
    return null;
  }
};

function ResfindPin(pinsData, pinToFind) {
  for (const key in pinsData) {
    if (pinsData.hasOwnProperty(key)) {
      const pin = pinsData[key];

      if (pin.pin === pinToFind) {
        return { pin, key };
      }
    }
  }
  return null;
}

// const OpenDoorWithPinResidential = async (req, res) => {
//   try {
//     const { propId } = req.params;
//     const { pin, propertyId } = req.body;

//     const PpinRef = admin.database().ref(`residential/users/${propId}/Ppins`);
//     const TpinRef = admin.database().ref(`residential/users/${propId}/Tpins`);
//     const snapshotPpin = await PpinRef.once("value");
//     const pinsDataPpin = snapshotPpin.val();
//     const snapshotTpin = await TpinRef.once("value");
//     const pinsDataTpin = snapshotTpin.val();
//     let AdminRef = admin.database().ref(`residential/${propId}`);
//     let Adminsnapshot = await AdminRef.once("value");
//     let matchingPpin = ResfindPin(pinsDataPpin, pin);
//     let matchingTpin = ResfindPin(pinsDataTpin, pin);
//     let ResidentName;
//     let response_msg = "";
//     const ResUserData = Adminsnapshot.val();

//     console.log(1207);

//     if (matchingPpin) {
//       if (matchingPpin && ResUserData.status === "active") {
//         console.log("PPin matched successfully");
//         console.log(ResUserData.status)
//         console.log("user");

//         ResidentName = ResUserData.UserName;
//         if (ResUserData?.hasOwnProperty("pcbId")) {
//           const updateResult = await updateDoorProperty(ResUserData.pcbId);
//           // console.log(1134);

//           if (updateResult.status === 200) {
//             const EventRef = admin
//               .database()
//               .ref(`residential/${propId}/events`);
//             const status = await logDoorOpenEvent(
//               //   //${ResUserData.UserName }
//               EventRef,
//               `${ResidentName}'s visitor`, "P"
//             );
//             console.log(matchingPpin)
//             console.log(1230);

//             const EventForUserRef = admin.database().ref(`residential/${propId}/myevents`);

//             logDoorOpenEventForUser(EventForUserRef, matchingPpin.pin.name, "P")
//             // const EventForUserRef = admin.database().ref(`residential/users/${comId}/users/${userId}/myevents`);
//             res.status(200).json({
//               message: "Pin matched successfully",
//               sensorCheck: updateResult.sensorCheck,
//             });
//           } else {
//             res.status(updateResult.status).json({
//               error: updateResult.message,
//               sensorCheck: updateResult.sensorCheck,
//             });
//           }
//         }
//       } else if (matchingPpin && ResUserData.status === "inactive") {
//         response_msg = "Sorry you cannot access the door";
//         console.log("in else");
//       } else {
//         response_msg = "Wrong Pin Entered";
//       }
//     } else if (matchingTpin && ResUserData.status === "active") {
//       console.log(ResidentName);
//       console.log(1255);
//       if (matchingTpin) {
//         const ResUserData = Adminsnapshot.val();

//         if (ResUserData?.hasOwnProperty("pcbId")) {
//           const updateResult = await updateDoorProperty(ResUserData.pcbId);

//           if (updateResult.status === 200) {
//             const EventRef = admin
//               .database()
//               .ref(`residential/${propId}/events`);
//             const status = await logDoorOpenEvent(
//               EventRef,
//               `${ResUserData.UserName}'s Visitor `, "T"
//             );

//             const EventForUserRef = admin.database().ref(`residential/${propId}/myevents`);
//             console.log(matchingTpin.pin.name)
//             logDoorOpenEventForUser(EventForUserRef, matchingTpin.pin.name, "T")
//             console.log("residential TPin matched successfully");

//             await TpinRef.child(matchingTpin.key).remove();

//             console.log("removed pin");
//             res.status(200).json({
//               message: "Pin matched successfully",
//               sensorCheck: updateResult.sensorCheck,
//             });
//           } else {
//             res.status(updateResult.status).json({
//               error: updateResult.message,
//               sensorCheck: updateResult.sensorCheck,
//             });
//           }
//         }
//       } else if (matchingTpin && ResUserData.status === "inactive") {
//         response_msg = "Sorry you cannot access the door";
//         console.log("in else");
//       } else {
//         response_msg = "Wrong Pin Entered";
//       }
//     } else {
//       const matchingUser = await findPinforRedidentialNode(propId, pin);
//       console.log(matchingUser.userId);
//       if (matchingUser && matchingUser.userData.status === "active") {
//         const { matchingUserPin, userData } = matchingUser;

//         const ResUserData = Adminsnapshot.val();
//         if (ResUserData?.hasOwnProperty("pcbId")) {
//           const updateResult = await updateDoorProperty(ResUserData.pcbId);

//           if (updateResult.status === 200) {
//             const eventType =
//               matchingUserPin.type === "Ppin" ? "" : "'s Visitor";
//             const EventRef = admin
//               .database()
//               .ref(`residential/${propId}/events`);

//             const status = await logDoorOpenEvent(
//               EventRef,
//               `${userData.firstName}${eventType} `, matchingUserPin.type
//             );
//             const userId = matchingUser.userId;

//             const EventForUserRef = admin.database().ref(`residential/users/${propId}/users/${userId}/myevents`);
//             logDoorOpenEventForUser(EventForUserRef, matchingUserPin.pinData.name, matchingUserPin.type)
//             // console.log(matchingUserPin.pinData.name);

//             res.status(200).json({
//               message: "Pin matched successfully",
//               sensorCheck: updateResult.sensorCheck,
//             });
//           } else {
//             res.status(updateResult.status).json({
//               error: updateResult.message,
//               sensorCheck: updateResult.sensorCheck,
//             });
//           }
//         }
//       } else if (
//         matchingUser &&
//         (matchingUser.userData.status === "suspended" ||
//           matchingUser.userData.status === "inactive")
//       ) {
//         res.status(404).json({ error: "Sorry you cannot access the door" });
//       } else {
//         res.status(404).json({ error: response_msg });
//       }
//     } //
//   } catch (error) {
//     console.error("Error in accessing pins:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };






//Welcome Message
const WelcomeMessage = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { WelcomMessage, propertyId, pcbId } = req.body;

    // Assuming you have a reference to your database
    const intercomRef = admin.database().ref(`property/${propertyId}/intercoms/${pcbId}`);
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);


    // Fetch existing data
    const snapshot = await intercomRef.once("value");
    const pcbData = snapshot.val();

    if (pcbData) {
      // Update the CommercialData with the WelcomeMessage
      const updatedPcbData = {
        ...pcbData,
        WelcomMessage: WelcomMessage,
      };

      // Update the data in the database
      await intercomRef.update(updatedPcbData);
      await PCBRef.set(updatedPcbData);

      res.status(200).json({
        message: "Welcome message updated successfully",
        pcbData: updatedPcbData,
      });
    } else {
      res.status(404).json({ error: "pcb data not found" });
    }
  } catch (error) {
    console.error("Error in updating welcome message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const SaveBrightness = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { brightness, propertyId, pcbId } = req.body;
    console.log(brightness);
    // Assuming you have a reference to your database
    const intercomRef = admin.database().ref(`property/${propertyId}/intercoms/${pcbId}`);
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);


    // Fetch existing data
    const snapshot = await intercomRef.once("value");
    const pcbData = snapshot.val();


    if (pcbData) {
      // Update the CommercialData with the WelcomeMessage
      const updatedPcbData = {
        ...pcbData,
        brightness: brightness,
      };

      // Update the data in the database
      await intercomRef.update(updatedPcbData);
      await PCBRef.set(updatedPcbData);

      res.status(200).json({
        message: "Opacity updated successfully",
        pcbData: updatedPcbData,
      });
    } else {
      res.status(404).json({ error: "pcb data not found" });
    }
  } catch (error) {
    console.error("Error in updating welcome message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const UploadWallpaper = async (req, res) => {
  try {
    const { com_prop_id, propertyId, pcbId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const filePath = req.file.path;
    console.log(filePath);
    const destinationPath = "images/" + req.file.originalname;

    const bucket = admin.storage().bucket();
    await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    const imageURL = await bucket
      .file(destinationPath)
      .getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      })
      .then((result) => result[0]);

    // Assuming you have a reference to your database
    const intercomRef = admin.database().ref(`property/${propertyId}/intercoms/${pcbId}`);
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);

    // Fetch existing data
    const snapshot = await intercomRef.once("value");
    const pcbData = snapshot.val();

    if (pcbData) {
      // Update the CommercialData with the image URL
      const updatedPcbData = {
        ...pcbData,
        wallpaper: imageURL, // Add the image URL to your data
      };

      // Update the data in the database
      await intercomRef.update(updatedPcbData);
      await PCBRef.set(updatedPcbData);

      res.status(200).json({
        message: "Image uploaded and database updated successfully",
        pcbData: updatedPcbData,
      });
    } else {
      res.status(404).json({ error: "pcb data not found" });
    }
  } catch (error) {
    console.error("Error in updating welcome message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const downloadQR = async (req, res) => {
  try {
    const { pcbId } = req.params;
    console.log(pcbId);
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
    const snapshot = await PCBRef.once("value");
    const pcbData = snapshot.val();
    console.log(pcbData);
    if (pcbData) {
      pcbData.QRurl;
      res.status(200).json({
        message: "Download QR",
        pcbData,
      });
    } else {
      res.status(404).json({ error: "PCB data not found" });
    }
  } catch (error) {
    console.error("Error in downloading QR code:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const GetEvents = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { commercial_prop_id } = req.query;

    const EventRef = admin.database().ref(`/property/${commercial_prop_id}/events`);
    const snapshot = await EventRef.once("value");
    const EventData = snapshot.val();

    console.log(EventData, commercial_prop_id, "the event data that i am getting");
    if (EventData) {
      res.status(200).json({
        message: "get Events",
        EventData,
      });
    } else {
      res.status(404).json({ error: "events data not found" });
    }
  } catch (error) {
    console.error("Error in getting events:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




const document = new PDFDocument({ margin: 30, size: "A4" });
const exportPdf = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { fromDate, toDate } = req.body;

    console.log(com_prop_id);
    console.log(fromDate);
    console.log(toDate);

    const EventRef = admin.database().ref(`/commercial/events/${com_prop_id}`);
    const snapshot = await EventRef.once("value");
    const EventData = snapshot.val();

    // await generatePdf(EventData, fromDate, toDate);
    const data = [];

    for (const eventId in EventData) {
      const event = EventData[eventId];
      const timestamp = new Date(event.timestamp);

      if (timestamp >= new Date(fromDate) && timestamp <= new Date(toDate)) {
        data.push([event.message || "", timestamp.toLocaleString()]);
      }
    }

    console.log(data);
    if (EventData) {
      res.status(200).json({
        message: "get Events",
        data,
      });
    } else {
      res.status(404).json({ error: "PCB data not found" });
    }
  } catch (error) {
    console.error("Error in downloading QR code:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



const generateAscci = async (req, res) => {
  try {
    const asciiRef = admin.database().ref("/ascii");
    const snapshot = await asciiRef.once("value");
    let currentAscii = snapshot.val() || "AA";
    await asciiRef.set(currentAscii);
    // currentAscii = incrementAscii(currentAscii);
    res.json({ ascii: currentAscii });
  } catch (error) {
    console.error("Error generating ASCII:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const IncrementAscci = async (req, res) => {
  try {
    const asciiRef = admin.database().ref("/ascii");
    const snapshot = await asciiRef.once("value");
    let currentAscii = snapshot.val() || "AA";
    currentAscii = incrementAscii(currentAscii);
    await asciiRef.set(currentAscii);

    console.log(currentAscii);
    res.json({ ascii: currentAscii });
  } catch (error) {
    console.error("Error generating ASCII:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
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

const createToken = async (req, res) => {
  try {
    // Get the token from the request body
    const { randomString } = req.body;

    // Save the token as a new child node under the "tokens" node in the Firebase Realtime Database
    const tokensRef = admin.database().ref(`/tokens`);
    await tokensRef.child(randomString).set({ userCount: 1 });

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving token:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteToken = async (req, res) => {
  try {
    // Get the token from the request parameters
    const { token } = req.params;
    console.log(token);

    // Create a reference to the token in the Firebase Realtime Database
    const tokensRef = admin.database().ref(`/tokens/${token}`);

    // Remove the token from the database
    await tokensRef.remove();

    // Send a success response
    res.status(200).json({ message: "Token deleted successfully" });
  } catch (error) {
    console.error("Error deleting token:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




const OpenDoorWithPinResidential = async (req, res) => {
  try {
    const { pcbID } = req.params;
    const { pin, propertyId, pcbId } = req.body;
    console.log("the property id is ", propertyId, pin, pcbId)
    const EventRef = admin.database().ref(`property/${propertyId}/events`);
    const FindPropertyOwnersPinRef = admin.database().ref(`property/${propertyId}/Property Owner`);
    const adminPinsnapshot = await FindPropertyOwnersPinRef.once("value");
    const adminData = adminPinsnapshot.val();

    const FindPropertyResidentsPinRef = admin
      .database()
      .ref(`property/${propertyId}/Property Resident`);
    const UsersPinsnapshot = await FindPropertyResidentsPinRef.once("value");
    const usersData = UsersPinsnapshot.val();

    console.log(usersData, "the data i am looking for")



    if (usersData || adminData) {
      const matchingUser = await findPinInAnotherNode(pin, usersData, adminData);


      if (matchingUser && matchingUser.userData.status === "active") {
        const { matchingUserPin, userData } = matchingUser;
        console.log(987);
        console.log(matchingUser.userData.status);
        const updateResult = await updateDoorProperty(pcbId);

        if (updateResult.status === 200) {
          console.log(1001);
          const userId = userData.userID;
          console.log(matchingUserPin.pinData.name);

          const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
          const pcbSnapshot = await PCBRef.once("value");
          const pcbData = pcbSnapshot.val();
          const intercomNo = pcbData.IntercomNo;
          const deviceName = pcbData.deviceName;

          // The door was successfully updated
          const eventType = matchingUserPin.type === "P" ? "" : "'s visitor";

          // Log admin events
          logDoorOpenEvent(
            EventRef,
            `${matchingUserPin.pinData.createdBy} ${eventType}`,
            matchingUserPin.type,
            intercomNo,
            deviceName,

          );

          // // Log user events
          // const EventForUserRef = admin
          //   .database()
          //   .ref(`property/${propertyId}/events`);
          // logDoorOpenEventForUser(
          //   EventForUserRef,
          //   matchingUserPin.pinData.name,
          //   matchingUserPin.type,
          //   intercomNo
          // );

          // Remove temporary pin after successful door update
          // if (matchingUserPin.type === "T") {
          //   const RemovePinRef = admin
          //     .database()
          //     .ref(
          //       `property/${propertyId}/Property Resident/${matchingUser.userId}/TempPins`
          //     );
          //   await RemovePinRef.child(matchingUserPin.pinName).remove();

          // }
          if (matchingUserPin.type === "P") {
            const userRef = admin.database().ref(`property/${propertyId}/Property Resident/${matchingUser.userId}`);
            const userEventRef = admin.database().ref(`property/${propertyId}/Property Resident/${matchingUser.userId}/events`);
            const snapshot = await userRef.once("value");
            if (snapshot.exists()) {
              await userEventRef.push().set({
                timestamp: admin.database.ServerValue.TIMESTAMP,
                message: `${matchingUserPin.pinData.createdBy} ${eventType}`,
                eventType: matchingUserPin.type,
                intercomNo: intercomNo,
                gateName: deviceName,
                isSeen: false
              });
            } else {
              console.log(`Path does not exist:`);
            }
          }

          else if (matchingUserPin.type === "T") {
            // Determine whether the user is a Property Resident or Property Owner based on the path in the database

            const userRef = admin.database().ref(`property/${propertyId}/Property Resident/${matchingUser.userId}`);
            const userEventRef = admin.database().ref(`property/${propertyId}/Property Resident/${matchingUser.userId}/events`);
            const snapshot = await userRef.once("value");
            if (snapshot.exists()) {
              await userEventRef.push().set({
                timestamp: admin.database.ServerValue.TIMESTAMP,
                message: `${matchingUserPin.pinData.createdBy} ${eventType}`,
                eventType: matchingUserPin.type,
                intercomNo: intercomNo,
                gateName: deviceName,
                isSeen: false
              });
            } else {
              console.log(`Path does not exist`);
            }

            const path = `property/${propertyId}/Property Resident/${matchingUser.userId}/TempPins`;

            // Check if the user's data path exists for Property Owner
            const propertyOwnerRef = admin.database().ref(`property/${propertyId}/Property Owner/${matchingUser.userId}/TempPins`);
            const propertyOwnerSnapshot = await propertyOwnerRef.once("value");

            if (propertyOwnerSnapshot.exists()) {
              // Remove temporary pin for Property Owner
              await propertyOwnerRef.child(matchingUserPin.pinName).remove();
            } else {
              // Remove temporary pin for Property Resident (fallback to default path)
              const removePinRef = admin.database().ref(path);
              await removePinRef.child(matchingUserPin.pinName).remove();
            }
          }



          res.status(200).json({
            message: "Pin matched successfully",
            sensorCheck: updateResult.sensorCheck,
            userId: matchingUser.userId,
            pinName: matchingUserPin.pinData.name
          });
        } else if (updateResult.status === 400) {
          res.status(updateResult.status).json({
            error: updateResult.message,
            sensorCheck: updateResult.sensorCheck,
          });
        }
      } else if (
        matchingUser &&
        (matchingUser.userData.status === "suspended" ||
          matchingUser.userData.status === "inactive")
      ) {
        res.status(404).json({ error: "Sorry you cannot access the door" });
      } else {
        res.status(404).json({ error: "Wrong Pin Entered" });
      }
    } else {
      res.status(404).json({ error: "Wrong Pin Entered" });
    }



  } catch (error) {
    console.error("Error in accessing pins:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }

};






const AddNotification = async (req, res) => {
  try {
    const { message, userPhoneNumber, userEmail, totalUsers } = req.body;

    // Validate the request body
    if (!message || !userPhoneNumber || !userEmail || !totalUsers) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("Adding notifications...");

    const notificationsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/notifications/unRead");

    // Create the new notification object with the current timestamp
    const newNotification = {
      message,
      timestamp: Date.now(), // Current timestamp in milliseconds
      userPhoneNumber,
      userEmail,
      totalUsers,
    };

    // Push the new notification to the unRead node
    const newNotificationRef = notificationsRef.push();
    await newNotificationRef.set(newNotification);

    console.log("Notification added to 'unRead' successfully");

    res.status(200).json({ message: "Notification added to 'unRead' successfully" });
  } catch (error) {
    console.error("Error adding notification:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};















const UpdateNotifications = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { propertyId } = req.query;
    console.log("Adding notifications...");
    const notificationsRef = admin
      .database()
      .ref(`/property/${propertyId}/commercialAdmin/notifications`);

    const unReadRef = notificationsRef.child("unRead");
    const readRef = notificationsRef.child("read");

    // Fetch all unread notifications
    const unReadSnapshot = await unReadRef.once("value");
    const unReadNotifications = unReadSnapshot.val() || {};

    if (Object.keys(unReadNotifications).length > 0) {
      // Add all unread notifications to the read node
      await readRef.update(unReadNotifications);

      // Remove all unread notifications
      await unReadRef.remove();
    }

    console.log("Notifications moved to 'read' successfully");

    res.status(200).json({ message: "Notifications moved to 'read' successfully" });
  } catch (error) {
    console.error("Error adding notifications:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const GetNotifications = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { propertyId } = req.query;

    const notificationsRef = admin
      .database()
      .ref(`/property/${propertyId}/commercialAdmin/notifications`);

    // Fetch the notifications from both read and unRead folders
    const readSnapshot = await notificationsRef.child("read").once("value");
    const unReadSnapshot = await notificationsRef.child("unRead").once("value");

    // Get the data from the snapshots and convert to arrays
    const readNotifications = readSnapshot.val() ? Object.values(readSnapshot.val()) : [];
    const unReadNotifications = unReadSnapshot.val() ? Object.values(unReadSnapshot.val()) : [];

    // Calculate the total count of unread notifications
    const unreadCount = unReadNotifications.length;

    console.log("Notifications retrieved successfully");

    res.status(200).json({
      readNotifications,
      unReadNotifications,
      unreadCount,  // Include the count of unread notifications
    });
  } catch (error) {
    console.error("Error getting notifications:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
































module.exports = {
  signup,
  login,
  changePassword,
  GetComAdmin,
  //find property
  findProperty,
  //residents
  AddResidents,
  GetResidents,
  DeleteResident,
  UpdateResident,
  //pins
  AddPins,
  GetPins,
  DeletePins,
  UpdatePins,
  //setTimer
  setTimer,
  // Intercom
  AddInterComId,
  UpdateIntercomId,
  GetIntercoms,
  deleteIntercomId,
  //profile update
  updateUser,
  deleteUser,
  // Get Resident With PCB Id
  VisitorData,
  WelcomeMessage,
  UploadWallpaper,
  downloadQR,
  SaveBrightness,
  //Open Door with Pin code ,
  AccessDoorWithPin,
  OpenDoorWithPinResidential,
  // Events
  GetEvents,
  exportPdf,
  // Generate Ascci
  generateAscci,
  IncrementAscci,
  // create Token
  createToken,
  deleteToken,



  AddNotification,
  UpdateNotifications,
  GetNotifications,


};

// const AddResidents = async (req, res) => {
//   try {
//     const { com_prop_id } = req.params;

//     const residentsRef = admin
//       .database()
//       .ref(`/commercial/users/${com_prop_id}/users`);

//     // Extract data from the request body
//     const { name, lname, email, status } = req.body;
//     console.log(`${name}  ${lname} ${email} ${status}`);

//     // Push a new resident to the 'residents' collection
//     const newResidentRef = residentsRef.push({
//       name,
//       lname,
//       email,
//       status,
//     });
//     const userId = newResidentRef.key;
//     const residentDataWithUserId = {
//       userId,
//       name,
//       lname,
//       email,
//       status,
//     };

//     // Update the pushed data with the userId
//     newResidentRef.set(residentDataWithUserId);

//     const Allresidents = admin
//       .database()
//       .ref(`/commercial/users/${com_prop_id}/users`);

//     // Fetch data from the database
//     const snapshot = await Allresidents.once("value");
//     const residentsData = snapshot.val();

//     res.status(201).json({
//       message: "Resident added successfully",
//       residents: residentsData,
//     });
//   } catch (error) {
//     console.error("Error in adding resident:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


// const generatePdf = async (EventData, fromDate, toDate) => {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument();
//     const fileName = `events.pdf`;
//     const stream = fs.createWriteStream(fileName);
//     doc.pipe(stream);

//     const tableData = [];

//     for (const eventId in EventData) {
//       const event = EventData[eventId];
//       const timestamp = new Date(event.timestamp);

//       if (timestamp >= new Date(fromDate) && timestamp <= new Date(toDate)) {
//         tableData.push([event.message || "", timestamp.toLocaleString()]);
//       }
//     }

//     const table = {
//       headers: ["Event Message", "Timestamp"],
//       rows: tableData,
//     };

//     console.log(table);

//     doc.on("pageAdded", () => {
//       doc.table(table, { columnsSize: [200, 200] });
//     });

//     doc.addPage();

//     doc.end();

//     stream.on("finish", () => {
//       console.log(`PDF generated: ${fileName}`);
//       resolve(); // Resolve the promise when PDF generation is complete
//     });

//     stream.on("error", (error) => {
//       console.error("Error generating PDF:", error);
//       reject(error); // Reject the promise if there is an error
//     });
//   });
// };