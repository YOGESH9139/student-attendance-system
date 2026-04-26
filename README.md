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
*Developed for College RTR Project*
