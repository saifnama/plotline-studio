import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false });

const code = `
mindmap
  root((mindmap))
    Origins
      Long history
`;

async function main() {
    const { svg } = await mermaid.render('test', code);
    console.log(svg);
}

main();
