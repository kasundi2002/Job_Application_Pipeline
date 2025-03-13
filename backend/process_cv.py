import os
import pdfplumber
import docx
import json
import pandas as pd
import datetime
import requests  # Add this for sending HTTP requests
from googleapiclient.discovery import build
from google.oauth2 import service_account

# Load Google Sheets API credentials
SERVICE_ACCOUNT_FILE = "credentials.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)

# Google Sheets Setup
SPREADSHEET_ID = "1n6FWIv4JhvDWi49at8TNNUiZQBBTLguXsQ_IsWy_fLA"
SHEET_NAME = "Job_CV_Pipeline"
service = build("sheets", "v4", credentials=creds)
sheet = service.spreadsheets()

# Function to extract text from a PDF
def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

# Function to extract text from a DOCX file
def extract_text_from_docx(docx_path):
    doc = docx.Document(docx_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

# Function to parse extracted text and extract key details
def parse_cv_text(text):
    lines = text.split("\n")
    personal_info = {"name": None, "email": None, "phone": None}
    education, qualifications, projects = [], [], []

    for line in lines:
        line = line.strip()
        
        if "@" in line and "." in line:
            personal_info["email"] = line
        elif any(char.isdigit() for char in line) and len(line) > 7:
            personal_info["phone"] = line
        elif "BSc" in line or "MSc" in line or "PhD" in line or "Degree" in line:
            education.append(line)
        elif "Certified" in line or "Course" in line:
            qualifications.append(line)
        elif "Project" in line or "Developed" in line or "Built" in line:
            projects.append(line)
    
    return personal_info, education, qualifications, projects

# Function to process a CV file
def process_cv(file_path, cv_public_link):
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == ".pdf":
        text = extract_text_from_pdf(file_path)
    elif file_extension == ".docx":
        text = extract_text_from_docx(file_path)
    else:
        print("Unsupported file type:", file_extension)
        return None

    personal_info, education, qualifications, projects = parse_cv_text(text)

    # Prepare data for Google Sheets
    data = [
        [
            personal_info.get("name", ""),
            personal_info.get("email", ""),
            personal_info.get("phone", ""),
            ", ".join(education),
            ", ".join(qualifications),
            ", ".join(projects),
            cv_public_link,
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        ]
    ]

    # Append data to Google Sheet
    sheet.values().append(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_NAME}!A2",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": data},
    ).execute()

    print("CV processed and stored successfully.")

    # Prepare Webhook payload
    webhook_payload = {
        "cv_data": {
            "personal_info": personal_info,
            "education": education,
            "qualifications": qualifications,
            "projects": projects,
            "cv_public_link": cv_public_link,
        },
        "metadata": {
            "applicant_name": personal_info.get("name", "Unknown"),
            "email": personal_info.get("email", ""),
            "status": "prod",  # Use "testing" during development
            "cv_processed": True,
            "processed_timestamp": datetime.datetime.utcnow().isoformat(),
        },
    }

    # Send Webhook Request
    webhook_url = "https://rnd-assignment.automations-3d6.workers.dev/"
    headers = {
        "Content-Type": "application/json",
        "X-Candidate-Email": "your-email@example.com",  # Replace with your email
    }

    response = requests.post(webhook_url, json=webhook_payload, headers=headers)
    
    if response.status_code == 200:
        print("Webhook sent successfully!")
    else:
        print("Webhook failed:", response.status_code, response.text)

# Example usage
if __name__ == "__main__":
    cv_file_path = "sample_cv.pdf"
    cv_public_link = "https://drive.google.com/file/d/sample_file_id/view"
    process_cv(cv_file_path, cv_public_link)
