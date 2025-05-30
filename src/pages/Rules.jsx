import rulesContent from '../content/rules.md?raw';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function Rules({ theme, currentTheme }) {
  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className={`prose prose-lg max-w-none ${currentTheme.textSecondary}`}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="mb-8 text-center text-2xl font-bold" {...props} />
            ),
            h2: ({ node, ...props }) => <h2 className="mb-4 mt-6 text-xl font-bold" {...props} />,
            ul: ({ node, ...props }) => (
              <ul className="list-disc space-y-2 pl-6 text-justify" {...props} />
            ),
            code: ({ node, ...props }) => (
              <code className="rounded bg-gray-600 px-1 py-0.5 text-sm text-white" {...props} />
            ),
            pre: ({ node, ...props }) => (
              <pre
                className={`${currentTheme.cardBackground} ${currentTheme.textPrimary} overflow-x-auto rounded border p-4 ${currentTheme.border}`}
                {...props}
              />
            ),
          }}
        >
          {rulesContent}
        </ReactMarkdown>
      </div>
    </main>
  );
}
