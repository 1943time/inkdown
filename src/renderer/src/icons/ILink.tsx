import React from 'react'
import type { SVGProps } from 'react'

export function ILink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        d="m7.775 3.275l1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0a.75.75 0 0 1 .018-1.042a.75.75 0 0 1 1.042-.018a2 2 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.75.75 0 0 1-1.042-.018a.75.75 0 0 1-.018-1.042m-4.69 9.64a2 2 0 0 0 2.83 0l1.25-1.25a.75.75 0 0 1 1.042.018a.75.75 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0a.75.75 0 0 1-.018 1.042a.75.75 0 0 1-1.042.018a2 2 0 0 0-2.83 0l-2.5 2.5a2 2 0 0 0 0 2.83"
      ></path>
    </svg>
  )
}
