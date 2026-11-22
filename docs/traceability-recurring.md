# Traceability: Recurring Weekly Tasks and Reminders (FR5, NFR5)

Maps each user story to the tests that cover it. All paths are relative to `backend/`.

**Source of the stories.** `docs/Milestone1_Idea_and_Architecture.pdf` contains one FR5 user story (US-R1 below) and NFR5. The remaining stories (marked **derived**) break FR5/NFR5 down into the things a user can actually do on the Recurring tasks page. **Please check the derived ones against the M1 PDF / your team's story list.**

Short names used below:

- **E2E** = `tests/e2e/recurring.e2e.test.ts`
- **E2E-ERR** = `tests/e2e/recurring.errors.e2e.test.ts` (added in M3)
- **SVC** = `tests/unit/RecurringTaskService.test.ts`
- **REM** = `tests/unit/ReminderService.test.ts`
- **SCHED** = `tests/unit/WeeklyScheduler.test.ts`
- **SQLITE** = `tests/unit/SqliteRecurringPersistence.test.ts`
- **AUTH** = `tests/e2e/auth.e2e.test.ts`
- **PAGES** = `tests/unit/frontend/pages.test.ts`

## Stories

| ID | Source | User story |
| --- | --- | --- |
| US-R1 | M1 FR5 | As a user, I want weekly laundry and ironing reminders so that chores don't pile up. |
| US-R2 | derived | As a user, I want to add a weekly task (title and day of the week) so that it repeats every week. |
| US-R3 | derived | As a user, I want to see my weekly tasks so that I know what repeats. |
| US-R4 | derived | As a user, I want to delete a weekly task so that it stops coming back. |
| US-R5 | derived | As a user, I want to see this week's to-dos (and other weeks') so that I know what is due. |
| US-R6 | derived | As a user, I want to mark a to-do as done so that I can track my progress. |
| US-R7 | derived | As a user, I want to see my reminders, unread first, so that I notice new ones. |
| US-R8 | derived | As a user, I want to mark a reminder as read so that the unread count only shows what I have not seen. |
| US-R9 | derived (FR5) | As a user, I want each week's tasks created automatically so that I do not have to re-enter them. |
| US-R10 | M1 NFR5 | As a user, I want a task never generated twice for the same week, even after a restart, so that my list stays correct. |
| US-R11 | derived (NFR4) | As a user, I want to see and change only my own tasks and reminders. |
| US-R12 | derived | As a user, I want to be asked to log in, so that nobody else can use my account. |
| US-R13 | derived | As a user, I want clear messages when something is wrong (empty title, unknown day, duplicate task) so that I can fix it. |
| US-R14 | derived | As a user, I want a page where I can do all of this in light or dark mode. |

## Story to test

| Story | Test file | Test name |
| --- | --- | --- |
| US-R1 | SVC | immediately creates this week’s occurrence and reminder |
| US-R1 | SVC | formats the reminder message exactly |
| US-R1 | E2E-ERR | Recurring tasks API: user stories › creating a weekly task gives an unread reminder for this week right away |
| US-R1 | E2E | completes occurrences and lists and reads reminders |
| US-R2 | E2E | creates a weekly task and lists its task and current-week occurrence |
| US-R2 | SVC | trims task titles |
| US-R3 | E2E | creates a weekly task and lists its task and current-week occurrence |
| US-R3 | SVC | allows the task again after the old one was deactivated |
| US-R4 | E2E | deactivates tasks and returns 400 or 404 for invalid task identifiers |
| US-R4 | E2E-ERR | Recurring tasks API: user stories › a deactivated task disappears from the task list |
| US-R4 | SVC | deactivates a task for its owner |
| US-R4 | SVC | skips deactivated tasks |
| US-R5 | E2E-ERR | Recurring tasks API: user stories › shows the occurrences of the week asked for, and none for a week with no tasks |
| US-R5 | SVC | lists only the caller’s occurrences |
| US-R5 | SVC | creates an occurrence even when the task weekday has already passed |
| US-R6 | E2E | completes occurrences and lists and reads reminders |
| US-R6 | E2E-ERR | Recurring tasks API: user stories › completing an occurrence is repeatable: a second complete still returns 200 and DONE |
| US-R6 | SVC | completes an occurrence for its owner |
| US-R7 | REM | lists unread reminders first, with newest first within each group |
| US-R7 | E2E-ERR | Recurring tasks API: user stories › lists unread reminders first and marks one read without touching the others |
| US-R8 | REM | marks an owned reminder as read |
| US-R8 | E2E | completes occurrences and lists and reads reminders |
| US-R9 | SCHED | runs once immediately when started |
| US-R9 | SCHED | runs again after the configured interval |
| US-R9 | SVC | generates one occurrence and reminder per active task in the current week |
| US-R9 | SVC | creates a new occurrence after advancing one week |
| US-R9 | E2E | run-check creates a next-week occurrence once when demo routes are enabled |
| US-R10 | SVC | NFR5: repeated checks create no duplicate occurrence or reminder |
| US-R10 | SVC | NFR5: a new service over the same repositories does not duplicate rows after restart |
| US-R10 | SQLITE | NFR5: preserves occurrences and reminders across a database restart |
| US-R10 | SQLITE | direct duplicate occurrence insertion does not throw or add another row |
| US-R10 | SCHED | skips overlapping ticks while a check is in flight |
| US-R10 | SVC | self-heals a missing reminder without creating another occurrence |
| US-R11 | E2E-ERR | Recurring tasks API: other users’ data (403) and missing data (404) › forbids deactivating, completing or reading another user’s data |
| US-R11 | E2E-ERR | … › never lists another user’s tasks, occurrences or reminders |
| US-R11 | SVC | rejects completing an occurrence for another user |
| US-R11 | SVC | rejects deactivating another user’s task |
| US-R11 | REM | rejects reading another user’s reminder |
| US-R12 | AUTH | GET %s without a token returns 401 (for /recurring-tasks, /occurrences, /reminders) |
| US-R12 | E2E-ERR | Recurring tasks API: login required (401) › POST/DELETE … without a token returns 401 (4 routes) |
| US-R13 | E2E | returns a consistent validation error for an invalid body |
| US-R13 | E2E-ERR | Recurring tasks API: validation (400) › rejects a day that is not a weekday name |
| US-R13 | E2E-ERR | … › rejects a title longer than 100 characters |
| US-R13 | E2E-ERR | … › rejects a whitespace-only title |
| US-R13 | E2E-ERR | … › rejects a missing title, a non-string day and an empty body |
| US-R13 | E2E-ERR | … › rejects a body that is not valid JSON |
| US-R13 | E2E-ERR | … › rejects an invalid or repeated period query on GET /occurrences |
| US-R13 | E2E-ERR | Recurring tasks API: duplicates (409) › rejects the same title on the same day, ignoring case |
| US-R13 | E2E-ERR | … › allows the same title on another day, for another user, or after deactivation |
| US-R13 | E2E | returns 400 for non-numeric occurrence and reminder identifiers |
| US-R13 | E2E | returns 404 for missing occurrence and reminder identifiers |
| US-R13 | E2E-ERR | … › returns 404 for identifiers that do not exist |
| US-R13 | SVC | rejects the same task on the same day twice, but allows it for another user or day |
| US-R13 | SVC | rejects an empty title / rejects a title longer than 100 characters / rejects an invalid day / rejects an invalid period key |
| US-R14 | PAGES | `recurring.html` loads the auth client in its head; calls the API through authFetch, never plain fetch; links to the ironing page |
| US-R14 | manual | Browser run (headless Edge, light and dark): see the PR description for the checklist |

## Notes

- The frontend error messages (400, 401, 403, 404, 409, 500, network failure) and the in-flight disabled buttons are checked by hand in a browser, because the project has no browser test runner. The PR description lists what was checked.
- Completing a task that is already done is deliberately a no-op that returns 200 (covered by the "completing an occurrence is repeatable" test). The page therefore hides the Complete button on done items instead of expecting a 409.
