import { Flash } from '/static/js/flash.js';


async function getConfig() {
    return await fetch('/config').then(response => response.json());
}

/**
 * Send user message to the server
 * Dialog title is based on first user message
 * POST 'title' to '/chat/create-dialog'
 */
async function createDialog(title) {

    try {
        // POST response and expect JSON response
        // data = {
        //     "error": false,
        //     "dialog_id": "a547d2ee-ca97-4d65-a7de-df35e7b586f5",
        //     "message": "Dialog saved"
        // }
        const data = await fetch('/chat/create-dialog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title }),
        }).then(response => response.json())

        if (data.error) {
            throw new Error(data.message);
        }

        const currentDialogID = data.dialog_id;
        const url = new URL(window.location.href);
        url.pathname = `/chat/${currentDialogID}`
        window.history.replaceState({}, "", url);
        return currentDialogID

    } catch (error) {
        console.error("Error in createDialog:", error);
        Flash.setMessage('An error occurred. Please try again.', 'error');
    }
}

/**
 * Get messages connected to a dialog_id
 * /chat/get-messages/{dialog_id}
 */
async function getMessages(dialogID) {
    try {
        // GET response and expect JSON response
        // data = {
        //     "error": false,
        //     "messages": [
        //         { "role": "user", "content": "Hello" },
        //         { "role": "assistant", "content": "Hi" }
        //     ]
        // }
        const data = await fetch(`/chat/get-messages/${dialogID}`).then(response => response.json())
        console.log(data)

        if (data.error) {
            throw new Error(data.message);
        }

        return data
    } catch (error) {
        console.error("Error in getMessages:", error);
        Flash.setMessage('An error occurred. Please try again.', 'error');
    }
}


/**
 * POST message object ({ role: role, message: message } ) to /chat/create-message/{dialog_id}
 */
async function createMessage(dialogID, message) {

    try {
        console.log('Creating message:', message);
        // POST response and expect JSON response
        // data = {
        //     "error": false,
        //     "message": "Message saved"
        // }
        const data = await fetch(`/chat/create-message/${dialogID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        }).then(response => response.json())

        if (data.error) {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error("Error in createMessage:", error);
        Flash.setMessage('An error occurred. Please try again.', 'error');
    }
}

async function isLoggedInOrRedirect() {
    const data = await fetch('/user/is-logged-in').then(response => response.json());
    if (data.error) {
        // redirect to data.redirect
        window.location.href = data.redirect;
    }
}

export { createDialog, getMessages, createMessage, getConfig, isLoggedInOrRedirect };
