import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, CheckCircle, XCircle, LogOut, GraduationCap, Loader2, TrendingUp, Target, AlertCircle, BarChart3, List, Award, Lock, Calendar, Plus, Minus, Search } from 'lucide-react';

export default function App() {
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'courses', or 'planner'
  const [rules, setRules] = useState(null);
  const [plannedCourses, setPlannedCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemesters, setSelectedSemesters] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [showCustomCourseForm, setShowCustomCourseForm] = useState(false);
  const [customCourse, setCustomCourse] = useState({ name: '', code: '', ects: 5, type: 'mandatory', semester: 7, sectorKey: 'basic_cycle', isOtherDepartment: false });

  // Check if user is already logged in when the app opens
  useEffect(() => {
    const savedData = localStorage.getItem('ece_auth_data');
    if (savedData) {
      setStudentData(JSON.parse(savedData));
    }
    
    // Check if rules are cached
    const savedRules = localStorage.getItem('ece_rules');
    if (savedRules) {
      setRules(JSON.parse(savedRules));
    }
    
    // Load planned courses from localStorage
    const savedPlannedCourses = localStorage.getItem('ece_planned_courses');
    if (savedPlannedCourses) {
      setPlannedCourses(JSON.parse(savedPlannedCourses));
    }
    
    // Fetch department rules
    const fetchRules = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/rules');
        setRules(response.data);
        // Save rules to localStorage for offline access
        localStorage.setItem('ece_rules', JSON.stringify(response.data));
      } catch (err) {
        console.error('Failed to fetch rules:', err);
      }
    };
    
    // Fetch rules if not cached or update in background
    if (!savedRules) {
      fetchRules();
    } else {
      // Update in background even if cached
      fetchRules();
    }
  }, []);

  // Save planned courses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ece_planned_courses', JSON.stringify(plannedCourses));
  }, [plannedCourses]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Connect to our FastAPI backend
      const response = await axios.post('http://127.0.0.1:8000/api/sync', credentials);
      
      setStudentData(response.data);
      // Save to device storage!
      localStorage.setItem('ece_auth_data', JSON.stringify(response.data));
    } catch (err) {
      setError('Αποτυχία σύνδεσης. Ελέγξτε τα στοιχεία σας ή την κατάσταση της πύλης του πανεπιστημίου.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ece_auth_data');
    setStudentData(null);
    setCredentials({ username: '', password: '' });
  };

  // --- LOGIN SCREEN ---
  if (!studentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center text-blue-600">
            <GraduationCap size={48} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Σύμβουλος Σπουδών ΗΜ&ΜΥ ΑΠΘ
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Παρακολούθηση βαθμολογίας & τομέων
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Όνομα Χρήστη ΑΠΘ</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Κωδικός</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-blue-400"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <BookOpen className="mr-2" size={20} />}
                {isLoading ? 'Συγχρονισμός με ΑΠΘ...' : 'Συγχρονισμός Δεδομένων'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  
  // Bulletproof course matching by code
  const findCourseInRules = (courseCode) => {
    if (!rules || !courseCode) return null;
    
    // Search in basic cycle
    if (rules.basic_cycle) {
      for (const [semester, courses] of Object.entries(rules.basic_cycle)) {
        for (const ruleCourse of courses) {
          if (ruleCourse.code === courseCode) {
            return {
              ...ruleCourse,
              semester: parseInt(semester),
              sector: 'Βασικός Κύκλος',
              sectorKey: 'basic_cycle'
            };
          }
        }
      }
    }
    
    // Search in sectors
    if (rules.sectors) {
      for (const [sectorKey, sectorData] of Object.entries(rules.sectors)) {
        if (sectorData.courses) {
          for (const [semester, courses] of Object.entries(sectorData.courses)) {
            for (const ruleCourse of courses) {
              if (ruleCourse.code === courseCode) {
                return {
                  ...ruleCourse,
                  semester: parseInt(semester),
                  sector: sectorData.name,
                  sectorKey: sectorKey
                };
              }
            }
          }
        }
      }
    }
    
    return null;
  };
  
  const passedCourses = studentData.courses.filter(c => c.is_passed);
  const failedCourses = studentData.courses.filter(c => !c.is_passed && c.grade > 0);
  const notAttempted = studentData.courses.filter(c => c.grade === 0);
  
  // Exclude "Πρακτική άσκηση" from ECTS count towards graduation
  const isInternship = (courseName) => courseName && courseName.toLowerCase().includes('πρακτική');
  const passedCoursesForECTS = passedCourses.filter(c => !isInternship(c.name));
  const totalPassedEcts = passedCoursesForECTS.reduce((sum, course) => sum + course.ects, 0);
  
  // Calculate planned ECTS (exclude internship)
  const plannedCoursesForECTS = plannedCourses.filter(c => !isInternship(c.name));
  const totalPlannedEcts = plannedCoursesForECTS.reduce((sum, course) => sum + course.ects, 0);
  
  // Combined totals (passed + planned)
  const totalEcts = totalPassedEcts + totalPlannedEcts;
  
  // Calculate average grade (only for passed courses)
  const averageGrade = passedCourses.length > 0 
    ? (passedCourses.reduce((sum, course) => sum + course.grade, 0) / passedCourses.length).toFixed(2)
    : 0;
  
  // Calculate weighted GPA (grade * ects)
  const totalWeightedGrade = passedCourses.reduce((sum, course) => sum + (course.grade * course.ects), 0);
  const weightedGPA = totalPassedEcts > 0 ? (totalWeightedGrade / totalPassedEcts).toFixed(2) : 0;
  
  // Graduation requirements
  const REQUIRED_ECTS = 300;
  const DIPLOMA_THESIS_ECTS = 30;
  const remainingEcts = REQUIRED_ECTS - totalEcts;
  const progressPercentage = ((totalEcts / REQUIRED_ECTS) * 100).toFixed(1);
  const passedProgressPercentage = ((totalPassedEcts / REQUIRED_ECTS) * 100).toFixed(1);
  
  // Estimate remaining courses (assuming average 5 ECTS per course)
  const estimatedRemainingCourses = Math.ceil((remainingEcts - DIPLOMA_THESIS_ECTS) / 5);

  // Calculate sector-specific requirements (including planned courses)
  const getSectorRequirements = () => {
    if (!rules || !rules.sectors) return null;
    
    const specialty = studentData.profile.specialty;
    let sectorKey = null;
    let sectorName = '';
    
    // Map specialty to sector
    if (specialty.includes('ΗΛΕΚΤΡΟΝΙΚΗΣ')) {
      sectorKey = 'electronics';
      sectorName = 'Ηλεκτρονικής και Υπολογιστών';
    } else if (specialty.includes('ΕΝΕΡΓΕΙΑΣ')) {
      sectorKey = 'energy';
      sectorName = 'Ηλεκτρικής Ενέργειας';
    } else if (specialty.includes('ΤΗΛΕΠΙΚΟΙΝΩΝΙΩΝ')) {
      sectorKey = 'telecommunications';
      sectorName = 'Τηλεπικοινωνιών';
    }
    
    if (!sectorKey || !rules.sectors[sectorKey]) return null;
    
    const sector = rules.sectors[sectorKey];
    
    // Find which sector courses the student has passed using code matching
    // Exclude courses from other departments (they count for general ECTS but not specific sector)
    const passedSectorCourses = passedCourses.filter(studentCourse => {
      const courseInfo = findCourseInRules(studentCourse.code);
      return courseInfo && courseInfo.sectorKey === sectorKey && !courseInfo.isOtherDepartment;
    });
    
    const passedSectorEcts = passedSectorCourses.reduce((sum, course) => sum + course.ects, 0);
    
    // Find planned sector courses (exclude other department courses)
    const plannedSectorCourses = plannedCourses.filter(course => 
      course.sectorKey === sectorKey && !course.isOtherDepartment
    );
    const plannedSectorEcts = plannedSectorCourses.reduce((sum, course) => sum + course.ects, 0);
    
    const totalSectorEcts = passedSectorEcts + plannedSectorEcts;
    
    // Calculate requirements based on sector rules
    let requiredSectorEcts = 50; // Default minimum
    if (sector.rules.min_total_sector_ects) {
      requiredSectorEcts = sector.rules.min_total_sector_ects;
    }
    
    const remainingSectorEcts = Math.max(0, requiredSectorEcts - totalSectorEcts);
    
    return {
      name: sectorName,
      sectorKey: sectorKey,
      passedEcts: passedSectorEcts,
      plannedEcts: plannedSectorEcts,
      completed: totalSectorEcts,
      required: requiredSectorEcts,
      remaining: remainingSectorEcts,
      passedCourses: passedSectorCourses.length,
      plannedCourses: plannedSectorCourses.length
    };
  };
  
  const sectorInfo = getSectorRequirements();

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Navbar */}
      <nav className="bg-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <GraduationCap className="text-white mr-2" size={24} />
              <span className="font-bold text-white text-lg">Σύμβουλος ΗΜ&ΜΥ</span>
            </div>
            <button onClick={handleLogout} className="text-blue-100 hover:text-white flex items-center">
              <LogOut size={20} className="mr-1"/> Αποσύνδεση
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-xl shadow">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <BarChart3 size={20} className="mr-2" />
                <span className="hidden sm:inline">Επισκόπηση</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'courses'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <List size={20} className="mr-2" />
                <span className="hidden sm:inline">Μαθήματα</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'planner'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <Calendar size={20} className="mr-2" />
                <span className="hidden sm:inline">Πλάνο Σπουδών</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        
        {activeTab === 'overview' && (
          <>
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow p-6">
              {/* Student Name Header */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {studentData.profile.name || 'Φοιτητής'}
                </h1>
                <p className="text-sm text-gray-600">
                  {studentData.profile.department || 'Τμήμα Ηλεκτρολόγων Μηχανικών και Μηχανικών Υπολογιστών'}
                </p>
              </div>
              
              {/* Specialty */}
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Τομέας Ειδίκευσης</h2>
                <p className="text-lg font-semibold text-blue-700">{studentData.profile.specialty}</p>
              </div>
            </div>

            {/* Stats Grid - Moved to top */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow p-5 text-center border-l-4 border-blue-500">
                <span className="block text-4xl font-bold text-blue-700">{totalPassedEcts}</span>
                {totalPlannedEcts > 0 && (
                  <span className="block text-xs font-semibold text-cyan-600 mt-1">+{totalPlannedEcts} Προγρ.</span>
                )}
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide mt-1 block">Συνολικά ECTS</span>
              </div>
              <div className="bg-white rounded-xl shadow p-5 text-center border-l-4 border-green-500">
                <span className="block text-4xl font-bold text-green-700">{passedCourses.length}</span>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide mt-1 block">Περασμένα</span>
              </div>
              <div className="bg-white rounded-xl shadow p-5 text-center border-l-4 border-purple-500">
                <span className="block text-4xl font-bold text-purple-700">{weightedGPA}</span>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide mt-1 block">ΜΟ Σταθμικός</span>
              </div>
              <div className="bg-white rounded-xl shadow p-5 text-center border-l-4 border-amber-500">
                <span className="block text-4xl font-bold text-amber-700">{averageGrade}</span>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide mt-1 block">Μέσος Όρος</span>
              </div>
            </div>

            {/* ECE Advisor Card */}
            {rules && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
                <div className="flex items-center mb-4">
                  <Award className="text-indigo-600 mr-2" size={28} />
                  <h2 className="text-xl font-bold text-gray-900">Σύμβουλος Σπουδών ΗΜ&ΜΥ</h2>
                </div>

                {/* Graduation Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Πρόοδος προς Πτυχίο</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {totalEcts} / {rules.graduation_requirements?.total_ects || 300} ECTS ({progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-4 mb-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${progressPercentage}%` }}
                    >
                      {parseFloat(progressPercentage) > 15 && (
                        <span className="text-xs font-bold text-white">{progressPercentage}%</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Απομένουν {remainingEcts} ECTS για αποφοίτηση
                  </p>
                </div>

                {/* Sector Gatekeeper Logic */}
                {(() => {
                  const sectorThreshold = rules.graduation_requirements?.sector_selection_threshold_ects || 94;
                  const canDeclareSector = totalEcts >= sectorThreshold;
                  const ectsNeeded = sectorThreshold - totalEcts;

                  return (
                    <div className={`mb-6 p-4 rounded-lg border-2 ${
                      canDeclareSector 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-yellow-50 border-yellow-300'
                    }`}>
                      <div className="flex items-start">
                        {canDeclareSector ? (
                          <CheckCircle className="text-green-600 mr-3 flex-shrink-0 mt-0.5" size={24} />
                        ) : (
                          <Lock className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" size={24} />
                        )}
                        <div className="flex-1">
                          <h3 className={`font-bold mb-1 ${
                            canDeclareSector ? 'text-green-900' : 'text-yellow-900'
                          }`}>
                            {canDeclareSector 
                              ? '✓ Δικαίωμα Επιλογής Τομέα' 
                              : '⚠ Απαιτείται Κατώφλι για Τομέα'
                            }
                          </h3>
                          <p className={`text-sm ${
                            canDeclareSector ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {canDeclareSector 
                              ? `Έχεις συγκεντρώσει ${totalEcts} ECTS (≥ ${sectorThreshold}). Μπορείς επίσημα να δηλώσεις τομέα σπουδών!`
                              : `Χρειάζεσαι ${ectsNeeded} επιπλέον ECTS για να φτάσεις τα ${sectorThreshold} ECTS και να δηλώσεις επίσημα τομέα.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Basic Cycle Progress */}
                {(() => {
                  const BASIC_CYCLE_REQUIRED = 180;
                  // Calculate basic cycle ECTS from passed courses
                  const passedBasicCycleEcts = passedCourses.reduce((sum, studentCourse) => {
                    const courseInfo = findCourseInRules(studentCourse.code);
                    if (courseInfo && courseInfo.sectorKey === 'basic_cycle') {
                      return sum + studentCourse.ects;
                    }
                    return sum;
                  }, 0);
                  
                  // Calculate planned basic cycle ECTS
                  const plannedBasicCycleEcts = plannedCourses
                    .filter(c => c.sectorKey === 'basic_cycle')
                    .reduce((sum, c) => sum + c.ects, 0);
                  
                  const totalBasicCycleEcts = passedBasicCycleEcts + plannedBasicCycleEcts;
                  const basicCycleProgress = ((totalBasicCycleEcts / BASIC_CYCLE_REQUIRED) * 100).toFixed(1);
                  const passedBasicCycleProgress = ((passedBasicCycleEcts / BASIC_CYCLE_REQUIRED) * 100).toFixed(1);
                  
                  return (
                    <div className="bg-white rounded-lg p-4 border border-indigo-200 mb-4">
                      <h3 className="font-bold text-gray-900 mb-3">Μαθήματα Κορμού (Βασικός Κύκλος)</h3>
                      
                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Πρόοδος Κορμού</span>
                          <span className="text-sm font-bold text-blue-600">
                            {passedBasicCycleEcts} / {BASIC_CYCLE_REQUIRED} ECTS
                            {plannedBasicCycleEcts > 0 && <span className="text-cyan-600"> (+{plannedBasicCycleEcts})</span>}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                          {/* Passed basic cycle ECTS */}
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 absolute left-0"
                            style={{ width: `${passedBasicCycleProgress}%` }}
                          ></div>
                          {/* Planned basic cycle ECTS */}
                          {plannedBasicCycleEcts > 0 && (
                            <div 
                              className="bg-gradient-to-r from-cyan-300 to-cyan-400 h-3 rounded-full transition-all duration-500 absolute"
                              style={{ 
                                left: `${passedBasicCycleProgress}%`,
                                width: `${Math.min(100 - parseFloat(passedBasicCycleProgress), (plannedBasicCycleEcts / BASIC_CYCLE_REQUIRED) * 100)}%`
                              }}
                            ></div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">{basicCycleProgress}% ολοκληρώθηκε</span>
                          <span className="text-xs text-orange-600 font-medium">
                            {Math.max(0, BASIC_CYCLE_REQUIRED - totalBasicCycleEcts)} ECTS απομένουν
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sector Progress */}
                {sectorInfo && (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">Τομέας: {sectorInfo.name}</h3>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                        {studentData.profile.specialty}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Πρόοδος Τομέα</span>
                        <span className="text-sm font-bold text-indigo-600">
                          {sectorInfo.passedEcts} / {sectorInfo.required} ECTS
                          {sectorInfo.plannedEcts > 0 && <span className="text-cyan-600"> (+{sectorInfo.plannedEcts})</span>}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        {/* Passed sector ECTS - Solid */}
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500 absolute left-0"
                          style={{ width: `${Math.min(100, (sectorInfo.passedEcts / sectorInfo.required) * 100)}%` }}
                        ></div>
                        {/* Planned sector ECTS - Lighter */}
                        {sectorInfo.plannedEcts > 0 && (
                          <div 
                            className="bg-gradient-to-r from-cyan-300 to-cyan-400 h-3 rounded-full transition-all duration-500 absolute"
                            style={{ 
                              left: `${Math.min(100, (sectorInfo.passedEcts / sectorInfo.required) * 100)}%`,
                              width: `${Math.min(100 - ((sectorInfo.passedEcts / sectorInfo.required) * 100), (sectorInfo.plannedEcts / sectorInfo.required) * 100)}%`
                            }}
                          ></div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ολοκληρωμένα:</span>
                        <span className="font-semibold text-green-600">{sectorInfo.passedCourses} μαθήματα</span>
                      </div>
                      {sectorInfo.plannedCourses > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Προγραμματισμένα:</span>
                          <span className="font-semibold text-cyan-600">{sectorInfo.plannedCourses} μαθήματα</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Απομένουν:</span>
                        <span className="font-semibold text-orange-600">{sectorInfo.remaining} ECTS</span>
                      </div>
                    </div>

                    {sectorInfo.remaining > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          💡 <strong>Συμβουλή:</strong> Επίλεξε μαθήματα από τον τομέα {sectorInfo.name} για να ολοκληρώσεις τις απαιτήσεις.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* No Sector Info */}
                {!sectorInfo && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">
                      <AlertCircle className="inline mr-1" size={16} />
                      Δεν εντοπίστηκε συγκεκριμένος τομέας. Βεβαιώσου ότι το προφίλ σου περιλαμβάνει την ειδικότητα σπουδών.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Remaining Work Card */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow p-6 border border-orange-200">
              <div className="flex items-center mb-4">
                <Target className="text-orange-600 mr-2" size={24} />
                <h2 className="text-lg font-bold text-gray-900">Απομένουν για Αποφοίτηση</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Συνολικά ECTS:</span>
                  <span className="font-bold text-orange-600">
                    {remainingEcts > 0 ? `${remainingEcts} ECTS` : 'Ολοκληρώθηκε! 🎉'}
                  </span>
                </div>
                {remainingEcts > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Εκτιμώμενα Μαθήματα:</span>
                    <span className="font-bold text-orange-600">~{estimatedRemainingCourses} μαθήματα + Διπλωματική (30 ECTS)</span>
                  </div>
                )}
                
                {/* Sector-specific requirements */}
                {sectorInfo && (
                  <>
                    <div className="pt-3 border-t border-orange-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">Τομέας {sectorInfo.name}:</span>
                      </div>
                      <div className="flex justify-between items-center pl-4">
                        <span className="text-gray-700">ECTS από Τομέα:</span>
                        <span className="font-bold text-blue-600">
                          {sectorInfo.passedEcts} / {sectorInfo.required} ECTS
                          {sectorInfo.plannedEcts > 0 && <span className="text-cyan-600"> (+{sectorInfo.plannedEcts})</span>}
                        </span>
                      </div>
                      {sectorInfo.remaining > 0 && (
                        <div className="flex justify-between items-center pl-4">
                          <span className="text-gray-700">Απομένουν:</span>
                          <span className="font-bold text-orange-600">{sectorInfo.remaining} ECTS</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'courses' && (
          <div>
            <div className="flex items-center mb-6">
              <TrendingUp className="text-gray-700 mr-2" size={24} />
              <h2 className="text-lg font-bold text-gray-900">Πλήρες Ακαδημαϊκό Ιστορικό</h2>
            </div>
            
            {/* Show warning if student data lacks code property */}
            {studentData.courses.length > 0 && !studentData.courses[0].code && (
              <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" size={24} />
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-1">⚠ Απαιτείται Επανασυγχρονισμός</h3>
                    <p className="text-sm text-yellow-800">
                      Τα δεδομένα σου δεν περιέχουν κωδικούς μαθημάτων. Παρακαλώ <strong>αποσυνδέσου και συνδέσου ξανά</strong> για να ενημερωθούν τα δεδομένα σου με το νέο σύστημα.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {(() => {
              // Group courses by semester using code matching
              const coursesBySemester = {};
              
              studentData.courses.forEach(course => {
                const courseInfo = findCourseInRules(course.code);
                const semKey = courseInfo?.semester || 'unknown';
                
                if (!coursesBySemester[semKey]) {
                  coursesBySemester[semKey] = [];
                }
                
                coursesBySemester[semKey].push({
                  ...course,
                  courseInfo: courseInfo
                });
              });
              
              // Sort semester keys
              const sortedSemesters = Object.keys(coursesBySemester).sort((a, b) => {
                if (a === 'unknown') return 1;
                if (b === 'unknown') return -1;
                return parseInt(a) - parseInt(b);
              });
              
              const getSemesterLabel = (sem) => {
                if (sem === 'unknown') return 'Άλλα Μαθήματα';
                if (sem === '10') return '10ο Εξάμηνο - Διπλωματική';
                const ordinals = ['', '1ο', '2ο', '3ο', '4ο', '5ο', '6ο', '7ο', '8ο', '9ο', '10ο'];
                return `${ordinals[parseInt(sem)]} Εξάμηνο`;
              };
              
              const getSectorBadgeColor = (sectorKey) => {
                if (!sectorKey || sectorKey === 'basic_cycle') return 'bg-gray-100 text-gray-700';
                if (sectorKey === 'electronics') return 'bg-blue-100 text-blue-700';
                if (sectorKey === 'energy') return 'bg-amber-100 text-amber-700';
                if (sectorKey === 'telecommunications') return 'bg-purple-100 text-purple-700';
                if (sectorKey === 'other_department') return 'bg-orange-100 text-orange-700';
                return 'bg-gray-100 text-gray-700';
              };
              
              return (
                <div className="space-y-6">
                  {sortedSemesters.map(semester => (
                    <div key={semester}>
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-3 flex items-center justify-between">
                        <h3 className="font-bold text-lg">{getSemesterLabel(semester)}</h3>
                        <span className="text-sm bg-blue-500 px-3 py-1 rounded-full">
                          {coursesBySemester[semester].length} μαθήματα
                        </span>
                      </div>
                      <div className="space-y-3">
                        {coursesBySemester[semester].map((course, index) => (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between p-4 rounded-xl border ${
                              course.is_passed 
                                ? 'bg-white border-green-200' 
                                : course.grade > 0 
                                  ? 'bg-red-50 border-red-200' 
                                  : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden flex-1">
                              {course.is_passed ? 
                                <CheckCircle className="text-green-500 flex-shrink-0" size={24} /> : 
                                course.grade > 0 ?
                                <XCircle className="text-red-500 flex-shrink-0" size={24} /> :
                                <AlertCircle className="text-gray-400 flex-shrink-0" size={24} />
                              }
                              <div className="truncate flex-1 min-w-0">
                                <p className={`font-semibold truncate ${
                                  course.is_passed 
                                    ? 'text-gray-900' 
                                    : course.grade > 0 
                                      ? 'text-red-900' 
                                      : 'text-gray-600'
                                }`}>
                                  {course.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {/* ECTS Badge */}
                                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-700">
                                    {course.ects} ECTS
                                  </span>
                                  
                                  {/* Type Badge - Κορμού or Επιλογής */}
                                  {course.courseInfo && course.courseInfo.type && (
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                      course.courseInfo.type === 'mandatory' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {course.courseInfo.type === 'mandatory' ? 'Κορμού' : 'Επιλογής'}
                                    </span>
                                  )}
                                  
                                  {/* Sector Badge */}
                                  {course.courseInfo && course.courseInfo.sector && (
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getSectorBadgeColor(course.courseInfo.sectorKey)}`}>
                                      {course.courseInfo.sectorKey === 'basic_cycle' ? 'Βασικός Κύκλος' : 
                                       course.courseInfo.sectorKey === 'electronics' ? 'Ηλεκτρονικής' :
                                       course.courseInfo.sectorKey === 'energy' ? 'Ενέργειας' :
                                       course.courseInfo.sectorKey === 'telecommunications' ? 'Τηλεπικοινωνιών' :
                                       course.courseInfo.sector}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="pl-4 flex-shrink-0">
                              <span className={`text-lg font-bold ${
                                course.is_passed 
                                  ? 'text-green-600' 
                                  : course.grade > 0 
                                    ? 'text-red-600' 
                                    : 'text-gray-400'
                              }`}>
                                {course.grade === 0 ? '—' : course.grade.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'planner' && (
          <div>
            {/* Planned Courses at the top */}
            {plannedCourses.length > 0 && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-cyan-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Calendar className="text-cyan-600 mr-2" size={28} />
                    <h2 className="text-xl font-bold text-gray-900">Προγραμματισμένα Μαθήματα</h2>
                  </div>
                  <span className="bg-cyan-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                    {totalPlannedEcts} ECTS
                  </span>
                </div>
                <div className="space-y-3">
                  {plannedCourses.map((course, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-cyan-200">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-semibold text-gray-900 truncate">{course.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm text-gray-500">{course.ects} ECTS</span>
                          {course.sector && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              course.sectorKey === 'basic_cycle' ? 'bg-gray-100 text-gray-700' :
                              course.sectorKey === 'electronics' ? 'bg-blue-100 text-blue-700' :
                              course.sectorKey === 'energy' ? 'bg-amber-100 text-amber-700' :
                              course.sectorKey === 'telecommunications' ? 'bg-purple-100 text-purple-700' :
                              course.sectorKey === 'other_department' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {course.sectorKey === 'basic_cycle' ? 'Βασικός Κύκλος' : course.sector}
                            </span>
                          )}
                          {course.type === 'elective' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                              Επιλογής
                            </span>
                          )}
                          {course.isOtherDepartment && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700" title="Μετράει στα γενικά ECTS αλλά όχι στα ειδικά ECTS τομέα">
                              ⓘ Γενικό ECTS μόνο
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setPlannedCourses(plannedCourses.filter((_, i) => i !== index))}
                        className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex-shrink-0"
                      >
                        <Minus size={16} className="mr-1" />
                        Αφαίρεση
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Courses */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Διαθέσιμα Μαθήματα</h2>
                <button
                  onClick={() => setShowCustomCourseForm(!showCustomCourseForm)}
                  className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus size={18} className="mr-1" />
                  Νέο Μάθημα
                </button>
              </div>

              {/* Custom Course Form */}
              {showCustomCourseForm && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <h3 className="font-bold text-green-900 mb-3">Προσθήκη Προσωπικού Μαθήματος</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Όνομα Μαθήματος *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={customCourse.name}
                        onChange={(e) => setCustomCourse({...customCourse, name: e.target.value})}
                        placeholder="π.χ. Προχωρημένη Φυσική"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Κωδικός Μαθήματος *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={customCourse.code}
                        onChange={(e) => setCustomCourse({...customCourse, code: e.target.value})}
                        placeholder="π.χ. CUSTOM001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ECTS *</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={customCourse.ects}
                        onChange={(e) => setCustomCourse({...customCourse, ects: parseInt(e.target.value) || 5})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Εξάμηνο</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={customCourse.semester}
                        onChange={(e) => setCustomCourse({...customCourse, semester: parseInt(e.target.value)})}
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(sem => (
                          <option key={sem} value={sem}>{sem}ο Εξάμηνο</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Τομέας</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={customCourse.sectorKey}
                        onChange={(e) => setCustomCourse({...customCourse, sectorKey: e.target.value})}
                      >
                        <option value="basic_cycle">Βασικός Κύκλος</option>
                        <option value="electronics">Ηλεκτρονικής και Υπολογιστών</option>
                        <option value="energy">Ηλεκτρικής Ενέργειας</option>
                        <option value="telecommunications">Τηλεπικοινωνιών</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Τύπος</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={customCourse.type}
                        onChange={(e) => setCustomCourse({...customCourse, type: e.target.value})}
                      >
                        <option value="mandatory">Υποχρεωτικό</option>
                        <option value="elective">Επιλογής</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Other Department Checkbox */}
                  <div className="mt-3 flex items-start">
                    <input
                      type="checkbox"
                      id="otherDepartment"
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      checked={customCourse.isOtherDepartment}
                      onChange={(e) => setCustomCourse({...customCourse, isOtherDepartment: e.target.checked})}
                    />
                    <label htmlFor="otherDepartment" className="ml-2 block text-sm text-gray-700">
                      <strong>Από άλλο τμήμα</strong>
                      <span className="block text-xs text-gray-500 mt-1">
                        Το μάθημα μετράει στα γενικά ECTS αλλά ΌΧΙ στα ειδικά ECTS του τομέα (π.χ. τα 50 ECTS Ηλεκτρονικής)
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        if (customCourse.name && customCourse.code) {
                          const newCourse = {
                            ...customCourse,
                            sector: customCourse.isOtherDepartment ? 'Άλλο Τμήμα' :
                                   customCourse.sectorKey === 'basic_cycle' ? 'Βασικός Κύκλος' :
                                   customCourse.sectorKey === 'electronics' ? 'Ηλεκτρονικής και Υπολογιστών' :
                                   customCourse.sectorKey === 'energy' ? 'Ηλεκτρικής Ενέργειας' :
                                   'Τηλεπικοινωνιών',
                            sectorKey: customCourse.isOtherDepartment ? 'other_department' : customCourse.sectorKey,
                            isCustom: true
                          };
                          setPlannedCourses([...plannedCourses, newCourse]);
                          setCustomCourse({ name: '', code: '', ects: 5, type: 'mandatory', semester: 7, sectorKey: 'basic_cycle', isOtherDepartment: false });
                          setShowCustomCourseForm(false);
                        } else {
                          alert('Παρακαλώ συμπληρώστε τουλάχιστον το όνομα και τον κωδικό του μαθήματος.');
                        }
                      }}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Προσθήκη στο Πλάνο
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomCourseForm(false);
                        setCustomCourse({ name: '', code: '', ects: 5, type: 'mandatory', semester: 7, sectorKey: 'basic_cycle', isOtherDepartment: false });
                      }}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Ακύρωση
                    </button>
                  </div>
                </div>
              )}

              {/* Filters - Compact Version */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700 text-sm">Φίλτρα</h3>
                  {(selectedSemesters.length > 0 || selectedSectors.length > 0) && (
                    <button
                      onClick={() => {
                        setSelectedSemesters([]);
                        setSelectedSectors([]);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Καθαρισμός
                    </button>
                  )}
                </div>
                
                {/* Semester Filter - Compact */}
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Εξάμηνα</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[1,2,3,4,5,6,7,8,9,10].map(sem => (
                      <button
                        key={sem}
                        onClick={() => {
                          if (selectedSemesters.includes(sem)) {
                            setSelectedSemesters(selectedSemesters.filter(s => s !== sem));
                          } else {
                            setSelectedSemesters([...selectedSemesters, sem]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectedSemesters.includes(sem)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {sem}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Sector Filter - Compact */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Τομείς</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'basic_cycle', label: 'Βασικός' },
                      { key: 'electronics', label: 'Ηλεκτρονικής' },
                      { key: 'energy', label: 'Ενέργειας' },
                      { key: 'telecommunications', label: 'Τηλεπικοινωνιών' },
                      { key: 'other_department', label: 'Άλλο Τμήμα' }
                    ].map(sector => (
                      <button
                        key={sector.key}
                        onClick={() => {
                          if (selectedSectors.includes(sector.key)) {
                            setSelectedSectors(selectedSectors.filter(s => s !== sector.key));
                          } else {
                            setSelectedSectors([...selectedSectors, sector.key]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectedSectors.includes(sector.key)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {sector.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Αναζήτηση μαθήματος..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {(() => {
                // Get all passed course codes
                const passedCourseCodes = new Set(passedCourses.map(c => c.code));
                const plannedCourseCodes = new Set(plannedCourses.map(c => c.code));
                
                // Collect all available courses from rules
                const availableCourses = [];
                
                // From basic cycle
                if (rules?.basic_cycle) {
                  for (const [semester, courses] of Object.entries(rules.basic_cycle)) {
                    for (const course of courses) {
                      if (!passedCourseCodes.has(course.code) && !plannedCourseCodes.has(course.code)) {
                        availableCourses.push({
                          ...course,
                          semester: parseInt(semester),
                          sector: 'Βασικός Κύκλος',
                          sectorKey: 'basic_cycle'
                        });
                      }
                    }
                  }
                }
                
                // From sectors
                if (rules?.sectors) {
                  for (const [sectorKey, sectorData] of Object.entries(rules.sectors)) {
                    if (sectorData.courses) {
                      for (const [semester, courses] of Object.entries(sectorData.courses)) {
                        for (const course of courses) {
                          if (!passedCourseCodes.has(course.code) && !plannedCourseCodes.has(course.code)) {
                            availableCourses.push({
                              ...course,
                              semester: parseInt(semester),
                              sector: sectorData.name,
                              sectorKey: sectorKey
                            });
                          }
                        }
                      }
                    }
                  }
                }
                
                // Filter by search query
                let filteredCourses = searchQuery
                  ? availableCourses.filter(course =>
                      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      course.code.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : availableCourses;
                
                // Apply semester filter
                if (selectedSemesters.length > 0) {
                  filteredCourses = filteredCourses.filter(course => 
                    selectedSemesters.includes(course.semester)
                  );
                }
                
                // Apply sector filter
                if (selectedSectors.length > 0) {
                  filteredCourses = filteredCourses.filter(course => 
                    selectedSectors.includes(course.sectorKey)
                  );
                }
                
                // Sort by semester
                filteredCourses.sort((a, b) => a.semester - b.semester);
                
                const getSemesterLabel = (sem) => {
                  if (sem === 10) return '10ο Εξάμηνο - Διπλωματική';
                  const ordinals = ['', '1ο', '2ο', '3ο', '4ο', '5ο', '6ο', '7ο', '8ο', '9ο', '10ο'];
                  return `${ordinals[sem]} Εξάμηνο`;
                };
                
                // Group by semester
                const coursesBySemester = {};
                filteredCourses.forEach(course => {
                  if (!coursesBySemester[course.semester]) {
                    coursesBySemester[course.semester] = [];
                  }
                  coursesBySemester[course.semester].push(course);
                });
                
                const sortedSemesters = Object.keys(coursesBySemester).sort((a, b) => parseInt(a) - parseInt(b));
                
                return (
                  <div className="space-y-4">
                    {filteredCourses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {searchQuery ? 'Δεν βρέθηκαν μαθήματα με αυτό τον όρο αναζήτησης.' : 'Έχεις ολοκληρώσει όλα τα διαθέσιμα μαθήματα! 🎉'}
                      </div>
                    ) : (
                      sortedSemesters.map(semester => (
                        <div key={semester}>
                          <h3 className="font-bold text-gray-700 mb-2 px-2">{getSemesterLabel(parseInt(semester))}</h3>
                          <div className="space-y-2">
                            {coursesBySemester[semester].map((course, index) => (
                              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                                <div className="flex-1 min-w-0 mr-4">
                                  <p className="font-semibold text-gray-900 truncate">{course.name}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-sm text-gray-500">{course.ects} ECTS</span>
                                    <span className="text-xs text-gray-400">Κωδ: {course.code}</span>
                                    {course.sector && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        course.sectorKey === 'basic_cycle' ? 'bg-gray-100 text-gray-700' :
                                        course.sectorKey === 'electronics' ? 'bg-blue-100 text-blue-700' :
                                        course.sectorKey === 'energy' ? 'bg-amber-100 text-amber-700' :
                                        course.sectorKey === 'telecommunications' ? 'bg-purple-100 text-purple-700' :
                                        course.sectorKey === 'other_department' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {course.sectorKey === 'basic_cycle' ? 'Βασικός Κύκλος' : course.sector}
                                      </span>
                                    )}
                                    {course.type === 'elective' && (
                                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                                        Επιλογής
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setPlannedCourses([...plannedCourses, course])}
                                  className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex-shrink-0"
                                >
                                  <Plus size={16} className="mr-1" />
                                  Προσθήκη
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}