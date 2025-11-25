import React from 'react';
import MapContainer from './components/MapContainer';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Sidebar />
      <div className="w-full h-full">
        <MapContainer />
      </div>
    </div>
  );
}

export default App;
