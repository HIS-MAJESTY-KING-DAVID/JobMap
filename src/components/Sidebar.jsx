import React from 'react';

const Sidebar = () => {
    return (
        <div className="w-80 h-screen bg-white shadow-lg z-10 absolute top-0 left-0 flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">JobMap</h1>
                <input
                    type="text"
                    placeholder="Search for jobs..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <p className="text-gray-500 text-center mt-10">Enter a search term to find jobs.</p>
            </div>
        </div>
    );
};

export default Sidebar;
