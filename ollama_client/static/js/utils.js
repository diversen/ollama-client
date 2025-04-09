function escapeKatexDelimiters(text) {
    // Replace inline \(...\) with \\(...\\), but not \\\\(...\\\\)
    text = text.replace(/(?<!\\)\\\((.*?)(?<!\\)\\\)/gs, '\\\\($1\\\\)');
   
    // Replace block \[...\] with \\[...\\], but not \\\[...\\\]
    text = text.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/gs, '\\\\[$1\\\\]');
   
    return text;
}

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
    streamedResponseText = escapeKatexDelimiters(streamedResponseText);

    return streamedResponseText;
}



export { substituteThinkingTags };