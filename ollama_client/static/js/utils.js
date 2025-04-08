
/**
 * Substitute thinking tags
 */
function substituteThinkingTags(streamedResponseText) {
    streamedResponseText = streamedResponseText.replace(/<think>/g, '**Think begin**');
    streamedResponseText = streamedResponseText.replace(/<thinking>/g, '**Think begin**');
    streamedResponseText = streamedResponseText.replace(/<thought>/g, '**Think begin**');

    streamedResponseText = streamedResponseText.replace(/<\/think>/g, '**Think end**');
    streamedResponseText = streamedResponseText.replace(/<\/thinking>/g, '**Think end**');
    streamedResponseText = streamedResponseText.replace(/<\/thought>/g, '**Think end**');

    // Substitute '\\' with '\cr '
    streamedResponseText = streamedResponseText.replace(/\\\\/g, '\\cr');
    return streamedResponseText;
}

export { substituteThinkingTags };