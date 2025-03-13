const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { exec } = require("child_process");
const app = express();

require("dotenv").config();

app.use(cors());
app.use(express.json());

// Dummy Admin User
const adminUser = {
  email: "admin@example.com",
  password: bcrypt.hashSync("admin123", 10), // Hash password
};

// JWT Secret Key (Store in `.env`)
const JWT_SECRET = process.env.JWT_SECRET || "kasundi";

// Login Route (Admin)
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email !== adminUser.email || !bcrypt.compareSync(password, adminUser.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ email: adminUser.email }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Middleware to Protect Routes
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

// Protected Route (Only Admins Can Access)
app.get("/admin/dashboard", verifyToken, (req, res) => {
  res.json({ message: "Welcome to the Admin Dashboard!" });
});

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive",
  ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const SPREADSHEET_ID = "1n6FWIv4JhvDWi49at8TNNUiZQBBTLguXsQ_IsWy_fLA"; // Replace with actual ID
const SHEET_NAME = "Job_CV_Pipeline"; // Sheet name where CVs are stored

// Route to Fetch CV Data for Admin Dashboard
app.get("/admin/cvs", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H`, // Adjust based on your sheet structure
    });

    const rows = response.data.values;
    if (!rows.length) {
      return res.status(404).json({ message: "No CVs found" });
    }

    // Convert rows to JSON format
    const cvs = rows.map((row) => ({
      name: row[0] || "N/A",
      email: row[1] || "N/A",
      phone: row[2] || "N/A",
      education: row[3] || "N/A",
      qualifications: row[4] || "N/A",
      projects: row[5] || "N/A",
      cvLink: row[6] || "#",
      submittedAt: row[7] || "N/A",
    }));

    res.json(cvs);
  } catch (error) {
    console.error("Error fetching CVs:", error);
    res.status(500).json({ message: "Failed to fetch CV data" });
  }
});

// Nodemailer Transport Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to Send Follow-Up Email
const sendFollowUpEmail = (recipientEmail, applicantName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: "Your Job Application is Under Review",
    text: `Dear ${applicantName},\n\nThank you for submitting your CV. Your application is currently under review. We will contact you soon with further details.\n\nBest regards,\nRecruitment Team`,
  };

  // Send Email after 24 hours
  setTimeout(() => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Follow-up email sent:", info.response);
      }
    });
  }, 24 * 60 * 60 * 1000); // 24 hours delay
};

// Multer Configuration
const upload = multer({ dest: "uploads/" });

// Upload File Route
app.post("/upload", upload.single("cv"), async (req, res) => {
  try {
    const fileMetadata = {
      name: req.file.originalname,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    // Get Google Drive link
    const cvPublicLink = response.data.webViewLink;

    // Run Python script to extract text and store in Google Sheets
    exec(`python3 process_cv.py ${req.file.path} ${cvPublicLink}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
        return res.status(500).json({ success: false, message: "CV Processing Failed" });
      }
      console.log(stdout);
      res.json({
        success: true,
        fileId: response.data.id,
        fileUrl: response.data.webViewLink,
      });
    });

    // Delete the file from server after processing
    fs.unlinkSync(req.file.path);

    sendFollowUpEmail(req.body.email, req.body.name);

    res.json({
      success: true,
      message: "CV uploaded, processed, and email scheduled.",
    });

  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
