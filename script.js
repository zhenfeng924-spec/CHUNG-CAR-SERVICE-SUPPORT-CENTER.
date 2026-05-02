// 全局變量
let currentSlide = 0;
let carouselInterval;
let messages = [];
let isTyping = false;
let retryMessage = null;

// 性能優化：防抖函數
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 性能優化：節流函數
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 性能優化：RequestAnimationFrame 包裝器
function rafThrottle(callback) {
    let requestId = null;
    let lastArgs;
    
    const later = (context) => () => {
        requestId = null;
        callback.apply(context, lastArgs);
    };
    
    const throttled = function(...args) {
        lastArgs = args;
        if (requestId === null) {
            requestId = requestAnimationFrame(later(this));
        }
    };
    
    throttled.cancel = () => {
        cancelAnimationFrame(requestId);
        requestId = null;
    };
    
    return throttled;
}

// DOM元素 - 延遲初始化避免移動端崩潰
let carouselSlides, indicators, prevBtn, nextBtn, progressBar;
let messagesList, messagesContainer, messageInput, sendBtn, clearBtn, resetBtn, typingIndicator;
let hamburger, navMenu, errorModal, modalClose, retryBtn, okBtn;

// 初始化 DOM 元素
function initDOMElements() {
    try {
        carouselSlides = document.getElementById('carouselSlides');
        indicators = document.querySelectorAll('.indicator');
        prevBtn = document.getElementById('prevBtn');
        nextBtn = document.getElementById('nextBtn');
        progressBar = document.getElementById('progressBar');
        messagesList = document.getElementById('messagesList');
        messagesContainer = document.getElementById('messagesContainer');
        messageInput = document.getElementById('messageInput');
        sendBtn = document.getElementById('sendBtn');
        clearBtn = document.getElementById('clearBtn');
        resetBtn = document.getElementById('resetBtn');
        typingIndicator = document.getElementById('typingIndicator');
        hamburger = document.getElementById('hamburger');
        navMenu = document.getElementById('navMenu');
        errorModal = document.getElementById('errorModal');
        modalClose = document.getElementById('modalClose');
        retryBtn = document.getElementById('retryBtn');
        okBtn = document.getElementById('okBtn');
        return true;
    } catch (error) {
        console.error('DOM 元素初始化失敗:', error);
        return false;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 先初始化 DOM 元素
        if (!initDOMElements()) {
            console.error('無法初始化 DOM 元素');
            return;
        }
        
        // 使用 requestAnimationFrame 優化初始化
        requestAnimationFrame(() => {
            try {
                initCarousel();
                initChat();
                initNavigation();
                initModal();
                initScrollAnimations();
                
                // 延遲加載非關鍵功能
                setTimeout(() => {
                    try {
                        loadMessages();
                        preloadImages();
                    } catch (error) {
                        console.error('延遲加載失敗:', error);
                    }
                }, 100);
            } catch (error) {
                console.error('初始化失敗:', error);
            }
        });
    } catch (error) {
        console.error('DOMContentLoaded 錯誤:', error);
    }
});

// 照片輪播功能 - 優化版（添加錯誤處理）
function initCarousel() {
    try {
        const slides = document.querySelectorAll('.slide');
        if (!slides || slides.length === 0) {
            console.warn('未找到輪播圖片');
            return;
        }
        
        const totalSlides = slides.length;
        
        // 自動輪播
        carouselInterval = setInterval(() => {
            nextSlide();
        }, 5000);
        
        // 進度條動畫 - 使用 RAF 優化
        if (progressBar) {
            let progress = 0;
            let lastTime = performance.now();
            
            const updateProgress = (currentTime) => {
                try {
                    const deltaTime = currentTime - lastTime;
                    
                    if (deltaTime >= 100) {
                        progress += 2;
                        if (progressBar) {
                            progressBar.style.width = progress + '%';
                        }
                        if (progress >= 100) {
                            progress = 0;
                        }
                        lastTime = currentTime;
                    }
                    
                    requestAnimationFrame(updateProgress);
                } catch (error) {
                    console.error('進度條更新錯誤:', error);
                }
            };
            
            requestAnimationFrame(updateProgress);
        }
        
        // 手動控制
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevSlide();
                resetCarousel();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                resetCarousel();
            });
        }
        
        // 指示器點擊
        if (indicators && indicators.length > 0) {
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    currentSlide = index;
                    updateSlide();
                    resetCarousel();
                }, { passive: true });
            });
        }
        
        // 懸停暫停 - 使用 Passive 監聽
        const carouselSection = document.querySelector('.carousel-section');
        if (carouselSection) {
            carouselSection.addEventListener('mouseenter', () => {
                clearInterval(carouselInterval);
            }, { passive: true });
            
            carouselSection.addEventListener('mouseleave', () => {
                resetCarousel();
            }, { passive: true });
        }
    } catch (error) {
        console.error('輪播初始化錯誤:', error);
    }
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % document.querySelectorAll('.slide').length;
    updateSlide();
}

function prevSlide() {
    const totalSlides = document.querySelectorAll('.slide').length;
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlide();
}

function updateSlide() {
    const slides = document.querySelectorAll('.slide');
    slides.forEach((slide, index) => {
        slide.classList.remove('active');
        if (index === currentSlide) {
            slide.classList.add('active');
        }
    });
    
    indicators.forEach((indicator, index) => {
        indicator.classList.remove('active');
        if (index === currentSlide) {
            indicator.classList.add('active');
        }
    });
    
    progressBar.style.width = '0%';
}

function resetCarousel() {
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
        nextSlide();
    }, 5000);
    progressBar.style.width = '0%';
}

// 對話功能初始化（添加錯誤處理）
function initChat() {
    try {
        if (!sendBtn || !messageInput) {
            console.warn('聊天元素未找到');
            return;
        }
        
        // 發送按鈕點擊
        sendBtn.addEventListener('click', sendMessage);
        
        // Enter鍵發送，Shift+Enter換行
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // 自動調整輸入框高度 - 使用防抖優化
        const autoResize = debounce(() => {
            if (messageInput) {
                messageInput.style.height = 'auto';
                messageInput.style.height = messageInput.scrollHeight + 'px';
            }
        }, 50);
        
        messageInput.addEventListener('input', autoResize);
        
        // 清空對話
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('確定要清空所有對話記錄嗎？')) {
                    clearMessages();
                }
            });
        }

        // 重置對話：恢復初始歡迎訊息並清除本地儲存
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetChatBox();
            });
        }
    } catch (error) {
        console.error('聊天初始化錯誤:', error);
    }
}

// 發送消息
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;
    
    // 添加用戶消息
    addMessage(message, 'user');
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // 禁用輸入
    setInputDisabled(true);
    sendBtn.classList.add('loading');
    
    // 顯示AI輸入狀態
    showTypingIndicator();
    
    try {
        const aiResponse = await getAIResponse(message);
        
        // 隱藏輸入狀態
        hideTypingIndicator();
        
        // 添加AI回復（逐字顯示）
        await addAIMessage(aiResponse);
        
        // 保存消息
        saveMessages();
    } catch (error) {
        hideTypingIndicator();
        showError(error.message || '發送消息失敗，請稍後再試。', message);
    } finally {
        setInputDisabled(false);
        sendBtn.classList.remove('loading');
    }
}

// 取得AI回覆
function getChatApiUrl() {
    const isLocalFile = window.location.protocol === 'file:';
    return isLocalFile ? 'http://localhost:3000/api/chat' : '/api/chat';
}

async function getAIResponse(userMessage) {
    const chatHistory = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const response = await fetch(getChatApiUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: userMessage,
            messages: chatHistory
        })
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error('AI 服務回應格式不正確');
    }

    if (!response.ok || !data.success) {
        throw new Error(data?.message || 'AI 服務暫時無法使用');
    }

    return data.reply;
}

// 添加消息到界面 - 優化版減少重排
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = type === 'user' 
        ? '<i class="fas fa-user"></i>' 
        : '<i class="fas fa-robot"></i>';
    
    const time = getCurrentTime();
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${avatar}
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <p>${formatMessage(content)}</p>
            </div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    // 使用 DocumentFragment 減少重排
    const fragment = document.createDocumentFragment();
    fragment.appendChild(messageDiv);
    messagesList.appendChild(fragment);
    
    // 使用 RAF 優化滾動
    requestAnimationFrame(() => {
        scrollToBottom();
    });
    
    // 保存到消息數組
    messages.push({
        content,
        type,
        time
    });
}

// AI消息逐字顯示 - 優化版使用 RAF
async function addAIMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <p></p>
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        </div>
    `;
    
    messagesList.appendChild(messageDiv);
    const messageBubble = messageDiv.querySelector('.message-bubble p');
    
    // 逐字顯示動畫 - 使用 RAF 優化
    let index = 0;
    return new Promise((resolve) => {
        const typeChar = () => {
            if (index < content.length) {
                messageBubble.textContent = content.substring(0, index + 1);
                index++;
                
                // 每 3 個字符滾動一次，減少滾動頻率
                if (index % 3 === 0) {
                    requestAnimationFrame(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    });
                }
                
                // 使用 RAF 替代 setInterval
                setTimeout(() => requestAnimationFrame(typeChar), 30);
            } else {
                // 保存消息
                messages.push({
                    content,
                    type: 'ai',
                    time: getCurrentTime()
                });
                saveMessages();
                resolve();
            }
        };
        requestAnimationFrame(typeChar);
    });
}

// 格式化消息（支持富文本）
function formatMessage(content) {
    // 轉義HTML
    content = content.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
    
    // 處理鏈接
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    
    // 處理加粗 **text**
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 處理換行
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// 顯示/隱藏輸入狀態 - 優化版
function showTypingIndicator() {
    requestAnimationFrame(() => {
        typingIndicator.classList.add('show');
        scrollToBottom();
    });
}

function hideTypingIndicator() {
    requestAnimationFrame(() => {
        typingIndicator.classList.remove('show');
    });
}

// 設置輸入禁用狀態
function setInputDisabled(disabled) {
    messageInput.disabled = disabled;
    sendBtn.disabled = disabled;
}

// 滾動到底部 - 優化版使用 RAF（添加錯誤處理）
function scrollToBottom() {
    try {
        if (messagesContainer) {
            requestAnimationFrame(() => {
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            });
        }
    } catch (error) {
        console.error('滾動錯誤:', error);
    }
}

// 獲取當前時間
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 清空消息
function clearMessages() {
    messages = [];
    messagesList.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>有什麼我可以幫助您的嗎？</p>
                </div>
                <div class="message-time">剛剛</div>
            </div>
        </div>
    `;
    saveMessages();
}

// 重置聊天方塊（恢復初始歡迎語並清空存檔）
function resetChatBox() {
    messages = [];
    messagesList.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>您好！我是AI助手，很高興為您服務。有什麼我可以幫助您的嗎？</p>
                </div>
                <div class="message-time">剛剛</div>
            </div>
        </div>
    `;
    localStorage.removeItem('chatMessages');
    messageInput.value = '';
    messageInput.style.height = 'auto';
    hideTypingIndicator();
    scrollToBottom();
}

// 保存消息到本地存儲
function saveMessages() {
    try {
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
        console.error('保存消息失敗:', error);
    }
}

// 從本地存儲加載消息 - 優化版批量渲染
function loadMessages() {
    try {
        const savedMessages = localStorage.getItem('chatMessages');
        if (savedMessages) {
            messages = JSON.parse(savedMessages);
            // 只顯示最近的20條消息
            const recentMessages = messages.slice(-20);
            
            // 使用 DocumentFragment 批量添加，減少重排
            const fragment = document.createDocumentFragment();
            messagesList.innerHTML = '';
            
            recentMessages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.type}-message`;
                
                const avatar = msg.type === 'user' 
                    ? '<i class="fas fa-user"></i>' 
                    : '<i class="fas fa-robot"></i>';
                
                messageDiv.innerHTML = `
                    <div class="message-avatar">
                        ${avatar}
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>${formatMessage(msg.content)}</p>
                        </div>
                        <div class="message-time">${msg.time}</div>
                    </div>
                `;
                
                fragment.appendChild(messageDiv);
            });
            
            messagesList.appendChild(fragment);
            requestAnimationFrame(() => {
                scrollToBottom();
            });
        }
    } catch (error) {
        console.error('加載消息失敗:', error);
    }
}

// 導航功能 - 優化版使用 Passive 監聽（添加錯誤處理）
function initNavigation() {
    try {
        if (!hamburger || !navMenu) {
            console.warn('導航元素未找到');
            return;
        }
        
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
        
        // 點擊導航鏈接後關閉菜單
        const navLinks = document.querySelectorAll('.nav-menu a');
        if (navLinks && navLinks.length > 0) {
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (navMenu) navMenu.classList.remove('active');
                    if (hamburger) hamburger.classList.remove('active');
                }, { passive: false }); // 這裡需要 preventDefault，所以不能是 passive
            });
            
            // 平滑滾動 - 優化版
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    try {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('#')) {
                            e.preventDefault();
                            const target = document.querySelector(href);
                            if (target) {
                                // 使用原生平滑滾動
                                target.scrollIntoView({ 
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            }
                        }
                    } catch (error) {
                        console.error('滾動錯誤:', error);
                    }
                });
            });
        }
    } catch (error) {
        console.error('導航初始化錯誤:', error);
    }
}

// 錯誤提示彈窗（添加錯誤處理）
function initModal() {
    try {
        if (!errorModal) {
            console.warn('模態框元素未找到');
            return;
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', hideError);
        }
        
        if (okBtn) {
            okBtn.addEventListener('click', hideError);
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                hideError();
                if (retryMessage && messageInput) {
                    messageInput.value = retryMessage;
                    sendMessage();
                    retryMessage = null;
                }
            });
        }
        
        // 點擊背景關閉
        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                hideError();
            }
        }, { passive: true });
    } catch (error) {
        console.error('模態框初始化錯誤:', error);
    }
}

function showError(message, retryMsg = null) {
    document.getElementById('errorMessage').textContent = message;
    retryMessage = retryMsg;
    retryBtn.style.display = retryMsg ? 'block' : 'none';
    errorModal.classList.add('show');
}

function hideError() {
    errorModal.classList.remove('show');
    retryMessage = null;
}

// 性能優化：虛擬滾動（長對話時）- 優化版
const optimizeLongConversations = throttle(() => {
    if (messages.length > 50) {
        // 只保留最近的50條消息在DOM中
        const messageElements = messagesList.querySelectorAll('.message');
        if (messageElements.length > 50) {
            const toRemove = messageElements.length - 50;
            // 使用 DocumentFragment 批量移除
            for (let i = 0; i < toRemove; i++) {
                messageElements[i].remove();
            }
        }
    }
}, 5000); // 每5秒最多執行一次

// 定期優化
setInterval(optimizeLongConversations, 30000); // 每30秒檢查一次

// 網絡狀態監聽（添加錯誤處理）
window.addEventListener('online', () => {
    console.log('網絡已連接');
}, { passive: true });

window.addEventListener('offline', () => {
    try {
        showError('網絡連接已斷開，請檢查您的網絡設置。');
    } catch (error) {
        console.error('離線提示錯誤:', error);
    }
}, { passive: true });

// 防止移動端滾動時的被動事件警告
try {
    document.addEventListener('touchstart', function() {}, { passive: true });
    document.addEventListener('touchmove', function() {}, { passive: true });
    document.addEventListener('touchend', function() {}, { passive: true });

    // 優化移動端滾動性能
    if (messagesContainer) {
        messagesContainer.addEventListener('touchstart', function() {}, { passive: true });
        messagesContainer.addEventListener('touchmove', function() {}, { passive: true });
    }
} catch (error) {
    console.error('觸摸事件監聽錯誤:', error);
}

// 全局錯誤處理 - 防止頁面崩潰
window.addEventListener('error', function(event) {
    console.error('全局錯誤:', event.error);
    event.preventDefault();
    return true;
}, { passive: false });

window.addEventListener('unhandledrejection', function(event) {
    console.error('未處理的 Promise 錯誤:', event.reason);
    event.preventDefault();
    return true;
}, { passive: false });

// 聯絡方式圖標懸停自動跳轉 - 優化版（添加錯誤處理）
document.addEventListener('DOMContentLoaded', () => {
    try {
        requestAnimationFrame(() => {
            const contactIcons = document.querySelectorAll('.contact-icon');
            if (contactIcons && contactIcons.length > 0) {
                contactIcons.forEach(icon => {
                    try {
                        const url = icon.dataset.url;
                        if (!url) return;
                        let hoverTimer;
                        icon.addEventListener('mouseenter', () => {
                            hoverTimer = setTimeout(() => {
                                window.location.href = url;
                            }, 180);
                        }, { passive: true });
                        icon.addEventListener('mouseleave', () => {
                            clearTimeout(hoverTimer);
                        }, { passive: true });
                    } catch (error) {
                        console.error('聯絡圖標事件錯誤:', error);
                    }
                });
            }
        });
    } catch (error) {
        console.error('聯絡圖標初始化錯誤:', error);
    }
});

// 滾動動畫初始化 - 優化版使用 RAF 和 Passive 監聽（添加錯誤處理）
function initScrollAnimations() {
    try {
        const animatedBlocks = document.querySelectorAll('.scroll-animate');
        if (!animatedBlocks || animatedBlocks.length === 0) {
            console.log('未找到需要動畫的元素');
            return;
        }

        // 使用 Intersection Observer 提升性能
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // 使用 RAF 優化動畫觸發
                    requestAnimationFrame(() => {
                        entry.target.classList.add('visible');
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.1, 
            rootMargin: '0px 0px -50px 0px'
        });

        animatedBlocks.forEach(el => observer.observe(el));
    } catch (error) {
        console.error('滾動動畫初始化錯誤:', error);
    }
}

// 圖片預加載優化（添加錯誤處理）
function preloadImages() {
    try {
        const images = [
            'images/屏幕截图 2026-01-08 142444.png',
            'images/屏幕截图 2026-01-08 143146.png',
            'images/屏幕截图 2026-01-08 143605.png'
        ];
        
        images.forEach(src => {
            try {
                const img = new Image();
                img.onerror = () => console.warn(`圖片加載失敗: ${src}`);
                img.src = src;
            } catch (error) {
                console.error(`預加載圖片錯誤: ${src}`, error);
            }
        });
    } catch (error) {
        console.error('圖片預加載錯誤:', error);
    }
}

// ==================== 客戶資料表單（聊天區塊旁）====================

// 提交表單數據到後端和本地存儲
async function simulateFormSubmission(formData) {
    const API_URL = 'http://localhost:3000/api/consultations';
    
    // 添加時間戳
    const submissionData = {
        ...formData,
        timestamp: new Date().toISOString()
    };
    
    // 1. 嘗試提交到後端數據庫
    let backendSuccess = false;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ 數據已成功保存到後端數據庫');
            backendSuccess = true;
        } else {
            console.warn('⚠️ 後端保存失敗:', result.message);
        }
    } catch (error) {
        console.warn('⚠️ 後端連接失敗，將使用本地存儲:', error.message);
    }
    
    // 2. 同時保存到本地存儲（作為備份或後端不可用時使用）
    try {
        const existingData = localStorage.getItem('consultationSubmissions');
        const submissions = existingData ? JSON.parse(existingData) : [];
        
        submissions.push(submissionData);
        
        localStorage.setItem('consultationSubmissions', JSON.stringify(submissions));
        console.log('✅ 數據已保存到本地存儲');
    } catch (error) {
        console.error('❌ 本地存儲失敗:', error);
        if (!backendSuccess) {
            throw new Error('數據保存失敗');
        }
    }
    
    // 如果後端和本地存儲都失敗，拋出錯誤
    if (!backendSuccess) {
        console.log('⚠️ 僅保存到本地存儲（後端不可用）');
    }
    
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const clientInfoForm = document.getElementById('clientInfoForm');
        if (!clientInfoForm) return;

        // 日期驗證
        const ciAccidentDate = document.getElementById('ci-accidentDate');
        if (ciAccidentDate) {
            ciAccidentDate.addEventListener('change', function () {
                const selected = new Date(this.value);
                const today = new Date();
                const threeYearsAgo = new Date();
                threeYearsAgo.setFullYear(today.getFullYear() - 3);
                if (selected < threeYearsAgo) {
                    alert('意外發生日期必須在三年以內');
                    this.value = '';
                } else if (selected > today) {
                    alert('意外發生日期不能是未來日期');
                    this.value = '';
                }
            });
        }

        clientInfoForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('ci-name').value.trim();
            const areaCode = document.getElementById('ci-areaCode').value;
            const phone = document.getElementById('ci-phone').value.trim();
            const email = document.getElementById('ci-email').value.trim();
            const accidentDate = document.getElementById('ci-accidentDate').value;
            const workInjury = document.getElementById('ci-workInjury').value;
            const sickDays = document.getElementById('ci-sickDays').value.trim();
            const hasLawyer = document.getElementById('ci-hasLawyer').value;

            if (!name) { alert('請填寫姓名'); document.getElementById('ci-name').focus(); return; }
            if (!phone) { alert('請填寫電話號碼'); document.getElementById('ci-phone').focus(); return; }
            if (!/^\d{8}$/.test(phone)) { alert('請輸入有效的8位電話號碼'); document.getElementById('ci-phone').focus(); return; }
            if (!hasLawyer) { alert('請選擇是否已聘用律師'); document.getElementById('ci-hasLawyer').focus(); return; }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('請輸入有效的電郵地址');
                document.getElementById('ci-email').focus();
                return;
            }

            const submitBtn = document.getElementById('ciSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>提交中...</span>';

            const formData = { name, email, areaCode, phone, accidentDate, workInjury, sickDays, hasLawyer };

            try {
                await simulateFormSubmission(formData);
                clientInfoForm.reset();
                const successEl = document.getElementById('ciSuccess');
                if (successEl) {
                    successEl.classList.add('show');
                    setTimeout(() => successEl.classList.remove('show'), 5000);
                }
            } catch (err) {
                console.error('提交錯誤:', err);
                alert('提交失敗，請稍後再試或直接致電 +852 6888 7606');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>提交資料</span>';
            }
        });
    } catch (error) {
        console.error('客戶資料表單初始化錯誤:', error);
    }
});
