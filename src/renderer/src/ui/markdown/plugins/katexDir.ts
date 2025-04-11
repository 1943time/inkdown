import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
// katex-directive
export const rehypeKatexDir = () => (tree: Node) => {
  visit(tree, 'element', (node: any) => {
    if (node.properties?.className?.includes('katex')) {
      node.properties.dir = 'ltr';
    }
  });
};
