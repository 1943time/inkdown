export function Media({node}: {
  node: any
}) {
  return (
    <>
      {node.mediaType === 'video' &&
        <video src={node.url} controls={true} preload={'true'}></video>
      }
      {node.mediaType === 'image' &&
        <img alt={node.alt} src={node.url} width={node.width}/>
      }
      {node.mediaType === 'document' &&
        <object data={node.url} className={'w-full h-auto'}/>
      }
    </>
  )
}
