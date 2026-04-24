🌾 AgriHub - Smart Farm Management System

AgriHub is a simple and efficient farm management web application built using HTML, CSS, and JavaScript. It helps farmers or users manage crops, inventory, tasks, and expenses — all in one place.

This project is designed to be beginner-friendly and runs completely in the browser using LocalStorage (no backend required).

🚀 Features
🔐 User Authentication (Login / Signup using LocalStorage)
📊 Dashboard with summary stats
🌱 Crop Management (Add, View, Edit, Delete)
📦 Inventory Management
📅 Task Scheduler
💰 Expense Tracker
🔍 Search & Filter functionality
📱 Responsive UI (Mobile-friendly)
🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript
Storage: Browser LocalStorage
Charts (Optional): Chart.js
📂 Project Structure
AgriHub/
│── index.html
│── login.html
│── signup.html
│── dashboard.html
│── css/
│   └── style.css
│── js/
│   ├── auth.js
│   ├── dashboard.js
│   ├── crops.js
│   ├── inventory.js
│   ├── tasks.js
│   └── expenses.js
│── assets/
⚙️ How It Works
All data is stored in the browser using LocalStorage
Data is saved in JSON format
CRUD operations are handled using JavaScript

Example:

localStorage.setItem("crops", JSON.stringify(data));
let crops = JSON.parse(localStorage.getItem("crops"));
▶️ How to Run

Download or clone the repository:

git clone https://github.com/your-username/agrihub.git
Open the project folder
Run the project:
Open index.html in your browser
