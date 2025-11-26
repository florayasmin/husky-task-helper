document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTask');
  const tasksList = document.getElementById('tasksList');
  const currentDate = document.getElementById('currentDate');

  // Display current date
  const today = new Date();
  currentDate.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Load tasks from storage
  loadTasks();

  addTaskBtn.addEventListener('click', async () => {
    const taskText = taskInput.value.trim();
    if (!taskText) return;

    addTaskBtn.disabled = true;
    addTaskBtn.textContent = 'Generating...';

    try {
      const subtasks = await generateSubtasks(taskText);
      const task = {
        id: Date.now(),
        title: taskText,
        subtasks: subtasks,
        date: today.toDateString()
      };
      saveTask(task);
      renderTask(task);
      taskInput.value = '';
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      addTaskBtn.disabled = false;
      addTaskBtn.textContent = 'break it down';
    }
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTaskBtn.click();
    }
  });

  async function generateSubtasks(task) {
    const apiKey = typeof ANTHROPIC_API_KEY !== 'undefined' ? ANTHROPIC_API_KEY : null;
    if (!apiKey || apiKey === 'your-api-key-here') {
      // Fallback to basic breakdown if no API key
      return [
        'Clarify what needs to be done',
        'Gather any required resources',
        'Start with the first small step',
        'Work through the main portion',
        'Review and complete the task'
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Break down this task into 4-6 actionable subtasks. Return ONLY a JSON array of strings, no other text.\n\nTask: "${task}"`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const text = data.content[0].text;
    return JSON.parse(text);
  }

  function saveTask(task) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      tasks.unshift(task);
      chrome.storage.local.set({ tasks });
    });
  }

  function loadTasks() {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const todayStr = today.toDateString();
      
      const todayTasks = tasks.filter(t => t.date === todayStr);
      
      if (todayTasks.length === 0) {
        tasksList.innerHTML = `
          <div class="empty-state">
            <span>📝</span>
            <p>No tasks for today yet.<br>Add one above to get started!</p>
          </div>
        `;
      } else {
        tasksList.innerHTML = '';
        todayTasks.forEach(task => renderTask(task));
      }
    });
  }

  function renderTask(task) {
    const emptyState = tasksList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.dataset.id = task.id;

    const subtasksHtml = task.subtasks.map(st => `<li>${st}</li>`).join('');

    taskCard.innerHTML = `
      <div class="task-header">
        <span class="task-title">${task.title}</span>
        <button class="delete-btn">Remove</button>
      </div>
      <ul class="subtasks">${subtasksHtml}</ul>
    `;

    taskCard.querySelector('.delete-btn').addEventListener('click', () => {
      deleteTask(task.id);
      taskCard.remove();
      
      if (tasksList.children.length === 0) {
        tasksList.innerHTML = `
          <div class="empty-state">
            <span>📝</span>
            <p>No tasks for today yet.<br>Add one above to get started!</p>
          </div>
        `;
      }
    });

    tasksList.prepend(taskCard);
  }

  function deleteTask(id) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const updated = tasks.filter(t => t.id !== id);
      chrome.storage.local.set({ tasks: updated });
    });
  }
});
