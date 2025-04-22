require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Root route handler
app.get('/', (req, res) => {
    res.json({
        message: "Backend server is running",
        endpoints: {
            appointment: "/api/book-appointment",
            contact: "/api/contact-us"
        }
    });
});

// SMTP Configuration for Appointment Form
const appointmentTransporter = nodemailer.createTransport({
    host: process.env.APPOINTMENT_SMTP_HOST,
    port: process.env.APPOINTMENT_SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.APPOINTMENT_SMTP_USER,
        pass: process.env.APPOINTMENT_SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// SMTP Configuration for Contact Form
const contactTransporter = nodemailer.createTransport({
    host: process.env.CONTACT_SMTP_HOST,
    port: process.env.CONTACT_SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.CONTACT_SMTP_USER,
        pass: process.env.CONTACT_SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify SMTP Connections
appointmentTransporter.verify((error, success) => {
    if (error) {
        console.error("❌ Appointment SMTP Connection Failed:", error.message);
    } else {
        console.log("✅ Appointment SMTP Connected Successfully");
    }
});

contactTransporter.verify((error, success) => {
    if (error) {
        console.error("❌ Contact SMTP Connection Failed:", error.message);
    } else {
        console.log("✅ Contact SMTP Connected Successfully");
    }
});

// Function to Send Email
const sendEmail = (transporter, to, subject, text, html) => {
    const mailOptions = {
        from: `"Agnia Ayurvedic Hospital" <${transporter.options.auth.user}>`,
        to: to,
        replyTo: transporter.options.auth.user,
        subject: subject,
        text: text,
        html: html,
        headers: {
            "X-Priority": "1",
            "X-MSMail-Priority": "High",
            "Importance": "high",
            "X-Mailer": "NodeMailer",
            "MIME-Version": "1.0",
            "Content-Type": "text/html; charset=UTF-8",
            "List-Unsubscribe": `<mailto:${transporter.options.auth.user}?subject=unsubscribe>`,
            "X-Auto-Response-Suppress": "OOF, AutoReply"
        }
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error("❌ Email sending error:", err.message);
        } else {
            console.log("📧 Email sent successfully:", info.response);
        }
    });
};

// API: Book Appointment
app.post('/api/book-appointment', async (req, res) => {
    try {
        const { name, email, phone, doctor, timeSlot, date, message } = req.body;

        if (!name || !email || !phone || !doctor || !timeSlot || !date) {
            return res.status(400).json({ error: "All fields except message are required" });
        }

        // Email content
        const emailSubject = "New Appointment Booked";
        const emailText = `📅 New Appointment Details:\n\n👤 Name: ${name}\n📧 Email: ${email}\n📞 Phone: ${phone}\n👨‍⚕️ Doctor: ${doctor}\n🕒 Time Slot: ${timeSlot}\n📆 Date: ${date}\n📝 Message: ${message || 'N/A'}`;
        const emailHTML = `
            <h2>New Appointment Booked</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Doctor:</strong> ${doctor}</p>
            <p><strong>Time Slot:</strong> ${timeSlot}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Message:</strong> ${message || 'N/A'}</p>
        `;

        // Send to appointment email using appointment SMTP
        await new Promise((resolve, reject) => {
            appointmentTransporter.sendMail({
                from: `"Agnia Ayurvedic Hospital" <${process.env.APPOINTMENT_SMTP_USER}>`,
                to: process.env.APPOINTMENT_EMAIL,
                subject: emailSubject,
                text: emailText,
                html: emailHTML
            }, (err, info) => {
                if (err) {
                    console.error("❌ Email sending error:", err.message);
                    reject(err);
                } else {
                    console.log("📧 Email sent successfully:", info.response);
                    resolve(info);
                }
            });
        });

        // Send to data forwarding email
        await new Promise((resolve, reject) => {
            appointmentTransporter.sendMail({
                from: `"Agnia Ayurvedic Hospital" <${process.env.APPOINTMENT_SMTP_USER}>`,
                to: process.env.DATA_FORWARD_EMAIL,
                subject: `[Appointment] ${emailSubject}`,
                text: emailText,
                html: emailHTML
            }, (err, info) => {
                if (err) {
                    console.error("❌ Forward email error:", err.message);
                    reject(err);
                } else {
                    console.log("📧 Forward email sent:", info.response);
                    resolve(info);
                }
            });
        });

        res.json({ message: "✅ Appointment booked successfully" });
    } catch (error) {
        console.error("❌ Unexpected error:", error.message);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// API: Contact Us
app.post('/api/contact-us', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Email content
        const emailSubject = "New Contact Us Submission";
        const emailText = `📩 New Contact Us Form Submitted:\n\n👤 Name: ${name}\n📧 Email: ${email}\n📝 Message: ${message}`;
        const emailHTML = `
            <h2>New Contact Us Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong> ${message}</p>
        `;

        // Send to contact email using contact SMTP
        await new Promise((resolve, reject) => {
            contactTransporter.sendMail({
                from: `"Agnia Ayurvedic Hospital" <${process.env.CONTACT_SMTP_USER}>`,
                to: process.env.CONTACT_EMAIL,
                subject: emailSubject,
                text: emailText,
                html: emailHTML
            }, (err, info) => {
                if (err) {
                    console.error("❌ Email sending error:", err.message);
                    reject(err);
                } else {
                    console.log("📧 Email sent successfully:", info.response);
                    resolve(info);
                }
            });
        });

        // Send to data forwarding email
        await new Promise((resolve, reject) => {
            contactTransporter.sendMail({
                from: `"Agnia Ayurvedic Hospital" <${process.env.CONTACT_SMTP_USER}>`,
                to: process.env.DATA_FORWARD_EMAIL,
                subject: `[Contact] ${emailSubject}`,
                text: emailText,
                html: emailHTML
            }, (err, info) => {
                if (err) {
                    console.error("❌ Forward email error:", err.message);
                    reject(err);
                } else {
                    console.log("📧 Forward email sent:", info.response);
                    resolve(info);
                }
            });
        });

        res.json({ message: "✅ Contact form submitted successfully" });
    } catch (error) {
        console.error("❌ Unexpected error:", error.message);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.message);
    res.status(500).json({ error: "Something went wrong!", details: err.message });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, (err) => {
    if (err) {
        console.error("❌ Server failed to start:", err.message);
    } else {
        console.log(`🚀 Server running on port ${PORT}`);
    }
});
