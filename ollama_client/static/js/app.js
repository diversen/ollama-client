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

// Math rendering
let renderMath = false;

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

    // Add role element
    const roleElement = document.createElement('h3');
    roleElement.classList.add('role');
    roleElement.classList.add('role_' + role.toLowerCase());
    roleElement.textContent = role;

    // Add loader span inside role element if assistant

    const loaderSpan = document.createElement('div');
    loaderSpan.classList.add('loading-model');
    loaderSpan.classList.add('hidden');
    roleElement.appendChild(loaderSpan);


    // Add content element
    const contentElement = document.createElement('div');
    contentElement.classList.add('content');

    // Append role and content elements to the container
    messageContainer.append(roleElement, contentElement);
    return { container: messageContainer, contentElement: contentElement, loader: loaderSpan };
}
/**
 * Render user message to the DOM
 */
function renderStaticUserMessage(message) {
    const { container, contentElement } = createMessageElement('User');

    contentElement.style.whiteSpace = 'pre-wrap';
    contentElement.innerText = message;

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
async function renderStaticAssistantMessage(content) {
    const { container, contentElement } = createMessageElement('Assistant');
    responsesElem.appendChild(container);

    contentElement.innerHTML = mdNoHTML.render(content);
    highlightCodeInElement(contentElement);
    await renderMathJax(contentElement);
    await addCopyButtons(contentElement, config);
}

/**
 * Render math if enabled
 */
async function renderMathJax(contentElem) {
    if (renderMath) {
        renderMathInElement(contentElem, {
            delimiters: [
                { left: '$', right: '$', display: true },
                { left: '\(', right: '\)', display: false },
                { left: '\[', right: '\]', display: true },
                { left: '\begin{equation}', right: '\end{equation}', display: true }
            ]
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
                decoder.decode(value, { stream: true })
                    .split('data: ')
                    .forEach(processChunk);
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
            const trimmed = dataPart.trim();
            if (!trimmed) return;
            const data = JSON.parse(trimmed);

            const messagePart = data.message;
            const isDone = data.done;
            const error = data.error;

            if (error) {
                throw new Error(error);
            }

            totalTokenCount += 1;
            streamedResponseText += messagePart.content;

            if (totalTokenCount % 1 === 0) {
                updateContentDiff(contentElement, hiddenContentElem, streamedResponseText);
                scrollToBottom();
            }

            if (isDone) {
                updateContentDiff(contentElement, hiddenContentElem, streamedResponseText);
                scrollToBottom();
                clearStreaming();

            }
        } catch (error) {
            console.log("Error in processChunk:", error);
            clearStreaming();
            Flash.setMessage(error.message || error, 'error');
        }
    };

    // Error handling for stream
    const handleStreamError = (error) => {
        if (error.name === 'AbortError') {
            Flash.setMessage('Request was aborted', 'success');
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
            const mes = substituteThinkingTags(msg.content);
            renderStaticUserMessage(mes);
        } else {
            const mes = substituteThinkingTags(msg.content);
            await renderStaticAssistantMessage(mes, 'Assistant');
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
