# Smart Attendance System (SAS) - Multi-Factor Authentication

## 📌 Project Overview
**Smart Attendance System (SAS)** is a next-generation, spoof-proof attendance tracking application designed for college classrooms. It combines hardware-based proximity tracking with AI-driven biometric verification to ensure that students are physically present in the correct room and are who they claim to be. 

This project completely eliminates proxy attendance by requiring **two factors of authentication** simultaneously:
1. **Physical Proximity (Hardware):** Verifies the student is exactly inside the classroom bounds using real-time Bluetooth Low Energy (BLE) RSSI signal strength from an ESP32 hardware beacon.
2. **Biometric Verification (Software):** Uses advanced AI facial recognition to instantly compare a live camera feed against the student's securely enrolled facial descriptor matrix.

---

## ✨ Key Features
* **Real-Time BLE Distance Tracking:** Utilizes the experimental Web Bluetooth API (`watchAdvertisements`) to read live signal strength (dBm) dynamically, ensuring a student is within the strict threshold (e.g., -75 dBm / ~3 meters).
* **Dynamic Hardware Payload Generation:** The ESP32 firmware dynamically updates its Manufacturer Data byte every second to bypass aggressive Windows/Android Bluetooth caching, guaranteeing ultra-responsive real-time UI gauges.
* **AI Facial Recognition:** Powered by `face-api.js` utilizing SSD MobileNet V1 models for lightning-fast, 68-point facial landmark detection and matching directly in the browser.
* **Role-Based Architecture:** 
  * **Admins/Teachers:** Can create live classes, monitor attendance in real-time, and manage student enrollments.
  * **Students:** Can view their attendance percentage per subject, track their history, and securely mark themselves present when a session is active.
* **Stateless & Scalable Backend:** RESTful API built with Node.js and Express, connected to MongoDB Atlas for high-speed descriptor retrieval and attendance logging.

---

## 🛠️ Technology Stack
### Frontend
* **React (Vite):** Blazing fast UI rendering and state management.
* **Web Bluetooth API:** Direct browser-to-hardware communication.
* **face-api.js:** Client-side Machine Learning model execution.
* **Tailwind CSS:** Modern, responsive, and fluid UI design.

### Backend
* **Node.js & Express:** Scalable API routing and middleware.
* **MongoDB Atlas & Mongoose:** NoSQL database storing user metadata, encrypted credentials, and face descriptor arrays.
* **Cloudinary:** Secure cloud storage for the base visual enrollment records.

### Hardware
* **ESP32 Microcontroller (C++):** Configured as a BLE GATT Server advertising custom dynamically shifting packets.

---

## 🚀 Setup & Installation

### 1. Hardware Setup (ESP32)
1. Open the Arduino IDE.
2. Install the **ESP32 Board Manager** via Preferences.
3. Open the `esp32_beacon/esp32_beacon.ino` file.
4. Modify the `deviceName` variable to match your classroom (e.g., `"CLASSROOM_101"`).
5. Compile and upload to your ESP32. Keep the board powered via USB.

### 2. Backend Setup
1. Navigate to the `backend/` directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the root of `backend/` and configure your keys:
   ```env
   PORT=5174
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   CLIENT_URL=http://localhost:5173
   ```
4. Run the development server: `npm run dev`

### 3. Frontend Setup
1. Navigate to the `frontend/` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite server: `npm run dev`
4. **CRITICAL:** For the application to read live Bluetooth ranges, you MUST open Chrome, navigate to `chrome://flags/#enable-experimental-web-platform-features`, set it to **Enabled**, and relaunch your browser.

---

## ⚙️ How It Works (The Core Logic)
1. **Teacher creates a Session:** The backend spins up an active session linked to a specific classroom and broadcasts its expected `bleDeviceName` and `bleServiceUUID` to the frontend.
2. **Student initiates check-in:** The frontend Web Bluetooth API scans for the specific classroom ESP32.
3. **Distance Calculation:** A Kalman Filter smooths the erratic raw RSSI waves into a stable distance metric. The student's UI is locked until this distance crosses the `-75 dBm` threshold.
4. **Facial Snapshot:** Once proximity is verified, the camera engages. A 128-dimension floating-point array is generated from the student's face and Euclidean distance is calculated against the database descriptor.
5. **Atomic Commit:** If the distance `score < 0.45` and RSSI `>= -75`, the attendance is finalized and written to MongoDB.

---
*Developed for College RTR Project*
