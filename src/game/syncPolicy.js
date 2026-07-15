// Where a finished round gets written. Pure — no storage, network, or React —
// so the rule is stated once and unit-tested, rather than being re-derived from
// an `if (user)` scattered through the UI.
//
// Local always receives the write, signed in or out. Signed out it's the only
// record; signed in it's the offline cache in front of the cloud, which is what
// keeps a round played on a plane from vanishing. Cloud is added only when
// there's a user to own the row — RLS would reject it otherwise.

// Which sinks receive this round.
export function roundSinks(user) {
  const signedIn = Boolean(user?.id);
  return { local: true, cloud: signedIn };
}

// Whether the one-time local→cloud merge should run for this sign-in.
// `migrated` is the persisted 'worldwise.migrated.v1' flag. Kept here so the
// "once per device, only when signed in" rule is testable without AsyncStorage.
export function shouldMigrate({ user, migrated }) {
  return Boolean(user?.id) && !migrated;
}
