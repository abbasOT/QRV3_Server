const admin = require("firebase-admin");
const stripe = require('stripe')('sk_test_51Ot7RbGviWnrTaHnQgDMTyyUkEqs24vHTCCijHd41B71y4x8GxXSOa2T0ReZUYIKRj7MUkpUuDAdipnYKfDXLYDg00qIVJId0u');
const nodemailer = require('nodemailer');
const express = require('express');
const app = express.Router();




const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jfazil72@gmail.com',
        pass: 'xjwqzfvpboiqgjzi'
    }
});

function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000); // Generates a 5-digit number
}



app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = generateOTP();

    const mailOptions = {
        from: 'jfazil72@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        const snapshot = await admin.database().ref('users').orderByChild('email').equalTo(email).once('value');
        console.log(snapshot.val());
        if (snapshot.exists()) {
            const userId = Object.keys(snapshot.val())[0];
            await admin.database().ref(`users/${userId}/otp`).set({
                otp: otp,
                timestamp: Date.now()
            });
            res.status(200).send('OTP sent');
        } else {
            res.status(404).send('Email not found');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).send(error.toString());
    }
});


app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const snapshot = await admin.database().ref('users').orderByChild('email').equalTo(email).once('value');
        console.log(snapshot.val()); // Log snapshot value for debugging

        if (snapshot.exists()) {
            const userId = Object.keys(snapshot.val())[0];
            const userOtpData = (await admin.database().ref(`users/${userId}/otp`).once('value')).val();

            if (userOtpData && userOtpData.otp === otp && (Date.now() - userOtpData.timestamp) < 60000) { // OTP valid for 1 minute
                res.status(200).send('OTP verified');
            } else {
                res.status(400).send('Invalid or expired OTP');
            }
        } else {
            res.status(404).send('Email not found');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error); // Log the error for debugging
        res.status(500).send(error.toString());
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

        const snapshot = await admin.database().ref('users').orderByChild('email').equalTo(email).once('value');
        if (snapshot.exists()) {
            const userId = Object.keys(snapshot.val())[0];
            await admin.database().ref(`users/${userId}`).update({ pass: newPassword, confirmPass: newPassword });
            // await admin.database().ref(`commercial/commercial${userId}`).update({ password: newPassword });
            res.status(200).send('Password updated');
        } else {
            res.status(404).send('User not found in database');
        }
    } catch (error) {
        console.error('Error resetting password:', error); // Log the error for debugging
        res.status(500).send(error.toString());
    }
});


// Save Customers (Stripe Methods)

app.post('/create-payment-intent', async (req, res) => {
    const { amount, email } = req.body;

    let customerId;
    const customerList = await stripe.customers.list({
        email: email,
        limit: 1
    });

    if (customerList.data.length !== 0) {
        customerId = customerList.data[0].id;
    } else {
        const customer = await stripe.customers.create({ email: email });
        customerId = customer.id;
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: '2020-08-27' }
    );

    const paymentIntent = await stripe.paymentIntents.create({
        amount: parseInt(amount),
        currency: 'usd',
        customer: customerId,
    });

    // // List payment methods for the customer
    // const paymentMethods = await stripe.paymentMethods.list({
    //     customer: customerId,
    //     type: 'card', // Specify the type of payment method
    // });

    // // Assuming you want the first payment method (if any)
    // const paymentMethodId = paymentMethods.data.length > 0 ? paymentMethods.data[0].id : null;

    res.status(200).send({
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        // paymentMethodId: paymentMethodId, // Include payment method ID if available
        success: true,
    });

});



// app.post('/save-default-payment-method', async (req, res) => {
//     const { customerId, paymentMethodId } = req.body;

//     try {
//         // Attach the payment method to the customer
//         await stripe.paymentMethods.attach(paymentMethodId, {
//             customer: customerId,
//         });

//         // Set the payment method as the default payment method
//         await stripe.customers.update(customerId, {
//             invoice_settings: {
//                 default_payment_method: paymentMethodId,
//             },
//         });

//         res.status(200).send({
//             success: true,
//             message: 'Default payment method saved successfully',
//         });
//     } catch (error) {
//         res.status(400).send({
//             success: false,
//             message: error.message,
//         });
//     }
// });


// app.post('/get-payment-method-id', async (req, res) => {
//     const { paymentIntentId } = req.body;

//     try {
//         const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
//         const paymentMethodId = paymentIntent.payment_method;

//         res.status(200).send({
//             success: true,
//             paymentMethodId: paymentMethodId,
//         });
//     } catch (error) {
//         res.status(400).send({
//             success: false,
//             message: error.message,
//         });
//     }
// });




app.post('/save-default-payment-method', async (req, res) => {
    const { customerId } = req.body;

    try {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card', // Specify the type of payment method
        });

        // Assuming you want the first payment method (if any)
        const paymentMethodId = paymentMethods.data.length > 0 ? paymentMethods.data[0].id : null;

        // Attach the payment method to the customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        // Set the payment method as the default payment method
        await stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        res.status(200).send({
            success: true,
            message: 'Default payment method saved successfully',
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message,
        });
    }
});



// Show Cards
app.post('/list-payment-methods', async (req, res) => {
    const { customerId } = req.body;

    try {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        res.status(200).send({
            success: true,
            paymentMethods: paymentMethods.data,
        });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});


module.exports = app;
