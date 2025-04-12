// IndexedDB declarations
const DB_NAME = 'chatbotDB';
const STORE_NAME = 'chatHistory';

// Save chat to DB
export async function saveChat(message) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        if (!message.timestamp) {
            message.timestamp = Date.now();
        }

        message.timestamp = message.timestamp + Math.random() * 0.001;

        const request = store.add(message);

        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
    });
}

// Load chat history
export async function loadChat() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME]);
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
    });
}

// Initialize indexedDB database
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.addEventListener('error', () => reject(request.error));
        request.addEventListener('success', () => resolve(request.result));

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {keyPath: 'timestamp'});
            }
        };
    });
}

//Clear chat functionality
export async function clearChat() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.addEventListener('success', () => resolve());
        request.addEventListener('error', () => reject(request.error));
    });
}

// Get chat history onload
export async function getChatHistory() {
    const messages = await loadChat();
    if (!messages) return [];

    return messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
        }));
}
