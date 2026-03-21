# FullTank

**Live Fuel Availability & Queues in Sri Lanka**

FullTank is a crowdsourced, real-time tracking application built to help Sri Lankans find petrol and diesel availability, along with live queue lengths across the Western Province. 

[![Website](https://img.shields.io/website?url=https%3A%2F%2Ffulltank.vercel.app)](https://fulltank.vercel.app)

---

## Features
* **Real-Time Availability:** Crowdsourced updates on Petrol (92/95) and Diesel (Auto/Super).
* **Queue Tracking:** Live estimates of vehicle queue lengths at CEYPETCO, LIOC, and Sinopec stations.
* **Interactive Map:** Visual map interface to easily locate the nearest stations with stock.
* **PWA Ready:** Installable as a Progressive Web App for quick mobile access.

## Tech Stack
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS
* **Database & Auth:** Supabase
* **Maps:** React Leaflet
* **Deployment & Analytics:** Vercel

## Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/OnithaPerera/fulltank.git](https://github.com/OnithaPerera/fulltank.git)
   cd fulltank
   
2. Install the dependencies:

   ```Bash
   npm install

3. Set up your environment variables:
   Create a .env.local file in the root directory and add your Supabase keys:

   ```Bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Run the development server:

   ```Bash
   npm run dev

5. Open http://localhost:3000 in your browser to see the result.

### Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

   1. Fork the Project
   2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
   3. Commit your Changes (git commit -m 'Add some AmazingFeature')
   4. Push to the Branch (git push origin feature/AmazingFeature)
   5. Open a Pull Request

### License
See LICENSE for more information.
