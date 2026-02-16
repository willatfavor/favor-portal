import type {
  User,
  Gift,
  RecurringGift,
  Course,
  CourseModule,
  UserCourseProgress,
  CourseNote,
  FoundationGrant,
  CommunicationPreferences,
  ContentItem,
  PortalEvent,
  CommunicationTemplate,
  ActivityEvent,
  UserRoleAssignment,
  UserQuizAttempt,
  CourseModuleEvent,
} from '@/types';
import {
  MOCK_USERS,
  MOCK_GIFTS,
  MOCK_RECURRING_GIFTS,
  MOCK_COURSES,
  MOCK_COURSE_MODULES,
  MOCK_PROGRESS,
  MOCK_NOTES,
  MOCK_GRANTS,
  MOCK_PREFERENCES,
  MOCK_CONTENT,
  MOCK_EVENTS,
  MOCK_TEMPLATES,
  MOCK_ACTIVITY,
  MOCK_USER_ROLES,
  MOCK_QUIZ_ATTEMPTS,
  MOCK_MODULE_EVENTS,
} from './mock-data';

const STORAGE_KEYS = {
  users: 'favor_mock_users',
  gifts: 'favor_mock_gifts',
  recurring: 'favor_mock_recurring_gifts',
  courses: 'favor_mock_courses',
  modules: 'favor_mock_course_modules',
  progress: 'favor_mock_course_progress',
  notes: 'favor_mock_course_notes',
  quizAttempts: 'favor_mock_quiz_attempts',
  moduleEvents: 'favor_mock_module_events',
  grants: 'favor_mock_grants',
  preferences: 'favor_mock_preferences',
  content: 'favor_mock_content',
  events: 'favor_mock_events',
  templates: 'favor_mock_templates',
  activity: 'favor_mock_activity',
  roles: 'favor_mock_roles',
  activeUser: 'favor_mock_active_user',
};

const hasWindow = typeof window !== 'undefined';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getItem<T>(key: string, fallback: T): T {
  if (!hasWindow) return clone(fallback);
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function setItem<T>(key: string, value: T): void {
  if (!hasWindow) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors in dev
  }
}

function seed<T>(key: string, fallback: T): void {
  if (!hasWindow) return;
  if (!localStorage.getItem(key)) {
    setItem(key, fallback);
  }
}

export function initMockStore(): void {
  if (!hasWindow) return;
  seed(STORAGE_KEYS.users, MOCK_USERS);
  seed(STORAGE_KEYS.gifts, MOCK_GIFTS);
  seed(STORAGE_KEYS.recurring, MOCK_RECURRING_GIFTS);
  seed(STORAGE_KEYS.courses, MOCK_COURSES);
  seed(STORAGE_KEYS.modules, MOCK_COURSE_MODULES);
  seed(STORAGE_KEYS.progress, MOCK_PROGRESS);
  seed(STORAGE_KEYS.notes, MOCK_NOTES);
  seed(STORAGE_KEYS.quizAttempts, MOCK_QUIZ_ATTEMPTS);
  seed(STORAGE_KEYS.moduleEvents, MOCK_MODULE_EVENTS);
  seed(STORAGE_KEYS.grants, MOCK_GRANTS);
  seed(STORAGE_KEYS.preferences, MOCK_PREFERENCES);
  seed(STORAGE_KEYS.content, MOCK_CONTENT);
  seed(STORAGE_KEYS.events, MOCK_EVENTS);
  seed(STORAGE_KEYS.templates, MOCK_TEMPLATES);
  seed(STORAGE_KEYS.activity, MOCK_ACTIVITY);
  seed(STORAGE_KEYS.roles, MOCK_USER_ROLES);
  const defaultUser = MOCK_USERS.find((u) => !u.isAdmin) ?? MOCK_USERS[0];
  seed(STORAGE_KEYS.activeUser, defaultUser.id);
}

export function resetMockStore(): void {
  if (!hasWindow) return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  initMockStore();
}

export function getActiveMockUserId(): string {
  initMockStore();
  return getItem(STORAGE_KEYS.activeUser, MOCK_USERS[0].id);
}

export function setActiveMockUserId(userId: string): void {
  setItem(STORAGE_KEYS.activeUser, userId);
}

export function getMockUsers(): User[] {
  initMockStore();
  return getItem(STORAGE_KEYS.users, MOCK_USERS);
}

export function setMockUsers(users: User[]): void {
  setItem(STORAGE_KEYS.users, users);
}

export function getMockUserById(userId: string | undefined): User | null {
  if (!userId) return null;
  return getMockUsers().find((u) => u.id === userId) ?? null;
}

export function updateMockUser(userId: string, updates: Partial<User>): User | null {
  const users = getMockUsers();
  const next = users.map((u) => (u.id === userId ? { ...u, ...updates } : u));
  setMockUsers(next);
  return next.find((u) => u.id === userId) ?? null;
}

export function getMockGifts(): Gift[] {
  initMockStore();
  return getItem(STORAGE_KEYS.gifts, MOCK_GIFTS);
}

export function setMockGifts(gifts: Gift[]): void {
  setItem(STORAGE_KEYS.gifts, gifts);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('favor:gifts'));
  }
}

export function getMockGiftsForUser(userId: string | undefined): Gift[] {
  if (!userId) return [];
  return getMockGifts().filter((g) => g.userId === userId);
}

export function addMockGift(gift: Gift): void {
  const gifts = getMockGifts();
  setMockGifts([gift, ...gifts]);
}

export function getMockRecurringGifts(): RecurringGift[] {
  initMockStore();
  return getItem(STORAGE_KEYS.recurring, MOCK_RECURRING_GIFTS);
}

export function setMockRecurringGifts(gifts: RecurringGift[]): void {
  setItem(STORAGE_KEYS.recurring, gifts);
}

export function getMockRecurringGiftsForUser(userId: string | undefined): RecurringGift[] {
  if (!userId) return [];
  return getMockRecurringGifts().filter((g) => g.userId === userId);
}

export function getMockCourses(): Course[] {
  initMockStore();
  return getItem(STORAGE_KEYS.courses, MOCK_COURSES);
}

export function setMockCourses(courses: Course[]): void {
  setItem(STORAGE_KEYS.courses, courses);
}

export function getMockModules(): CourseModule[] {
  initMockStore();
  return getItem(STORAGE_KEYS.modules, MOCK_COURSE_MODULES);
}

export function setMockModules(modules: CourseModule[]): void {
  setItem(STORAGE_KEYS.modules, modules);
}

export function getMockModulesForCourse(courseId: string): CourseModule[] {
  return getMockModules()
    .filter((m) => m.courseId === courseId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getMockProgress(): UserCourseProgress[] {
  initMockStore();
  return getItem(STORAGE_KEYS.progress, MOCK_PROGRESS);
}

export function setMockProgress(progress: UserCourseProgress[]): void {
  setItem(STORAGE_KEYS.progress, progress);
}

export function getMockProgressForUser(userId: string | undefined): UserCourseProgress[] {
  if (!userId) return [];
  return getMockProgress().filter((p) => p.userId === userId);
}

export function upsertMockProgress(entry: UserCourseProgress): void {
  const progress = getMockProgress();
  const index = progress.findIndex(
    (p) => p.userId === entry.userId && p.moduleId === entry.moduleId
  );
  if (index >= 0) {
    progress[index] = { ...progress[index], ...entry };
  } else {
    progress.unshift(entry);
  }
  setMockProgress(progress);
}

export function getMockNotes(): CourseNote[] {
  initMockStore();
  return getItem(STORAGE_KEYS.notes, MOCK_NOTES);
}

export function setMockNotes(notes: CourseNote[]): void {
  setItem(STORAGE_KEYS.notes, notes);
}

export function getMockNotesForUser(userId: string | undefined): CourseNote[] {
  if (!userId) return [];
  return getMockNotes().filter((note) => note.userId === userId);
}

export function getMockNoteForModule(
  userId: string | undefined,
  moduleId: string | undefined
): CourseNote | null {
  if (!userId || !moduleId) return null;
  return getMockNotes().find((note) => note.userId === userId && note.moduleId === moduleId) ?? null;
}

export function upsertMockNote(note: CourseNote): void {
  const notes = getMockNotes();
  const index = notes.findIndex(
    (entry) => entry.userId === note.userId && entry.moduleId === note.moduleId
  );
  if (index >= 0) {
    notes[index] = { ...notes[index], ...note };
  } else {
    notes.unshift(note);
  }
  setMockNotes(notes);
}

export function getMockRoles(): UserRoleAssignment[] {
  initMockStore();
  return getItem(STORAGE_KEYS.roles, MOCK_USER_ROLES);
}

export function getMockRolesForUser(userId: string | undefined): UserRoleAssignment[] {
  if (!userId) return [];
  return getMockRoles().filter((role) => role.userId === userId);
}

export function setMockRoles(roles: UserRoleAssignment[]): void {
  setItem(STORAGE_KEYS.roles, roles);
}

export function getMockQuizAttempts(): UserQuizAttempt[] {
  initMockStore();
  return getItem(STORAGE_KEYS.quizAttempts, MOCK_QUIZ_ATTEMPTS);
}

export function getMockQuizAttemptsForModule(
  userId: string | undefined,
  moduleId: string | undefined
): UserQuizAttempt[] {
  if (!userId || !moduleId) return [];
  return getMockQuizAttempts()
    .filter((attempt) => attempt.userId === userId && attempt.moduleId === moduleId)
    .sort((a, b) => b.attemptNumber - a.attemptNumber);
}

export function addMockQuizAttempt(attempt: UserQuizAttempt): void {
  const attempts = getMockQuizAttempts();
  setItem(STORAGE_KEYS.quizAttempts, [attempt, ...attempts]);
}

export function getMockModuleEvents(): CourseModuleEvent[] {
  initMockStore();
  return getItem(STORAGE_KEYS.moduleEvents, MOCK_MODULE_EVENTS);
}

export function recordMockModuleEvent(event: CourseModuleEvent): void {
  const events = getMockModuleEvents();
  setItem(STORAGE_KEYS.moduleEvents, [event, ...events]);
}

export function getMockGrants(): FoundationGrant[] {
  initMockStore();
  return getItem(STORAGE_KEYS.grants, MOCK_GRANTS);
}

export function setMockGrants(grants: FoundationGrant[]): void {
  setItem(STORAGE_KEYS.grants, grants);
}

export function getMockGrantsForUser(userId: string | undefined): FoundationGrant[] {
  if (!userId) return [];
  return getMockGrants().filter((g) => g.userId === userId);
}

export function getMockPreferences(): CommunicationPreferences[] {
  initMockStore();
  return getItem(STORAGE_KEYS.preferences, MOCK_PREFERENCES);
}

export function setMockPreferences(preferences: CommunicationPreferences[]): void {
  setItem(STORAGE_KEYS.preferences, preferences);
}

export function getMockPreferencesForUser(userId: string | undefined): CommunicationPreferences | null {
  if (!userId) return null;
  return getMockPreferences().find((p) => p.userId === userId) ?? null;
}

export function updateMockPreferences(userId: string, updates: Partial<CommunicationPreferences>): CommunicationPreferences | null {
  const prefs = getMockPreferences();
  const next = prefs.map((p) =>
    p.userId === userId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
  );
  setMockPreferences(next);
  return next.find((p) => p.userId === userId) ?? null;
}

export function getMockContent(): ContentItem[] {
  initMockStore();
  return getItem(STORAGE_KEYS.content, MOCK_CONTENT);
}

export function setMockContent(content: ContentItem[]): void {
  setItem(STORAGE_KEYS.content, content);
}

export function getMockEvents(): PortalEvent[] {
  initMockStore();
  return getItem(STORAGE_KEYS.events, MOCK_EVENTS);
}

export function setMockEvents(events: PortalEvent[]): void {
  setItem(STORAGE_KEYS.events, events);
}

export function getMockTemplates(): CommunicationTemplate[] {
  initMockStore();
  return getItem(STORAGE_KEYS.templates, MOCK_TEMPLATES);
}

export function setMockTemplates(templates: CommunicationTemplate[]): void {
  setItem(STORAGE_KEYS.templates, templates);
}

export function getMockActivity(): ActivityEvent[] {
  initMockStore();
  return getItem(STORAGE_KEYS.activity, MOCK_ACTIVITY);
}

export function setMockActivity(events: ActivityEvent[]): void {
  setItem(STORAGE_KEYS.activity, events);
}

export function recordActivity(event: ActivityEvent): void {
  const events = getMockActivity();
  setMockActivity([event, ...events]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('favor:activity'));
  }
}
