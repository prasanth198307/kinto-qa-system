import ChecklistForm from '../ChecklistForm';

export default function ChecklistFormExample() {
  const mockTasks = [
    {
      id: '1',
      name: 'Clean the Machine',
      verificationCriteria: 'Wipe down surfaces and remove any spills or residues',
      result: null,
      remarks: ''
    },
    {
      id: '2',
      name: 'Check for Leaks',
      verificationCriteria: 'Inspect hoses and fittings for leaks',
      result: null,
      remarks: ''
    },
    {
      id: '3',
      name: 'Inspect Safety Features',
      verificationCriteria: 'Test emergency stop buttons and safety guards',
      result: null,
      remarks: ''
    },
    {
      id: '4',
      name: 'Functionality Check',
      verificationCriteria: 'Run a sample batch to confirm operations',
      result: null,
      remarks: ''
    }
  ];

  return (
    <div className="pt-14">
      <ChecklistForm 
        machineName="RFC Machine"
        tasks={mockTasks}
        onSubmit={() => console.log('Form submitted')}
      />
    </div>
  );
}
