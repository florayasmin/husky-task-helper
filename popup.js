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
      // Convert subtasks array to objects with checked state
      const subtasksWithState = subtasks.map(text => ({
        text: text,
        checked: false
      }));
      const task = {
        id: Date.now(),
        title: taskText,
        subtasks: subtasksWithState,
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
      
      // Normalize legacy subtasks format
      todayTasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0 && typeof task.subtasks[0] === 'string') {
          task.subtasks = task.subtasks.map(text => ({ text: text, checked: false }));
        }
      });
      
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

    // Ensure subtasks have the correct structure (handle legacy format)
    const normalizedSubtasks = task.subtasks.map(st => {
      if (typeof st === 'string') {
        return { text: st, checked: false };
      }
      return st;
    });

    const subtasksHtml = normalizedSubtasks.map((st, index) => {
      const checked = st.checked ? 'checked' : '';
      const checkedClass = st.checked ? 'checked' : '';
      return `
        <li class="subtask-item ${checkedClass}">
          <label class="subtask-label">
            <input type="checkbox" class="subtask-checkbox" data-index="${index}" ${checked}>
            <span class="subtask-text">${st.text}</span>
          </label>
        </li>
      `;
    }).join('');

    taskCard.innerHTML = `
      <div class="task-header">
        <span class="task-title">${task.title}</span>
        <button class="delete-btn">Remove</button>
      </div>
      <ul class="subtasks">${subtasksHtml}</ul>
    `;

    // Add checkbox event listeners
    taskCard.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        const subtaskItem = e.target.closest('.subtask-item');
        
        // Update UI immediately
        if (e.target.checked) {
          subtaskItem.classList.add('checked');
        } else {
          subtaskItem.classList.remove('checked');
        }
        
        // Update task in storage
        updateTask(task.id, index, e.target.checked);
      });
    });

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

  function updateTask(taskId, subtaskIndex, checked) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        // Ensure subtasks are in the correct format
        if (!tasks[taskIndex].subtasks[subtaskIndex] || typeof tasks[taskIndex].subtasks[subtaskIndex] === 'string') {
          tasks[taskIndex].subtasks[subtaskIndex] = {
            text: typeof tasks[taskIndex].subtasks[subtaskIndex] === 'string' 
              ? tasks[taskIndex].subtasks[subtaskIndex] 
              : tasks[taskIndex].subtasks[subtaskIndex].text || '',
            checked: checked
          };
        } else {
          tasks[taskIndex].subtasks[subtaskIndex].checked = checked;
        }
        chrome.storage.local.set({ tasks });
      }
    });
  }

  function deleteTask(id) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const updated = tasks.filter(t => t.id !== id);
      chrome.storage.local.set({ tasks: updated });
    });
  }
});
