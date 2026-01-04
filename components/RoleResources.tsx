'use client';

import { Shield, Package } from 'lucide-react';

const ROLE_RESOURCES = {
  student: {
    name: 'Student',
    color: 'indigo',
    icon: '🎓',
    resources: [
      { name: 'Learning Materials', description: 'Download lectures and notes', icon: '📄' },
      { name: 'Assignments', description: 'Submit homework and projects', icon: '✏️' },
      { name: 'Grades & Feedback', description: 'View performance and instructor comments', icon: '📊' }
    ]
  },
  employee: {
    name: 'Employee',
    color: 'blue',
    icon: '💼',
    resources: [
      { name: 'Task Management', description: 'View and update assigned tasks', icon: '✅' },
      { name: 'Time Tracking', description: 'Log hours and attendance', icon: '⏰' },
      { name: 'Payroll Access', description: 'View salary and benefits', icon: '💰' }
    ]
  },
  faculty: {
    name: 'Faculty/Professor',
    color: 'purple',
    icon: '🧑‍🏫',
    resources: [
      { name: 'Course Creation', description: 'Design and publish new courses', icon: '➕' },
      { name: 'Student Grading', description: 'Evaluate assignments and exams', icon: '📝' },
      { name: 'Lecture Scheduling', description: 'Manage class timetables', icon: '🗓️' }
    ]
  },
  researcher: {
    name: 'Researcher',
    color: 'green',
    icon: '🔬',
    resources: [
      { name: 'Lab Access', description: 'Book equipment and facilities', icon: '🧪' },
      { name: 'Data Analysis', description: 'Use advanced analytics tools', icon: '📈' },
      { name: 'Publication Portal', description: 'Submit papers and reports', icon: '📄' }
    ]
  },
  administrator: {
    name: 'Administrator',
    color: 'red',
    icon: '🛡️',
    resources: [
      { name: 'User Management', description: 'Add/remove users and roles', icon: '👥' },
      { name: 'System Configuration', description: 'Update platform settings', icon: '⚙️' },
      { name: 'Backup & Security', description: 'Manage data and access controls', icon: '🔒' }
    ]
  },
  developer: {
    name: 'Developer',
    color: 'cyan',
    icon: '💻',
    resources: [
      { name: 'Code Repository', description: 'Full access to source code', icon: '📁' },
      { name: 'Testing Environment', description: 'Run tests and debug', icon: '🧪' },
      { name: 'Deployment Tools', description: 'Push updates to production', icon: '🚀' }
    ]
  },
  manager: {
    name: 'Manager',
    color: 'orange',
    icon: '👔',
    resources: [
      { name: 'Team Oversight', description: 'Monitor team performance', icon: '👀' },
      { name: 'Budget Control', description: 'Allocate resources', icon: '📊' },
      { name: 'Meeting Scheduler', description: 'Organize team events', icon: '🗓️' }
    ]
  }
};

const getRoleColorClasses = (color: string) => {
  const gradients: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-700',
    blue: 'from-blue-500 to-blue-700',
    purple: 'from-purple-500 to-purple-700',
    green: 'from-green-500 to-green-700',
    red: 'from-red-500 to-red-700',
    cyan: 'from-cyan-500 to-cyan-700',
    orange: 'from-orange-500 to-orange-700',
    gray: 'from-gray-500 to-gray-700',
  };
  return gradients[color] || 'from-gray-500 to-gray-700';
};

export default function RoleResources() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-2 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl md:text-xl font-bold text-center mb-5 text-gray-800">
          Role Permissions Overview
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-5">
          {Object.entries(ROLE_RESOURCES).map(([key, role]) => (
            <div
              key={key}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col h-full"
            >
              {/* Header - reduced height */}
              <div className={`bg-gradient-to-r ${getRoleColorClasses(role.color)} p-4 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg">{role.icon}</div>
                  <Shield className="w-6 h-6 opacity-70" />
                </div>
                <h3 className="text-sm font-bold">{role.name}</h3>
                <p className="text-white/80 text-xs mt-1">{role.resources.length} Resources</p>
              </div>

              {/* Resources - compact list */}
              <div className="p-3 space-y-2 flex-1">
                {role.resources.map((resource, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-xs"
                  >
                    <div className="text-xl flex-shrink-0 mt-0.5">{resource.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 truncate">{resource.name}</h4>
                      <p className="text-gray-600 line-clamp-2 text-xs mt-0.5">{resource.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

   
      </div>
    </div>
  );
}