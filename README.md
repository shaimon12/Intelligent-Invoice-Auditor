# Intelligent Invoice Auditor

An AI-powered SaaS MVP designed to automate invoice processing. This system accepts PDF invoices, asynchronously extracts line-item data using a GPT-4 powered worker, performs multi-level mathematical validation, and presents the results in a professional, real-time dashboard.

## Architecture Overview

This project is built as a decoupled monorepo, separating concerns into three distinct services to ensure scalability and maintainability:

1. **Frontend (`invoice-auditor-ui`)**: A Vite/React SPA built with TypeScript. Features a dual-panel layout with an integrated PDF viewer and a 5-second polling interval for real-time status updates.
2. **Backend API (`backend-api-csharp`)**: A .NET 8 REST Web API. Handles secure file uploads, serves physical PDF files to the frontend viewer, and manages CRUD operations via Entity Framework Core.
3. **AI Worker (`ai-worker-python`)**: A standalone Python background service. It polls the database for pending invoices, utilizes `pypdf` and OpenAI's `GPT-4-turbo` via LangChain for strict JSON extraction, and writes extracted data (including individual line items) back to the database.

## Key Features

* **Asynchronous Processing Pipeline**: Decoupling the AI extraction from the web API prevents frontend timeouts and allows the background worker to scale independently.
* **"Level 2" Mathematical Validation**: 
  * *Level 1*: Validates `Subtotal + Tax == Total`.
  * *Level 2*: Aggregates all AI-extracted line items and validates that the `Sum of Line Items == Subtotal`.
* **Smart Error Handling**: Mathematical discrepancies are highlighted in the UI with explicit warning boxes detailing the exact variance.
* **Stable Polling UX**: Implements stable ID-based sorting (`b.id - a.id`) and strict UTC-to-Local timezone handling to prevent UI layout shifts during background refreshes.

## Tech Stack

* **Frontend**: React, Vite, TypeScript, Tailwind CSS
* **Backend**: .NET 8, C#, Entity Framework Core
* **Database**: MySQL
* **AI & Processing**: Python, LangChain, OpenAI GPT-4, `mysql-connector-python`, `pypdf`

## Local Development Setup

To run this project locally, you will need Node.js, .NET 8 SDK, Python 3.x, and a local MySQL instance.

### 1. Database Configuration
* Execute the Entity Framework migrations in the .NET API to build the `Invoices` and `InvoiceItems` tables.
* Update the connection strings in both the .NET `appsettings.json` and the Python worker's `.env` file.

### 2. AI Worker (.env setup)
Create a `.env` file in the `ai-worker-python` directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=InvoiceAuditorDB
```
*Run the worker:*
```bash
cd ai-worker-python
pip install -r requirements.txt
python main.py
```

### 3. Backend API
*Run the .NET server:*
```bash
cd backend-api-csharp
dotnet run
```

### 4. Frontend UI
*Run the React development server:*
```bash
cd invoice-auditor-ui
npm install
npm run dev
```

## Screenshots

<img width="1429" height="791" alt="image" src="https://github.com/user-attachments/assets/1f50e943-769c-447b-b917-f8976e9dcc4f" />

<img width="1304" height="696" alt="image" src="https://github.com/user-attachments/assets/6483490c-d4eb-43c6-85ec-7935f2c3eba2" />

