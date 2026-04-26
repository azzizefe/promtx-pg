import { ConnectedAccounts } from '../components/settings/ConnectedAccounts';
import { ApiKeyManager } from '../components/settings/ApiKeyManager';
import { ReferralShare } from '../components/settings/ReferralShare';

export default function Settings() {
  return (
    <div style={{ maxWidth: '800px', margin: '50px auto' }}>
      <h1>Settings</h1>
      <ConnectedAccounts />
      <ApiKeyManager />
      <ReferralShare />
    </div>
  );
}
