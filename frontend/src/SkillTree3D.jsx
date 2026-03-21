import React, { useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

export default function SkillTree3D() {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Responsive wrapper
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('3d-graph-container');
      if (container) {
        setDimensions({ width: container.clientWidth, height: 600 });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Make the camera slowly orbit the degree map automatically
  useEffect(() => {
    let angle = 0;
    const distance = 300;
    const interval = setInterval(() => {
      if (fgRef.current) {
        fgRef.current.cameraPosition({
          x: distance * Math.sin(angle),
          z: distance * Math.cos(angle)
        });
        angle += Math.PI / 300;
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Mock Data: The Degree as a 3D Constellation
  const gData = {
    nodes: [
      { id: 'Basic1', name: '1ο Εξάμηνο', val: 10, color: '#4ade80' }, // Green (Passed)
      { id: 'Basic2', name: '2ο Εξάμηνο', val: 10, color: '#4ade80' },
      { id: 'Basic3', name: '3ο Εξάμηνο', val: 10, color: '#4ade80' },
      { id: 'Gate', name: 'Κατώφλι 94 ECTS', val: 15, color: '#facc15' }, // Yellow (Active)
      { id: 'Energy', name: 'Ενέργεια', val: 8, color: '#9ca3af' }, // Gray (Locked)
      { id: 'Electronics', name: 'Ηλεκτρονική', val: 12, color: '#60a5fa' }, // Blue (Selected)
      { id: 'Telecom', name: 'Τηλεπικοινωνίες', val: 8, color: '#9ca3af' },
      { id: 'ElecAdv', name: 'Εμβάθυνση Ηλεκτρονικής', val: 8, color: '#60a5fa' },
      { id: 'Thesis', name: 'Διπλωματική Εργασία', val: 25, color: '#818cf8' } // Purple (Endgame)
    ],
    links: [
      { source: 'Basic1', target: 'Basic2' },
      { source: 'Basic2', target: 'Basic3' },
      { source: 'Basic3', target: 'Gate' },
      { source: 'Gate', target: 'Energy' },
      { source: 'Gate', target: 'Electronics' },
      { source: 'Gate', target: 'Telecom' },
      { source: 'Electronics', target: 'ElecAdv' },
      { source: 'ElecAdv', target: 'Thesis' },
      { source: 'Energy', target: 'Thesis' },
      { source: 'Telecom', target: 'Thesis' }
    ]
  };

  return (
    <div id="3d-graph-container" className="w-full bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative">
      <div className="absolute top-4 left-4 z-10 bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm pointer-events-none">
        <h3 className="font-bold text-lg text-blue-400">3D Degree Constellation</h3>
        <p className="text-xs text-slate-300 mt-1">Αριστερό κλικ για περιστροφή<br/>Ροδέλα για Zoom<br/>Δεξί κλικ για μετακίνηση</p>
      </div>
      
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={gData}
        nodeLabel="name"
        nodeColor="color"
        nodeResolution={16}
        linkWidth={2}
        linkOpacity={0.5}
        linkColor={() => '#475569'}
        backgroundColor="#020617"
      />
    </div>
  );
}