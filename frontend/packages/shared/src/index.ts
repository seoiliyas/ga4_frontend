// ── Shared package barrel export ──────────────────────────────────────────────

// Context
export { AuthProvider, useAuth } from './context/AuthContext';
export type { AuthContextValue } from './context/AuthContext';

// Components
export { Dashboard } from './components/Dashboard';
export { Sidebar, BrightHorizonLogo, SidebarIcon, NewChatIcon } from './components/Sidebar';
export { ToastProvider, useToast } from './components/Toast';

// Services
export { createAuthApi } from './services/authApi';
export type { AuthUser, InviteKey } from './services/authApi';
export { createChatApi } from './services/chatApi';
export type { ChatSession, ChatMessage, AppMode } from './services/chatApi';

// Utils
export { cleanGtmJsonString } from './utils/clean-json';
export { minifyGTM, minifyGTMToString } from './utils/gtm-minifier';
