import RoleSelector from '../RoleSelector';

export default function RoleSelectorExample() {
  return <RoleSelector onRoleSelect={(role) => console.log('Selected role:', role)} />;
}
