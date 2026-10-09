import type { ReactNode } from "react";

// English strings. es.tsx must match this shape exactly (TypeScript checks
// it), so a missing translation is a build error, not a blank on screen.
// Entries that take values are functions, so plurals and word order can
// differ per language. `ReactNode` arguments are formatted amounts or links.

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const en = {
  common: {
    loading: "Loading",
    close: "Close",
    undo: "Undo",
    done: "Done",
    saved: "Saved",
    optional: "Optional",
    none: "None",
    manage: "Manage",
    seeAll: "See all",
    details: "Details",
    showLess: "Show less",
    showAll: (n: number) => `Show all ${n}`,
    saveChanges: "Save changes",
    saving: "Saving…",
    create: "Create",
    delete: "Delete",
    deleting: "Deleting…",
    tapAgainToDelete: "Tap again to delete",
    in: "In",
    out: "Out",
    net: "Net",
    total: "Total",
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    expenses: "Expenses",
    name: "Name",
    note: "Note",
    when: "When",
    type: "Type",
    account: "Account",
    category: "Category",
    archivedSuffix: " (archived)",
    uncategorized: "Uncategorized",
    checkFields: "Check the highlighted fields.",
    somethingWrong: "Something went wrong. Try again.",
    apiUnreachable: "Can't reach the finance API. Is it running?",
    amountRequired: "Enter an amount above zero, like 12.50.",
    // Display names of the two categories Tally creates itself
    systemCategory: { transfers: "Transfers", opening: "Opening balances" },
  },

  nav: {
    home: "Home",
    activity: "Activity",
    accounts: "Accounts",
    insights: "Insights",
    recurring: "Recurring",
    categories: "Categories",
    people: "People",
    settings: "Settings",
    signOut: "Sign out",
    primary: "Primary",
    skipToContent: "Skip to content",
    addEntry: "Add entry (N)",
    accountMenu: "Account menu",
    you: "You",
    tallyHome: "Tally home",
  },

  theme: {
    label: (theme: string) => `Theme: ${theme}`,
    light: "Light",
    dark: "Dark",
    system: "Match system",
    auto: "Auto",
  },

  currency: {
    label: (code: string) => `Preferred currency: ${code}`,
    search: "Search currency",
    list: "Currencies",
    noMatch: (query: string) => `No match for “${query}”.`,
    hint: "Totals across accounts are shown in it. Each account keeps its own currency.",
  },

  accountTypes: {
    cash: { label: "Cash", hint: "Wallet, piggy bank, the envelope in the drawer" },
    debit: { label: "Debit", hint: "Checking or savings, money that's yours" },
    creditCard: { label: "Credit card", hint: "Borrowed money; the balance is what you owe" },
  },

  accountCard: {
    youOwe: "You owe",
    creditBalance: "Credit balance",
    available: "Available",
    overdrawn: "Overdrawn",
  },

  home: {
    greeting: (hour: number, name?: string) => {
      const base = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      return name ? `${base}, ${name}` : base;
    },
    netAcross: (n: number) => `Net balance across ${n} ${plural(n, "account", "accounts")}`,
    cashAndDebit: "Cash & debit",
    creditOwed: "Credit owed",
    netThisMonth: "net this month",
    thisMonth: "This month",
    moneyIn: "Money in",
    moneyOut: "Money out",
    versus: (pct: string, month: string) => `${pct} vs ${month}`,
    leftOver: "Left over",
    savedOfIncome: (pct: string) => `${pct} of income saved`,
    spentToday: "Spent today",
    perDay: (amount: ReactNode) => <>~{amount} a day</>,
    pace: (amount: ReactNode, month: string) => (
      <>
        At this pace you&apos;ll spend about {amount} by the end of {month}.
      </>
    ),
    uncategorized: (n: number) => `${n} ${plural(n, "entry has", "entries have")} no category`,
    uncategorizedHint: "this month. Sort them so your reports stay complete.",
    accounts: "Accounts",
    newAccount: "New account",
    cashFlow: "Cash flow, last 6 months",
    whereItWent: "Where it went",
    noSpending: "No spending yet this month",
    noSpendingHint: "Your top categories will show up here as you log expenses.",
    dailySpending: "Daily spending",
    recentActivity: "Recent activity",
    ledgerEmpty: "Your ledger is empty",
    ledgerEmptyHint: "Press N anywhere to add an entry. Each one takes a few seconds.",
    logFirst: "Log your first expense",
    comingUp: "Coming up",
    allRecurring: "All recurring",
    setUp: "Set up",
    shortFor: (account: ReactNode, amount: ReactNode) => (
      <>
        {account} is {amount} short for what&apos;s due in the next 2 weeks.
      </>
    ),
    comingEmpty: "Nothing due in the next 2 weeks. Add rent, subscriptions or your salary once and Tally logs them for you.",
    welcome: (name?: string) => `Welcome${name ? `, ${name}` : ""}.`,
    welcomeTagline: "Let's find every cent.",
    welcomeBody:
      "Three short steps and you'll see exactly where your money comes from and where it goes, month by month and year by year.",
    steps: {
      account: { title: "Add where your money lives", body: "Your wallet, your bank card, your credit card. Each gets its own balance.", cta: "Add an account" },
      categories: {
        title: "Pick your categories",
        body: "Start from a ready-made set or make your own, with subcategories.",
        cta: "Set up categories",
        ctaDone: "Review categories",
      },
      log: { title: "Log every move", body: "Press N for an expense, I for income, T for a transfer. On your phone, tap +." },
    },
  },

  quickAdd: {
    newEntry: "New entry",
    editTransaction: "Edit transaction",
    description: "Every cent counts. Log it while you remember.",
    entryType: "Entry type",
    amount: "Amount",
    addAccountFirst: "Add an account first, so we know where the money moved.",
    createAccount: "Create an account",
    into: "Into",
    paidWith: "Paid with",
    noCategories: (link: ReactNode) => <>No categories yet. {link} to see where your money goes.</>,
    addSome: "Add some",
    notePlaceholderIncome: "Paycheck, refund…",
    notePlaceholderExpense: "Groceries at Costco…",
    saveAndAddAnother: "Save & add another",
    addIncome: "Add income",
    addExpense: "Add expense",
    deleted: "Transaction deleted",
    couldntDelete: "Couldn't delete",
    transferNeedsTwo:
      "Transfers move money between two of your accounts, like paying the credit card from debit. Add a second account to use them.",
    from: "From",
    to: "To",
    fromAccount: "From account",
    toAccount: "To account",
    transferNotePlaceholder: "Card payment…",
    transferNotCounted: "Transfers don't count as spending or income in your reports.",
    recordTransfer: "Record transfer",
    noWritable: "None of your accounts let you add entries. An owner can change your role.",
  },

  transactionRow: {
    noCategory: "No category",
    recurring: "Recurring",
  },

  activity: {
    showingRecent: (n: number) => `Showing the most recent ${n} entries. Pick a month to see everything in it.`,
    nothingMatches: "Nothing matches",
    nothingMatchesHint: "Try another search, or clear the filters.",
    noEntries: "No entries yet",
    nothingIn: (month: string) => `Nothing logged in ${month}`,
    emptyHint: "Log purchases as they happen, or catch up on the ones you remember.",
    addEntry: "Add an entry",
    spent: (amount: ReactNode) => <>Spent {amount}</>,
    allTime: "All time",
    month: "Month",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    searchPlaceholder: "Search notes, merchants…",
    searchLabel: "Search transactions",
    filters: "Filters",
    incomeAndExpenses: "Income & expenses",
    onlyExpenses: "Only expenses",
    onlyIncome: "Only income",
    allAccounts: "All accounts",
    allCategories: "All categories",
    withoutCategory: "Without a category",
    clearAll: "Clear all",
  },

  accounts: {
    newAccount: "New account",
    editAccount: "Edit account",
    yours: "Your accounts",
    sharedWithYou: "Shared with you",
    sharedWithYouHint: "Accounts other people own and added you to.",
    emptyTitle: "Where does your money live?",
    emptyBody: "Add a cash wallet, a debit card, or a credit card. Each one tracks its own balance.",
    addFirst: "Add your first account",
    archived: "Archived",
    archivedHint: "Archived accounts keep their history and still count in reports, but can't take new entries.",
    history: "History",
    restore: "Restore",
    balance: (amount: ReactNode) => <>Balance {amount}</>,
    thisMonth: "This month",
    inOut: (income: ReactNode, expense: ReactNode, sep: (text: string) => ReactNode) => (
      <>
        {income} {sep("in ·")} {expense} {sep("out")}
      </>
    ),
    addEntryTo: (name: string) => `Add entry to ${name}`,
    edit: (name: string) => `Edit ${name}`,
    nameHint: "Use the name on the card, so Apple Pay automations can match it.",
    placeholder: { cash: "Wallet", debit: "BBVA Debit", creditCard: "Visa Gold" },
    owedToday: "What you owe today",
    balanceToday: "Balance today",
    openingHintCredit: "Your current statement debt. Recorded as an opening expense on this card.",
    openingHint: "Recorded as an opening entry, so the balance matches reality from day one.",
    archive: "Archive",
    tapAgainToArchive: "Tap again to archive",
    createAccount: "Create account",
    // Server action messages
    nameRequired: "Give the account a name, like “Visa Gold” or “Wallet”.",
    typeRequired: "Choose cash, debit or credit card.",
    openingInvalid: "Enter a positive amount, or leave it empty.",
    openingDescription: "Opening balance",
    updated: "Account updated",
    created: "Account created",
    restored: "Account restored",
    archivedMessage: "Account archived",
  },

  categories: {
    intro: "Group spending and income so every cent has a place. Subcategories roll up into their parent in reports.",
    addStarter: "Add starter set",
    adding: "Adding…",
    useStarter: "Use a starter set",
    newCategory: "New category",
    newSubcategory: "New subcategory",
    editCategory: "Edit category",
    emptyTitle: "No categories yet",
    startFromScratch: "Start from scratch",
    emptyBody: "The starter set covers housing, food, transport, bills, salary and more. Rename or delete anything later.",
    transferNote: "Moves between your accounts. Not counted in reports.",
    openingNote: "Starting balances. Not counted in reports.",
    spentThisMonth: (amount: ReactNode) => <>{amount} spent this month</>,
    nothingSpent: "Nothing spent this month",
    addSubcategory: (name: string) => `Add subcategory to ${name}`,
    edit: (name: string) => `Edit ${name}`,
    namePlaceholder: "Groceries",
    inside: "Inside",
    insideHint: "Subcategories roll up into their parent in reports.",
    topLevel: "Nothing (top level)",
    deleteWarning: (hasChildren: boolean) =>
      `${hasChildren ? "Its subcategories will be deleted too. " : ""}Entries in it stay, but lose their category.`,
    deleteForGood: "Delete for good",
    // Server action messages
    nameRequired: "Give the category a name.",
    updated: "Category updated",
    created: "Category created",
    deleted: "Category deleted",
    starterAdded: "Starter categories added",
    // Created by "Use a starter set", in the user's language
    starter: [
      { name: "Housing", children: ["Rent", "Utilities", "Internet"] },
      { name: "Food", children: ["Groceries", "Restaurants", "Coffee"] },
      { name: "Transport", children: ["Fuel", "Public transit", "Rideshare"] },
      { name: "Health" },
      { name: "Shopping" },
      { name: "Entertainment", children: ["Subscriptions"] },
      { name: "Bills & fees" },
      { name: "Education" },
      { name: "Travel" },
      { name: "Gifts" },
      { name: "Salary" },
      { name: "Freelance" },
      { name: "Other income" },
    ] as { name: string; children?: string[] }[],
  },

  insights: {
    monthly: "Monthly",
    annual: "Annual",
    period: "Period",
    previousPeriod: "Previous period",
    nextPeriod: "Next period",
    savingsRate: "Savings rate",
    comparedWith: (period: string) => `Compared with ${period}. Transfers between your accounts aren't counted.`,
    spendingByCategory: "Spending by category",
    incomeBySource: "Income by source",
    noExpensesMonth: "No expenses this month",
    noIncomeMonth: "No income this month",
    dayByDay: "Day by day",
    spendDays: (spent: number, elapsed: number, soFar: boolean) =>
      `You spent money on ${spent} of ${elapsed} ${plural(elapsed, "day", "days")}${soFar ? " so far" : ""}.`,
    biggestExpenses: "Biggest expenses",
    nothingYet: "Nothing yet.",
    incomeIn: (year: number) => `Income in ${year}`,
    expensesIn: (year: number) => `Expenses in ${year}`,
    perMonthAvg: "Spent per month, avg.",
    kept: "Kept",
    ofIncome: (pct: string) => `${pct} of income`,
    monthByMonth: "Month by month",
    selectMonth: "Select a month to open it.",
    bestMonth: "Best month",
    mostSpent: "Most spent",
    keptIn: (month: string, amount: ReactNode) => (
      <>
        {month}, kept {amount}
      </>
    ),
    whereYearWent: (year: number) => `Where ${year}'s money went`,
    whereItCameFrom: "Where it came from",
    noExpensesYear: "No expenses this year",
    noIncomeYear: "No income this year",
    monthlyBreakdown: "Monthly breakdown",
    month: "Month",
    saved: "Saved",
  },

  charts: {
    barLabel: (month: string, income: string, expense: string) => `${month}: income ${income}, expenses ${expense}`,
    nothingLogged: "Nothing logged in this period yet.",
    dailySpending: (month: string) => `Daily spending, ${month}`,
    noSpending: "no spending",
    spent: (amount: string) => `spent ${amount}`,
    upcoming: "upcoming",
    less: "Less",
    more: "More",
  },

  recurring: {
    intro: "Bills, subscriptions and paychecks. Tally logs each one on its due date, and only when the account has the money.",
    newRecurring: "New recurring",
    editRecurring: "Edit recurring",
    sheetDescription: "Set it once. Tally logs it every time it comes around.",
    emptyTitle: "Nothing repeats yet",
    emptyBody:
      "Add rent, subscriptions or your salary once. Tally logs them on the due date and warns you before an account comes up short.",
    addFirst: "Add a recurring payment",
    startFromCommon: "Or start from a common one",
    suggestions: { rent: "Rent", salary: "Salary", phone: "Phone plan", streaming: "Streaming", gym: "Gym", insurance: "Insurance" },
    next30: "Next 30 days",
    allRecurring: "All recurring",
    pausedAndFinished: "Paused and finished",
    pausedHint: "These won't charge anything. Resuming starts from the next date after today; missed dates aren't charged.",
    overdueTitle: (n: number) => `${n} ${plural(n, "payment is", "payments are")} overdue`,
    overdueNeed: (amount: ReactNode) => <>and need {amount} more. </>,
    overdueHint: "Tally retries every hour. Top up the account, then charge them now.",
    chargeNow: "Charge now",
    charging: "Charging…",
    overdue: "Overdue",
    nothingDue: "Nothing due in the next 30 days",
    nothingDueHint: "Your next recurring entries are further out. They'll show up here as they get close.",
    goingOut: "Going out",
    comingIn: "Coming in",
    typicalMonth: "A typical month",
    fixedCosts: "Fixed costs",
    recurringIncome: "Recurring income",
    billCount: (n: number) => `${n} ${plural(n, "bill or subscription", "bills and subscriptions")}`,
    keepAfter: (amount: ReactNode) => <>After fixed costs you keep about {amount} a month for everything else.</>,
    overspend: (amount: ReactNode) => <>Fixed costs are {amount} more than your recurring income each month.</>,
    averagedHint: "Weekly and yearly items are averaged per month. Add your salary to see what's left after fixed costs.",
    balancesIn30: "Balances in 30 days",
    now: (amount: ReactNode) => <>{amount} now</>,
    needsMore: (amount: ReactNode) => <>Needs {amount} more</>,
    after: (amount: ReactNode) => <>{amount} after</>,
    onlyRecurring: "Counts recurring entries only, not one-off spending.",
    status: {
      covered: "Covered",
      insufficient: "Short",
      income: "Incoming",
      noCheck: "On credit",
      accountInactive: "Account archived",
      rateUnavailable: "No rate",
    },
    short: (amount: ReactNode, overdue: boolean) => (
      <>
        {overdue ? "Overdue, short " : "Short "}
        {amount}
      </>
    ),
    finished: "Finished",
    paused: "Paused",
    actionsFor: (name: string) => `Actions for ${name}`,
    edit: "Edit",
    skip: (date: string) => `Skip ${date}`,
    pause: "Pause",
    resume: "Resume",
    // Schedule
    frequency: { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" },
    unit: (frequency: "weekly" | "monthly" | "yearly", n: number) =>
      ({ weekly: plural(n, "week", "weeks"), monthly: plural(n, "month", "months"), yearly: plural(n, "year", "years") })[frequency],
    every: (frequency: "weekly" | "monthly" | "yearly", n: number) =>
      `Every ${n === 1 ? "" : `${n} `}${({ weekly: plural(n, "week", "weeks"), monthly: plural(n, "month", "months"), yearly: plural(n, "year", "years") })[frequency]}`,
    onWeekday: (weekday: string) => `on ${weekday}`,
    onDay: (day: number) => {
      const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][day % 10] ?? "th");
      return `on the ${day}${suffix}${day >= 29 ? " (or last day)" : ""}`;
    },
    onDate: (date: string) => `on ${date}`,
    daysLate: (n: number) => `${n} days late`,
    inDays: (n: number) => `In ${n} days`,
    // Form
    amount: "Amount",
    nameHint: "Also the note on every entry it creates.",
    namePlaceholderIncome: "Salary",
    namePlaceholderExpense: "Rent, Netflix, gym…",
    repeats: "Repeats",
    frequencyLabel: "Frequency",
    everyLabel: "Every",
    intervalHint: { weekly: "Every 2 weeks is biweekly.", monthly: "Every 3 months is quarterly.", yearly: "Renews once a year." },
    firstDueDate: "First due date",
    nextDueDate: "Next due date",
    lastDate: "Last date",
    neverEnds: "Never ends",
    removeLastDate: "Remove last date",
    previewPast: ". Past dates aren't charged; the first one is the next date from today.",
    previewNext: (date: string) => `. Next one ${date}.`,
    previewStart: (date: string) => `, starting ${date}.`,
    paidInto: "Paid into",
    paidFrom: "Paid from",
    creditHint: "Credit cards aren't checked for funds. Each charge adds to what you owe.",
    shortHint: "If the account is short on the due date, nothing is withdrawn and Tally retries every hour.",
    detailsLabel: "Details",
    detailsPlaceholder: "Contract number, plan…",
    addAccountFirst: "Add an account first, so Tally knows where the money comes from.",
    addRecurringIncome: "Add recurring income",
    addRecurringPayment: "Add recurring payment",
    // Server action messages
    nameRequired: "Name it, like “Rent” or “Netflix”. It becomes the note on each entry.",
    typeRequired: "Choose expense or income.",
    frequencyRequired: "Choose how often it repeats.",
    intervalInvalid: "Use a whole number from 1 to 52.",
    startRequired: "Pick the first date it's due.",
    endInvalid: "Pick a valid date, or leave it empty.",
    endBeforeStart: "The last date can't be before the first one.",
    accountRequired: "Pick the account it's paid from.",
    saved: "Changes saved",
    addedIncome: "Recurring income added",
    addedPayment: "Recurring payment added",
    resumed: "Resumed",
    pausedMessage: "Paused",
    skipped: "Skipped this one",
    skippedLast: "Skipped. That was the last one.",
    deletedMessage: "Deleted. Past entries were kept.",
    nothingDueNow: "Nothing is due right now",
    paidAll: (n: number) => `Paid ${n} ${plural(n, "payment", "payments")}`,
    paidSome: (paid: number, failed: number) =>
      `Paid ${paid}, ${failed} still ${plural(failed, "needs", "need")} money in the account`,
  },

  transactions: {
    typeRequired: "Choose income or expense.",
    accountRequired: "Pick the account this money moved through.",
    dateRequired: "Enter a valid date and time.",
    saved: "Changes saved",
    incomeAdded: "Income added",
    expenseAdded: "Expense added",
    restored: "Restored",
    undone: "Undone",
    fromRequired: "Pick where the money leaves from.",
    toRequired: "Pick where the money goes.",
    sameAccount: "Choose two different accounts.",
    transferRecorded: "Transfer recorded",
    toAccount: (name: string) => `To ${name}`,
    fromAccount: (name: string) => `From ${name}`,
    someAccount: "account",
  },

  settings: {
    yourProfile: "Your profile",
    signedInSince: (date: string) => `Signed in with Google · tracking since ${date}`,
    appearance: "Appearance",
    theme: "Theme",
    language: "Language",
    languageAuto: "Automatic (by region)",
    languageHint: "Other languages show in English; your browser can translate the page.",
    languageSaved: "Language updated",
    apiTitle: "Apple Shortcuts & API keys",
    apiBody: (path: ReactNode, header: ReactNode) => (
      <>
        Log Apple Pay purchases automatically. Create a key, then add a “Get Contents of URL” action that POSTs to {path} with
        the header {header}. Name accounts like the cards in your Wallet so they match.
      </>
    ),
    copyNow: (name: string) => `Copy “${name}” now. It won't be shown again.`,
    keyCopied: "Key copied",
    copied: "Copied",
    copy: "Copy",
    newKeyName: "New key name",
    keyPlaceholder: "iPhone Shortcuts",
    creating: "Creating…",
    createKey: "Create key",
    keyMeta: (created: string, lastUsed: string | null) =>
      ` · created ${created} · ${lastUsed ? `last used ${lastUsed}` : "never used"}`,
    revoke: "Revoke",
    confirm: "Confirm",
    revoked: "Revoked",
    dangerTitle: "Delete everything",
    dangerBody:
      "Permanently deletes your profile, your family profiles and every account nobody else uses. Shared accounts stay with their other members. This can't be undone.",
    typeDelete: "Type DELETE to confirm",
    deleteMyData: "Delete my data",
    // Server action messages
    keyNameRequired: "Name the key, like “iPhone Shortcuts”.",
    keyCreated: "Key created",
    keyRevoked: "Key revoked",
    typeDeleteError: "Type DELETE in capitals to confirm.",
  },

  login: {
    title: "Sign in",
    description: "Every cent in and out, across cash, debit and credit.",
    headline: "Know where every cent goes.",
    body: "Cash, debit and credit in one calm place. Log a purchase in two taps and see each month and year at a glance.",
    continueWithGoogle: "Continue with Google",
    haveCode: "I have a code from a parent or guardian",
    codeLabel: "Your login code",
    codePlaceholder: "K7QM-X2PD",
    codeHint: "Only needed the first time. After that, just continue with Google.",
    codeInvalid: "Enter the 8-character code, like K7QM-X2PD.",
    secureCookie: "Your session stays in a secure, httpOnly cookie.",
    example: "Example of the dashboard",
    exampleData: "Example data",
    exampleAccounts: { debit: "Everyday Debit", credit: "Visa Gold" },
    errors: {
      cancelled: "Sign-in was cancelled. Try again when you're ready.",
      state: "That sign-in link expired. Please start again.",
      google: "Google couldn't confirm your sign-in. Please try again.",
      api: "Your Google account was verified, but the finance service refused the sign-in. Check its GOOGLE_CLIENT_ID.",
      unreachable: "Can't reach the finance service right now. Make sure it's running, then try again.",
      expired: "Your session ended. Sign in again to pick up where you left off.",
      profileCode: "That code didn't work. It may have expired or been used already. Ask for a new one.",
    } as Record<string, string>,
  },

  roles: {
    owner: { label: "Owner", hint: "Full control, including roles and archiving" },
    admin: { label: "Admin", hint: "Manages entries, categories, recurring payments and invites" },
    member: { label: "Member", hint: "Adds entries and edits their own" },
    viewer: { label: "Viewer", hint: "Sees everything, changes nothing" },
    dependent: { label: "Dependent", hint: "Adds entries; some may need approval" },
  },

  people: {
    intro: "Connect with the people you share money with. Only connections can be invited to your accounts.",
    addTitle: "Add a connection",
    emailLabel: "Their email",
    emailPlaceholder: "name@example.com",
    emailHint: "They need a Tally account. They'll see your request and can accept it.",
    send: "Send request",
    sending: "Sending…",
    emailInvalid: "Enter a valid email address.",
    requestSent: "Request sent",
    connectedNow: "You're connected now",
    invitations: "Invitations",
    invitedYou: (inviter: ReactNode, account: ReactNode, role: string) => (
      <>
        {inviter} invited you to {account} as {role}.
      </>
    ),
    someone: "Someone",
    limitNote: (amount: ReactNode) => <>Monthly spending limit: {amount}.</>,
    approvalNote: "Your entries will need approval.",
    accept: "Accept",
    decline: "Decline",
    invitationAccepted: "You joined the account",
    invitationDeclined: "Invitation declined",
    requests: "Requests",
    wantsToConnect: "Wants to connect",
    connections: "Connections",
    noConnections: "No connections yet",
    noConnectionsHint: "Add someone by email. Once they accept, you can invite them to an account.",
    sent: "Sent",
    awaiting: "Waiting for them to accept",
    cancelRequest: "Cancel",
    blocked: "Blocked",
    blockedHint: "They can't send you requests. They don't know you blocked them.",
    unblock: "Unblock",
    remove: "Remove connection",
    block: "Block",
    tapAgain: "Tap again to confirm",
    actionsFor: (name: string) => `Actions for ${name}`,
    connectedSince: (date: string) => `Connected since ${date}`,
    removeHint: "Removing a connection doesn't take them off shared accounts.",
    connectionDone: { accept: "Connected", reject: "Request declined", block: "Blocked", remove: "Removed" },
    managedNote: (name: string) =>
      `Your profile is managed by ${name}. They add you to accounts, so connections and invitations aren't available here.`,
  },

  attention: {
    title: "Needs your attention",
    invitations: (n: number) => `${n} ${plural(n, "invitation", "invitations")} to a shared account`,
    requests: (n: number) => `${n} connection ${plural(n, "request", "requests")}`,
    approvals: (n: number) => `${n} ${plural(n, "entry", "entries")} waiting for your approval`,
    yourPending: (n: number) => `${n} of your ${plural(n, "entry is", "entries are")} waiting for approval`,
  },

  profiles: {
    title: "Family profiles",
    intro:
      "Profiles for people you look after, like your kids. They don't need an email: add one to an account as a dependent, and give it a login if they're ready.",
    add: "Add profile",
    newProfile: "New family profile",
    editProfile: "Edit profile",
    namePlaceholder: "Sofía",
    nameRequired: "Give the profile a name.",
    created: "Profile created",
    updated: "Profile updated",
    deleted: "Profile deleted",
    deleteWarning: "Removes it from every account. Entries it made stay.",
    hasLogin: "Has a login",
    noLogin: "No login",
    accounts: (names: string) => names || "Not on any account yet",
    howToAdd: "To add a profile to an account, open the account and choose Invite.",
    actionsFor: (name: string) => `Actions for ${name}`,
    rename: "Rename",
    loginCode: "Login code",
    loginCodeTitle: (name: string) => `Login code for ${name}`,
    loginCodeBody: (date: string) =>
      `On their first sign-in they choose “I have a code” and type it. It works once and expires on ${date}.`,
    loginCodeHint: "This links their Google account to the profile. After that they just sign in with Google.",
    makeCode: "Make a code",
    making: "Making…",
    newCode: "Make a new code",
    codeCopied: "Code copied",
    keys: "Shortcut keys",
    keysTitle: (name: string) => `Keys for ${name}`,
    keysBody: "A key acts as this profile, so its role and spending limit apply. Use one for a Shortcut on their device.",
    noKeys: "No keys yet.",
  },

  members: {
    title: "Members",
    invite: "Invite",
    inviteTo: (account: string) => `Invite to ${account}`,
    inviteDescription: "Connections get an invitation to accept. Family profiles are added right away.",
    person: "Who",
    noOne: "Nobody to invite yet",
    noOneHint: "Only your connections and family profiles can be added.",
    findPeople: "Find people",
    role: "Role",
    pickPerson: "Choose who to invite.",
    pickRole: "Choose a role.",
    dependentSettings: "Limits for a dependent",
    spendingLimit: "Monthly spending limit",
    spendingLimitHint: "Expenses that go over it wait for approval. Leave empty for no limit.",
    limitInvalid: "Enter a positive amount, or leave it empty.",
    requiresApproval: "Approve every entry",
    requiresApprovalHint: "Each entry waits until an owner or admin approves it.",
    sendInvite: "Send invitation",
    addProfile: "Add to account",
    invited: "Invitation sent",
    added: "Added to the account",
    updated: "Member updated",
    removed: "Member removed",
    invitationCancelled: "Invitation cancelled",
    invitationPending: "Invitation sent",
    invitedBy: (name: string) => `Invited by ${name}`,
    editMember: (name: string) => `Edit ${name}`,
    removeMember: "Remove from account",
    cancelInvitation: "Cancel invitation",
    tapAgain: "Tap again to confirm",
    limitSummary: (amount: string) => `Limit ${amount} a month`,
    approvalSummary: "Every entry needs approval",
    familyProfile: "Family profile",
    leave: "Leave account",
    leaveConfirm: "Tap again to leave",
    leaveHint: "You'll stop seeing this account. Its history stays with the other members.",
    onlyOwnersRoles: "Only owners can change roles.",
    managedRoles: "Family profiles can't be owners or admins.",
  },

  accountDetail: {
    back: "Accounts",
    movements: "Movements",
    noMovements: "No movements yet",
    noMovementsHint: "Entries on this account will show up here.",
    seeAllMovements: "See all",
    yourRole: "Your role",
    sharedWith: (n: number) => (n <= 1 ? "Only you" : `Shared by ${n} people`),
    history: "History",
    historyHint: "Every change on this account, newest first.",
    noHistory: "Nothing recorded yet.",
    showOlder: "Show older",
    loading: "Loading…",
    shared: (n: number) => `Shared · ${n}`,
    open: (name: string) => `Open ${name}`,
  },

  audit: {
    system: "Tally",
    someone: "Someone",
    describe: (a: {
      action: string;
      who: string;
      subject: string;
      role: string;
      amount: string;
      kind: "income" | "expense";
      name: string;
    }) => {
      const what = `${a.kind === "income" ? "an income" : "an expense"}${a.amount ? ` of ${a.amount}` : ""}`;
      const named = a.name ? ` “${a.name}”` : "";
      switch (a.action) {
        case "account.created": return `${a.who} created the account`;
        case "account.updated": return `${a.who} edited the account`;
        case "account.deleted": return `${a.who} archived the account`;
        case "category.created": return `${a.who} added the category${named}`;
        case "category.updated": return `${a.who} edited a category${named}`;
        case "category.deleted": return `${a.who} deleted the category${named}`;
        case "member.invited": return `${a.who} invited ${a.subject} as ${a.role}`;
        case "member.added": return `${a.who} added ${a.subject} as ${a.role}`;
        case "member.joined": return `${a.who} joined as ${a.role}`;
        case "member.declined": return `${a.who} declined the invitation`;
        case "member.left": return `${a.who} left the account`;
        case "member.removed": return `${a.who} removed ${a.subject}`;
        case "member.role_changed": return `${a.who} made ${a.subject} ${a.role}`;
        case "member.updated": return `${a.who} changed ${a.subject}'s limits`;
        case "member.invitation_cancelled": return `${a.who} cancelled ${a.subject}'s invitation`;
        case "transaction.created": return `${a.who} added ${what}${named}`;
        case "transaction.updated": return `${a.who} edited an entry`;
        case "transaction.deleted": return `${a.who} deleted ${what}${named}`;
        case "transaction.moved_in": return `${a.who} moved an entry to this account`;
        case "transaction.approved": return `${a.who} approved an entry${a.amount ? ` of ${a.amount}` : ""}`;
        case "transaction.rejected": return `${a.who} rejected an entry${a.amount ? ` of ${a.amount}` : ""}`;
        case "recurring_payment.created": return `${a.who} set up${named || " a recurring payment"}`;
        case "recurring_payment.updated": return `${a.who} edited a recurring payment`;
        case "recurring_payment.deleted": return `${a.who} deleted${named || " a recurring payment"}`;
        case "recurring_payment.paid": return `${a.name || "A recurring payment"} was paid automatically`;
        case "recurring_payment.skipped": return `${a.who} skipped a recurring payment`;
        default: return `${a.who}: ${a.action}`;
      }
    },
  },

  approvals: {
    title: "Waiting for approval",
    hint: "These don't count toward balances until they're approved.",
    approve: "Approve",
    reject: "Reject",
    approved: "Approved",
    rejected: "Rejected",
    pendingLimit: "Saved. It goes over your monthly limit, so it needs approval.",
    pendingApproval: "Saved. It'll count once it's approved.",
    status: { approved: "Approved", pending: "Pending", rejected: "Rejected", unverified: "To verify" },
    dependentHint: "Entries on this account may need approval before they count.",
    addedBy: (name: string) => `Added by ${name}`,
    allStatuses: "Any status",
    onlyPending: "Waiting for approval",
    onlyRejected: "Rejected",
    anyone: "Anyone",
    reviewHint: "This entry doesn't count toward balances until it's approved.",
    rejectedHint: "This entry was rejected. It never counts toward balances.",
    viewTitle: "Entry details",
    viewOnly: "You can't change this entry.",
  },

  sharing: {
    viewOnly: "View only",
    you: "You",
    recurringViewOnly: "Only owners and admins can change recurring payments on this account.",
    setUpBy: (name: string) => `Set up by ${name}`,
    personal: "Personal",
    personalHint: "Only you see these. Use them on any account.",
    sharedOn: (name: string) => `Shared on ${name}`,
    sharedHint: "Everyone on this account sees these. Owners and admins manage them.",
    scope: "Where",
    scopePersonal: "Personal (only you)",
  },

  money: {
    currency: "Currency",
    preferred: "Preferred currency",
    preferredHint: "Totals across accounts are converted to it at today's rate. Each account keeps its own currency.",
    accountCurrency: "Account currency",
    accountCurrencyHint: "Its balance and every entry on it are in this currency.",
    changeCurrencyWarning: "This corrects the account's currency. Amounts aren't converted.",
    ownersOnlyCurrency: "Only owners can change the currency.",
    convertsTo: (amount: ReactNode, rate: string, date: string) => (
      <>
        ≈ {amount} at {rate} ({date})
      </>
    ),
    converting: "Checking today's rate…",
    noRate: "No exchange rate available right now. Try again in a moment.",
    staleRate: "Using the last known rate.",
    charged: (amount: ReactNode) => <>Charged {amount}</>,
    rateNote: (from: string, to: string, rate: string) => `1 ${from} = ${rate} ${to}`,
    estimated: "Estimated: converted when it's charged",
    rateUnavailable: "No rate",
    approximateTotal: "Converted at today's rates.",
    missingRates: (n: number) => `${n} ${plural(n, "amount", "amounts")} left out: no exchange rate right now.`,
    inCurrency: (code: string) => `in ${code}`,
  },

  verify: {
    title: "To verify",
    hint: "Recurring charges Tally logged on their due date. Confirm each one once you see it in your real account; until then it doesn't count toward the balance.",
    verify: "Verify",
    adjust: "Adjust",
    didntHappen: "Didn't happen",
    verifyAs: "Verify with these",
    realAmount: "What really moved",
    realAmountHint: "In the account's currency, e.g. with the bank's exchange rate.",
    realDate: "When it happened",
    verified: "Verified",
    rejected: "Marked as not happened",
    pill: "To verify",
    entryHint: "This recurring charge doesn't count toward the balance yet. Verify it once you see it in your account.",
    viewerHint: "Waiting for an owner, admin or member to confirm it.",
    attention: (n: number) => `${n} recurring ${plural(n, "charge", "charges")} to verify`,
    waiting: (n: number) => `${n} to verify`,
    projected: (amount: ReactNode) => <>Projected {amount}</>,
    onlyFilter: "To verify",
    requiresVerification: "Ask me to confirm each charge",
    requiresVerificationHint: "Charges wait as “to verify” and only count once you confirm them. Turn off to count them right away.",
  },

  errors: {
    loadTitle: "We couldn't load your numbers",
    loadBody: "The finance service didn't answer. Check that it's running, then try again. Nothing you saved is lost.",
    retry: "Try again",
    notFoundTitle: "This page doesn't exist",
    notFoundBody: "The link may be old, or the address has a typo.",
    backHome: "Back to home",
  },
};

export type Dictionary = typeof en;
