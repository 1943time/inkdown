import React from 'react'
import type { SVGProps } from 'react'

export function IWorkspace(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M6 21q-1.65 0-2.825-1.175T2 17t1.175-2.825T6 13t2.825 1.175T10 17t-1.175 2.825T6 21m12 0q-1.65 0-2.825-1.175T14 17t1.175-2.825T18 13t2.825 1.175T22 17t-1.175 2.825T18 21M6 19q.825 0 1.413-.587T8 17t-.587-1.412T6 15t-1.412.588T4 17t.588 1.413T6 19m12 0q.825 0 1.413-.587T20 17t-.587-1.412T18 15t-1.412.588T16 17t.588 1.413T18 19m-6-8q-1.65 0-2.825-1.175T8 7t1.175-2.825T12 3t2.825 1.175T16 7t-1.175 2.825T12 11m0-2q.825 0 1.413-.587T14 7t-.587-1.412T12 5t-1.412.588T10 7t.588 1.413T12 9m-6 8"
      ></path>
    </svg>
  )
}
