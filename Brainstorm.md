# JobMap - Project Brainstorm

## 1. Core Value Proposition
Visualizing job opportunities on an interactive map to help users find work in desired locations or commute zones.

## 2. Data Strategy
**Key Constraint**: Use Google Maps API to fetch data.
*Interpretation*:
- Use **Places API** to identify companies/businesses in a target area.
- Potential workflow:
    1. Search for specific business types (e.g., "Tech Companies", "Restaurants") in a viewport.
    2. Get list of places + metadata (website, address, rating).
    3. Display these as potential employers.

## 3. Key Features
- **Map Interface**: Full-screen map with clustering for high-density areas.
- **Search & Filter**:
    - Keywords (e.g., "Engineering", "Retail")
    - Radius/Location
- **Place Details**:
    - Company Name
    - Rating/Reviews (from Maps)
    - Link to Website/Directions

## 4. Technical Architecture
- **Frontend**: React (Vite or Next.js)
- **Maps Integration**: Google Maps JavaScript API
- **State Management**: React Context or Zustand
- **Styling**: TailwindCSS (for rapid, modern UI)

## 5. Questions/Refinements
- [ ] Clarify "fetch data" - are we only mapping businesses, or do we need actual job postings?
- [ ] Do we need a backend to proxy API requests (to hide keys), or is this client-side only?
