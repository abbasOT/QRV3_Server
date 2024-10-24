const admin = require("firebase-admin");
const QRCode = require("qrcode");
const { rtdb, auth } = require('../db'); // Importing the necessary modules from db.js

const login = async (req, res) => {
  const { values } = req.body;
  const email = values.email;
  const password = values.password
  console.log(email);
  const usersRef = admin
    .database()
    .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1");
  let matchedUser = null;

  // Check the "Users" location first

  await usersRef.once("value", (snapshot) => {
    const usersData = snapshot.val();
    console.log(usersData?.email, "email");
    console.log(usersData?.password, "password");
    console.log(usersData, "usersData");

    if (usersData.email == email && usersData.password == password) {
      matchedUser = usersData;
    }
  });
  if (matchedUser) {
    // Authentication successful
    res.json({ message: "Login successful", user: matchedUser });
  } else {
    // Authentication failed
    res.status(401).json({ message: "Invalid credentials" });
  }
};

//DashboardData
const dashboardData = async (req, res) => {
  try {

    const appUsersRef = admin.database().ref("/property");
    const appUsersSnapshot = await appUsersRef.once("value");
    const allProperties = appUsersSnapshot.val();


    let propertyOwnerCount = 0;

    // Iterate through each property
    Object.values(allProperties).forEach((property) => {
      if (property['Property Owner']) {
        propertyOwnerCount++;
      }
    });


    let totalCommercialResidents = 0;
    let subscribedResidentsCount = 0;
    let unsubscribedResidentsCount = 0;

    // Initialize counts for property residents
    let totalPropertyResidents = 0;
    let subscribedPropertyResidentsCount = 0;
    let totalUnsubscribedPropertyResidents = 0;

    // Iterate through each property
    Object.values(allProperties).forEach((property) => {
      // Handle commercial residents
      const commercialResidents = property.commercialResidents;
      if (commercialResidents) {
        totalCommercialResidents += Object.keys(commercialResidents).length;
        Object.values(commercialResidents).forEach((resident) => {
          if (resident.isSubscriptionCancelled === "true" || !resident.isSubscriptionCancelled) {
            unsubscribedResidentsCount++;
          } else if (resident.isSubscriptionCancelled === "false") {
            subscribedResidentsCount++;
          }
        });
      }

      // Handle property residents
      const propertyResidents = property["Property Resident"]; // Use bracket notation for keys with spaces
      if (propertyResidents) {
        totalPropertyResidents += Object.keys(propertyResidents).length;
      }

      // Handle property Owner
      const propertyOwners = property["Property Owner"]; // Use bracket notation for keys with spaces
      if (propertyOwners) {
        Object.values(propertyOwners).forEach((owner) => {
          if (owner.isSubscriptionCancelled === "true" || !owner.isSubscriptionCancelled) {
            totalUnsubscribedPropertyResidents++;
          } else if (owner.isSubscriptionCancelled === "false") {
            subscribedPropertyResidentsCount++;
          }
        });
      }

    });







    const commercialPropertiesRef = admin.database().ref("/commercial");
    const commercialPropertiesSnapshot = await commercialPropertiesRef.once("value");
    const properties = commercialPropertiesSnapshot.val();

    // Filter out properties with keys not starting with "commercial-"

    const filteredProperties = filterProperties("commercial-", properties);

    console.log(filteredProperties, "the properties of commerical node")

    const propertiesWithId = [];
    const propertiesWithoutId = [];

    Object.values(filteredProperties).forEach((property) => {
      if (property.propertyId) {
        propertiesWithId.push(property);
      } else {
        propertiesWithoutId.push(property);
      }
    });

    // Count the properties with and without a propertyId
    const commercialCountWithId = propertiesWithId.length;
    const commercialCountWithoutId = propertiesWithoutId.length;



    const pcbsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs");
    const pcbsSnapshot = await pcbsRef.once("value");
    const pcbsData = pcbsSnapshot.val();
    const totalStandByPCBs = pcbsData ? Object.keys(pcbsData).length : 0;


    const superAdminPropertiesRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties");
    const standByPropertiesSnapshot = await superAdminPropertiesRef.once("value");
    const standByPropertiesData = standByPropertiesSnapshot.val();
    const totalStandByProperties = standByPropertiesData ? Object.keys(standByPropertiesData).length : 0;


    res.json({

      totalResidentialProperties: propertyOwnerCount,
      totalPropertyResidents: totalPropertyResidents,
      totalUnsubscribedPropertyResidents: totalUnsubscribedPropertyResidents,

      totalCommercialResidents: totalCommercialResidents,
      subscribedResidentsCount: subscribedResidentsCount,
      unsubscribedResidentsCount: unsubscribedResidentsCount,
      totalStandByPCBs: totalStandByPCBs,
      totalStandByProperties: totalStandByProperties,
      commercialCountWithId: commercialCountWithId,
      commercialCountWithoutId: commercialCountWithoutId,

    });
  } catch (error) {
    console.error("Error getting properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;

    // Validate if propertyId exists
    if (!propertyId) {
      return res.status(400).json({ error: "Property ID is required" });
    }

    const standByPropertiesRef = admin.database().ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties/${propertyId}`)

    const standByPropertiesSnapshot = await standByPropertiesRef.once("value");

    if (standByPropertiesSnapshot.exists()) {
      return res.status(400).json({ error: "Property with this ID already exists" });
    }


    const runningPropertiesRef = admin.database().ref(`/property`)

    const runningPropertiesSnapshot = await runningPropertiesRef
      .child(propertyId)
      .once("value");

    if (runningPropertiesSnapshot.exists()) {
      return res.status(400).json({ error: "Property with this ID already exists" });
    }


    const propertiesRef = admin.database().ref("superadminit38XGIc27Q8HDXoZwe1OzI900u1/Properties");
    const propertySnapshot = await propertiesRef
      .child(propertyId)
      .once("value");

    if (propertySnapshot.exists()) {
      // Property with the given propertyId already exists
      return res
        .status(400)
        .json({ error: "Property with this ID already exists" });
    }

    // Generate the QR code
    // const qrCodeData = `https://192.168.18.68:3000/commercial/${propertyId}`;
    // const qrCodeFilePath = "path-to-save-qr-code.png";

    // await QRCode.toFile(qrCodeFilePath, qrCodeData);

    // // Upload the QR code to Firebase Storage
    // const storage = admin.storage().bucket();
    // await storage.upload(qrCodeFilePath, {
    //   destination: qrCodeFilePath,
    // });

    // // Get the download URL for the QR code
    // const [downloadURL] = await storage.file(qrCodeFilePath).getSignedUrl({
    //   action: "read",
    //   expires: "01-01-2030", // Adjust the expiration date as needed
    // });

    // Save the propertyId along with QR URL under "Properties" node
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    await propertiesRef.child(propertyId).set({
      propertyId: propertyId,
      status: "inactive",
      createdAt: formattedDate,
      // QRurl: downloadURL,
    });

    // Respond with success and properties data
    const snapshot = await propertiesRef.once("value");
    const propertiesData = snapshot.val();

    res.json({
      message: "Property created successfully",
      properties: propertiesData,
    });
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProperties = async (req, res) => {
  try {
    const propertiesRef = admin.database().ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/Properties");

    // Retrieve the properties from "Properties" node
    const snapshot = await propertiesRef.once("value");
    const propertiesData = snapshot.val();

    res.json({ properties: propertiesData });
  } catch (error) {
    console.error("Error getting properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const propertiesRef = admin.database().ref(`superadminit38XGIc27Q8HDXoZwe1OzI900u1/Properties/${propertyId}`);
    const snapshot = await propertiesRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Property not found" });
    }

    await propertiesRef.remove();

    const allPropertiesRef = admin.database().ref("superadminit38XGIc27Q8HDXoZwe1OzI900u1/Properties");
    const allPropertiesSnapshot = await allPropertiesRef.once("value");
    const allPropertiesData = allPropertiesSnapshot.val();
    // console.log(propertiesData);
    res.json({
      message: "Property deleted successfully",
      properties: allPropertiesData,
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const originalPropertiesRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/Properties/${propertyId}`);
    const standbyPropertiesRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties/${propertyId}`);

    // Get the property data from the original location
    const snapshot = await originalPropertiesRef.once("value");
    const propertyData = snapshot.val();


    // Check if propertyData exists before proceeding
    if (!propertyData) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Create the updated property data with the new status
    const updatedPropertyData = {
      ...propertyData,
      status: "standby",
    };

    // Update the property data in the standby location
    await standbyPropertiesRef.set(updatedPropertyData);

    // After the update is successful, remove the property from the original location
    await originalPropertiesRef.remove();


    const allPropertiesRef = admin.database().ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/Properties");
    const allPropertiesSnapshot = await allPropertiesRef.once("value");
    const allPropertiesData = allPropertiesSnapshot.val();


    return res.json({
      message: "Property updated successfully",
      properties: allPropertiesData,
    });
  } catch (error) {
    console.error("Error in updateProperty:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getStandbyProperties = async (req, res) => {
  try {
    const propertiesRef = admin.database().ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties");

    // Retrieve the properties from "Properties" node
    const snapshot = await propertiesRef.once("value");
    const propertiesData = snapshot.val();

    res.json({ properties: propertiesData });
  } catch (error) {
    console.error("Error getting properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteStandbyProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    console.log(propertyId);
    const propertiesRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties/${propertyId}`);
    const snapshot = await propertiesRef.once("value");
    console.log(snapshot);
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Property not found" });
    }

    await propertiesRef.remove();

    const allPropertiesRef = admin.database().ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByProperties");
    const allPropertiesSnapshot = await allPropertiesRef.once("value");
    const allPropertiesData = allPropertiesSnapshot.val();
    // console.log(propertiesData);
    res.json({
      message: "Property deleted successfully",
      properties: allPropertiesData,
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PCB Controllars

const createPCB = async (req, res) => {
  try {

    const { pcbId } = req.body;

    // Validate if pcbId already exists



    const runningPcbsRef = admin.database().ref(`/PCB/${pcbId}`)

    const runningPcbsSnapshot = await runningPcbsRef.once("value");

    if (runningPcbsSnapshot.exists()) {
      return res.status(400).json({ error: "PCB with this ID already exists" });
    }


    const standByPcbsRef = admin.database().ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs/${pcbId}`)

    const standByPcbsSnapshot = await standByPcbsRef.once("value");

    if (standByPcbsSnapshot.exists()) {
      return res.status(400).json({ error: "PCB with this ID already exists" });
    }

    const pcbsRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs/${pcbId}`);
    const pcbSnapshot = await pcbsRef.once("value");

    if (pcbSnapshot.exists()) {
      return res.status(400).json({ error: "PCB with this ID already exists" });
    }

    const qrCodeData = `https://ot-technologies.com/property/${pcbId}`;
    const qrCodeFilePath = `qr_code.png`;
    const storageFilePath = `qr_codes/${pcbId}.png`;
    await QRCode.toFile(qrCodeFilePath, qrCodeData);

    // Upload the QR code to Firebase Storage
    const storage = admin.storage().bucket();
    await storage.upload(qrCodeFilePath, {
      destination: storageFilePath,
    });

    // Get the download URL for the QR code
    const [downloadURL] = await storage.file(storageFilePath).getSignedUrl({
      action: "read",
      expires: "01-01-2030", // Adjust the expiration date as needed
    });

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    await pcbsRef.set({
      pcbId,
      status: "inactive",
      isOnline: false,
      createdAt: formattedDate,
      QRurl: downloadURL,
      sensor: "0",
    });

    const AllpcbsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs");
    const pcbsSnapshot = await AllpcbsRef.once("value");
    const pcbsData = pcbsSnapshot.val();

    res.json({ message: "PCB created successfully", pcbs: pcbsData || [] });
  } catch (error) {
    console.error("Error creating PCB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPCBs = async (req, res) => {
  try {
    // Fetch all PCBs under the PCBs node
    const pcbsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs");
    const pcbsSnapshot = await pcbsRef.once("value");
    const pcbsData = pcbsSnapshot.val();

    res.json({ pcbs: pcbsData || [] });
  } catch (error) {
    console.error("Error fetching PCBs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deletePCB = async (req, res) => {
  try {
    const { pcbId } = req.params;

    // Validate if PCB with pcbId exists
    const pcbRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs/${pcbId}`);
    const pcbSnapshot = await pcbRef.once("value");

    if (!pcbSnapshot.exists()) {
      return res.status(404).json({ error: "PCB not found" });
    }

    // Delete the PCB
    await pcbRef.remove();

    // Fetch the updated list of PCBs after deletion
    const allPCBsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs");
    const allPCBsSnapshot = await allPCBsRef.once("value");
    const allPCBsData = allPCBsSnapshot.val();
    console.log(allPCBsData);
    res.json({
      message: "PCB deleted successfully",
      pcbs: allPCBsData,
    });
  } catch (error) {
    console.error("Error deleting PCB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updatePCB = async (req, res) => {
  try {
    const { pcbId } = req.params;
    const originalPCBRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs/${pcbId}`);
    const standbyPCBRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs/${pcbId}`);

    // Get the property data from the original location
    const snapshot = await originalPCBRef.once("value");
    const PCBData = snapshot.val();


    if (!PCBData) {
      return res.status(404).json({ error: "Pcb data not found" });
    }


    const updatedPCBData = {
      ...PCBData,
      status: "standby",
    };

    await standbyPCBRef.set(updatedPCBData);

    console.log(PCBData);
    console.log("  pcb data ");
    const allPCBsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/PCBs");
    const allPCBsSnapshot = await allPCBsRef.once("value");
    const allPCBsData = allPCBsSnapshot.val();


    // Update the status field to "standby" in the original location
    await originalPCBRef.remove();

    return res.json({
      message: "PCB updated successfully",
      pcbs: allPCBsData,
    });
  } catch (error) {
    console.error("Error in updateProperty:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getStandbyPCBs = async (req, res) => {
  try {
    // Fetch all PCBs under the PCBs node
    const pcbsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs");
    const pcbsSnapshot = await pcbsRef.once("value");
    const pcbsData = pcbsSnapshot.val();

    res.json({ pcbs: pcbsData || [] });
  } catch (error) {
    console.error("Error fetching PCBs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteStandbyPCB = async (req, res) => {
  try {
    const { pcbId } = req.params;

    // Validate if PCB with pcbId exists
    const pcbRef = admin
      .database()
      .ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs/${pcbId}`);
    const pcbSnapshot = await pcbRef.once("value");

    if (!pcbSnapshot.exists()) {
      return res.status(404).json({ error: "PCB not found" });
    }

    // Delete the PCB
    await pcbRef.remove();

    // Fetch the updated list of PCBs after deletion
    const allPCBsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs");
    const allPCBsSnapshot = await allPCBsRef.once("value");
    const allPCBsData = allPCBsSnapshot.val();
    console.log(allPCBsData);
    res.json({
      message: "PCB deleted successfully",
      pcbs: allPCBsData,
    });
  } catch (error) {
    console.error("Error deleting PCB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//
const getCommercialProperties = async (req, res) => {
  try {
    // Fetch all PCBs under the commercial node
    const propertiesRef = admin.database().ref("/commercial");
    const propertiesSnapshot = await propertiesRef.once("value");
    const properties = propertiesSnapshot.val();

    // Filter out properties with keys not starting with "commercial-"

    const filteredProperties = filterProperties("commercial", properties);

    res.json({ properties: filteredProperties });
  } catch (error) {
    console.error("Error fetching commercial properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteCommercialProperties = async (req, res) => {
  try {
    const { com_prop_id } = req.params;

    const propertiesRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const propertiesSnapshot = await propertiesRef.once("value");
    const adminData = propertiesSnapshot.val();
    const eventsRef = admin.database().ref(`/commercial/events/${com_prop_id}`);
    if (!propertiesSnapshot.exists()) {
      return res.status(404).json({ error: "property not found" });
    }

    //   if (adminData.pcbId) {
    //     await movePCBToStandBy(adminData.pcbId, adminData);
    //     delete adminData.propertyId;
    //     delete adminData.pcbId;
    //     await propertiesRef.set(adminData);
    //     if (eventsRef) {
    //       await eventsRef.remove();
    //     }
    // }else{
    //   delete adminData.propertyId;
    //   await propertiesRef.set(adminData);
    //   if (eventsRef) {
    //     await eventsRef.remove();
    //   }
    // }


    await updateUsersStatus("commercial", com_prop_id, "inactive", false);

    // await propertiesRef.update({ status: "deleted" });
    // Delete the PCB
    await propertiesRef.remove();
    const allpropertiesRef = admin.database().ref("/commercial");
    const allpropSnapshot = await allpropertiesRef.once("value");
    const properties = allpropSnapshot.val();

    // Filter out properties with keys not starting with "commercial-"
    const filteredProperties = filterProperties("commercial-", properties);

    res.json({
      message: "property deleted successfully",
      properties: filteredProperties,
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




const deleteCommercialAdmin = async (req, res) => {
  try {
    const { com_prop_id } = req.params;
    const { propertyId } = req.query;

    // Your logic to delete the user, for example:
    const userRef = admin.database().ref(`/commercial/${com_prop_id}`);
    // const usersComRef = admin.database().ref(`/users/${com_prop_id}`);
    const commercialAdminRef = admin.database().ref(`/property/${propertyId}`);


    await userRef.remove();
    // await usersComRef.remove();
    await commercialAdminRef.remove();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


















const getAppUsers = async (req, res) => {
  const db = admin.database();
  try {
    const usersRef = db.ref("/users");
    const usersSnapshot = await usersRef.once("value");
    const usersData = usersSnapshot.val();

    // Collect user information including name, last name, email, address, and phone
    const userInfoList = Object.values(usersData || {}).map((user) => ({
      userId: user?.uid || user?.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      address: user.address || "",
      phone: user.phone || "",
      isSubscriptionCancelled: user.isSubscriptionCancelled || "",
    }));

    const propertiesRef = db.ref("/property");
    const propertiesSnapshot = await propertiesRef.once("value");
    const propertiesData = propertiesSnapshot.val();

    const emailPropertyAssociations = {};
    const allCommercialResidentEmails = new Set();
    const allPropertyResidentEmails = new Set();

    // Iterate through each property to find emails and intercom IDs
    Object.entries(propertiesData || {}).forEach(([propertyId, propertyData]) => {
      const adminNodes = ["commercialAdmin", "Property Owner"];
      const residentNodes = ["commercialResidents", "Property Resident"];

      // Check commercialAdmin and Property Owner nodes for email matches
      adminNodes.forEach((node) => {
        const nodeData = propertyData[node];

        if (nodeData) {
          console.log(`Checking node: ${node} for property: ${propertyId}`); // Debug log
          if (node === "commercialAdmin") {
            Object.values(nodeData).forEach((email) => {
              console.log(`Found email in ${node}: ${email}`); // Debug log

              if (!emailPropertyAssociations[email]) {
                emailPropertyAssociations[email] = {
                  adminCount: 0,
                  commercialResidentCount: 0,
                  propertyResidentCount: 0,
                  properties: new Set(),
                  intercomIDs: new Set(),
                  propertyDetails: [], // Use array to store property details
                };
              }

              emailPropertyAssociations[email].adminCount += 1;
              emailPropertyAssociations[email].properties.add(propertyId);
              emailPropertyAssociations[email].propertyDetails.push({
                propertyId,
                propertyName: "commercialAdmin",
              });

              // Collect intercom IDs based on property
              const intercomsData = propertyData["intercoms"];
              if (intercomsData) {
                Object.keys(intercomsData).forEach((intercomId) => {
                  emailPropertyAssociations[email].intercomIDs.add(intercomId);
                });
              }
            });
          } else if (node === "Property Owner") {
            Object.entries(nodeData).forEach(([nodeId, nodeInfo]) => {
              const email = nodeInfo.email;
              console.log(`Found email in ${node}: ${email}`); // Debug log

              if (email) {
                if (!emailPropertyAssociations[email]) {
                  emailPropertyAssociations[email] = {
                    adminCount: 0,
                    commercialResidentCount: 0,
                    propertyResidentCount: 0,
                    properties: new Set(),
                    intercomIDs: new Set(),
                    propertyDetails: [], // Use array to store property details
                  };
                }

                emailPropertyAssociations[email].adminCount += 1;
                emailPropertyAssociations[email].properties.add(propertyId);
                emailPropertyAssociations[email].propertyDetails.push({
                  propertyId,
                  propertyName: "Property Owner",
                });

                // Collect intercom IDs based on property
                const intercomsData = propertyData["intercoms"];
                if (intercomsData) {
                  Object.keys(intercomsData).forEach((intercomId) => {
                    emailPropertyAssociations[email].intercomIDs.add(intercomId);
                  });
                }
              }
            });
          }
        } else {
          console.log(`Node ${node} does not exist for property ${propertyId}`); // Debug log
        }
      });

      // Check commercialResidents and Property Resident nodes for email matches
      residentNodes.forEach((node) => {
        const nodeData = propertyData[node];

        if (nodeData) {
          Object.entries(nodeData).forEach(([nodeId, nodeInfo]) => {
            const email = nodeInfo.email;

            if (email) {
              if (node === "commercialResidents") {
                allCommercialResidentEmails.add(email);
                if (!emailPropertyAssociations[email]) {
                  emailPropertyAssociations[email] = {
                    adminCount: 0,
                    commercialResidentCount: 0,
                    propertyResidentCount: 0,
                    properties: new Set(),
                    intercomIDs: new Set(),
                    propertyDetails: [], // Use array to store property details
                  };
                }
                emailPropertyAssociations[email].commercialResidentCount += 1;
                emailPropertyAssociations[email].properties.add(propertyId);
                emailPropertyAssociations[email].propertyDetails.push({
                  propertyId,
                  propertyName: "commercialResidents",
                });
              } else if (node === "Property Resident") {
                allPropertyResidentEmails.add(email);
                if (!emailPropertyAssociations[email]) {
                  emailPropertyAssociations[email] = {
                    adminCount: 0,
                    commercialResidentCount: 0,
                    propertyResidentCount: 0,
                    properties: new Set(),
                    intercomIDs: new Set(),
                    propertyDetails: [], // Use array to store property details
                  };
                }
                emailPropertyAssociations[email].propertyResidentCount += 1;
                emailPropertyAssociations[email].properties.add(propertyId);
                emailPropertyAssociations[email].propertyDetails.push({
                  propertyId,
                  propertyName: "Property Resident",
                });
              }
            }
          });
        }
      });
    });

    // Convert Sets to Arrays for logging
    for (const email in emailPropertyAssociations) {
      emailPropertyAssociations[email].properties = Array.from(
        emailPropertyAssociations[email].properties
      );
      emailPropertyAssociations[email].intercomIDs = Array.from(
        emailPropertyAssociations[email].intercomIDs
      );
    }

    // Log user information along with property association details
    userInfoList.forEach((user) => {
      const { isSubscriptionCancelled, firstName, lastName, email, address, phone, userId } = user;
      const associations = emailPropertyAssociations[email] || {
        adminCount: 0,
        commercialResidentCount: 0,
        propertyResidentCount: 0,
        properties: [],
        intercomIDs: [],
        propertyDetails: [],
      };

      console.log(
        `User: ${firstName}, lastName: ${lastName}, Email: ${email}, Address: ${address}, Phone: ${phone}, ${isSubscriptionCancelled}, ${userId}`
      );
      console.log(`Associated with properties:`, associations.properties);
      console.log(`Property Details:`, associations.propertyDetails);
      console.log(`Admin Count:`, associations.adminCount);
      console.log(`Commercial Resident Count:`, associations.commercialResidentCount);
      console.log(`Property Resident Count:`, associations.propertyResidentCount);

      if (associations.adminCount > 0) {
        console.log(`All Commercial Resident Emails:`, Array.from(allCommercialResidentEmails));
        console.log(`All Property Resident Emails:`, Array.from(allPropertyResidentEmails));
      } else {
        console.log(`Associated Resident Emails:`, Array.from(associations.associatedResidentEmails || []));
      }

      console.log(`Intercom IDs:`, associations.intercomIDs);
      console.log(`------------------------`);
    });

    const responseData = userInfoList.map((user) => {
      const { firstName, lastName, email, address, phone, isSubscriptionCancelled, userId } = user;
      const associations = emailPropertyAssociations[email] || {
        adminCount: 0,
        commercialResidentCount: 0,
        propertyResidentCount: 0,
        properties: [],
        intercomIDs: [],
        propertyDetails: [],
      };

      // Check if all counts are zero and add withoutId property
      const withoutId = (associations.adminCount === 0 &&
        associations.commercialResidentCount === 0 &&
        associations.propertyResidentCount === 0) ? "true" : "false";

      const associatedResidentEmails = [];

      associations.propertyDetails.forEach((detail) => {
        if (detail.propertyName === "commercialAdmin") {
          // Filter commercial resident emails for this specific property
          const propertyData = propertiesData[detail.propertyId];
          if (propertyData && propertyData.commercialResidents) {
            Object.values(propertyData.commercialResidents).forEach((resident) => {
              if (resident.email) {
                associatedResidentEmails.push(resident.email);
              }
            });
          }
        } else if (detail.propertyName === "Property Owner") {
          // Filter property resident emails for this specific property
          const propertyData = propertiesData[detail.propertyId];
          if (propertyData && propertyData["Property Resident"]) {
            Object.values(propertyData["Property Resident"]).forEach((resident) => {
              if (resident.email) {
                associatedResidentEmails.push(resident.email);
              }
            });
          }
        }
      });

      return {
        user: {
          firstName,
          lastName,
          email,
          address,
          phone,
          withoutId,
          isSubscriptionCancelled,
          userId
        },
        associations: {
          propertyDetails: associations.propertyDetails, // Add property details array
          adminCount: associations.adminCount,
          commercialResidentCount: associations.commercialResidentCount,
          propertyResidentCount: associations.propertyResidentCount,

          associatedResidentEmails,

          intercomIDs: associations.intercomIDs,
        }
      };
    });

    console.log(responseData); // Log the data being sent in the response

    res.status(200).json({
      message: "User email associations, resident emails, and intercom IDs included in response.",
      data: responseData
    });
  } catch (error) {
    console.error("Error getting app users property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




const deleteAppUser = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from request parameters

    console.log("Deleting app user:", userId);

    // Check if the userId starts with "commercial"
    if (!userId.startsWith('commercial')) {
      // Delete the user from Firebase Authentication
      await auth.deleteUser(userId);
      console.log("User deleted from Authentication");
    } else {
      console.log("Skipping Authentication delete for commercial user");
    }

    const userRef = rtdb.ref(`/users/${userId}`);
    const commercialRef = rtdb.ref(`/commercial/${userId}`);
    const propertyRef = rtdb.ref(`/property`);


    // Function to check and delete parent property node if userId is found in commercialAdmin
    const checkAndDeleteCommercialAdmin = async (parentNode) => {
      const snapshot = await parentNode.once('value');
      const properties = snapshot.val();

      for (const propId in properties) {
        if (properties.hasOwnProperty(propId)) {
          const node = properties[propId]['commercialAdmin'];
          if (node && node['id'] === userId) {
            await parentNode.child(propId).remove();
            console.log(`Deleted property node: ${propId} (commercialAdmin)`);
          }
        }
      }
    };

    // Function to check and delete parent property node if userId is found in Property Owner
    const checkAndDeletePropertyOwner = async (parentNode) => {
      const snapshot = await parentNode.once('value');
      const properties = snapshot.val();

      for (const propId in properties) {
        if (properties.hasOwnProperty(propId)) {
          const node = properties[propId]['Property Owner'];
          if (node && node[userId]) {
            await parentNode.child(propId).remove();
            console.log(`Deleted property node: ${propId} (Property Owner)`);
          }
        }
      }
    };

    // Function to delete only userId node in specified childNode
    const deleteUserIdNode = async (parentNode, childNode) => {
      const snapshot = await parentNode.once('value');
      const properties = snapshot.val();

      for (const propId in properties) {
        if (properties.hasOwnProperty(propId)) {
          const node = properties[propId][childNode];
          if (node && node[userId]) {
            await parentNode.child(`${propId}/${childNode}/${userId}`).remove();
            console.log(`Deleted userId node in property: ${propId}`);
          }
        }
      }
    };

    // Check and delete nodes in propertyRef
    await Promise.all([
      checkAndDeleteCommercialAdmin(propertyRef),
      checkAndDeletePropertyOwner(propertyRef),
      deleteUserIdNode(propertyRef, 'commercialResidents'),
      deleteUserIdNode(propertyRef, 'Property Resident'),
      userRef.remove(),
      commercialRef.remove(),
    ]);

    console.log("User data removed from Database");

    res.json({
      message: "appUser deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting appUser:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};





const movePCBToStandBy = async (pcbId, adminData) => {
  try {
    // Reference to the PCB node
    const PCBRef = admin.database().ref(`/PCB/${pcbId}`);
    const pcbSnapshot = await PCBRef.once("value");
    const pcbData = pcbSnapshot.val();
    if (pcbData?.propertyId) {
      delete pcbData.propertyId;
    }

    const StandByPCBRef = admin.database().ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1/StandByPCBs/${pcbId}`);
    await StandByPCBRef.set(pcbData);
    await PCBRef.remove();
    return pcbData;
  } catch (error) {
    console.error("Error moving PCB to StandBy:", error);
    throw error;
  }
};
//
function filterProperties(prefix, properties) {

  return Object.entries(properties || {})
    .filter(([key, value]) => key.startsWith(prefix) && value.status !== "deleted")
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

//-[]

const getResidentialProperties = async (req, res) => {
  try {
    // Fetch all PCBs under the commercial node
    const propertiesRef = admin.database().ref("/residential");
    const propertiesSnapshot = await propertiesRef.once("value");
    const properties = propertiesSnapshot.val();

    // Ensure filterProperties returns an array
    const filteredProperties = filterProperties("resident", properties) || [];

    // Define the required fields
    const requiredFields = [
      "LastName",
      "QRurl",
      "UserName",
      "address",
      "email",
      "id",
      "number",
      "opacity",
      "password",
      "payment",
      "propertyId",
      "status"
    ];
    console.log(properties)
    // Filter the properties
    const filtered = Object.values(filteredProperties).filter(property => {
      // Check for existence of required fields
      return requiredFields.every(field => property.hasOwnProperty(field));
    });

    res.json({ properties: filtered });
  } catch (error) {
    console.error("Error fetching commercial properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const deleteResidentialProperties = async (req, res) => {
  try {
    const { res_prop_id } = req.params;
    console.log(res_prop_id);
    // Validate if PCB with pcbId exists
    const propertiesRef = admin.database().ref(`/residential/${res_prop_id}`);
    const propertiesSnapshot = await propertiesRef.once("value");
    const adminData = propertiesSnapshot.val();
    const eventsRef = admin.database().ref(`/residential/users/${res_prop_id}/events`);
    if (!propertiesSnapshot.exists()) {
      return res.status(404).json({ error: "property not found" });
    }
    //   if (adminData.pcbId) {
    //     await movePCBToStandBy(adminData.pcbId, adminData);
    //     delete adminData.propertyId;
    //     delete adminData.pcbId;
    //     await propertiesRef.set(adminData);
    //     if (eventsRef) {
    //       await eventsRef.remove();
    //     }
    // }
    if (eventsRef) {
      await eventsRef.remove();
    }

    const AdminUserRef = admin
      .database()
      .ref(`/residential/users/${res_prop_id}`);
    // await updateUsersStatus("residential",res_prop_id,"inactive",false);
    // Delete the PCB
    await AdminUserRef.remove()
    await propertiesRef.remove();
    // await propertiesRef.update({ status: "deleted" });

    // Fetch the updated list of PCBs after deletion
    const allpropertiesRef = admin.database().ref("/residential");
    const allpropSnapshot = await allpropertiesRef.once("value");
    const properties = allpropSnapshot.val();

    const filteredProperties = filterProperties("resident", properties);

    res.json({
      message: "property deleted successfully",
      properties: filteredProperties,
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//subscription

const SuscriptionData = async (req, res) => {
  try {
    const comRef = admin.database().ref("/commercial");
    const comsnapshot = await comRef.once("value");
    const comData = comsnapshot.val();
    let activeCount = 0;
    let inactiveCount = 0;
    let totalComUsers = 0;

    let comUsers = [];
    let resUsers = [];
    let AdminsSet = new Set();
    if (comData) {
      Object.keys(comData).forEach((key) => {
        const status = comData[key].status;
        AdminsSet.add(comData[key]);

        if (status === "active") {
          activeCount++;
        } else if (status === "inactive") {
          inactiveCount++;
        } else {
          inactiveCount++;
        }
      });
      //status === "suspended"
      console.log("Number of active: ", activeCount);
      console.log("Number of inactive: ", inactiveCount);
    } else {
      console.log("No data found in /commercial");
    }

    const residentialRef = admin.database().ref("/residential");
    const residentialSnapshot = await residentialRef.once("value");
    const residentialData = residentialSnapshot.val();
    let residentialActiveCount = 0;
    let residentialInactiveCount = 0;

    if (residentialData) {
      Object.keys(residentialData).forEach((key) => {
        const status = residentialData[key].status;
        AdminsSet.add(residentialData[key]);
        if (status === "active") {
          residentialActiveCount++;
        } else if (status === "inactive") {
          residentialInactiveCount++;
        }
      });

      console.log("Number of active in residential: ", residentialActiveCount);
      console.log(
        "Number of inactive in residential: ",
        residentialInactiveCount
      );
    } else {
      console.log("No data found in /residential");
    }

    const commercialUsersRef = admin.database().ref("/commercial/users");
    const commercialUsersSnapshot = await commercialUsersRef.once("value");
    const commercialUsersData = commercialUsersSnapshot.val();
    if (commercialUsersData) {
      await Promise.all(
        Object.keys(commercialUsersData).map(async (commercialNodeId) => {
          const usersRef = admin
            .database()
            .ref(`/commercial/users/${commercialNodeId}/users`);
          const usersSnapshot = await usersRef.once("value");
          const usersData = usersSnapshot.val();

          if (usersData) {
            const totalUsers = Object.keys(usersData).length;
            console.log(
              `Total users for commercial node ${commercialNodeId}: `,
              totalUsers
            );
            for (const userId in usersData) {
              const user = usersData[userId];
              user.adminId = commercialNodeId;
              if (user.status === "active") {

              }
              if (user.firstName && user.email) {
                console.log(user)
                comUsers.push(user);
              }


            }
            totalComUsers += totalUsers;
          } else {
            console.log(
              `No users found for commercial node ${commercialNodeId}`
            );
          }
        })
      );

      console.log("Total users across all commercial nodes: ", totalComUsers);
    } else {
      console.log("No data found in /commercial/users");
    }

    const residentialUsersRef = admin.database().ref("/residential/users");
    const residentialUsersSnapshot = await residentialUsersRef.once("value");
    const residentialUsersData = residentialUsersSnapshot.val();
    let totalResidentialUsers = 0;

    if (residentialUsersData) {
      await Promise.all(
        Object.keys(residentialUsersData).map(async (residentialNodeId) => {
          const usersRef = admin
            .database()
            .ref(`/residential/users/${residentialNodeId}/users`);
          const usersSnapshot = await usersRef.once("value");
          const usersData = usersSnapshot.val();

          if (usersData) {
            const totalUsers = Object.keys(usersData).length;
            console.log(
              `Total users for residential node ${residentialNodeId}: `,
              totalUsers
            );
            for (const userId in usersData) {
              const user = usersData[userId];
              user.adminId = residentialNodeId;
              if (user.status === "active") {

              }
              if (user.firstName && user.email) {
                console.log(user)
                resUsers.push(user);
              }



            }

            totalResidentialUsers += totalUsers;
          } else {
            console.log(
              `No users found for residential node ${residentialNodeId}`
            );
          }
        })
      );

      console.log(
        "Total users across all residential nodes: ",
        totalResidentialUsers
      );
    } else {
      console.log("No data found in /residential/users");
    }


    const NonSubscriberResRef = admin.database().ref("/residential/waitingusers")
    const NonSubscriberResSnapshot = await NonSubscriberResRef.once("value");
    const NonSubscriberResData = NonSubscriberResSnapshot.val();

    const NonSubscriberComRef = admin.database().ref("/commercial/waitingusers");
    const NonSubscriberComSnapshot = await NonSubscriberComRef.once("value");
    const NonSubscriberComData = NonSubscriberComSnapshot.val();

    const NonSubscriberResLength = NonSubscriberResData ? Object.keys(NonSubscriberResData).length : 0;
    console.log(NonSubscriberResLength)
    console.log("NonSubscriberResLength")
    const NonSubscriberComLength = NonSubscriberComData ? Object.keys(NonSubscriberComData).length : 0;
    console.log(NonSubscriberComLength)
    console.log("NonSubscriberComLength")

    let ComNonSub = [];
    let ResNonSub = []
    for (const userId in NonSubscriberComData) {
      const user = NonSubscriberComData[userId];

      ComNonSub.push(user);

    }

    for (const userId in NonSubscriberResData) {
      const user = NonSubscriberResData[userId];

      ResNonSub.push(user);

    }

    let users = [
      ...comUsers.map((user) => ({ ...user, userInfo: "C" })),
      ...resUsers.map((user) => ({ ...user, userInfo: "R" })),
      ...ComNonSub.map((user) => ({ ...user, userInfo: "N\\S" })),
      ...ResNonSub.map((user) => ({ ...user, userInfo: "N\\S" }))
    ];

    let Admins = Array.from(AdminsSet);
    Admins = Admins.filter((user) => user.id);

    res.json({
      users: users,
      resUsers: resUsers,
      comUsers: comUsers,
      cominactiveCount: inactiveCount,
      residentialInactiveCount: residentialInactiveCount,
      totalComUsers: totalComUsers,
      totalResidentialUsers: totalResidentialUsers,
      comActive: activeCount,
      resActive: residentialActiveCount,
      nonSubcribers: NonSubscriberComLength + NonSubscriberResLength
    });
  } catch (error) {
    console.error("Error getting properties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//change Status
const changeStatus = async (req, res) => {
  try {
    const { prop_id } = req.params;
    const { minUserLicense, commericalPropertyId } = req.body;


    console.log(commericalPropertyId, "the property id ")



    // Assuming `pcbId` is part of propData, modify this according to your data structure
    const commercialRef = admin.database().ref(`/commercial/${prop_id}`);
    const usersRef = admin.database().ref(`/users/${prop_id}`);
    const commercialPropertyRef = admin.database().ref(`/property/${commericalPropertyId}/commercialAdmin`);


    const commercialSnapshot = await commercialRef.once("value");
    const commercialAdminData = commercialSnapshot.val();

    // Update the properties in the database
    await commercialRef.update({ minUserLicense: minUserLicense });
    await usersRef.update({ minUserLicense: minUserLicense });
    if (commericalPropertyId) {
      await commercialPropertyRef.update({ minUserLicense: minUserLicense });
    }


    // Optionally, you can send the updated data back as a response
    res.status(200).json({
      message: "Status updated successfully",
      commercialAdminData,
    });

  } catch (error) {
    console.error("Error changing status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



const moveUserToWaitingUsers = async (propType, userId, userData) => {
  try {
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

async function updateUsersStatus(property_type, prop_id, status, changeUserStatus) {
  console.log(965, changeUserStatus)
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

const deleteSubUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { property, adminId } = req.body;

    let path = "";
    let prop = ""
    if (property === "waiting") {

      if (userId.startsWith("resident")) {
        prop = "residential";
        prefix = "resident"
      } else if (userId.startsWith("commercial")) {
        prop = "commercial";

      }

      const path = `${prop}/waitingusers/${userId}`;
      const userRef = admin.database().ref(path);

      await userRef.remove();
      // Return a success response
      return res.status(200).json({ message: "User removed successfully" });

    } else {
      path = `/${property}/users/${adminId}/users/${userId}`;
    }

    console.log(property)


    // console.log(path);
    //     const StandByRef =admin.database().ref(`/${property}/waitingusers/${userId}`)
    //     // Construct a reference to the user
    const userRef = admin.database().ref(path);
    //     const userSnapshot = await userRef.once("value");
    //     const userData =  userSnapshot.val()
    //     await StandByRef.set(userData)
    // Perform the actual deletion
    await userRef.remove();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getUserLicenseCount = async (req, res) => {
  try {
    const { propId } = req.params;
    let property = "";
    let prefix = "";
    let path = "";

    if (propId.startsWith("resident")) {
      property = "residential";
      prefix = "resident";
      path = `${property}/users/${propId}/users`;
    } else if (propId.startsWith("commercial")) {
      property = "commercial";
      prefix = "commercial-";
      path = `${property}/users/${propId}/users`;
    }

    const usersRef = admin.database().ref(path);

    // Fetch the data once from the specified path
    usersRef.once("value", (snapshot) => {
      // Calculate the length of the object of users
      const userCount = snapshot.numChildren();

      // Respond with the user count
      res.status(200).json({ message: "User license count fetched successfully", licenseCount: userCount });
    });
  } catch (error) {
    console.error("Error fetching user license count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get user lincense count
const changePassword = async (req, res) => {
  try {

    const { oldpassword, newpassword } = req.body;
    console.log(oldpassword)
    // Check if the user ID and old password are provided
    if (!oldpassword) {
      return res
        .status(400)
        .json({ error: "old password is required" });
    }

    // Retrieve user data from the database based on the user ID
    const userRef = admin.database().ref(`/superadminit38XGIc27Q8HDXoZwe1OzI900u1`);
    const userSnapshot = await userRef.once("value");

    // Check if the user exists
    if (!userSnapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userSnapshot.val();

    // Check if the old password matches the stored password

    if (userData.password.toString() !== oldpassword) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    // Update the user's password with the new password
    await userRef.update({ password: newpassword });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error in changing password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};






const addNotification = async (req, res) => {
  try {
    console.log("Adding notifications...");

    const notificationsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/notifications");

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

const getNotifications = async (req, res) => {
  try {
    const notificationsRef = admin
      .database()
      .ref("/superadminit38XGIc27Q8HDXoZwe1OzI900u1/notifications");

    // Fetch the notifications from both read and unRead folders
    const unReadSnapshot = await notificationsRef.child("unRead").once("value");

    // Get the data from the snapshots
    const unReadNotifications = unReadSnapshot.val() || {};

    // Convert the unread notifications object to an array
    const unReadArray = Object.values(unReadNotifications);

    console.log(unReadArray, "the notifications i am looking for");

    // Return the unread notifications as an array
    res.status(200).json({ unRead: unReadArray });
  } catch (error) {
    console.error("Error getting notifications:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = {
  login,
  changePassword,
  dashboardData,
  createProperty,
  getProperties,
  deleteProperty,
  updateProperty,
  getStandbyProperties,
  deleteStandbyProperty,

  createPCB,
  getPCBs,
  deletePCB,
  updatePCB,
  getStandbyPCBs,
  deleteStandbyPCB,

  getCommercialProperties,
  getAppUsers,
  deleteAppUser,

  deleteCommercialProperties,
  deleteCommercialAdmin,

  getResidentialProperties,
  deleteResidentialProperties,
  SuscriptionData,
  changeStatus,
  deleteSubUser,
  //
  getUserLicenseCount,


  addNotification,
  getNotifications
};
