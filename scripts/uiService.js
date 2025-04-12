import {saveChat} from './dbService.js';
import {getAIResponse} from './chatService.js';

// Create message functionality
export async function createMessage(text, isUser, files = [], isVoiceMode) {

    // Create message row
    const messageRow = document.createElement('div');
    messageRow.className = 'message-row';
    
    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = `message-avatar ${isUser ? 'user-avatar-icon' : 'bot-avatar-icon'}`;
    avatarDiv.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    // Create message container
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.timestamp = Date.now().toString();

    // Create content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Process content based on sender
    if (isUser) {
        contentDiv.style.whiteSpace = 'pre-wrap';
        if (isVoiceMode) {
            contentDiv.innerHTML = marked.parse(text);
            const wrappedContent = document.createElement('span');
            wrappedContent.className = 'voice-quoted';
            wrappedContent.textContent = `"${contentDiv.textContent}"`;
            contentDiv.innerHTML = '';
            contentDiv.appendChild(wrappedContent);
        }
        else {
            contentDiv.innerHTML = marked.parse(text);
        }
    }
    else {
        try {
            if (typeof marked !== 'undefined') {
                contentDiv.innerHTML = marked.parse(text);
                
                // If voice mode, wrap the content in italics and quotes
                if (isVoiceMode) {
                    const originalContent = contentDiv.innerHTML;
                    const textContent = contentDiv.textContent;
                    
                    const wrappedContent = document.createElement('span');
                    wrappedContent.className = 'voice-quoted';
                    wrappedContent.textContent = `"${textContent}"`;
                    contentDiv.innerHTML = '';
                    contentDiv.appendChild(wrappedContent);
                }
                
                contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                    heading.classList.add('markdown-heading');
                    heading.classList.add(`markdown-h${heading.tagName.slice(1)}`);
                });
                
                contentDiv.querySelectorAll('table').forEach(table => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'table-wrapper';
                    table.parentNode.insertBefore(wrapper, table);
                    wrapper.appendChild(table);
                    table.classList.add('markdown-table');
                });
                
                contentDiv.querySelectorAll('blockquote').forEach(quote => {
                    quote.classList.add('styled-quote');
                });
                
                contentDiv.querySelectorAll('pre').forEach(pre => {
                    pre.classList.add('markdown-pre');
                    const code = pre.querySelector('code');
                    if (code) {
                        code.classList.add('markdown-code');
                    }
                });
                
                contentDiv.querySelectorAll('ul, ol').forEach(list => {
                    list.classList.add('markdown-list');
                });
            } else {
                if (isVoiceMode) {
                    const wrappedContent = document.createElement('span');
                    wrappedContent.className = 'voice-quoted';
                    wrappedContent.textContent = `"${text}"`;
                    contentDiv.innerHTML = '';
                    contentDiv.appendChild(wrappedContent);
                }
                else {
                    contentDiv.textContent = text;
                }
                console.warn('Marked library not available, falling back to plain text');
            }

        } catch (error) {
            // Fallback 
            console.error('Error with marked parsing:', error);
            if (isVoiceMode) {
                const wrappedContent = document.createElement('em');
                wrappedContent.textContent = `"${text}"`;
                contentDiv.innerHTML = '';
                contentDiv.appendChild(wrappedContent);
            }
            else {
                contentDiv.textContent = text;
            }
        }
        
        // Add code headers to all code blocks
        contentDiv.querySelectorAll('pre').forEach(pre => {
            // Get the language if specified
            const codeBlock = pre.querySelector('code');
            let language = 'plaintext';
            
            if (codeBlock && codeBlock.className) {
                const match = codeBlock.className.match(/language-(\w+)/);
                if (match) language = match[1];
            }
            
            // Create code header
            const codeHeader = document.createElement('div');
            codeHeader.className = 'code-header';
            codeHeader.innerHTML = `<span>${language}</span>`;
            
            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
            copyBtn.addEventListener('click', () => {
                const code = codeBlock.textContent;
                navigator.clipboard.writeText(code);
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            });
            
            codeHeader.appendChild(copyBtn);
            pre.insertBefore(codeHeader, pre.firstChild);
        });

        // Image procesing
        contentDiv.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', () => {
                const lightbox = document.createElement("div");
                lightbox.className = 'lightbox';

                const imgClone = img.cloneNode(true);
                imgClone.style.maxHeight = '90vh';
                imgClone.style.maxWidth = '90vw';

                lightbox.appendChild(imgClone);
                lightbox.addEventListener('click', () => lightbox.remove());

                document.body.appendChild(lightbox);
            });
        });
        
        // Highlight all code blocks
        contentDiv.querySelectorAll('pre code').forEach(block => {
            try {
                hljs.highlightElement(block);
            } catch (error) {
                console.error('Error highlighting code:', error);
            }
        });
        
        // Render LaTeX
        renderMathInElement(contentDiv, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false,
            output: 'html'
        });

        // Process collapsible sections
        contentDiv.querySelectorAll('details').forEach(details => {
            details.classList.add('collapsible-section');
            const summary = details.querySelector('summary');
            if (summary) {
                summary.classList.add('collapsible-header');
            }
        });
    }

    // Add file attachments if any
    if (files && files.length > 0) {
        const attachmentsDiv = document.createElement('div');
        attachmentsDiv.className = 'attachments';
        
        files.forEach(file => {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'file-attachment';
            
            if (file.preview && file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = file.preview;
                img.alt = file.name;
                attachmentDiv.appendChild(img);
            } else {
                const icon = document.createElement('i');
                icon.className = 'fas fa-file';
                attachmentDiv.appendChild(icon);
            }
            
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            attachmentDiv.appendChild(fileName);
            
            attachmentsDiv.appendChild(attachmentDiv);
        });
        
        contentDiv.appendChild(attachmentsDiv);
    }
    
    // Add message actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    // Copy button for all messages
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
    copyBtn.title = 'Copy';
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        showToast('Message copied to clipboard');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });
    actionsDiv.appendChild(copyBtn);
    
    // Add edit and delete buttons only for user messages
    if (isUser) {
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', () => {
            editMessage(messageRow, text);
        });
        actionsDiv.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', () => {
            deleteMessage(messageRow);
        });
        actionsDiv.appendChild(deleteBtn);
    }
    
    // Add timestamp
    const timestampStr = formatTimestamp();

    // Assemble the message
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(actionsDiv);
    
    messageRow.appendChild(avatarDiv);
    messageRow.appendChild(messageDiv);
    
    // Add to chatbox
    chatbox.appendChild(messageRow);

    // Save message to IndexedDB
    await saveChat({
        text,
        isUser,
        timestamp: Date.now(),
        displayTimestamp: timestampStr
    });

    // Add context menu event listener
    messageRow.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, messageRow, text, isUser);
    });

    checkScrollPosition();

    return messageRow;
}

// Edit msg functionality
export function editMessage(messageRow, originalText) {
    messageRow.classList.add('editing');
    const contentDiv = messageRow.querySelector('.message-content');
    contentDiv.contentEditable = true;
    contentDiv.focus();

    // Save & cancel buttons
    const actionBtns = document.createElement('div');
    actionBtns.className = 'edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-edit';
    saveBtn.innerHTML = `<i class="fas fa-check"></i>`;
    saveBtn.setAttribute('data-tooltip', 'Save changes');
    saveBtn.addEventListener('click', () => {
        finishEdit(messageRow, contentDiv.textContent, true);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-edit';
    cancelBtn.innerHTML = `<i class="fas fa-times"></i>`;
    cancelBtn.setAttribute('data-tooltip', 'Cancel editing');
    cancelBtn.addEventListener('click', () => {
        contentDiv.textContent = originalText;
        finishEdit(messageRow, originalText, false);
    });

    actionBtns.appendChild(saveBtn);
    actionBtns.appendChild(cancelBtn);
    messageRow.appendChild(actionBtns);

    // Handle enter key
    contentDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEdit(messageRow, contentDiv.textContent, true);
        }
    });
}

// Finish editing functionality
async function finishEdit(messageRow, newText, shouldUpdate) {
    if (shouldUpdate) {
        let nextNode = messageRow.nextSibling;
        while (nextNode) {
            const currentNode = nextNode;
            nextNode = currentNode.nextSibling;
            currentNode.remove();
        }

        // Get AI response for edited msg
        const typingDiv = createTypingIndicator();
        chatbox.appendChild(typingDiv);

        const response = await getAIResponse(newText, false);
        chatbox.removeChild(typingDiv);
        createMessage(response, false);
    }

    // Reset msg state
    const contentDiv = messageRow.querySelector('.message-content');
    contentDiv.contentEditable = false;
    messageRow.classList.remove('editing');
    messageRow.querySelector('.edit-actions')?.remove();
}

// Show toasts functionality
export function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }, 100);
}

// Create typing indicator
export function createTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    for (let i = 0; i < 3; i++) {
        indicator.appendChild(document.createElement('span'));
    }

    // Scroll slightly to show typing indicator
    setTimeout(() => {
        const chatbox = document.getElementById('chatbox');
        if (chatbox) {
            chatbox.scrollTo({
                top: chatbox.scrollHeight - chatbox.clientHeight + 60,
                behavior: 'smooth',
            });
        }
    }, 100);
    return indicator;
}

//Show msg timestamp
export function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export function checkScrollPosition() {
    const chatbox = document.getElementById('chatbox');
    const scrollBtn = document.getElementById('scrollToBottom');

    if (!chatbox || !scrollBtn) return;

    const scrollPosition = chatbox.scrollTop;
    const scrollHeight = chatbox.scrollHeight;
    const clientHeight = chatbox.clientHeight;

    const scrollThreshold = 100;
    const isNearBottom = (scrollHeight - scrollPosition - clientHeight) <= scrollThreshold;

    if (!isNearBottom) {
        scrollBtn.classList.add('visible');
    }
    else {
        scrollBtn.classList.remove('visible');
    }
}

export function scrollToBottom(animated = true) {
    const chatbox = document.getElementById('chatbox');
    const scrollOptions = {
        top: chatbox.scrollHeight,
        behavior: animated ? 'smooth' : 'auto'
    };
    chatbox.scrollTo(scrollOptions);

    const scrollBtn = document.getElementById('scrollToBottom');
    if (scrollBtn) {
        setTimeout(() => {
            scrollBtn.classList.remove('visible');
        }, animated ? 300 : 0);
    }
}

export function showContextMenu(event, messageRow, text, isUser) {
    removeContextMenus();
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';

    const menuItems = [
        {
            icon: 'fa-copy',
            text: 'Copy',
            action: () => copyMessage(text)
        },
        {
            icon: 'fa-pen-to-square',
            text: 'Edit',
            action: () => editMessage(messageRow, text),
            userOnly: true
        },
        {
            icon: 'fa-trash-alt',
            text: 'Delete',
            action: () => deleteMessage(messageRow),
            userOnly: true
        }
    ];

    menuItems.forEach(item => {
        if (item.userOnly && !isUser) return;

        const btn = document.createElement('button');
        btn.innerHTML = `<i class="fas ${item.icon}"></i>${item.text}`;
        btn.addEventListener('click', () => {
            item.action();
            removeContextMenus();
        });
        contextMenu.appendChild(btn);
    });

    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    setTimeout(() => {
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${event.pageX - rect.width}px`;
        }
        else if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${event.pageY - rect.height}`;
        }
    }, 0);

    document.body.appendChild(contextMenu);
    setTimeout(() => contextMenu.classList.add('active'), 0);

    document.addEventListener('click', removeContextMenus);
    document.addEventListener('contextmenu', removeContextMenus);
}

export function removeContextMenus() {
    document.querySelectorAll('.context-menu').forEach(menu => menu.remove());
}

export function deleteMessage(messageDiv) {
    messageDiv.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => {
        messageDiv.remove();
        updateChatHistory();
        showToast('Message deleted');
    }, 300);
}

export function initScrollToBottomButton() {
    const chatbox = document.getElementById('chatbox');
    const scrollBtn = document.getElementById('scrollToBottom');
    
    if (!chatbox || !scrollBtn) return;
    
    chatbox.addEventListener('scroll', () => {
        const scrollPosition = chatbox.scrollTop;
        const scrollHeight = chatbox.scrollHeight;
        const clientHeight = chatbox.clientHeight;
        
        const scrollThreshold = 300;
        const isNearBottom = (scrollHeight - scrollPosition - clientHeight) <= scrollThreshold;
        
        if (!isNearBottom) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    
    scrollBtn.addEventListener('click', () => {
        scrollToBottom(true);
    });
}

// Chatbox responsive design
window.addEventListener('resize', () => {
    const chatbox = document.getElementById('userInput');
    if (window.matchMedia("(max-width: 330px)").matches) {
        chatbox.placeholder = "Message";
    }
    else {
        chatbox.placeholder = "Message AI Assistant...";
    }
});
