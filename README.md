FullTank is a lightweight, mobile-first web application designed to help the community quickly find reliable fuel availability, queue estimates, and verification data. Built for speed and clarity on low-end devices, FullTank relies on crowdsourced signals to maintain accurate fuel station data.

## 🚀 Features

- **Live Fuel Map**: View nearby stations and their current fuel status directly on an interactive map.
- **Crowdsourced Updates**: Anyone can update a station's fuel availability and queue length.
- **3-User Verification System**: To prevent inaccurate reports, a station is only marked as "Verified" (Green) after 3 independent community confirmations.
- **Queue Awareness**: Get estimates for wait times (Short, Medium, Long).
- **Stale Data Tracking**: Markers turn gray if the last update is older than 3 hours to indicate potentially outdated info.
- **Dark/Light Mode**: Full support for both themes to ensure readability in any condition.

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React), Tailwind CSS
- **Database / Backend**: [Supabase](https://supabase.com/)
- **Map & Geolocation**: [Leaflet](https://leafletjs.com/), [React-Leaflet](https://react-leaflet.js.org/), CARTO basemaps
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚙️ Prerequisites

Before running the project locally, ensure you have:
- Node.js (v18+)
- npm, yarn, pnpm, or bun
- A [Supabase](https://supabase.com/) project (with the necessary tables for `stations` and `feedback`)
- A [CARTO](https://carto.com/) API Key for the map tiles

## 💻 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/OnithaPerera/FullTank.git
   cd FullTank/fulltank
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root of the project and add the following keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_CARTO_API_KEY=your_carto_api_key
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

We welcome contributions from the community! If you're a developer and want to help build FullTank, please check out our GitHub repository or get in touch through the contact form on our website's About page.

## 👥 The Team

FullTank is built and maintained by a dedicated group of core contributors. Special thanks to everyone who has submitted reports, confirmed data, and submitted code.
