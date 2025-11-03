import MachineCard from '../MachineCard';

export default function MachineCardExample() {
  return (
    <div className="p-4 space-y-4">
      <MachineCard
        name="RFC Machine"
        type="Rinse-Fill-Cap"
        status="active"
        lastMaintenance="Oct 28, 2025"
        nextMaintenance="Nov 11, 2025"
      />
      <MachineCard
        name="PET Blowing Machine"
        type="Bottle Manufacturing"
        status="maintenance"
        lastMaintenance="Oct 30, 2025"
        nextMaintenance="Nov 5, 2025"
      />
    </div>
  );
}
