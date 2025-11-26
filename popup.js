document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTask');
  const tasksList = document.getElementById('tasksList');
  const currentDate = document.getElementById('currentDate');
  const prevDayBtn = document.getElementById('prevDay');
  const nextDayBtn = document.getElementById('nextDay');
  const contextSection = document.getElementById('contextSection');
  const contextInput = document.getElementById('contextInput');
  const contextLabel = document.getElementById('contextLabel');
  const contextHint = document.getElementById('contextHint');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const savePreferencesBtn = document.getElementById('savePreferencesBtn');
  const clearPreferencesBtn = document.getElementById('clearPreferencesBtn');

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

  // Load preferences from storage
  loadPreferences();

  // Settings modal handlers
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
    loadPreferences(); // Refresh preferences when opening
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  // Close modal when clicking outside
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  // Save preferences
  savePreferencesBtn.addEventListener('click', () => {
    const preferences = {
      study: document.getElementById('studyPrefs').value.trim(),
      coding: document.getElementById('codingPrefs').value.trim(),
      writing: document.getElementById('writingPrefs').value.trim(),
      research: document.getElementById('researchPrefs').value.trim(),
      planning: document.getElementById('planningPrefs').value.trim(),
      creative: document.getElementById('creativePrefs').value.trim()
    };
    
    chrome.storage.local.set({ taskPreferences: preferences }, () => {
      alert('Preferences saved! They will be applied to future tasks.');
      settingsModal.style.display = 'none';
    });
  });

  // Clear preferences
  clearPreferencesBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all preferences?')) {
      document.getElementById('studyPrefs').value = '';
      document.getElementById('codingPrefs').value = '';
      document.getElementById('writingPrefs').value = '';
      document.getElementById('researchPrefs').value = '';
      document.getElementById('planningPrefs').value = '';
      document.getElementById('creativePrefs').value = '';
      
      chrome.storage.local.set({ taskPreferences: {} }, () => {
        alert('All preferences cleared.');
      });
    }
  });

  // Load preferences into settings modal
  function loadPreferences() {
    chrome.storage.local.get(['taskPreferences'], (result) => {
      const prefs = result.taskPreferences || {};
      document.getElementById('studyPrefs').value = prefs.study || '';
      document.getElementById('codingPrefs').value = prefs.coding || '';
      document.getElementById('writingPrefs').value = prefs.writing || '';
      document.getElementById('researchPrefs').value = prefs.research || '';
      document.getElementById('planningPrefs').value = prefs.planning || '';
      document.getElementById('creativePrefs').value = prefs.creative || '';
    });
  }

  // Get saved preference for a task type
  function getSavedPreference(taskType) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['taskPreferences'], (result) => {
        const prefs = result.taskPreferences || {};
        resolve(prefs[taskType] || '');
      });
    });
  }

  // Show context field with prompts based on task type
  taskInput.addEventListener('input', () => {
    const taskText = taskInput.value.trim().toLowerCase();
    if (taskText.length > 10) {
      const taskType = detectTaskType(taskText);
      showContextField(taskType);
    } else {
      contextSection.style.display = 'none';
      contextInput.value = '';
    }
  });

  // Function to detect task type from input
  function detectTaskType(taskText) {
    // Study keywords - check first to avoid conflicts with "prepare" in planning
    const studyKeywords = ['study', 'studying', 'learn', 'learning', 'quiz', 'quizzes', 'exam', 'exams', 'test', 'testing', 
                          'review', 'reviewing', 'memorize', 'memorizing', 'prepare for', 'preparing for', 'cram', 'cramming',
                          'homework', 'assignment', 'coursework'];
    
    // Coding keywords
    const codingKeywords = ['code', 'coding', 'program', 'programming', 'build', 'building', 'develop', 'developing', 
                           'debug', 'debugging', 'implement', 'implementing', 'create app', 'website', 'web app',
                           'software', 'application', 'script', 'algorithm'];
    
    // Writing keywords
    const writingKeywords = ['write', 'writing', 'essay', 'essays', 'paper', 'papers', 'article', 'articles', 
                            'blog', 'blog post', 'document', 'documentation', 'draft', 'drafting', 'compose',
                            'prose', 'story', 'novel', 'poem'];
    
    // Research keywords
    const researchKeywords = ['research', 'researching', 'analyze', 'analyzing', 'investigate', 'investigating', 
                             'explore', 'exploring', 'find', 'finding', 'discover', 'discovering'];
    
    // Planning keywords (but not "prepare for" which is study)
    const planningKeywords = ['plan', 'planning', 'organize', 'organizing', 'schedule', 'scheduling', 
                             'arrange', 'arranging', 'coordinate', 'coordination'];
    
    // Creative keywords
    const creativeKeywords = ['design', 'designing', 'draw', 'drawing', 'sketch', 'sketching', 'paint', 'painting',
                            'art', 'artistic', 'creative', 'creativity'];
    
    // Check in order of specificity (study first to catch "prepare for" before planning)
    if (studyKeywords.some(kw => taskText.includes(kw))) return 'study';
    if (codingKeywords.some(kw => taskText.includes(kw))) return 'coding';
    if (writingKeywords.some(kw => taskText.includes(kw))) return 'writing';
    if (researchKeywords.some(kw => taskText.includes(kw))) return 'research';
    if (planningKeywords.some(kw => taskText.includes(kw))) return 'planning';
    if (creativeKeywords.some(kw => taskText.includes(kw))) return 'creative';
    
    return 'general';
  }

  // Function to show context field with appropriate prompts
  async function showContextField(taskType) {
    contextSection.style.display = 'block';
    
    const prompts = {
      study: {
        label: 'Study context (optional):',
        placeholder: 'e.g., What resources do you have available? How do you typically study? What topics do you need to focus on?',
        hint: '💡 Consider: How do you typically study for a quiz like this? What resources do you have available? What topics need the most attention?'
      },
      coding: {
        label: 'Coding context (optional):',
        placeholder: 'e.g., What programming language? What frameworks or tools? Any specific requirements or constraints?',
        hint: '💡 Consider: What programming language/framework? Any specific requirements? What tools or libraries are you using?'
      },
      writing: {
        label: 'Writing context (optional):',
        placeholder: 'e.g., What type of writing? Target audience? Length requirements? Any sources or references?',
        hint: '💡 Consider: What type of writing is this? Who is the audience? What are the length requirements? Any sources to reference?'
      },
      research: {
        label: 'Research context (optional):',
        placeholder: 'e.g., What are you researching? What sources are available? What is the deadline?',
        hint: '💡 Consider: What specific questions are you trying to answer? What sources do you have access to? What is your timeline?'
      },
      planning: {
        label: 'Planning context (optional):',
        placeholder: 'e.g., What is the goal? Who is involved? What are the constraints or deadlines?',
        hint: '💡 Consider: What is the main goal? Who else is involved? What are the key constraints or deadlines?'
      },
      creative: {
        label: 'Creative context (optional):',
        placeholder: 'e.g., What is the medium? What is the style or theme? Any inspiration or references?',
        hint: '💡 Consider: What medium are you working with? What style or theme? Any inspiration or references?'
      },
      general: {
        label: 'Additional context (optional):',
        placeholder: 'Provide any additional context to help generate better subtasks...',
        hint: '💡 Consider: What specific details would help break this down? What resources do you have? Any constraints or preferences?'
      }
    };

    const prompt = prompts[taskType] || prompts.general;
    contextLabel.textContent = prompt.label;
    contextInput.placeholder = prompt.placeholder;
    contextHint.textContent = prompt.hint;
    
    // Load and apply saved preference
    const savedPref = await getSavedPreference(taskType);
    if (savedPref) {
      contextInput.value = savedPref;
      contextHint.textContent = '💡 Your saved preference has been loaded. You can edit it or add more details.';
    }
  }

  addTaskBtn.addEventListener('click', async () => {
    const taskText = taskInput.value.trim();
    if (!taskText) return;

    addTaskBtn.disabled = true;
    addTaskBtn.textContent = 'Generating...';

    try {
      const context = contextInput.value.trim();
      const subtasks = await generateSubtasks(taskText, context);
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
      contextInput.value = '';
      contextSection.style.display = 'none';
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      addTaskBtn.disabled = false;
      addTaskBtn.textContent = 'break it down';
    }
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.target.closest('#contextInput')) {
      e.preventDefault();
      addTaskBtn.click();
    }
  });

  async function generateSubtasks(task, context = '') {
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

    let prompt = `Break down this task into 4-6 actionable subtasks. Return ONLY a JSON array of strings, no other text.\n\nTask: "${task}"`;
    
    if (context) {
      prompt += `\n\nAdditional context provided by the user: "${context}"\n\nUse this context to make the subtasks more personalized and relevant to the user's specific situation.`;
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
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: prompt
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
          <button class="subtask-delete-btn" data-index="${index}" title="Delete subtask">×</button>
        </li>
      `;
    }).join('');

    taskCard.innerHTML = `
      <div class="task-header">
        <span class="task-title" contenteditable="true">${task.title}</span>
        <button class="delete-btn" title="Delete task">×</button>
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

    // Add subtask delete button listeners
    taskCard.querySelectorAll('.subtask-delete-btn').forEach(deleteBtn => {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(deleteBtn.dataset.index);
        deleteSubtask(task.id, index, taskCard);
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

  function deleteSubtask(taskId, subtaskIndex, taskCard) {
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1 && tasks[taskIndex].subtasks && tasks[taskIndex].subtasks[subtaskIndex]) {
        // Remove the subtask from the array
        tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
        chrome.storage.local.set({ tasks });
        
        // Update the task in storage
        const task = tasks[taskIndex];
        
        // Remove the subtask item from DOM
        const subtaskItem = taskCard.querySelector(`.subtask-item:nth-child(${subtaskIndex + 1})`);
        if (subtaskItem) {
          subtaskItem.remove();
        }
        
        // Update all remaining subtask indices in the DOM
        taskCard.querySelectorAll('.subtask-item').forEach((item, newIndex) => {
          const checkbox = item.querySelector('.subtask-checkbox');
          const text = item.querySelector('.subtask-text');
          const deleteBtn = item.querySelector('.subtask-delete-btn');
          
          if (checkbox) checkbox.dataset.index = newIndex;
          if (text) text.dataset.index = newIndex;
          if (deleteBtn) deleteBtn.dataset.index = newIndex;
        });
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
