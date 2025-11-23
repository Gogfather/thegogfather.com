# The Gogfather Web Platform

> "It's not personal, it's strictly business."

This repository contains the source code for **The Gogfather** brand website. It is a modern, responsive web application built with Next.js and styled with Tailwind CSS, hosted on Vercel.

## 🏗️ Tech Stack

* **Framework:** Next.js 14+ (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Deployment:** Vercel
* **Domain Management:** AWS Route 53 (Registrar) + Vercel (DNS)

## 🚀 Getting Started (Local Development)

Follow these instructions to run the project on your own machine.

### Prerequisites

* Node.js (Version 18.17 or higher)
* Git

### Installation

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/YOUR_USERNAME/the-gogfather-web.git](https://github.com/YOUR_USERNAME/the-gogfather-web.git)
    cd the-gogfather-web
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

4.  **Open your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000).

## 📦 Deployment & Configuration

This project is designed to be hosted on Vercel for maximum performance and ease of integration.

### Step 1: Deploy Code to Vercel

1.  Push your code to a GitHub repository.
2.  Log in to Vercel.
3.  Click **"Add New..."** -> **"Project"**.
4.  Import your `the-gogfather-web` repository.
5.  Keep default settings (Framework: Next.js).
6.  Click **Deploy**.

### Step 2: Connect AWS Domain (The "Cheapest" Method)

If you bought your domain on AWS but want to host on Vercel without paying the AWS Route 53 monthly hosting fee:

**In Vercel Dashboard:**

1.  Go to **Settings** -> **Domains**.
2.  Add your domain (e.g., `thegogfather.com`).
3.  Copy the two nameservers provided (e.g., `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).

**In AWS Console (Route 53):**

1.  Go to **Registered Domains** (Left Sidebar).
2.  Select your domain name.
3.  Click **Add/Edit Name Servers**.
4.  Delete the default AWS nameservers.
5.  Paste the Vercel nameservers.
6.  Save.

> **Note:** DNS propagation can take up to 24 hours.

## ⚖️ License & Commercial Use

* **Hobby Plan:** Suitable for personal projects and non-commercial use.
* **Pro Plan:** Required if you are generating revenue, selling products, or running a commercial business via this site.

---
*Built by The Gogfather.*