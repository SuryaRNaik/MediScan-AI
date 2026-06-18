import React, { useState } from 'react';

export default function EyeAnatomy({ anatomyIssues = [] }) {
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // Map array to object for easier lookup: { 'Cornea': 'red', 'Lens': 'green', ... }
  const issueMap = anatomyIssues.reduce((acc, curr) => {
    acc[curr.region] = curr.color;
    return acc;
  }, {});

  const regionDescriptions = {
    'Cornea': 'Front transparent layer that helps focus incoming light.',
    'Lens': 'Adjusts focus for near and distant vision.',
    'Retina': 'Light-sensitive layer that converts light into nerve signals.',
    'Macula': 'Central area responsible for detailed sharp vision.',
    'Optic Nerve': 'Carries visual information from the eye to the brain.',
    'Anterior Chamber': 'Fluid-filled space between the cornea and iris.',
    'Other': 'General anatomical structures such as the iris.'
  };

  const getColor = (region) => {
    const color = issueMap[region] || 'green';
    if (color === 'red') return '#ef4444'; // red-500
    if (color === 'orange') return '#f97316'; // orange-500
    return '#22c55e'; // green-500
  };

  const getGlow = (region) => {
    const isHovered = hoveredRegion === region;
    const color = issueMap[region] || 'green';
    
    let glowBase = 'none';
    if (color === 'red') glowBase = 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.6))';
    if (color === 'orange') glowBase = 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))';
    
    if (isHovered) {
      if (color === 'red') return 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.9)) brightness(1.2)';
      if (color === 'orange') return 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.9)) brightness(1.2)';
      return 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6)) brightness(1.1)'; // green hover glow
    }

    return glowBase;
  };

  const getOpacity = (region, defaultOpacity) => {
    if (hoveredRegion && hoveredRegion !== region) {
      return (parseFloat(defaultOpacity) * 0.4).toString(); // Dim un-hovered regions
    }
    if (hoveredRegion === region) {
      return Math.min(1, parseFloat(defaultOpacity) + 0.3).toString(); // Brighten hovered
    }
    return defaultOpacity;
  };

  const handleMouseEnter = (region) => setHoveredRegion(region);
  const handleMouseLeave = () => setHoveredRegion(null);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-800">Anatomical Analysis</h3>
          <p className="text-[11px] text-gray-400 mt-1">Hover over the eye structures for details</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
        {/* SVG Illustration Container */}
        <div className="relative w-full max-w-[280px] aspect-square flex-shrink-0">
          
          {hoveredRegion && regionDescriptions[hoveredRegion] && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-[110%] bg-white/95 backdrop-blur shadow-xl border border-gray-200 rounded-lg p-3 z-20 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[13px] font-black text-gray-800 mb-1">{hoveredRegion}</p>
              <p className="text-[11px] text-gray-600 leading-tight">{regionDescriptions[hoveredRegion]}</p>
            </div>
          )}

          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg overflow-visible">
            <defs>
              <radialGradient id="eyeballGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f3f4f6" />
              </radialGradient>
            </defs>

            {/* Sclera / Main body */}
            <circle cx="100" cy="100" r="80" fill="url(#eyeballGrad)" stroke="#e5e7eb" strokeWidth="2" opacity={getOpacity('Sclera', '1')} />

            {/* Retina (inner lining of the back) */}
            <g
              onMouseEnter={() => handleMouseEnter('Retina')}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <path
                d="M 100 20 A 80 80 0 0 1 100 180 A 70 70 0 0 0 100 30 Z"
                fill={getColor('Retina')}
                opacity={getOpacity('Retina', '0.2')}
                style={{ filter: getGlow('Retina'), transition: 'all 0.3s ease' }}
              />
              <path
                d="M 100 25 A 75 75 0 0 1 100 175"
                fill="none"
                stroke={getColor('Retina')}
                strokeWidth="4"
                strokeLinecap="round"
                opacity={getOpacity('Retina', '1')}
                style={{ filter: getGlow('Retina'), transition: 'all 0.3s ease' }}
              />
              {/* Invisible wider stroke for easier hovering */}
              <path d="M 100 25 A 75 75 0 0 1 100 175" fill="none" stroke="transparent" strokeWidth="15" />
            </g>

            {/* Optic Nerve (extending back) */}
            <g
              onMouseEnter={() => handleMouseEnter('Optic Nerve')}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <path
                d="M 175 85 C 190 85, 200 90, 200 100 C 200 110, 190 115, 175 115 Z"
                fill={getColor('Optic Nerve')}
                opacity={getOpacity('Optic Nerve', '1')}
                style={{ filter: getGlow('Optic Nerve'), transition: 'all 0.3s ease' }}
              />
              <path d="M 178 95 L 195 95 M 178 105 L 195 105" stroke="#ffffff" strokeWidth="2" opacity={getOpacity('Optic Nerve', '0.5')} />
            </g>

            {/* Macula (small divot on retina) */}
            <circle
              cx="170"
              cy="100"
              r="8"
              fill={getColor('Macula')}
              opacity={getOpacity('Macula', '1')}
              style={{ filter: getGlow('Macula'), cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={() => handleMouseEnter('Macula')}
              onMouseLeave={handleMouseLeave}
            />

            {/* Anterior Chamber */}
            <path
              d="M 28 65 C 5 80, 5 120, 28 135 C 20 120, 20 80, 28 65 Z"
              fill={getColor('Anterior Chamber')}
              opacity={getOpacity('Anterior Chamber', '0.2')}
              style={{ filter: getGlow('Anterior Chamber'), cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={() => handleMouseEnter('Anterior Chamber')}
              onMouseLeave={handleMouseLeave}
            />

            {/* Cornea (bulge at the front) */}
            <g
              onMouseEnter={() => handleMouseEnter('Cornea')}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <path
                d="M 28 65 C 5 80, 5 120, 28 135"
                fill="none"
                stroke={getColor('Cornea')}
                strokeWidth="6"
                strokeLinecap="round"
                opacity={getOpacity('Cornea', '1')}
                style={{ filter: getGlow('Cornea'), transition: 'all 0.3s ease' }}
              />
              <path d="M 28 65 C 5 80, 5 120, 28 135" fill="none" stroke="transparent" strokeWidth="15" />
            </g>

            {/* Iris (lines) - classified under 'Other' but let's label it Iris for hover */}
            <g
              onMouseEnter={() => handleMouseEnter('Other')}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <path d="M 30 70 L 40 85 M 30 130 L 40 115" stroke={getColor('Other')} strokeWidth="4" strokeLinecap="round" opacity={getOpacity('Other', '1')} />
              <path d="M 30 70 L 40 85 M 30 130 L 40 115" stroke="transparent" strokeWidth="12" strokeLinecap="round" />
            </g>

            {/* Lens (oval behind iris) */}
            <ellipse
              cx="45"
              cy="100"
              rx="8"
              ry="25"
              fill={getColor('Lens')}
              opacity={getOpacity('Lens', '0.8')}
              style={{ filter: getGlow('Lens'), cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={() => handleMouseEnter('Lens')}
              onMouseLeave={handleMouseLeave}
            />
          </svg>
        </div>

        {/* Legend / Status List */}
        <div className="w-full flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {anatomyIssues.map((issue, idx) => {
              const isHovered = hoveredRegion === issue.region || (hoveredRegion === 'Other' && issue.region === 'Other');
              return (
                <div 
                  key={idx} 
                  onMouseEnter={() => handleMouseEnter(issue.region)}
                  onMouseLeave={handleMouseLeave}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isHovered ? 'scale-105 shadow-md z-10 ' : 'scale-100 '
                  } ${
                    issue.color === 'red' ? 'bg-red-50 border-red-200' :
                    issue.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                    'bg-green-50 border-green-200'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    issue.color === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                    issue.color === 'orange' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' :
                    'bg-green-500'
                  }`} />
                  <div className="flex flex-col">
                    <span className={`text-[12px] font-bold ${
                      issue.color === 'red' ? 'text-red-700' :
                      issue.color === 'orange' ? 'text-orange-700' :
                      'text-green-700'
                    }`}>
                      {issue.region === 'Other' ? 'Iris/Other' : issue.region}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {(!anatomyIssues || anatomyIssues.length === 0) && (
            <p className="text-[12px] text-gray-400 text-center mt-4">No anatomical data available in this report.</p>
          )}
        </div>
      </div>
    </div>
  );
}
