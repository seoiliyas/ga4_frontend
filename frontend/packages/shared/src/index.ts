// ── Shared package barrel export ──────────────────────────────────────────────

// Context
export { AuthProvider, useAuth } from './context/AuthContext';
export type { AuthContextValue } from './context/AuthContext';

// Components
export { AppShell } from './components/AppShell';
export { AuthPage } from './components/AuthPage';
export { AuthImage, openAuthenticatedFile } from './components/AuthMedia';
export { Dashboard } from './components/Dashboard';
export { Sidebar, BrightHorizonLogo, SidebarIcon, NewChatIcon } from './components/Sidebar';
export { ModelSelector, AVAILABLE_MODELS, DEFAULT_MODEL } from './components/ModelSelector';
export type { ModelOption } from './services/chatApi';
export { ToastProvider, useToast } from './components/Toast';

// Services
export { createAuthApi } from './services/authApi';
export type { AuthApi, AuthUser, InviteKey } from './services/authApi';
export { createChatApi } from './services/chatApi';
export type { ChatApi, ChatSession, ChatMessage, ChatAttachment, AppMode } from './services/chatApi';

// Utils
export { cleanGtmJsonString } from './utils/clean-json';
export { minifyGTM, minifyGTMToString } from './utils/gtm-minifier';
