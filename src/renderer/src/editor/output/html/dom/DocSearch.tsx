export function DocSearch() {
  return (
    <div
      className={'z-[200] fixed inset-0 dark:bg-black/30 bg-black/10 overflow-hidden hidden'}
      data-ui={'doc-search'}
    >
      <div
        className={'w-[600px] min-h-[100px] mt-20 modal-panel rounded-lg mx-auto max-w-[calc(100vw_-_40px)]'}
      >
        <div className={'flex items-center'}>
          <input
            data-event={'doc-search-keyword'}
            className={'bg-transparent flex-1 outline-none h-10 w-full px-4 dark:text-gray-200 text-gray-600 dark:placeholder-gray-200/30 placeholder-gray-300'}
            placeholder={'Search'}
            autoFocus={true}
          />
          <button
            type={'button'}
            className={'border rounded px-1 dark:border-gray-200/10 mr-2 text-xs text-gray-400 py-0.5 hover:text-gray-500 dark:hover:text-gray-300'}
          >
            Esc
          </button>
        </div>
        <div className={'h-[1px] bg-gray-200 dark:bg-gray-200/20'}/>
        <div className={'text-sm text-center py-3 text-gray-400 px-5 hidden'} data-ui={'doc-search-notfound'}>
          No results for "<span className={'dark:text-gray-300 text-gray-500'}></span>"
        </div>
        <div className={'text-sm text-center py-3 text-gray-400 px-5 hidden'} data-ui={'doc-search-empty'}>
          Type in keywords to search
        </div>
        <div
          className={`p-2 break-all relative overflow-y-auto max-h-[calc(100vh_-_160px)] dark:text-gray-400 text-gray-600`}
          >
          <div data-ui={'doc-search-result'}></div>
        </div>
      </div>
    </div>
  )
}
