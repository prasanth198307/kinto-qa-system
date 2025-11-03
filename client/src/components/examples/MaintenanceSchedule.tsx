import MaintenanceSchedule from '../MaintenanceSchedule';

export default function MaintenanceScheduleExample() {
  const mockTasks = [
    {
      id: '1',
      machine: 'RFC Machine',
      taskType: 'Quarterly Deep Clean',
      scheduledDate: 'Nov 5, 2025',
      status: 'upcoming' as const,
      assignedTo: 'Maintenance Team A'
    },
    {
      id: '2',
      machine: 'Air Compressor',
      taskType: 'Oil Change',
      scheduledDate: 'Oct 30, 2025',
      status: 'overdue' as const,
      assignedTo: 'Rajesh Singh'
    },
    {
      id: '3',
      machine: 'Chiller Machine',
      taskType: 'Coolant Level Check',
      scheduledDate: 'Oct 28, 2025',
      status: 'completed' as const,
      assignedTo: 'Suresh Kumar'
    }
  ];

  return (
    <div className="p-4">
      <MaintenanceSchedule tasks={mockTasks} />
    </div>
  );
}
