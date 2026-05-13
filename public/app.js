const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const addTaskButton = document.querySelector("#add-task");
const taskList = document.querySelector("#task-list");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  root.classList.add("dark");
}

themeToggle.addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("theme", root.classList.contains("dark") ? "dark" : "light");
});

addTaskButton.addEventListener("click", () => {
  const nextTaskNumber = taskList.children.length + 1;
  const task = document.createElement("li");

  task.innerHTML = `
    <label>
      <input type="checkbox" />
      <span>Nowy krok ${nextTaskNumber}</span>
    </label>
  `;

  taskList.append(task);
});
