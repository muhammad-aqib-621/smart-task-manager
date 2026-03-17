document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const progressText = document.getElementById('progress-text');
    const columns = document.querySelectorAll('.column');
    const taskLists = document.querySelectorAll('.task-list');

    let tasks = [];
    let taskId = 0;
    let timers = {}; // taskId: {startTime, intervalId}

    // Add task
    addTaskBtn.addEventListener('click', () => {
        const title = taskInput.value.trim();
        const dueDate = dueDateInput.value;
        if (title) {
            addTask(title, dueDate, 'pending');
            taskInput.value = '';
            dueDateInput.value = '';
            updateProgress();
        }
    });

    // Filter tasks
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            filterTasks(filter);
        });
    });

    // Drag and drop
    taskLists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            const taskEl = document.getElementById(`task-${taskId}`);
            const newStatus = list.dataset.status;
            if (taskEl) {
                list.appendChild(taskEl);
                updateTaskStatus(taskId, newStatus);
                updateProgress();
            }
        });
    });

    function addTask(title, dueDate, status) {
        const task = {
            id: taskId++,
            title,
            dueDate,
            status,
            timeSpent: 0 // in seconds
        };
        tasks.push(task);
        renderTask(task);
    }

    function renderTask(task) {
        const taskEl = document.createElement('div');
        taskEl.className = `task ${task.status === 'completed' ? 'completed' : ''} ${task.status === 'inprogress' ? 'inprogress' : ''}`;
        taskEl.id = `task-${task.id}`;
        taskEl.draggable = task.status !== 'completed';
        taskEl.innerHTML = `
            <div class="task-title">${task.title}</div>
            <div class="task-due">${task.dueDate ? `Due: ${formatDate(task.dueDate)}` : ''}</div>
            <div class="task-timer" id="timer-${task.id}" style="display: ${task.status === 'inprogress' ? 'block' : 'none'}">Time: 00:00:00</div>
            <div class="task-actions">
                <button class="complete-btn">Complete</button>
                <button class="delete-btn">Delete</button>
                ${task.status === 'inprogress' ? '<button class="start-timer-btn">Pause Timer</button>' : ''}
            </div>
        `;
        taskEl.querySelector('.complete-btn').addEventListener('click', () => {
            moveToDone(task.id);
        });
        taskEl.querySelector('.delete-btn').addEventListener('click', () => {
            deleteTask(task.id);
        });
        const startTimerBtn = taskEl.querySelector('.start-timer-btn');
        if (startTimerBtn) {
            startTimerBtn.addEventListener('click', () => {
                toggleTimer(task.id);
            });
        }
        taskEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            taskEl.classList.add('dragging');
        });
        taskEl.addEventListener('dragend', () => {
            taskEl.classList.remove('dragging');
        });

        const list = document.querySelector(`.task-list[data-status="${task.status}"]`);
        if (list) {
            list.appendChild(taskEl);
        }
    }

    function moveToDone(id) {
        updateTaskStatus(id, 'completed');
        const taskEl = document.getElementById(`task-${id}`);
        const doneList = document.querySelector('.task-list[data-status="completed"]');
        doneList.appendChild(taskEl);
        updateProgress();
    }

    function deleteTask(id) {
        stopTimer(id);
        tasks = tasks.filter(t => t.id !== id);
        const taskEl = document.getElementById(`task-${id}`);
        if (taskEl) taskEl.remove();
        updateProgress();
    }

    function updateTaskStatus(id, newStatus) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const oldStatus = task.status;
            task.status = newStatus;
            const taskEl = document.getElementById(`task-${id}`);
            taskEl.classList.toggle('completed', newStatus === 'completed');
            taskEl.classList.toggle('inprogress', newStatus === 'inprogress');
            taskEl.draggable = newStatus !== 'completed';

            if (newStatus === 'inprogress' && oldStatus !== 'inprogress') {
                startTimer(id);
            } else if (newStatus !== 'inprogress' && oldStatus === 'inprogress') {
                stopTimer(id);
            }

            updateTaskDisplay(id);
        }
    }

    function startTimer(id) {
        if (timers[id]) return; // already running
        const startTime = Date.now();
        timers[id] = { startTime };
        timers[id].intervalId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.timeSpent = elapsed;
                updateTimerDisplay(id, elapsed);
            }
        }, 1000);
        updateTaskDisplay(id);
    }

    function stopTimer(id) {
        if (timers[id]) {
            clearInterval(timers[id].intervalId);
            delete timers[id];
        }
        updateTaskDisplay(id);
    }

    function toggleTimer(id) {
        if (timers[id]) {
            stopTimer(id);
        } else {
            startTimer(id);
        }
    }

    function updateTimerDisplay(id, seconds) {
        const timerEl = document.getElementById(`timer-${id}`);
        if (timerEl) {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            timerEl.textContent = `Time: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    function updateTaskDisplay(id) {
        const task = tasks.find(t => t.id === id);
        const taskEl = document.getElementById(`task-${id}`);
        if (task && taskEl) {
            const timerEl = taskEl.querySelector('.task-timer');
            const startBtn = taskEl.querySelector('.start-timer-btn');
            if (task.status === 'inprogress') {
                timerEl.style.display = 'block';
                if (startBtn) {
                    startBtn.textContent = timers[id] ? 'Pause Timer' : 'Resume Timer';
                } else {
                    // Add button if not exists
                    const actions = taskEl.querySelector('.task-actions');
                    const btn = document.createElement('button');
                    btn.className = 'start-timer-btn';
                    btn.textContent = timers[id] ? 'Pause Timer' : 'Resume Timer';
                    btn.addEventListener('click', () => toggleTimer(id));
                    actions.appendChild(btn);
                }
            } else {
                timerEl.style.display = 'none';
                if (startBtn) startBtn.remove();
            }
        }
    }

    function filterTasks(filter) {
        const allTasks = document.querySelectorAll('.task');
        allTasks.forEach(taskEl => {
            const id = parseInt(taskEl.id.split('-')[1]);
            const task = tasks.find(t => t.id === id);
            if (filter === 'all') {
                taskEl.style.display = 'block';
            } else if (filter === 'completed' && task.status === 'completed') {
                taskEl.style.display = 'block';
            } else if (filter === 'pending' && task.status !== 'completed') {
                taskEl.style.display = 'block';
            } else {
                taskEl.style.display = 'none';
            }
        });
    }

    function updateProgress() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        progressText.textContent = `Progress: ${completed} / ${total} tasks completed`;
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    }
});