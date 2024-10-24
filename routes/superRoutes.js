const express = require('express');
const router = express.Router();
const superController = require('../controllers/superController');

//super login
router.post('/login', superController.login);
//Dashboard 
router.get('/getdashboardData', superController.dashboardData);
//properties
router.post('/createProperty', superController.createProperty);
router.get('/getProperties', superController.getProperties);
router.delete('/deleteProperty/:propertyId', superController.deleteProperty);
router.put('/updateProperty/:propertyId', superController.updateProperty);
//stand by Properties
router.get('/getStandbyProperties', superController.getStandbyProperties);
router.delete('/deleteStandbyProperties/:propertyId', superController.deleteStandbyProperty);
//PCBs
router.post('/createPCB', superController.createPCB);
router.get('/getPCBs', superController.getPCBs);
router.delete('/deletePCB/:pcbId', superController.deletePCB);
router.put('/updatePCB/:pcbId', superController.updatePCB);
//stand by PCBs
router.get('/getStandbyPCBs', superController.getStandbyPCBs);
router.delete('/deleteStandbyPCB/:pcbId', superController.deleteStandbyPCB);
// CommercialProperties
router.get('/getCommercialProperties', superController.getCommercialProperties);

router.get('/getAppUsers', superController.getAppUsers);
router.delete('/deleteAppUser/:userId', superController.deleteAppUser);

router.delete('/deleteCommercialProperty/:com_prop_id', superController.deleteCommercialProperties);

router.delete('/deleteCommercialAdmin/:com_prop_id', superController.deleteCommercialAdmin);


// ResidentialProperties
router.get('/getResidentialProperties', superController.getResidentialProperties);
router.delete('/deleteResidentialProperty/:res_prop_id', superController.deleteResidentialProperties);
//get UserCount
router.get('/getUserLicenseCount/:propId', superController.getUserLicenseCount);
//
router.get('/getsubscriptionData', superController.SuscriptionData);

router.put('/changeStatus/:prop_id', superController.changeStatus);
router.delete('/deleteSubUser/:userId', superController.deleteSubUser);
router.put('/changePassword', superController.changePassword);




router.post('/add_notification', superController.addNotification);
router.get('/get_notifications', superController.getNotifications);



module.exports = router;