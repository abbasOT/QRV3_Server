// Import necessary modules
const admin = require('firebase-admin');

const checkAdminProperty = async (req, res, next) => {
  const { com_prop_id } = req.params;
  console.log(com_prop_id);
  console.log("in the middleware");
  try {
    if (!com_prop_id) {
      // If com_prop_id is missing, proceed to the next middleware or route handler
      return next();
    }

    const commercialRef = admin.database().ref(`/commercial/${com_prop_id}`);
    const snapshot = await commercialRef.once("value");
    const data = snapshot.val();
    
    if (!data || !data.propertyId) {
      return res.status(400).json({ login:true,message: "Your account has been blocked, please contact QR Doorman Support." });
    }

    console.log(data.propertyId);
    
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error checking admin property:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export the middleware function
module.exports = checkAdminProperty;

