export type Locale = 'en' | 'hi' | 'mr';

export type MessageKey =
  | 'nav.today'
  | 'nav.listings'
  | 'nav.leads'
  | 'nav.more'
  | 'nav.conversations'
  | 'nav.branding'
  | 'nav.profile'
  | 'nav.growth'
  | 'nav.support'
  | 'nav.legal'
  | 'nav.signOut'
  | 'listing.new'
  | 'shell.workspaceFallback'
  | 'shell.brokerWorkspace'
  | 'shell.loading'
  | 'pilot.title'
  | 'pilot.freeUntil'
  | 'pilot.viewPlan'
  | 'more.title'
  | 'preferences.language'
  | 'preferences.theme'
  | 'theme.light'
  | 'theme.dark'
  | 'common.close'
  | 'common.retry'
  | 'error.fetchFailed'
  | 'error.offline';

export type MessageDictionary = Record<MessageKey, string>;
