// Recurring tasks page: weekly tasks, this week's occurrences and reminders.
// Every API call goes through authFetch (adds the token, sends a 401 back to the login page).
(function () {
  const DAY_LABELS = {
    MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday',
    FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
  };

  const el = {
    form: document.getElementById('taskForm'),
    title: document.getElementById('title'),
    day: document.getElementById('dayOfWeek'),
    addButton: document.getElementById('addButton'),
    formMessage: document.getElementById('formMessage'),
    tasks: document.getElementById('tasks'),
    occurrences: document.getElementById('occurrences'),
    reminders: document.getElementById('reminders'),
    unreadCount: document.getElementById('unreadCount'),
    periodLabel: document.getElementById('periodLabel'),
  };

  // ---------- Errors ----------
  // The API answers { error: { message } }. People never see that JSON: every status becomes
  // a plain sentence. 400 and 409 keep the server's wording because it names the problem
  // ("Task title is required", 'You already have "Laundry" every saturday').
  class ApiError extends Error {
    constructor(status, serverMessage) {
      super(serverMessage || '');
      this.status = status;
      this.serverMessage = serverMessage || '';
    }
  }

  function describeError(error) {
    if (!(error instanceof ApiError)) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    switch (error.status) {
      case 400:
        return error.serverMessage ? error.serverMessage + '.' : 'Please check what you entered and try again.';
      case 401:
        return 'Your session has expired. Sending you to the login page...';
      case 403:
        return 'That belongs to another account, so you cannot change it.';
      case 404:
        return 'That no longer exists. The list has been refreshed.';
      case 409:
        return error.serverMessage ? error.serverMessage + '.' : 'That task already exists.';
      default:
        return 'Something went wrong on the server (error ' + error.status + '). Please try again.';
    }
  }

  async function request(method, url, body) {
    const options = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await authFetch(url, options);

    let payload = null;
    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch (parseError) {
        payload = null;
      }
    }
    if (!response.ok) {
      const message = payload && payload.error && typeof payload.error.message === 'string' ? payload.error.message : '';
      throw new ApiError(response.status, message);
    }
    return payload;
  }

  // ---------- Small UI helpers ----------
  function state(text, loading) {
    const box = document.createElement('div');
    box.className = 'state';
    if (loading) {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      box.appendChild(spinner);
    }
    box.appendChild(document.createTextNode(text));
    return box;
  }

  // A load failure inside a list, with a way to try again.
  function loadFailure(container, error, retry) {
    const box = document.createElement('div');
    box.className = 'notice notice-error';
    box.setAttribute('role', 'alert');
    box.appendChild(document.createTextNode(describeError(error) + ' '));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.textContent = 'Retry';
    button.addEventListener('click', retry);
    box.appendChild(button);
    container.replaceChildren(box);
  }

  function showFormMessage(text, type) {
    if (!text) {
      el.formMessage.replaceChildren();
      return;
    }
    const box = document.createElement('div');
    box.className = 'notice notice-' + type + ' mt';
    box.textContent = text;
    el.formMessage.replaceChildren(box);
  }

  // Disables a button (and shows it is busy) while its request is in flight.
  async function withBusy(button, work) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Working...';
    try {
      return await work();
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  function dayLabel(day) {
    return DAY_LABELS[day] || day;
  }

  function rowButton(label, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', () => onClick(button));
    return button;
  }

  function badge(text, className) {
    const chip = document.createElement('span');
    chip.className = 'status-chip ' + className;
    chip.textContent = text;
    return chip;
  }

  // An action on one row (complete, mark read, delete): toast on failure, refresh the lists.
  async function rowAction(button, work, refresh, successText) {
    try {
      await withBusy(button, work);
      if (successText) Shell.toast(successText, 'success');
      await refresh();
    } catch (error) {
      Shell.toast(describeError(error), 'error');
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        await refresh();
      }
    }
  }

  // ---------- Weekly tasks ----------
  async function loadTasks() {
    el.tasks.replaceChildren(state('Loading tasks...', true));
    try {
      const tasks = await request('GET', '/recurring-tasks');
      if (tasks.length === 0) {
        el.tasks.replaceChildren(state('No weekly tasks yet. Add one above.'));
        return;
      }
      const list = document.createElement('ul');
      list.className = 'list';
      for (const task of tasks) {
        const row = document.createElement('li');
        row.className = 'list-row';

        const text = document.createElement('div');
        text.className = 'grow';
        const name = document.createElement('strong');
        name.textContent = task.title;
        const when = document.createElement('div');
        when.className = 'muted';
        when.textContent = 'Every ' + dayLabel(task.dayOfWeek);
        text.append(name, when);

        row.append(
          text,
          rowButton('Delete', 'btn btn-secondary', (button) =>
            rowAction(button, () => request('DELETE', '/recurring-tasks/' + task.id), loadTasks, 'Task deleted')
          )
        );
        list.appendChild(row);
      }
      el.tasks.replaceChildren(list);
    } catch (error) {
      loadFailure(el.tasks, error, loadTasks);
    }
  }

  // ---------- This week's occurrences ----------
  async function loadOccurrences() {
    el.occurrences.replaceChildren(state('Loading this week...', true));
    try {
      const occurrences = await request('GET', '/occurrences');
      el.periodLabel.textContent = occurrences.length ? occurrences[0].periodKey : '';
      if (occurrences.length === 0) {
        el.occurrences.replaceChildren(state('Nothing due this week. Add a weekly task to get started.'));
        return;
      }
      occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const list = document.createElement('ul');
      list.className = 'list';
      for (const occurrence of occurrences) {
        const done = occurrence.status === 'DONE';
        const row = document.createElement('li');
        row.className = 'list-row' + (done ? ' is-done' : '');

        const text = document.createElement('div');
        text.className = 'grow';
        const name = document.createElement('strong');
        name.textContent = occurrence.title;
        const due = document.createElement('div');
        due.className = 'muted num';
        due.textContent = dayLabel(occurrence.dayOfWeek) + ', ' + occurrence.dueDate;
        text.append(name, due);
        row.appendChild(text);

        if (done) {
          // Completing again would be harmless, but there is nothing left to do.
          row.appendChild(badge('Done', 'status-clean'));
        } else {
          row.append(
            badge('To do', 'status-unknown'),
            rowButton('Complete', 'btn', (button) =>
              rowAction(
                button,
                () => request('POST', '/occurrences/' + occurrence.id + '/complete'),
                loadOccurrences,
                'Marked as done'
              )
            )
          );
        }
        list.appendChild(row);
      }
      el.occurrences.replaceChildren(list);
    } catch (error) {
      loadFailure(el.occurrences, error, loadOccurrences);
    }
  }

  // ---------- Reminders ----------
  function showUnread(count) {
    el.unreadCount.hidden = false;
    el.unreadCount.textContent = count + ' unread';
    el.unreadCount.style.opacity = count === 0 ? '0.6' : '1';
  }

  async function loadReminders() {
    el.reminders.replaceChildren(state('Loading reminders...', true));
    try {
      const reminders = await request('GET', '/reminders');
      showUnread(reminders.filter((reminder) => !reminder.read).length);
      if (reminders.length === 0) {
        el.reminders.replaceChildren(state('No reminders yet. They appear when a weekly task comes due.'));
        return;
      }
      const list = document.createElement('ul');
      list.className = 'list';
      for (const reminder of reminders) {
        const row = document.createElement('li');
        row.className = 'list-row' + (reminder.read ? ' is-done' : '');

        const text = document.createElement('div');
        text.className = 'grow';
        const message = document.createElement('div');
        if (!reminder.read) message.style.fontWeight = '600';
        message.textContent = reminder.message;
        text.appendChild(message);
        row.appendChild(text);

        if (reminder.read) {
          row.appendChild(badge('Read', 'status-unknown'));
        } else {
          row.appendChild(
            rowButton('Mark read', 'btn btn-secondary', (button) =>
              rowAction(button, () => request('POST', '/reminders/' + reminder.id + '/read'), loadReminders)
            )
          );
        }
        list.appendChild(row);
      }
      el.reminders.replaceChildren(list);
    } catch (error) {
      el.unreadCount.hidden = true;
      loadFailure(el.reminders, error, loadReminders);
    }
  }

  // ---------- Add a task ----------
  el.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showFormMessage('');
    try {
      const created = await withBusy(el.addButton, () =>
        request('POST', '/recurring-tasks', { title: el.title.value, dayOfWeek: el.day.value })
      );
      el.title.value = '';
      showFormMessage('Added "' + created.title + '" every ' + dayLabel(created.dayOfWeek) + '.', 'success');
      // A new task also creates this week's to-do and a reminder.
      await Promise.all([loadTasks(), loadOccurrences(), loadReminders()]);
    } catch (error) {
      showFormMessage(describeError(error), 'error');
    }
  });

  loadOccurrences();
  loadReminders();
  loadTasks();
})();
