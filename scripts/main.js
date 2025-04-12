import {voiceHandler} from './voiceHandler.js';
import {handleSendMessage} from './chatService.js';
import {loadChat, clearChat} from './dbService.js';
import {createMessage, showToast, initScrollToBottomButton} from './uiService.js';
import {userInput, chatbox} from './domElements.js';
import {FileService} from './fileService.js';

// Exports
export * from './chatService.js';
export * from './dbService.js';
export * from './domElements.js';
export * from './uiService.js';
export * from './voiceHandler.js';

let isComposing = false;

// Run scripts on dom load
document.addEventListener('DOMContentLoaded', async () => {

    // Initialize scroll to bottom button
    initScrollToBottomButton();

    // Setup send button
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Enable/disable send button based on input
    userInput.addEventListener('input', () => {
        sendBtn.disabled = userInput.value.trim() === '';
    });
    
    // Handle Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                return;
            }

            e.preventDefault();

            if (isComposing) return;

            if (userInput.value.trim()) {
                handleSendMessage(false);
                userInput.style.height = 'auto';
            }
        }
    });

    // Handle Tab key for indentation
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = userInput.selectionStart;
            const end = userInput.selectionEnd;
            userInput.value = userInput.value.substring(0, start) + '    ' + userInput.value.substring(end);
            userInput.selectionStart = userInput.selectionEnd = start + 4;
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
    });

    // Handle IME composition
    userInput.addEventListener('compositionstart', () => {
        isComposing = true;
    });
    userInput.addEventListener('compositionend', () => {
        isComposing = false;
    });

    // Pretty print code
    hljs.configure({
        ignoreUnescapedHTML: true,
        languages: ['javascript', 'python', 'java', 'cpp', 'css', 'html', 'bash', 'json']
    });
    hljs.highlightAll();
});

// Theme toggle functionality
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', document.body.dataset.theme);
});
document.body.dataset.theme = localStorage.getItem('theme') || 'light';

// Character counter
userInput.addEventListener('input', () => {
    const length = userInput.value.length;
    document.querySelector('.char-counter').textContent = `${length}/32000`;
    if (length > 32000) {
        userInput.value = userInput.value.slice(0, 32000);
    }
});

// Suggestion chips
document.querySelector('.suggestion-chips').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
        userInput.value = e.target.textContent;
        handleSendMessage(false);
    }
});

// Initial greeting & history handling
window.addEventListener('load', async () => {
    try {
        setTimeout(() => {
            document.querySelector('.loading-overlay').classList.add('hide');
        }, 1000);

        const messages = await loadChat();
        if (messages && messages.length > 0) {
            messages.sort((a, b) => a.timestamp - b.timestamp);
            messages.forEach(msg => createMessage(msg.text, msg.isUser));
        } else {
            setTimeout(() => {
                createMessage(String('Hello! 👋'), false);
                setTimeout(() => {
                    createMessage(String('How can I help you today?'), false);
                }, 500);
            }, 1500);
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        document.querySelector('.loading-overlay').classList.add('hide');
    }
});

// File sharing system
const fileService = new FileService();
