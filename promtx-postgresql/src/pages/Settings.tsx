import { ConnectedAccounts } from '../components/settings/ConnectedAccounts';

export default function Settings() {
  return (
    <div style={{ maxWidth: '800px', margin: '50px auto' }}>
      <h1>Settings</h1>
      <ConnectedAccounts />
    </div>
  );
}
