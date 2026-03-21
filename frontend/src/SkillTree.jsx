import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, CheckCircle, Book, Award, Zap, Cpu, Wifi } from 'lucide-react';

export default function SkillTree({ rules, passedCourses, totalEcts }) {
  const [expandedSemesters, setExpandedSemesters] = useState(['1']); // Start with Sem 1 open
  const [expandedSector, setExpandedSector] = useState(null);

  if (!rules || !passedCourses) return <div className="p-4 text-center">Φόρτωση Δέντρου...</div>;

  const passedCodes = new Set(passedCourses.map(c => c.code));
  const GATE_ECTS = rules.graduation_requirements?.sector_selection_threshold_ects || 94;
  const isGateUnlocked = totalEcts >= GATE_ECTS;

  const toggleSemester = (sem) => {
    setExpandedSemesters(prev => 
      prev.includes(sem) ? prev.filter(s => s !== sem) : [...prev, sem]
    );
  };

  // --- RPG NODE COMPONENT ---
  const RpgNode = ({ course, isLockedOverride = false }) => {
    const isPassed = passedCodes.has(course.code);
    const isLocked = isLockedOverride && !isPassed;
    
    let status = 'available';
    if (isPassed) status = 'passed';
    if (isLocked) status = 'locked';

    const styles = {
      passed: 'bg-green-900 border-green-400 text-green-100 shadow-[0_0_15px_rgba(74,222,128,0.4)]',
      available: 'bg-blue-950 border-blue-500 text-blue-100 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] hover:-translate-y-1 transition-all cursor-help',
      locked: 'bg-gray-800 border-gray-600 text-gray-500 opacity-70 cursor-not-allowed'
    };

    return (
      <div className="relative group flex flex-col items-center m-2">
        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex flex-col items-center justify-center p-1 text-center relative z-10 bg-gray-900 ${styles[status]}`}>
          {isPassed ? <CheckCircle size={20} className="text-green-400 mb-1" /> : 
           isLocked ? <Lock size={18} className="text-gray-500 mb-1" /> : 
           <Book size={20} className="text-blue-400 mb-1" />}
          
          <span className="text-[9px] md:text-[11px] leading-tight line-clamp-3 font-bold px-1">
            {course.name}
          </span>
        </div>

        {/* Floating Tooltip */}
        <div className="absolute bottom-full mb-2 w-48 bg-gray-900 text-white text-xs p-3 rounded-lg z-50 border border-gray-600 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-left">
          <p className="font-bold text-blue-300 border-b border-gray-700 pb-1 mb-1">{course.name}</p>
          <p className="text-gray-300">Κωδικός: <span className="text-white">{course.code || 'N/A'}</span></p>
          <p className="text-gray-300">ECTS: <span className="text-white">{course.ects}</span></p>
          <p className="text-gray-300">Τύπος: <span className="text-white">{course.type === 'core' ? 'Κορμού' : course.type === 'elective' ? 'Επιλογής' : 'Υποχρεωτικό'}</span></p>
          {isPassed && <p className="text-green-400 font-bold mt-1">✓ Ολοκληρώθηκε</p>}
          {isLocked && <p className="text-red-400 font-bold mt-1">🔒 Κλειδωμένο (Απαιτεί ECTS)</p>}
        </div>
      </div>
    );
  };

  // --- RENDER BASIC CYCLE ---
  const renderBasicCycle = () => {
    return Object.entries(rules.basic_cycle).map(([semester, courses]) => {
      // Skip tier 10 (Thesis) for the basic cycle loop
      if (semester === "10") return null; 
      
      const isExpanded = expandedSemesters.includes(semester);
      const semPassedEcts = courses.filter(c => passedCodes.has(c.code)).reduce((s, c) => s + c.ects, 0);
      const semTotalEcts = courses.reduce((s, c) => s + c.ects, 0);
      const isSemCompleted = semPassedEcts === semTotalEcts;

      return (
        <div key={`sem-${semester}`} className="mb-4">
          <button 
            onClick={() => toggleSemester(semester)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
              isSemCompleted ? 'bg-green-900 border-green-700 text-green-100' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              {isExpanded ? <ChevronDown className="mr-2" /> : <ChevronRight className="mr-2" />}
              <span className="font-bold text-lg">Tier {semester}: {semester}ο Εξάμηνο</span>
            </div>
            <span className="text-sm font-mono bg-black bg-opacity-30 px-3 py-1 rounded-full">
              {semPassedEcts} / {semTotalEcts} ECTS
            </span>
          </button>
          
          {isExpanded && (
            <div className="flex flex-wrap justify-center pt-4 pb-2 border-l-2 border-slate-700 ml-6 pl-4">
              {courses.map(course => <RpgNode key={course.code || course.name} course={course} />)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-inner p-4 md:p-6 overflow-hidden border border-slate-700">
      
      {/* HEADER */}
      <div className="text-center mb-8 pb-4 border-b border-slate-700">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-widest">
          Ακαδημαϊκό Δέντρο
        </h2>
        <p className="text-slate-400 text-sm mt-1">Basic Cycle & Specializations</p>
      </div>

      {/* EARLY GAME: BASIC CYCLE */}
      <div className="mb-8">
        {renderBasicCycle()}
      </div>

      {/* THE GATE */}
      <div className="flex flex-col items-center my-10 relative">
        <div className="w-1 h-12 bg-slate-700 absolute -top-12"></div>
        <div className={`px-8 py-4 rounded-xl border-4 shadow-2xl z-10 flex flex-col items-center ${
          isGateUnlocked ? 'bg-yellow-900 border-yellow-500 text-yellow-100 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'bg-gray-800 border-gray-600 text-gray-400'
        }`}>
          {isGateUnlocked ? <Lock size={28} className="mb-2 text-yellow-400" /> : <Lock size={28} className="mb-2 text-gray-500" />}
          <h3 className="font-black text-xl uppercase tracking-wider">Κατώφλι Τομέα</h3>
          <p className="font-mono mt-1 text-sm bg-black bg-opacity-40 px-3 py-1 rounded">
            {totalEcts} / {GATE_ECTS} ECTS
          </p>
        </div>
        <div className="w-1 h-12 bg-slate-700 absolute -bottom-12"></div>
      </div>

      {/* MID GAME: SECTORS */}
      <div className="mt-12">
        <h3 className="text-center text-slate-400 font-bold mb-6 uppercase tracking-widest">Επιλογή Κατεύθυνσης (Tiers 7-9)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Energy Sector */}
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4">
            <button onClick={() => setExpandedSector(expandedSector === 'energy' ? null : 'energy')} className="w-full flex items-center justify-between text-amber-400 font-bold p-2 hover:bg-slate-700 rounded">
              <span className="flex items-center"><Zap size={18} className="mr-2"/> Ενέργειας</span>
              {expandedSector === 'energy' ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            </button>
            {expandedSector === 'energy' && (
              <div className="flex flex-wrap justify-center mt-4">
                {rules.sectors.energy.courses["7"].map(c => <RpgNode key={c.name} course={c} isLockedOverride={!isGateUnlocked} />)}
              </div>
            )}
          </div>

          {/* Electronics Sector */}
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4">
            <button onClick={() => setExpandedSector(expandedSector === 'electronics' ? null : 'electronics')} className="w-full flex items-center justify-between text-blue-400 font-bold p-2 hover:bg-slate-700 rounded">
              <span className="flex items-center"><Cpu size={18} className="mr-2"/> Ηλεκτρονικής</span>
              {expandedSector === 'electronics' ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            </button>
            {expandedSector === 'electronics' && (
              <div className="flex flex-wrap justify-center mt-4">
                {rules.sectors.electronics.courses["7"].map(c => <RpgNode key={c.name} course={c} isLockedOverride={!isGateUnlocked} />)}
              </div>
            )}
          </div>

          {/* Telecom Sector */}
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4">
            <button onClick={() => setExpandedSector(expandedSector === 'telecom' ? null : 'telecom')} className="w-full flex items-center justify-between text-purple-400 font-bold p-2 hover:bg-slate-700 rounded">
              <span className="flex items-center"><Wifi size={18} className="mr-2"/> Τηλεπικ/νιών</span>
              {expandedSector === 'telecom' ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            </button>
            {expandedSector === 'telecom' && (
              <div className="flex flex-wrap justify-center mt-4">
                {rules.sectors.telecommunications.courses["7"].map(c => <RpgNode key={c.name} course={c} isLockedOverride={!isGateUnlocked} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* END GAME: THESIS */}
      <div className="mt-12 pt-8 border-t border-slate-700 flex justify-center">
        <div className="flex flex-col items-center bg-slate-800 border-2 border-indigo-500 rounded-xl p-6 w-full md:w-1/2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500 opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <Award size={48} className="text-indigo-400 mb-3 relative z-10" />
          <h3 className="text-xl font-black text-indigo-100 uppercase tracking-widest relative z-10">Tier 10: Διπλωματική Εργασία</h3>
          <p className="text-indigo-300 font-mono mt-2 bg-slate-900 px-4 py-1 rounded-full border border-indigo-500 relative z-10">30 ECTS</p>
        </div>
      </div>

    </div>
  );
}