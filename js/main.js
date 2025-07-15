// main.js

// Initialize Lucide icons
lucide.createIcons();

// Course content data (default and tutor-uploaded)
let courseContent = [
    {
        id: 1,
        title: "Introduction to Multi-Modal Learning",
        text: "Welcome to the Multi-Modal Learning App! This platform is designed to provide educational content in multiple formats to accommodate different learning preferences and accessibility needs. You can switch between text, audio, and Nigerian Sign Language video formats using the tabs above.\n\nThe text format provides written content that you can read at your own pace. The audio format converts this text to speech with a Nigerian English accent. The sign language video format shows a video interpretation of the content in Nigerian Sign Language (NSL).\n\nThis approach ensures that learners with different abilities can access the material in the way that works best for them, creating a more inclusive learning environment.",
        audioUrl: null, // Generated dynamically
        videoUrl: "assets/sample-video.mp4",
        captionsUrl: "assets/captions.vtt"
    }
];

// Load tutor-uploaded lessons
function loadUploadedLessons() {
    const uploaded = JSON.parse(localStorage.getItem('uploadedLessons') || '[]');
    courseContent = [...courseContent, ...uploaded];
}

// Current lesson index
let currentLessonIndex = 0;

// Track completed lessons
let completedLessons = new Set();

// Speech synthesis
let speechUtterance = null;
let isSpeaking = false;
let speechPaused = false;
let playbackSpeed = 1;

// DOM elements
const lessonTitle = document.getElementById('lesson-title');
const lessonText = document.getElementById('lesson-text');
const prevLessonBtn = document.getElementById('prev-lesson');
const nextLessonBtn = document.getElementById('next-lesson');
const modalityTabs = document.querySelectorAll('.modality-tab');
const modalityContents = document.querySelectorAll('.modality-content');
const playAudioBtn = document.getElementById('play-audio');
const playIcon = document.getElementById('play-icon');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const progressBar = document.getElementById('progress-bar');
const volumeBtn = document.getElementById('volume-btn');
const volumeIcon = document.getElementById('volume-icon');
const volumeSlider = document.getElementById('volume-slider');
const speedBtn = document.getElementById('speed-btn');
const speedText = document.getElementById('speed-text');
const videoElement = document.getElementById('sign-language-video');
const playVideoBtn = document.getElementById('play-video');
const videoPlayIcon = document.getElementById('video-play-icon');
const fullscreenVideoBtn = document.getElementById('fullscreen-video');
const pipVideoBtn = document.getElementById('pip-video');
const markCompleteBtn = document.getElementById('mark-complete');
const completionCheck = document.getElementById('completion-check');
const themeToggleBtn = document.getElementById('theme-toggle');
const lessonProgressText = document.getElementById('lesson-progress-text');
const lessonList = document.getElementById('lesson-list');
const progressBarVisual = document.getElementById('progress-bar-visual');
const progressText = document.getElementById('progress-text');

// Tutor dashboard elements
const lessonUploadForm = document.getElementById('lesson-upload-form');
const uploadStatus = document.getElementById('upload-status');
const uploadedLessons = document.getElementById('uploaded-lessons');

// Animation functions
function animateButtonPress(element) {
    element.classList.remove('animate-press');
    void element.offsetWidth;
    element.classList.add('animate-press');
}

function animateGlow(element) {
    element.classList.remove('animate-glow');
    void element.offsetWidth;
    element.classList.add('animate-glow');
    setTimeout(() => element.classList.remove('animate-glow'), 500);
}

function animateCompletionCheck() {
    completionCheck.classList.add('animate-pulse');
    setTimeout(() => completionCheck.classList.remove('animate-pulse'), 1500);
}

// Core application logic
function loadLesson(index) {
    const lesson = courseContent[index];
    lessonTitle.textContent = lesson.title;
    lessonText.innerHTML = lesson.text.split('\n\n').map((p, i) => `<p class="mb-4 animate-slide-up" style="animation-delay: ${i * 0.1}s;">${p}</p>`).join('');
    videoElement.src = lesson.videoUrl;
    videoElement.load();
    prevLessonBtn.disabled = index === 0;
    nextLessonBtn.disabled = index === courseContent.length - 1;
    completionCheck.classList.toggle('hidden', !completedLessons.has(index));
    markCompleteBtn.textContent = completedLessons.has(index) ? 'Completed' : 'Mark as Complete';
    markCompleteBtn.classList.toggle('bg-green-600', completedLessons.has(index));
    markCompleteBtn.classList.toggle('hover:bg-green-700', completedLessons.has(index));
    markCompleteBtn.classList.toggle('btn-primary', !completedLessons.has(index));
    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
        window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    speechPaused = false;
    playIcon.setAttribute('data-lucide', 'play');
    lucide.createIcons();
    progressBar.value = 0;
    currentTimeEl.textContent = '0:00';
    videoElement.pause();
    videoElement.currentTime = 0;
    videoPlayIcon.setAttribute('data-lucide', 'play');
    lucide.createIcons();
    switchModality('text');
    lessonProgressText.textContent = `Lesson ${index + 1} of ${courseContent.length}`;
    populateLessonList();
    updateProgressBar();
}

function estimateSpeechDuration(text) {
    const wordsPerMinute = 150;
    const words = text.split(/\s+/).length;
    return (words / wordsPerMinute) * 60;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function savePreferences() {
    localStorage.setItem('playbackSpeed', playbackSpeed);
    localStorage.setItem('volume', volumeSlider.value);
    localStorage.setItem('completedLessons', JSON.stringify([...completedLessons]));
    localStorage.setItem('uploadedLessons', JSON.stringify(courseContent.filter(lesson => lesson.id > 1)));
}

function loadPreferences() {
    const savedSpeed = localStorage.getItem('playbackSpeed');
    const savedVolume = localStorage.getItem('volume');
    const savedCompleted = localStorage.getItem('completedLessons');
    if (savedSpeed) {
        playbackSpeed = parseFloat(savedSpeed);
        speedText.textContent = `${playbackSpeed}x`;
    }
    if (savedVolume) {
        volumeSlider.value = savedVolume;
        adjustVolume();
    }
    if (savedCompleted) {
        completedLessons = new Set(JSON.parse(savedCompleted));
    }
}

function populateLessonList() {
    lessonList.innerHTML = courseContent.map((lesson, index) => `
        <li>
            <button class="w-full text-left px-3 py-2 rounded-md text-sm font-medium ${currentLessonIndex === index ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-800'} transition-colors animate-slide-up" style="animation-delay: ${index * 0.1}s" data-lesson-index="${index}" aria-label="Go to lesson ${lesson.title}">
                ${completedLessons.has(index) ? '<i data-lucide="check-circle" class="inline-block mr-2 text-green-500"></i>' : ''}
                ${lesson.title}
            </button>
        </li>
    `).join('');
    lucide.createIcons();
    document.querySelectorAll('#lesson-list button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLessonIndex = parseInt(btn.dataset.lessonIndex);
            loadLesson(currentLessonIndex);
            animateButtonPress(btn);
            populateLessonList();
        });
    });
}

function updateProgressBar() {
    const progress = courseContent.length ? (completedLessons.size / courseContent.length) * 100 : 0;
    progressBarVisual.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}% Complete`;
}

// Nigerian Voice Text-to-Speech (Placeholder for Google Cloud TTS)
async function generateAudio(text) {
    // Placeholder for Google Cloud Text-to-Speech API
    try {
        // Example API call (requires actual API key and setup)
        /*
        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_API_KEY`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: { text },
                voice: { languageCode: 'en-NG', name: 'en-NG-Standard-A' },
                audioConfig: { audioEncoding: 'MP3' }
            })
        });
        const data = await response.json();
        return `data:audio/mp3;base64,${data.audioContent}`;
        */
        // Mock response
        return new Promise(resolve => setTimeout(() => resolve('assets/sample-audio.mp3'), 1000));
    } catch (error) {
        console.error('Error generating audio:', error);
        // Fallback to Web Speech API
        return null;
    }
}

function setupAudioUtterance() {
    if (speechUtterance) {
        window.speechSynthesis.cancel();
    }
    const lesson = courseContent[currentLessonIndex];
    if (lesson.audioUrl) {
        // Use pre-generated audio if available
        const audio = new Audio(lesson.audioUrl);
        audio.playbackRate = playbackSpeed;
        audio.volume = parseFloat(volumeSlider.value);
        speechUtterance = audio;
        audio.addEventListener('timeupdate', () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.value = progress;
            currentTimeEl.textContent = formatTime(audio.currentTime);
            durationEl.textContent = formatTime(audio.duration);
        });
        audio.addEventListener('ended', () => {
            isSpeaking = false;
            speechPaused = false;
            playIcon.setAttribute('data-lucide', 'play');
            lucide.createIcons();
            progressBar.value = 0;
            currentTimeEl.textContent = '0:00';
        });
    } else {
        // Fallback to Web Speech API
        speechUtterance = new SpeechSynthesisUtterance(lesson.text);
        speechUtterance.rate = playbackSpeed;
        speechUtterance.volume = parseFloat(volumeSlider.value);
        speechUtterance.lang = 'en-NG'; // Attempt Nigerian English (browser-dependent)
        speechUtterance.addEventListener('boundary', (event) => {
            if (event.name === 'word') {
                const progress = (event.charIndex / speechUtterance.text.length) * 100;
                progressBar.value = progress;
                const totalDuration = estimateSpeechDuration(speechUtterance.text) / playbackSpeed;
                const currentTime = (progress / 100) * totalDuration;
                currentTimeEl.textContent = formatTime(currentTime);
            }
        });
        speechUtterance.addEventListener('end', () => {
            isSpeaking = false;
            speechPaused = false;
            playIcon.setAttribute('data-lucide', 'play');
            lucide.createIcons();
            progressBar.value = 0;
            currentTimeEl.textContent = '0:00';
        });
        const duration = estimateSpeechDuration(speechUtterance.text) / playbackSpeed;
        durationEl.textContent = formatTime(duration);
    }
}

function switchModality(modality) {
    modalityTabs.forEach(tab => {
        if (tab.dataset.modality === modality) {
            tab.classList.add('text-indigo-600', 'border-indigo-600', 'active');
            tab.classList.remove('text-gray-500', 'hover:text-indigo-600');
            tab.setAttribute('aria-selected', 'true');
        } else {
            tab.classList.remove('text-indigo-600', 'border-indigo-600', 'active');
            tab.classList.add('text-gray-500', 'hover:text-indigo-600');
            tab.setAttribute('aria-selected', 'false');
        }
    });
    modalityContents.forEach(content => {
        if (content.id === `${modality}-content`) {
            content.classList.remove('hidden');
            content.classList.add('animate-fade-in');
            content.setAttribute('aria-hidden', 'false');
            if (modality === 'audio') {
                setupAudioUtterance();
            } else if (modality === 'video') {
                videoElement.pause();
                videoElement.currentTime = 0;
                videoPlayIcon.setAttribute('data-lucide', 'play');
                lucide.createIcons();
            } else if (modality === 'text') {
                if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
                    window.speechSynthesis.cancel();
                } else if (speechUtterance instanceof Audio) {
                    speechUtterance.pause();
                    speechUtterance.currentTime = 0;
                }
                isSpeaking = false;
                speechPaused = false;
                playIcon.setAttribute('data-lucide', 'play');
                lucide.createIcons();
                videoElement.pause();
                videoElement.currentTime = 0;
                videoPlayIcon.setAttribute('data-lucide', 'play');
                lucide.createIcons();
            }
        } else {
            content.classList.add('hidden');
            content.classList.remove('animate-fade-in');
            content.setAttribute('aria-hidden', 'true');
        }
    });
}

function toggleAudioPlayback() {
    if (!isSpeaking && !speechPaused) {
        setupAudioUtterance();
        if (speechUtterance instanceof Audio) {
            speechUtterance.play();
        } else {
            window.speechSynthesis.speak(speechUtterance);
        }
        isSpeaking = true;
        speechPaused = false;
        playIcon.setAttribute('data-lucide', 'pause');
        animateButtonPress(playAudioBtn);
        animateGlow(playAudioBtn);
    } else if (isSpeaking && !speechPaused) {
        if (speechUtterance instanceof Audio) {
            speechUtterance.pause();
        } else {
            window.speechSynthesis.pause();
        }
        isSpeaking = false;
        speechPaused = true;
        playIcon.setAttribute('data-lucide', 'play');
    } else if (!isSpeaking && speechPaused) {
        if (speechUtterance instanceof Audio) {
            speechUtterance.play();
        } else {
            window.speechSynthesis.resume();
        }
        isSpeaking = true;
        speechPaused = false;
        playIcon.setAttribute('data-lucide', 'pause');
    }
    lucide.createIcons();
}

function toggleMute() {
    animateButtonPress(volumeBtn);
    if (volumeSlider.value > 0) {
        volumeSlider.dataset.prevVolume = volumeSlider.value;
        volumeSlider.value = 0;
        volumeIcon.setAttribute('data-lucide', 'volume-x');
        if (speechUtterance instanceof Audio) {
            speechUtterance.volume = 0;
        } else if (speechUtterance) {
            speechUtterance.volume = 0;
        }
    } else {
        const prevVolume = volumeSlider.dataset.prevVolume || 0.7;
        volumeSlider.value = prevVolume;
        volumeIcon.setAttribute('data-lucide', 'volume-2');
        if (speechUtterance instanceof Audio) {
            speechUtterance.volume = parseFloat(prevVolume);
        } else if (speechUtterance) {
            speechUtterance.volume = parseFloat(prevVolume);
        }
    }
    lucide.createIcons();
}

function adjustVolume() {
    const volume = parseFloat(volumeSlider.value);
    if (volume === 0) {
        volumeIcon.setAttribute('data-lucide', 'volume-x');
    } else if (volume < 0.5) {
        volumeIcon.setAttribute('data-lucide', 'volume-1');
    } else {
        volumeIcon.setAttribute('data-lucide', 'volume-2');
    }
    if (speechUtterance instanceof Audio) {
        speechUtterance.volume = volume;
    } else if (speechUtterance) {
        speechUtterance.volume = volume;
    }
    lucide.createIcons();
}

function changePlaybackSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    playbackSpeed = speeds[nextIndex];
    speedText.textContent = `${playbackSpeed}x`;
    if (speechUtterance instanceof Audio) {
        speechUtterance.playbackRate = playbackSpeed;
    } else if (speechUtterance) {
        speechUtterance.rate = playbackSpeed;
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(speechUtterance);
        }
    }
    animateButtonPress(speedBtn);
    savePreferences();
}

function toggleVideoPlayback() {
    if (videoElement.paused) {
        videoElement.play();
        videoPlayIcon.setAttribute('data-lucide', 'pause');
        animateButtonPress(playVideoBtn);
    } else {
        videoElement.pause();
        videoPlayIcon.setAttribute('data-lucide', 'play');
    }
    lucide.createIcons();
}

function toggleFullscreen() {
    animateButtonPress(fullscreenVideoBtn);
    if (!document.fullscreenElement) {
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen().catch(err => console.error(`Fullscreen error: ${err.message}`));
        } else if (videoElement.webkitRequestFullscreen) {
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) {
            videoElement.msRequestFullscreen();
        }
        fullscreenVideoBtn.querySelector('[data-lucide]').setAttribute('data-lucide', 'minimize');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        fullscreenVideoBtn.querySelector('[data-lucide]').setAttribute('data-lucide', 'maximize');
    }
    lucide.createIcons();
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDarkMode = document.body.classList.contains('dark');
    const sunIcon = themeToggleBtn.querySelector('.dark-icon');
    const moonIcon = themeToggleBtn.querySelector('.light-icon');
    if (isDarkMode) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
    animateButtonPress(themeToggleBtn);
    lucide.createIcons();
}

// Tutor content processing
async function generateNSLVideo(text) {
    // Placeholder for ML-based NSL video generation
    try {
        // Example API call (requires actual ML model)
        /*
        const response = await fetch('https://api.example.com/text-to-nsl', {
            method: 'POST',
            body: JSON.stringify({ text }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        return data.videoUrl;
        */
        // Mock response
        return new Promise(resolve => setTimeout(() => resolve('assets/sample-video.mp4'), 1000));
    } catch (error) {
        console.error('Error generating NSL video:', error);
        return 'assets/sample-video.mp4';
    }
}

async function processLessonUpload(title, content) {
    const audioUrl = await generateAudio(content);
    const videoUrl = await generateNSLVideo(content);
    const lesson = {
        id: courseContent.length + 1,
        title,
        text: content,
        audioUrl,
        videoUrl,
        captionsUrl: 'assets/captions.vtt' // Mock captions
    };
    courseContent.push(lesson);
    savePreferences();
    return lesson;
}

function populateUploadedLessons() {
    if (!uploadedLessons) return;
    uploadedLessons.innerHTML = courseContent.filter(lesson => lesson.id > 1).map(lesson => `
        <li class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <h3 class="text-lg font-semibold text-indigo-700 dark:text-indigo-400">${lesson.title}</h3>
            <p class="text-gray-600 dark:text-gray-300">${lesson.text.substring(0, 100)}...</p>
            <div class="mt-2 flex space-x-2">
                <a href="${lesson.audioUrl || '#'}" class="text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400" aria-label="Download audio for ${lesson.title}">Audio</a>
                <a href="${lesson.videoUrl}" class="text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400" aria-label="View NSL video for ${lesson.title}">NSL Video</a>
            </div>
        </li>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    if (prevLessonBtn) {
        prevLessonBtn.addEventListener('click', () => {
            if (currentLessonIndex > 0) {
                currentLessonIndex--;
                loadLesson(currentLessonIndex);
                animateButtonPress(prevLessonBtn);
                populateLessonList();
                updateProgressBar();
            }
        });
    }

    if (nextLessonBtn) {
        nextLessonBtn.addEventListener('click', () => {
            if (currentLessonIndex < courseContent.length - 1) {
                currentLessonIndex++;
                loadLesson(currentLessonIndex);
                animateButtonPress(nextLessonBtn);
                populateLessonList();
                updateProgressBar();
            }
        });
    }

    if (modalityTabs) {
        modalityTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const modality = tab.dataset.modality;
                switchModality(modality);
                animateButtonPress(tab);
            });
        });
    }

    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', toggleAudioPlayback);
    }

    if (volumeBtn) {
        volumeBtn.addEventListener('click', toggleMute);
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', adjustVolume);
    }

    if (speedBtn) {
        speedBtn.addEventListener('click', changePlaybackSpeed);
    }

    if (playVideoBtn) {
        playVideoBtn.addEventListener('click', toggleVideoPlayback);
    }

    if (fullscreenVideoBtn) {
        fullscreenVideoBtn.addEventListener('click', toggleFullscreen);
    }

    if (pipVideoBtn) {
        pipVideoBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                    pipVideoBtn.querySelector('[data-lucide]').setAttribute('data-lucide', 'picture-in-picture');
                } else {
                    await videoElement.requestPictureInPicture();
                    animateButtonPress(pipVideoBtn);
                    pipVideoBtn.querySelector('[data-lucide]').setAttribute('data-lucide', 'picture-in-picture-2');
                }
                lucide.createIcons();
            } catch (err) {
                console.error(`Picture-in-Picture error: ${err.message}`);
            }
        });
    }

    if (markCompleteBtn) {
        markCompleteBtn.addEventListener('click', () => {
            if (completedLessons.has(currentLessonIndex)) {
                completedLessons.delete(currentLessonIndex);
                completionCheck.classList.add('hidden');
                markCompleteBtn.textContent = 'Mark as Complete';
                markCompleteBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                markCompleteBtn.classList.add('btn-primary');
            } else {
                completedLessons.add(currentLessonIndex);
                completionCheck.classList.remove('hidden');
                markCompleteBtn.textContent = 'Completed';
                markCompleteBtn.classList.remove('btn-primary');
                markCompleteBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                animateButtonPress(markCompleteBtn);
                animateGlow(markCompleteBtn);
                animateCompletionCheck();
            }
            savePreferences();
            populateLessonList();
            updateProgressBar();
        });
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    if (videoElement) {
        videoElement.addEventListener('play', () => {
            videoPlayIcon.setAttribute('data-lucide', 'pause');
            lucide.createIcons();
        });
        videoElement.addEventListener('pause', () => {
            videoPlayIcon.setAttribute('data-lucide', 'play');
            lucide.createIcons();
        });
    }

    if (lessonUploadForm) {
        lessonUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('lesson-title-input').value;
            const content = document.getElementById('lesson-content-input').value;
            if (title && content) {
                uploadStatus.textContent = 'Processing lesson...';
                uploadStatus.classList.remove('hidden');
                try {
                    await processLessonUpload(title, content);
                    uploadStatus.textContent = 'Lesson uploaded successfully!';
                    lessonUploadForm.reset();
                    populateUploadedLessons();
                    populateLessonList();
                    updateProgressBar();
                } catch (error) {
                    uploadStatus.textContent = 'Error uploading lesson. Please try again.';
                }
                setTimeout(() => uploadStatus.classList.add('hidden'), 3000);
            } else {
                uploadStatus.textContent = 'Please fill out all fields.';
                uploadStatus.classList.remove('hidden');
                setTimeout(() => uploadStatus.classList.add('hidden'), 3000);
            }
        });
    }
}

// Initialize app
function initApp() {
    loadPreferences();
    loadUploadedLessons();
    loadLesson(currentLessonIndex);
    setupEventListeners();
    setupAudioUtterance();
    populateLessonList();
    updateProgressBar();
    populateUploadedLessons();
    if (typeof tsParticles !== 'undefined') {
        tsParticles.load('tsparticles', {
            particles: {
                number: { value: 50 },
                color: { value: ['#4f46e5', '#2dd4bf'] },
                shape: { type: 'circle' },
                opacity: { value: 0.5 },
                size: { value: { min: 1, max: 3 } },
                move: { enable: true, speed: 0.5, direction: 'none', random: true }
            },
            interactivity: {
                events: { onHover: { enable: true, mode: 'repulse' } },
                modes: { repulse: { distance: 100 } }
            },
            background: { color: 'transparent' }
        });
    }
}

document.addEventListener('DOMContentLoaded', initApp);