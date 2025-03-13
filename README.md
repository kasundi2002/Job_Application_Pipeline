### Job application pipeline

## Folder Structure

# backend

│   ├── uploads/               # Temporary file storage
│   ├── service-account.json    # Google Drive API credentials
│   ├── google_sheets_credentials.json # Google Sheets credentials
│   ├── .env                    # Backend environment variables
│   ├── server.js               # Express backend
│   ├── process_cv.py           # Python script for AI processing
│   ├── package.json            # Node.js dependencies
│   ├── venv/                   # Python virtual environment


# frontend

│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadCV.js     # React Upload Component
│   │   ├── App.js              # Main React Component
│   │   ├── index.js            # React Entry Point
│   ├── public/                 # Static Assets
│   ├── package.json            # React Dependencies
│── .gitignore                  # Ignore sensitive files

# dependencies 

- Backend dependencies : npm install express cors multer googleapis dotenv nodemailer jsonwebtoken bcryptjs axios
- Frontend dependencies : npm install axios react-router-dom
- Python dependencies : pip install pdfplumber python-docx google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client pandas requests

# To activate and de-activate python virtual environment in powershell (VScode)

- Activate :
    .\venv\Scripts\Activate
- De-activate :
    deactivate
