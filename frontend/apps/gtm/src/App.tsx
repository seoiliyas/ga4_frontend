import { AppShell, createAuthApi, createChatApi } from '@brighthorizon/shared';

const authApi = createAuthApi('gtm');
const chatApi = createChatApi('gtm', authApi.getToken);

export default function App() {
  return <AppShell mode="gtm" authApi={authApi} chatApi={chatApi} />;
}
