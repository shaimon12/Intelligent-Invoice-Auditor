import os
import json
import time
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import ChatOpenAI
import requests

# --- 1. CONFIGURATION ---
load_dotenv()

# Database Config
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', 5))

# API Keys
API_KEY = os.getenv('OPENAI_API_KEY')

# --- 2. HELPER FUNCTIONS ---

def get_db_connection():
    """Establishes a connection to the database."""
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def get_absolute_file_path(relative_path_from_db):
    """
    Converts 'Uploads/file.pdf' stored in DB to the absolute path on Mac.
    """
    project_root = os.path.dirname(os.getcwd()) 
    full_path = os.path.join(project_root, 'backend-api-csharp', 'InvoiceAuditor.API', relative_path_from_db)
    return full_path

# --- 3. CORE AI LOGIC ---

def extract_invoice_data(file_path):
    print(f"   [AI] Reading PDF: {file_path}")
    
    try:
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        full_text = " ".join([page.page_content for page in pages])
        print(f"   [AI] Extracted {len(full_text)} characters.")
    except Exception as e:
        print(f"   [!] Error reading PDF: {e}")
        return None

    llm = ChatOpenAI(model="gpt-4-turbo", temperature=0, api_key=API_KEY)
    
    # --- UPDATED PROMPT: Added LineItems ---
    prompt = f"""
    You are an expert financial auditor. 
    Analyze the following invoice text and extract these fields into a raw JSON object:
    
    1. VendorName (string)
    2. InvoiceNumber (string)
    3. InvoiceDate (string, YYYY-MM-DD format)
    4. DueDate (string, YYYY-MM-DD format. If not found, use null)
    
    5. TotalAmount (number, no currency symbols)
    6. SubTotal (number, no currency symbols. Amount before tax)
    7. TaxAmount (number, no currency symbols. GST/VAT amount)
    
    8. VendorABN (string. Look for ABN, Tax ID, or Registration Number)
    9. VendorAddress (string)
    
    10. Category (string. Choose best fit: "IT Services", "Office Supplies", "Travel", "Utilities", "Professional Services", "Other")
    11. PaymentDetails (string. Extract BSB/Account info or "Credit Card" if mentioned)
    
    12. LineItems (array of objects, each object must have "Description" (string) and "Amount" (number))

    Return ONLY raw JSON. No markdown formatting.
    
    Invoice Text:
    {full_text[:4000]} 
    """

    print("   [AI] Sending to OpenAI...")
    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        
        if content.startswith("```"):
            content = content.strip("`").replace("json\n", "")
            
        data = json.loads(content)
        print(f"   [AI] Success! Extracted: {data}")
        return data
    except Exception as e:
        print(f"   [!] Failed to parse JSON: {e}")
        return None

def process_invoice(invoice_id, db_file_path):
    full_path = get_absolute_file_path(db_file_path)
    
    if not os.path.exists(full_path):
        print(f"   [!] File not found at: {full_path}")
        return False

    data = extract_invoice_data(full_path)
    if not data:
        return False

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            
            # 1. Update Main Invoice Data
            sql = """
                UPDATE Invoices 
                SET ExtractedVendorName = %s,
                    ExtractedInvoiceNumber = %s,
                    ExtractedDate = %s,
                    ExtractedDueDate = %s,
                    
                    ExtractedTotalAmount = %s,
                    ExtractedSubTotal = %s,
                    ExtractedTaxAmount = %s,
                    
                    ExtractedVendorABN = %s,
                    ExtractedVendorAddress = %s,
                    Category = %s,
                    PaymentDetails = %s
                WHERE InvoiceId = %s
            """
            
            values = (
                data.get('VendorName'),
                data.get('InvoiceNumber'),
                data.get('InvoiceDate'),
                data.get('DueDate'),
                
                data.get('TotalAmount'),
                data.get('SubTotal'),
                data.get('TaxAmount'),
                
                data.get('VendorABN'),
                data.get('VendorAddress'),
                data.get('Category'),
                data.get('PaymentDetails'),
                
                invoice_id
            )
            
            cursor.execute(sql, values)

            # --- NEW: 2. Insert Line Items ---
            line_items = data.get('LineItems', [])
            if line_items and isinstance(line_items, list):
                item_sql = """
                    INSERT INTO InvoiceItems (InvoiceId, Description, Amount) 
                    VALUES (%s, %s, %s)
                """
                # Prepare data list for executemany
                item_values = [
                    (invoice_id, item.get('Description', 'Unknown Item'), item.get('Amount', 0.0)) 
                    for item in line_items
                ]
                
                # Execute all item inserts at once
                cursor.executemany(item_sql, item_values)
                print(f"   [AI] Saved {cursor.rowcount} line items to database.")

            # Commit both the UPDATE and the INSERTs together
            conn.commit()
            cursor.close()
            conn.close()
            return True
            
        except Error as e:
            print(f"   [!] DB Save Error: {e}")
            return False
    return False

# --- 4. MAIN POLLING LOOP ---

def start_worker():
    print("--- Python AI Worker Started ---")
    print("Waiting for 'PENDING' invoices...")

    while True:
        conn = get_db_connection()
        if conn and conn.is_connected():
            cursor = conn.cursor(dictionary=True)
            
            try:
                cursor.execute("SELECT * FROM Invoices WHERE ProcessingStatus = 'PENDING' LIMIT 1")
                invoice = cursor.fetchone()

                if invoice:
                    invoice_id = invoice['InvoiceId'] 
                    print(f"\n[>] Found Invoice #{invoice_id}. Status: PENDING")

                    cursor.execute("UPDATE Invoices SET ProcessingStatus = 'PROCESSING' WHERE InvoiceId = %s", (invoice_id,))
                    conn.commit()
                    # ==========================================
                    # NEW: PING #1 (Tell UI processing started)
                    # ==========================================
                    try:
                        webhook_url = f"http://127.0.0.1:5238/api/invoices/{invoice_id}/notify-complete"
                        requests.post(webhook_url, timeout=3)
                    except Exception:
                        pass # Ignore errors, this is just a visual update
                    # ==========================================

                    success = process_invoice(invoice_id, invoice['StoredFilePath'])

                    new_status = 'COMPLETED' if success else 'FAILED'
                    cursor.execute("UPDATE Invoices SET ProcessingStatus = %s WHERE InvoiceId = %s", (new_status, invoice_id))
                    conn.commit()
                    
                    print(f"[<] Database updated. Invoice #{invoice_id} is {new_status}.")
                    # ==========================================
                    # NEW: SIGNALR WEBHOOK PING
                    # ==========================================
                    try:
                        # Assuming your .NET API runs on port 5238 based on your React code
                        webhook_url = f"http://localhost:5238/api/invoices/{invoice_id}/notify-complete"
                        requests.post(webhook_url, timeout=3)
                        print(f"[~] Successfully pinged UI for real-time refresh.")
                    except Exception as e:
                        print(f"[!] Warning: Could not ping UI webhook: {e}")
                    # ==========================================
                
            except Error as e:
                print(f"Database error: {e}")
            
            finally:
                if 'cursor' in locals():
                    cursor.close()
                conn.close()
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    start_worker()