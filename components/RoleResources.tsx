"use client"

import { Building2, GraduationCap, Scale, Users } from "lucide-react"

const ORGANIZATION_ROLES = {
  enterprises: {
    name: "Enterprises",
    description: "Large corporations",
    color: "from-sky-200 to-cyan-200",
    icon: Building2,
    resources: [
      { name: "Team Mgmt", description: "Manage teams" },
      { name: "Compliance", description: "Meet regulations" },
      { name: "Analytics", description: "Track KPIs" },
      { name: "Multi-tenant", description: "Multiple divisions" },
    ],
  },
  educational: {
    name: "Education",
    description: "Schools & universities",
    color: "from-purple-200 to-pink-200",
    icon: GraduationCap,
    resources: [
      { name: "Courses", description: "Manage courses" },
      { name: "Students", description: "Track progress" },
      { name: "Assessments", description: "Grading tools" },
      { name: "Research", description: "Collaboration" },
    ],
  },
  government: {
    name: "Government",
    description: "Public sector",
    color: "from-rose-200 to-orange-200",
    icon: Scale,
    resources: [
      { name: "Access", description: "Security control" },
      { name: "Audit", description: "Activity logs" },
      { name: "Docs", description: "File storage" },
      { name: "Reports", description: "Compliance" },
    ],
  },
  professional: {
    name: "Professional",
    description: "Associations",
    color: "from-emerald-200 to-teal-200",
    icon: Users,
    resources: [
      { name: "Members", description: "Member data" },
      { name: "Certs", description: "Track licenses" },
      { name: "Events", description: "Host meets" },
      { name: "Knowledge", description: "Standards" },
    ],
  },
}

export default function OrganizationRoles() {
  return (
    <div className="py-8 px-3">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">
            Organization Role Resources
          </h1>
          <p className="text-sm text-muted-foreground">
            Tools by organization type
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {Object.entries(ORGANIZATION_ROLES).map(([key, org]) => {
            const Icon = org.icon
            return (
              <div
                key={key}
                className="rounded-md border bg-card shadow-sm
                           hover:shadow transition-all overflow-hidden"
              >
                {/* Top */}
                <div className={`bg-gradient-to-br ${org.color} p-3`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-1.5 bg-white/70 rounded">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-[9px] px-1.5 py-0.5 bg-white/60 rounded-full">
                      {org.resources.length}
                    </div>
                  </div>
                  <h2 className="text-sm font-semibold leading-tight">
                    {org.name}
                  </h2>
                  <p className="text-[10px] text-slate-600 leading-snug">
                    {org.description}
                  </p>
                </div>

                {/* Resources */}
                <div className="p-3">
                  <div className="space-y-2">
                    {org.resources.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent mt-1.5" />
                        <div>
                          <p className="text-[11px] font-medium leading-tight">
                            {r.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {r.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
