const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const commercialAdminController = require('../controllers/commercialAdminController');
const PushNotification = require('../controllers/sendPushNotification');
const checkAdminProperty = require('../middlewares/checkAdminProperty')

router.post('/signup', commercialAdminController.signup);
router.post('/login', commercialAdminController.login);
router.put('/changePassword/:com_prop_id', checkAdminProperty, commercialAdminController.changePassword);
router.get('/get_ComAdmin/:com_prop_id', commercialAdminController.GetComAdmin);
//find property
router.post('/find_property/:com_prop_id', commercialAdminController.findProperty);
//Residents
router.post('/add_residents/:com_prop_id', checkAdminProperty, commercialAdminController.AddResidents);
router.get('/get_residents/:com_prop_id', checkAdminProperty, commercialAdminController.GetResidents);
router.delete('/delete_resident/:com_prop_id/:userId', commercialAdminController.DeleteResident);
router.put('/update_resident/:com_prop_id/:userId', commercialAdminController.UpdateResident);

//pins 
router.post('/add_pins/:com_prop_id', checkAdminProperty, commercialAdminController.AddPins);
router.get('/get_pins/:com_prop_id', checkAdminProperty, commercialAdminController.GetPins);
router.delete('/delete_pins/:com_prop_id/:pinId', checkAdminProperty, commercialAdminController.DeletePins);
router.put('/update_pins/:com_prop_id/:pinId', checkAdminProperty, commercialAdminController.UpdatePins);
//setTimer
router.post('/setTimer/:com_prop_id', checkAdminProperty, commercialAdminController.setTimer);

//ProfileUpdate
router.put('/update_profile/:com_prop_id', checkAdminProperty, commercialAdminController.updateUser);
router.delete('/deleteUser/:com_prop_id', checkAdminProperty, commercialAdminController.deleteUser);
//Visitor Data on mobile view + open door 
router.get('/visitor_residents/:pcbId', commercialAdminController.VisitorData);
router.post('/accessDoorWithPin/:comId', commercialAdminController.AccessDoorWithPin);
router.post('/OpenDoorWithPinResidential/:propId', commercialAdminController.OpenDoorWithPinResidential);
// Visitor Screen 
router.post('/WelcomMessage/:com_prop_id', checkAdminProperty, commercialAdminController.WelcomeMessage);
router.post('/uploadWallpaper/:com_prop_id/:propertyId/:pcbId', checkAdminProperty, upload.single('image'), commercialAdminController.UploadWallpaper);
router.post('/savebrightness/:com_prop_id', checkAdminProperty, commercialAdminController.SaveBrightness);
//InterComId 
router.put('/AddInterComId/:com_prop_id', checkAdminProperty, commercialAdminController.AddInterComId);
router.put('/updateIntercomId/:com_prop_id', checkAdminProperty, commercialAdminController.UpdateIntercomId);
router.get('/getIntercoms/:propertyId', checkAdminProperty, commercialAdminController.GetIntercoms);
router.delete('/delete_InterComId/:com_prop_id', checkAdminProperty, commercialAdminController.deleteIntercomId);
//Events
router.get('/getEvents/:com_prop_id', checkAdminProperty, commercialAdminController.GetEvents);
router.post('/exportPdf/:com_prop_id', checkAdminProperty, commercialAdminController.exportPdf);
// calling
router.post('/sendCallNotification/:userId', PushNotification.sendPushNotification);
router.post('/sendCallForResidents', PushNotification.CallForResidents);
// door message notifications
router.post('/sendDoorPinNotifications/:userId', PushNotification.sendDoorPinNotification);
// create token
router.post('/createToken', commercialAdminController.createToken);
router.delete('/deleteToken/:token', commercialAdminController.deleteToken);
router.get('/special_char', commercialAdminController.generateAscci);
router.post('/special_char', commercialAdminController.IncrementAscci);
router.get('/downloadQR/:pcbId', commercialAdminController.downloadQR);

//notifications

router.post('/add_notification/:com_prop_id', checkAdminProperty, commercialAdminController.AddNotification);
router.get('/get_notifications/:com_prop_id', checkAdminProperty, commercialAdminController.GetNotifications);
router.post('/update_notifications/:com_prop_id', checkAdminProperty, commercialAdminController.UpdateNotifications);

module.exports = router;
