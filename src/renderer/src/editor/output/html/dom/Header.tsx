'use client'
import {useContext, useEffect, useRef, useState} from 'react'
// import {Ctx, isDark, isMac} from '@/utils'
import {MenuOutlined, MoreOutlined, SearchOutlined, UnorderedListOutlined} from '@ant-design/icons'
import IBook from './icons/IBook'
import Article from './icons/Article'
import Dark from './icons/Dark'
import Light from './icons/Light'
import {HtmlContext} from './Context'
export function Header(props: {
  title: string
}) {
  const ctx = useContext(HtmlContext)
  return (
    <header className="header">
      <div className={`header-content ${ctx.book ? 'max-w-[1400px]' : ''}`}>
        <div
          className="header-name"
        >
          {ctx.book ?
            <>
              <IBook className={'w-5 h-5 fill-gray-700 dark:fill-gray-300 hidden lg:block'}/>
              <div
                className={'lg:hidden'}
                data-event={'book-menu'}
              >
                <MenuOutlined className={'text-xl dark:text-gray-200 text-gray-500 duration-200 lg:hidden'}/>
              </div>
              <span className={'mx-2 dark:text-gray-200/30 font-light text-gray-300'}>/</span>
            </> :
            null
          }
          {!ctx.book &&
            <Article className={'w-5 h-5 fill-gray-700 dark:fill-gray-300 mr-1'}/>
          }
          <a className={'max-w-[calc(100vw_-_170px)] truncate'} href={''}>
            {props.title}
          </a>
        </div>
        <div className={'items-center flex'}>
          {ctx.book &&
            <>
              <div
                className={`dark:bg-black/30 bg-gray-200/70 text-gray-500 rounded duration-200 dark:text-gray-200/50 dark:hover:text-gray-200/70
                text-sm px-3 h-8 leading-8 w-56  relative cursor-pointer ${!ctx.book ? '' : 'lg:block hidden'}`}
              >
                Search
                <div
                  className={'absolute right-5 top-1/2 h-5 flex items-center -m-2.5 rounded dark:bg-black/30 bg-white px-2 border dark:border-white/20 border-gray-200'}>
                  <kbd className={'text-base mr-0.5 hidden'} data-kbd={'command'}>⌘</kbd> :
                  <kbd className={'text-xs mr-1 hidden'} data-kbd={'ctrl'}>Ctrl</kbd>
                  <kbd className={'text-xs'}>K</kbd>
                </div>
              </div>
            </>
          }
          <div
            data-event={'open-search'}
            className={`header-icon flex p-1.5 ${ctx.book ? 'lg:hidden' : ''}`}
          >
            <SearchOutlined/>
          </div>
          <div
            className={`header-icon flex p-1.5 ml-1`}
            data-event={'theme'}
          >
            <Dark className={'w-4 h-4 fill-gray-600 hidden'} data-theme={'dark'}/>
            <Light className={'w-4 h-4 fill-gray-400 hidden'} data-theme={'light'}/>
          </div>
          {!ctx.book &&
            <div
              className={`header-icon lg:flex hidden p-1.5 ml-1`}
              data-event={'outline'}
            >
              <UnorderedListOutlined />
            </div>
          }
          {/*<div*/}
          {/*  className={`header-icon flex text-xl ml-1 relative py-1 px-0.5`}*/}
          {/*  // ref={popRef}*/}
          {/*  onClick={(e) => {*/}
          {/*    // e.stopPropagation()*/}
          {/*    // setState({popOpen: true})*/}
          {/*  }}*/}
          {/*>*/}
          {/*  <MoreOutlined/>*/}
          {/*  <div*/}
          {/*    className={`${state.popOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} duration-200*/}
          {/*    absolute top-9 right-0 def-bg dark:text-gray-300 text-gray-600 border rounded text-sm font-normal p-2 w-56 shadow-lg dark:shadow-black/30*/}
          {/*    dark:border-gray-200/20  border-gray-200 shadow-gray-400/30*/}
          {/*    `}*/}
          {/*  >*/}
          {/*    <div*/}
          {/*      className={'flex items-center whitespace-nowrap px-2 py-1.5 dark:hover:bg-gray-200/10 hover:bg-gray-200/50 rounded'}*/}
          {/*      // onClick={(e) => {*/}
          {/*      //   ctx.setState!({*/}
          {/*      //     theme: theme === 'dark' ? 'light' : 'dark'*/}
          {/*      //   })*/}
          {/*      // }}*/}
          {/*    >*/}
          {/*      {theme !== 'dark' ?*/}
          {/*        <Dark className={'w-4 h-4 fill-gray-600 ml-0.5 hidden'} data-theme={'dark'}/> :*/}
          {/*        <Light className={'w-4 h-4 fill-gray-300 ml-0.5 hidden'} data-theme={'light'}/>*/}
          {/*      }*/}
          {/*      <span className={'ml-2'}>{theme !== 'dark' ? 'Dark mode' : 'Light mode'}</span>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*</div>*/}
        </div>
      </div>
    </header>
  )
}
