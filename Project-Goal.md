# 🌊 Oceanel Dashboard

**AI-powered Citizen + Social Media Hazard Intelligence Platform**  
Built for **Smart India Hackathon (SIH) 2025** – Problem Statement ID: 25039 (INCOIS, MoES).

---

## 🚀 Overview

Oceanel is a **web + mobile platform** that combines **crowdsourced hazard reporting** and **social media analytics** to help INCOIS and disaster management authorities make faster, data-driven decisions during coastal hazards such as **tsunamis, cyclones, storm surges, and flooding**.

This repository contains the **Next.js Dashboard** for officials and analysts.  
The dashboard provides a **real-time interactive map**, AI-powered insights, and live visualization of both **citizen reports** and **social media trends**.

---

## 🔑 Core Features

- 📍 **Map-based Dashboard**
  - Real-time citizen hazard reports (geo-tagged).
  - Dynamic heatmaps of hazard density.
  - Overlays of social media activity.

- 🤖 **AI Insights**
  - **Computer Vision** for validating citizen photos/videos.
  - **NLP Engine** for hazard-related keywords, sentiment, and misinformation detection.
  - Panic Index (measuring intensity of public concern).

- 🎛️ **Interactive Tools**
  - Filters by date, location, hazard type, and source.
  - Role-based access for analysts, officials, and admins.
  - Alert system for threshold breaches (e.g., multiple SOS reports in one region).

- 🌐 **Multilingual Support**
  - Reports and social feeds processed across major Indian languages.

---

## 🏗️ Tech Stack

**Frontend:**  
- [Next.js 15](https://nextjs.org/) (App Router)  
- [TypeScript](https://www.typescriptlang.org/)  
- [Tailwind CSS](https://tailwindcss.com/)  
- [shadcn/ui](https://ui.shadcn.com/) (UI components)  
- [Recharts](https://recharts.org/) (data visualizations)  
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) or [Leaflet](https://leafletjs.com/) (interactive maps)  

**Backend (planned / separate repo):**  
- FastAPI or Node.js (REST + WebSocket APIs)  
- PostgreSQL + PostGIS (geospatial DB)  
- NLP + CV models (Python ML services)  

---

## UI Component Structure

app/
├── dashboard/
│   ├── page.tsx              # Main dashboard overview
│   ├── map/
│   │   └── page.tsx          # Interactive map view
│   ├── reports/
│   │   └── page.tsx          # Citizen reports panel
│   ├── social/
│   │   └── page.tsx          # Social media analytics
│   └── alerts/
│       └── page.tsx          # Alerts & notifications
├── components/
│   ├── map/
│   │   ├── HazardMap.tsx     # Main map component
│   │   ├── HeatmapLayer.tsx  # Heatmap overlay
│   │   └── ReportMarker.tsx  # Individual report markers
│   ├── reports/
│   │   ├── ReportCard.tsx    # Individual report display
│   │   ├── ReportFilters.tsx # Filter controls
│   │   └── AIValidation.tsx  # AI validation status
│   ├── analytics/
│   │   ├── PanicIndex.tsx    # Panic index visualization
│   │   ├── SentimentChart.tsx # Sentiment trends
│   │   └── TrendAnalysis.tsx # Keyword trends
│   └── alerts/
│       ├── AlertPanel.tsx    # Alert notifications
│       └── ThresholdConfig.tsx # Alert configuration

---

## Proposed Database Schema

// convex/schema.ts
export default defineSchema({
  ...authTables,
  
  // User roles and permissions
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("official"), v.literal("analyst")),
    organization: v.optional(v.string()),
    permissions: v.array(v.string()),
  }).index("by_user", ["userId"]),
  
  // Hazard reports from citizens
  hazardReports: defineTable({
    reporterId: v.optional(v.id("users")), // Anonymous reports allowed
    hazardType: v.union(
      v.literal("tsunami"), 
      v.literal("cyclone"), 
      v.literal("storm_surge"), 
      v.literal("flooding")
    ),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.optional(v.string()),
    }),
    description: v.string(),
    mediaUrls: v.array(v.string()), // Photos/videos
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("false_positive"), v.literal("resolved")),
    aiValidation: v.optional(v.object({
      confidence: v.number(),
      isVerified: v.boolean(),
      analysis: v.string(),
    })),
    createdAt: v.number(),
  }).index("by_location", ["location.latitude", "location.longitude"])
    .index("by_hazard_type", ["hazardType"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
  
  // Social media posts analysis
  socialMediaPosts: defineTable({
    platform: v.union(v.literal("twitter"), v.literal("facebook"), v.literal("instagram"), v.literal("youtube")),
    postId: v.string(),
    content: v.string(),
    language: v.string(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
    sentiment: v.union(v.literal("positive"), v.literal("negative"), v.literal("neutral")),
    hazardKeywords: v.array(v.string()),
    isMisinformation: v.boolean(),
    panicScore: v.number(), // 0-100
    createdAt: v.number(),
  }).index("by_platform", ["platform"])
    .index("by_sentiment", ["sentiment"])
    .index("by_panic_score", ["panicScore"])
    .index("by_created_at", ["createdAt"]),
  
  // AI analysis results
  aiAnalysis: defineTable({
    reportId: v.optional(v.id("hazardReports")),
    socialMediaId: v.optional(v.id("socialMediaPosts")),
    analysisType: v.union(v.literal("image_validation"), v.literal("text_analysis"), v.literal("sentiment")),
    result: v.object({
      confidence: v.number(),
      details: v.string(),
      recommendations: v.array(v.string()),
    }),
    createdAt: v.number(),
  }).index("by_report", ["reportId"])
    .index("by_social_media", ["socialMediaId"])
    .index("by_type", ["analysisType"]),
  
  // Alert system
  alerts: defineTable({
    title: v.string(),
    description: v.string(),
    alertType: v.union(v.literal("threshold_breach"), v.literal("misinformation"), v.literal("critical_report")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      radius: v.number(), // in km
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_active", ["isActive"])
    .index("by_type", ["alertType"])
    .index("by_severity", ["severity"]),
});

---
## 🖼️ Planned Dashboard UI (MVP)

* **Home View** → Overview of current hazards, quick stats.
* **Map View** → Real-time map with heatmaps of citizen reports + social media trends.
* **Reports Panel** → List of citizen-submitted reports with AI validation status.
* **Social Media Panel** → Trending keywords, sentiment graph, misinformation alerts.
* **Alerts & Notifications** → High-priority events highlighted for quick response.

---

## 🌍 Impact

This dashboard is part of a larger ecosystem:

* **Mobile App (Crowdsourcing):** Citizens submit hazard reports (offline-first).
* **AI Services:** Validate citizen inputs + analyze social media chatter.
* **Dashboard (this repo):** Unified view for disaster managers.

Together, they provide **faster situational awareness**, **reduce misinformation**, and ultimately **save lives**.

---

## 📈 Roadmap

* ✅ Base Next.js project setup
* ✅ Tailwind + shadcn/ui integration
* ✅ Convex database + Convex auth
* 🔲 Map integration (Leaflet/Mapbox)
* 🔲 Citizen reports API integration
* 🔲 Social media NLP feed integration
* 🔲 Alert engine + role-based access
* 🔲 Multilingual support

---

## 🤝 Contributors

Team Oceanel (SIH 2025)

* **Abdul Muspik** – Dashboard Lead (Next.js)
* (Add other teammates here)

---

## 📜 License

This project is licensed under the MIT License.

```

---