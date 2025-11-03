import ChecklistHistoryTable from '../ChecklistHistoryTable';

export default function ChecklistHistoryTableExample() {
  const mockRecords = [
    {
      id: '1',
      machine: 'RFC Machine',
      date: 'Oct 31, 2025',
      shift: 'Morning',
      operator: 'Ramesh Kumar',
      status: 'approved' as const
    },
    {
      id: '2',
      machine: 'PET Blowing Machine',
      date: 'Oct 31, 2025',
      shift: 'Afternoon',
      operator: 'Priya Sharma',
      status: 'in_review' as const
    },
    {
      id: '3',
      machine: 'Batch Coding Machine',
      date: 'Oct 30, 2025',
      shift: 'Night',
      operator: 'Amit Patel',
      status: 'pending' as const
    }
  ];

  return (
    <div className="p-4">
      <ChecklistHistoryTable records={mockRecords} />
    </div>
  );
}
