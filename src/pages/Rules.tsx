import rulesContent from '@/content/rules.md?raw';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface RulesProps {
  onDataUpdate: (data: Date) => void;
}

export default function Rules({ onDataUpdate }: RulesProps) {
  // The Rules page is static, but Layout's nav shows the last update time —
  // mark "now" so it doesn't read "Never" after navigating here.
  useEffect(() => {
    onDataUpdate(new Date());
  }, [onDataUpdate]);

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className="text-muted-foreground prose prose-lg max-w-none">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ ...props }) => (
              <h1 className="text-foreground mb-8 text-center text-2xl font-bold" {...props} />
            ),
            h2: ({ ...props }) => (
              <h2 className="text-foreground mt-6 mb-4 text-xl font-bold" {...props} />
            ),
            ul: ({ ...props }) => (
              <ul className="list-disc space-y-2 pl-6 text-justify" {...props} />
            ),
            a: ({ ...props }) => (
              <a className="text-primary hover:underline" {...props} />
            ),
            code: ({ ...props }) => (
              <code
                className="bg-muted text-foreground rounded px-1 py-0.5 text-sm"
                {...props}
              />
            ),
            pre: ({ ...props }) => (
              <pre
                className="bg-card text-foreground border-border overflow-x-auto rounded border p-4"
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
