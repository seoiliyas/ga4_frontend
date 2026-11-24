import { AppShell, createAuthApi, createChatApi } from '@brighthorizon/shared';

const authApi = createAuthApi('ga4');
const chatApi = createChatApi('ga4', authApi.getToken);

export default function App() {
  return <AppShell mode="ga4" authApi={authApi} chatApi={chatApi} />;
}
