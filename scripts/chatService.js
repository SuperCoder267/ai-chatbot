import {saveChat, getChatHistory, clearChat} from './dbService.js';
import {createMessage, createTypingIndicator, showToast} from './uiService.js';
import {voiceHandler} from './voiceHandler.js';
import {userInput, chatbox} from './domElements.js';
import {FileService} from './fileService.js';

const fileService = new FileService();

export async function handleSendMessage(isVoiceMode = false) {
    const message = userInput.value.trim();
    const files = fileService.getSelectedFiles();
    if (message === '' && (!files || files.length === 0)) return;

    await createMessage(message, true, files, isVoiceMode);

    //Process file contents
    let fileContents = '';
    if (files && files.length > 0) {
        for (const file of files) {
            const content = await extractFileContent(file);
            if (content) {
                fileContents += `\n\nFile: ${file.name}\nContent: \n${content}\n`;
            }
        }
    }


    const messageForAI = message + fileContents;

    userInput.value = '';
    fileService.clearFiles();
    
    // Reset character counter
    document.querySelector('.char-counter').textContent = '0/32000';

    // Show typing indicator
    const typingDiv = createTypingIndicator();
    chatbox.appendChild(typingDiv);

    // Get and display AI response
    const response = await getAIResponse(messageForAI, isVoiceMode);
    chatbox.removeChild(typingDiv);
    createMessage(response, false, [], isVoiceMode);

    // Speak response in voice mode
    if (isVoiceMode) {
        // Strip HTML tags to ensure clean text for speech
        const cleanText = response.replace(/<\/?[^>]+(>|$)/g, "");
        voiceHandler.speak(cleanText);
    }
}

// Extract text from data
async function extractFileContent(file) {
    try {
        if (typeof file.data === 'string' && !file.data.startsWith('data:')) {
            return file.data;
        }

        if (typeof file.data === 'string' && file.data.startsWith('data:')) {
            const base64Content = file.data.split(',')[1];
            try {
                return atob(base64Content);
            }
            catch (error) {
                console.error('Error decoding base64 content:', error);
                return null;
            }
        }

        // If content could not be extracted
        return null;
    }
    catch (error) {
        console.error('Error extracting file content:', error);
        return null;
    }
}
// Generate AI response through api key
export async function getAIResponse(userMessage, isVoiceMode = false) {
    try {
        const chatHistory = await getChatHistory();
        const API_URL = "https://api-ai-chatbot-git-main-ahmad-farooqs-projects-6f6c3160.vercel.app/api/generateResponse";

        const response = await fetch(API_URL, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: userMessage,
                chatHistory: chatHistory,
                isVoiceMode: isVoiceMode
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API response error:', errorText);
            throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        

        if (data && data.text) {
            return data.text;
        }
        else {
            console.error('Missing text property in response:', data);
            return 'Sorry, I received an unexpected response format. Please try again.';
        }
    }
    catch (error) {
        console.error('Error getting AI response: ', error);
        return 'Sorry, I encountered an error while processing your request. Please try again later.';
    }
}

// Clear chat btn
document.getElementById('clearChat').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
        try {
            await clearChat();
            chatbox.innerHTML = '';
            createMessage('Hello! 👋', false);
            setTimeout(() => {
                createMessage('How can I help you today?', false);
            }, 500);
        }
        catch (error) {
            console.error('Error clearing chat history', error);
            showToast('Error clearing chat history');
        }
    }
});

// KaTeX auto-render for math expressions
document.addEventListener('DOMContentLoaded', () => {
    renderMathInElement(document.body, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false
    });
});
