import Pre, { PreMermaid, PreSingleLine } from './Pre';
import { FC } from 'react';

const countLines = (str: string): number => {
  const regex = /\n/g;
  const matches = str.match(regex);
  return matches ? matches.length : 1;
};

export const useCode = (raw: any) => {
  if (!raw) return;

  const { children, className } = raw.props;

  if (!children) return;

  const content = Array.isArray(children) ? (children[0] as string) : children;

  const lang = className?.replace('language-', '') || 'txt';

  const isSingleLine = countLines(content) <= 1 && content.length <= 32;

  return {
    content,
    isSingleLine,
    lang,
  };
};

interface CodeBlockProps {
  children: any;
  enableMermaid?: boolean;
  fullFeatured?: boolean;
}

const CodeBlock: FC<CodeBlockProps> = ({
  fullFeatured,
  enableMermaid,
  children,
  ...rest
}) => {
  const code = useCode(children);

  if (!code) return;

  if (enableMermaid && code.lang === 'mermaid')
    return (
      <PreMermaid {...rest}>
        {code.content}
      </PreMermaid>
    );

  if (code.isSingleLine)
    return <PreSingleLine language={code.lang}>{code.content}</PreSingleLine>;

  return (
    <Pre fullFeatured={fullFeatured} language={code.lang} {...rest}>
      {code.content}
    </Pre>
  );
};

export const CodeLite: FC<CodeBlockProps> = (props) => {
  return <CodeBlock {...props} />;
}