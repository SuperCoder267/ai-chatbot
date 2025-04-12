import {userInput} from './domElements.js';
import {handleSendMessage} from './chatService.js';
import {showToast} from './uiService.js';

class VoiceHandler {
    constructor() {
        this.voiceBtn = document.getElementById('voiceBtn');
        this.isListening = false;
        this.isVoiceModeEnabled = false;
        this.synthesis = window.speechSynthesis;
        this.isSpeaking = false;
        this.voices = [];
        this.preferredVoice = null;
        this.speechTimeout = null;
        this.currentTranscript = '';
        this.isInterruptible = true;
        this.currentUtterance = null;
        this.shouldRestartListening = false;

        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        }
        else {
            this.voiceBtn.style.display = 'none';
            console.warn('Speech recognition not supported.');
        }

        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.setPreferredVoice.bind(this);
        }

        speechSynthesis.onvoiceschanged = () => {
            const allVoices = speechSynthesis.getVoices();
            console.log('Voices available:', allVoices);
            this.setPreferredVoice();
        };

        // Fallback (set voice immediately)
        setTimeout(() => {
            if (!this.preferredVoice) {
                this.setPreferredVoice();
            }
        }, 1000);

        if (this.recognition) {
            this.setupRecognition();
            this.setupVoiceButton();
        }
    }

    setupVoiceButton() {
        this.voiceBtn.addEventListener('click', () => {
            if (this.isSpeaking) {
                // If AI is speaking, stop it and prepare to listen
                this.stopSpeaking();
                this.isVoiceModeEnabled = true;
                setTimeout(() => this.startListening(), 300);
                return;
            }

            this.isVoiceModeEnabled = !this.isVoiceModeEnabled;
            if (this.isVoiceModeEnabled) {
                this.startListening();
            } else {
                this.stopListening();
            }
        });
    }

    startListening() {
        if (!this.recognition) return;

        try {
            // Only start if not already listening
            if (!this.isListening) {
                this.recognition.start();
                this.isListening = true;
                this.updateVoiceButton();
                this.showVoiceIndicator('Listening...');
            }
        } catch (error) {
            console.error('Recognition start error:', error);
            this.isListening = false;
            this.updateVoiceButton();
            this.hideVoiceIndicator();
        }
    }

    stopListening() {
        if (!this.recognition) return;

        // Prevent feedback loop by disabling and enabling voice mode
        this.isVoiceModeEnabled = false;
        setTimeout(() => this.isVoiceModeEnabled = true, 300);

        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Recognition stop error:', error);
        }
        this.updateVoiceButton();
        this.hideVoiceIndicator();
    }

    setupRecognition() {
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.addEventListener('start', () => {
            this.isListening = true;
            this.voiceBtn.classList.add('listening');
            this.showVoiceIndicator('Listening...');
        });

        this.recognition.addEventListener('end', () => {
            this.isListening = false;
            this.voiceBtn.classList.remove('listening');
            this.hideVoiceIndicator();
            
            // Only restart if we're supposed to be listening
            if (this.isVoiceModeEnabled && !this.isSpeaking) {
                setTimeout(() => {
                    this.startListening();
                }, 100);
            }
        });

        this.recognition.addEventListener('result', (event) => {
            if (!this.isSpeaking && event.results && event.results.length > 0) {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                if (transcript.trim()) {
                    userInput.value = transcript;
                    handleSendMessage(true);
                }
            }
        });

        this.recognition.addEventListener('error', (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Handle no-speech error properly
            if (event.error === 'no-speech') {
                this.showVoiceIndicator('No speech detected. Please try again.');
                setTimeout(() => {
                    if (this.isVoiceModeEnabled) {
                        this.startListening();
                    }
                }, 2000);
                return;
            }
            
            this.stopListening();
            showToast('Voice recognition error. Please try again.');
        });
    }

    updateVoiceButton() {
        const icon = this.voiceBtn.querySelector('i');
        
        if (this.isSpeaking) {
            // Show stop button while speaking
            icon.className = 'fas fa-stop';
            this.voiceBtn.classList.add('speaking');
            this.voiceBtn.style.color = '#ef4444'; // Red color
            this.voiceBtn.setAttribute('title', 'Click to stop AI and speak');
        } else if (this.isListening) {
            icon.className = 'fas fa-microphone';
            this.voiceBtn.classList.add('listening');
            this.voiceBtn.style.color = ''; // Reset color
            this.voiceBtn.setAttribute('title', 'Listening...');
        } else {
            icon.className = 'fas fa-microphone';
            this.voiceBtn.classList.remove('listening', 'speaking');
            this.voiceBtn.style.color = ''; // Reset color
            this.voiceBtn.setAttribute('title', 'Click to enable voice mode');
        }
    }
    
    showVoiceIndicator(text) {
        let indicator = document.querySelector('.voice-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'voice-indicator';
            document.querySelector('.input-container').appendChild(indicator);
        }
        indicator.textContent = text;
        indicator.classList.add('active');
    }

    hideVoiceIndicator() {
        const indicator = document.querySelector('.voice-indicator');
        if (indicator) {
            indicator.classList.remove('active');
        }
    }

    setPreferredVoice() {
        this.voices = speechSynthesis.getVoices();

        if (!this.voices.length) {
            console.warn("No voices available yet. Retrying...");
            return;
        }

        // Friendly female voice
        const friendlyVoices = this.voices.filter(voice =>
            voice.name === 'Microsoft Guy Online (Natural) - English (United States)' ||
            voice.name === 'Microsoft Aria Online (Natural) - English (United States)' ||
            voice.name === 'Google US English'
        );

        this.preferredVoice = friendlyVoices.length > 0
            ? friendlyVoices[0]
            : this.voices.find(voice => voice.lang.startsWith('Microsoft')) || this.voices[0];
        
        if (this.preferredVoice) {
            console.log('Selected voice:', this.preferredVoice.name);
        } else {
            console.error("No valid voice found.");
        }
    }

    speak(text) {
        // Don't start speaking if we're listening
        if (this.isListening) {
            this.stopListening();
        }

        this.synthesis.cancel();
        
        // Strip HTML tags from the text
        let cleanedText = text.replace(/<\/?[^>]+(>|$)/g, "");

        cleanedText = cleanedText.replace(/(\d)\.(\d)/g, '$1 point $2');

        // Add speak-friendly changes
        cleanedText = cleanedText.replace(/^assistant:\s*/i, "");
        cleanedText = cleanedText.replace(/\./g, ',');
        cleanedText = cleanedText.replace(/\!/g, ',');
        cleanedText = cleanedText.replace(/\?/g, ',');
        
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        this.currentUtterance = utterance;
        
        // Configure utterance
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }

        utterance.addEventListener('start', () => {
            this.isSpeaking = true;
            this.isListening = false;
            this.updateVoiceButton();
            this.showVoiceIndicator('AI Speaking');
        });
        
        utterance.addEventListener('end', () => {
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.updateVoiceButton();
            this.hideVoiceIndicator();

            // Only restart listening if we weren't interrupted
            if (this.isVoiceModeEnabled && this.isInterruptible) {
                setTimeout(() => this.startListening(), 500);
            }
        });

        utterance.addEventListener('error', (error) => {
            // Only handle non-interruption errors
            if (error.error !== 'interrupted') {
                console.error('Speech synthesis error:', error);
                this.isSpeaking = false;
                this.currentUtterance = null;
                this.updateVoiceButton();
                this.hideVoiceIndicator();
                
                if (this.isVoiceModeEnabled) {
                    setTimeout(() => this.startListening(), 500);
                }
            }
        });

        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.isInterruptible = false;
            this.synthesis.cancel();
            this.currentUtterance = null;
            this.isSpeaking = false;
            this.updateVoiceButton();
            this.hideVoiceIndicator();
            
            // Reset after a short delay
            setTimeout(() => {
                this.isInterruptible = true;
            }, 300);
        }
    }
}

export const voiceHandler = new VoiceHandler();
