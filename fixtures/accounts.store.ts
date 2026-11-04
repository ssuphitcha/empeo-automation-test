/**
 * Accounts created by the registration scenarios. Later scenarios (login) reuse
 * them. The store lives in the worker process: when the worker restarts (after a
 * failure) it is empty and the scenario registers its own account.
 */
export type RegisteredAccount = { mode: 'thai' | 'others'; email: string; password: string; company: string };

const accounts: RegisteredAccount[] = [];

export const AccountStore = {
  add(account: RegisteredAccount) {
    accounts.push(account);
  },
  last(mode: 'thai' | 'others'): RegisteredAccount | undefined {
    return [...accounts].reverse().find((a) => a.mode === mode);
  },
};
