document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTask');
  const tasksList = document.getElementById('tasksList');
  const currentDate = document.getElementById('currentDate');
  const prevDayBtn = document.getElementById('prevDay');
  const nextDayBtn = document.getElementById('nextDay');

  // Track selected date (starts at today)
  const today = new Date();
  let selectedDate = new Date(today);
  
  // Display current date
  function updateDateDisplay() {
    const isToday = selectedDate.toDateString() === today.toDateString();
    currentDate.textContent = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Add "Today" indicator if viewing today
    if (isToday) {
      currentDate.textContent += ' (Today)';
    }
  }

  updateDateDisplay();

  // Navigation handlers
  prevDayBtn.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateDisplay();
    loadTasks();
  });

  nextDayBtn.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDateDisplay();
    loadTasks();
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
        date: selectedDate.toDateString() // Save to the currently selected date
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
      const selectedDateStr = selectedDate.toDateString();
      
      const dateTasks = tasks.filter(t => t.date === selectedDateStr);
      
      // Normalize legacy subtasks format
      dateTasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0 && typeof task.subtasks[0] === 'string') {
          task.subtasks = task.subtasks.map(text => ({ text: text, checked: false }));
        }
      });
      
      if (dateTasks.length === 0) {
        const isToday = selectedDate.toDateString() === today.toDateString();
        tasksList.innerHTML = `
          <div class="empty-state">
            <span>📝</span>
            <p>No tasks ${isToday ? 'for today' : 'for this day'} yet.<br>${isToday ? 'Add one above to get started!' : ''}</p>
          </div>
        `;
      } else {
        tasksList.innerHTML = '';
        dateTasks.forEach(task => renderTask(task));
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
          <div class="subtask-label">
            <input type="checkbox" class="subtask-checkbox" data-index="${index}" ${checked} id="checkbox-${task.id}-${index}">
            <span class="subtask-text" contenteditable="true" data-index="${index}">${st.text}</span>
          </div>
        </li>
      `;
    }).join('');

    taskCard.innerHTML = `
      <div class="task-header">
        <span class="task-title" contenteditable="true">${task.title}</span>
        <button class="delete-btn">Remove</button>
      </div>
      <ul class="subtasks">${subtasksHtml}</ul>
    `;

    // Add task title editing
    const taskTitleElement = taskCard.querySelector('.task-title');
    taskTitleElement.addEventListener('blur', () => {
      const newTitle = taskTitleElement.textContent.trim();
      if (newTitle && newTitle !== task.title) {
        updateTaskTitle(task.id, newTitle);
      } else if (!newTitle) {
        taskTitleElement.textContent = task.title; // Restore if empty
      }
    });
    
    taskTitleElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        taskTitleElement.blur();
      }
    });

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

    // Add subtask text editing
    taskCard.querySelectorAll('.subtask-text').forEach(subtaskText => {
      const originalText = subtaskText.textContent;
      
      // Prevent checkbox toggle when clicking to edit text
      subtaskText.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      subtaskText.addEventListener('click', (e) => {
        // Only focus if not already focused (to allow checkbox clicks)
        if (document.activeElement !== subtaskText) {
          e.stopPropagation();
        }
      });
      
      subtaskText.addEventListener('blur', () => {
        const newText = subtaskText.textContent.trim();
        const index = parseInt(subtaskText.dataset.index);
        
        if (newText && newText !== originalText) {
          updateSubtaskText(task.id, index, newText);
        } else if (!newText) {
          subtaskText.textContent = originalText; // Restore if empty
        }
      });
      
      subtaskText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          subtaskText.blur();
        }
      });
    });

    taskCard.querySelector('.delete-btn').addEventListener('click', () => {
      deleteTask(task.id);
      taskCard.remove();
      
      if (tasksList.children.length === 0) {
        const isToday = selectedDate.toDateString() === today.toDateString();
        tasksList.innerHTML = `
          <div class="empty-state">
            <span>📝</span>
            <p>No tasks ${isToday ? 'for today' : 'for this day'} yet.<br>${isToday ? 'Add one above to get started!' : ''}</p>
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

  function updateTaskTitle(taskId, newTitle) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        tasks[taskIndex].title = newTitle;
        chrome.storage.local.set({ tasks });
      }
    });
  }

  function updateSubtaskText(taskId, subtaskIndex, newText) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        // Ensure subtasks are in the correct format
        if (!tasks[taskIndex].subtasks[subtaskIndex] || typeof tasks[taskIndex].subtasks[subtaskIndex] === 'string') {
          tasks[taskIndex].subtasks[subtaskIndex] = {
            text: newText,
            checked: false
          };
        } else {
          tasks[taskIndex].subtasks[subtaskIndex].text = newText;
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
