const USERS_KEY = "dtrDemoUsers";
const SESSION_KEY = "dtrDemoCurrentUser";
const RECORDS_KEY = "dtrDemoRecords";

const authPage = document.getElementById("authPage");
const dashboardPage = document.getElementById("dashboardPage");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const dashboardMessage = document.getElementById("dashboardMessage");

function readArray(key) {
  const value = localStorage.getItem(key);
  if (!value) return [];

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`Stored data for ${key} is not a list.`);
  }
  return parsed;
}

function getUsers() {
  return readArray(USERS_KEY);
}

function getRecords() {
  return readArray(RECORDS_KEY);
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  if (!dateKey) return "—";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatTime(timestamp) {
  return timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "—";
}

function durationMinutes(record) {
  if (!record.timeInAt) return 0;
  const end = record.timeOutAt ? new Date(record.timeOutAt).getTime() : Date.now();
  const start = new Date(record.timeInAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 60000);
}

function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function setMessage(element, text, isError = true) {
  element.textContent = text;
  element.classList.toggle("success-message", !isError && Boolean(text));
  element.classList.toggle("error-message", isError && Boolean(text));
}

function showLogin() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");
  setMessage(document.getElementById("loginMessage"), "");
  setMessage(document.getElementById("registerMessage"), "");
}

function showRegister() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  document.getElementById("registerTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
  setMessage(document.getElementById("loginMessage"), "");
  setMessage(document.getElementById("registerMessage"), "");
}

function appendCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
}

function appendEmptyRow(body, message, columnCount) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  cell.textContent = message;
  cell.className = "table-empty-cell";
  row.appendChild(cell);
  body.appendChild(row);
}

function renderStudentDashboard(user) {
  const records = getRecords()
    .filter(record => record.username === user.username)
    .sort((a, b) => b.date.localeCompare(a.date));
  const todayRecord = records.find(record => record.date === localDateKey());

  document.getElementById("studentTodayDate").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  document.getElementById("studentTodayStatus").textContent = !todayRecord
    ? "Not clocked in"
    : todayRecord.timeOutAt ? "Duty completed" : "Currently on duty";
  document.getElementById("studentTodayTimes").textContent =
    `Time in: ${formatTime(todayRecord && todayRecord.timeInAt)}  |  Time out: ${formatTime(todayRecord && todayRecord.timeOutAt)}`;
  document.getElementById("clockInButton").disabled = Boolean(todayRecord);
  document.getElementById("clockOutButton").disabled = !todayRecord || Boolean(todayRecord.timeOutAt);

  const body = document.getElementById("studentRecordsBody");
  body.replaceChildren();
  const recentRecords = records.slice(0, 30);
  document.getElementById("studentEmptyState").classList.toggle("hidden", recentRecords.length > 0);
  if (recentRecords.length === 0) {
    appendEmptyRow(body, "No duty records yet.", 5);
    return;
  }

  recentRecords.forEach(record => {
    const row = document.createElement("tr");
    appendCell(row, formatDate(record.date));
    appendCell(row, formatTime(record.timeInAt));
    appendCell(row, formatTime(record.timeOutAt));
    appendCell(row, formatDuration(durationMinutes(record)));
    appendCell(row, record.timeOutAt ? "Completed" : "In progress");
    body.appendChild(row);
  });
}

function renderAdminDashboard() {
  const users = getUsers();
  const records = getRecords();
  const today = localDateKey();
  const todayRecords = records.filter(record => record.date === today);
  const completedRecords = todayRecords.filter(record => record.timeOutAt);
  const totalMinutes = todayRecords.reduce((total, record) => total + durationMinutes(record), 0);

  document.getElementById("adminTodayDate").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  document.getElementById("studentCount").textContent =
    String(users.filter(user => user.role === "student").length);
  document.getElementById("clockedInCount").textContent =
    String(todayRecords.filter(record => !record.timeOutAt).length);
  document.getElementById("completedCount").textContent = String(completedRecords.length);
  document.getElementById("hoursToday").textContent = formatDuration(totalMinutes);
  renderAdminRecords(records);
}

function renderAdminRecords(records = getRecords()) {
  const search = document.getElementById("recordSearch").value.trim().toLowerCase();
  const dateFilter = document.getElementById("recordDateFilter").value;
  const filteredRecords = records
    .filter(record => !dateFilter || record.date === dateFilter)
    .filter(record => {
      const searchable = `${record.name} ${record.username}`.toLowerCase();
      return !search || searchable.includes(search);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.timeInAt || "").localeCompare(a.timeInAt || ""));

  const body = document.getElementById("adminRecordsBody");
  body.replaceChildren();
  document.getElementById("adminEmptyState").classList.toggle("hidden", filteredRecords.length > 0);
  if (filteredRecords.length === 0) {
    appendEmptyRow(body, "No matching records.", 6);
    return;
  }

  filteredRecords.forEach(record => {
    const row = document.createElement("tr");
    appendCell(row, formatDate(record.date));
    appendCell(row, `${record.name} (${record.username})`);
    appendCell(row, formatTime(record.timeInAt));
    appendCell(row, formatTime(record.timeOutAt));
    appendCell(row, formatDuration(durationMinutes(record)));
    appendCell(row, record.timeOutAt ? "Completed" : "In progress");
    body.appendChild(row);
  });
}

function showDashboard(user) {
  authPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  document.getElementById("dashboardTitle").textContent =
    user.role === "admin" ? "Administrator dashboard" : "Student dashboard";
  document.getElementById("welcomeText").textContent = `Welcome, ${user.name}.`;
  document.getElementById("studentDashboard").classList.toggle("hidden", user.role !== "student");
  document.getElementById("adminDashboard").classList.toggle("hidden", user.role !== "admin");
  setMessage(dashboardMessage, "");

  try {
    if (user.role === "admin") renderAdminDashboard();
    else renderStudentDashboard(user);
  } catch (error) {
    console.error("Unable to load DTR data.", error);
    setMessage(dashboardMessage, "Could not load saved DTR data. Check this browser's storage and reload.");
  }
}

document.getElementById("loginTab").addEventListener("click", showLogin);
document.getElementById("registerTab").addEventListener("click", showRegister);

registerForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("registerName").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const role = document.getElementById("registerRole").value;
  const message = document.getElementById("registerMessage");

  try {
    const users = getUsers();
    if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      setMessage(message, "Ginagamit na ang username na iyan.");
      return;
    }
    users.push({ name, username, password, role });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    setMessage(message, "Account created. Mag-login na.", false);
    registerForm.reset();
  } catch (error) {
    console.error("Unable to save the account.", error);
    setMessage(message, "Could not save the account. Check this browser's storage and try again.");
  }
});

loginForm.addEventListener("submit", event => {
  event.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("loginMessage");

  try {
    const user = getUsers().find(account =>
      account.username.toLowerCase() === username.toLowerCase() && account.password === password
    );
    if (!user) {
      setMessage(message, "Hindi tama ang username o password.");
      return;
    }
    const currentUser = { name: user.name, username: user.username, role: user.role };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    showDashboard(currentUser);
  } catch (error) {
    console.error("Unable to sign in.", error);
    setMessage(message, "Could not read saved accounts. Check this browser's storage and try again.");
  }
});

document.getElementById("clockInButton").addEventListener("click", () => {
  try {
    const currentUser = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    const records = getRecords();
    if (records.some(record => record.username === currentUser.username && record.date === localDateKey())) {
      setMessage(dashboardMessage, "You already have a DTR record for today.");
      renderStudentDashboard(currentUser);
      return;
    }
    const now = new Date();
    records.push({
      username: currentUser.username,
      name: currentUser.name,
      date: localDateKey(now),
      timeInAt: now.toISOString(),
      timeOutAt: null
    });
    saveRecords(records);
    renderStudentDashboard(currentUser);
    setMessage(dashboardMessage, "Clock-in recorded.", false);
  } catch (error) {
    console.error("Unable to record clock-in.", error);
    setMessage(dashboardMessage, "Could not save clock-in. Check this browser's storage and try again.");
  }
});

document.getElementById("clockOutButton").addEventListener("click", () => {
  try {
    const currentUser = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    const records = getRecords();
    const record = records.find(item =>
      item.username === currentUser.username && item.date === localDateKey()
    );
    if (!record || record.timeOutAt) {
      setMessage(dashboardMessage, "There is no open DTR record to clock out from.");
      renderStudentDashboard(currentUser);
      return;
    }
    record.timeOutAt = new Date().toISOString();
    saveRecords(records);
    renderStudentDashboard(currentUser);
    setMessage(dashboardMessage, "Clock-out recorded.", false);
  } catch (error) {
    console.error("Unable to record clock-out.", error);
    setMessage(dashboardMessage, "Could not save clock-out. Check this browser's storage and try again.");
  }
});

document.getElementById("logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  dashboardPage.classList.add("hidden");
  authPage.classList.remove("hidden");
  loginForm.reset();
  showLogin();
});

document.getElementById("recordSearch").addEventListener("input", () => renderAdminRecords());
document.getElementById("recordDateFilter").addEventListener("input", () => renderAdminRecords());
document.getElementById("clearFiltersButton").addEventListener("click", () => {
  document.getElementById("recordSearch").value = "";
  document.getElementById("recordDateFilter").value = "";
  renderAdminRecords();
});

try {
  const currentUser = JSON.parse(sessionStorage.getItem(SESSION_KEY));
  if (currentUser && ["admin", "student"].includes(currentUser.role)) {
    showDashboard(currentUser);
  }
} catch (error) {
  console.error("Unable to restore the current session.", error);
  sessionStorage.removeItem(SESSION_KEY);
}
