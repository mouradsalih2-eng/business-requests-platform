/**
 * MentionText - Renders comment content with highlighted @mentions
 * Mentions are displayed in blue with hover effect
 */
export function MentionText({ content, mentions = [] }) {
  if (!content) return null;

  // Create a set of mentioned names for quick lookup
  const mentionedNames = new Set(
    mentions.map(m => m.name?.split(' ')[0]?.toLowerCase())
  );

  // Regex to find @mentions in content
  const mentionRegex = /@(\w+)/g;

  // Split content by mentions and render each part
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
        key: `text-${lastIndex}`,
      });
    }

    const mentionName = match[1];
    const isValidMention = mentionedNames.has(mentionName.toLowerCase());

    parts.push({
      type: isValidMention ? 'mention' : 'text',
      content: match[0], // Include the @ symbol
      key: `mention-${match.index}`,
      name: mentionName,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last mention
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
      key: `text-${lastIndex}`,
    });
  }

  // If no mentions found, just return the content
  if (parts.length === 0) {
    return <span>{content}</span>;
  }

  return (
    <span>
      {parts.map((part) =>
        part.type === 'mention' ? (
          <span
            key={part.key}
            className="text-blue-600 font-medium hover:text-blue-700
                       cursor-default transition-colors"
            title={`Mentioned: ${part.name}`}
          >
            {part.content}
          </span>
        ) : (
          <span key={part.key}>{part.content}</span>
        )
      )}
    </span>
  );
}
