import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rulesContent from '../content/rules.md?raw';

export default function Rules({ theme, currentTheme }) {
  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className={`prose prose-lg max-w-none ${currentTheme.textSecondary}`}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({node, ...props}) => <h1 className="mb-8 text-center text-2xl font-bold" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl mt-6 mb-4" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 text-justify" {...props} />,
            code: ({node, ...props}) => 

                <code className="bg-gray-600 text-white px-1 py-0.5 rounded text-sm" {...props} /> ,
            pre: ({node, ...props}) => <pre className={`${currentTheme.cardBackground} ${currentTheme.textPrimary} p-4 rounded overflow-x-auto border ${currentTheme.border}`} {...props} />
          }}
        >
          {rulesContent}
        </ReactMarkdown>
      </div>
    </main>
  );
}