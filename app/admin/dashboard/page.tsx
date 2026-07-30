import { FileText, Users, Settings } from 'lucide-react';

const stats = [
  { icon: FileText, label: 'Blog Posts', value: 3 },
  { icon: Users, label: 'Team Members', value: 3 },
  { icon: Settings, label: 'Settings', value: 12 },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow-md">
            <stat.icon className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-2xl font-bold">{stat.value}</h3>
            <p className="text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
