# 🐟 MaluMart - Customer Store & Cashier POS (Frontend)

MaluMart is a modern, full-stack POS and E-commerce web application built for fresh fish and seafood markets. This repository contains the **Frontend** built with React, Vite, and Tailwind CSS.

---

## ✨ Features

### 🛒 Customer Store (`/store`)
- **Modern Glassmorphic Navbar:** Quick access to cart, user profile, and authentication.
- **Auto-Sliding Hero Banner:** High-quality seafood market visuals with smooth transitions and smooth-scroll "Shop Now" action.
- **Category Filtering & Search:** Easily browse items by categories or search by name.
- **Optimized Product Cards:** Custom image container (`object-contain` with a clean white background) to prevent vertical image cropping or distortion.
- **Stock Management Integration:** Live display of "In Stock" or "Out of Stock" status. Out-of-stock items have clear badges and disabled cart buttons.
- **Shopping Cart & Checkout:** Slide-over cart drawer, quantity adjustments, Cash on Delivery (COD) / Card payment options, and an instant printable invoice modal.

### 🏪 Cashier POS Screen (`/pos`)
- **Split Layout:** Fast product catalog lookup on the left, active bill summary on the right.
- **Barcode & Scale Integration:** Supports standard barcodes and electronic weighing scale PLU barcodes (e.g., 13-digit codes starting with "20" extracting weight in Kg).
- **Custom Weight Prompt:** Secure modal input for weighed items.
- **Real-Time Online Pickups:** Auto-polls backend every 5 seconds (`setInterval`) to fetch pending online customer orders instantly without manual page reloads. Cashier can collect payment, print thermal-style receipts, and update order statuses.

---

## 🛠️ Tech Stack

- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Charts & Reports:** Recharts, jsPDF, jspdf-autotable
- **Routing:** React Router DOM

---

   
