
/**
 * Substitute thinking tags
 */
function substituteThinkingTags(streamedResponseText) {
    streamedResponseText = streamedResponseText.replace(/<think>/g, '**Think begin**');
    streamedResponseText = streamedResponseText.replace(/<\/think>/g, '**Think end**');

    streamedResponseText = streamedResponseText.replace(/<thinking>/g, '**Think begin**');
    streamedResponseText = streamedResponseText.replace(/<\/thinking>/g, '**Think end**');

    return streamedResponseText;
}

export { substituteThinkingTags };