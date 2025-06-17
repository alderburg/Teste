import 'express-session';

declare module 'express-session' {
  interface SessionData {
    twoFactorVerified?: boolean;
    pendingTwoFactorRedirect?: boolean;
    sessionInvalid?: boolean;
    passport?: {
      user?: number | string;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      nome: string;
      email: string;
      isAdditionalUser?: boolean;
      mainUserId?: number;
      userType?: 'main' | 'additional';
    }
  }

  var wsClients: Set<any>;
}