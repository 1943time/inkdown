export function TreeEmpty() {
  return (
    <div className={'flex justify-center items-center text-gray-400 pt-32'}>
      <div className={'text-center space-y-2 px-4'}>
        <div className={'text-pretty leading-5 text-[13px]'}>
          {true ? '尚未创建文档' : 'No document created yet'}
        </div>
      </div>
    </div>
  )
}
