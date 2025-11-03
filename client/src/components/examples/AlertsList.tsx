import AlertsList from '../AlertsList';

export default function AlertsListExample() {
  const mockAlerts = [
    {
      id: '1',
      type: 'warning' as const,
      title: 'Missed 9:15 Capture',
      subtitle: 'RFC Machine Checklist',
      time: '2 hours ago'
    },
    {
      id: '2',
      type: 'warning' as const,
      title: 'Checklist Not Created Today',
      subtitle: 'RFC Machine Checklist',
      time: '5 hours ago'
    },
    {
      id: '3',
      type: 'error' as const,
      title: 'Critical Spare Part Required',
      subtitle: 'PET Blowing Machine - Hydraulic Fluid Low',
      time: '1 hour ago'
    }
  ];

  return (
    <div className="pt-14">
      <AlertsList alerts={mockAlerts} />
    </div>
  );
}
