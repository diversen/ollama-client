import { Flash } from '/static/js/flash.js';
import { mdNoHTML } from '/static/js/markdown.js';
import { createDialog, getMessages, createMessage, getConfig, isLoggedInOrRedirect } from '/static/js/app-dialog.js';
import { responsesElem, messageElem, sendButtonElem, newButtonElem, abortButtonElem, selectModelElem, loadingSpinner } from '/static/js/app-elements.js';
import { getIsScrolling, setIsScrolling } from '/static/js/app-events.js';
import { addCopyButtons } from '/static/js/app-copy-buttons.js';
import { logError } from '/static/js/error-log.js';
import { dd } from '/static/js/diff-dom.js';
import { substituteThinkingTags } from '/static/js/utils.js';

const config = await getConfig();

// Copy icon and check icon
const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>`;

const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`;

// Math rendering
const useMathjax = config.use_mathjax;

// States
let isStreaming = false;
let currentDialogMessages = [];
let currentDialogID;

// Add event listener to the send button
sendButtonElem.addEventListener('click', async () => {
    await sendUserMessage();
});

/**
 * Set an interval to update the markdown rendering
 */
function clearStreaming() {
    console.log('Clearing streaming');
    isStreaming = false;
    abortButtonElem.setAttribute('disabled', true);
    sendButtonElem.setAttribute('disabled', true);
    newButtonElem.removeAttribute('disabled');
}

/**
 * Add event listener to the abort button
 */

let controller = new AbortController();
abortButtonElem.addEventListener('click', () => {
    console.log('Aborting request');
    controller.abort();
    controller = new AbortController();
});

/**
 * Shortcut to send message when user presses Enter + Ctrl
 */
messageElem.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        if (e.ctrlKey) {
            // If Ctrl+Enter is pressed, add a new line
            messageElem.value += '\n';
        } else {
            // If only Enter is pressed, prevent the default behavior and send the message
            e.preventDefault();
            await sendUserMessage();
        }
    }
});
/**
 * Helper function: Highlight code in a given element
 */
function highlightCodeInElement(element) {
    const codeBlocks = element.querySelectorAll('pre code');
    codeBlocks.forEach(hljs.highlightElement);
}

/**
 * Create a message element with role and content
 */

function createMessageElement(role) {
    const containerClass = `${role.toLowerCase()}-message`;
    const messageContainer = document.createElement('div');
    messageContainer.classList.add(containerClass);

    // Use template literals to create the HTML structure
    messageContainer.innerHTML = `
        <h3 class="role role_${role.toLowerCase()}">
            ${role}
            <div class="loading-model hidden"></div>
        </h3>
        <div class="content"></div>
        <div class="message-actions hidden">
            <a href="#" class="copy-message" title="Copy message to clipboard">
                ${copyIcon}
            </a>
        </div>
    `;

    // Select the elements from the generated HTML
    const loaderSpan = messageContainer.querySelector('.loading-model');
    const contentElement = messageContainer.querySelector('.content');

    return { container: messageContainer, contentElement: contentElement, loader: loaderSpan };
}

function renderCopyMessage(container, message) {
    
    const messageActions = container.querySelector('.message-actions');
    messageActions.classList.remove('hidden');
    messageActions.querySelector('.copy-message').addEventListener('click', () => {
        console.log('Copying message to clipboard');
        navigator.clipboard.writeText(message);

        // Alter icon to check icon for 3 seconds
        const copyButton = messageActions.querySelector('.copy-message');
        copyButton.innerHTML = checkIcon;
        setTimeout(() => {
            copyButton.innerHTML = copyIcon;
        }, 2000);
    });
}


/**
 * Render user message to the DOM
 */
function renderStaticUserMessage(message) {
    const { container, contentElement } = createMessageElement('User');

    contentElement.style.whiteSpace = 'pre-wrap';
    contentElement.innerText = message;

    // Render copy message
    renderCopyMessage(container, message);

    responsesElem.appendChild(container);
}

/**
 * Validate user message
 */
function validateUserMessage(userMessage) {
    if (!userMessage || isStreaming) {
        console.log('Empty message or assistant is streaming');
        return false;
    }
    return true;
}

/**
 * Send user message to the server and render the response
 */
async function sendUserMessage() {

    await isLoggedInOrRedirect();

    const userMessage = messageElem.value.trim();
    if (!validateUserMessage(userMessage)) {
        return;
    }

    // Save as dialog if it's the first message
    let message = { role: 'user', content: userMessage };

    // Create new dialog if there are no messages
    if (currentDialogMessages.length === 0) {
        currentDialogID = await createDialog(userMessage);
    }

    // Push user message to current dialog messages
    currentDialogMessages.push(message);

    // Save user message and push to all messages
    await createMessage(currentDialogID, message);

    // Clear the input field
    messageElem.value = '';

    try {
        renderStaticUserMessage(userMessage);
        setIsScrolling(true);
        await renderAssistantMessage(message);
    } catch (error) {
        await logError(error, 'Error in sendUserMessage');
        console.error("Error in sendUserMessage:", error);
        Flash.setMessage('An error occurred. Please try again.', 'error');
    }
}

/**
 * Render static assistant message (without streaming)
 */
async function renderStaticAssistantMessage(message) {
    const { container, contentElement } = createMessageElement('Assistant');
    responsesElem.appendChild(container);

    // Render copy message
    renderCopyMessage(container, message);
    message = substituteThinkingTags(message);

    contentElement.innerHTML = mdNoHTML.render(message);
    highlightCodeInElement(contentElement);
    await renderMathJax(contentElement);
    await addCopyButtons(contentElement, config);
}

/**
 * Render math if enabled
 */
async function renderMathJax(contentElem) {
    // This is not working optimally. 
    // LLMs might produce sentences like: 
    // a) (sufficiently well-behaved) or
    // b) ( e^{i\omega t} ).
    // 
    // Besides that markdown usually also escapes the backslash
    // and this may mess up rendering.
    //
    // Fix matrix rendering. This be done like this:
    // Replace '\\' with '\cr'
    if (useMathjax) {
        renderMathInElement(contentElem, {
            // delimiters: [
            //     { left: '$', right: '$', display: true },
            //     { left: '\(', right: '\)', display: false },
            //     { left: '\[', right: '\]', display: true },
            //     { left: '\begin{equation}', right: '\end{equation}', display: true }
            // ],
            delimiters: [
                
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false},
                {left: "\\(", right: "\\)", display: false},
                {left: "\\begin{equation}", right: "\\end{equation}", display: true},
                {left: "\\begin{align}", right: "\\end{align}", display: true},
                {left: "\\begin{alignat}", right: "\\end{alignat}", display: true},
                {left: "\\begin{gather}", right: "\\end{gather}", display: true},
                {left: "\\begin{CD}", right: "\\end{CD}", display: true},
                {left: "\\[", right: "\\]", display: true}
            ]

            // preProcess: (text) => {
            //     console.log(text)
            //     return text
            // }

        });
    }
}

/**
 * Update update content diff
 */

function updateContentDiff(contentElement, hiddenContentElem, streamedResponseText) {
    streamedResponseText = substituteThinkingTags(streamedResponseText);
    hiddenContentElem.innerHTML = mdNoHTML.render(streamedResponseText);
    highlightCodeInElement(hiddenContentElem);
    try {
        const diff = dd.diff(contentElement, hiddenContentElem);
        if (diff.length) dd.apply(contentElement, diff);
    } catch (error) {
        console.log("Error in diffDOMExec:", error);
    }
}


/**
 * Render assistant message with streaming
 */
async function renderAssistantMessage() {

    // Create container for assistant message and content element
    const { container, contentElement, loader } = createMessageElement('Assistant');
    responsesElem.appendChild(container);

    //  Show loader
    loader.classList.remove('hidden');

    // Set streaming flag to true and disable buttons
    isStreaming = true;
    sendButtonElem.setAttribute('disabled', true);
    newButtonElem.setAttribute('disabled', true);

    // Reset streamed response text, create hidden content element, and get selected model
    let streamedResponseText = '';
    const hiddenContentElem = document.createElement('div');
    const selectModel = selectModelElem.value;

    scrollToBottom();

    // Stream processing function
    const processStream = async (reader, decoder) => {
        try {

            while (true) {

                const { done, value } = await reader.read();

                // If loader is not hidden, hide it
                if (!loader.classList.contains('hidden')) {
                    loader.classList.toggle('hidden');
                }

                if (done) break;
                let decoded = decoder.decode(value, { stream: true });
                let dataElems = decoded.split('data: '); 

                // Remove empty elements form the array
                dataElems = dataElems.filter((data) => data.trim() !== '');
                dataElems.forEach(processChunk);
            }
        } catch (error) {
            loader.classList.add('hidden');
            clearStreaming();
            handleStreamError(error);
        }
    };

    // Function to handle chunk processing
    let totalTokenCount = 0;
    const processChunk = async (dataPart) => {
        try {

            const data = JSON.parse(dataPart);
            const messagePart = data.choices[0].delta.content;
            const isDone = data.choices[0].finish_reason
            const error = data.error;

            if (error) {
                throw new Error(error);
            }

            totalTokenCount += 1;
            streamedResponseText += messagePart;

            if (totalTokenCount % 1 === 0) {
                updateContentDiff(contentElement, hiddenContentElem, streamedResponseText);
                scrollToBottom();
            }

            if (isDone) {
                updateContentDiff(contentElement, hiddenContentElem, streamedResponseText);
                console.log('Done streaming');
                scrollToBottom();
                clearStreaming();
            }
        } catch (error) {
            console.log("Error in processChunk:", error);
            clearStreaming();
            controller.abort();
        }
    };

    // Error handling for stream
    const handleStreamError = (error) => {
        if (error.name === 'AbortError') {
            Flash.setMessage('Request was aborted', 'notice');
            console.log('Request was aborted');
        } else {
            console.error("Error in processStream:", error);
            Flash.setMessage('An error occurred while processing the stream.', 'error');
        }
    };

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: selectModel, messages: currentDialogMessages }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error("Response body is empty. Try again later.");
        }

        // Allow aborting
        abortButtonElem.removeAttribute('disabled');

        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        await processStream(reader, decoder);


    } catch (error) {
        console.error("Error in renderAssistantMessage:", error);
        clearStreaming();
        Flash.setMessage('An error occurred. Please try again.', 'error');
    }

    // Done processing
    await renderMathJax(contentElement);
    await addCopyButtons(contentElement, config);

    let assistantMessage = { role: 'assistant', content: streamedResponseText };
    await createMessage(currentDialogID, assistantMessage);

    // Render copy message
    renderCopyMessage(container, streamedResponseText);
    scrollToBottom();

    currentDialogMessages.push(assistantMessage);
}

/**
 * Scroll to the bottom of the responses element
 */
function scrollToBottom() {
    if (getIsScrolling()) {
        responsesElem.scrollTop = responsesElem.scrollHeight;
    }
}

/**
 * Load a saved conversation
 */
async function loadDialog(savedMessages) {

    currentDialogMessages = savedMessages.slice();
    responsesElem.innerHTML = '';

    for (const msg of currentDialogMessages) {
        if (msg.role === 'user') {
            // const mes = substituteThinkingTags(msg.content);
            const message = msg.content;
            renderStaticUserMessage(message);
        } else {
            const message = msg.content;
            await renderStaticAssistantMessage(message, 'Assistant');
        }
    }
}

/**
 * Initialize the dialog
 */
async function initializeDialog(dialogID) {
    let allMessages = await getMessages(dialogID);
    console.log('All messages:', allMessages);
    await loadDialog(allMessages);
}

/**
 * Get the dialog ID from the URL and load the conversation
 * This only happens on page load
 */
const url = new URL(window.location.href);
const dialogID = url.pathname.split('/').pop();
if (dialogID) {

    currentDialogID = dialogID;
    loadingSpinner.classList.remove('hidden');

    console.log('Current dialog ID:', currentDialogID);
    await initializeDialog(currentDialogID);

    loadingSpinner.classList.add('hidden');
}
